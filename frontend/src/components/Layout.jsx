import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const tenantLinks = [
  ['/', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/products', 'Products'],
  ['/invoices', 'Invoices'],
  ['/expenses', 'Expenses'],
  ['/reports', 'Reports'],
  ['/templates', 'Template Studio'],
  ['/users', 'Team'],
  ['/support', 'Support'],
  ['/subscription', 'Subscription']
];

const adminLinks = [
  ['/admin', 'Admin Dashboard'],
  ['/admin/tenants', 'Subscribers'],
  ['/admin/coupons', 'Coupons'],
  ['/admin/announcements', 'Announcements'],
  ['/admin/refunds', 'Refunds'],
  ['/admin/settings', 'Settings'],
  ['/admin/tickets', 'Tickets'],
  ['/admin/activity', 'Activity Logs']
];

const Layout = () => {
  const { logout, user } = useAuth();
  const links = user?.role === 'super_admin' ? adminLinks : tenantLinks;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold text-indigo-900">MyBill</h1>
          <nav className="flex flex-wrap gap-4 text-sm">
            {links.map(([to, label]) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </nav>
          <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={logout}>
            Logout {user?.name}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
