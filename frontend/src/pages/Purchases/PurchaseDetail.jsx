import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { getPurchase, recordPurchasePayment } from '../../api/purchases';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { StatusBadge } from '../../components/UI/Badge';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import useChoices from '../../hooks/useChoices';
import Select from '../../components/UI/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { paymentMethods } = useChoices();
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: '', notes: '' });

  const { data: purchase, isLoading } = useQuery({ queryKey: ['purchase', id], queryFn: () => getPurchase(id).then(r => r.data) });

  const payMut = useMutation({
    mutationFn: (d) => recordPurchasePayment(id, d),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries(['purchase', id]); setPayOpen(false); },
    onError: () => toast.error('Failed'),
  });

  if (isLoading) return <PageLoader />;
  if (!purchase) return <p className="text-gray-500">Purchase not found</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Purchase PUR-{String(purchase.id).padStart(4,'0')}</h2>
          <p className="text-sm text-gray-500">{formatDate(purchase.purchase_date)} · {purchase.supplier_name}</p>
        </div>
        <StatusBadge status={purchase.status} />
        {purchase.balance_due > 0 && (
          <Button icon={<DollarSign className="w-4 h-4" />} onClick={() => { setPayForm({ amount: purchase.balance_due, payment_method: '', notes: '' }); setPayOpen(true); }}>
            Record Payment
          </Button>
        )}
      </div>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Products</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
            <th className="pb-2 text-left">Product</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Total</th>
          </tr></thead>
          <tbody>
            {(purchase.items || []).map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2.5 font-medium">{item.product_name}</td>
                <td className="py-2.5 text-right">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatCurrency(item.purchase_price)}</td>
                <td className="py-2.5 text-right font-semibold">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total Amount</span><span className="font-bold">{formatCurrency(purchase.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(purchase.paid_amount)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-1.5">
              <span>Balance Due</span><span className={purchase.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(purchase.balance_due)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); payMut.mutate(payForm); }} className="space-y-4">
          <Input label="Amount" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))} required prefix="₹" />
          <Select label="Payment Method" value={payForm.payment_method} onChange={(e) => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
            <option value="">Select method</option>
            {paymentMethods.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <div className="flex justify-end">
            <Button type="submit" loading={payMut.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
