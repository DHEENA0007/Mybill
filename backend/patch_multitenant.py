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

def patch_models():
    for app, models in models_to_patch.items():
        filepath = os.path.join(BASE_DIR, app, 'models.py')
        with open(filepath, 'r') as f:
            content = f.read()

        for model in models:
            # Check if company already added
            if f'class {model}(models.Model):' in content and 'company = models.ForeignKey' not in content.split(f'class {model}(models.Model):')[1].split('class ')[0]:
                # find the class definition
                pattern = r'(class ' + model + r'\(models\.Model\):.*?)\n(    \w)'
                # add company field after class definition
                replacement = r"\1\n    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)\n\2"
                content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)
                
                # also replace unique=True with unique_together for specific fields
                if model == 'Category':
                    content = content.replace('name = models.CharField(max_length=200, unique=True)', 'name = models.CharField(max_length=200)')
                    content = content.replace("ordering = ['name']", "ordering = ['name']\n        unique_together = ('company', 'name')")
                if model == 'Product':
                    content = content.replace('sku = models.CharField(max_length=100, unique=True)', 'sku = models.CharField(max_length=100)')
                    content = content.replace('barcode = models.CharField(max_length=100, unique=True, blank=True, null=True)', 'barcode = models.CharField(max_length=100, blank=True, null=True)')
                    content = content.replace("ordering = ['name']", "ordering = ['name']\n        unique_together = (('company', 'sku'),)")
                if model == 'IncomeType':
                    content = content.replace('name = models.CharField(max_length=200, unique=True)', 'name = models.CharField(max_length=200)')
                    content = content.replace("db_table = 'income_types'", "db_table = 'income_types'\n        unique_together = ('company', 'name')")
                if model == 'ExpenseCategory':
                    content = content.replace('name = models.CharField(max_length=200, unique=True)', 'name = models.CharField(max_length=200)')
                    content = content.replace("db_table = 'expense_categories'", "db_table = 'expense_categories'\n        unique_together = ('company', 'name')")
                if model == 'SalesInvoice':
                    # Do not remove unique=True from invoice_number, it should be unique_together with company
                    content = content.replace('invoice_number = models.CharField(max_length=30, unique=True, editable=False)', 'invoice_number = models.CharField(max_length=30, editable=False)')
                    content = content.replace("ordering = ['-invoice_date', '-created_at']", "ordering = ['-invoice_date', '-created_at']\n        unique_together = ('company', 'invoice_number')")

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

patch_models()
