from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q

from .models import Supplier, Purchase, PurchaseItem
from .serializers import (
    SupplierSerializer, PurchaseSerializer, PurchaseCreateSerializer,
    PurchaseListSerializer, PurchaseItemSerializer
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'gst_number']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    @action(detail=True, methods=['get'])
    def purchases(self, request, pk=None):
        supplier = self.get_object()
        purchases = supplier.purchases.all().order_by('-purchase_date')
        page = self.paginate_queryset(purchases)
        if page is not None:
            serializer = PurchaseListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = PurchaseListSerializer(purchases, many=True)
        return Response(serializer.data)


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related('supplier', 'created_by').prefetch_related('items__product').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['supplier__name', 'status', 'notes']
    ordering_fields = ['purchase_date', 'total_amount', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseCreateSerializer
        return PurchaseSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        supplier = self.request.query_params.get('supplier')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)
        if date_from:
            queryset = queryset.filter(purchase_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(purchase_date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        purchase = self.get_object()
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
            purchase.paid_amount += amount
            purchase.update_balance()
            return Response({
                'message': 'Payment recorded.',
                'paid_amount': purchase.paid_amount,
                'balance_due': purchase.balance_due,
                'status': purchase.status
            })
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)
