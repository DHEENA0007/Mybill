import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, RotateCcw,
  CreditCard, BarChart2, Shield, Users, ChevronLeft, ChevronRight,
  Tag, Truck, LogOut, Boxes, Layout, CalendarDays
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import usePermission from '../../hooks/usePermission';

// Each item has optional `perm` — one or more codenames; if any match, item is visible.
// No `perm` means always visible.
const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Inventory',
    perm: ['inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust_stock', 'inventory.manage_categories'],
    items: [
      { to: '/products', icon: Package, label: 'Products', perm: ['inventory.view', 'inventory.add', 'inventory.edit'] },
      { to: '/categories', icon: Tag, label: 'Categories', perm: ['inventory.manage_categories', 'inventory.view'] },
      { to: '/inventory', icon: Boxes, label: 'Stock View', perm: ['inventory.view', 'inventory.adjust_stock'] },
    ],
  },
  {
    label: 'Purchases',
    perm: ['purchases.view', 'purchases.create', 'purchases.manage_suppliers'],
    items: [
      { to: '/suppliers', icon: Truck, label: 'Suppliers', perm: ['purchases.view', 'purchases.manage_suppliers'] },
      { to: '/purchases', icon: ShoppingCart, label: 'Purchases', perm: ['purchases.view', 'purchases.create'] },
    ],
  },
  {
    label: 'Sales',
    perm: ['sales.view', 'sales.create', 'sales.manage_customers', 'financial.view_credits'],
    items: [
      { to: '/billing', icon: FileText, label: 'Billing', perm: ['sales.create'] },
      { to: '/invoices', icon: FileText, label: 'Invoices', perm: ['sales.view', 'sales.create'] },
      { to: '/customers', icon: Users, label: 'Customers', perm: ['sales.view', 'sales.manage_customers'] },
      { to: '/credits', icon: CreditCard, label: 'Credit Logs', perm: ['financial.view_credits'] },
    ],
  },
  {
    label: 'Operations',
    perm: ['returns.view', 'returns.process_sales', 'returns.process_purchase', 'financial.view_payments', 'financial.record_payment'],
    items: [
      { to: '/returns', icon: RotateCcw, label: 'Returns', perm: ['returns.view', 'returns.process_sales', 'returns.process_purchase'] },
      { to: '/payments', icon: CreditCard, label: 'Payments', perm: ['financial.view_payments', 'financial.record_payment'] },
    ],
  },
  {
    label: 'Analytics',
    perm: ['reports.sales', 'reports.inventory', 'reports.financial'],
    items: [
      { to: '/reports/sales', icon: BarChart2, label: 'Sales Reports', perm: ['reports.sales'] },
      { to: '/reports/inventory', icon: BarChart2, label: 'Inventory', perm: ['reports.inventory'] },
      { to: '/reports/financial', icon: BarChart2, label: 'Financial', perm: ['reports.financial'] },
      { to: '/reports/calendar', icon: CalendarDays, label: 'Calendar', perm: ['reports.sales', 'reports.financial'] },
    ],
  },
  {
    label: 'Admin',
    perm: ['users.view', 'users.manage', 'users.manage_roles'],
    items: [
      { to: '/admin/users', icon: Users, label: 'Users', perm: ['users.view', 'users.manage'] },
      { to: '/admin/roles', icon: Shield, label: 'Roles', perm: ['users.manage_roles'] },
      { to: '/admin/invoice-templates', icon: Layout, label: 'Invoice Templates', perm: ['users.manage', 'users.manage_roles'] },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { can, isSuperAdmin } = usePermission();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isVisible = (perms) => {
    if (!perms) return true;
    if (isSuperAdmin) return true;
    return perms.some(p => can(p));
  };

  return (
    <aside className={`h-screen bg-slate-900 flex flex-col transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">BillPro</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <FileText className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => isVisible(item.perm));
          if (!visibleItems.length) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`
                      }
                      title={collapsed ? label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">
                {isSuperAdmin ? 'Super Admin' : (user?.roles?.length ? user.roles.join(', ') : 'Staff')}
              </p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1.5 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-2 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
