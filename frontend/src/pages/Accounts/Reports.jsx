import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, PieChart, BarChart2, List, TrendingUp, TrendingDown, Printer, Search, X, ChevronDown, ChevronUp, Calendar, SlidersHorizontal } from 'lucide-react';
import { getIncomes, getExpenses, getIncomeCategories, getExpenseCategories } from '../../api/accounts';
import Button from '../../components/UI/Button';
import Select from '../../components/UI/Select';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import html2pdf from 'html2pdf.js';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

function getDatePresetRange(preset) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yd = y.toISOString().split('T')[0];
      return { from: yd, to: yd };
    }
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now); mon.setDate(diff);
      return { from: mon.toISOString().split('T')[0], to: today };
    }
    case 'last_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const thisMonday = new Date(now); thisMonday.setDate(diff);
      const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday); lastSunday.setDate(lastSunday.getDate() - 1);
      return { from: lastMonday.toISOString().split('T')[0], to: lastSunday.toISOString().split('T')[0] };
    }
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: today };
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: first.toISOString().split('T')[0], to: last.toISOString().split('T')[0] };
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), q * 3, 1);
      return { from: qStart.toISOString().split('T')[0], to: today };
    }
    case 'last_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), (q - 1) * 3, 1);
      const qEnd = new Date(now.getFullYear(), q * 3, 0);
      return { from: qStart.toISOString().split('T')[0], to: qEnd.toISOString().split('T')[0] };
    }
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], to: today };
    case 'last_year': {
      const y = now.getFullYear() - 1;
      return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: new Date(y, 11, 31).toISOString().split('T')[0] };
    }
    case 'last_7_days': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'last_30_days': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'last_90_days': {
      const d = new Date(now); d.setDate(d.getDate() - 89);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    default:
      return getDefaultRange();
  }
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function Reports() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [datePreset, setDatePreset] = useState('this_month');
  const [view, setView] = useState('summary');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Advanced filters
  const [txnType, setTxnType] = useState('all'); // all | income | expense
  const [filterIncomeType, setFilterIncomeType] = useState('');
  const [filterExpenseCategory, setFilterExpenseCategory] = useState('');
  const [searchRemarks, setSearchRemarks] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDatePresetRange(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const activeFilterCount = [
    txnType !== 'all',
    filterIncomeType !== '',
    filterExpenseCategory !== '',
    searchRemarks !== '',
    amountMin !== '',
    amountMax !== '',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setTxnType('all');
    setFilterIncomeType('');
    setFilterExpenseCategory('');
    setSearchRemarks('');
    setAmountMin('');
    setAmountMax('');
  };

  const { data: incomeData, isLoading: incLoading } = useQuery({
    queryKey: ['report-incomes', dateFrom, dateTo],
    queryFn: () => getIncomes({ date_from: dateFrom, date_to: dateTo, page_size: 1000 }).then(r => r.data),
  });

  const { data: expenseData, isLoading: expLoading } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo],
    queryFn: () => getExpenses({ date_from: dateFrom, date_to: dateTo, page_size: 1000 }).then(r => r.data),
  });

  const { data: types } = useQuery({
    queryKey: ['income-categories'],
    queryFn: () => getIncomeCategories().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => getExpenseCategories().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const loading = incLoading || expLoading;

  const rawIncomes = incomeData?.results || incomeData || [];
  const rawExpenses = expenseData?.results || expenseData || [];

  // Apply client-side filters
  const incomes = useMemo(() => {
    if (txnType === 'expense') return [];
    let filtered = rawIncomes;
    if (filterIncomeType) {
      filtered = filtered.filter(i => String(i.category_id) === filterIncomeType || i.category_name === filterIncomeType);
    }
    if (searchRemarks) {
      const q = searchRemarks.toLowerCase();
      filtered = filtered.filter(i => (i.remarks || '').toLowerCase().includes(q) || (i.category_name || '').toLowerCase().includes(q) || (i.subcategory_name || '').toLowerCase().includes(q));
    }
    if (amountMin) filtered = filtered.filter(i => parseFloat(i.amount) >= parseFloat(amountMin));
    if (amountMax) filtered = filtered.filter(i => parseFloat(i.amount) <= parseFloat(amountMax));
    return filtered;
  }, [rawIncomes, txnType, filterIncomeType, searchRemarks, amountMin, amountMax]);

  const expenses = useMemo(() => {
    if (txnType === 'income') return [];
    let filtered = rawExpenses;
    if (filterExpenseCategory) {
      filtered = filtered.filter(e => String(e.category_id) === filterExpenseCategory || e.category_name === filterExpenseCategory);
    }
    if (searchRemarks) {
      const q = searchRemarks.toLowerCase();
      filtered = filtered.filter(e => (e.remarks || '').toLowerCase().includes(q) || (e.category_name || '').toLowerCase().includes(q) || (e.subcategory_name || '').toLowerCase().includes(q));
    }
    if (amountMin) filtered = filtered.filter(e => parseFloat(e.amount) >= parseFloat(amountMin));
    if (amountMax) filtered = filtered.filter(e => parseFloat(e.amount) <= parseFloat(amountMax));
    return filtered;
  }, [rawExpenses, txnType, filterExpenseCategory, searchRemarks, amountMin, amountMax]);

  const totalIncome = incomes.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExpense = expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // Group incomes by category
  const incomeByCategory = {};
  incomes.forEach(i => {
    const name = i.category_name || 'Unknown';
    incomeByCategory[name] = (incomeByCategory[name] || 0) + parseFloat(i.amount || 0);
  });

  // Group expenses by category
  const expenseByCategory = {};
  expenses.forEach(e => {
    const name = e.category_name || 'Unknown';
    expenseByCategory[name] = (expenseByCategory[name] || 0) + parseFloat(e.amount || 0);
  });

  // Group expenses by subcategory
  const expenseBySubcategory = {};
  expenses.forEach(e => {
    const key = `${e.category_name} → ${e.subcategory_name}`;
    expenseBySubcategory[key] = (expenseBySubcategory[key] || 0) + parseFloat(e.amount || 0);
  });

  // Combined ledger sorted by date
  const ledger = [
    ...incomes.map(i => ({ ...i, type: 'income', label: `${i.category_name} / ${i.subcategory_name}`, amt: parseFloat(i.amount) })),
    ...expenses.map(e => ({ ...e, type: 'expense', label: `${e.category_name} / ${e.subcategory_name}`, amt: parseFloat(e.amount) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const generateReportHTML = () => {
    // We format the date range
    const dObj = new Date(dateFrom);
    const dayName = dObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dateFormatted = dObj.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const prevDayObj = new Date(dObj);
    prevDayObj.setDate(prevDayObj.getDate() - 1);
    const prevDateFormatted = prevDayObj.toLocaleDateString('en-GB');

    // Group expenses by category
    const expGroups = {};
    expenses.forEach(e => {
      const catName = e.category_name || 'Other Category';
      if (!expGroups[catName]) expGroups[catName] = [];
      expGroups[catName].push(e);
    });

    let html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 15mm 10mm; line-height: 1.5; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #64748b; padding-bottom: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 22px; color: #1e3a8a; font-weight: 700;">Daily Accounts Ledger</h1>
          <p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 500; letter-spacing: 0.5px;">
            ${dateFormatted} SUMMARY (${dayName})
          </p>
        </div>
    `;

    Object.entries(expGroups).forEach(([catName, items]) => {
      const catTotal = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      
      html += `
        <div style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 16px; page-break-inside: avoid; background-color: #ffffff;">
          <div style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">
            <h3 style="margin: 0; font-size: 14px; color: #1e3a8a; font-weight: 700;">${catName} A/c</h3>
          </div>
          <div style="padding: 4px 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tbody>
      `;
      
      items.forEach((item, index) => {
        const amt = Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const remark = item.remarks || item.subcategory_name || '-';
        html += `
                <tr>
                  <td style="padding: 8px 4px; width: 30px; color: #475569; text-align: center;">${index + 1}</td>
                  <td style="padding: 8px 12px; color: #334155;">${remark}</td>
                  <td style="padding: 8px 4px; text-align: right; color: #334155;">${amt}</td>
                </tr>
        `;
      });

      const totalFmt = Number(catTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      
      html += `
              </tbody>
            </table>
          </div>
          <div style="padding: 8px 16px 12px; border-top: 1px dashed #e2e8f0;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #0f172a; padding: 0 4px;">
              <span style="margin-left: auto; margin-right: 32px;">Total:</span>
              <span>${totalFmt}</span>
            </div>
            <div style="border-bottom: 2px solid #cbd5e1; margin-top: 6px;"></div>
          </div>
        </div>
      `;
    });

    const incomeRowsHTML = incomes.map((inc, i) => {
      const amt = Number(inc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return `
      <tr>
        <td style="padding: 10px 0; color: #334155;">${i + 1}. ${inc.income_type_name || 'Income'} ${inc.remarks ? '('+inc.remarks+')' : ''}</td>
        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #16a34a;">${amt}</td>
      </tr>
      `;
    }).join('');

    const totExpFmt = Number(totalExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const totIncFmt = Number(totalIncome).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const balFmt = Number(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    html += `
        <div style="border: 1px solid #e2e8f0; border-radius: 4px; margin-top: 24px; page-break-inside: avoid; background-color: #f8fafc;">
          <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
            <h3 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">Balance Sheet Statement</h3>
          </div>
          <div style="padding: 8px 16px 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tbody>
                ${incomeRowsHTML || `
                <tr>
                  <td style="padding: 10px 0; color: #334155;">1. Total Income</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #16a34a;">${totIncFmt}</td>
                </tr>
                `}
                <tr>
                  <td style="padding: 10px 0; color: #334155;">${incomes.length ? incomes.length + 1 : 2}. Total Expenses Amount (As detailed above)</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #dc2626;">-${totExpFmt}</td>
                </tr>
                <tr><td colspan="2"><div style="border-top: 1px solid #e2e8f0; margin: 4px 0;"></div></td></tr>
                <tr>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">Balance Brought Forward (B/f)</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #334155;">${balFmt}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #475569;">Add: ${prevDateFormatted} Balance Brought Forward (B/f)</td>
                  <td style="padding: 10px 0; text-align: right; color: #475569;">0.00</td>
                </tr>
                <tr><td colspan="2"><div style="border-top: 2px solid #94a3b8; margin: 4px 0;"></div></td></tr>
                <tr>
                  <td style="padding: 12px 0; color: #0f172a; font-weight: 700; font-size: 15px;">Net Balance Carry Forward (Net B/f)</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 15px; color: #0f172a;">${balFmt}</td>
                </tr>
                <tr><td colspan="2"><div style="border-top: 1px solid #cbd5e1; margin: 0 0 8px;"></div></td></tr>
              </tbody>
            </table>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">
              Note from ledger: System generated report.
            </p>
          </div>
        </div>
      </div>
    `;

    return html;
  };

  const handlePrintReport = () => {
    const html = generateReportHTML();
    const printWindow = window.open('', '_blank');
    const fullHtml = `
      <html>
        <head>
          <title>Accounts Statement of Accounts</title>
          <style>
            @page { size: auto; margin: 0; }
            body { margin: 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const html = generateReportHTML();
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const opt = {
      margin:       10,
      filename:     `accounts-report-${dateFrom}-to-${dateTo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const handleExportCSV = () => {
    const rows = [['Date', 'Type', 'Category', 'Amount', 'Remarks']];
    ledger.forEach(item => {
      rows.push([item.date, item.type === 'income' ? 'Income' : 'Expense', item.label, item.amt.toFixed(2), item.remarks || '']);
    });
    rows.push([]);
    rows.push(['', '', 'Total Income', totalIncome.toFixed(2), '']);
    rows.push(['', '', 'Total Expense', totalExpense.toFixed(2), '']);
    rows.push(['', '', 'Net Balance', netBalance.toFixed(2), '']);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analyze your financial data with detailed reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV} disabled={loading}>
            Export CSV
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF} disabled={loading}>
            Download PDF
          </Button>
          <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrintReport} disabled={loading}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Row 1: Date preset + Date range + View toggle */}
        <div className="p-4 flex flex-col gap-3">
          {/* Date Preset Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => handlePresetChange(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    datePreset === p.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Inputs + View Toggle row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex gap-2 items-end">
              <Input label="From" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }} />
              <Input label="To" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }} />
            </div>
            <div className="flex gap-2 items-center ml-auto">
              {/* Transaction Type Quick Filter */}
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {[{ v: 'all', l: 'All' }, { v: 'income', l: 'Income' }, { v: 'expense', l: 'Expense' }].map(t => (
                  <button
                    key={t.v}
                    onClick={() => setTxnType(t.v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      txnType === t.v
                        ? (t.v === 'income' ? 'bg-emerald-500 text-white shadow-sm' : t.v === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
              {/* View Toggle */}
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setView('summary')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => setView('ledger')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Advanced Filter Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  showAdvanced || activeFilterCount > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
                )}
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showAdvanced && (
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Search Remarks</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by remarks, category..."
                    value={searchRemarks}
                    onChange={(e) => setSearchRemarks(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-8 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                  {searchRemarks && (
                    <button onClick={() => setSearchRemarks('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Income Category filter */}
              {(txnType === 'all' || txnType === 'income') && (
                <div className="min-w-[160px]">
                  <Select label="Income Category" value={filterIncomeType} onChange={(e) => setFilterIncomeType(e.target.value)}>
                    <option value="">All Types</option>
                    {(types || []).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Expense Category filter */}
              {txnType !== 'income' && (
                <div className="min-w-[160px]">
                  <Select label="Expense Category" value={filterExpenseCategory} onChange={(e) => setFilterExpenseCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {(categories || []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Amount Range */}
              <div className="min-w-[120px]">
                <Input label="Min Amount" type="number" placeholder="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
              </div>
              <div className="min-w-[120px]">
                <Input label="Max Amount" type="number" placeholder="∞" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
              </div>

              {/* Clear All */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && !showAdvanced && (
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Active:</span>
            {txnType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                {txnType === 'income' ? 'Income Only' : 'Expenses Only'}
                <button onClick={() => setTxnType('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterIncomeType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                Type: {(types || []).find(t => String(t.id) === filterIncomeType)?.name || filterIncomeType}
                <button onClick={() => setFilterIncomeType('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterExpenseCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                Category: {(categories || []).find(c => String(c.id) === filterExpenseCategory)?.name || filterExpenseCategory}
                <button onClick={() => setFilterExpenseCategory('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchRemarks && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                Search: "{searchRemarks}"
                <button onClick={() => setSearchRemarks('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(amountMin || amountMax) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                Amount: {amountMin || '0'} — {amountMax || '∞'}
                <button onClick={() => { setAmountMin(''); setAmountMax(''); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 ml-auto">Clear All</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 rounded-lg p-2.5"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Income</p>
                  <p className="text-xl font-bold text-emerald-600">{fmt(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 rounded-lg p-2.5"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">{fmt(totalExpense)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 rounded-lg p-2.5"><PieChart className="w-5 h-5 text-indigo-600" /></div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Net Balance</p>
                  <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(netBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          {view === 'summary' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income By Category */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Income by Category</h3>
                </div>
                {Object.keys(incomeByCategory).length ? (
                  <div className="p-4 space-y-3">
                    {Object.entries(incomeByCategory).sort(([,a],[,b]) => b - a).map(([name, total]) => {
                      const pct = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{name}</span>
                            <span className="text-gray-600">{fmt(total)} <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-400 text-center py-8">No income data for this period</p>}
              </div>

              {/* Expense By Category */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Expenses by Category</h3>
                </div>
                {Object.keys(expenseByCategory).length ? (
                  <div className="p-4 space-y-3">
                    {Object.entries(expenseByCategory).sort(([,a],[,b]) => b - a).map(([name, total]) => {
                      const pct = totalExpense > 0 ? (total / totalExpense) * 100 : 0;
                      const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                      const idx = Object.keys(expenseByCategory).sort((a,b) => expenseByCategory[b] - expenseByCategory[a]).indexOf(name);
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{name}</span>
                            <span className="text-gray-600">{fmt(total)} <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`${colors[idx % colors.length]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-400 text-center py-8">No expense data for this period</p>}
              </div>

              {/* Expense By Subcategory (full width) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Expense Breakdown by Subcategory</h3>
                </div>
                {Object.keys(expenseBySubcategory).length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Category → Subcategory</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(expenseBySubcategory).sort(([,a],[,b]) => b - a).map(([key, total]) => (
                          <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/70">
                            <td className="py-3 px-4 text-gray-700 font-medium">{key}</td>
                            <td className="py-3 px-4 text-right text-red-600 font-semibold">{fmt(total)}</td>
                            <td className="py-3 px-4 text-right text-gray-500">{totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td className="py-3 px-4 font-bold text-gray-700">Total</td>
                          <td className="py-3 px-4 text-right font-bold text-red-600">{fmt(totalExpense)}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-500">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : <p className="text-sm text-gray-400 text-center py-8">No data</p>}
              </div>
            </div>
          ) : (
            /* Ledger View */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Transaction Ledger</h3>
                <p className="text-xs text-gray-400 mt-0.5">{ledger.length} transactions found</p>
              </div>
              {ledger.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((item, idx) => (
                        <tr key={`${item.type}-${item.id}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50/70">
                          <td className="py-3 px-4 text-gray-700 font-medium">{item.date}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {item.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{item.label}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${item.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.type === 'income' ? '+' : '-'}{fmt(item.amt)}
                          </td>
                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50/50">
                        <td colSpan={3} className="py-3 px-4 font-semibold text-emerald-700">Total Income</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{fmt(totalIncome)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-red-50/50">
                        <td colSpan={3} className="py-3 px-4 font-semibold text-red-700">Total Expenses</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">{fmt(totalExpense)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-indigo-50/50">
                        <td colSpan={3} className="py-3 px-4 font-bold text-indigo-700">Net Balance</td>
                        <td className={`py-3 px-4 text-right font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(netBalance)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : <p className="text-sm text-gray-400 text-center py-12">No transactions found for the selected period</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
