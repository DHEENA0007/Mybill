from rest_framework import viewsets
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count

from .models import Customer, SalesInvoice, InvoiceItem, CreditLog, InvoiceTemplate
from .serializers import (
    CustomerSerializer, SalesInvoiceSerializer, SalesInvoiceCreateSerializer,
    SalesInvoiceListSerializer, InvoiceItemSerializer, CreditLogSerializer,
    InvoiceTemplateSerializer
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
        credits = customer.credit_logs.all().order_by('-created_at')
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
        if self.action in ['create']:
            return SalesInvoiceCreateSerializer
        return SalesInvoiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        customer = self.request.query_params.get('customer')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer:
            queryset = queryset.filter(customer_id=customer)
        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if getattr(user, 'company_id', None) and not getattr(user, 'is_superuser', False):
            kwargs['company'] = user.company
        serializer.save(**kwargs)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from django.db import transaction as db_transaction
            amount = float(amount)
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
                    invoice.customer.credit_balance = max(float(invoice.customer.credit_balance) - amount, 0)
                    invoice.customer.save()

            return Response({
                'message': 'Payment recorded.',
                'paid_amount': float(invoice.paid_amount),
                'balance_due': float(invoice.balance_due),
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
        queryset = super().get_queryset()
        customer = self.request.query_params.get('customer')
        if customer:
            queryset = queryset.filter(customer_id=customer)
        return queryset


class InvoiceTemplateViewSet(TenantViewSet):
    queryset = InvoiceTemplate.objects.all()
    serializer_class = InvoiceTemplateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        template = self.get_object()
        template.is_default = True
        template.save()
        return Response({'message': f'"{template.name}" is now the default template.'})

    @action(detail=False, methods=['get'])
    def default(self, request):
        template_type = request.query_params.get('type', 'nontax')
        template = InvoiceTemplate.objects.filter(is_default=True, template_type=template_type).first()
        if not template:
            template = InvoiceTemplate.objects.filter(template_type=template_type).first()
        if not template:
            # Fallback
            template = InvoiceTemplate.objects.filter(is_default=True).first()
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
