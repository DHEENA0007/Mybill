import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { createPurchase } from '../../api/purchases';
import { getSuppliers } from '../../api/suppliers';
import { getProducts } from '../../api/products';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({ supplier: '', purchase_date: today, notes: '', paid_amount: '' });
  const [items, setItems] = useState([{ product: '', quantity: 1, purchase_price: '' }]);
  const [productSearch, setProductSearch] = useState('');

  const { data: suppliers } = useQuery({ queryKey: ['suppliers', {}], queryFn: () => getSuppliers({ page_size: 200 }).then(r => r.data) });
  const { data: products } = useQuery({ queryKey: ['products', { search: productSearch }], queryFn: () => getProducts({ search: productSearch, page_size: 200 }).then(r => r.data) });

  const addRow = () => setItems(i => [...i, { product: '', quantity: 1, purchase_price: '' }]);
  const removeRow = (idx) => setItems(i => i.filter((_, j) => j !== idx));
  const updateRow = (idx, key, val) => setItems(i => i.map((row, j) => j === idx ? { ...row, [key]: val } : row));

  const subtotal = items.reduce((s, r) => s + (r.quantity * (r.purchase_price || 0)), 0);
  const balance = subtotal - (parseFloat(form.paid_amount) || 0);

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => { toast.success('Purchase created'); qc.invalidateQueries(['purchases']); navigate('/purchases'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (items.some(i => !i.product || !i.purchase_price)) { toast.error('Fill all product rows'); return; }
    mutation.mutate({ ...form, paid_amount: parseFloat(form.paid_amount) || 0, items: items.map(i => ({ ...i, quantity: parseInt(i.quantity), purchase_price: parseFloat(i.purchase_price) })) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Purchase Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Supplier" value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} required>
            <option value="">Select supplier</option>
            {(suppliers?.results || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Products</h3>
          <Button type="button" variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addRow}>Add Row</Button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
            <span className="col-span-5">Product</span><span className="col-span-2">Qty</span><span className="col-span-3">Price</span><span className="col-span-2">Total</span>
          </div>
          {items.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select value={row.product} onChange={(e) => {
                  const p = (products?.results || []).find(p => p.id == e.target.value);
                  updateRow(idx, 'product', e.target.value);
                  if (p) updateRow(idx, 'purchase_price', p.purchase_price);
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                  <option value="">Select product</option>
                  {(products?.results || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" min="1" value={row.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-3">
                <input type="number" step="0.01" value={row.purchase_price} onChange={(e) => updateRow(idx, 'purchase_price', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
              </div>
              <div className="col-span-1 text-sm font-medium text-gray-700">{formatCurrency(row.quantity * (row.purchase_price || 0))}</div>
              <button type="button" onClick={() => removeRow(idx)} className="col-span-1 p-1.5 text-gray-400 hover:text-red-500 transition-colors flex justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Amount Paid</span>
              <input type="number" step="0.01" value={form.paid_amount} onChange={(e) => setForm(f => ({ ...f, paid_amount: e.target.value }))}
                className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-100">
              <span>Balance Due</span><span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">Notes</h3>
        <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} placeholder="Optional notes..." />
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => navigate('/purchases')}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Create Purchase</Button>
      </div>
    </form>
  );
}
