import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import TemplatesPage from './pages/TemplatesPage';
import ProductsPage from './pages/ProductsPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SupportPage from './pages/SupportPage';
import UsersPage from './pages/UsersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminTenantsPage from './pages/AdminTenantsPage';
import AdminCouponsPage from './pages/AdminCouponsPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminActivityPage from './pages/AdminActivityPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminRefundsPage from './pages/AdminRefundsPage';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';

const Protected = () => {
  const { user } = useAuth();
  return user ? <Layout /> : <Navigate to="/auth" replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Protected />}>
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/tenants" element={<AdminTenantsPage />} />
            <Route path="admin/coupons" element={<AdminCouponsPage />} />
            <Route path="admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="admin/refunds" element={<AdminRefundsPage />} />
            <Route path="admin/settings" element={<AdminSettingsPage />} />
            <Route path="admin/tickets" element={<AdminTicketsPage />} />
            <Route path="admin/activity" element={<AdminActivityPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
