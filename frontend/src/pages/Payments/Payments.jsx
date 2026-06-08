import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowDownLeft, ArrowUpRight, Truck, UserCheck, Banknote } from 'lucide-react';
import usePermission from '../../hooks/usePermission';
import {
  getPayments, createPayment, recordSupplierPayment,
  getSuppliersWithPending, getSupplierPurchases,
  recordCreditPayment, getCustomerCredits,
} from '../../api/payments';
import { getCustomersWithCredit } from '../../api/invoices';
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

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function Payments() {
  const [formOpen, setFormOpen] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [creditFormOpen, setCreditFormOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ payment_type: '', reference_type: '', reference_id: '', amount: '', payment_method: '', notes: '' });
  const [supplierForm, setSupplierForm] = useState({ supplier_id: '', purchase_id: '', amount: '', payment_method: 'cash', notes: '' });
  const [creditForm, setCreditForm] = useState({ customer_id: '', credit_log_id: '', amount: '', payment_method: 'cash', notes: '' });
  const qc = useQueryClient();
  const { paymentMethods, paymentTypes, referenceTypes } = useChoices();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { filter }],
    queryFn: () => getPayments({ payment_type: filter }).then(r => r.data),
  });

  // Supplier payment data
  const { data: suppliersWithPending } = useQuery({
    queryKey: ['suppliers-with-pending'],
    queryFn: () => getSuppliersWithPending().then(r => r.data),
    enabled: supplierFormOpen,
  });

  const { data: supplierPurchases } = useQuery({
    queryKey: ['supplier-purchases', supplierForm.supplier_id],
    queryFn: () => getSupplierPurchases(supplierForm.supplier_id).then(r => r.data),
    enabled: !!supplierForm.supplier_id,
  });

  // Credit payment data
  const { data: customersWithCredit } = useQuery({
    queryKey: ['customers-with-credit'],
    queryFn: () => getCustomersWithCredit().then(r => r.data),
    enabled: creditFormOpen,
  });

  const { data: customerCreditLogs } = useQuery({
    queryKey: ['customer-credits', creditForm.customer_id],
    queryFn: () => getCustomerCredits(creditForm.customer_id).then(r => r.data),
    enabled: !!creditForm.customer_id,
  });

  const createMut = useMutation({
    mutationFn: createPayment,
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries(['payments']); setFormOpen(false); },
    onError: () => toast.error('Failed'),
  });

  const supplierMut = useMutation({
    mutationFn: recordSupplierPayment,
    onSuccess: () => {
      toast.success('Supplier payment recorded!');
      qc.invalidateQueries(['payments']);
      qc.invalidateQueries(['suppliers-with-pending']);
      qc.invalidateQueries(['supplier-purchases']);
      setSupplierFormOpen(false);
      setSupplierForm({ supplier_id: '', purchase_id: '', amount: '', payment_method: 'cash', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to record supplier payment'),
  });

  const creditMut = useMutation({
    mutationFn: recordCreditPayment,
    onSuccess: () => {
      toast.success('Credit payment collected!');
      qc.invalidateQueries(['payments']);
      qc.invalidateQueries(['customers-with-credit']);
      qc.invalidateQueries(['customer-credits']);
      qc.invalidateQueries(['credit-logs']);
      setCreditFormOpen(false);
      setCreditForm({ customer_id: '', credit_log_id: '', amount: '', payment_method: 'cash', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to collect credit payment'),
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
    { key: 'reference_type', label: 'Reference', render: (v, row) => {
      const refLabel = referenceTypes.find(r => r.value === v)?.label || v;
      const colorMap = { credit: 'text-purple-600', supplier: 'text-orange-600', invoice: 'text-blue-600', purchase: 'text-teal-600' };
      return (
        <span className={`text-xs font-medium ${colorMap[v] || 'text-gray-600'}`}>
          {refLabel} #{row.reference_id}
        </span>
      );
    }},
    { key: 'notes', label: 'Notes', render: (v) => <span className="text-gray-500 text-xs max-w-[200px] truncate block">{v || '-'}</span> },
    { key: 'payment_date', label: 'Date', render: (v) => formatDate(v) },
  ];

  const selectedPurchase = supplierPurchases?.find(p => String(p.id) === String(supplierForm.purchase_id));
  const selectedCreditLog = customerCreditLogs?.find(c => String(c.id) === String(creditForm.credit_log_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Payments</option>
          {paymentTypes.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-wrap">
          {can('financial.record_payment') && (
            <>
              <Button
                variant="secondary"
                icon={<Truck className="w-4 h-4" />}
                onClick={() => setSupplierFormOpen(true)}
              >
                Supplier Payment
              </Button>
              <Button
                variant="secondary"
                icon={<UserCheck className="w-4 h-4" />}
                onClick={() => setCreditFormOpen(true)}
              >
                Collect Credit
              </Button>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>Record Payment</Button>
            </>
          )}
        </div>
      </div>

      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No payments recorded" />
      </Card>

      {/* Generic Record Payment Modal */}
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

      {/* Supplier Payment Modal */}
      <Modal open={supplierFormOpen} onClose={() => setSupplierFormOpen(false)} title="Supplier Payment" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); supplierMut.mutate(supplierForm); }} className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <Truck className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700">Select a supplier and optionally a specific purchase order to record payment against.</p>
          </div>

          <Select
            label="Select Supplier"
            value={supplierForm.supplier_id}
            onChange={(e) => setSupplierForm(f => ({ ...f, supplier_id: e.target.value, purchase_id: '', amount: '' }))}
            required
          >
            <option value="">Choose supplier...</option>
            {(suppliersWithPending || []).map(s => (
              <option key={s.id} value={s.id}>{s.name} — Pending: {formatCurrency(s.total_pending)}</option>
            ))}
          </Select>

          {supplierForm.supplier_id && supplierPurchases && supplierPurchases.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Purchase (Optional)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="purchase"
                    value=""
                    checked={!supplierForm.purchase_id}
                    onChange={() => setSupplierForm(f => ({ ...f, purchase_id: '', amount: '' }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-600">General payment (no specific purchase)</span>
                </label>
                {supplierPurchases.map(p => (
                  <label key={p.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer transition ${supplierForm.purchase_id === String(p.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="purchase"
                        value={p.id}
                        checked={supplierForm.purchase_id === String(p.id)}
                        onChange={() => setSupplierForm(f => ({ ...f, purchase_id: String(p.id), amount: p.balance_due }))}
                        className="accent-indigo-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">PO-{String(p.id).padStart(4,'0')}</span>
                        <span className="text-xs text-gray-500 ml-2">{formatDate(p.purchase_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Balance: <span className="text-red-600 font-semibold">{formatCurrency(p.balance_due)}</span></div>
                      <div className="text-xs text-gray-400">Total: {formatCurrency(p.total_amount)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {supplierForm.supplier_id && supplierPurchases && supplierPurchases.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No pending purchases for this supplier</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={supplierForm.amount}
              onChange={(e) => setSupplierForm(f => ({ ...f, amount: e.target.value }))}
              required
              prefix="₹"
            />
            <Select
              label="Payment Method"
              value={supplierForm.payment_method}
              onChange={(e) => setSupplierForm(f => ({ ...f, payment_method: e.target.value }))}
              required
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Notes (optional)"
            value={supplierForm.notes}
            onChange={(e) => setSupplierForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Payment notes..."
          />

          {selectedPurchase && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              Paying <strong>{formatCurrency(supplierForm.amount || 0)}</strong> against PO-{String(selectedPurchase.id).padStart(4,'0')} (Balance: {formatCurrency(selectedPurchase.balance_due)})
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSupplierFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={supplierMut.isPending} icon={<Truck className="w-4 h-4" />}>
              Pay Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Collect Credit Payment Modal */}
      <Modal open={creditFormOpen} onClose={() => setCreditFormOpen(false)} title="Collect Customer Credit" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); creditMut.mutate(creditForm); }} className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700">Select a customer with outstanding credit and record their payment.</p>
          </div>

          <Select
            label="Select Customer"
            value={creditForm.customer_id}
            onChange={(e) => setCreditForm(f => ({ ...f, customer_id: e.target.value, credit_log_id: '', amount: '' }))}
            required
          >
            <option value="">Choose customer...</option>
            {(customersWithCredit || []).map(c => (
              <option key={c.id} value={c.id}>{c.name} — Balance: {formatCurrency(c.credit_balance)}</option>
            ))}
          </Select>

          {creditForm.customer_id && customerCreditLogs && customerCreditLogs.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Credit Record</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {customerCreditLogs.map(cl => (
                  <label key={cl.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer transition ${creditForm.credit_log_id === String(cl.id) ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="credit_log"
                        value={cl.id}
                        checked={creditForm.credit_log_id === String(cl.id)}
                        onChange={() => setCreditForm(f => ({ ...f, credit_log_id: String(cl.id), amount: cl.remaining_balance }))}
                        className="accent-purple-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{cl.invoice_number || `Credit #${cl.id}`}</span>
                        <span className="text-xs text-gray-500 ml-2">{formatDate(cl.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Balance: <span className="text-red-600 font-semibold">{formatCurrency(cl.remaining_balance)}</span></div>
                      <div className="text-xs text-gray-400">Credit: {formatCurrency(cl.credit_amount)} | Paid: {formatCurrency(cl.paid_amount)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {creditForm.customer_id && customerCreditLogs && customerCreditLogs.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No outstanding credit for this customer</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Collection Amount"
              type="number"
              step="0.01"
              value={creditForm.amount}
              onChange={(e) => setCreditForm(f => ({ ...f, amount: e.target.value }))}
              required
              prefix="₹"
            />
            <Select
              label="Payment Method"
              value={creditForm.payment_method}
              onChange={(e) => setCreditForm(f => ({ ...f, payment_method: e.target.value }))}
              required
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Notes (optional)"
            value={creditForm.notes}
            onChange={(e) => setCreditForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Payment notes..."
          />

          {selectedCreditLog && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              Collecting <strong>{formatCurrency(creditForm.amount || 0)}</strong> for {selectedCreditLog.invoice_number || `Credit #${selectedCreditLog.id}`} (Remaining: {formatCurrency(selectedCreditLog.remaining_balance)})
            </div>
          )}

          {/* Quick amount buttons */}
          {selectedCreditLog && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 py-1">Quick:</span>
              {[
                { label: 'Full', val: selectedCreditLog.remaining_balance },
                { label: '50%', val: (parseFloat(selectedCreditLog.remaining_balance) / 2).toFixed(2) },
              ].map(q => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setCreditForm(f => ({ ...f, amount: q.val }))}
                  className="px-3 py-1 text-xs rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition"
                >
                  {q.label} ({formatCurrency(q.val)})
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreditFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creditMut.isPending} icon={<Banknote className="w-4 h-4" />}>
              Collect Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
