from users.managers import TenantManager
from django.db import models
from django.conf import settings
from django.utils import timezone
from inventory.models import Product


class Return(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    RETURN_TYPE_CHOICES = [
        ('sales', 'Sales Return'),
        ('purchase', 'Purchase Return'),
    ]
    return_type = models.CharField(max_length=10, choices=RETURN_TYPE_CHOICES)
    reference_id = models.CharField(max_length=100, help_text='Invoice number or Purchase order ID')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='returns')
    quantity = models.IntegerField()
    return_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.TextField()
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='processed_returns'
    )
    processed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'returns'
        ordering = ['-processed_at']

    def __str__(self):
        return f"{self.return_type.upper()} Return | {self.product.name} x {self.quantity} | Ref: {self.reference_id}"
