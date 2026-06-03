from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser, BasePermission
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.utils.text import slugify

from .models import User, Role, Permission, RolePermission, UserRole, AuditLog, Company
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, RoleSerializer,
    PermissionSerializer, RolePermissionSerializer, UserRoleSerializer,
    AuditLogSerializer, CompanySerializer, CompanySetupSerializer,
    CompanyAdminSerializer, get_user_permissions,
)


# ── Custom Permissions ───────────────────────────────────────────────────

class IsSuperAdmin(BasePermission):
    """Only allow Django superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


class IsCompanyAdmin(BasePermission):
    """Allow company admins (is_staff=True with a company)."""
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated
            and (request.user.is_superuser or (request.user.is_staff and request.user.company_id))
        )


# ── Auth Views ───────────────────────────────────────────────────────────

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


# ── SuperAdmin: Company Management ───────────────────────────────────────

class CompanyViewSet(viewsets.ModelViewSet):
    """
    Superadmin-only CRUD for companies.
    """
    queryset = Company.objects.all().order_by('-created_at')
    serializer_class = CompanySerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'city', 'gstin']
    ordering_fields = ['name', 'created_at']

    def perform_create(self, serializer):
        # Auto-generate slug if not provided
        name = serializer.validated_data.get('name', '')
        slug = serializer.validated_data.get('slug', '') or slugify(name)
        # Ensure uniqueness
        base_slug = slug
        counter = 1
        while Company.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        serializer.save(slug=slug)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        company = self.get_object()
        company.is_active = not company.is_active
        company.save()
        return Response({'is_active': company.is_active})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Dashboard stats for superadmin."""
        total = Company.objects.count()
        active = Company.objects.filter(is_active=True).count()
        total_admins = User.objects.filter(is_staff=True, is_superuser=False).count()
        total_users = User.objects.filter(is_superuser=False).count()
        companies = Company.objects.filter(is_active=True).order_by('-created_at')[:5]
        recent = CompanySerializer(companies, many=True).data
        return Response({
            'total_companies': total,
            'active_companies': active,
            'total_admins': total_admins,
            'total_users': total_users,
            'recent_companies': recent,
        })


# ── SuperAdmin: Company Admin Management ─────────────────────────────────

class CompanyAdminViewSet(viewsets.ModelViewSet):
    """
    Superadmin-only CRUD for company admins.
    """
    serializer_class = CompanyAdminSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company__name']
    ordering_fields = ['username', 'created_at']

    def get_queryset(self):
        qs = User.objects.filter(is_staff=True, is_superuser=False).select_related('company').order_by('-created_at')
        company_id = self.request.query_params.get('company')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs


# ── Company Setup (for company admins) ───────────────────────────────────

class CompanySetupViewSet(viewsets.ViewSet):
    """
    Allows a company admin to view and update their own company details.
    """
    permission_classes = [IsCompanyAdmin]

    def list(self, request):
        company = request.user.company
        if not company:
            return Response({'detail': 'No company assigned.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySetupSerializer(company)
        return Response(serializer.data)

    def create(self, request):
        """Update company setup (uses POST for simplicity)."""
        company = request.user.company
        if not company:
            return Response({'detail': 'No company assigned.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySetupSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── User Management (company-scoped) ─────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['username', 'email', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        # Superadmins see all users
        if not user.is_superuser and user.company_id:
            queryset = queryset.filter(company=user.company)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.company_id:
            serializer.save(company=user.company)
        else:
            serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        data = serializer.data
        from .serializers import get_user_permissions
        data['permissions'] = get_user_permissions(request.user)
        data['allowed_portals'] = request.user.allowed_portals or []
        # Include company details
        if request.user.company:
            data['company'] = {
                'id': request.user.company.id,
                'name': request.user.company.name,
                'slug': request.user.company.slug,
                'currency_symbol': request.user.company.currency_symbol,
            }
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


# ── Role Management (company-scoped) ─────────────────────────────────────

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_superuser and user.company_id:
            queryset = queryset.filter(company=user.company)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.company_id:
            serializer.save(company=user.company)
        else:
            serializer.save()

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


# ── Permission & AuditLog ────────────────────────────────────────────────

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
        user = self.request.user
        if not user.is_superuser and user.company_id:
            queryset = queryset.filter(company=user.company)
        model_name = self.request.query_params.get('model_name')
        action_param = self.request.query_params.get('action')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        if action_param:
            queryset = queryset.filter(action=action_param)
        return queryset
