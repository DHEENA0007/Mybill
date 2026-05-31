#!/usr/bin/env python
import os
import django
import sys

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import User, Company, Role, UserRole

try:
    print("=" * 60)
    print("UPDATING USER DATA")
    print("=" * 60)
    
    # Step 1: Create superadmin user if not exists
    print("\n[1] Creating/Retrieving superadmin user...")
    superadmin, created = User.objects.get_or_create(
        username='superadmin',
        defaults={
            'email': 'superadmin@billing.local',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        }
    )
    if created:
        superadmin.set_password('admin123')
        superadmin.save()
        print(f"    ✓ Superadmin user created")
        print(f"      Username: superadmin")
        print(f"      Password: admin123")
    else:
        print(f"    ✓ Superadmin user already exists")
    
    # Step 2: Create or get company "ap"
    print("\n[2] Creating/Retrieving company 'ap'...")
    company, created = Company.objects.get_or_create(
        slug='ap',
        defaults={
            'name': 'ap',
            'email': 'admin@ap.local',
            'country': 'India',
            'is_active': True,
        }
    )
    if created:
        print(f"    ✓ Company 'ap' created")
    else:
        print(f"    ✓ Company 'ap' already exists")
    
    # Step 3: Get the admin user and assign company
    print("\n[3] Updating admin user...")
    admin_user = User.objects.get(username='admin')
    admin_user.company = company
    admin_user.save()
    print(f"    ✓ Admin user assigned to company 'ap'")
    
    # Step 4: Create or get "company admin" role
    print("\n[4] Creating/Retrieving 'company admin' role...")
    company_admin_role, created = Role.objects.get_or_create(
        name='company admin',
        company=company,
        defaults={
            'description': 'Company administrator with full access',
        }
    )
    if created:
        print(f"    ✓ 'company admin' role created")
    else:
        print(f"    ✓ 'company admin' role already exists")
    
    # Step 5: Assign company admin role to admin user
    print("\n[5] Assigning 'company admin' role to admin user...")
    user_role, created = UserRole.objects.get_or_create(
        user=admin_user,
        role=company_admin_role,
    )
    if created:
        print(f"    ✓ Role assigned to admin user")
    else:
        print(f"    ✓ Role already assigned to admin user")
    
    # Summary
    print("\n" + "=" * 60)
    print("UPDATE COMPLETED SUCCESSFULLY")
    print("=" * 60)
    
    print("\n✓ SUPERADMIN USER:")
    print(f"  - Username: superadmin")
    print(f"  - Password: admin123")
    print(f"  - Email: {superadmin.email}")
    print(f"  - Is Superuser: {superadmin.is_superuser}")
    
    print("\n✓ ADMIN USER (Updated):")
    print(f"  - Username: {admin_user.username}")
    print(f"  - Email: {admin_user.email}")
    print(f"  - Company: {admin_user.company.name}")
    print(f"  - Role: company admin")
    print(f"  - Is Active: {admin_user.is_active}")
    
    print("\n✓ COMPANY:")
    print(f"  - Name: {company.name}")
    print(f"  - Slug: {company.slug}")
    print(f"  - Email: {company.email}")
    print(f"  - Country: {company.country}")
    
    print("\n" + "=" * 60)
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
