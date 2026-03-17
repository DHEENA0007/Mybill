from django.contrib import admin
from .models import Return


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ['return_type', 'reference_id', 'product', 'quantity', 'return_amount', 'processed_at']
    list_filter = ['return_type', 'processed_at']
    search_fields = ['reference_id', 'product__name', 'reason']
    readonly_fields = ['created_at']
