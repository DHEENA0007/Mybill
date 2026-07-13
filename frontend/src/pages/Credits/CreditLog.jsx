import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Search, Filter, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { getCreditLogs, getCreditLogSummary, settleCreditLog, getCustomersWithCredit } from '../../api/invoices';
import { getCustomers } from '../../api/customers';
import Card from '../../components/UI/Card';
import Table from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CreditLog() {
  const [settleOpen, setSettleOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | settled
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['credit-logs', filterCustomer, filterStatus],
    queryFn: () => {
      const params = {};
      if (filterCustomer) params.customer = filterCustomer;
      if (filterStatus === 'pending') params.has_balance = 'true';
      return getCreditLogs(params).then(r => r.data);
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['credit-logs-summary', filterCustomer, filterStatus],
    queryFn: () => {
      const params = {};
      if (filterCustomer) params.customer = filterCustomer;
      if (filterStatus === 'pending') params.has_balance = 'true';
      if (filterStatus === 'settled') params.status = 'settled';
      return getCreditLogSummary(params).then(r => r.data);
    },
  });

  const { data: customersWithCredit } = useQuery({
    queryKey: ['customers-with-credit'],
    queryFn: () => getCustomersWithCredit().then(r => r.data),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, data }) => settleCreditLog(id, data),
    onSuccess: () => {
      toast.success('Credit settled successfully!');
      qc.invalidateQueries(['credit-logs']);
      qc.invalidateQueries(['credit-logs-summary']);
      qc.invalidateQueries(['customers-with-credit']);
      qc.invalidateQueries(['payments']);
      setSettleOpen(false);
      setSelectedCredit(null);
      setSettleForm({ amount: '', payment_method: 'cash', notes: '' });
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to settle credit';
      toast.error(msg);
    },
  });

  const openSettle = (credit) => {
    setSelectedCredit(credit);
    setSettleForm({ amount: credit.remaining_balance, payment_method: 'cash', notes: '' });
    setSettleOpen(true);
  };

  const handleSettle = (e) => {
    e.preventDefault();
    settleMut.mutate({ id: selectedCredit.id, data: settleForm });
  };

  const allCredits = data?.results || data || [];
  const credits = filterStatus === 'settled'
    ? allCredits.filter(c => parseFloat(c.remaining_balance) <= 0)
    : allCredits;

  const totalCredit = parseFloat(summary?.total_credit || 0);
  const totalPaid = parseFloat(summary?.total_paid || 0);
  const totalRemaining = parseFloat(summary?.total_remaining || 0);

  const columns = [
    { key: 'customer_name', label: 'Customer', render: (v) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <span className="font-medium">{v}</span>
      </div>
    )},
    { key: 'invoice_number', label: 'Invoice', render: (v) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{v || '-'}</span> },
    { key: 'credit_amount', label: 'Credit Amount', render: (v) => formatCurrency(v) },
    { key: 'paid_amount', label: 'Paid', render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'remaining_balance', label: 'Balance', render: (v) => (
      <span className={`font-bold ${parseFloat(v) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
        {parseFloat(v) > 0 ? formatCurrency(v) : '✓ Settled'}
      </span>
    )},
    { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
    { key: 'id', label: 'Action', render: (_, row) => (
      parseFloat(row.remaining_balance) > 0 ? (
        <Button
          variant="primary"
          size="sm"
          icon={<Banknote className="w-3.5 h-3.5" />}
          onClick={() => openSettle(row)}
        >
          Collect
        </Button>
      ) : (
        <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />Settled</Badge>
      )
    )},
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and collect outstanding customer credit</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Credit Given</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Outstanding Balance</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[{ v: 'all', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'settled', l: 'Settled' }].map(f => (
            <button
              key={f.v}
              onClick={() => setFilterStatus(f.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterStatus === f.v
                  ? (f.v === 'pending' ? 'bg-red-500 text-white shadow-sm' : f.v === 'settled' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <select
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Customers</option>
          {(customersWithCredit || []).map(c => (
            <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.credit_balance)})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card padding={false}>
        <Table columns={columns} data={credits} loading={isLoading} emptyMessage="No credit logs found" />
      </Card>

      {/* Settle Modal */}
      <Modal open={settleOpen} onClose={() => setSettleOpen(false)} title="Collect Credit Payment" size="md">
        {selectedCredit && (
          <form onSubmit={handleSettle} className="space-y-4">
            {/* Credit Info Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold text-gray-900">{selectedCredit.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice</span>
                <span className="font-mono text-gray-700">{selectedCredit.invoice_number || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Credit</span>
                <span className="text-gray-700">{formatCurrency(selectedCredit.credit_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Already Paid</span>
                <span className="text-emerald-600 font-medium">{formatCurrency(selectedCredit.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-700 font-semibold">Remaining Balance</span>
                <span className="text-red-600 font-bold text-base">{formatCurrency(selectedCredit.remaining_balance)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Collection Amount"
                type="number"
                step="0.01"
                max={selectedCredit.remaining_balance}
                value={settleForm.amount}
                onChange={(e) => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                required
                prefix="₹"
              />
              <Select
                label="Payment Method"
                value={settleForm.payment_method}
                onChange={(e) => setSettleForm(f => ({ ...f, payment_method: e.target.value }))}
                required
              >
                {paymentMethods.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>

            <Input
              label="Notes (optional)"
              value={settleForm.notes}
              onChange={(e) => setSettleForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Payment notes..."
            />

            {/* Quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 py-1">Quick:</span>
              {[
                { label: 'Full', val: selectedCredit.remaining_balance },
                { label: '50%', val: (parseFloat(selectedCredit.remaining_balance) / 2).toFixed(2) },
                { label: '25%', val: (parseFloat(selectedCredit.remaining_balance) / 4).toFixed(2) },
              ].map(q => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setSettleForm(f => ({ ...f, amount: q.val }))}
                  className="px-3 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition"
                >
                  {q.label} ({formatCurrency(q.val)})
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setSettleOpen(false)}>Cancel</Button>
              <Button type="submit" loading={settleMut.isPending} icon={<Banknote className="w-4 h-4" />}>
                Collect Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
