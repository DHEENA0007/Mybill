import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from sales.serializers import SalesInvoiceCreateSerializer

data = {
    "customer": 1,
    "paid_amount": 0,
    "discount_amount": 0,
    "tax_rate": 0,
    "payment_method": "credit",
    "notes": "",
    "is_tax_invoice": False,
    "items": [
        {
            "product": 1,
            "quantity": 1,
            "unit_price": 25.0,
            "tax_rate": 0
        }
    ]
}

# we might need a mock request for context if it needs user/tenant
class MockUser:
    is_authenticated = True

class MockRequest:
    user = MockUser()

serializer = SalesInvoiceCreateSerializer(data=data, context={'request': MockRequest()})
if serializer.is_valid():
    print("Valid!")
else:
    print("Errors:", serializer.errors)
