from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role, Permission, RolePermission, UserRole, AuditLog


def get_user_permissions(user):
    """Return list of permission codenames for the user (all if superuser)."""
    if user.is_superuser:
        return list(Permission.objects.values_list('codename', flat=True))
    return list(
        user.user_roles
        .values_list('role__role_permissions__permission__codename', flat=True)
        .distinct()
    )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['roles'] = list(user.user_roles.values_list('role__name', flat=True))
        token['permissions'] = get_user_permissions(user)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        perms = get_user_permissions(user)
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'roles': list(user.user_roles.values_list('role__name', flat=True)),
            'permissions': perms,
        }
        return data


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class RolePermissionSerializer(serializers.ModelSerializer):
    permission_detail = PermissionSerializer(source='permission', read_only=True)

    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'permission', 'permission_detail', 'created_at']
        read_only_fields = ['id', 'created_at']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'user_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions(self, obj):
        role_perms = obj.role_permissions.select_related('permission').all()
        return PermissionSerializer([rp.permission for rp in role_perms], many=True).data

    def get_user_count(self, obj):
        return obj.user_roles.count()


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_name', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'is_active', 'is_staff', 'is_superuser',
            'roles', 'password', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']

    def get_roles(self, obj):
        return list(obj.user_roles.values_list('role__name', flat=True))

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'model_name', 'object_id', 'changes', 'timestamp']
        read_only_fields = ['id', 'timestamp']
