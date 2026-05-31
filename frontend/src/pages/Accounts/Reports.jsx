import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, PieChart, BarChart2, List, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { getIncomes, getExpenses, getIncomeTypes, getExpenseCategories } from '../../api/accounts';
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

export default function Reports() {
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [view, setView] = useState('summary');

  const { data: incomeData, isLoading: incLoading } = useQuery({
    queryKey: ['report-incomes', dateFrom, dateTo],
    queryFn: () => getIncomes({ date_from: dateFrom, date_to: dateTo, page_size: 1000 }).then(r => r.data),
  });

  const { data: expenseData, isLoading: expLoading } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo],
    queryFn: () => getExpenses({ date_from: dateFrom, date_to: dateTo, page_size: 1000 }).then(r => r.data),
  });

  const { data: types } = useQuery({
    queryKey: ['income-types'],
    queryFn: () => getIncomeTypes().then(r => {
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

  const incomes = incomeData?.results || incomeData || [];
  const expenses = expenseData?.results || expenseData || [];

  const totalIncome = incomes.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExpense = expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // Group incomes by type
  const incomeByType = {};
  incomes.forEach(i => {
    const name = i.income_type_name || 'Unknown';
    incomeByType[name] = (incomeByType[name] || 0) + parseFloat(i.amount || 0);
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
    ...incomes.map(i => ({ ...i, type: 'income', label: i.income_type_name, amt: parseFloat(i.amount) })),
    ...expenses.map(e => ({ ...e, type: 'expense', label: `${e.category_name} / ${e.subcategory_name}`, amt: parseFloat(e.amount) })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const generateReportHTML = () => {
    // Group Incomes by Type
    const incGroups = {};
    incomes.forEach(i => {
      const typeName = i.income_type_name || 'Other Income';
      if (!incGroups[typeName]) incGroups[typeName] = [];
      incGroups[typeName].push(i);
    });

    // Group Expenses by Category & Subcategory
    const expGroups = {};
    expenses.forEach(e => {
      const catName = e.category_name || 'Other Category';
      const subName = e.subcategory_name || 'General';
      if (!expGroups[catName]) expGroups[catName] = {};
      if (!expGroups[catName][subName]) expGroups[catName][subName] = [];
      expGroups[catName][subName].push(e);
    });

    let html = `
      <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1f2937; padding: 20mm 15mm; line-height: 1.5; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 26px; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Statement of Accounts</h1>
          <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 13px;">DHEENA0007 / Mybill - Financial Portal</p>
          <div style="font-weight: 600; color: #2563eb; margin-top: 6px;">Period: ${dateFrom} to ${dateTo}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px;">
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; text-align: center; border-top: 4px solid #10b981;">
            <h3 style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total Income</h3>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #10b981;">${fmt(totalIncome)}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; text-align: center; border-top: 4px solid #ef4444;">
            <h3 style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total Expenses</h3>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #ef4444;">${fmt(totalExpense)}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background-color: #f9fafb; text-align: center; border-top: 4px solid #3b82f6;">
            <h3 style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Net Balance</h3>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #3b82f6;">${fmt(netBalance)}</p>
          </div>
        </div>
        
        <div style="font-size: 18px; color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 32px; margin-bottom: 16px; text-transform: uppercase; font-weight: 700;">Incomes Breakdown (Type by Type)</div>
    `;

    if (Object.keys(incGroups).length === 0) {
      html += `<p style="font-size: 13px; color: #6b7280;">No income records found for this period.</p>`;
    } else {
      Object.entries(incGroups).forEach(([type, items]) => {
        const subTotal = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        html += `
          <div style="font-size: 13px; font-weight: 700; color: #1e40af; background: #eff6ff; padding: 6px 12px; margin-top: 18px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between;">
            <span>Income Type: ${type}</span>
            <span>Total: ${fmt(subTotal)}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
            <thead>
              <tr>
                <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; background-color: #f9fafb; font-weight: 600; color: #374151; width: 15%;">Date</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; background-color: #f9fafb; font-weight: 600; color: #374151; width: 60%;">Remarks</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; background-color: #f9fafb; font-weight: 600; color: #374151; width: 25%;">Amount</th>
              </tr>
            </thead>
            <tbody>
        `;
        items.forEach(item => {
          html += `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left;">${item.date}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left;">${item.remarks || '-'}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; font-weight: 600; color: #10b981;">${fmt(item.amount)}</td>
            </tr>
          `;
        });
        html += `
            </tbody>
          </table>
        `;
      });
    }

    html += `<div style="font-size: 18px; color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 40px; margin-bottom: 16px; text-transform: uppercase; font-weight: 700;">Expenses Breakdown (Category & Subcategory)</div>`;

    if (Object.keys(expGroups).length === 0) {
      html += `<p style="font-size: 13px; color: #6b7280;">No expense records found for this period.</p>`;
    } else {
      Object.entries(expGroups).forEach(([category, subs]) => {
        const catTotal = Object.values(subs).flat().reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        html += `
          <div style="font-size: 13px; font-weight: 700; background: #f8fafc; color: #334155; border-left: 4px solid #64748b; padding: 6px 12px; margin-top: 18px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between;">
            <span>Category: ${category}</span>
            <span>Total: ${fmt(catTotal)}</span>
          </div>
        `;
        
        Object.entries(subs).forEach(([sub, items]) => {
          const subTotal = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
          html += `
            <div style="font-size: 12px; font-weight: 700; color: #b45309; background: #fffbeb; padding: 4px 10px; margin-top: 10px; margin-bottom: 6px; border-radius: 4px; display: flex; justify-content: space-between;">
              <span>Subcategory: ${sub}</span>
              <span>Total: ${fmt(subTotal)}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; background-color: #f9fafb; font-weight: 600; color: #374151; width: 15%;">Date</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; background-color: #f9fafb; font-weight: 600; color: #374151; width: 60%;">Remarks</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; background-color: #f9fafb; font-weight: 600; color: #374151; width: 25%;">Amount</th>
                </tr>
              </thead>
              <tbody>
          `;
          items.forEach(item => {
            html += `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left;">${item.date}</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left;">${item.remarks || '-'}</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; font-weight: 600; color: #ef4444;">${fmt(item.amount)}</td>
              </tr>
            `;
          });
          html += `
              </tbody>
            </table>
          `;
        });
      });
    }

    html += `
        <div style="margin-top: 60px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
          <div style="width: 240px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 8px; color: #374151; font-size: 12px; font-weight: 600;">
            <div style="height: 50px;"></div>
            Authorised Signatory
            <div style="font-size: 10px; color: #6b7280; font-weight: normal; margin-top: 4px;">Generated on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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

      {/* Date Range + View Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 h-fit">
            <button onClick={() => setView('summary')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
              <BarChart2 className="w-4 h-4" />
            </button>
            <button onClick={() => setView('ledger')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
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
              {/* Income By Type */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Income by Type</h3>
                </div>
                {Object.keys(incomeByType).length ? (
                  <div className="p-4 space-y-3">
                    {Object.entries(incomeByType).sort(([,a],[,b]) => b - a).map(([name, total]) => {
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
