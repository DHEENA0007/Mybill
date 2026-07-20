import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Save, Trash } from 'lucide-react';
import { getInvoice, updateInvoice, deleteInvoice } from '../../api/invoices';
import { getProducts } from '../../api/products';
import { getCustomers } from '../../api/customers';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function InvoiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const searchRef = useRef(null);

  const [initialized, setInitialized] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [isTaxInvoice, setIsTaxInvoice] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id).then(r => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', {}],
    queryFn: () => getCustomers({ page_size: 200 }).then(r => r.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { search: productSearch }],
    queryFn: () => getProducts({ search: productSearch, page_size: 10 }).then(r => r.data),
    enabled: productSearch.length > 0,
  });

  useEffect(() => {
    if (inv && !initialized) {
      setCart((inv.items || []).map(item => ({
        product: item.product,
        name: item.product_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        tax_percentage: parseFloat(item.tax_rate) || 0,
      })));
      setCustomer(inv.customer != null ? String(inv.customer) : '');
      setInvoiceDate(inv.invoice_date || '');
      setIsTaxInvoice(inv.is_tax_invoice || false);
      setDiscountAmount(inv.discount_amount ?? '0');
      setPaidAmount(inv.paid_amount ?? '0');
      setNotes(inv.notes || '');
      setInitialized(true);
    }
  }, [inv, initialized]);

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.product === product.id);
      if (existing) return c.map(i => i.product === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, {
        product: product.id,
        name: product.name,
        quantity: 1,
        unit_price: parseFloat(product.selling_price),
        tax_percentage: parseFloat(product.tax_percentage) || 0,
      }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
    searchRef.current?.focus();
  };

  const updateCart = (idx, key, val) => setCart(c => c.map((i, j) => j === idx ? { ...i, [key]: val } : i));
  const removeFromCart = (idx) => setCart(c => c.filter((_, j) => j !== idx));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = isTaxInvoice ? cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_percentage / 100), 0) : 0;
  const total = Math.max(0, subtotal + taxAmount - (parseFloat(discountAmount) || 0));
  const balance = total - (parseFloat(paidAmount) || 0);

  const updateMut = useMutation({
    mutationFn: (data) => updateInvoice(id, data),
    onSuccess: () => {
      toast.success('Invoice updated');
      qc.invalidateQueries(['invoice', id]);
      qc.invalidateQueries(['invoices']);
      navigate(`/invoices/${id}`);
    },
    onError: (e) => {
      const err = e.response?.data;
      let msg = 'Failed to update invoice';
      if (err?.error) msg = err.error;
      else if (err?.detail) msg = err.detail;
      else if (Array.isArray(err?.items)) {
        const itemErr = err.items.find(i => i && Object.keys(i).length > 0);
        if (itemErr?.non_field_errors) msg = itemErr.non_field_errors[0];
      }
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      qc.invalidateQueries(['invoices']);
      navigate('/invoices');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete invoice'),
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!cart.length) { toast.error('Add at least one product'); return; }
    updateMut.mutate({
      customer: customer || null,
      invoice_date: invoiceDate,
      is_tax_invoice: isTaxInvoice,
      discount_amount: parseFloat(discountAmount) || 0,
      paid_amount: parseFloat(paidAmount) || 0,
      notes,
      items: cart.map(i => ({
        product: i.product,
        quantity: parseInt(i.quantity),
        unit_price: parseFloat(i.unit_price),
        tax_rate: isTaxInvoice ? i.tax_percentage : 0,
      })),
    });
  };

  if (isLoading || !initialized) return <PageLoader />;
  if (!inv) return <p className="text-gray-500">Invoice not found</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={() => navigate(`/invoices/${id}`)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-500 font-mono">{inv.invoice_number}</p>
        </div>
        <Button variant="danger" size="sm" icon={<Trash className="w-4 h-4" />} onClick={() => setShowDeleteConfirm(true)}>
          Delete Bill
        </Button>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Product Search & Cart */}
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                  placeholder="Search products to add..."
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showProductDropdown && productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 max-h-64 overflow-y-auto">
                    {(productsData?.results || []).map((p) => (
                      <button key={p.id} type="button" onMouseDown={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.sku} · Stock: {p.current_stock}</p>
                        </div>
                        <span className="font-semibold text-indigo-600">{formatCurrency(p.selling_price)}</span>
                      </button>
                    ))}
                    {!(productsData?.results?.length) && <p className="px-4 py-3 text-sm text-gray-400">No products found</p>}
                  </div>
                )}
              </div>
            </Card>

            <Card padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Items ({cart.length})</h3>
                {cart.length > 0 && (
                  <button type="button" onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Search and add products above</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-50">
                    <span className="col-span-4">Product</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-3 text-right">Price</span>
                    <span className="col-span-2 text-right">Total</span>
                    <span className="col-span-1" />
                  </div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-gray-50 hover:bg-gray-50/50">
                      <div className="col-span-4">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button type="button"
                            onClick={() => item.quantity > 1 ? updateCart(idx, 'quantity', item.quantity - 1) : removeFromCart(idx)}
                            className="px-2 py-1 text-gray-500 hover:text-indigo-600 text-sm font-bold">−</button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCart(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-10 text-center text-sm font-medium border-0 focus:outline-none no-spinner bg-transparent"
                          />
                          <button type="button"
                            onClick={() => updateCart(idx, 'quantity', item.quantity + 1)}
                            className="px-2 py-1 text-gray-500 hover:text-indigo-600 text-sm font-bold">+</button>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <input type="number" step="0.01" value={item.unit_price}
                          onChange={(e) => updateCart(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 no-spinner" />
                      </div>
                      <div className="col-span-2 text-right font-semibold text-sm text-gray-800">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                      <button type="button" onClick={() => removeFromCart(idx)}
                        className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right: Details & Summary */}
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Customer</h3>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Walk-in Customer</option>
                {(customersData?.results || []).map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  <input type="checkbox" checked={isTaxInvoice} onChange={(e) => setIsTaxInvoice(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Tax Invoice</span>
                </label>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {isTaxInvoice && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (Auto)</span><span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-600">
                  <span>Discount</span>
                  <input type="number" step="0.01" min="0" value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 no-spinner" placeholder="0.00" />
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span className="text-indigo-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Payment</h3>
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 no-spinner" />
                </div>
                {parseFloat(paidAmount) > 0 && balance > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    Balance: {formatCurrency(balance)} (credit)
                  </div>
                )}
                {parseFloat(paidAmount) > total && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                    Change: {formatCurrency(-balance)}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional notes..." />
            </div>

            <Button type="submit" loading={updateMut.isPending} className="w-full justify-center py-3 text-base" icon={<Save className="w-5 h-5" />}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirm Modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Invoice" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Permanently delete <span className="font-semibold text-gray-900">{inv.invoice_number}</span>?
            Stock will be restored. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
              Delete Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
