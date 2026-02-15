import { useEffect, useState } from 'react';
import client from '../api/client';

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    client.get('/reports/summary').then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <p>Loading dashboard...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Business Snapshot</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Sales" value={`₹${summary.sales.toFixed(2)}`} />
        <Card title="Received" value={`₹${summary.received.toFixed(2)}`} />
        <Card title="Receivables" value={`₹${summary.receivables.toFixed(2)}`} />
        <Card title="Profit" value={`₹${summary.profit.toFixed(2)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Overdue Invoices" value={String(summary.overdueInvoices)} />
        <Card title="Low Stock Alerts" value={String(summary.lowStockProducts)} />
      </div>
    </div>
  );
};

const Card = ({ title, value }) => (
  <div className="rounded-lg bg-white p-4 shadow-sm">
    <p className="text-sm text-slate-500">{title}</p>
    <h3 className="text-2xl font-bold text-indigo-900">{value}</h3>
  </div>
);

export default DashboardPage;
