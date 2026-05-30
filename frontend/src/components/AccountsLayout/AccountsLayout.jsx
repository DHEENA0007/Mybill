import { useState } from 'react';
import { Menu, X, Wallet, Bell } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import AccountsSidebar from './AccountsSidebar';
import useAuthStore from '../../store/authStore';

const titles = {
  '/accounts': 'Dashboard',
  '/accounts/incomes': 'Incomes Management',
  '/accounts/expenses': 'Expenses Management',
  '/accounts/reports': 'Financial Reports',
  '/accounts/settings': 'Settings & Categories',
};

export default function AccountsLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const title = titles[pathname] || 'Accounts Portal';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Desktop Sidebar (Docked) - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block h-full flex-shrink-0">
        <AccountsSidebar />
      </div>

      {/* Mobile Sidebar Drawer - Overlay on mobile when toggled */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Slide-out Drawer Panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 shadow-2xl lg:hidden flex flex-col">
            {/* Close button inside mobile menu */}
            <div className="flex justify-end p-2 border-b border-indigo-900 bg-indigo-950">
              <button 
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AccountsSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Custom Responsive Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{title}</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-700">{user?.username || 'User'}</p>
                <p className="text-[9px] text-gray-400 font-medium">Accounts Officer</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
