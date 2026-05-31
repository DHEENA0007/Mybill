#!/usr/bin/env python
import os
import django
import sys

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import User, UserRole, Role, Company

try:
    # Find the admin user
    admin_user = User.objects.get(username='admin')
    
    print("=" * 60)
    print("COMPANY ADMIN USER INFORMATION")
    print("=" * 60)
    print(f"Username: {admin_user.username}")
    print(f"Email: {admin_user.email}")
    print(f"First Name: {admin_user.first_name}")
    print(f"Last Name: {admin_user.last_name}")
    print(f"Phone: {admin_user.phone}")
    print(f"Is Active: {admin_user.is_active}")
    
    # Get company information
    if admin_user.company:
        print("\nCompany Information:")
        print(f"  - Company Name: {admin_user.company.name}")
        print(f"  - Company Slug: {admin_user.company.slug}")
        print(f"  - Email: {admin_user.company.email}")
        print(f"  - Phone: {admin_user.company.phone}")
        print(f"  - Address: {admin_user.company.address}")
        print(f"  - City: {admin_user.company.city}")
        print(f"  - State: {admin_user.company.state}")
        print(f"  - Country: {admin_user.company.country}")
        print(f"  - Pincode: {admin_user.company.pincode}")
        print(f"  - GSTIN: {admin_user.company.gstin}")
        print(f"  - PAN: {admin_user.company.pan}")
        print(f"  - Currency: {admin_user.company.currency}")
        print(f"  - Currency Symbol: {admin_user.company.currency_symbol}")
        print(f"  - Financial Year Start Month: {admin_user.company.financial_year_start}")
    else:
        print("\nCompany Information: Not assigned to any company")
    
    # Get user roles
    user_roles = UserRole.objects.filter(user=admin_user).select_related('role')
    
    if user_roles.exists():
        print("\nAssigned Roles:")
        for user_role in user_roles:
            role = user_role.role
            print(f"  - Role Name: {role.name}")
            print(f"    Description: {role.description}")
            # Get permissions for this role
            permissions = role.role_permissions.all().select_related('permission')
            if permissions.exists():
                print("    Permissions:")
                for rp in permissions:
                    print(f"      • {rp.permission.category}: {rp.permission.name}")
    else:
        print("\nAssigned Roles: None")
    
    print("=" * 60)
    
except User.DoesNotExist:
    print("Error: Admin user with username 'admin' not found!")
    sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
