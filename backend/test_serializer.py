import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()
from accounts.models import Expense
from accounts.serializers import ExpenseSerializer
e = Expense.objects.first()
if e:
    print(ExpenseSerializer(e).data)
else:
    print("No expenses found")
