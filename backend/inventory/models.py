from users.managers import TenantManager
from django.db import models
from django.conf import settings


class Category(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
        unique_together = (('company', 'sku'),)
        unique_together = ('company', 'name')

    def __str__(self):
        return self.name


class Product(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_stock = models.IntegerField(default=0)
    min_stock_level = models.IntegerField(default=10)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_taxable = models.BooleanField(default=True)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['name']
        unique_together = (('company', 'sku'),)
        unique_together = ('company', 'name')

    def __str__(self):
        return f"{self.name} (SKU: {self.sku})"

    @property
    def is_low_stock(self):
        return self.current_stock <= self.min_stock_level

    @property
    def profit_margin(self):
        if self.purchase_price > 0:
            return ((self.selling_price - self.purchase_price) / self.purchase_price) * 100
        return 0


class StockTransaction(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    TRANSACTION_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('return', 'Return'),
        ('adjustment', 'Adjustment'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    quantity = models.IntegerField()  # positive = stock in, negative = stock out
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stock_transactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_transactions'
        ordering = ['-created_at']

    def __str__(self):
        direction = '+' if self.quantity > 0 else ''
        return f"{self.product.name} | {self.transaction_type} | {direction}{self.quantity}"
