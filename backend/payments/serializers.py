from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    reference_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_type', 'reference_type', 'reference_id', 'reference_name',
            'amount', 'payment_method', 'payment_date', 'notes',
            'recorded_by', 'recorded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_reference_name(self, obj):
        if not obj.reference_id:
            return None
            
        try:
            # Handle the formats created by our new actions
            if obj.reference_type == 'supplier':
                from purchases.models import Supplier
                if obj.reference_id.startswith('SUP-'):
                    supplier = Supplier.objects.get(id=obj.reference_id.split('-')[1])
                    return supplier.name
                elif obj.reference_id.startswith('PO-'):
                    from purchases.models import Purchase
                    purchase = Purchase.objects.get(id=obj.reference_id.split('-')[1])
                    return f"PO for {purchase.supplier.name}"
            
            elif obj.reference_type == 'credit':
                from sales.models import Customer
                if obj.reference_id.startswith('CUST-'):
                    customer = Customer.objects.get(id=obj.reference_id.split('-')[1])
                    return customer.name
                elif obj.reference_id.startswith('CR-'):
                    from sales.models import CreditLog
                    credit_log = CreditLog.objects.get(id=obj.reference_id.split('-')[1])
                    return credit_log.customer.name
                    
            elif obj.reference_type == 'invoice':
                # Assuming reference_id might be the invoice_number or ID
                from sales.models import SalesInvoice
                invoice = SalesInvoice.objects.filter(invoice_number=obj.reference_id).first()
                if invoice and invoice.customer:
                    return invoice.customer.name
                # Try by ID if it's numeric
                if str(obj.reference_id).isdigit():
                    invoice = SalesInvoice.objects.filter(id=obj.reference_id).first()
                    if invoice and invoice.customer:
                        return invoice.customer.name
                        
            elif obj.reference_type == 'purchase':
                from purchases.models import Purchase
                if obj.reference_id.startswith('PO-'):
                    purchase = Purchase.objects.filter(id=obj.reference_id.split('-')[1]).first()
                elif str(obj.reference_id).isdigit():
                    purchase = Purchase.objects.filter(id=obj.reference_id).first()
                else:
                    purchase = None
                if purchase and purchase.supplier:
                    return purchase.supplier.name
                    
        except Exception:
            pass
            
        return None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value
