import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()
from accounts.models import Income
from accounts.serializers import IncomeSerializer
i = Income.objects.first()
if i:
    print(IncomeSerializer(i).data)
else:
    print("No incomes found")
