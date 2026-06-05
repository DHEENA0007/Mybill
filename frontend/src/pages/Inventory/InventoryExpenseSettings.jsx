import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Tag, FolderTree, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  createExpenseSubcategory, updateExpenseSubcategory, deleteExpenseSubcategory,
} from '../../api/inventoryExpenses';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

export default function InventoryExpenseSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('expense');
  const hideIncome = true;

  // --------------- Income Types ---------------
  const [itModal, setItModal] = useState(false);
  const [itEditing, setItEditing] = useState(null);
  const [itName, setItName] = useState('');
  const [itDelete, setItDelete] = useState(null);

  const { data: incomeTypes, isLoading: itLoading } = useQuery({
    queryKey: ['income-types'],
    queryFn: () => getIncomeTypes().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const itSave = useMutation({
    mutationFn: () => itEditing
      ? updateIncomeType(itEditing.id, { name: itName })
      : createIncomeType({ name: itName }),
    onSuccess: () => {
      toast.success(itEditing ? 'Type updated' : 'Type created');
      qc.invalidateQueries({ queryKey: ['income-types'] });
      setItModal(false); setItEditing(null); setItName('');
    },
  });

  const itDel = useMutation({
    mutationFn: (id) => deleteIncomeType(id),
    onSuccess: () => { toast.success('Type deleted'); qc.invalidateQueries({ queryKey: ['income-types'] }); setItDelete(null); },
    onError: () => toast.error('Cannot delete — type is in use'),
  });

  // --------------- Expense Categories ---------------
  const [ecModal, setEcModal] = useState(false);
  const [ecEditing, setEcEditing] = useState(null);
  const [ecName, setEcName] = useState('');
  const [ecDelete, setEcDelete] = useState(null);
  const [expandedCats, setExpandedCats] = useState({});

  // Sub modal
  const [subModal, setSubModal] = useState(false);
  const [subEditing, setSubEditing] = useState(null);
  const [subName, setSubName] = useState('');
  const [subCategoryId, setSubCategoryId] = useState(null);
  const [subDelete, setSubDelete] = useState(null);

  const { data: expenseCategories, isLoading: ecLoading } = useQuery({
    queryKey: ['inventory-expense-categories'],
    queryFn: () => getExpenseCategories().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const ecSave = useMutation({
    mutationFn: () => ecEditing
      ? updateExpenseCategory(ecEditing.id, { name: ecName })
      : createExpenseCategory({ name: ecName }),
    onSuccess: () => {
      toast.success(ecEditing ? 'Category updated' : 'Category created');
      qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] });
      setEcModal(false); setEcEditing(null); setEcName('');
    },
  });

  const ecDel = useMutation({
    mutationFn: (id) => deleteExpenseCategory(id),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }); setEcDelete(null); },
    onError: () => toast.error('Cannot delete — category has subcategories or expenses'),
  });

  const subSave = useMutation({
    mutationFn: () => subEditing
      ? updateExpenseSubcategory(subEditing.id, { name: subName, category: subCategoryId })
      : createExpenseSubcategory({ name: subName, category: subCategoryId }),
    onSuccess: () => {
      toast.success(subEditing ? 'Subcategory updated' : 'Subcategory created');
      qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] });
      setSubModal(false); setSubEditing(null); setSubName('');
    },
  });

  const subDel = useMutation({
    mutationFn: (id) => deleteExpenseSubcategory(id),
    onSuccess: () => { toast.success('Subcategory deleted'); qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }); setSubDelete(null); },
    onError: () => toast.error('Cannot delete — subcategory is in use'),
  });

  const toggleCat = (id) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categories & Types</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage income types and expense categories used across the accounts portal</p>
      </div>

      {/* Tabs */}
      {!hideIncome && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('income')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Income Types
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Expense Categories
          </button>
        </div>
      )}

      {/* Income Types Tab */}
      {tab === 'income' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Income Types</h2>
              <p className="text-xs text-gray-500 mt-0.5">e.g. Salary, Freelance, Rent, Interest</p>
            </div>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setItEditing(null); setItName(''); setItModal(true); }}>
              Add Type
            </Button>
          </div>

          {itLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : !(incomeTypes || []).length ? (
            <div className="text-center py-12">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No income types yet</p>
              <p className="text-sm text-gray-400">Add your first income type to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {incomeTypes.map(type => (
                <div key={type.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Tag className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">{type.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setItEditing(type); setItName(type.name); setItModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setItDelete(type)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expense Categories Tab */}
      {tab === 'expense' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Expense Categories</h2>
              <p className="text-xs text-gray-500 mt-0.5">Organize expenses into categories and subcategories</p>
            </div>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEcEditing(null); setEcName(''); setEcModal(true); }}>
              Add Category
            </Button>
          </div>

          {ecLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : !(expenseCategories || []).length ? (
            <div className="text-center py-12">
              <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No expense categories yet</p>
              <p className="text-sm text-gray-400">Add categories and subcategories to organize expenses</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expenseCategories.map(cat => (
                <div key={cat.id}>
                  {/* Category Row */}
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleCat(cat.id)}>
                    <div className="flex items-center gap-3">
                      {expandedCats[cat.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FolderTree className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({(cat.subcategories || []).length} subcategories)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setSubCategoryId(cat.id); setSubEditing(null); setSubName(''); setSubModal(true); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Add Subcategory">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEcEditing(cat); setEcName(cat.name); setEcModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEcDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {expandedCats[cat.id] && (
                    <div className="bg-gray-50/50">
                      {(cat.subcategories || []).length ? (
                        cat.subcategories.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between pl-16 pr-5 py-2.5 hover:bg-gray-100/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="text-sm text-gray-700">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setSubCategoryId(cat.id); setSubEditing(sub); setSubName(sub.name); setSubModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => setSubDelete(sub)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 pl-16 py-3">No subcategories — click + to add one</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Income Type Modal */}
      <Modal open={itModal} onClose={() => setItModal(false)} title={itEditing ? 'Edit Income Type' : 'Add Income Type'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (!itName.trim()) { toast.error('Name is required'); return; } itSave.mutate(); }} className="space-y-4">
          <Input label="Type Name *" value={itName} onChange={(e) => setItName(e.target.value)} placeholder="e.g. Salary, Freelance..." autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setItModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={itSave.isPending} className="flex-1">{itEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Expense Category Modal */}
      <Modal open={ecModal} onClose={() => setEcModal(false)} title={ecEditing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (!ecName.trim()) { toast.error('Name is required'); return; } ecSave.mutate(); }} className="space-y-4">
          <Input label="Category Name *" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. Transportation, Food..." autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setEcModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={ecSave.isPending} className="flex-1">{ecEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Subcategory Modal */}
      <Modal open={subModal} onClose={() => setSubModal(false)} title={subEditing ? 'Edit Subcategory' : 'Add Subcategory'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (!subName.trim()) { toast.error('Name is required'); return; } subSave.mutate(); }} className="space-y-4">
          <Input label="Subcategory Name *" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g. Fuel, Groceries..." autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setSubModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={subSave.isPending} className="flex-1">{subEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog open={!!itDelete} onClose={() => setItDelete(null)} onConfirm={() => itDel.mutate(itDelete.id)} title="Delete Income Type" message={`Delete "${itDelete?.name}"? Incomes using this type won't be affected.`} loading={itDel.isPending} />
      <ConfirmDialog open={!!ecDelete} onClose={() => setEcDelete(null)} onConfirm={() => ecDel.mutate(ecDelete.id)} title="Delete Category" message={`Delete "${ecDelete?.name}" and all its subcategories? This cannot be undone.`} loading={ecDel.isPending} />
      <ConfirmDialog open={!!subDelete} onClose={() => setSubDelete(null)} onConfirm={() => subDel.mutate(subDelete.id)} title="Delete Subcategory" message={`Delete "${subDelete?.name}"? Expenses using this subcategory won't be affected.`} loading={subDel.isPending} />
    </div>
  );
}
