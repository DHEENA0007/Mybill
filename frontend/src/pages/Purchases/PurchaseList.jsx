import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPurchases } from '../../api/purchases';
import usePermission from '../../hooks/usePermission';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import SearchBar from '../../components/UI/SearchBar';
import { StatusBadge } from '../../components/UI/Badge';
import Pagination from '../../components/UI/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PurchaseList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { search, page }],
    queryFn: () => getPurchases({ search, page }).then(r => r.data),
  });

  const columns = [
    { key: 'id', label: 'Purchase #', render: (v) => <span className="font-mono text-indigo-600">PUR-{String(v).padStart(4,'0')}</span> },
    { key: 'supplier_name', label: 'Supplier', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'purchase_date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'total_amount', label: 'Total', render: (v) => formatCurrency(v) },
    { key: 'paid_amount', label: 'Paid', render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'balance_due', label: 'Balance', render: (v) => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-gray-500'}`}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'actions', label: '', render: (_, row) => (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${row.id}`); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
        <Eye className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search purchases..." className="max-w-sm flex-1" />
        {can('purchases.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/purchases/new')}>New Purchase</Button>}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No purchases found" onRowClick={(row) => navigate(`/purchases/${row.id}`)} />
        <Pagination page={page} totalPages={Math.ceil((data?.count || 0) / 20)} onPageChange={setPage} count={data?.count || 0} />
      </Card>
    </div>
  );
}
