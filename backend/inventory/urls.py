from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, StockTransactionViewSet, 
    ProductPrefixViewSet, ExpenseCategoryViewSet, 
    ExpenseSubcategoryViewSet, ExpenseViewSet,
    IncomeCategoryViewSet, IncomeSubcategoryViewSet, IncomeViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'products', ProductViewSet, basename='products')
router.register(r'stock-transactions', StockTransactionViewSet, basename='stock-transactions')
router.register(r'product-prefixes', ProductPrefixViewSet, basename='product-prefixes')
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expense-categories')
router.register(r'expense-subcategories', ExpenseSubcategoryViewSet, basename='expense-subcategories')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'income-categories', IncomeCategoryViewSet, basename='income-categories')
router.register(r'income-subcategories', IncomeSubcategoryViewSet, basename='income-subcategories')
router.register(r'incomes', IncomeViewSet, basename='incomes')

urlpatterns = [
    path('', include(router.urls)),
]
