import { useQuery } from '@tanstack/react-query';
import { getInventoryReport } from '../../api/reports';
import Card from '../../components/UI/Card';
import { formatCurrency } from '../../utils/formatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';

const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

export default function InventoryReport() {
  const { data, isLoading } = useQuery({ queryKey: ['reports-inventory'], queryFn: () => getInventoryReport().then(r => r.data) });
  if (isLoading) return <PageLoader />;

  // Backend returns: { summary: {...}, by_category: [...], low_stock_products: [...], recent_transactions: [...] }
  const categoryChartData = (data?.by_category || []).map(c => ({ name: c.name, value: c.stock_value || 0 }));
  const lowStockItems = data?.low_stock_products || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: data?.summary?.total_products || 0 },
          { label: 'Total Stock Value', value: formatCurrency(data?.summary?.total_stock_value || 0) },
          { label: 'Low Stock Items', value: data?.summary?.low_stock_count || 0 },
          { label: 'Out of Stock', value: data?.summary?.out_of_stock || 0 },
        ].map((s) => (
          <Card key={s.label}><p className="text-sm text-gray-500">{s.label}</p><p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Stock Value by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                {categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Low Stock Items</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category__name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{item.current_stock} left</p>
                  <p className="text-xs text-gray-400">Min: {item.min_stock_level}</p>
                </div>
              </div>
            ))}
            {!lowStockItems.length && <p className="text-sm text-gray-400 text-center py-8">All stocks are healthy</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
