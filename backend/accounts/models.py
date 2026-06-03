from users.managers import TenantManager
from django.db import models
from django.conf import settings

class IncomeType(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Income(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    income_type = models.ForeignKey(IncomeType, on_delete=models.PROTECT, related_name='incomes')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.income_type.name} - {self.amount}"

class ExpenseCategory(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ExpenseSubcategory(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    category = models.ForeignKey(ExpenseCategory, on_delete=models.CASCADE, related_name='subcategories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

class Expense(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    subcategory = models.ForeignKey(ExpenseSubcategory, on_delete=models.PROTECT, related_name='expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.subcategory.name} - {self.amount}"
