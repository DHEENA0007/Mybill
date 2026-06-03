import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../../api/products';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import SearchBar from '../../components/UI/SearchBar';
import { StatusBadge } from '../../components/UI/Badge';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import Pagination from '../../components/UI/Pagination';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import ProductForm from './ProductForm';
import usePermission from '../../hooks/usePermission';
import ProductPrefixModal from './ProductPrefixModal';

export default function ProductList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [prefixModalOpen, setPrefixModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, category }],
    queryFn: () => getProducts({ search, page, category }).then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data?.results || r.data),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries(['products']); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const columns = [
    { key: 'name', label: 'Product', render: (v, row) => (
      <div>
        <p className="font-medium text-gray-800">{v}</p>
        <p className="text-xs text-gray-400">{row.sku}</p>
      </div>
    )},
    { key: 'category_name', label: 'Category' },
    { key: 'purchase_price', label: 'Buy Price', render: (v) => formatCurrency(v) },
    { key: 'selling_price', label: 'Sell Price', render: (v) => formatCurrency(v) },
    { key: 'current_stock', label: 'Stock', render: (v, row) => (
      <span className={`font-semibold ${v <= row.min_stock_level ? 'text-red-600' : 'text-gray-800'}`}>{v}</span>
    )},
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        {can('inventory.edit') && (
          <button onClick={() => { setEditItem(row); setFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
        )}
        {can('inventory.delete') && (
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products..." className="max-w-sm flex-1" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {Array.isArray(categories) ? categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : null}
          </select>
        </div>
        <div className="flex gap-2">
          {can('inventory.edit') && (
            <Button variant="secondary" onClick={() => setPrefixModalOpen(true)}>
              Prefix Config
            </Button>
          )}
          {can('inventory.add') && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setFormOpen(true); }}>
              Add Product
            </Button>
          )}
        </div>
      </div>

      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No products found" />
        <Pagination page={page} totalPages={Math.ceil((data?.count || 0) / 20)} onPageChange={setPage} count={data?.count || 0} />
      </Card>

      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? 'Edit Product' : 'Add Product'} size="lg">
        <ProductForm
          initial={editItem}
          categories={Array.isArray(categories) ? categories : (categories?.results || [])}
          onSuccess={() => { setFormOpen(false); setEditItem(null); qc.invalidateQueries(['products']); }}
        />
      </Modal>

      <ProductPrefixModal open={prefixModalOpen} onClose={() => setPrefixModalOpen(false)} />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
}
