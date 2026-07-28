import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPayments } from '../../api/payments';
import Card, { CardHeader } from '../../components/UI/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar, Banknote, Hash, TrendingUp, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const todayStr = () => new Date().toISOString().split('T')[0];

// Escape HTML entities for the print window content
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const METHOD_LABEL = {
  cash: 'Cash', upi: 'UPI', card: 'Card',
  bank: 'Bank Transfer', cheque: 'Cheque', other: 'Other',
};
const METHOD_COLOR = {
  cash: 'bg-emerald-100 text-emerald-700',
  upi: 'bg-blue-100 text-blue-700',
  card: 'bg-purple-100 text-purple-700',
  bank: 'bg-indigo-100 text-indigo-700',
  cheque: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 20px; font-weight: bold; color: #065f46; }
  .subtitle { color: #6b7280; font-size: 11px; margin-top: 3px; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
  .stat { border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 8px; padding: 10px 14px; }
  .stat-label { font-size: 9px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
  .stat-value { font-size: 17px; font-weight: bold; color: #065f46; margin-top: 3px; }
  .day-block { margin-bottom: 18px; }
  .day-header { background: #f0fdf4; border-left: 4px solid #059669; padding: 7px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
  .day-title { font-weight: bold; font-size: 12px; color: #065f46; }
  .day-count { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .day-total { font-weight: bold; color: #059669; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead th { background: #f9fafb; padding: 5px 8px; text-align: left; font-size: 9px; color: #6b7280; font-weight: 700; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.04em; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  .td-right { text-align: right; }
  .td-amount { text-align: right; font-weight: bold; color: #059669; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 9999px; font-size: 9px; font-weight: 600; background: #dbeafe; color: #1d4ed8; }
  tfoot td { background: #ecfdf5; font-weight: bold; color: #065f46; border-top: 2px solid #6ee7b7; padding: 6px 8px; }
  .grand-total { display: flex; justify-content: space-between; align-items: center; background: #065f46; color: white; padding: 12px 16px; border-radius: 8px; margin-top: 16px; }
  .gt-label { font-weight: bold; font-size: 13px; }
  .gt-value { font-weight: bold; font-size: 16px; }
  @page { margin: 15mm; }
`;

function StatCard({ label, value, icon: Icon, color, bg, currency }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={`${bg} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${color}`}>
            {currency ? formatCurrency(value) : value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function DailyCreditReport() {
  // Default: today only
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [expandedDate, setExpandedDate] = useState(null);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['daily-credit-collections', startDate, endDate],
    queryFn: () =>
      getPayments({
        payment_type: 'incoming',
        reference_type: 'credit',
        date_from: startDate,
        date_to: endDate,
        page_size: 1000,
      }).then(r => r.data),
    enabled: !!(startDate && endDate),
  });

  // Client-side guard: only keep credit incoming payments
  const payments = useMemo(() => {
    const list = rawData?.results ?? (Array.isArray(rawData) ? rawData : []);
    return list.filter(p => p.payment_type === 'incoming' && p.reference_type === 'credit');
  }, [rawData]);

  // Group by date, newest first for the table
  const dailyGroups = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      const date = (p.payment_date || '').split('T')[0];
      if (!date) return;
      if (!map[date]) map[date] = [];
      map[date].push(p);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      }));
  }, [payments]);

  // Oldest-first for the chart
  const chartData = useMemo(
    () =>
      [...dailyGroups].reverse().map(g => ({
        label: new Date(g.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        total: g.total,
        count: g.items.length,
      })),
    [dailyGroups],
  );

  const grandTotal = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const avgPerDay = dailyGroups.length > 0 ? grandTotal / dailyGroups.length : 0;

  const handlePrint = () => {
    const dateLabel = startDate === endDate
      ? formatDate(startDate)
      : `${formatDate(startDate)} — ${formatDate(endDate)}`;

    const body = `
      <h1>Daily Credit Collection Report</h1>
      <div class="subtitle">
        ${esc(dateLabel)} &nbsp;·&nbsp;
        ${payments.length} collection${payments.length !== 1 ? 's' : ''}
        across ${dailyGroups.length} day${dailyGroups.length !== 1 ? 's' : ''}
      </div>

      <div class="summary-grid">
        <div class="stat">
          <div class="stat-label">Active Days</div>
          <div class="stat-value">${dailyGroups.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Collected</div>
          <div class="stat-value">${esc(formatCurrency(grandTotal))}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${payments.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Avg / Active Day</div>
          <div class="stat-value">${esc(formatCurrency(avgPerDay))}</div>
        </div>
      </div>

      ${dailyGroups.map(({ date, items, total }) => `
        <div class="day-block">
          <div class="day-header">
            <div>
              <div class="day-title">
                ${esc(new Date(date).toLocaleDateString('en-IN', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                }))}
              </div>
              <div class="day-count">
                ${items.length} transaction${items.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div class="day-total">${esc(formatCurrency(total))}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:32px">#</th>
                <th>Customer</th>
                <th>Method</th>
                <th class="td-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((p, idx) => `
                <tr>
                  <td style="color:#9ca3af;font-family:monospace">${idx + 1}</td>
                  <td style="font-weight:600">${esc(p.reference_name)}</td>
                  <td><span class="badge">${esc(METHOD_LABEL[p.payment_method] || p.payment_method)}</span></td>
                  <td class="td-amount">${esc(formatCurrency(p.amount))}</td>
                  <td style="color:#9ca3af;font-size:10px">${esc(p.notes) || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Day Total</td>
                <td class="td-amount">${esc(formatCurrency(total))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `).join('')}

      <div class="grand-total">
        <span class="gt-label">
          Grand Total &nbsp;(${payments.length} transaction${payments.length !== 1 ? 's' : ''})
        </span>
        <span class="gt-value">${esc(formatCurrency(grandTotal))}</span>
      </div>
    `;

    const win = window.open('', '_blank', 'width=940,height=720');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Daily Credit Collection Report — ${esc(dateLabel)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${body}</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header + date filters + print button */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Daily Credit Collection Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Customer-wise credit payments collected each day
          </p>
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
            max={todayStr()}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handlePrint}
            disabled={payments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Days" value={dailyGroups.length}
          icon={Calendar} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard label="Total Collected" value={grandTotal}
          icon={Banknote} color="text-emerald-600" bg="bg-emerald-50" currency />
        <StatCard label="Transactions" value={payments.length}
          icon={Hash} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Avg / Active Day" value={avgPerDay}
          icon={TrendingUp} color="text-purple-600" bg="bg-purple-50" currency />
      </div>

      {/* Bar chart — only when there is data */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader
            title="Daily Collection Trend"
            subtitle="Credit amount collected per day"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              barSize={chartData.length > 20 ? 7 : 28}
              margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      <p className="text-emerald-600 font-semibold">{formatCurrency(payload[0]?.value)}</p>
                      <p className="text-gray-400 mt-0.5">
                        {payload[0]?.payload?.count} transaction
                        {payload[0]?.payload?.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? '#059669' : '#6ee7b7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Daily breakdown accordion */}
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Daily Breakdown</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {startDate === endDate
              ? formatDate(startDate)
              : `${formatDate(startDate)} — ${formatDate(endDate)}`}
            &nbsp;·&nbsp;{payments.length} collection{payments.length !== 1 ? 's' : ''}
            {dailyGroups.length > 1 && ` across ${dailyGroups.length} days`}
          </p>
        </div>

        {dailyGroups.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No credit collections recorded for this period
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dailyGroups.map(({ date, items, total }) => {
              const isOpen = expandedDate === date;
              const dayLabel = new Date(date).toLocaleDateString('en-IN', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              });

              return (
                <div key={date}>
                  {/* Day header row */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50/40 transition-colors text-left"
                    onClick={() => setExpandedDate(isOpen ? null : date)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dayLabel}</p>
                        <p className="text-xs text-gray-500">
                          {items.length} transaction{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-base font-bold text-emerald-600">
                        {formatCurrency(total)}
                      </span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded transaction list */}
                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-200 px-5 py-4">
                      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-xs font-semibold text-gray-500">
                              <th className="px-3 py-2 text-left w-8">#</th>
                              <th className="px-3 py-2 text-left">Customer</th>
                              <th className="px-3 py-2 text-left">Method</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-left">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {items.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-400 font-mono">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-900">
                                  {p.reference_name || '—'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_COLOR[p.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                                    {METHOD_LABEL[p.payment_method] || p.payment_method || '—'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-600">
                                  {formatCurrency(p.amount)}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-400 max-w-[220px] truncate">
                                  {p.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-50 border-t border-emerald-200 font-semibold text-sm">
                              <td className="px-3 py-2 text-gray-600" colSpan={3}>Day Total</td>
                              <td className="px-3 py-2 text-right text-emerald-700">
                                {formatCurrency(total)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand total footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-t border-emerald-200">
              <span className="text-sm font-bold text-gray-700">
                Grand Total ({payments.length} transaction{payments.length !== 1 ? 's' : ''})
              </span>
              <span className="text-base font-bold text-emerald-700">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
