import { useQuery } from '@tanstack/react-query';
import { getCreditLogs } from '../../api/invoices';
import Card from '../../components/UI/Card';
import Table from '../../components/UI/Table';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CreditLog() {
  const { data, isLoading } = useQuery({ queryKey: ['credit-logs'], queryFn: () => getCreditLogs().then(r => r.data) });

  const columns = [
    { key: 'customer_name', label: 'Customer', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'credit_amount', label: 'Credit Amount', render: (v) => formatCurrency(v) },
    { key: 'paid_amount', label: 'Paid', render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'remaining_balance', label: 'Balance', render: (v) => <span className={`font-bold ${v > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(v)}</span> },
    { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-4">
      <Card padding={false}>
        <Table columns={columns} data={data?.results || []} loading={isLoading} emptyMessage="No credit logs found" />
      </Card>
    </div>
  );
}
