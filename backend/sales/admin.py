from django.contrib import admin
from .models import Customer, SalesInvoice, InvoiceItem, CreditLog


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ['total_price']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'credit_balance', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'phone', 'email']


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'invoice_date', 'total_amount', 'paid_amount', 'balance_due', 'status']
    list_filter = ['status', 'invoice_date']
    search_fields = ['invoice_number', 'customer__name']
    inlines = [InvoiceItemInline]
    readonly_fields = ['invoice_number', 'subtotal', 'tax_amount', 'total_amount', 'balance_due', 'status']


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'product', 'quantity', 'unit_price', 'total_price']
    readonly_fields = ['total_price']


@admin.register(CreditLog)
class CreditLogAdmin(admin.ModelAdmin):
    list_display = ['customer', 'invoice', 'credit_amount', 'paid_amount', 'remaining_balance', 'created_at']
    search_fields = ['customer__name']
