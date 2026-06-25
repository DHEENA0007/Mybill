import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from accounts.models import Income, IncomeCategory, IncomeSubcategory
from users.models import Company

# For each company, ensure an 'Uncategorized' category and 'Legacy' subcategory exists.
incomes = Income.objects.filter(subcategory__isnull=True)
print(f"Found {incomes.count()} incomes with null subcategory.")

for income in incomes:
    company = income.company
    if not company:
        continue
    
    cat, _ = IncomeCategory.objects.get_or_create(company=company, name="Uncategorized")
    subcat, _ = IncomeSubcategory.objects.get_or_create(company=company, category=cat, name="Legacy")
    
    income.subcategory = subcat
    income.save()

print(f"Fixed {incomes.count()} incomes.")
