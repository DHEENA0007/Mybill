import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Wallet, Search, Filter, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getIncomes, createIncome, updateIncome, deleteIncome, getIncomeTypes } from '../../api/accounts';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Pagination from '../../components/UI/Pagination';

const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const emptyForm = { income_type: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: '' };

export default function Incomes() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ income_type: '', date_from: '', date_to: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v)
  );

  const { data, isLoading } = useQuery({
    queryKey: ['incomes', page, activeFilters],
    queryFn: () => getIncomes({ page, ...activeFilters }).then(r => r.data),
  });

  const { data: types } = useQuery({
    queryKey: ['income-types'],
    queryFn: () => getIncomeTypes().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => editing
      ? updateIncome(editing.id, payload)
      : createIncome(payload),
    onSuccess: () => {
      toast.success(editing ? 'Income updated' : 'Income added');
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['accounts-dashboard'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteIncome(id),
    onSuccess: () => {
      toast.success('Income deleted');
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['accounts-dashboard'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      income_type: item.income_type,
      amount: item.amount,
      date: item.date,
      remarks: item.remarks || '',
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.income_type || !form.amount || !form.date) {
      toast.error('Please fill all required fields');
      return;
    }
    saveMutation.mutate({
      income_type: Number(form.income_type),
      amount: form.amount,
      date: form.date,
      remarks: form.remarks,
    });
  };

  const clearFilters = () => { setFilters({ income_type: '', date_from: '', date_to: '', search: '' }); setPage(1); };

  const results = data?.results || data || [];
  const count = data?.count || results.length;
  const totalPages = Math.ceil(count / 20);

  const totalFiltered = results.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incomes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage all your income sources</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Income</Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              placeholder="Search by remarks..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />} onClick={() => setShowFilters(!showFilters)}>
            Filters {Object.keys(activeFilters).length > 0 && <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{Object.keys(activeFilters).length}</span>}
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Income Type" value={filters.income_type} onChange={(e) => { setFilters(f => ({ ...f, income_type: e.target.value })); setPage(1); }}>
              <option value="">All Types</option>
              {(types || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Input label="From Date" type="date" value={filters.date_from} onChange={(e) => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(1); }} />
            <Input label="To Date" type="date" value={filters.date_to} onChange={(e) => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(1); }} />
            {Object.keys(activeFilters).length > 0 && (
              <div className="sm:col-span-3">
                <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : !results.length ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No incomes found</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Income" to record your first income</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-gray-700 font-medium">{item.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          {item.income_type_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">{fmt(item.amount)}</td>
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
                {results.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-700" colSpan={2}>Page Total</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{fmt(totalFiltered)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} count={count} />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Income' : 'Add Income'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Income Type *"
            value={form.income_type}
            onChange={(e) => setForm(f => ({ ...f, income_type: e.target.value }))}
          >
            <option value="">Select type...</option>
            {(types || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
              placeholder="Optional notes about this income..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" variant="success" loading={saveMutation.isPending} className="flex-1">
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
        title="Delete Income"
        message={`Are you sure you want to delete this income of ${fmt(deleteTarget?.amount)}?`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
