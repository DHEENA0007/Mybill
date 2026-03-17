from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from payments.models import Payment
from returns.models import Return
from inventory.models import StockTransaction
from sales.models import SalesInvoice
from purchases.models import Purchase
from users.models import Permission


class ChoicesView(APIView):
    """
    Returns all enum choices used across the system.
    Frontend uses this to build dynamic dropdowns — no hardcoded values needed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'payment_methods': [
                {'value': v, 'label': l}
                for v, l in Payment.PAYMENT_METHOD_CHOICES
            ],
            'payment_types': [
                {'value': v, 'label': l}
                for v, l in Payment.PAYMENT_TYPE_CHOICES
            ],
            'reference_types': [
                {'value': v, 'label': l}
                for v, l in Payment.REFERENCE_TYPE_CHOICES
            ],
            'return_types': [
                {'value': v, 'label': l}
                for v, l in Return.RETURN_TYPE_CHOICES
            ],
            'stock_transaction_types': [
                {'value': v, 'label': l}
                for v, l in StockTransaction.TRANSACTION_TYPE_CHOICES
            ],
            'invoice_statuses': [
                {'value': v, 'label': l}
                for v, l in SalesInvoice.STATUS_CHOICES
            ],
            'purchase_statuses': [
                {'value': v, 'label': l}
                for v, l in Purchase.STATUS_CHOICES
            ],
            'permission_categories': [
                {'value': v, 'label': l}
                for v, l in Permission.CATEGORY_CHOICES
            ],
        })
