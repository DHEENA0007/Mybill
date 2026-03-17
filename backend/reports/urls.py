from django.urls import path
from .views import SalesReportView, InventoryReportView, FinancialReportView, DashboardStatsView

urlpatterns = [
    path('reports/sales/', SalesReportView.as_view(), name='report-sales'),
    path('reports/inventory/', InventoryReportView.as_view(), name='report-inventory'),
    path('reports/financial/', FinancialReportView.as_view(), name='report-financial'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
