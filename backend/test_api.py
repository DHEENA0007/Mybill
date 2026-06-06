import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from rest_framework.test import APIClient
from users.models import User
import json

admin = User.objects.get(username='admin')
client = APIClient()
client.force_authenticate(user=admin)

res = client.get('/api/expense-categories/')
print("Expense Categories API Response:")
print(json.dumps(res.data, indent=2))
