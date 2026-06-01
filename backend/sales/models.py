from django.db import models
from django.conf import settings
from django.utils import timezone
from inventory.models import Product
import uuid


def generate_invoice_number(is_tax_invoice=False):
    from datetime import date
    from users.middleware import get_current_company
    
    today = date.today()
    company = get_current_company()
    
    # Defaults
    prefix = 'GST-' if is_tax_invoice else 'INV-'
    start_number = 1
    reset_yearly = True
    
    if company:
        prefix = company.gst_invoice_prefix if is_tax_invoice else company.non_gst_invoice_prefix
        start_number = company.invoice_start_number
        reset_yearly = company.reset_invoice_number_yearly
        
        # Determine financial year start date for the current year
        current_year = today.year
        fy_start_month = company.financial_year_start
        if today.month < fy_start_month:
            fy_start_date = date(current_year - 1, fy_start_month, 1)
        else:
            fy_start_date = date(current_year, fy_start_month, 1)
            
    if company and reset_yearly:
        # Count invoices in the current financial year of the same type
        count = SalesInvoice.objects.filter(
            invoice_date__gte=fy_start_date,
            is_tax_invoice=is_tax_invoice
        ).count()
    else:
        # Count all invoices of the same type
        count = SalesInvoice.objects.filter(is_tax_invoice=is_tax_invoice).count()
        
    next_number = start_number + count
    return f"{prefix}{next_number:04d}"


class Customer(models.Model):
    name = models.CharField(max_length=300)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['name']

    def __str__(self):
        return self.name


class SalesInvoice(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
    ]
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices', null=True, blank=True)
    invoice_date = models.DateField(default=timezone.now)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices'
    )
    is_tax_invoice = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_invoices'
        ordering = ['-invoice_date', '-created_at']

    def __str__(self):
        return f"{self.invoice_number} | {self.customer} | {self.total_amount}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = generate_invoice_number(self.is_tax_invoice)
        super().save(*args, **kwargs)

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


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='invoice_items')
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ {self.unit_price}"

    def save(self, *args, **kwargs):
        tax_amount = (self.unit_price * self.quantity) * (self.tax_rate / 100)
        self.total_price = (self.unit_price * self.quantity) + tax_amount
        super().save(*args, **kwargs)


class InvoiceTemplate(models.Model):
    TEMPLATE_TYPE_CHOICES = [
        ('tax', 'Tax Invoice'),
        ('nontax', 'Non-Tax Invoice'),
    ]
    name = models.CharField(max_length=200)
    template_type = models.CharField(max_length=10, choices=TEMPLATE_TYPE_CHOICES, default='nontax')
    is_default = models.BooleanField(default=False)
    logo = models.ImageField(upload_to='invoice_logos/', blank=True, null=True)
    config = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoice_templates'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_default:
            InvoiceTemplate.objects.filter(is_default=True, template_type=self.template_type).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class CreditLog(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='credit_logs')
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_logs')
    credit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.customer.name} | Credit: {self.credit_amount} | Remaining: {self.remaining_balance}"
