from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IncomeTypeViewSet, IncomeViewSet,
    ExpenseCategoryViewSet, ExpenseSubcategoryViewSet, ExpenseViewSet
)

router = DefaultRouter()
router.register(r'income-types', IncomeTypeViewSet)
router.register(r'incomes', IncomeViewSet)
router.register(r'expense-categories', ExpenseCategoryViewSet)
router.register(r'expense-subcategories', ExpenseSubcategoryViewSet)
router.register(r'expenses', ExpenseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
