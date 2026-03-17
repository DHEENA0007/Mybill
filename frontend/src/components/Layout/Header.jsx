import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const titles = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/inventory': 'Inventory',
  '/suppliers': 'Suppliers',
  '/purchases': 'Purchases',
  '/billing': 'New Invoice',
  '/invoices': 'Invoices',
  '/customers': 'Customers',
  '/credits': 'Credit Logs',
  '/returns': 'Returns',
  '/payments': 'Payments',
  '/reports/sales': 'Sales Reports',
  '/reports/inventory': 'Inventory Reports',
  '/reports/financial': 'Financial Reports',
  '/admin/users': 'User Management',
  '/admin/roles': 'Role Management',
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const title = titles[pathname] || 'BillPro';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-400">
              {user?.is_superuser
                ? 'Super Admin'
                : (user?.roles?.length > 0 ? user.roles.join(', ') : 'Staff')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
