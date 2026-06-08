from users.managers import TenantManager
from django.db import models
from django.conf import settings
from django.utils import timezone


class Payment(models.Model):
    company = models.ForeignKey('users.Company', on_delete=models.CASCADE, null=True, blank=True)
    objects = TenantManager()
    PAYMENT_TYPE_CHOICES = [
        ('incoming', 'Incoming'),
        ('outgoing', 'Outgoing'),
    ]
    REFERENCE_TYPE_CHOICES = [
        ('invoice', 'Invoice'),
        ('purchase', 'Purchase'),
        ('credit', 'Credit Settlement'),
        ('supplier', 'Supplier Payment'),
        ('other', 'Other'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('bank', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('other', 'Other'),
    ]

    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPE_CHOICES)
    reference_type = models.CharField(max_length=10, choices=REFERENCE_TYPE_CHOICES)
    reference_id = models.CharField(max_length=100, help_text='Invoice number or Purchase ID')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='cash')
    payment_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.payment_type.upper()} | {self.payment_method} | {self.amount} | Ref: {self.reference_id}"
