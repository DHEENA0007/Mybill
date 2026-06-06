import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from django.test import RequestFactory
from users.models import User
from inventory.views import ExpenseCategoryViewSet as InventoryExpenseCategoryViewSet
from accounts.views import ExpenseCategoryViewSet as AccountsExpenseCategoryViewSet

admin = User.objects.get(username='admin')
factory = RequestFactory()
request = factory.get('/api/expense-categories/')
request.user = admin

inv_view = InventoryExpenseCategoryViewSet.as_view({'get': 'list'})
acc_view = AccountsExpenseCategoryViewSet.as_view({'get': 'list'})

inv_res = inv_view(request)
acc_res = acc_view(request)

inv_data = inv_res.data['results'] if 'results' in inv_res.data else inv_res.data
acc_data = acc_res.data['results'] if 'results' in acc_res.data else acc_res.data

print("Inventory Categories:", [item['name'] for item in inv_data] if isinstance(inv_data, list) else inv_data)
print("Accounts Categories:", [item['name'] for item in acc_data] if isinstance(acc_data, list) else acc_data)
