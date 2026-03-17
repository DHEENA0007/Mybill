import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import usePermission from '../../hooks/usePermission';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/products';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import toast from 'react-hot-toast';

export default function CategoryList() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const qc = useQueryClient();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => getCategories().then(r => r.data) });

  const saveMut = useMutation({
    mutationFn: (d) => editItem ? updateCategory(editItem.id, d) : createCategory(d),
    onSuccess: () => { toast.success(editItem ? 'Updated' : 'Created'); qc.invalidateQueries(['categories']); setFormOpen(false); },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['categories']); setDeleteId(null); },
  });

  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, description: item.description }); setFormOpen(true); };
  const openNew = () => { setEditItem(null); setForm({ name: '', description: '' }); setFormOpen(true); };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { key: 'description', label: 'Description' },
    { key: 'product_count', label: 'Products', render: (v) => <span className="font-semibold">{v || 0}</span> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        {can('inventory.manage_categories') && <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>}
        {can('inventory.manage_categories') && <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('inventory.manage_categories') && <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Add Category</Button>}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || data || []} loading={isLoading} emptyMessage="No categories yet" />
      </Card>
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saveMut.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Delete Category" message="Delete this category? Products in this category will be unassigned." />
    </div>
  );
}
