from django.db import models
from django.conf import settings
from inventory.models import Product


class Supplier(models.Model):
    name = models.CharField(max_length=300)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gst_number = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suppliers'
        ordering = ['name']

    def __str__(self):
        return self.name


class Purchase(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('pending', 'Pending'),
    ]
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchases')
    purchase_date = models.DateField()
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchases'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date', '-created_at']

    def __str__(self):
        return f"PO-{self.id:04d} | {self.supplier.name} | {self.purchase_date}"

    def update_balance(self):
        self.balance_due = self.total_amount - self.paid_amount
        if self.balance_due <= 0:
            self.status = 'paid'
            self.balance_due = 0
        elif self.paid_amount > 0:
            self.status = 'partial'
        else:
            self.status = 'pending'
        self.save()


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchase_items')
    quantity = models.IntegerField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = 'purchase_items'

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ {self.purchase_price}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.purchase_price
        super().save(*args, **kwargs)
