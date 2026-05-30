export default function AccountsDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Accounts Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-500 font-medium text-sm">Total Income</h3>
          <p className="text-2xl font-bold text-emerald-600 mt-2">₹0.00</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-500 font-medium text-sm">Total Expenses</h3>
          <p className="text-2xl font-bold text-rose-600 mt-2">₹0.00</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-500 font-medium text-sm">Net Balance</h3>
          <p className="text-2xl font-bold text-indigo-600 mt-2">₹0.00</p>
        </div>
      </div>
    </div>
  );
}
