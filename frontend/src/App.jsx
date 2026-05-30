import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import ProductList from './pages/Products/ProductList';
import CategoryList from './pages/Categories/CategoryList';
import StockView from './pages/Inventory/StockView';
import SupplierList from './pages/Suppliers/SupplierList';
import PurchaseList from './pages/Purchases/PurchaseList';
import PurchaseForm from './pages/Purchases/PurchaseForm';
import PurchaseDetail from './pages/Purchases/PurchaseDetail';
import CustomerList from './pages/Customers/CustomerList';
import BillingScreen from './pages/Sales/BillingScreen';
import InvoiceList from './pages/Sales/InvoiceList';
import InvoiceDetail from './pages/Sales/InvoiceDetail';
import Returns from './pages/Returns/Returns';
import Payments from './pages/Payments/Payments';
import CreditLog from './pages/Credits/CreditLog';
import SalesReport from './pages/Reports/SalesReport';
import InventoryReport from './pages/Reports/InventoryReport';
import FinancialReport from './pages/Reports/FinancialReport';
import CalendarReport from './pages/Reports/CalendarReport';
import UserManagement from './pages/Admin/UserManagement';
import RoleManagement from './pages/Admin/RoleManagement';
import InvoiceTemplates from './pages/Admin/InvoiceTemplates';
import InvoiceTemplateEditor from './pages/Admin/InvoiceTemplateEditor';

// Accounts Portal
import AccountsLayout from './components/AccountsLayout/AccountsLayout';
import AccountsDashboard from './pages/Accounts/Dashboard';
import Incomes from './pages/Accounts/Incomes';
import Expenses from './pages/Accounts/Expenses';
import AccountsSettings from './pages/Accounts/Settings';
import AccountsReports from './pages/Accounts/Reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px', fontWeight: '500' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="categories" element={<CategoryList />} />
            <Route path="inventory" element={<StockView />} />
            <Route path="suppliers" element={<SupplierList />} />
            <Route path="purchases" element={<PurchaseList />} />
            <Route path="purchases/new" element={<PurchaseForm />} />
            <Route path="purchases/:id" element={<PurchaseDetail />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="billing" element={<BillingScreen />} />
            <Route path="invoices" element={<InvoiceList />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="returns" element={<Returns />} />
            <Route path="payments" element={<Payments />} />
            <Route path="credits" element={<CreditLog />} />
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/inventory" element={<InventoryReport />} />
            <Route path="reports/financial" element={<FinancialReport />} />
            <Route path="reports/calendar" element={<CalendarReport />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/roles" element={<RoleManagement />} />
            <Route path="admin/invoice-templates" element={<InvoiceTemplates />} />
            <Route path="admin/invoice-templates/new" element={<InvoiceTemplateEditor />} />
            <Route path="admin/invoice-templates/:id/edit" element={<InvoiceTemplateEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          
          {/* Accounts Portal Routes */}
          <Route path="/accounts" element={<ProtectedRoute><AccountsLayout /></ProtectedRoute>}>
            <Route index element={<AccountsDashboard />} />
            <Route path="incomes" element={<Incomes />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<AccountsReports />} />
            <Route path="settings" element={<AccountsSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
