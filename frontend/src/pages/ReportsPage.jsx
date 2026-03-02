import { useEffect, useState } from 'react';
import client from '../api/client';

const ReportsPage = () => {
  const [summary, setSummary] = useState(null);
  const [aging, setAging] = useState([]);

  useEffect(() => {
    client.get('/reports/summary').then((res) => setSummary(res.data));
    client.get('/reports/aging').then((res) => setAging(res.data));
  }, []);

  if (!summary) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="rounded bg-white p-4 shadow-sm">
        <p>Sales: ₹{summary.sales.toFixed(2)}</p>
        <p>Expenses: ₹{summary.expenses.toFixed(2)}</p>
        <p>Profit: ₹{summary.profit.toFixed(2)}</p>
      </div>
      <div className="rounded bg-white p-4 shadow-sm">
        <h3 className="font-medium">Invoice Aging</h3>
        {aging.map((a) => <div key={a.id}>{a.invoice_no} · Balance ₹{a.balance}</div>)}
      </div>
    </div>
  );
};

export default ReportsPage;
