import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, MapPin, FileText, CreditCard, Globe, Calendar } from 'lucide-react';
import { getCompanySetup, updateCompanySetup } from '../../api/superadmin';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const sections = [
  { id: 'basic', label: 'Basic Info', icon: Building2 },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'tax', label: 'Tax & Legal', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function CompanySetup() {
  const [activeSection, setActiveSection] = useState('basic');
  const [form, setForm] = useState({});
  const qc = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company-setup'],
    queryFn: () => getCompanySetup().then(r => r.data),
  });

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  const saveMut = useMutation({
    mutationFn: (d) => updateCompanySetup(d),
    onSuccess: (res) => {
      toast.success('Company settings saved');
      qc.invalidateQueries(['company-setup']);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to save'),
  });

  if (isLoading) return <PageLoader />;

  const handleSave = (e) => {
    e.preventDefault();
    saveMut.mutate(form);
  };

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Company Setup
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Configure your company details and billing preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-60"
        >
          {saveMut.isPending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSave}>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

          {/* Basic Info */}
          {activeSection === 'basic' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                  <p className="text-xs text-gray-500">Your company's core details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                  <input type="text" value={form.name || ''} onChange={(e) => set('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input type="text" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {activeSection === 'address' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Address Details</h3>
                  <p className="text-xs text-gray-500">Your company's physical address</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea value={form.address || ''} onChange={(e) => set('address', e.target.value)} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input type="text" value={form.city || ''} onChange={(e) => set('city', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <input type="text" value={form.state || ''} onChange={(e) => set('state', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                  <input type="text" value={form.pincode || ''} onChange={(e) => set('pincode', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <input type="text" value={form.country || ''} onChange={(e) => set('country', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* Tax & Legal */}
          {activeSection === 'tax' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Tax & Legal</h3>
                  <p className="text-xs text-gray-500">GSTIN, PAN and other legal details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
                  <input type="text" value={form.gstin || ''} onChange={(e) => set('gstin', e.target.value)}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">PAN</label>
                  <input type="text" value={form.pan || ''} onChange={(e) => set('pan', e.target.value)}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeSection === 'billing' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Billing Settings</h3>
                  <p className="text-xs text-gray-500">Currency and financial year configuration</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                  <select value={form.currency || 'INR'} onChange={(e) => set('currency', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency Symbol</label>
                  <input type="text" value={form.currency_symbol || ''} onChange={(e) => set('currency_symbol', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Financial Year Starts</label>
                  <select value={form.financial_year_start || 4} onChange={(e) => set('financial_year_start', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Invoice Numbering</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Invoice Prefix</label>
                      <input type="text" value={form.gst_invoice_prefix || ''} onChange={(e) => set('gst_invoice_prefix', e.target.value)}
                        placeholder="e.g. GST-"
                        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Non-Tax Invoice Prefix</label>
                      <input type="text" value={form.non_gst_invoice_prefix || ''} onChange={(e) => set('non_gst_invoice_prefix', e.target.value)}
                        placeholder="e.g. INV-"
                        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Number</label>
                      <input type="number" value={form.invoice_start_number || 1} onChange={(e) => set('invoice_start_number', parseInt(e.target.value))}
                        min="1"
                        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.reset_invoice_number_yearly ?? true} onChange={(e) => set('reset_invoice_number_yearly', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <span className="text-sm text-gray-700">Reset number yearly (on Financial Year start)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-60"
          >
            {saveMut.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
