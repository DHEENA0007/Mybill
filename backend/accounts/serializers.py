from rest_framework import serializers
from .models import IncomeCategory, IncomeSubcategory, Income, ExpenseCategory, ExpenseSubcategory, Expense

class IncomeSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeSubcategory
        fields = '__all__'

class IncomeCategorySerializer(serializers.ModelSerializer):
    subcategories = IncomeSubcategorySerializer(many=True, read_only=True)

    class Meta:
        model = IncomeCategory
        fields = '__all__'

class IncomeSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source='subcategory.category.id', read_only=True)
    category_name = serializers.CharField(source='subcategory.category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Income
        fields = '__all__'
        read_only_fields = ('created_by',)

class ExpenseSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseSubcategory
        fields = '__all__'

class ExpenseCategorySerializer(serializers.ModelSerializer):
    subcategories = ExpenseSubcategorySerializer(many=True, read_only=True)

    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source='subcategory.category.id', read_only=True)
    category_name = serializers.CharField(source='subcategory.category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('created_by',)
