from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IncomeTypeViewSet, IncomeViewSet,
    ExpenseCategoryViewSet, ExpenseSubcategoryViewSet, ExpenseViewSet,
    AccountsDashboardViewSet
)

router = DefaultRouter()
router.register(r'income-types', IncomeTypeViewSet)
router.register(r'incomes', IncomeViewSet, basename='incomes')
router.register(r'expense-categories', ExpenseCategoryViewSet)
router.register(r'expense-subcategories', ExpenseSubcategoryViewSet, basename='expense-subcategories')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'accounts-dashboard', AccountsDashboardViewSet, basename='accounts-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
