import os
import re

APPS = ['inventory', 'sales', 'purchases', 'returns', 'payments', 'accounts']
BASE_DIR = '/run/media/dheena/Leave you files/Bill2/backend'

models_to_patch = {
    'inventory': ['Category', 'Product', 'StockTransaction'],
    'sales': ['Customer', 'SalesInvoice', 'InvoiceTemplate', 'CreditLog'],
    'purchases': ['Supplier', 'Purchase'],
    'returns': ['Return'],
    'payments': ['Payment'],
    'accounts': ['IncomeType', 'Income', 'ExpenseCategory', 'ExpenseSubcategory', 'Expense'],
}

def patch_managers():
    for app, models in models_to_patch.items():
        filepath = os.path.join(BASE_DIR, app, 'models.py')
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r') as f:
            content = f.read()

        # Add import if missing
        if 'TenantManager' not in content:
            content = 'from users.managers import TenantManager\n' + content

        for model in models:
            # Check if manager already added
            if f'class {model}(models.Model):' in content and 'objects = TenantManager()' not in content.split(f'class {model}(models.Model):')[1].split('class ')[0]:
                # Add `objects = TenantManager()` right after the company field or at start of class
                pattern = r'(class ' + model + r'\(models\.Model\):.*?\n    company = models\.ForeignKey.*?\n)'
                replacement = r"\1    objects = TenantManager()\n"
                
                # If the regex doesn't match, maybe company is not right there. Let's just insert after class definition.
                if not re.search(pattern, content, flags=re.DOTALL):
                    pattern = r'(class ' + model + r'\(models\.Model\):.*?\n)(    \w)'
                    replacement = r"\1    objects = TenantManager()\n\2"
                
                content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched managers in {filepath}")

patch_managers()
