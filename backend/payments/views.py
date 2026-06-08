from rest_framework import viewsets
from decimal import Decimal
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, filters
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status as drf_status

from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(TenantViewSet):
    queryset = Payment.objects.select_related('recorded_by').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['payment_type', 'reference_type', 'reference_id', 'payment_method']
    ordering_fields = ['payment_date', 'amount', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        payment_type = self.request.query_params.get('payment_type')
        reference_type = self.request.query_params.get('reference_type')
        payment_method = self.request.query_params.get('payment_method')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        if reference_type:
            queryset = queryset.filter(reference_type=reference_type)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if date_from:
            queryset = queryset.filter(payment_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(payment_date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        incoming = queryset.filter(payment_type='incoming').aggregate(total=Sum('amount'))['total'] or 0
        outgoing = queryset.filter(payment_type='outgoing').aggregate(total=Sum('amount'))['total'] or 0
        by_method = {}
        for choice in Payment.PAYMENT_METHOD_CHOICES:
            method = choice[0]
            total = queryset.filter(payment_method=method).aggregate(total=Sum('amount'))['total'] or 0
            by_method[method] = float(total)
        return Response({
            'total_incoming': float(incoming),
            'total_outgoing': float(outgoing),
            'net': float(incoming) - float(outgoing),
            'by_method': by_method
        })

    @action(detail=False, methods=['post'])
    def record_supplier_payment(self, request):
        """Record a payment to a supplier against a purchase order."""
        from django.db import transaction as db_transaction
        from purchases.models import Purchase, Supplier

        supplier_id = request.data.get('supplier_id')
        purchase_id = request.data.get('purchase_id')
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'cash')
        notes = request.data.get('notes', '')

        if not supplier_id:
            return Response({'error': 'Supplier is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        if not amount:
            return Response({'error': 'Amount is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=drf_status.HTTP_400_BAD_REQUEST)

            supplier = Supplier.objects.get(id=supplier_id)

            with db_transaction.atomic():
                # If a specific purchase is selected, update that purchase
                if purchase_id:
                    purchase = Purchase.objects.get(id=purchase_id, supplier=supplier)
                    if amount > purchase.balance_due:
                        return Response({'error': f'Amount exceeds purchase balance of {purchase.balance_due}.'}, status=drf_status.HTTP_400_BAD_REQUEST)
                    purchase.paid_amount += amount
                    purchase.update_balance()
                    ref_id = f'PO-{purchase.id}'
                else:
                    ref_id = f'SUP-{supplier.id}'

                payment = Payment.objects.create(
                    company=getattr(request.user, 'company', None),
                    payment_type='outgoing',
                    reference_type='supplier',
                    reference_id=ref_id,
                    amount=amount,
                    payment_method=payment_method,
                    notes=notes or f'Supplier payment to {supplier.name}',
                    recorded_by=request.user,
                )

            return Response({
                'message': 'Supplier payment recorded successfully.',
                'payment': PaymentSerializer(payment).data,
            })
        except Supplier.DoesNotExist:
            return Response({'error': 'Supplier not found.'}, status=drf_status.HTTP_404_NOT_FOUND)
        except Purchase.DoesNotExist:
            return Response({'error': 'Purchase not found for this supplier.'}, status=drf_status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=drf_status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def record_credit_payment(self, request):
        """Record a payment from a customer against their credit balance."""
        from django.db import transaction as db_transaction
        from sales.models import CreditLog, Customer

        customer_id = request.data.get('customer_id')
        credit_log_id = request.data.get('credit_log_id')
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'cash')
        notes = request.data.get('notes', '')

        if not customer_id:
            return Response({'error': 'Customer is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        if not amount:
            return Response({'error': 'Amount is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=drf_status.HTTP_400_BAD_REQUEST)

            customer = Customer.objects.get(id=customer_id)

            with db_transaction.atomic():
                if credit_log_id:
                    credit_log = CreditLog.objects.get(id=credit_log_id, customer=customer)
                    if amount > credit_log.remaining_balance:
                        return Response({'error': f'Amount exceeds credit balance of {credit_log.remaining_balance}.'}, status=drf_status.HTTP_400_BAD_REQUEST)
                    credit_log.paid_amount += amount
                    credit_log.remaining_balance = max(credit_log.credit_amount - credit_log.paid_amount, Decimal('0'))
                    credit_log.save()

                    if credit_log.invoice:
                        credit_log.invoice.paid_amount += amount
                        credit_log.invoice.update_balance()

                    ref_id = f'CR-{credit_log.id}'
                else:
                    ref_id = f'CUST-{customer.id}'

                customer.credit_balance = max(customer.credit_balance - amount, Decimal('0'))
                customer.save()

                payment = Payment.objects.create(
                    company=getattr(request.user, 'company', None),
                    payment_type='incoming',
                    reference_type='credit',
                    reference_id=ref_id,
                    amount=amount,
                    payment_method=payment_method,
                    notes=notes or f'Credit payment from {customer.name}',
                    recorded_by=request.user,
                )

            return Response({
                'message': 'Credit payment recorded successfully.',
                'payment': PaymentSerializer(payment).data,
            })
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=drf_status.HTTP_404_NOT_FOUND)
        except CreditLog.DoesNotExist:
            return Response({'error': 'Credit log not found for this customer.'}, status=drf_status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=drf_status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def suppliers_with_pending(self, request):
        """Get suppliers that have purchases with pending balance."""
        from purchases.models import Supplier, Purchase
        pending_purchases = Purchase.objects.filter(balance_due__gt=0)
        user = request.user
        if not getattr(user, 'is_superuser', False) and getattr(user, 'company_id', None):
            pending_purchases = pending_purchases.filter(company=user.company)
        supplier_ids = pending_purchases.values_list('supplier_id', flat=True).distinct()
        suppliers = Supplier.objects.filter(id__in=supplier_ids).order_by('name')
        data = []
        for s in suppliers:
            total_pending = pending_purchases.filter(supplier=s).aggregate(total=Sum('balance_due'))['total'] or 0
            data.append({
                'id': s.id, 'name': s.name, 'phone': s.phone,
                'total_pending': float(total_pending),
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def supplier_purchases(self, request):
        """Get pending purchases for a specific supplier."""
        from purchases.models import Purchase
        from purchases.serializers import PurchaseListSerializer
        supplier_id = request.query_params.get('supplier_id')
        if not supplier_id:
            return Response([])
        qs = Purchase.objects.filter(supplier_id=supplier_id, balance_due__gt=0).order_by('-purchase_date')
        user = request.user
        if not getattr(user, 'is_superuser', False) and getattr(user, 'company_id', None):
            qs = qs.filter(company=user.company)
        serializer = PurchaseListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def customer_credits(self, request):
        """Get credit logs with remaining balance for a specific customer."""
        from sales.models import CreditLog
        from sales.serializers import CreditLogSerializer
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response([])
        qs = CreditLog.objects.filter(customer_id=customer_id, remaining_balance__gt=0).select_related('customer', 'invoice').order_by('-created_at')
        user = request.user
        if not getattr(user, 'is_superuser', False) and getattr(user, 'company_id', None):
            qs = qs.filter(company=user.company)
        serializer = CreditLogSerializer(qs, many=True)
        return Response(serializer.data)
