import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFinancialReport } from '../../api/reports';
import Card from '../../components/UI/Card';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_PERIODS } from '../../utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';

export default function FinancialReport() {
  const [period, setPeriod] = useState('month');
  const { data, isLoading } = useQuery({ queryKey: ['reports-financial', period], queryFn: () => getFinancialReport({ period }).then(r => r.data) });
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        {REPORT_PERIODS.filter(p => p.value !== 'today' && p.value !== 'custom').map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: formatCurrency(data?.revenue || 0), color: 'text-indigo-600' },
          { label: 'COGS', value: formatCurrency(data?.cogs || 0), color: 'text-amber-600' },
          { label: 'Gross Profit', value: formatCurrency(data?.gross_profit || 0), color: 'text-emerald-600' },
          { label: 'Customer Credit', value: formatCurrency(data?.customer_credit || 0), color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label}><p className="text-sm text-gray-500">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Revenue vs COGS</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.monthly_breakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#4f46e5" name="Revenue" radius={[4,4,0,0]} />
              <Bar dataKey="cogs" fill="#f59e0b" name="COGS" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Supplier Pending Payments</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.supplier_pending || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <span className="font-bold text-red-600">{formatCurrency(s.pending)}</span>
              </div>
            ))}
            {!(data?.supplier_pending?.length) && <p className="text-sm text-gray-400 text-center py-8">No pending payments</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
