import { useEffect, useState } from 'react';
import client from '../api/client';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');

  const load = () => client.get('/customers').then((res) => setCustomers(res.data));

  useEffect(() => {
    load();
  }, []);

  const addCustomer = async (e) => {
    e.preventDefault();
    await client.post('/customers', { name, creditLimit: 0 });
    setName('');
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Customers</h2>
      <form onSubmit={addCustomer} className="flex gap-2">
        <input className="rounded border bg-white p-2" placeholder="Customer Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded bg-indigo-700 px-3 py-2 text-white">Add</button>
      </form>
      <div className="rounded bg-white shadow-sm">
        {customers.map((c) => (
          <div key={c.id} className="border-b p-3 last:border-0">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-slate-500">{c.email || 'No email'} · Credit {c.credit_limit}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomersPage;
