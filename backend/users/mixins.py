from rest_framework import viewsets, status, filters

class TenantViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'is_superuser', False):
            return qs
        if getattr(user, 'company_id', None):
            return qs.filter(company=user.company)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        # For non-superusers with a company, automatically set the company.
        # Superusers can leave it null (or we can handle it later).
        if getattr(user, 'company_id', None) and not getattr(user, 'is_superuser', False):
            serializer.save(company=user.company)
        else:
            serializer.save()

class ReadOnlyTenantViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'is_superuser', False):
            return qs
        if getattr(user, 'company_id', None):
            return qs.filter(company=user.company)
        return qs.none()
