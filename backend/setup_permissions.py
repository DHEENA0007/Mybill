#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import Permission, Role, RolePermission, UserRole, User, Company

try:
    print("=" * 70)
    print("SETTING UP PERMISSIONS FOR COMPANY ADMIN")
    print("=" * 70)
    
    # Define all permissions needed
    permissions_data = [
        # Inventory
        ('inventory.view', 'Inventory', 'View inventory'),
        ('inventory.add', 'Inventory', 'Add products'),
        ('inventory.edit', 'Inventory', 'Edit products'),
        ('inventory.adjust_stock', 'Inventory', 'Adjust stock'),
        ('inventory.manage_categories', 'Inventory', 'Manage categories'),
        
        # Purchases
        ('purchases.view', 'Purchases', 'View purchases'),
        ('purchases.create', 'Purchases', 'Create purchases'),
        ('purchases.manage_suppliers', 'Purchases', 'Manage suppliers'),
        
        # Sales
        ('sales.view', 'Sales', 'View sales'),
        ('sales.create', 'Sales', 'Create sales/billing'),
        ('sales.manage_customers', 'Sales', 'Manage customers'),
        
        # Financial
        ('financial.view_credits', 'Financial', 'View credit logs'),
        ('financial.view_payments', 'Financial', 'View payments'),
        ('financial.record_payment', 'Financial', 'Record payments'),
        
        # Returns
        ('returns.view', 'Returns', 'View returns'),
        ('returns.process_sales', 'Returns', 'Process sales returns'),
        ('returns.process_purchase', 'Returns', 'Process purchase returns'),
        
        # Reports
        ('reports.sales', 'Reports', 'Sales reports'),
        ('reports.inventory', 'Reports', 'Inventory reports'),
        ('reports.financial', 'Reports', 'Financial reports'),
        
        # Users/Admin
        ('users.view', 'Users', 'View users'),
        ('users.manage', 'Users', 'Manage users'),
        ('users.manage_roles', 'Users', 'Manage roles'),
    ]
    
    print("\n[1] Creating permissions...")
    created_count = 0
    for codename, category, name in permissions_data:
        perm, created = Permission.objects.get_or_create(
            codename=codename,
            defaults={
                'name': name,
                'category': {
                    'Inventory': 'inventory',
                    'Purchases': 'purchases',
                    'Sales': 'sales',
                    'Financial': 'financial',
                    'Returns': 'returns',
                    'Reports': 'reports',
                    'Users': 'users',
                }.get(category, 'inventory'),
            }
        )
        if created:
            created_count += 1
    
    print(f"    ✓ {created_count} new permissions created")
    print(f"    ✓ Total permissions: {Permission.objects.count()}")
    
    # Get the company and role
    print("\n[2] Getting company admin role...")
    company = Company.objects.get(slug='ap')
    role = Role.objects.get(name='company admin', company=company)
    print(f"    ✓ Found role: {role.name}")
    
    # Remove existing role permissions
    RolePermission.objects.filter(role=role).delete()
    print(f"    ✓ Cleared old permissions")
    
    # Link all permissions to company admin role
    print("\n[3] Assigning permissions to company admin role...")
    all_perms = Permission.objects.all()
    for perm in all_perms:
        RolePermission.objects.get_or_create(
            role=role,
            permission=perm,
        )
    
    print(f"    ✓ {all_perms.count()} permissions assigned to company admin")
    
    # Verify admin user has the role
    print("\n[4] Verifying admin user...")
    admin_user = User.objects.get(username='admin')
    user_role = UserRole.objects.filter(user=admin_user, role=role)
    
    if user_role.exists():
        print(f"    ✓ Admin user has company admin role")
    else:
        print(f"    ✗ Admin user missing role - creating...")
        UserRole.objects.create(user=admin_user, role=role)
        print(f"    ✓ Role assigned")
    
    # Show permissions for admin user
    print("\n[5] Admin user permissions:")
    perms = admin_user.user_roles.values_list(
        'role__role_permissions__permission__codename',
        flat=True
    ).distinct()
    
    for perm in sorted(perms):
        if perm:
            print(f"    • {perm}")
    
    print("\n" + "=" * 70)
    print("✓ SETUP COMPLETE!")
    print("=" * 70)
    print("\nAdmin user (admin@ap) now has access to:")
    print("  • Inventory, Products, Categories, Stock View")
    print("  • Suppliers, Purchases")
    print("  • Billing, Invoices, Customers, Credit Logs")
    print("  • Returns, Payments")
    print("  • Sales Reports, Inventory Reports, Financial Reports")
    print("  • Users, Roles, Company Setup")
    print("\n" + "=" * 70)
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
