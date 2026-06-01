from django.contrib.auth.models import AbstractUser
from django.db import models


class Company(models.Model):
    """Tenant company — each admin manages one company."""
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=10, blank=True, null=True)
    gstin = models.CharField(max_length=20, blank=True, null=True, verbose_name='GSTIN')
    pan = models.CharField(max_length=15, blank=True, null=True, verbose_name='PAN')
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    currency = models.CharField(max_length=5, default='INR')
    currency_symbol = models.CharField(max_length=5, default='₹')
    financial_year_start = models.IntegerField(default=4, help_text='Month number (1-12)')
    gst_invoice_prefix = models.CharField(max_length=20, default='GST-')
    non_gst_invoice_prefix = models.CharField(max_length=20, default='INV-')
    invoice_start_number = models.IntegerField(default=1)
    reset_invoice_number_yearly = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        verbose_name_plural = 'Companies'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True,
        related_name='users',
        help_text='Company this user belongs to. NULL for superadmins.'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.email})"


class Role(models.Model):
    name = models.CharField(max_length=100)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True,
        related_name='roles',
        help_text='Company-scoped role. NULL = global role.'
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        unique_together = ('name', 'company')

    def __str__(self):
        return self.name


class Permission(models.Model):
    CATEGORY_CHOICES = [
        ('inventory', 'Inventory'),
        ('purchases', 'Purchases'),
        ('sales', 'Sales'),
        ('returns', 'Returns'),
        ('financial', 'Financial'),
        ('users', 'Users'),
        ('reports', 'Reports'),
        ('accounts', 'Accounts'),
    ]
    name = models.CharField(max_length=200)
    codename = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='inventory')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permissions_custom'

    def __str__(self):
        return f"{self.category}: {self.name}"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_permissions'
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role.name} - {self.permission.codename}"


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_roles'
        unique_together = ('user', 'role')

    def __str__(self):
        return f"{self.user.username} - {self.role.name}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50)
    changes = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} {self.model_name} ({self.object_id})"
