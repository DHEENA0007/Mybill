from rest_framework import serializers
from .models import IncomeType, Income, ExpenseCategory, ExpenseSubcategory, Expense

class IncomeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeType
        fields = '__all__'

class IncomeSerializer(serializers.ModelSerializer):
    income_type_name = serializers.CharField(source='income_type.name', read_only=True)

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
    category_name = serializers.CharField(source='subcategory.category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('created_by',)
