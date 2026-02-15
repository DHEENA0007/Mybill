import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminTenantsPage = () => {
  const [tenants, setTenants] = useState([]);
  const load = () => client.get('/super-admin/tenants').then((res) => setTenants(res.data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await client.patch(`/super-admin/tenants/${id}/status`, { status });
    load();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Subscribers</h2>
      <div className="rounded bg-white shadow-sm">{tenants.map((t) => (
        <div className="flex items-center justify-between border-b p-3 last:border-0" key={t.id}>
          <div>{t.name} — {t.status}</div>
          <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} className="rounded border p-1"><option>active</option><option>suspended</option><option>expired</option></select>
        </div>
      ))}</div>
    </div>
  );
};

export default AdminTenantsPage;
