from rest_framework import serializers
from .models import Category, Product, StockTransaction


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'category', 'category_name',
            'purchase_price', 'selling_price', 'current_stock',
            'min_stock_level', 'barcode', 'image', 'is_taxable',
            'tax_percentage', 'is_active',
            'is_low_stock', 'profit_margin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_stock']


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'category', 'category_name',
            'selling_price', 'current_stock', 'min_stock_level',
            'is_taxable', 'tax_percentage', 'is_active', 'is_low_stock'
        ]


class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'transaction_type', 'quantity', 'reference_id', 'notes',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StockAdjustmentSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True)
