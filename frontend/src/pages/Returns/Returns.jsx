import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import usePermission from '../../hooks/usePermission';
import { getReturns, createReturn } from '../../api/returns';
import { getProducts } from '../../api/products';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import useChoices from '../../hooks/useChoices';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function Returns() {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ return_type: '', product: '', quantity: 1, reference_id: '', reason: '' });
  const qc = useQueryClient();
  const { returnTypes } = useChoices();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({ queryKey: ['returns'], queryFn: () => getReturns().then(r => r.data) });
  const { data: products } = useQuery({ queryKey: ['products', {}], queryFn: () => getProducts({ page_size: 200 }).then(r => r.data) });

  const createMut = useMutation({
    mutationFn: createReturn,
    onSuccess: () => { toast.success('Return processed'); qc.invalidateQueries(['returns']); qc.invalidateQueries(['products']); setFormOpen(false); setForm({ return_type: '', product: '', quantity: 1, reference_id: '', reason: '' }); },
    onError: () => toast.error('Failed'),
  });

  const columns = [
    { key: 'id', label: '#', render: (v) => <span className="font-mono">RET-{String(v).padStart(4,'0')}</span> },
    { key: 'return_type', label: 'Type', render: (v) => <Badge color={v === 'sales' ? 'blue' : 'amber'}>{returnTypes.find(t => t.value === v)?.label || v}</Badge> },
    { key: 'product_name', label: 'Product', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'quantity', label: 'Qty', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'reason', label: 'Reason' },
    { key: 'processed_at', label: 'Date', render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('returns.process_sales', 'returns.process_purchase') && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>Process Return</Button>
        )}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No returns processed" />
      </Card>
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Process Return" size="md">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <Select label="Return Type" value={form.return_type} onChange={(e) => setForm(f => ({ ...f, return_type: e.target.value }))} required>
            <option value="">Select return type</option>
            {returnTypes.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select label="Product" value={form.product} onChange={(e) => setForm(f => ({ ...f, product: e.target.value }))} required>
            <option value="">Select product</option>
            {(products?.results || []).map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" min="1" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            <Input label="Reference ID" value={form.reference_id} onChange={(e) => setForm(f => ({ ...f, reference_id: e.target.value }))} placeholder="Invoice/Purchase ID" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            {form.return_type === 'sales'
              ? 'Stock will be increased. Invoice will be adjusted.'
              : form.return_type === 'purchase'
                ? 'Stock will be decreased. Supplier balance will be adjusted.'
                : 'Select a return type to see its effect.'}
          </div>
          <div className="flex justify-end"><Button type="submit" loading={createMut.isPending}>Process Return</Button></div>
        </form>
      </Modal>
    </div>
  );
}
