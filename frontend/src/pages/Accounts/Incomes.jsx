export default function Incomes() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Incomes</h1>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
          Add Income
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 text-center text-slate-500">
          <p>No incomes recorded yet.</p>
        </div>
      </div>
    </div>
  );
}
