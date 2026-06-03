import os
import re

APPS = ['sales', 'purchases']
BASE_DIR = '/run/media/dheena/Leave you files/Bill2/backend'

models_to_patch = {
    'sales': ['InvoiceItem'],
    'purchases': ['PurchaseItem'],
}

def patch_items():
    for app, models in models_to_patch.items():
        filepath = os.path.join(BASE_DIR, app, 'models.py')
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r') as f:
            content = f.read()

        for model in models:
            if f'class {model}(models.Model):' in content and 'company = models.ForeignKey' not in content.split(f'class {model}(models.Model):')[1].split('class ')[0]:
                pattern = r'(class ' + model + r'\(models\.Model\):.*?)\n(    \w)'
                replacement = r"\1\n    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)\n    objects = TenantManager()\n\2"
                content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched items in {filepath}")

patch_items()
