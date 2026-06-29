import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from accounts.models import Income, IncomeSubcategory, IncomeCategory

# Check incomes without subcategory
null_sub = Income.objects.filter(subcategory__isnull=True)
print(f"Incomes with null subcategory: {null_sub.count()}")

# Details of those incomes
for inc in null_sub:
    print(f"ID: {inc.id}, Company: {inc.company}, Created By: {inc.created_by.username if inc.created_by else None}")

