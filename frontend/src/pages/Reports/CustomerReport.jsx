import { useState, useMemo } from 'react';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices, getCreditLogs } from '../../api/invoices';
import Card from '../../components/UI/Card';
import { StatusBadge } from '../../components/UI/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Users, TrendingUp, Banknote, AlertCircle, CreditCard,
  ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { PageLoader } from '../../components/UI/LoadingSpinner';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

function StatCard({ label, value, icon: Icon, color, bg, currency }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={`${bg} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${color} truncate`}>
            {currency ? formatCurrency(value) : value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function CustomerReport() {
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [expandedId, setExpandedId] = useState(null);

  const { data: invoiceData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['cust-report-invoices', startDate, endDate],
    queryFn: () =>
      getInvoices({ date_from: startDate, date_to: endDate, page_size: 1000 }).then(r => r.data),
    enabled: !!(startDate && endDate),
  });

  const { data: creditData, isLoading: loadingCredits } = useQuery({
    queryKey: ['cust-report-credits', startDate, endDate],
    queryFn: () =>
      getCreditLogs({ date_from: startDate, date_to: endDate, page_size: 1000 }).then(r => r.data),
    enabled: !!(startDate && endDate),
  });

  const isLoading = loadingInvoices || loadingCredits;

  const customerRows = useMemo(() => {
    const invoices = invoiceData?.results ?? (Array.isArray(invoiceData) ? invoiceData : []);
    const credits = creditData?.results ?? (Array.isArray(creditData) ? creditData : []);
    const map = {};

    const entry = (name, phone = '') => {
      if (!map[name]) {
        map[name] = { name, phone, invoices: [], credits: [] };
      }
      return map[name];
    };

    invoices.forEach(inv => {
      if (!inv.customer_name) return;
      entry(inv.customer_name, inv.customer_phone || '').invoices.push(inv);
    });

    credits.forEach(cr => {
      if (!cr.customer_name) return;
      entry(cr.customer_name).credits.push(cr);
    });

    return Object.values(map)
      .map(c => {
        const totalSales = c.invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
        const totalPaid = c.invoices.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);
        const totalBalance = c.invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
        const totalCredit = c.credits.reduce((s, cr) => s + parseFloat(cr.credit_amount || 0), 0);
        const totalCreditPaid = c.credits.reduce((s, cr) => s + parseFloat(cr.paid_amount || 0), 0);
        const totalCreditRemaining = c.credits.reduce((s, cr) => s + parseFloat(cr.remaining_balance || 0), 0);
        return { ...c, totalSales, totalPaid, totalBalance, totalCredit, totalCreditPaid, totalCreditRemaining };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [invoiceData, creditData]);

  const summary = useMemo(() => ({
    customers: customerRows.length,
    sales: customerRows.reduce((s, c) => s + c.totalSales, 0),
    collected: customerRows.reduce((s, c) => s + c.totalPaid, 0),
    outstanding: customerRows.reduce((s, c) => s + c.totalBalance, 0),
    credit: customerRows.reduce((s, c) => s + c.totalCreditRemaining, 0),
  }), [customerRows]);

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header + Date Filters */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Customer Wise Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">Purchases, payments &amp; credits per customer</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">From</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-gray-600">To</span>
          <input
            type="date"
            value={endDate}
            max={today()}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Total Customers" value={summary.customers} icon={Users}
          color="text-indigo-600" bg="bg-indigo-50" currency={false} />
        <StatCard label="Total Sales" value={summary.sales} icon={TrendingUp}
          color="text-blue-600" bg="bg-blue-50" currency />
        <StatCard label="Total Collected" value={summary.collected} icon={Banknote}
          color="text-emerald-600" bg="bg-emerald-50" currency />
        <StatCard label="Outstanding" value={summary.outstanding} icon={AlertCircle}
          color="text-red-500" bg="bg-red-50" currency />
        <StatCard label="Credit Balance" value={summary.credit} icon={CreditCard}
          color="text-amber-600" bg="bg-amber-50" currency />
      </div>

      {/* Customer Table */}
      <Card padding={false}>
        {/* Table header bar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Customer Summary</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(startDate)} — {formatDate(endDate)}
            &nbsp;·&nbsp;{summary.customers} customer{summary.customers !== 1 ? 's' : ''}
          </p>
        </div>

        {customerRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No customer data found for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-center">Invoices</th>
                  <th className="px-4 py-3 text-right">Total Sales</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-right">Credit Balance</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerRows.map(cust => (
                  <React.Fragment key={cust.name}>
                    {/* Summary row */}
                    <tr
                      onClick={() => setExpandedId(expandedId === cust.name ? null : cust.name)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {cust.name[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{cust.name}</p>
                            {cust.phone && <p className="text-xs text-gray-500">{cust.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                          <FileText className="w-3.5 h-3.5" />
                          {cust.invoices.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 text-sm">
                        {formatCurrency(cust.totalSales)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 text-sm">
                        {formatCurrency(cust.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-semibold ${cust.totalBalance > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {formatCurrency(cust.totalBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-semibold ${cust.totalCreditRemaining > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {formatCurrency(cust.totalCreditRemaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {expandedId === cust.name
                          ? <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === cust.name && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 border-b border-slate-200">
                          <div className="px-6 py-5 space-y-5">

                            {/* Invoices sub-table */}
                            {cust.invoices.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" /> Invoices
                                </h4>
                                <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50 text-xs font-semibold text-gray-500">
                                        <th className="px-3 py-2 text-left">Invoice #</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                        <th className="px-3 py-2 text-right">Paid</th>
                                        <th className="px-3 py-2 text-right">Balance</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {cust.invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono font-medium text-indigo-600">
                                            {inv.invoice_number}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500">
                                            {formatDate(inv.invoice_date)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                            {formatCurrency(inv.total_amount)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-emerald-600">
                                            {formatCurrency(inv.paid_amount)}
                                          </td>
                                          <td className={`px-3 py-2 text-right font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {formatCurrency(inv.balance_due)}
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <StatusBadge status={inv.status} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-gray-50 border-t border-gray-200 text-sm font-semibold">
                                        <td className="px-3 py-2 text-gray-700" colSpan={2}>Total</td>
                                        <td className="px-3 py-2 text-right text-gray-900">
                                          {formatCurrency(cust.totalSales)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-emerald-600">
                                          {formatCurrency(cust.totalPaid)}
                                        </td>
                                        <td className={`px-3 py-2 text-right ${cust.totalBalance > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                          {formatCurrency(cust.totalBalance)}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Credits sub-table */}
                            {cust.credits.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5" /> Credits
                                </h4>
                                <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50 text-xs font-semibold text-gray-500">
                                        <th className="px-3 py-2 text-left">Invoice</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                        <th className="px-3 py-2 text-right">Credit Given</th>
                                        <th className="px-3 py-2 text-right">Paid Back</th>
                                        <th className="px-3 py-2 text-right">Remaining</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {cust.credits.map(cr => (
                                        <tr key={cr.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono font-medium text-indigo-600">
                                            {cr.invoice_number || `#${cr.id}`}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500">
                                            {formatDate(cr.created_at)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-semibold text-amber-600">
                                            {formatCurrency(cr.credit_amount)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-emerald-600">
                                            {formatCurrency(cr.paid_amount)}
                                          </td>
                                          <td className={`px-3 py-2 text-right font-semibold ${parseFloat(cr.remaining_balance) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {formatCurrency(cr.remaining_balance)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-gray-50 border-t border-gray-200 text-sm font-semibold">
                                        <td className="px-3 py-2 text-gray-700" colSpan={2}>Total</td>
                                        <td className="px-3 py-2 text-right text-amber-600">
                                          {formatCurrency(cust.totalCredit)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-emerald-600">
                                          {formatCurrency(cust.totalCreditPaid)}
                                        </td>
                                        <td className={`px-3 py-2 text-right ${cust.totalCreditRemaining > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                          {formatCurrency(cust.totalCreditRemaining)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}

                            {cust.invoices.length === 0 && cust.credits.length === 0 && (
                              <p className="text-sm text-gray-400 text-center py-4">No records for this period</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
