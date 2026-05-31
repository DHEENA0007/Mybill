import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Building2, Users, LayoutDashboard, LogOut, Shield, ChevronLeft,
  ChevronRight, ArrowLeftRight, Menu, X
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/superadmin/companies', icon: Building2, label: 'Companies' },
  { to: '/superadmin/admins', icon: Users, label: 'Company Admins' },
];

export default function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = ({ onClose }) => (
    <aside className={`h-screen flex flex-col transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">BillPro</span>
              <p className="text-[10px] text-violet-300 font-medium -mt-0.5">SUPER ADMIN</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => { setCollapsed(!collapsed); if (onClose) onClose(); }}
          className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors ml-auto hidden lg:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => { if (onClose) onClose(); }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/60 text-white shadow-lg shadow-violet-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/8'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Switch to Main App */}
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-all bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Main App' : undefined}
        >
          <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Main App</span>}
        </button>
      </div>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'S'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.username || 'SuperAdmin'}</p>
              <p className="text-xs text-violet-300 truncate">Super Admin</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl lg:hidden flex flex-col">
            <div className="flex justify-end p-2 border-b border-white/10" style={{ background: '#0f172a' }}>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-600" />
                Super Admin Portal
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400">
                Manage companies and administrators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
              <Shield className="w-3 h-3" /> Super Admin
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
