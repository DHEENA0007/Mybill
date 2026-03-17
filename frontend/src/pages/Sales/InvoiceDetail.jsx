import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, DollarSign, XCircle } from 'lucide-react';
import { getInvoice, recordInvoicePayment, cancelInvoice } from '../../api/invoices';
import { getDefaultTemplate } from '../../api/templates';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { StatusBadge } from '../../components/UI/Badge';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import useChoices from '../../hooks/useChoices';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import InvoiceRenderer from '../../components/InvoiceRenderer';
import toast from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const printRef = useRef();
  const { paymentMethods } = useChoices();
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: '' });

  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: () => getInvoice(id).then(r => r.data) });
  const { data: activeTemplate } = useQuery({ queryKey: ['invoice-template-default'], queryFn: () => getDefaultTemplate().then(r => r.data), staleTime: 60000 });

  const payMut = useMutation({
    mutationFn: (d) => recordInvoicePayment(id, d),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries(['invoice', id]); setPayOpen(false); },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelInvoice(id),
    onSuccess: () => { toast.success('Invoice cancelled'); qc.invalidateQueries(['invoice', id]); },
  });

  const handlePrint = () => window.print();

  if (isLoading) return <PageLoader />;
  if (!inv) return <p className="text-gray-500">Invoice not found</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 no-print">
        <button onClick={() => navigate('/invoices')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1" />
        {inv.status !== 'cancelled' && inv.balance_due > 0 && (
          <Button variant="success" size="sm" icon={<DollarSign className="w-4 h-4" />} onClick={() => { setPayForm({ amount: inv.balance_due, payment_method: '' }); setPayOpen(true); }}>
            Record Payment
          </Button>
        )}
        {inv.status !== 'cancelled' && (
          <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={() => cancelMut.mutate()} loading={cancelMut.isPending}>Cancel</Button>
        )}
        <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>Print</Button>
      </div>

      {/* Printable Invoice — rendered with active template */}
      <Card padding={false} ref={printRef}>
        <InvoiceRenderer
          invoice={inv}
          template={activeTemplate}
          logoUrl={activeTemplate?.logo_url}
        />
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); payMut.mutate(payForm); }} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm"><p className="text-gray-500">Balance Due: <span className="font-bold text-red-600">{formatCurrency(inv.balance_due)}</span></p></div>
          <Input label="Amount" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))} required prefix="₹" />
          <Select label="Payment Method" value={payForm.payment_method} onChange={(e) => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
            <option value="">Select method</option>
            {paymentMethods.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <div className="flex justify-end"><Button type="submit" loading={payMut.isPending}>Record Payment</Button></div>
        </form>
      </Modal>
    </div>
  );
}
