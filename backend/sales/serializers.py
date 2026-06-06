from rest_framework import serializers
from decimal import Decimal
from .models import Customer, SalesInvoice, InvoiceItem, CreditLog, InvoiceTemplate


class CustomerSerializer(serializers.ModelSerializer):
    invoice_count = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'credit_balance',
            'is_active', 'invoice_count', 'total_sales', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_invoice_count(self, obj):
        return obj.invoices.exclude(status='cancelled').count()

    def get_total_sales(self, obj):
        from django.db.models import Sum
        total = obj.invoices.exclude(status='cancelled').aggregate(total=Sum('total_amount'))['total']
        return total or 0


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'product', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'tax_rate', 'total_price'
        ]
        read_only_fields = ['id', 'total_price']


class InvoiceItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['product', 'quantity', 'unit_price', 'tax_rate']

    def validate(self, data):
        product = data['product']
        quantity = data['quantity']
        if product.current_stock < quantity:
            raise serializers.ValidationError(
                f"Insufficient stock for {product.name}. Available: {product.current_stock}"
            )
        return data


class SalesInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'is_tax_invoice',
            'invoice_date', 'subtotal', 'tax_amount', 'discount_amount',
            'total_amount', 'paid_amount', 'balance_due', 'status', 'notes',
            'items', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount',
            'total_amount', 'balance_due', 'status', 'created_at', 'updated_at'
        ]


class SalesInvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemCreateSerializer(many=True)

    class Meta:
        model = SalesInvoice
        fields = ['customer', 'is_tax_invoice', 'invoice_date', 'discount_amount', 'paid_amount', 'notes', 'items']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one invoice item is required.")
        return value

    def create(self, validated_data):
        from django.db import transaction
        from inventory.models import StockTransaction
        items_data = validated_data.pop('items')
        discount = validated_data.get('discount_amount', 0)

        with transaction.atomic():
            invoice = SalesInvoice(**validated_data)
            invoice.save()

            subtotal = 0
            total_tax = 0
            for item_data in items_data:
                item_data['invoice'] = invoice
                tax_amount = (item_data['unit_price'] * item_data['quantity']) * (item_data.get('tax_rate', 0) / 100)
                item_data['total_price'] = (item_data['unit_price'] * item_data['quantity']) + tax_amount
                item = InvoiceItem.objects.create(**item_data)
                subtotal += item_data['unit_price'] * item_data['quantity']
                total_tax += tax_amount

                # Deduct stock
                product = item_data['product']
                product.current_stock -= item_data['quantity']
                product.save()

                StockTransaction.objects.create(
                    company=invoice.company,
                    product=product,
                    transaction_type='sale',
                    quantity=-item_data['quantity'],
                    reference_id=invoice.invoice_number,
                    notes=f'Sale invoice {invoice.invoice_number}'
                )

            invoice.subtotal = subtotal
            invoice.tax_amount = total_tax
            invoice.total_amount = subtotal + total_tax - Decimal(str(discount or 0))
            paid = Decimal(str(validated_data.get('paid_amount', 0)))
            invoice.balance_due = invoice.total_amount - paid
            
            if invoice.balance_due > 0 and not invoice.customer:
                raise serializers.ValidationError(
                    {"customer": "A customer must be selected for credit or partial payments."}
                )

            if invoice.balance_due <= 0:
                invoice.status = 'paid'
                invoice.balance_due = 0
            elif paid > 0:
                invoice.status = 'partial'
            else:
                invoice.status = 'pending'
            invoice.save()

            # Auto-create CreditLog when customer owes a balance
            if invoice.balance_due > 0 and invoice.customer:
                CreditLog.objects.create(
                    company=invoice.company,
                    customer=invoice.customer,
                    invoice=invoice,
                    credit_amount=invoice.balance_due,
                    paid_amount=0,
                    remaining_balance=invoice.balance_due,
                )
                # Update customer credit_balance
                invoice.customer.credit_balance += invoice.balance_due
                invoice.customer.save()

        return invoice

    def to_representation(self, instance):
        return SalesInvoiceSerializer(instance).data


class SalesInvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'is_tax_invoice',
            'invoice_date', 'total_amount', 'paid_amount', 'balance_due',
            'status', 'item_count', 'created_at'
        ]

    def get_item_count(self, obj):
        return obj.items.count()


class CreditLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = CreditLog
        fields = [
            'id', 'customer', 'customer_name', 'invoice', 'invoice_number',
            'credit_amount', 'paid_amount', 'remaining_balance', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class InvoiceTemplateSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceTemplate
        fields = [
            'id', 'name', 'template_type', 'is_default', 'logo', 'logo_url', 'config',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'logo_url']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
