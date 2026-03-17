import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, AlertTriangle, Clock } from 'lucide-react';
import { getDashboardStats } from '../../api/reports';
import { getInvoices } from '../../api/invoices';
import { getLowStock } from '../../api/products';
import StatCard from '../../components/UI/StatCard';
import Card, { CardHeader } from '../../components/UI/Card';
import { StatusBadge } from '../../components/UI/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboardStats().then(r => r.data) });
  const { data: invoicesData } = useQuery({ queryKey: ['invoices', { page: 1 }], queryFn: () => getInvoices({ page: 1, page_size: 5 }).then(r => r.data) });
  const { data: lowStock } = useQuery({ queryKey: ['low-stock'], queryFn: () => getLowStock().then(r => r.data) });

  if (isLoading) return <PageLoader />;

  const todaySales = stats?.today?.sales || 0;
  const monthRevenue = stats?.this_month?.sales || 0;
  const lowStockCount = stats?.inventory?.low_stock || 0;
  const pendingPayments = stats?.outstanding?.receivables || 0;
  const salesChart = stats?.sales_chart || [];
  const topProducts = (stats?.top_products || []).map(p => ({ ...p, name: p['product__name'] || p.name }));

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Sales" value={formatCurrency(todaySales)} icon={TrendingUp} color="indigo" subtitle="Total invoices today" />
        <StatCard title="Monthly Revenue" value={formatCurrency(monthRevenue)} icon={ShoppingBag} color="emerald" subtitle={new Date().toLocaleString('default', { month: 'long' })} />
        <StatCard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} color="amber" subtitle="Need restocking" />
        <StatCard title="Pending Payments" value={formatCurrency(pendingPayments)} icon={Clock} color="red" subtitle="Outstanding balances" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Sales Trend" subtitle="Last 30 days" />
          {salesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => formatDate(d)} />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No sales data available</div>
          )}
        </Card>

        <Card>
          <CardHeader title="Top Products" subtitle="By revenue" />
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No data available</div>
          )}
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Recent Invoices</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(invoicesData?.results || []).slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{inv.customer_name || 'Walk-in'} · {formatDate(inv.invoice_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {!invoicesData?.results?.length && <p className="text-sm text-gray-400 px-6 py-8 text-center">No invoices yet</p>}
          </div>
        </Card>

        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Low Stock Alerts</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(Array.isArray(lowStock) ? lowStock : []).slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">{p.current_stock} left</p>
                  <p className="text-xs text-gray-400">Min: {p.min_stock_level}</p>
                </div>
              </div>
            ))}
            {!(Array.isArray(lowStock) ? lowStock : []).length && <p className="text-sm text-gray-400 px-6 py-8 text-center">All stocks are healthy</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
