import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Save, UserPlus } from 'lucide-react';
import { getProducts } from '../../api/products';
import { getCustomers, createCustomer } from '../../api/customers';
import { createInvoice } from '../../api/invoices';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import useChoices from '../../hooks/useChoices';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function BillingScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const searchRef = useRef(null);
  const { paymentMethods } = useChoices();

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products', { search: productSearch }],
    queryFn: () => getProducts({ search: productSearch, page_size: 10 }).then(r => r.data),
    enabled: productSearch.length > 0,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', {}],
    queryFn: () => getCustomers({ page_size: 200 }).then(r => r.data),
  });

  const addCustMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: (r) => { toast.success('Customer added'); setCustomer(String(r.data.id)); qc.invalidateQueries(['customers']); setNewCustOpen(false); },
  });

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.product === product.id);
      if (existing) return c.map(i => i.product === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { product: product.id, name: product.name, selling_price: product.selling_price, quantity: 1, unit_price: product.selling_price }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
    searchRef.current?.focus();
  };

  const updateCart = (idx, key, val) => setCart(c => c.map((i, j) => j === idx ? { ...i, [key]: val } : i));
  const removeFromCart = (idx) => setCart(c => c.filter((_, j) => j !== idx));

  const subtotal = cart.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const balance = total - (parseFloat(paidAmount) || 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!cart.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      const data = {
        customer: customer || null,
        tax_rate: taxRate,
        paid_amount: parseFloat(paidAmount) || 0,
        payment_method: paymentMethod,
        notes,
        items: cart.map(i => ({ product: i.product, quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) })),
      };
      const res = await createInvoice(data);
      toast.success(`Invoice ${res.data.invoice_number} created!`);
      qc.invalidateQueries(['invoices']);
      navigate(`/invoices/${res.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
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
              placeholder="Search products to add... (type product name)"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {showProductDropdown && productSearch && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 max-h-64 overflow-y-auto">
                {(productsData?.results || []).map((p) => (
                  <button key={p.id} type="button" onClick={() => addToCart(p)}
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
            <h3 className="font-semibold text-gray-800">Cart ({cart.length} items)</h3>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>}
          </div>
          {cart.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Search and add products above</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-50">
                <span className="col-span-4">Product</span><span className="col-span-2 text-center">Qty</span><span className="col-span-3 text-right">Price</span><span className="col-span-2 text-right">Total</span><span className="col-span-1" />
              </div>
              {cart.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-gray-50 hover:bg-gray-50/50">
                  <div className="col-span-4">
                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button type="button" onClick={() => item.quantity > 1 ? updateCart(idx, 'quantity', item.quantity - 1) : removeFromCart(idx)} className="px-2 py-1 text-gray-500 hover:text-indigo-600 text-sm font-bold">-</button>
                      <span className="px-3 py-1 text-sm font-medium min-w-8 text-center">{item.quantity}</span>
                      <button type="button" onClick={() => updateCart(idx, 'quantity', item.quantity + 1)} className="px-2 py-1 text-gray-500 hover:text-indigo-600 text-sm font-bold">+</button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateCart(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2 text-right font-semibold text-sm text-gray-800">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  <button type="button" onClick={() => removeFromCart(idx)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right: Summary & Payment */}
      <div className="space-y-4">
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">Customer</h3>
          <div className="flex gap-2">
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Walk-in Customer</option>
              {(customersData?.results || []).map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
            <button type="button" onClick={() => setNewCustOpen(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors" title="Add new customer">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Tax</span>
              <div className="flex items-center gap-1">
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-14 text-right border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span className="text-xs text-gray-400">%</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Total</span><span className="text-indigo-600">{formatCurrency(total)}</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">Payment</h3>
          <div className="space-y-3">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select payment method</option>
              {paymentMethods.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="credit">Credit (Pay Later)</option>
            </select>
            {paymentMethod !== 'credit' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={formatCurrency(total).replace('₹','')}
                  className="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            {paidAmount && parseFloat(paidAmount) < total && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                Balance: {formatCurrency(balance)} will be added to credit
              </div>
            )}
            {paidAmount && parseFloat(paidAmount) > total && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                Change: {formatCurrency(-balance)}
              </div>
            )}
          </div>
        </Card>

        <Button onClick={handleSave} loading={saving} className="w-full justify-center py-3 text-base" icon={<Save className="w-5 h-5" />}>
          Create Invoice
        </Button>
      </div>

      <Modal open={newCustOpen} onClose={() => setNewCustOpen(false)} title="Quick Add Customer" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); addCustMut.mutate(newCustForm); }} className="space-y-3">
          <Input label="Name" value={newCustForm.name} onChange={(e) => setNewCustForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Phone" value={newCustForm.phone} onChange={(e) => setNewCustForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={newCustForm.email} onChange={(e) => setNewCustForm(f => ({ ...f, email: e.target.value }))} />
          <div className="flex justify-end"><Button type="submit" loading={addCustMut.isPending}>Add Customer</Button></div>
        </form>
      </Modal>
    </div>
  );
}
