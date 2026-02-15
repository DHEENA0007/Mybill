import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminAnnouncementsPage = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', target: 'all' });

  const load = () => client.get('/super-admin/announcements').then((res) => setRows(res.data));
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    await client.post('/super-admin/announcements', form);
    setForm({ title: '', body: '', target: 'all' });
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={send} className="space-y-2 rounded bg-white p-4 shadow-sm">
        <input className="w-full rounded border p-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="w-full rounded border p-2" placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Target (all or tenant id)" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <button className="rounded bg-indigo-700 px-3 py-2 text-white">Broadcast</button>
      </form>
      <div className="rounded bg-white shadow-sm">{rows.map((a) => <div key={a.id} className="border-b p-3 last:border-0">{a.title} · {a.target}</div>)}</div>
    </div>
  );
};

export default AdminAnnouncementsPage;
