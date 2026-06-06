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
router.register(r'accounts-expense-categories', ExpenseCategoryViewSet, basename='accounts-expense-categories')
router.register(r'accounts-expense-subcategories', ExpenseSubcategoryViewSet, basename='accounts-expense-subcategories')
router.register(r'accounts-expenses', ExpenseViewSet, basename='accounts-expenses')
router.register(r'accounts-dashboard', AccountsDashboardViewSet, basename='accounts-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
