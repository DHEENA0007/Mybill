import { useEffect, useState } from 'react';
import client from '../api/client';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', password: '' });

  const load = () => client.get('/users').then((res) => setUsers(res.data)).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    await client.post('/users', form);
    setForm({ name: '', email: '', role: 'staff', password: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Team & Roles</h2>
      <form onSubmit={add} className="grid gap-2 md:grid-cols-5">
        <input className="rounded border bg-white p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded border bg-white p-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className="rounded border bg-white p-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>staff</option><option>manager</option><option>accountant</option></select>
        <input className="rounded border bg-white p-2" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Add User</button>
      </form>
      <div className="rounded bg-white shadow-sm">{users.map((u) => <div key={u.id} className="border-b p-3 last:border-0">{u.name} ({u.role}) - {u.email}</div>)}</div>
    </div>
  );
};

export default UsersPage;
