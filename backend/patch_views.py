import os

APPS = ['inventory', 'sales', 'purchases', 'returns', 'payments', 'accounts']
BASE_DIR = '/run/media/dheena/Leave you files/Bill2/backend'

def patch_views():
    for app in APPS:
        filepath = os.path.join(BASE_DIR, app, 'views.py')
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r') as f:
            content = f.read()

        # Add import if missing
        if 'TenantViewSet' not in content:
            # Find the line with `from rest_framework import viewsets`
            # and add the import after it
            content = content.replace(
                'from rest_framework import viewsets',
                'from rest_framework import viewsets\nfrom users.mixins import TenantViewSet, ReadOnlyTenantViewSet'
            )
            # Some files might have `from rest_framework import viewsets, status`
            if 'from users.mixins import TenantViewSet' not in content:
                import_statements = []
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith('from rest_framework '):
                        lines.insert(i+1, 'from users.mixins import TenantViewSet, ReadOnlyTenantViewSet')
                        break
                content = '\n'.join(lines)

        # Replace `viewsets.ModelViewSet` -> `TenantViewSet`
        # Replace `viewsets.ReadOnlyModelViewSet` -> `ReadOnlyTenantViewSet`
        # But wait! Some viewsets might not be models that need filtering, like AccountsDashboardViewSet which inherits from `viewsets.ViewSet`.
        # `TenantViewSet` covers `viewsets.ModelViewSet`.
        content = content.replace('(viewsets.ModelViewSet)', '(TenantViewSet)')
        content = content.replace('(viewsets.ReadOnlyModelViewSet)', '(ReadOnlyTenantViewSet)')

        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

patch_views()
