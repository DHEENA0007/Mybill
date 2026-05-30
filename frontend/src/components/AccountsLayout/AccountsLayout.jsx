import AccountsSidebar from './AccountsSidebar';
import Header from '../Layout/Header';
import { Outlet } from 'react-router-dom';

export default function AccountsLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AccountsSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
