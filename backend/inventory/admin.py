from django.contrib import admin
from .models import Category, Product, StockTransaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'purchase_price', 'selling_price', 'current_stock', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'sku', 'barcode']
    readonly_fields = ['current_stock']


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ['product', 'transaction_type', 'quantity', 'reference_id', 'created_at']
    list_filter = ['transaction_type']
    search_fields = ['product__name', 'reference_id']
    readonly_fields = ['created_at']
