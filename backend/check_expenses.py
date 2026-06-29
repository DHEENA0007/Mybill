import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from accounts.models import Expense, ExpenseSubcategory, ExpenseCategory
from inventory.models import Expense as InvExpense, ExpenseSubcategory as InvExpenseSubcategory, ExpenseCategory as InvExpenseCategory

def fix_accounts_expenses():
    null_sub = Expense.objects.filter(subcategory__isnull=True)
    count = 0
    for exp in null_sub:
        if not exp.company:
            continue
        cat, _ = ExpenseCategory.objects.get_or_create(company=exp.company, name="Uncategorized")
        subcat, _ = ExpenseSubcategory.objects.get_or_create(company=exp.company, category=cat, name="Legacy")
        exp.subcategory = subcat
        exp.save()
        count += 1
    print(f"Fixed {count} accounts expenses.")

def fix_inv_expenses():
    null_sub = InvExpense.objects.filter(subcategory__isnull=True)
    count = 0
    for exp in null_sub:
        if not exp.company:
            continue
        cat, _ = InvExpenseCategory.objects.get_or_create(company=exp.company, name="Uncategorized")
        subcat, _ = InvExpenseSubcategory.objects.get_or_create(company=exp.company, category=cat, name="Legacy")
        exp.subcategory = subcat
        exp.save()
        count += 1
    print(f"Fixed {count} inventory expenses.")

fix_accounts_expenses()
fix_inv_expenses()
