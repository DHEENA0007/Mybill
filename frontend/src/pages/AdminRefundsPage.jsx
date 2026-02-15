import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminRefundsPage = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ tenantId: '', amount: '', reason: '' });

  const load = () => client.get('/super-admin/refunds').then((res) => setRows(res.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await client.post('/super-admin/refunds', { tenantId: Number(form.tenantId), amount: Number(form.amount), reason: form.reason });
    setForm({ tenantId: '', amount: '', reason: '' });
    load();
  };

  const update = async (id, status) => {
    await client.patch(`/super-admin/refunds/${id}/status`, { status });
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-2 md:grid-cols-4 rounded bg-white p-4 shadow-sm">
        <input className="rounded border p-2" placeholder="Tenant ID" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} />
        <input className="rounded border p-2" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className="rounded border p-2" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Create Refund</button>
      </form>
      <div className="rounded bg-white shadow-sm">
        {rows.map((r) => (
          <div className="flex items-center justify-between border-b p-3 last:border-0" key={r.id}>
            <div>Tenant {r.tenant_id} · ₹{r.amount} · {r.status}</div>
            <select className="rounded border p-1" value={r.status} onChange={(e) => update(r.id, e.target.value)}>
              <option>pending</option><option>approved</option><option>rejected</option><option>processed</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRefundsPage;
