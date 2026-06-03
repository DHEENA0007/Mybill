from rest_framework import viewsets
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, filters
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from inventory.models import StockTransaction
from .models import Return
from .serializers import ReturnSerializer


class ReturnViewSet(TenantViewSet):
    queryset = Return.objects.select_related('product', 'processed_by').all()
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['return_type', 'reference_id', 'product__name', 'reason']
    ordering_fields = ['processed_at', 'created_at', 'return_amount']

    def get_queryset(self):
        queryset = super().get_queryset()
        return_type = self.request.query_params.get('return_type')
        product = self.request.query_params.get('product')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if return_type:
            queryset = queryset.filter(return_type=return_type)
        if product:
            queryset = queryset.filter(product_id=product)
        if date_from:
            queryset = queryset.filter(processed_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(processed_at__date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            ret = serializer.save(processed_by=self.request.user)
            product = ret.product
            qty = ret.quantity

            # Sales return: customer returns item → increase stock
            # Purchase return: return to supplier → decrease stock
            if ret.return_type == 'sales':
                product.current_stock += qty
                stock_qty = qty
                notes = f'Sales return | Ref: {ret.reference_id}'
            else:
                product.current_stock -= qty
                stock_qty = -qty
                notes = f'Purchase return | Ref: {ret.reference_id}'

            product.save()

            StockTransaction.objects.create(
                product=product,
                transaction_type='return',
                quantity=stock_qty,
                reference_id=ret.reference_id,
                notes=notes,
                created_by=self.request.user,
            )
