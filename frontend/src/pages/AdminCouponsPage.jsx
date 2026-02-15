import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: 10 });
  const load = () => client.get('/super-admin/coupons').then((res) => setCoupons(res.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await client.post('/super-admin/coupons', { ...form, discountValue: Number(form.discountValue) });
    setForm({ code: '', discountType: 'percentage', discountValue: 10 });
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-2 md:grid-cols-4 rounded bg-white p-4 shadow-sm">
        <input className="rounded border p-2" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select className="rounded border p-2" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}><option value="percentage">percentage</option><option value="fixed">fixed</option></select>
        <input className="rounded border p-2" type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Create Coupon</button>
      </form>
      <div className="rounded bg-white shadow-sm">{coupons.map((c) => <div className="border-b p-3 last:border-0" key={c.id}>{c.code} · {c.discount_type} {c.discount_value}</div>)}</div>
    </div>
  );
};

export default AdminCouponsPage;
