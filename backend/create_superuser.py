#!/usr/bin/env python
"""
Script to create superuser programmatically.
Run: python create_superuser.py
Or use: python manage.py setup_initial_data
"""
import os
import sys
import django

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'billing_system.settings')

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

USERNAME = 'admin'
EMAIL = 'admin@billing.local'
PASSWORD = 'admin123'

if User.objects.filter(username=USERNAME).exists():
    print(f"Superuser '{USERNAME}' already exists.")
else:
    User.objects.create_superuser(username=USERNAME, email=EMAIL, password=PASSWORD)
    print(f"Superuser created:")
    print(f"  Username: {USERNAME}")
    print(f"  Email:    {EMAIL}")
    print(f"  Password: {PASSWORD}")
    print("\nChange the password after first login!")
