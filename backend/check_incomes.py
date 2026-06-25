import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()
from accounts.models import Income, IncomeCategory, IncomeSubcategory
print("Total incomes:", Income.objects.count())
print("Total income categories:", IncomeCategory.objects.count())
print("Total income subcategories:", IncomeSubcategory.objects.count())
