import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesReport } from '../../api/reports';
import Card, { CardHeader } from '../../components/UI/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { REPORT_PERIODS } from '../../utils/constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';

export default function SalesReport() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-sales', { period, startDate, endDate }],
    queryFn: () => getSalesReport({ period, start_date: startDate, end_date: endDate }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {REPORT_PERIODS.filter(p => p.value !== 'quarter').map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {period === 'custom' && (
          <>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(data?.total_revenue || 0), color: 'text-indigo-600' },
          { label: 'Total Invoices', value: data?.total_invoices || 0, color: 'text-gray-800' },
          { label: 'Paid', value: formatCurrency(data?.paid_revenue || 0), color: 'text-emerald-600' },
          { label: 'Pending', value: formatCurrency(data?.pending_revenue || 0), color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Sales Trend" />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.daily_sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { day: '2-digit', month: 'short' })} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Top Products" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(data?.top_products || []).slice(0,8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {data?.status_breakdown && (
        <Card>
          <CardHeader title="Invoice Status Breakdown" />
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(data.status_breakdown).map(([k, v]) => (
              <div key={k} className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{k}</p>
                <p className="text-2xl font-bold text-gray-800">{v.count}</p>
                <p className="text-sm text-gray-600 mt-0.5">{formatCurrency(v.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
