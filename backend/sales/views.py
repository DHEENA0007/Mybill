from rest_framework import viewsets
from decimal import Decimal
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count

from .models import Customer, SalesInvoice, InvoiceItem, CreditLog, InvoiceTemplate
from .serializers import (
    CustomerSerializer, SalesInvoiceSerializer, SalesInvoiceCreateSerializer,
    SalesInvoiceUpdateSerializer, SalesInvoiceListSerializer, InvoiceItemSerializer,
    CreditLogSerializer, InvoiceTemplateSerializer
)


class CustomerViewSet(TenantViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'address']
    ordering_fields = ['name', 'credit_balance', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        customer = self.get_object()
        invoices = customer.invoices.all().order_by('-invoice_date')
        page = self.paginate_queryset(invoices)
        if page is not None:
            serializer = SalesInvoiceListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SalesInvoiceListSerializer(invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def credit_history(self, request, pk=None):
        customer = self.get_object()
        credits = customer.credit_logs.exclude(invoice__status='cancelled').order_by('-created_at')
        serializer = CreditLogSerializer(credits, many=True)
        return Response(serializer.data)


class SalesInvoiceViewSet(TenantViewSet):
    queryset = SalesInvoice.objects.select_related('customer', 'created_by').prefetch_related('items__product').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'customer__name', 'status']
    ordering_fields = ['invoice_date', 'total_amount', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SalesInvoiceListSerializer
        if self.action == 'create':
            return SalesInvoiceCreateSerializer
        if self.action in ['update', 'partial_update']:
            return SalesInvoiceUpdateSerializer
        return SalesInvoiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        customer = self.request.query_params.get('customer')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer:
            queryset = queryset.filter(customer_id=customer)
        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
        if year:
            queryset = queryset.filter(invoice_date__year=year)
        if month:
            queryset = queryset.filter(invoice_date__month=month)
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return aggregate totals across ALL invoices matching current filters."""
        from django.db.models import Sum
        queryset = self.filter_queryset(self.get_queryset()).exclude(status='cancelled')
        totals = queryset.aggregate(
            total_invoiced=Sum('total_amount'),
            total_collected=Sum('paid_amount'),
            total_outstanding=Sum('balance_due'),
        )
        return Response({
            'total_invoiced': totals['total_invoiced'] or 0,
            'total_collected': totals['total_collected'] or 0,
            'total_outstanding': totals['total_outstanding'] or 0,
        })

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if getattr(user, 'company_id', None) and not getattr(user, 'is_superuser', False):
            kwargs['company'] = user.company
        serializer.save(**kwargs)

    def update(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status == 'cancelled':
            return Response({'error': 'Cannot update a cancelled invoice.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        from django.db import transaction as db_transaction
        from inventory.models import StockTransaction

        with db_transaction.atomic():
            if invoice.status != 'cancelled':
                for item in invoice.items.all():
                    item.product.current_stock += item.quantity
                    item.product.save()
                    StockTransaction.objects.create(
                        company=invoice.company,
                        product=item.product,
                        transaction_type='return',
                        quantity=item.quantity,
                        reference_id=invoice.invoice_number,
                        notes=f'Invoice {invoice.invoice_number} deleted',
                    )
                for credit_log in invoice.credit_logs.all():
                    if credit_log.customer and credit_log.remaining_balance > 0:
                        credit_log.customer.credit_balance = max(
                            credit_log.customer.credit_balance - credit_log.remaining_balance,
                            Decimal('0'),
                        )
                        credit_log.customer.save()
            invoice.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from django.db import transaction as db_transaction
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
            with db_transaction.atomic():
                invoice.paid_amount += amount
                invoice.update_balance()

                # Update CreditLog and customer balance
                credit_log = invoice.credit_logs.first()
                if credit_log:
                    credit_log.paid_amount += amount
                    credit_log.remaining_balance = max(credit_log.credit_amount - credit_log.paid_amount, 0)
                    credit_log.save()

                if invoice.customer:
                    invoice.customer.credit_balance = max(invoice.customer.credit_balance - amount, Decimal('0'))
                    invoice.customer.save()

            return Response({
                'message': 'Payment recorded.',
                'paid_amount': invoice.paid_amount,
                'balance_due': invoice.balance_due,
                'status': invoice.status
            })
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'cancelled':
            return Response({'error': 'Invoice is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.db import transaction
        from inventory.models import StockTransaction
        with transaction.atomic():
            for item in invoice.items.all():
                item.product.current_stock += item.quantity
                item.product.save()
                StockTransaction.objects.create(
                    company=invoice.company,
                    product=item.product,
                    transaction_type='return',
                    quantity=item.quantity,
                    reference_id=invoice.invoice_number,
                    notes=f'Invoice {invoice.invoice_number} cancelled'
                )

            # Reverse credit logs and customer credit balance
            for credit_log in invoice.credit_logs.all():
                if credit_log.customer and credit_log.remaining_balance > 0:
                    credit_log.customer.credit_balance = max(
                        credit_log.customer.credit_balance - credit_log.remaining_balance,
                        Decimal('0')
                    )
                    credit_log.customer.save()
                credit_log.delete()

            invoice.status = 'cancelled'
            invoice.save()
        return Response({'message': f'Invoice {invoice.invoice_number} cancelled.'})


class CreditLogViewSet(TenantViewSet):
    queryset = CreditLog.objects.select_related('customer', 'invoice').all()
    serializer_class = CreditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer__name', 'invoice__invoice_number']

    def get_queryset(self):
        queryset = super().get_queryset().exclude(invoice__status='cancelled')
        customer = self.request.query_params.get('customer')
        has_balance = self.request.query_params.get('has_balance')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if customer:
            queryset = queryset.filter(customer_id=customer)
        if has_balance and has_balance.lower() == 'true':
            queryset = queryset.filter(remaining_balance__gt=0)
        if year:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(invoice__invoice_date__year=year) |
                Q(invoice__isnull=True, created_at__year=year)
            )
        if month:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(invoice__invoice_date__month=month) |
                Q(invoice__isnull=True, created_at__month=month)
            )
        return queryset

    @action(detail=True, methods=['post'])
    def settle(self, request, pk=None):
        """Record a payment against a credit log entry."""
        from django.db import transaction as db_transaction
        credit_log = self.get_object()
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'cash')
        notes = request.data.get('notes', '')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
            if amount > credit_log.remaining_balance:
                return Response({'error': f'Amount exceeds remaining balance of {credit_log.remaining_balance}.'}, status=status.HTTP_400_BAD_REQUEST)

            with db_transaction.atomic():
                # Update credit log
                credit_log.paid_amount += amount
                credit_log.remaining_balance = max(credit_log.credit_amount - credit_log.paid_amount, Decimal('0'))
                credit_log.save()

                # Update invoice
                if credit_log.invoice:
                    credit_log.invoice.paid_amount += amount
                    credit_log.invoice.update_balance()

                # Update customer credit balance
                if credit_log.customer:
                    credit_log.customer.credit_balance = max(credit_log.customer.credit_balance - amount, Decimal('0'))
                    credit_log.customer.save()

                # Create a Payment record
                from payments.models import Payment
                Payment.objects.create(
                    company=credit_log.company,
                    payment_type='incoming',
                    reference_type='credit',
                    reference_id=str(credit_log.id),
                    amount=amount,
                    payment_method=payment_method,
                    notes=notes or f'Credit settlement for {credit_log.customer.name} - Invoice {credit_log.invoice.invoice_number if credit_log.invoice else "N/A"}',
                    recorded_by=request.user,
                )

            serializer = self.get_serializer(credit_log)
            return Response({
                'message': 'Credit settled successfully.',
                'credit_log': serializer.data,
            })
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return aggregate totals across ALL credit logs matching current filters."""
        from django.db.models import Sum
        queryset = self.get_queryset()
        # Also apply settled filter server-side when requested
        status_filter = request.query_params.get('status')
        if status_filter == 'settled':
            queryset = queryset.filter(remaining_balance__lte=0)
        totals = queryset.aggregate(
            total_credit=Sum('credit_amount'),
            total_paid=Sum('paid_amount'),
            total_remaining=Sum('remaining_balance'),
        )
        return Response({
            'total_credit': totals['total_credit'] or 0,
            'total_paid': totals['total_paid'] or 0,
            'total_remaining': totals['total_remaining'] or 0,
        })

    @action(detail=False, methods=['get'])
    def customers_with_credit(self, request):
        """Get list of customers who have outstanding credit balance."""
        credit_logs = self.get_queryset().filter(remaining_balance__gt=0)
        customer_ids = credit_logs.values_list('customer_id', flat=True).distinct()
        customers = Customer.objects.filter(id__in=customer_ids).order_by('name')
        data = [
            {'id': c.id, 'name': c.name, 'phone': c.phone, 'credit_balance': float(c.credit_balance)}
            for c in customers
        ]
        return Response(data)


class InvoiceTemplateViewSet(TenantViewSet):
    queryset = InvoiceTemplate.objects.all()
    serializer_class = InvoiceTemplateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if getattr(user, 'company_id', None) and not getattr(user, 'is_superuser', False):
            kwargs['company'] = user.company
        serializer.save(**kwargs)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        template = self.get_object()
        template.is_default = True
        template.save()
        return Response({'message': f'"{template.name}" is now the default template.'})

    @action(detail=False, methods=['get'])
    def default(self, request):
        template_type = request.query_params.get('type', 'nontax')
        qs = self.get_queryset()
        template = qs.filter(is_default=True, template_type=template_type).first()
        if not template:
            template = qs.filter(template_type=template_type).first()
        if not template:
            template = qs.filter(is_default=True).first()
        if not template:
            return Response(None)
        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def upload_logo(self, request, pk=None):
        template = self.get_object()
        if 'logo' not in request.FILES:
            return Response({'error': 'No logo file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        template.logo = request.FILES['logo']
        template.save()
        serializer = self.get_serializer(template)
        return Response(serializer.data)
