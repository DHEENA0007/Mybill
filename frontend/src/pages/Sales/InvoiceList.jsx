import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil } from 'lucide-react';
import { getInvoices } from '../../api/invoices';
import usePermission from '../../hooks/usePermission';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import SearchBar from '../../components/UI/SearchBar';
import { StatusBadge } from '../../components/UI/Badge';
import Pagination from '../../components/UI/Pagination';
import useChoices from '../../hooks/useChoices';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function InvoiceList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const { invoiceStatuses } = useChoices();
  const { can } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, page, status }],
    queryFn: () => getInvoices({ search, page, status }).then(r => r.data),
  });

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (v) => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'customer_name', label: 'Customer', render: (v) => v || 'Walk-in' },
    { key: 'invoice_date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'total_amount', label: 'Total', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'paid_amount', label: 'Paid', render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'balance_due', label: 'Balance', render: (v) => <span className={v > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'view', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        {row.status !== 'cancelled' && (
          <button onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${row.id}/edit`); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${row.id}`); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search invoices..." className="max-w-sm" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Status</option>
            {invoiceStatuses.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {can('sales.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/billing')}>New Invoice</Button>}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No invoices found" onRowClick={(row) => navigate(`/invoices/${row.id}`)} />
        <Pagination page={page} totalPages={Math.ceil((data?.count || 0) / 20)} onPageChange={setPage} count={data?.count || 0} />
      </Card>
    </div>
  );
}
