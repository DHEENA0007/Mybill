import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '../../api/invoices';
import { getPurchases } from '../../api/purchases';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, X, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractDate(item) {
  const raw = item.invoice_date || item.purchase_date || item.date || item.created_at;
  if (!raw) return null;
  return raw.split('T')[0];
}

export default function CalendarReport() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [mode, setMode] = useState('sales');
  const [selectedDate, setSelectedDate] = useState(null);

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: invoicesData, isFetching: loadingInvoices } = useQuery({
    queryKey: ['calendar-invoices', year, month],
    queryFn: () => getInvoices({ start_date: startDate, end_date: endDate, page_size: 500 }).then(r => r.data),
    enabled: mode === 'sales',
  });

  const { data: purchasesData, isFetching: loadingPurchases } = useQuery({
    queryKey: ['calendar-purchases', year, month],
    queryFn: () => getPurchases({ start_date: startDate, end_date: endDate, page_size: 500 }).then(r => r.data),
    enabled: mode === 'purchases',
  });

  const isLoading = mode === 'sales' ? loadingInvoices : loadingPurchases;

  // Group records by date
  const groupedByDate = useMemo(() => {
    const rawList = mode === 'sales'
      ? (invoicesData?.results ?? invoicesData ?? [])
      : (purchasesData?.results ?? purchasesData ?? []);

    const list = Array.isArray(rawList) ? rawList : [];
    const grouped = {};
    list.forEach(item => {
      const dateKey = extractDate(item);
      if (!dateKey) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [invoicesData, purchasesData, mode]);

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let total = 0, count = 0, activeDays = 0;
    Object.values(groupedByDate).forEach(items => {
      activeDays++;
      items.forEach(item => {
        total += parseFloat(item.total_amount || item.grand_total || 0);
        count++;
      });
    });
    return { total, count, activeDays };
  }, [groupedByDate]);

  const cells = getMonthCells(year, month);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedItems = selectedDate ? (groupedByDate[selectedDate] || []) : [];
  const selectedTotal = selectedItems.reduce(
    (s, item) => s + parseFloat(item.total_amount || item.grand_total || 0), 0
  );

  const prevMonth = () => {
    setSelectedDate(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const isSales = mode === 'sales';
  const accent = isSales ? 'indigo' : 'amber';
  const accentClasses = {
    bg: isSales ? 'bg-indigo-600' : 'bg-amber-500',
    bgLight: isSales ? 'bg-indigo-50' : 'bg-amber-50',
    border: isSales ? 'border-indigo-300' : 'border-amber-300',
    text: isSales ? 'text-indigo-600' : 'text-amber-600',
    textDark: isSales ? 'text-indigo-700' : 'text-amber-700',
    badge: isSales ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700',
    ring: isSales ? 'focus:ring-indigo-500' : 'focus:ring-amber-500',
    panelHeader: isSales ? 'bg-indigo-600' : 'bg-amber-500',
    dot: isSales ? 'bg-indigo-500' : 'bg-amber-500',
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="min-w-[180px] text-center">
            <h2 className="text-lg font-bold text-gray-900">{MONTHS[month]} {year}</h2>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => { setMode('sales'); setSelectedDate(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'sales' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Sales
          </button>
          <button
            onClick={() => { setMode('purchases'); setSelectedDate(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'purchases' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Purchases
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Month Total', value: formatCurrency(monthStats.total) },
          { label: 'Transactions', value: monthStats.count },
          { label: 'Active Days', value: monthStats.activeDays },
        ].map(({ label, value }) => (
          <div key={label} className={`${accentClasses.bgLight} rounded-xl px-4 py-3 border ${accentClasses.border}`}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${accentClasses.textDark}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Calendar + Detail Panel */}
      <div className="flex gap-4 items-start">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className={`py-3 text-center text-xs font-semibold uppercase tracking-wide ${
                d === 'Sun' || d === 'Sat' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {d}
              </div>
            ))}
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Cells */}
          <div className="grid grid-cols-7 relative">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[90px] border-b border-r border-gray-50 bg-gray-50/30"
                  />
                );
              }

              const dateStr = toDateStr(year, month, day);
              const dayItems = groupedByDate[dateStr] || [];
              const total = dayItems.reduce((s, i) => s + parseFloat(i.total_amount || i.grand_total || 0), 0);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasData = dayItems.length > 0;
              const isWeekend = (idx % 7) === 0 || (idx % 7) === 6;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[90px] p-2 border-b border-r border-gray-100 cursor-pointer
                    transition-all duration-150 flex flex-col select-none
                    ${isSelected
                      ? `${accentClasses.bgLight} ring-1 ring-inset ${accentClasses.border}`
                      : isWeekend
                        ? 'bg-gray-50/50 hover:bg-gray-100/70'
                        : 'hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                      ${isToday
                        ? `${accentClasses.bg} text-white`
                        : isWeekend
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {hasData && (
                      <span className={`w-2 h-2 rounded-full mt-1 ${accentClasses.dot}`} />
                    )}
                  </div>

                  {/* Data badge */}
                  {hasData && (
                    <div className="mt-auto space-y-0.5">
                      <div className={`text-xs font-bold rounded-lg px-1.5 py-0.5 text-center truncate ${accentClasses.badge}`}>
                        {formatCurrency(total)}
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        {dayItems.length} {dayItems.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedDate && (
          <div className="w-72 xl:w-80 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0 flex flex-col">
            {/* Panel header */}
            <div className={`${accentClasses.panelHeader} p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Calendar className="w-3.5 h-3.5 text-white/80" />
                    <p className="text-xs text-white/80 font-medium uppercase tracking-wide">
                      {isSales ? 'Sales' : 'Purchases'}
                    </p>
                  </div>
                  <p className="text-white font-bold text-base">{formatDate(selectedDate)}</p>
                  <p className="text-white/90 text-sm mt-0.5 font-semibold">
                    {formatCurrency(selectedTotal)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Transaction list */}
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              {selectedItems.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className={`w-10 h-10 ${accentClasses.bgLight} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    {isSales
                      ? <TrendingUp className={`w-5 h-5 ${accentClasses.text}`} />
                      : <ShoppingCart className={`w-5 h-5 ${accentClasses.text}`} />
                    }
                  </div>
                  <p className="text-sm text-gray-400">
                    No {isSales ? 'sales' : 'purchases'} on this day
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {selectedItems.map((item) => {
                    const amount = parseFloat(item.total_amount || item.grand_total || 0);
                    const status = item.payment_status || item.status;
                    const ref = item.invoice_number || item.purchase_number || `#${item.id}`;
                    const party = item.customer?.name || item.customer_name
                      || item.supplier?.name || item.supplier_name || '—';

                    return (
                      <div key={item.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{ref}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{party}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${accentClasses.text}`}>
                              {formatCurrency(amount)}
                            </p>
                            {status && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${
                                status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                                  : status === 'partial' ? 'bg-amber-100 text-amber-700'
                                    : status === 'cancelled' ? 'bg-gray-100 text-gray-500'
                                      : 'bg-red-100 text-red-700'
                              }`}>
                                {status}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">{item.notes}</p>
                        )}
                        {item.items_count != null && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.items_count} item{item.items_count !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel footer */}
            {selectedItems.length > 0 && (
              <div className={`p-3 border-t border-gray-100 ${accentClasses.bgLight}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {selectedItems.length} transaction{selectedItems.length !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-sm font-bold ${accentClasses.textDark}`}>
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${accentClasses.bg}`} />
          Has {isSales ? 'sales' : 'purchases'}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">T</span>
          Today
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-2 rounded bg-gray-50 border border-gray-200" />
          Weekend
        </div>
      </div>
    </div>
  );
}
