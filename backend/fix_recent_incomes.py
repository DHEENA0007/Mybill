import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from accounts.models import Income, IncomeCategory, IncomeSubcategory

# Fix the 5 incomes that were created with null subcategories.
# Since we don't know which category they selected, we'll assign them to "Uncategorized" -> "Legacy".
null_sub = Income.objects.filter(subcategory__isnull=True)
count = 0
for inc in null_sub:
    if not inc.company:
        continue
    cat, _ = IncomeCategory.objects.get_or_create(company=inc.company, name="Uncategorized")
    subcat, _ = IncomeSubcategory.objects.get_or_create(company=inc.company, category=cat, name="Legacy")
    inc.subcategory = subcat
    inc.save()
    count += 1

print(f"Fixed {count} recently added incomes.")
