import { useQuery } from '@tanstack/react-query';
import { getAccountsDashboard } from '../../api/accounts';
import { Wallet, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function AccountsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounts-dashboard'],
    queryFn: () => getAccountsDashboard().then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>;

  const cm = data?.current_month || {};
  const at = data?.all_time || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your income, expenses, and financial health</p>
      </div>

      {/* Current Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">This Month Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(cm.income)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          </div>
          {cm.income_trend !== undefined && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${cm.income_trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {cm.income_trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(cm.income_trend)}% vs last month
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">This Month Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{fmt(cm.expense)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3"><CreditCard className="w-5 h-5 text-red-600" /></div>
          </div>
          {cm.expense_trend !== undefined && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${cm.expense_trend <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {cm.expense_trend <= 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              {Math.abs(cm.expense_trend)}% vs last month
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Net Balance (Month)</p>
              <p className={`text-2xl font-bold mt-1 ${cm.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(cm.balance)}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3"><IndianRupee className="w-5 h-5 text-indigo-600" /></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">All-time balance: {fmt(at.balance)}</p>
        </div>
      </div>

      {/* All Time Stats Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">All-Time Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Income</p>
            <p className="text-lg font-bold text-emerald-600">{fmt(at.income)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Expense</p>
            <p className="text-lg font-bold text-red-600">{fmt(at.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Balance</p>
            <p className={`text-lg font-bold ${at.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(at.balance)}</p>
          </div>
        </div>
      </div>

      {/* Income by Type + Expense by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Income by Type (This Month)</h3>
          {data?.income_by_type?.length ? (
            <div className="space-y-3">
              {data.income_by_type.map((item, i) => {
                const max = data.income_by_type[0]?.total || 1;
                const pct = (item.total / max) * 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{item.name}</span>
                      <span className="text-emerald-600 font-semibold">{fmt(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No income recorded this month</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category (This Month)</h3>
          {data?.expense_by_category?.length ? (
            <div className="space-y-3">
              {data.expense_by_category.map((item, i) => {
                const max = data.expense_by_category[0]?.total || 1;
                const pct = (item.total / max) * 100;
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{item.name}</span>
                      <span className="text-red-600 font-semibold">{fmt(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${colors[i % colors.length]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No expenses recorded this month</p>}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Incomes</h3>
          </div>
          {data?.recent_incomes?.length ? (
            <div className="divide-y divide-gray-50">
              {data.recent_incomes.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.income_type_name}</p>
                    <p className="text-xs text-gray-400">{item.date}{item.remarks ? ` • ${item.remarks}` : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">+{fmt(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No incomes yet</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Expenses</h3>
          </div>
          {data?.recent_expenses?.length ? (
            <div className="divide-y divide-gray-50">
              {data.recent_expenses.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.subcategory_name}</p>
                    <p className="text-xs text-gray-400">{item.category_name} • {item.date}{item.remarks ? ` • ${item.remarks}` : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">-{fmt(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No expenses yet</p>}
        </div>
      </div>
    </div>
  );
}
