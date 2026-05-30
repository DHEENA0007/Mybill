from django.core.management.base import BaseCommand
from users.models import Permission

PERMISSIONS = [
    # Inventory
    ('inventory', 'View Products & Stock',       'inventory.view'),
    ('inventory', 'Add Products',                'inventory.add'),
    ('inventory', 'Edit Products',               'inventory.edit'),
    ('inventory', 'Delete Products',             'inventory.delete'),
    ('inventory', 'Adjust Stock',                'inventory.adjust_stock'),
    ('inventory', 'Manage Categories',           'inventory.manage_categories'),

    # Purchases
    ('purchases', 'View Purchases & Suppliers',  'purchases.view'),
    ('purchases', 'Create Purchase Entry',        'purchases.create'),
    ('purchases', 'Edit Purchase',               'purchases.edit'),
    ('purchases', 'Record Purchase Payment',     'purchases.record_payment'),
    ('purchases', 'Manage Suppliers',            'purchases.manage_suppliers'),

    # Sales
    ('sales', 'View Invoices',                   'sales.view'),
    ('sales', 'Create Sales Invoice',            'sales.create'),
    ('sales', 'Edit Invoice',                    'sales.edit'),
    ('sales', 'Cancel Invoice',                  'sales.cancel'),
    ('sales', 'Record Invoice Payment',          'sales.record_payment'),
    ('sales', 'Manage Customers',                'sales.manage_customers'),

    # Returns
    ('returns', 'View Returns',                  'returns.view'),
    ('returns', 'Process Sales Return',          'returns.process_sales'),
    ('returns', 'Process Purchase Return',       'returns.process_purchase'),

    # Financial
    ('financial', 'View Credit Logs',            'financial.view_credits'),
    ('financial', 'View Payments',               'financial.view_payments'),
    ('financial', 'Record Payment',              'financial.record_payment'),

    # Reports
    ('reports', 'View Sales Reports',            'reports.sales'),
    ('reports', 'View Inventory Reports',        'reports.inventory'),
    ('reports', 'View Financial Reports',        'reports.financial'),

    # Users
    ('users', 'View Users',                      'users.view'),
    ('users', 'Manage Users',                    'users.manage'),
    ('users', 'Manage Roles & Permissions',      'users.manage_roles'),

    # Accounts
    ('accounts', 'View Incomes',                 'accounts.view_incomes'),
    ('accounts', 'Manage Incomes',               'accounts.manage_incomes'),
    ('accounts', 'View Expenses',                'accounts.view_expenses'),
    ('accounts', 'Manage Expenses',              'accounts.manage_expenses'),
    ('accounts', 'Manage Income Types',          'accounts.manage_income_types'),
    ('accounts', 'Manage Expense Categories',    'accounts.manage_categories'),
    ('accounts', 'View Accounts Reports',        'accounts.view_reports'),
    ('accounts', 'View Accounts Dashboard',      'accounts.view_dashboard'),
]


class Command(BaseCommand):
    help = 'Seed all application permissions'

    def handle(self, *args, **kwargs):
        created = 0
        for category, name, codename in PERMISSIONS:
            _, was_created = Permission.objects.get_or_create(
                codename=codename,
                defaults={'name': name, 'category': category}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created} new permissions ({Permission.objects.count()} total)'
        ))
