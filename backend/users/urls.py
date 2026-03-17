from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView, UserViewSet, RoleViewSet, PermissionViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'logout', LogoutView, basename='logout')

urlpatterns = [
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]

# Additional user/role/permission URLs handled in main api router
