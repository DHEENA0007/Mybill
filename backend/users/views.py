from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, Role, Permission, RolePermission, UserRole, AuditLog
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, RoleSerializer,
    PermissionSerializer, RolePermissionSerializer, UserRoleSerializer, AuditLogSerializer
)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['username', 'email', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        from .serializers import get_user_permissions
        serializer = self.get_serializer(request.user)
        data = serializer.data
        data['permissions'] = get_user_permissions(request.user)
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def assign_role(self, request, pk=None):
        user = self.get_object()
        role_id = request.data.get('role_id')
        if not role_id:
            return Response({'error': 'role_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            role = Role.objects.get(pk=role_id)
            UserRole.objects.get_or_create(user=user, role=role)
            return Response({'message': f'Role {role.name} assigned to {user.username}.'})
        except Role.DoesNotExist:
            return Response({'error': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def remove_role(self, request, pk=None):
        user = self.get_object()
        role_id = request.data.get('role_id')
        try:
            role = Role.objects.get(pk=role_id)
            UserRole.objects.filter(user=user, role=role).delete()
            return Response({'message': f'Role {role.name} removed from {user.username}.'})
        except Role.DoesNotExist:
            return Response({'error': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    @action(detail=True, methods=['post'])
    def assign_permissions(self, request, pk=None):
        """Replace all permissions for a role with the provided list."""
        role = self.get_object()
        permission_ids = request.data.get('permission_ids', [])
        RolePermission.objects.filter(role=role).delete()
        for perm_id in permission_ids:
            try:
                perm = Permission.objects.get(pk=perm_id)
                RolePermission.objects.get_or_create(role=role, permission=perm)
            except Permission.DoesNotExist:
                pass
        serializer = RoleSerializer(role)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_permission(self, request, pk=None):
        role = self.get_object()
        permission_id = request.data.get('permission_id')
        try:
            perm = Permission.objects.get(pk=permission_id)
            RolePermission.objects.get_or_create(role=role, permission=perm)
            return Response({'message': f'Permission {perm.codename} added to role {role.name}.'})
        except Permission.DoesNotExist:
            return Response({'error': 'Permission not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def remove_permission(self, request, pk=None):
        role = self.get_object()
        permission_id = request.data.get('permission_id')
        try:
            perm = Permission.objects.get(pk=permission_id)
            RolePermission.objects.filter(role=role, permission=perm).delete()
            return Response({'message': f'Permission removed from role {role.name}.'})
        except Permission.DoesNotExist:
            return Response({'error': 'Permission not found.'}, status=status.HTTP_404_NOT_FOUND)


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all().order_by('category', 'name')
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'codename', 'category']

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'model_name', 'object_id', 'user__username']

    def get_queryset(self):
        queryset = super().get_queryset()
        model_name = self.request.query_params.get('model_name')
        action_param = self.request.query_params.get('action')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        if action_param:
            queryset = queryset.filter(action=action_param)
        return queryset
