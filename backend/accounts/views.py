from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import IncomeType, Income, ExpenseCategory, ExpenseSubcategory, Expense
from .serializers import (
    IncomeTypeSerializer, IncomeSerializer,
    ExpenseCategorySerializer, ExpenseSubcategorySerializer, ExpenseSerializer
)


class IncomeTypeViewSet(viewsets.ModelViewSet):
    queryset = IncomeType.objects.all().order_by('name')
    serializer_class = IncomeTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # No pagination for dropdown lists


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Income.objects.all().select_related('income_type').order_by('-date', '-id')
        # Filters
        income_type = self.request.query_params.get('income_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        if income_type:
            qs = qs.filter(income_type_id=income_type)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(remarks__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all().prefetch_related('subcategories').order_by('name')
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class ExpenseSubcategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSubcategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = ExpenseSubcategory.objects.all().select_related('category').order_by('name')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        return qs


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Expense.objects.all().select_related('subcategory__category').order_by('-date', '-id')
        category = self.request.query_params.get('category')
        subcategory = self.request.query_params.get('subcategory')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(subcategory__category_id=category)
        if subcategory:
            qs = qs.filter(subcategory_id=subcategory)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(remarks__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AccountsDashboardViewSet(viewsets.ViewSet):
    """Dashboard summary for the accounts portal."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        today = timezone.now().date()
        first_of_month = today.replace(day=1)
        last_month_start = (first_of_month - timedelta(days=1)).replace(day=1)
        last_month_end = first_of_month - timedelta(days=1)

        # Current month totals
        income_total = Income.objects.filter(
            date__gte=first_of_month, date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or 0

        expense_total = Expense.objects.filter(
            date__gte=first_of_month, date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Last month totals for trend
        prev_income = Income.objects.filter(
            date__gte=last_month_start, date__lte=last_month_end
        ).aggregate(total=Sum('amount'))['total'] or 0

        prev_expense = Expense.objects.filter(
            date__gte=last_month_start, date__lte=last_month_end
        ).aggregate(total=Sum('amount'))['total'] or 0

        # All-time totals
        all_income = Income.objects.aggregate(total=Sum('amount'))['total'] or 0
        all_expense = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0

        # Monthly breakdown (last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_income = list(
            Income.objects.filter(date__gte=six_months_ago)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        monthly_expense = list(
            Expense.objects.filter(date__gte=six_months_ago)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )

        # Expense by category
        expense_by_category = list(
            Expense.objects.filter(date__gte=first_of_month, date__lte=today)
            .values('subcategory__category__name')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )

        # Income by type
        income_by_type = list(
            Income.objects.filter(date__gte=first_of_month, date__lte=today)
            .values('income_type__name')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )

        # Recent transactions
        recent_incomes = IncomeSerializer(
            Income.objects.select_related('income_type').order_by('-date', '-id')[:5], many=True
        ).data
        recent_expenses = ExpenseSerializer(
            Expense.objects.select_related('subcategory__category').order_by('-date', '-id')[:5], many=True
        ).data

        def calc_trend(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100, 1)

        return Response({
            'current_month': {
                'income': float(income_total),
                'expense': float(expense_total),
                'balance': float(income_total - expense_total),
                'income_trend': calc_trend(float(income_total), float(prev_income)),
                'expense_trend': calc_trend(float(expense_total), float(prev_expense)),
            },
            'all_time': {
                'income': float(all_income),
                'expense': float(all_expense),
                'balance': float(all_income - all_expense),
            },
            'monthly_income': [
                {'month': m['month'].strftime('%Y-%m'), 'total': float(m['total'])}
                for m in monthly_income
            ],
            'monthly_expense': [
                {'month': m['month'].strftime('%Y-%m'), 'total': float(m['total'])}
                for m in monthly_expense
            ],
            'expense_by_category': [
                {'name': e['subcategory__category__name'], 'total': float(e['total'])}
                for e in expense_by_category
            ],
            'income_by_type': [
                {'name': i['income_type__name'], 'total': float(i['total'])}
                for i in income_by_type
            ],
            'recent_incomes': recent_incomes,
            'recent_expenses': recent_expenses,
        })
