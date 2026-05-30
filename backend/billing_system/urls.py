from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, RoleViewSet, PermissionViewSet, AuditLogViewSet
from billing_system.choices_view import ChoicesView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'permissions', PermissionViewSet, basename='permissions')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/choices/', ChoicesView.as_view(), name='choices'),
    path('api/', include(router.urls)),
    path('api/', include('inventory.urls')),
    path('api/', include('purchases.urls')),
    path('api/', include('sales.urls')),
    path('api/', include('returns.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('reports.urls')),
    path('api/', include('accounts.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
