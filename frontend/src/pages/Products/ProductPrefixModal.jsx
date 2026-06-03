import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductPrefixes, createProductPrefix, deleteProductPrefix } from '../../api/products';
import Modal from '../../components/UI/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Table from '../../components/UI/Table';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductPrefixModal({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ prefix: '', start_number: 1, padding: 3 });

  const { data: prefixes, isLoading } = useQuery({
    queryKey: ['product-prefixes'],
    queryFn: () => getProductPrefixes().then(r => r.data?.results || r.data),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: createProductPrefix,
    onSuccess: () => {
      toast.success('Prefix created');
      qc.invalidateQueries(['product-prefixes']);
      setForm({ prefix: '', start_number: 1, padding: 3 });
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create prefix'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProductPrefix,
    onSuccess: () => {
      toast.success('Prefix deleted');
      qc.invalidateQueries(['product-prefixes']);
    },
    onError: () => toast.error('Failed to delete prefix'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  const columns = [
    { key: 'prefix', label: 'Prefix' },
    { key: 'start_number', label: 'Start Number' },
    { key: 'padding', label: 'Padding' },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={() => deleteMut.mutate(row.id)} className="p-1 text-gray-400 hover:text-red-600">
        <Trash2 className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <Modal open={open} onClose={onClose} title="Configure Product Prefixes" size="md">
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Input label="Prefix (e.g. PS-)" value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})} required />
          <Input type="number" label="Start" value={form.start_number} onChange={e => setForm({...form, start_number: e.target.value})} required className="w-24" />
          <Input type="number" label="Padding" value={form.padding} onChange={e => setForm({...form, padding: e.target.value})} required className="w-24" />
          <Button type="submit" loading={createMut.isPending} className="mb-[2px]">Add</Button>
        </form>
        
        <Table columns={columns} data={Array.isArray(prefixes) ? prefixes : []} loading={isLoading} emptyMessage="No prefixes configured" />
      </div>
    </Modal>
  );
}
