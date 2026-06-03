import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, PieChart, Wallet,
  ChevronLeft, ChevronRight, LogOut, Settings, ArrowLeftRight
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import usePermission from '../../hooks/usePermission';

const navGroups = [
  {
    label: 'Accounts',
    items: [
      { to: '/accounts', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/accounts/incomes', icon: Wallet, label: 'Incomes' },
      { to: '/accounts/expenses', icon: CreditCard, label: 'Expenses' },
      { to: '/accounts/reports', icon: PieChart, label: 'Reports' },
      { to: '/accounts/settings', icon: Settings, label: 'Categories & Types' },
    ],
  }
];

export default function AccountsSidebar({ onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const switchToMain = () => {
    navigate('/');
  };

  return (
    <aside className={`h-screen bg-indigo-950 flex flex-col transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-indigo-900">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Accounts</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto">
            <Wallet className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-lg p-1 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/accounts'}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'text-indigo-200 hover:text-white hover:bg-indigo-900'
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
        ))}
      </nav>

      {/* Switch Portal Button - only show if user has billing access */}
      {(user?.is_superuser || (user?.allowed_portals || []).includes('billing')) && (
        <div className="px-3 pb-3">
          <button
            onClick={switchToMain}
            className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm font-medium transition-colors bg-indigo-900 text-indigo-200 hover:text-white hover:bg-indigo-800 border border-indigo-800 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Switch to Main App' : undefined}
          >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Main Portal</span>}
          </button>
        </div>
      )}

      {/* User */}
      <div className="border-t border-indigo-900 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.username || 'User'}</p>
            </div>
            <button onClick={handleLogout} className="text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-lg p-1.5 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-lg p-2 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
