import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getInvoice, updateInvoice } from '../../api/invoices';
import { getCustomers } from '../../api/customers';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function InvoiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id).then(r => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', {}],
    queryFn: () => getCustomers({ page_size: 200 }).then(r => r.data),
  });

  useEffect(() => {
    if (inv && !form) {
      setForm({
        customer: inv.customer != null ? String(inv.customer) : '',
        invoice_date: inv.invoice_date || '',
        discount_amount: inv.discount_amount ?? '0',
        notes: inv.notes || '',
      });
    }
  }, [inv, form]);

  const updateMut = useMutation({
    mutationFn: (data) => updateInvoice(id, data),
    onSuccess: () => {
      toast.success('Invoice updated');
      qc.invalidateQueries(['invoice', id]);
      qc.invalidateQueries(['invoices']);
      navigate(`/invoices/${id}`);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || e.response?.data?.detail || 'Failed to update invoice');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMut.mutate({
      customer: form.customer || null,
      invoice_date: form.invoice_date,
      discount_amount: parseFloat(form.discount_amount) || 0,
      notes: form.notes,
      is_tax_invoice: inv.is_tax_invoice,
      paid_amount: inv.paid_amount,
    });
  };

  if (isLoading || !form) return <PageLoader />;
  if (!inv) return <p className="text-gray-500">Invoice not found</p>;

  if (inv.status === 'cancelled') {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500">Cannot edit a cancelled invoice.</p>
        <Button variant="secondary" onClick={() => navigate(`/invoices/${id}`)}>Go Back</Button>
      </div>
    );
  }

  const estimatedTotal = Math.max(
    0,
    parseFloat(inv.subtotal || 0) + parseFloat(inv.tax_amount || 0) - (parseFloat(form.discount_amount) || 0)
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/invoices/${id}`)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-500 font-mono">{inv.invoice_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Invoice Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <select
                value={form.customer}
                onChange={(e) => setForm(f => ({ ...f, customer: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Walk-in Customer</option>
                {(customersData?.results || []).map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}{c.phone ? ` (${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Invoice Date"
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm(f => ({ ...f, invoice_date: e.target.value }))}
              required
            />
            <Input
              label="Discount Amount"
              type="number"
              step="0.01"
              min="0"
              value={form.discount_amount}
              onChange={(e) => setForm(f => ({ ...f, discount_amount: e.target.value }))}
              prefix="₹"
              className="no-spinner"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">Items</h3>
          <div className="divide-y divide-gray-50">
            {(inv.items || []).map((item, i) => (
              <div key={i} className="flex justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium text-gray-800">{item.product_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">× {item.quantity} @ {formatCurrency(item.unit_price)}</span>
                </div>
                <span className="font-semibold text-gray-800">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(inv.subtotal)}</span>
            </div>
            {inv.is_tax_invoice && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span><span>{formatCurrency(inv.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Discount</span><span className="text-red-500">-{formatCurrency(parseFloat(form.discount_amount) || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
              <span>Estimated Total</span>
              <span className="text-indigo-600">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(`/invoices/${id}`)}>Cancel</Button>
          <Button type="submit" loading={updateMut.isPending} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
