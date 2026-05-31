#!/usr/bin/env python
import os
import django
import sys

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')
django.setup()

from users.models import User

print("=" * 70)
print("USER ACCOUNT STATUS")
print("=" * 70)

users = User.objects.all().values('username', 'email', 'is_superuser', 'is_staff', 'company__name')

for user in users:
    print(f"\nUsername: {user['username']}")
    print(f"  Email: {user['email']}")
    print(f"  Is Superuser: {user['is_superuser']}")
    print(f"  Is Staff: {user['is_staff']}")
    print(f"  Company: {user['company__name'] or 'None (system-wide)'}")

print("\n" + "=" * 70)
print("VISIBILITY RULES:")
print("=" * 70)
print("✓ Super Admin button: ONLY visible to is_superuser=True users")
print("✓ Admin Portal button: Visible to all users")
print("=" * 70)
