from rest_framework import serializers
from .models import Return
from inventory.models import Product


class ReturnSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.username', read_only=True)

    class Meta:
        model = Return
        fields = [
            'id', 'return_type', 'reference_id', 'product', 'product_name', 'product_sku',
            'quantity', 'return_amount', 'reason', 'processed_by', 'processed_by_name',
            'processed_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        return_type = data.get('return_type')
        product = data.get('product')
        quantity = data.get('quantity', 0)

        if quantity <= 0:
            raise serializers.ValidationError("Quantity must be positive.")

        # For purchase returns, check if stock is available to deduct
        if return_type == 'purchase':
            if product.current_stock < quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock to return. Available: {product.current_stock}"
                )
        return data

    def create(self, validated_data):
        from django.db import transaction
        from inventory.models import StockTransaction

        with transaction.atomic():
            ret = Return.objects.create(**validated_data)
            product = validated_data['product']
            quantity = validated_data['quantity']
            return_type = validated_data['return_type']

            # Adjust stock
            if return_type == 'sales':
                # Customer returning goods: stock increases
                product.current_stock += quantity
                stock_qty = quantity
            else:
                # Returning goods to supplier: stock decreases
                product.current_stock -= quantity
                stock_qty = -quantity

            product.save()

            StockTransaction.objects.create(
                product=product,
                transaction_type='return',
                quantity=stock_qty,
                reference_id=validated_data['reference_id'],
                notes=f"{return_type.capitalize()} return. Reason: {validated_data.get('reason', '')}"
            )
        return ret
