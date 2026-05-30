from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import IncomeType, Income, ExpenseCategory, ExpenseSubcategory, Expense
from .serializers import (
    IncomeTypeSerializer, IncomeSerializer,
    ExpenseCategorySerializer, ExpenseSubcategorySerializer, ExpenseSerializer
)

class IncomeTypeViewSet(viewsets.ModelViewSet):
    queryset = IncomeType.objects.all()
    serializer_class = IncomeTypeSerializer
    permission_classes = [IsAuthenticated]

class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all().select_related('income_type')
    serializer_class = IncomeSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all().prefetch_related('subcategories')
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]

class ExpenseSubcategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseSubcategory.objects.all()
    serializer_class = ExpenseSubcategorySerializer
    permission_classes = [IsAuthenticated]

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().select_related('subcategory__category')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
