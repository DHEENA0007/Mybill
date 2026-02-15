import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const load = () => client.get('/super-admin/tickets').then((res) => setTickets(res.data));
  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    await client.patch(`/super-admin/tickets/${id}/status`, { status });
    load();
  };

  return <div className="rounded bg-white shadow-sm">{tickets.map((t) => (
    <div className="flex items-center justify-between border-b p-3 last:border-0" key={t.id}>
      <div>#{t.id} {t.subject} — {t.tenant_name || 'N/A'}</div>
      <select value={t.status} onChange={(e) => update(t.id, e.target.value)} className="rounded border p-1"><option>open</option><option>in_progress</option><option>closed</option></select>
    </div>
  ))}</div>;
};

export default AdminTicketsPage;
