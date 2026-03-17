from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_type', 'reference_type', 'reference_id', 'amount', 'payment_method', 'payment_date']
    list_filter = ['payment_type', 'reference_type', 'payment_method', 'payment_date']
    search_fields = ['reference_id', 'notes']
    readonly_fields = ['created_at', 'updated_at']
