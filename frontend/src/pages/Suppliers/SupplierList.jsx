import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../api/suppliers';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import SearchBar from '../../components/UI/SearchBar';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import Pagination from '../../components/UI/Pagination';
import toast from 'react-hot-toast';
import usePermission from '../../hooks/usePermission';

const emptyForm = { name: '', phone: '', email: '', address: '', gst_number: '' };

export default function SupplierList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, page }],
    queryFn: () => getSuppliers({ search, page }).then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (d) => editItem ? updateSupplier(editItem.id, d) : createSupplier(d),
    onSuccess: () => { toast.success(editItem ? 'Supplier updated' : 'Supplier added'); qc.invalidateQueries(['suppliers']); setFormOpen(false); },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['suppliers']); setDeleteId(null); },
  });

  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, phone: item.phone, email: item.email, address: item.address, gst_number: item.gst_number }); setFormOpen(true); };
  const openNew = () => { setEditItem(null); setForm(emptyForm); setFormOpen(true); };

  const columns = [
    { key: 'name', label: 'Supplier', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { key: 'phone', label: 'Contact', render: (v, row) => (
      <div className="flex flex-col gap-0.5">
        {v && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{v}</span>}
        {row.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{row.email}</span>}
      </div>
    )},
    { key: 'gst_number', label: 'GST Number' },
    { key: 'address', label: 'Address', render: (v) => <span className="text-xs text-gray-500 max-w-xs truncate block">{v}</span> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-1">
        {can('purchases.manage_suppliers') && <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>}
        {can('purchases.manage_suppliers') && <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search suppliers..." className="max-w-sm flex-1" />
        {can('purchases.manage_suppliers') && <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>Add Supplier</Button>}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No suppliers found" />
        <Pagination page={page} totalPages={Math.ceil((data?.count || 0) / 20)} onPageChange={setPage} count={data?.count || 0} />
      </Card>
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Supplier' : 'Add Supplier'} size="md">
        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm(f => ({ ...f, gst_number: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saveMut.isPending}>Save Supplier</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Delete Supplier" message="Delete this supplier?" />
    </div>
  );
}
