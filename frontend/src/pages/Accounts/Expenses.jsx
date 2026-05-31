import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CreditCard, Search, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseCategories, getExpenseSubcategories } from '../../api/accounts';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const groupByDate = (expenses) => {
  const groups = {};
  expenses.forEach(expense => {
    if (!groups[expense.date]) {
      groups[expense.date] = [];
    }
    groups[expense.date].push(expense);
  });
  return groups;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
};

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyForm = { subcategory: '', amount: '', date: getLocalDateString(), remarks: '' };

export default function Expenses() {
  const qc = useQueryClient();
  const [expandedDates, setExpandedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [filters, setFilters] = useState({ category: '', subcategory: '', date_from: '', date_to: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formCategory, setFormCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v)
  );

  // Fetch ALL expenses without pagination
  const { data: allExpensesData, isLoading } = useQuery({
    queryKey: ['expenses', activeFilters],
    queryFn: () => getExpenses({ page: 1, limit: 10000, ...activeFilters }).then(r => {
      const results = r.data?.results || r.data || [];
      return Array.isArray(results) ? results : (results?.results || []);
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => getExpenseCategories().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  // Dynamic subcategories for the form based on selected category
  const { data: formSubcategories } = useQuery({
    queryKey: ['expense-subcategories', formCategory],
    queryFn: () => getExpenseSubcategories(formCategory ? { category: formCategory } : {}).then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
    enabled: !!formCategory,
  });

  // Dynamic subcategories for the filter
  const { data: filterSubcategories } = useQuery({
    queryKey: ['expense-subcategories-filter', filters.category],
    queryFn: () => getExpenseSubcategories(filters.category ? { category: filters.category } : {}).then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
    enabled: !!filters.category,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => editing
      ? updateExpense(editing.id, payload)
      : createExpense(payload),
    onSuccess: () => {
      toast.success(editing ? 'Expense updated' : 'Expense added');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-dashboard'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-dashboard'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormCategory('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    // Find subcategory's category from categories list
    const cat = (categories || []).find(c =>
      c.subcategories?.some(s => s.id === item.subcategory)
    );
    setFormCategory(cat?.id?.toString() || '');
    setForm({
      subcategory: item.subcategory,
      amount: item.amount,
      date: item.date,
      remarks: item.remarks || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); setFormCategory(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.subcategory || !form.amount || !form.date) {
      toast.error('Please fill all required fields');
      return;
    }
    saveMutation.mutate({
      subcategory: Number(form.subcategory),
      amount: form.amount,
      date: form.date,
      remarks: form.remarks,
    });
  };

  const clearFilters = () => { 
    setFilters({ category: '', subcategory: '', date_from: '', date_to: '', search: '' }); 
  };

  // Get sorted dates for navigation - all dates, not just with expenses
  const allDates = allExpensesData && allExpensesData.length > 0
    ? Object.keys(groupByDate(allExpensesData)).sort((a, b) => new Date(b) - new Date(a))
    : [];

  // Get min and max dates from data
  const minDate = allDates.length > 0 ? allDates[allDates.length - 1] : null; // oldest
  const maxDate = allDates.length > 0 ? allDates[0] : null; // newest

  const goToPreviousDay = () => {
    const parts = selectedDate.split('-');
    const currentDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(getLocalDateString(currentDate));
  };

  const goToNextDay = () => {
    const parts = selectedDate.split('-');
    const currentDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = getLocalDateString(currentDate);
    const today = getLocalDateString();
    if (nextDateStr <= today) {
      setSelectedDate(nextDateStr);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const today = getLocalDateString();
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const today = getLocalDateString();
  const canGoPrevious = true; // can always go back
  const canGoNext = selectedDate < today; // can go forward only if not at today

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and categorize all your expenses</p>
        </div>
        <Button variant="danger" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Expense</Button>
      </div>

      {/* Day Navigation */}
      {allExpensesData && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={goToPreviousDay}
              disabled={!canGoPrevious}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                canGoPrevious
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous Day</span>
            </button>

            <div className="text-center flex-1 min-w-0">
              <p className="text-sm text-gray-600 font-medium">Select Date</p>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={today}
                className="mt-1 px-3 py-2 text-sm font-bold text-indigo-600 border border-indigo-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {allDates.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Recorded range: {formatDate(minDate)} to {formatDate(maxDate)}
                </p>
              )}
            </div>

            <button
              onClick={goToNextDay}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                canGoNext
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); }}
              placeholder="Search by remarks..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />} onClick={() => setShowFilters(!showFilters)}>
            Filters {Object.keys(activeFilters).length > 0 && <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{Object.keys(activeFilters).length}</span>}
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Category" value={filters.category} onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value, subcategory: '' })); }}>
              <option value="">All Categories</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Subcategory" value={filters.subcategory} onChange={(e) => { setFilters(f => ({ ...f, subcategory: e.target.value })); }} disabled={!filters.category}>
              <option value="">All Subcategories</option>
              {(filterSubcategories || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="From Date" type="date" value={filters.date_from} onChange={(e) => { setFilters(f => ({ ...f, date_from: e.target.value })); }} />
            <Input label="To Date" type="date" value={filters.date_to} onChange={(e) => { setFilters(f => ({ ...f, date_to: e.target.value })); }} />
            {Object.keys(activeFilters).length > 0 && (
              <div className="lg:col-span-4">
                <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expenses for Selected Day */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : !allExpensesData ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No expenses found</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Expense" to record your first expense</p>
          </div>
        ) : (
          <>
            {(() => {
              const groupedData = groupByDate(allExpensesData);
              const selectedDayExpenses = groupedData[selectedDate] || [];
              const dayTotal = selectedDayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

              if (selectedDayExpenses.length === 0) {
                return (
                  <div className="text-center py-16">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No expenses for {formatDate(selectedDate)}</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Expense" to record an expense for this date</p>
                  </div>
                );
              }

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Subcategory</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDayExpenses.map(item => (
                          <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {item.category_name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                {item.subcategory_name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-red-600">{fmt(item.amount)}</td>
                            <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">{item.remarks || '-'}</td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td className="py-3 px-4 font-semibold text-gray-700" colSpan={2}>Day Total</td>
                          <td className="py-3 px-4 text-right font-bold text-red-600">{fmt(dayTotal)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Expense' : 'Add Expense'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category *"
            value={formCategory}
            onChange={(e) => { setFormCategory(e.target.value); setForm(f => ({ ...f, subcategory: '' })); }}
          >
            <option value="">Select category...</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Select
            label="Subcategory *"
            value={form.subcategory}
            onChange={(e) => setForm(f => ({ ...f, subcategory: e.target.value }))}
            disabled={!formCategory}
          >
            <option value="">{formCategory ? 'Select subcategory...' : 'Select category first'}</option>
            {(formSubcategories || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <Input
            label="Amount *"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            prefix="₹"
            placeholder="0.00"
          />

          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional notes about this expense..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" variant="danger" loading={saveMutation.isPending} className="flex-1">
              {editing ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense of ${fmt(deleteTarget?.amount)}?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
