import { useEffect, useState } from 'react';
import client from '../api/client';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: 0, stockEnabled: false, stockQty: 0, lowStockThreshold: 0 });

  const load = () => client.get('/products').then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    await client.post('/products', { ...form, price: Number(form.price), stockQty: Number(form.stockQty), lowStockThreshold: Number(form.lowStockThreshold) });
    setForm({ name: '', price: 0, stockEnabled: false, stockQty: 0, lowStockThreshold: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Products & Services</h2>
      <form className="grid gap-2 md:grid-cols-5" onSubmit={add}>
        <input className="rounded border bg-white p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded border bg-white p-2" placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="rounded border bg-white p-2" placeholder="Stock Qty" type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
        <input className="rounded border bg-white p-2" placeholder="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
        <button className="rounded bg-indigo-700 text-white">Add Product</button>
      </form>
      <div className="rounded bg-white shadow-sm">
        {products.map((p) => (
          <div className="border-b p-3 last:border-0" key={p.id}>{p.name} — ₹{p.price} — Stock {p.stock_qty}</div>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;
