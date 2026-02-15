import { useEffect, useState } from 'react';
import client from '../api/client';

const SubscriptionPage = () => {
  const [data, setData] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const load = () => client.get('/subscription/me').then((res) => setData(res.data));
  useEffect(() => { load(); }, []);

  const renew = async () => {
    await client.post('/subscription/renew', { billingCycle, amount: billingCycle === 'monthly' ? 49 : 499 });
    load();
  };

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Subscription</h2>
      <div className="rounded bg-white p-4 shadow-sm">
        <p>Status: {data.tenant.status}</p>
        <p>Billing: {data.tenant.billing_cycle}</p>
        <p>Renewal: {data.tenant.renewal_date || 'N/A'}</p>
      </div>
      <div className="flex gap-2">
        <select className="rounded border p-2" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <button className="rounded bg-indigo-700 px-3 py-2 text-white" onClick={renew}>Renew</button>
      </div>
    </div>
  );
};

export default SubscriptionPage;
