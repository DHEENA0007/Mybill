export default function Settings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Categories & Types Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Income Types</h2>
          <p className="text-sm text-slate-500 mb-4">Manage the types of incomes you receive.</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Add Type
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Expense Categories</h2>
          <p className="text-sm text-slate-500 mb-4">Manage categories and subcategories for expenses.</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}
