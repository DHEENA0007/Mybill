import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown, TrendingUp, Sliders } from 'lucide-react';
import { getProducts, adjustStock } from '../../api/products';
import usePermission from '../../hooks/usePermission';
import Card from '../../components/UI/Card';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import SearchBar from '../../components/UI/SearchBar';
import useChoices from '../../hooks/useChoices';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function StockView() {
  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjForm, setAdjForm] = useState({ quantity: '', transaction_type: '', notes: '' });
  const qc = useQueryClient();
  const { stockTransactionTypes } = useChoices();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, all: true }],
    queryFn: () => getProducts({ search, page_size: 100 }).then(r => r.data),
  });

  const adjMut = useMutation({
    mutationFn: ({ id, data }) => adjustStock(id, data),
    onSuccess: () => { toast.success('Stock adjusted'); qc.invalidateQueries(['products']); setAdjustItem(null); },
    onError: () => toast.error('Failed to adjust stock'),
  });

  const products = data?.results || [];
  const lowStockItems = products.filter(p => p.current_stock <= p.min_stock_level);
  const totalValue = products.reduce((s, p) => s + (p.current_stock * p.purchase_price), 0);

  const columns = [
    { key: 'name', label: 'Product', render: (v, row) => (
      <div className="flex items-center gap-2">
        {row.current_stock <= row.min_stock_level && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
        <div>
          <p className="font-medium text-gray-800">{v}</p>
          <p className="text-xs text-gray-400">{row.sku}</p>
        </div>
      </div>
    )},
    { key: 'category_name', label: 'Category' },
    { key: 'current_stock', label: 'Current Stock', render: (v, row) => (
      <span className={`font-bold text-base ${v <= row.min_stock_level ? 'text-red-600' : v <= row.min_stock_level * 2 ? 'text-amber-600' : 'text-emerald-600'}`}>{v}</span>
    )},
    { key: 'min_stock_level', label: 'Min Level' },
    { key: 'purchase_price', label: 'Buy Price', render: (v) => formatCurrency(v) },
    { key: 'stock_value', label: 'Stock Value', render: (_, row) => formatCurrency(row.current_stock * row.purchase_price) },
    { key: 'adjust', label: '', render: (_, row) => can('inventory.adjust_stock') ? (
      <button onClick={() => { setAdjustItem(row); setAdjForm({ quantity: '', transaction_type: '', notes: '' }); }}
        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Adjust Stock">
        <Sliders className="w-4 h-4" />
      </button>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 rounded-lg p-3"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Products</p><p className="text-xl font-bold text-gray-900">{products.length}</p></div>
          </div>
        </Card>
        <Card className="border-red-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 rounded-lg p-3"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Low Stock</p><p className="text-xl font-bold text-red-600">{lowStockItems.length}</p></div>
          </div>
        </Card>
        <Card className="border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 rounded-lg p-3"><TrendingDown className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Total Stock Value</p><p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p></div>
          </div>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." className="max-w-sm" />
        </div>
        <Table columns={columns} data={products} loading={isLoading} emptyMessage="No products found" />
      </Card>

      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title={`Adjust Stock: ${adjustItem?.name}`} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); adjMut.mutate({ id: adjustItem.id, data: adjForm }); }} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500">Current Stock: <span className="font-bold text-gray-800">{adjustItem?.current_stock}</span></p>
          </div>
          <Input label="Quantity (positive to add, negative to reduce)" type="number" value={adjForm.quantity} onChange={(e) => setAdjForm(f => ({ ...f, quantity: e.target.value }))} required />
          <Select label="Transaction Type" value={adjForm.transaction_type} onChange={(e) => setAdjForm(f => ({ ...f, transaction_type: e.target.value }))} required>
            <option value="">Select type</option>
            {stockTransactionTypes.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea value={adjForm.notes} onChange={(e) => setAdjForm(f => ({ ...f, notes: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button type="submit" loading={adjMut.isPending}>Apply Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
