import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CheckCircle2, AlertCircle, User, Printer } from 'lucide-react';
import { getCreditLogs, getCreditLogSummary, settleCreditLog, getCustomersWithCredit, downloadCreditLogPDF } from '../../api/invoices';
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

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 20px; font-weight: bold; color: #1e1b4b; }
  .meta { color: #6b7280; font-size: 11px; margin-top: 3px; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; }
  .stat { border: 1px solid #e0e7ff; background: #f5f3ff; border-radius: 8px; padding: 10px 14px; }
  .stat-label { font-size: 9px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
  .stat-value { font-size: 16px; font-weight: bold; margin-top: 3px; color: #1e1b4b; }
  .stat-value.green { color: #059669; }
  .stat-value.red { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead th { background: #f9fafb; padding: 6px 8px; text-align: left; font-size: 9px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.04em; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
  .mono { font-family: monospace; background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 10px; }
  .td-right { text-align: right; }
  .badge-pending { display:inline-block; padding:1px 7px; border-radius:9999px; font-size:9px; font-weight:600; background:#fee2e2; color:#dc2626; }
  .badge-settled { display:inline-block; padding:1px 7px; border-radius:9999px; font-size:9px; font-weight:600; background:#d1fae5; color:#059669; }
  .td-amount { text-align:right; }
  .td-paid { text-align:right; color:#059669; font-weight:600; }
  .td-balance-due { text-align:right; color:#dc2626; font-weight:700; }
  .td-balance-ok  { text-align:right; color:#059669; font-weight:600; }
  tfoot td { background:#f5f3ff; font-weight:bold; color:#1e1b4b; border-top:2px solid #c7d2fe; padding:7px 8px; }
  @page { margin: 15mm; }
`;

export default function CreditLog() {
  const [settleOpen, setSettleOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | settled
  const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [generatingReport, setGeneratingReport] = useState(false);
  const qc = useQueryClient();

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }
    setGeneratingReport(true);
    try {
      const response = await downloadCreditLogPDF({
        date_from: dateRange.startDate,
        date_to: dateRange.endDate,
        customer: filterCustomer,
        status: filterStatus
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `credit_report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setReportModalOpen(false);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthVal = String(d.getMonth() + 1).padStart(2, '0');
      const yearVal = String(d.getFullYear());
      options.push({
        value: `${yearVal}-${monthVal}`,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' })
      });
    }
    return options;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['credit-logs', filterCustomer, filterStatus, filterMonth],
    queryFn: () => {
      const params = {};
      if (filterCustomer) params.customer = filterCustomer;
      if (filterStatus === 'pending') params.has_balance = 'true';
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        params.year = year;
        params.month = parseInt(month, 10).toString();
      }
      return getCreditLogs(params).then(r => r.data);
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['credit-logs-summary', filterCustomer, filterStatus, filterMonth],
    queryFn: () => {
      const params = {};
      if (filterCustomer) params.customer = filterCustomer;
      if (filterStatus === 'pending') params.has_balance = 'true';
      if (filterStatus === 'settled') params.status = 'settled';
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        params.year = year;
        params.month = parseInt(month, 10).toString();
      }
      return getCreditLogSummary(params).then(r => r.data);
    },
  });

  const { data: customersWithCredit } = useQuery({
    queryKey: ['customers-with-credit'],
    queryFn: () => getCustomersWithCredit().then(r => r.data),
  });

  // Fetch all pending credits (no filters) so we can compute the real
  // per-customer outstanding balance — the credit_balance on customersWithCredit
  // can be stale/wrong depending on the backend calculation.
  const { data: allPendingData } = useQuery({
    queryKey: ['all-pending-credits-balances'],
    queryFn: () => getCreditLogs({ has_balance: 'true', page_size: 1000 }).then(r => r.data),
  });

  const custBalanceMap = useMemo(() => {
    const items = allPendingData?.results ?? (Array.isArray(allPendingData) ? allPendingData : []);
    const map = {};
    items.forEach(c => {
      const key = String(c.customer);
      map[key] = (map[key] || 0) + parseFloat(c.remaining_balance || 0);
    });
    return map;
  }, [allPendingData]);

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

  const handlePrint = () => {
    const rows = credits;
    if (rows.length === 0) return;

    const filterParts = [];
    if (filterStatus !== 'all') filterParts.push(filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1));
    const custName = (customersWithCredit || []).find(c => String(c.id) === String(filterCustomer))?.name;
    if (custName) filterParts.push(`Customer: ${custName}`);
    if (filterMonth) {
      const [y, m] = filterMonth.split('-');
      filterParts.push(new Date(y, parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    const filterLabel = filterParts.length ? filterParts.join(' · ') : 'All Records';

    const tRows = rows.map((c, i) => {
      const settled = parseFloat(c.remaining_balance) <= 0;
      return `
        <tr>
          <td style="color:#9ca3af;font-family:monospace">${i + 1}</td>
          <td style="font-weight:600">${esc(c.customer_name)}</td>
          <td><span class="mono">${esc(c.invoice_number || '—')}</span></td>
          <td class="td-amount">${esc(formatCurrency(c.credit_amount))}</td>
          <td class="td-paid">${esc(formatCurrency(c.paid_amount))}</td>
          <td class="${settled ? 'td-balance-ok' : 'td-balance-due'}">
            ${settled ? '✓ Settled' : esc(formatCurrency(c.remaining_balance))}
          </td>
          <td>${esc(formatDate(c.created_at))}</td>
          <td><span class="${settled ? 'badge-settled' : 'badge-pending'}">${settled ? 'Settled' : 'Pending'}</span></td>
        </tr>`;
    }).join('');

    const body = `
      <h1>Credit Log</h1>
      <div class="meta">
        Filter: ${esc(filterLabel)} &nbsp;·&nbsp;
        ${rows.length} record${rows.length !== 1 ? 's' : ''}
        &nbsp;·&nbsp; Printed ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
      </div>
      <div class="summary-grid">
        <div class="stat">
          <div class="stat-label">Total Credit Given</div>
          <div class="stat-value">${esc(formatCurrency(totalCredit))}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Collected</div>
          <div class="stat-value green">${esc(formatCurrency(totalPaid))}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Outstanding Balance</div>
          <div class="stat-value red">${esc(formatCurrency(totalRemaining))}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th>Customer</th>
            <th>Invoice</th>
            <th class="td-right">Credit Given</th>
            <th class="td-right">Paid</th>
            <th class="td-right">Balance</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total (${rows.length} records)</td>
            <td class="td-right">${esc(formatCurrency(totalCredit))}</td>
            <td class="td-right" style="color:#059669">${esc(formatCurrency(totalPaid))}</td>
            <td class="td-right" style="color:#dc2626">${esc(formatCurrency(totalRemaining))}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>`;

    const win = window.open('', '_blank', 'width=980,height=720');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Credit Log — ${esc(filterLabel)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${body}</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
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
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={credits.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <Button
            variant="outline"
            onClick={() => setReportModalOpen(true)}
          >
            Generate Report
          </Button>
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
            <option key={c.id} value={c.id}>{c.name} ({formatCurrency(custBalanceMap[String(c.id)] ?? c.credit_balance)})</option>
          ))}
        </select>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Months</option>
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
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

      {/* Report Date Range Modal */}
      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Generate Credit Report">
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <p className="text-sm text-gray-500">
            Select a date range to generate a PDF report for the credit logs matching your current filters.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(d => ({ ...d, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(d => ({ ...d, endDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setReportModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={generatingReport}>
              Generate PDF
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
