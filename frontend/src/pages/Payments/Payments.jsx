import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import usePermission from '../../hooks/usePermission';
import { getPayments, createPayment } from '../../api/payments';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import useChoices from '../../hooks/useChoices';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function Payments() {
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ payment_type: '', reference_type: '', reference_id: '', amount: '', payment_method: '', notes: '' });
  const qc = useQueryClient();
  const { paymentMethods, paymentTypes, referenceTypes } = useChoices();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { filter }],
    queryFn: () => getPayments({ payment_type: filter }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: createPayment,
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries(['payments']); setFormOpen(false); },
    onError: () => toast.error('Failed'),
  });

  const columns = [
    { key: 'id', label: '#', render: (v) => <span className="font-mono">PAY-{String(v).padStart(4,'0')}</span> },
    { key: 'payment_type', label: 'Type', render: (v) => (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${v === 'incoming' ? 'text-emerald-600' : 'text-red-600'}`}>
        {v === 'incoming' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
        {paymentTypes.find(t => t.value === v)?.label || v}
      </span>
    )},
    { key: 'amount', label: 'Amount', render: (v, row) => (
      <span className={`font-bold ${row.payment_type === 'incoming' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(v)}</span>
    )},
    { key: 'payment_method', label: 'Method', render: (v) => (
      <Badge color="blue">{paymentMethods.find(m => m.value === v)?.label || v?.replace('_',' ')}</Badge>
    )},
    { key: 'reference_type', label: 'Reference', render: (v, row) => `${referenceTypes.find(r => r.value === v)?.label || v} #${row.reference_id}` },
    { key: 'payment_date', label: 'Date', render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Payments</option>
          {paymentTypes.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {can('financial.record_payment') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>Record Payment</Button>}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No payments recorded" />
      </Card>
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record Payment" size="md">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Type" value={form.payment_type} onChange={(e) => setForm(f => ({ ...f, payment_type: e.target.value }))} required>
              <option value="">Select type</option>
              {paymentTypes.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Select label="Reference Type" value={form.reference_type} onChange={(e) => setForm(f => ({ ...f, reference_type: e.target.value }))} required>
              <option value="">Select reference</option>
              {referenceTypes.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reference ID" value={form.reference_id} onChange={(e) => setForm(f => ({ ...f, reference_id: e.target.value }))} required />
            <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required prefix="₹" />
          </div>
          <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm(f => ({ ...f, payment_method: e.target.value }))} required>
            <option value="">Select method</option>
            {paymentMethods.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <div className="flex justify-end"><Button type="submit" loading={createMut.isPending}>Record Payment</Button></div>
        </form>
      </Modal>
    </div>
  );
}
