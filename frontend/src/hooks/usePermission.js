import useAuthStore from '../store/authStore';

/**
 * Returns helpers to check the current user's permissions.
 *
 * Usage:
 *   const { can, isSuperAdmin, isCompanyAdmin, company } = usePermission();
 *   can('sales.create')          // true/false
 *   can('sales.create', 'sales.edit')  // true if user has ANY of these
 */
export default function usePermission() {
  const { user } = useAuthStore();

  const isSuperAdmin = !!user?.is_superuser;
  const isCompanyAdmin = !!user?.is_staff && !!user?.company && !user?.is_superuser;
  const company = user?.company || null;

  const can = (...codenames) => {
    if (isSuperAdmin) return true;
    const userPerms = user?.permissions || [];
    return codenames.some(c => userPerms.includes(c));
  };

  const canAll = (...codenames) => {
    if (isSuperAdmin) return true;
    const userPerms = user?.permissions || [];
    return codenames.every(c => userPerms.includes(c));
  };

  return { can, canAll, isSuperAdmin, isCompanyAdmin, company };
}
