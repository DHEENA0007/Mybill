import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createProduct, updateProduct, getProductPrefixes, getNextSku } from '../../api/products';
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
    is_taxable: initial?.is_taxable !== false,
    tax_percentage: initial?.tax_percentage || 0,
    is_active: initial?.is_active !== false,
  });

  const { data: prefixes } = useQuery({
    queryKey: ['product-prefixes'],
    queryFn: () => getProductPrefixes().then(r => r.data?.results || r.data),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePrefixChange = async (e) => {
    const prefixId = e.target.value;
    if (!prefixId) return;
    try {
      const res = await getNextSku(prefixId);
      if (res.data?.sku) {
        set('sku', res.data.sku);
      }
    } catch (err) {
      toast.error('Failed to generate SKU');
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => initial ? updateProduct(initial.id, data) : createProduct(data),
    onSuccess: () => { toast.success(initial ? 'Product updated' : 'Product created'); onSuccess(); },
    onError: (e) => {
      const data = e.response?.data;
      let msg = 'Failed to save';
      if (data) {
        if (data.detail) msg = data.detail;
        else if (data.name) msg = data.name[0];
        else if (data.sku) msg = data.sku[0];
        else if (typeof data === 'object') msg = Object.values(data)[0]?.[0] || msg;
      }
      toast.error(msg);
    },
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code</label>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-1/3"
              onChange={handlePrefixChange}
              defaultValue=""
            >
              <option value="" disabled>Prefix</option>
              {Array.isArray(prefixes) && prefixes.map(p => (
                <option key={p.id} value={p.id}>{p.prefix}</option>
              ))}
            </select>
            <input 
              type="text" 
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
              value={form.sku} 
              onChange={(e) => set('sku', e.target.value)} 
              placeholder="e.g. PRD-001" 
            />
          </div>
        </div>
        <Input label="Barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Barcode number" />
        <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Status" value={form.is_active} onChange={(e) => set('is_active', e.target.value === 'true')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Select label="Taxable" value={form.is_taxable} onChange={(e) => set('is_taxable', e.target.value === 'true')}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
        {form.is_taxable && (
          <Input label="Tax Percentage (%)" type="number" value={form.tax_percentage} onChange={(e) => set('tax_percentage', e.target.value)} step="0.01" />
        )}
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
