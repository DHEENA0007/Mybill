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
import InventoryExpenses from './pages/Inventory/InventoryExpenses';
import InventoryExpenseSettings from './pages/Inventory/InventoryExpenseSettings';
import InventoryIncomes from './pages/Inventory/InventoryIncomes';
import InventoryIncomeSettings from './pages/Inventory/InventoryIncomeSettings';
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
import CompanySetup from './pages/Admin/CompanySetup';

// Accounts Portal
import AccountsLayout from './components/AccountsLayout/AccountsLayout';
import AccountsDashboard from './pages/Accounts/Dashboard';
import Incomes from './pages/Accounts/Incomes';
import Expenses from './pages/Accounts/Expenses';
import AccountsSettings from './pages/Accounts/Settings';
import AccountsReports from './pages/Accounts/Reports';

// SuperAdmin Portal
import SuperAdminLayout from './components/SuperAdminLayout/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import Companies from './pages/SuperAdmin/Companies';
import Admins from './pages/SuperAdmin/Admins';

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

function SuperAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_superuser) return <Navigate to="/" replace />;
  return children;
}

function PortalRoute({ portal, children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Superadmins can access everything
  if (user?.is_superuser) return children;
  const portals = user?.allowed_portals || [];
  // If the user has access to this portal, allow
  if (portals.includes(portal)) return children;
  // Redirect to the first allowed portal, or fallback
  if (portal === 'accounts' && portals.includes('billing')) return <Navigate to="/" replace />;
  if (portal === 'billing' && portals.includes('accounts')) return <Navigate to="/accounts" replace />;
  
  // If no portals are allowed, returning to '/' creates an infinite loop. 
  // Let's return a simple unauthorized message.
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You do not have permission to access any portals.</p>
        <button 
          onClick={() => { useAuthStore.getState().logout(); window.location.href = '/login'; }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
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

          {/* Main App Routes (Billing Portal) */}
          <Route path="/" element={<PortalRoute portal="billing"><Layout /></PortalRoute>}>
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
            <Route path="expenses" element={<InventoryExpenses />} />
            <Route path="expense-categories" element={<InventoryExpenseSettings />} />
            <Route path="incomes" element={<InventoryIncomes />} />
            <Route path="income-categories" element={<InventoryIncomeSettings />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/roles" element={<RoleManagement />} />
            <Route path="admin/company-setup" element={<CompanySetup />} />
            <Route path="admin/invoice-templates" element={<InvoiceTemplates />} />
            <Route path="admin/invoice-templates/new" element={<InvoiceTemplateEditor />} />
            <Route path="admin/invoice-templates/:id/edit" element={<InvoiceTemplateEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          
          {/* Accounts Portal Routes */}
          <Route path="/accounts" element={<PortalRoute portal="accounts"><AccountsLayout /></PortalRoute>}>
            <Route index element={<AccountsDashboard />} />
            <Route path="incomes" element={<Incomes />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<AccountsReports />} />
            <Route path="settings" element={<AccountsSettings />} />
          </Route>

          {/* SuperAdmin Portal Routes */}
          <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="companies" element={<Companies />} />
            <Route path="admins" element={<Admins />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
