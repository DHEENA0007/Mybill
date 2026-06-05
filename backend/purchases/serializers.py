from rest_framework import serializers
from .models import Supplier, Purchase, PurchaseItem
from inventory.models import Product
from inventory.serializers import ProductListSerializer


class SupplierSerializer(serializers.ModelSerializer):
    purchase_count = serializers.SerializerMethodField()
    total_purchased = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'gst_number',
            'is_active', 'purchase_count', 'total_purchased', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_purchase_count(self, obj):
        return obj.purchases.count()

    def get_total_purchased(self, obj):
        from django.db.models import Sum
        total = obj.purchases.aggregate(total=Sum('total_amount'))['total']
        return total or 0


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['id', 'purchase', 'product', 'product_name', 'product_sku', 'quantity', 'purchase_price', 'total_price']
        read_only_fields = ['id', 'total_price']


class PurchaseItemCreateSerializer(serializers.ModelSerializer):
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['product', 'quantity', 'purchase_price', 'selling_price']


class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'supplier', 'supplier_name', 'purchase_date',
            'total_amount', 'paid_amount', 'balance_due', 'status', 'notes',
            'items', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_amount', 'balance_due', 'status', 'created_at', 'updated_at']


class PurchaseCreateSerializer(serializers.ModelSerializer):
    items = PurchaseItemCreateSerializer(many=True)

    class Meta:
        model = Purchase
        fields = ['supplier', 'purchase_date', 'paid_amount', 'notes', 'items']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one purchase item is required.")
        return value

    def create(self, validated_data):
        from django.db import transaction
        from inventory.models import StockTransaction
        items_data = validated_data.pop('items')

        with transaction.atomic():
            purchase = Purchase.objects.create(**validated_data)
            total = 0
            for item_data in items_data:
                item_data['purchase'] = purchase
                item_data['total_price'] = item_data['quantity'] * item_data['purchase_price']
                item = PurchaseItem.objects.create(**item_data)
                total += item.total_price

                # Update product stock
                product = item_data['product']
                product.current_stock += item_data['quantity']
                product.purchase_price = item_data['purchase_price']
                if 'selling_price' in item_data and item_data['selling_price']:
                    product.selling_price = item_data['selling_price']
                product.save()

                # Create stock transaction
                StockTransaction.objects.create(
                    product=product,
                    transaction_type='purchase',
                    quantity=item_data['quantity'],
                    reference_id=f'PO-{purchase.id:04d}',
                    notes=f'Purchase from {purchase.supplier.name}'
                )

            purchase.total_amount = total
            purchase.balance_due = total - purchase.paid_amount
            if purchase.balance_due <= 0:
                purchase.status = 'paid'
                purchase.balance_due = 0
            elif purchase.paid_amount > 0:
                purchase.status = 'partial'
            else:
                purchase.status = 'pending'
            purchase.save()
        return purchase

    def update(self, instance, validated_data):
        from django.db import transaction
        items_data = validated_data.pop('items', None)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            if items_data is not None:
                # Remove old items and reverse stock
                from inventory.models import StockTransaction
                for old_item in instance.items.all():
                    old_item.product.current_stock -= old_item.quantity
                    old_item.product.save()
                instance.items.all().delete()

                total = 0
                for item_data in items_data:
                    item_data['purchase'] = instance
                    item_data['total_price'] = item_data['quantity'] * item_data['purchase_price']
                    item = PurchaseItem.objects.create(**item_data)
                    total += item.total_price

                    product = item_data['product']
                    product.current_stock += item_data['quantity']
                    product.purchase_price = item_data['purchase_price']
                    if 'selling_price' in item_data and item_data['selling_price']:
                        product.selling_price = item_data['selling_price']
                    product.save()

                    StockTransaction.objects.create(
                        product=product,
                        transaction_type='purchase',
                        quantity=item_data['quantity'],
                        reference_id=f'PO-{instance.id:04d}',
                        notes=f'Purchase update from {instance.supplier.name}'
                    )

                instance.total_amount = total
                instance.balance_due = instance.total_amount - instance.paid_amount
                if instance.balance_due <= 0:
                    instance.status = 'paid'
                    instance.balance_due = 0
                elif instance.paid_amount > 0:
                    instance.status = 'partial'
                else:
                    instance.status = 'pending'

            instance.save()
        return instance


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            'id', 'supplier', 'supplier_name', 'purchase_date',
            'total_amount', 'paid_amount', 'balance_due', 'status', 'item_count', 'created_at'
        ]

    def get_item_count(self, obj):
        return obj.items.count()
