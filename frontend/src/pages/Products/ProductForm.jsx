import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createProduct, updateProduct } from '../../api/products';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

export default function ProductForm({ initial, categories, onSuccess }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    sku: initial?.sku || '',
    category: initial?.category || '',
    purchase_price: initial?.purchase_price || '',
    selling_price: initial?.selling_price || '',
    current_stock: initial?.current_stock || 0,
    min_stock_level: initial?.min_stock_level || 5,
    barcode: initial?.barcode || '',
    is_active: initial?.is_active !== false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => initial ? updateProduct(initial.id, data) : createProduct(data),
    onSuccess: () => { toast.success(initial ? 'Product updated' : 'Product created'); onSuccess(); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to save'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Product Name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Enter product name" />
        </div>
        <Input label="SKU Code" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. PRD-001" />
        <Input label="Barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Barcode number" />
        <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Status" value={form.is_active} onChange={(e) => set('is_active', e.target.value === 'true')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Input label="Purchase Price" type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} required prefix="₹" step="0.01" />
        <Input label="Selling Price" type="number" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} required prefix="₹" step="0.01" />
        <Input label="Current Stock" type="number" value={form.current_stock} onChange={(e) => set('current_stock', e.target.value)} />
        <Input label="Min Stock Level" type="number" value={form.min_stock_level} onChange={(e) => set('min_stock_level', e.target.value)} />
      </div>
      {form.purchase_price && form.selling_price && (
        <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
          Profit margin: ₹{(form.selling_price - form.purchase_price).toFixed(2)} ({(((form.selling_price - form.purchase_price) / form.purchase_price) * 100).toFixed(1)}%)
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending}>
          {initial ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
