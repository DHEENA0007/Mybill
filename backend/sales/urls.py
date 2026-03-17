from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, SalesInvoiceViewSet, CreditLogViewSet, InvoiceTemplateViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'invoices', SalesInvoiceViewSet, basename='invoices')
router.register(r'credit-logs', CreditLogViewSet, basename='credit-logs')
router.register(r'invoice-templates', InvoiceTemplateViewSet, basename='invoice-templates')

urlpatterns = [
    path('', include(router.urls)),
]
