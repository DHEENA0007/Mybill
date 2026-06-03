from rest_framework import viewsets
from users.mixins import TenantViewSet, ReadOnlyTenantViewSet, filters
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from rest_framework.decorators import action
from rest_framework.response import Response

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
