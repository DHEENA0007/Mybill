from django.db import models
from users.middleware import get_current_company

class TenantManager(models.Manager):
    def get_queryset(self):
        qs = super().get_queryset()
        company = get_current_company()
        if company:
            return qs.filter(company=company)
        return qs
