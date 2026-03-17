from django.contrib import admin
from .models import Supplier, Purchase, PurchaseItem


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = ['total_price']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'gst_number', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'phone', 'email', 'gst_number']


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'purchase_date', 'total_amount', 'paid_amount', 'balance_due', 'status']
    list_filter = ['status', 'purchase_date']
    search_fields = ['supplier__name']
    inlines = [PurchaseItemInline]
    readonly_fields = ['total_amount', 'balance_due', 'status']


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = ['purchase', 'product', 'quantity', 'purchase_price', 'total_price']
    readonly_fields = ['total_price']
