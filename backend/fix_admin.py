#!/usr/bin/env python
import os
import django
import sys

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import User, Company

try:
    print("=" * 60)
    print("FIXING ADMIN USER CREDENTIALS")
    print("=" * 60)
    
    # Get admin user
    admin_user = User.objects.get(username='admin')
    
    print(f"\nBefore:")
    print(f"  is_superuser: {admin_user.is_superuser}")
    print(f"  is_staff: {admin_user.is_staff}")
    print(f"  company: {admin_user.company}")
    
    # Fix admin user
    admin_user.is_superuser = False  # NOT a superuser
    admin_user.is_staff = True  # IS staff (company admin)
    admin_user.set_password('admin123')  # Set password
    admin_user.save()
    
    print(f"\nAfter:")
    print(f"  is_superuser: {admin_user.is_superuser}")
    print(f"  is_staff: {admin_user.is_staff}")
    print(f"  company: {admin_user.company}")
    
    print("\n" + "=" * 60)
    print("✓ Admin user fixed!")
    print("✓ Can now log in with: username=admin, password=admin123")
    print("✓ Will see Company Setup (not Super Admin Portal)")
    print("=" * 60)
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
