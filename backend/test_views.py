import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from django.test import RequestFactory
from users.models import User
from inventory.views import ExpenseCategoryViewSet as InventoryExpenseCategoryViewSet
from accounts.views import ExpenseCategoryViewSet as AccountsExpenseCategoryViewSet
import json

admin = User.objects.get(username='admin')
factory = RequestFactory()
request = factory.get('/api/expense-categories/')
request.user = admin

inv_view = InventoryExpenseCategoryViewSet.as_view({'get': 'list'})
acc_view = AccountsExpenseCategoryViewSet.as_view({'get': 'list'})

inv_res = inv_view(request)
acc_res = acc_view(request)

print("Inventory API Response Count:")
print(len(inv_res.data) if hasattr(inv_res, 'data') else "Error")

print("Accounts API Response Count:")
print(len(acc_res.data) if hasattr(acc_res, 'data') else "Error")
