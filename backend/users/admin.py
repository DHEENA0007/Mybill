from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, UserRole, AuditLog, Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'email', 'phone', 'city', 'is_active', 'created_at')
    list_filter = ('is_active', 'state', 'country')
    search_fields = ('name', 'email', 'gstin')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'company', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'company')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Company', {'fields': ('phone', 'company')}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'description')
    list_filter = ('company',)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'codename', 'category')
    list_filter = ('category',)


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ('role', 'permission')


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'assigned_at')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'action', 'model_name', 'timestamp')
    list_filter = ('action', 'model_name', 'company')
    readonly_fields = ('user', 'company', 'action', 'model_name', 'object_id', 'changes', 'timestamp')
