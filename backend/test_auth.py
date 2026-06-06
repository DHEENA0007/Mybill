import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

demo_user = User.objects.get(username='demo')
refresh = RefreshToken.for_user(demo_user)
client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

res = client.get('/api/customers/?page_size=200')
print("Status:", res.status_code)
print("Data:", res.json())
