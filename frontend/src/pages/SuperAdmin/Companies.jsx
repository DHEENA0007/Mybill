import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, ToggleLeft, ToggleRight, Search, MapPin, Mail, Phone } from 'lucide-react';
import { getCompanies, createCompany, updateCompany, toggleCompanyActive } from '../../api/superadmin';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

export default function Companies() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '',
    country: 'India', pincode: '', gstin: '', pan: '', currency: 'INR',
    currency_symbol: '₹', financial_year_start: 4,
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-companies', search],
    queryFn: () => getCompanies({ search }).then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (d) => editItem ? updateCompany(editItem.id, d) : createCompany(d),
    onSuccess: () => {
      toast.success(editItem ? 'Company updated' : 'Company created');
      qc.invalidateQueries(['superadmin-companies']);
      qc.invalidateQueries(['superadmin-stats']);
      setFormOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.detail || e.response?.data?.name?.[0] || 'Failed'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => toggleCompanyActive(id),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries(['superadmin-companies']);
      qc.invalidateQueries(['superadmin-stats']);
    },
  });

  const companies = data?.results || data || [];

  const openCreate = () => {
    setEditItem(null);
    setForm({
      name: '', email: '', phone: '', address: '', city: '', state: '',
      country: 'India', pincode: '', gstin: '', pan: '', currency: 'INR',
      currency_symbol: '₹', financial_year_start: 4,
    });
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '',
      address: c.address || '', city: c.city || '', state: c.state || '',
      country: c.country || 'India', pincode: c.pincode || '',
      gstin: c.gstin || '', pan: c.pan || '', currency: c.currency || 'INR',
      currency_symbol: c.currency_symbol || '₹',
      financial_year_start: c.financial_year_start || 4,
    });
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Companies</h2>
          <p className="text-sm text-gray-500">Manage all tenant companies</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Company Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No companies found</p>
          <p className="text-sm text-gray-400 mt-1">Create your first company to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 ${
                company.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/30'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    company.is_active
                      ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100'
                      : 'bg-gray-100'
                  }`}>
                    <Building2 className={`w-5 h-5 ${company.is_active ? 'text-violet-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{company.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      company.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(company)}
                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleMut.mutate(company.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      company.is_active
                        ? 'text-emerald-500 hover:text-red-500 hover:bg-red-50'
                        : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
                    }`}
                    title={company.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {company.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-500">
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {(company.city || company.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{[company.city, company.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {company.gstin && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">GST</span>
                    <span className="font-mono text-xs">{company.gstin}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-gray-900">{company.admin_count || 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Admins</p>
                </div>
                <div className="w-px h-8 bg-gray-100" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-gray-900">{company.user_count || 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Users</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Company' : 'New Company'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input type="text" value={form.pincode} onChange={(e) => setForm(f => ({ ...f, pincode: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input type="text" value={form.gstin} onChange={(e) => setForm(f => ({ ...f, gstin: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input type="text" value={form.pan} onChange={(e) => setForm(f => ({ ...f, pan: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
              <input type="text" value={form.currency_symbol} onChange={(e) => setForm(f => ({ ...f, currency_symbol: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saveMut.isPending}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-60 flex items-center gap-2">
              {saveMut.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editItem ? 'Update' : 'Create'} Company
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
