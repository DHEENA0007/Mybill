import { useEffect, useState } from 'react';
import client from '../api/client';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: '', amount: '', spentOn: '' });

  const load = () => client.get('/expenses').then((res) => setExpenses(res.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await client.post('/expenses', { ...form, amount: Number(form.amount) });
    setForm({ category: '', amount: '', spentOn: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Expenses</h2>
      <form onSubmit={submit} className="grid gap-2 md:grid-cols-4">
        <input className="rounded border bg-white p-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="rounded border bg-white p-2" placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className="rounded border bg-white p-2" type="date" value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Add Expense</button>
      </form>
      <div className="rounded bg-white shadow-sm">
        {expenses.map((x) => <div key={x.id} className="border-b p-3 last:border-0">{x.spent_on} · {x.category} · ₹{x.amount}</div>)}
      </div>
    </div>
  );
};

export default ExpensesPage;
