import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Tag, FolderTree, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getInventoryIncomeCategories as getIncomeCategories, createInventoryIncomeCategory as createIncomeCategory, updateInventoryIncomeCategory as updateIncomeCategory, deleteInventoryIncomeCategory as deleteIncomeCategory,
  getInventoryIncomeSubcategories as getIncomeSubcategories, createInventoryIncomeSubcategory as createIncomeSubcategory, updateInventoryIncomeSubcategory as updateIncomeSubcategory, deleteInventoryIncomeSubcategory as deleteIncomeSubcategory,
} from '../../api/inventoryIncomes';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

export default function InventoryIncomeSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('income');
  const hideExpense = true;

  // --------------- Income Categories ---------------
  const [icModal, setIcModal] = useState(false);
  const [icEditing, setIcEditing] = useState(null);
  const [icName, setIcName] = useState('');
  const [icDelete, setIcDelete] = useState(null);
  const [expandedIcCats, setExpandedIcCats] = useState({});

  // Sub modal for Income
  const [isModal, setIsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [isName, setIsName] = useState('');
  const [isCategoryId, setIsCategoryId] = useState(null);
  const [isDelete, setIsDelete] = useState(null);

  const { data: incomeCategories, isLoading: icLoading } = useQuery({
    queryKey: ['income-categories'],
    queryFn: () => getIncomeCategories().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.results || []);
    }),
  });

  const icSave = useMutation({
    mutationFn: () => icEditing
      ? updateIncomeCategory(icEditing.id, { name: icName })
      : createIncomeCategory({ name: icName }),
    onSuccess: () => {
      toast.success(icEditing ? 'Category updated' : 'Category created');
      qc.invalidateQueries({ queryKey: ['income-categories'] });
      setIcModal(false); setIcEditing(null); setIcName('');
    },
  });

  const icDel = useMutation({
    mutationFn: (id) => deleteIncomeCategory(id),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['income-categories'] }); setIcDelete(null); },
    onError: () => toast.error('Cannot delete — category has subcategories or incomes'),
  });

  const isSave = useMutation({
    mutationFn: () => isEditing
      ? updateIncomeSubcategory(isEditing.id, { name: isName, category: isCategoryId })
      : createIncomeSubcategory({ name: isName, category: isCategoryId }),
    onSuccess: () => {
      toast.success(isEditing ? 'Subcategory updated' : 'Subcategory created');
      qc.invalidateQueries({ queryKey: ['income-categories'] });
      setIsModal(false); setIsEditing(null); setIsName('');
    },
  });

  const isDel = useMutation({
    mutationFn: (id) => deleteIncomeSubcategory(id),
    onSuccess: () => { toast.success('Subcategory deleted'); qc.invalidateQueries({ queryKey: ['income-categories'] }); setIsDelete(null); },
    onError: () => toast.error('Cannot delete — subcategory is in use'),
  });

  const toggleIcCat = (id) => setExpandedIcCats(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Income Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage income categories used across the inventory portal</p>
      </div>



      {/* Income Categories Tab */}
      {tab === 'income' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Income Categories</h2>
              <p className="text-xs text-gray-500 mt-0.5">Organize incomes into categories and subcategories</p>
            </div>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setIcEditing(null); setIcName(''); setIcModal(true); }}>
              Add Category
            </Button>
          </div>

          {icLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : !(incomeCategories || []).length ? (
            <div className="text-center py-12">
              <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No income categories yet</p>
              <p className="text-sm text-gray-400">Add categories and subcategories to organize incomes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {incomeCategories.map(cat => (
                <div key={cat.id}>
                  {/* Category Row */}
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleIcCat(cat.id)}>
                    <div className="flex items-center gap-3">
                      {expandedIcCats[cat.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <FolderTree className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({(cat.subcategories || []).length} subcategories)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setIsCategoryId(cat.id); setIsEditing(null); setIsName(''); setIsModal(true); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Add Subcategory">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setIcEditing(cat); setIcName(cat.name); setIcModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setIcDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {expandedIcCats[cat.id] && (
                    <div className="bg-gray-50/50">
                      {(cat.subcategories || []).length ? (
                        cat.subcategories.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between pl-16 pr-5 py-2.5 hover:bg-gray-100/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="text-sm text-gray-700">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setIsCategoryId(cat.id); setIsEditing(sub); setIsName(sub.name); setIsModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => setIsDelete(sub)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
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



      {/* Income Category Modal */}
      <Modal open={icModal} onClose={() => setIcModal(false)} title={icEditing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (!icName.trim()) { toast.error('Name is required'); return; } icSave.mutate(); }} className="space-y-4">
          <Input label="Category Name *" value={icName} onChange={(e) => setIcName(e.target.value)} placeholder="e.g. Sales, Investments..." autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setIcModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={icSave.isPending} className="flex-1">{icEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Income Subcategory Modal */}
      <Modal open={isModal} onClose={() => setIsModal(false)} title={isEditing ? 'Edit Subcategory' : 'Add Subcategory'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); if (!isName.trim()) { toast.error('Name is required'); return; } isSave.mutate(); }} className="space-y-4">
          <Input label="Subcategory Name *" value={isName} onChange={(e) => setIsName(e.target.value)} placeholder="e.g. Software Sales, Dividends..." autoFocus />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isSave.isPending} className="flex-1">{isEditing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>



      {/* Confirm Dialogs */}
      <ConfirmDialog open={!!icDelete} onClose={() => setIcDelete(null)} onConfirm={() => icDel.mutate(icDelete.id)} title="Delete Category" message={`Delete "${icDelete?.name}" and all its subcategories? This cannot be undone.`} loading={icDel.isPending} />
      <ConfirmDialog open={!!isDelete} onClose={() => setIsDelete(null)} onConfirm={() => isDel.mutate(isDelete.id)} title="Delete Subcategory" message={`Delete "${isDelete?.name}"? Incomes using this subcategory won't be affected.`} loading={isDel.isPending} />

    </div>
  );
}
