import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "billing_system.settings")
django.setup()

from inventory.serializers import ProductSerializer
from inventory.models import Product

p = Product.objects.last()
if p:
    print("Old stock:", p.current_stock)
    data = {'name': p.name, 'sku': p.sku, 'purchase_price': p.purchase_price, 'selling_price': p.selling_price, 'current_stock': 15}
    s = ProductSerializer(p, data=data, partial=True)
    if s.is_valid():
        print("Validated data:", s.validated_data)
        s.save()
        print("New stock:", p.current_stock)
    else:
        print("Errors:", s.errors)
