import { useEffect, useState } from 'react';
import client from '../api/client';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customerId: '', description: '', qty: 1, unitPrice: 0, type: 'gst', issueDate: '', dueDate: '' });

  const load = () => client.get('/invoices').then((res) => setInvoices(res.data));
  useEffect(() => {
    load();
    client.get('/customers').then((res) => setCustomers(res.data));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await client.post('/invoices', {
      customerId: Number(form.customerId),
      type: form.type,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      items: [{ description: form.description, qty: Number(form.qty), unitPrice: Number(form.unitPrice), taxRate: 18 }]
    });
    load();
  };

  const queueEmail = async (id) => {
    const toEmail = prompt('Customer email?');
    if (!toEmail) return;
    await client.post(`/invoices/${id}/email`, { toEmail, subject: 'Your Invoice', body: 'Please find your invoice attached.' });
    alert('Email queued');
  };

  const exportPdf = async (id) => {
    const { data } = await client.get(`/invoices/${id}/pdf`);
    alert(data.message);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Invoices</h2>
      <form className="grid gap-2 md:grid-cols-7" onSubmit={create}>
        <select className="rounded border bg-white p-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">Customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="rounded border bg-white p-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="rounded border bg-white p-2" type="number" placeholder="Qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        <input className="rounded border bg-white p-2" type="number" placeholder="Price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
        <input className="rounded border bg-white p-2" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
        <input className="rounded border bg-white p-2" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Create</button>
      </form>
      <div className="overflow-hidden rounded bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Number</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Status</th>
              <th className="p-2">Total</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t">
                <td className="p-2">{invoice.invoice_no}</td>
                <td className="p-2">{invoice.customer_name}</td>
                <td className="p-2">{invoice.status}</td>
                <td className="p-2">₹{invoice.grand_total.toFixed(2)}</td>
                <td className="p-2 space-x-2">
                  <button className="rounded border px-2 py-1" onClick={() => exportPdf(invoice.id)}>PDF</button>
                  <button className="rounded border px-2 py-1" onClick={() => queueEmail(invoice.id)}>Email</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPage;
