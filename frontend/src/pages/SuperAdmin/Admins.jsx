import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Edit, Search, Building2, Mail, Phone, Shield, FileText, Wallet, Monitor } from 'lucide-react';
import { getCompanyAdmins, createCompanyAdmin, updateCompanyAdmin, getCompanies } from '../../api/superadmin';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

const AVAILABLE_PORTALS = [
  {
    key: 'billing',
    label: 'Billing Portal',
    description: 'Access to inventory, sales, purchases, invoicing, and reports',
    icon: FileText,
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
  },
  {
    key: 'accounts',
    label: 'Accounts Portal',
    description: 'Access to incomes, expenses, financial reports, and categories',
    icon: Wallet,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
];

export default function Admins() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    phone: '', password: '', company: '', is_active: true,
    allowed_portals: ['billing', 'accounts'],
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-admins', search, filterCompany],
    queryFn: () => getCompanyAdmins({ search, company: filterCompany || undefined }).then(r => r.data),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['superadmin-companies-list'],
    queryFn: () => getCompanies().then(r => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (d) => {
      const payload = { ...d };
      if (editItem && !payload.password) delete payload.password;
      return editItem ? updateCompanyAdmin(editItem.id, payload) : createCompanyAdmin(payload);
    },
    onSuccess: () => {
      toast.success(editItem ? 'Admin updated' : 'Admin created');
      qc.invalidateQueries(['superadmin-admins']);
      qc.invalidateQueries(['superadmin-stats']);
      setFormOpen(false);
    },
    onError: (e) => {
      const data = e.response?.data;
      const msg = data?.detail || data?.username?.[0] || data?.email?.[0] || 'Failed';
      toast.error(msg);
    },
  });

  const admins = data?.results || data || [];
  const companies = companiesData?.results || companiesData || [];

  const openCreate = () => {
    setEditItem(null);
    setForm({
      username: '', email: '', first_name: '', last_name: '',
      phone: '', password: '', company: '', is_active: true,
      allowed_portals: ['billing', 'accounts'],
    });
    setFormOpen(true);
  };

  const openEdit = (a) => {
    setEditItem(a);
    setForm({
      username: a.username || '', email: a.email || '',
      first_name: a.first_name || '', last_name: a.last_name || '',
      phone: a.phone || '', password: '',
      company: a.company || '', is_active: a.is_active,
      allowed_portals: a.allowed_portals?.length ? a.allowed_portals : ['billing', 'accounts'],
    });
    setFormOpen(true);
  };

  const togglePortal = (portalKey) => {
    setForm(f => {
      const current = f.allowed_portals || [];
      if (current.includes(portalKey)) {
        // Don't allow removing the last portal
        if (current.length <= 1) {
          toast.error('At least one portal must be selected');
          return f;
        }
        return { ...f, allowed_portals: current.filter(k => k !== portalKey) };
      } else {
        return { ...f, allowed_portals: [...current, portalKey] };
      }
    });
  };

  const getPortalInfo = (key) => AVAILABLE_PORTALS.find(p => p.key === key);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company Admins</h2>
          <p className="text-sm text-gray-500">Manage administrators and their portal access</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No admins found</p>
            <p className="text-sm text-gray-400 mt-1">Create an admin and assign them to a company</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Access</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{admin.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{admin.username}</p>
                          <p className="text-xs text-gray-500">{admin.first_name} {admin.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-violet-500" />
                        <span className="text-sm text-gray-700 font-medium">{admin.company_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(admin.allowed_portals?.length ? admin.allowed_portals : ['billing', 'accounts']).map(portalKey => {
                          const portal = getPortalInfo(portalKey);
                          if (!portal) return null;
                          const Icon = portal.icon;
                          return (
                            <span
                              key={portalKey}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${portal.badgeBg} ${portal.badgeText}`}
                            >
                              <Icon className="w-3 h-3" />
                              {portal.label.replace(' Portal', '')}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {admin.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3" /> {admin.email}
                          </div>
                        )}
                        {admin.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3" /> {admin.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openEdit(admin)}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="Edit Admin"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Admin' : 'New Company Admin'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input type="text" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{editItem ? 'New Password' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required={!editItem}
                placeholder={editItem ? 'Leave blank to keep' : ''} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Company *</label>
              <select value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" required>
                <option value="">Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Portal Access Section */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-800">Portal Access</h3>
              <span className="text-xs text-gray-400 ml-1">— Select which portals this admin can access</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_PORTALS.map((portal) => {
                const isSelected = (form.allowed_portals || []).includes(portal.key);
                const Icon = portal.icon;
                return (
                  <button
                    type="button"
                    key={portal.key}
                    onClick={() => togglePortal(portal.key)}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? `${portal.borderColor} ${portal.bgColor} shadow-sm`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Toggle indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${portal.color} border-transparent`
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-r ${portal.color} flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className={`text-sm font-semibold ${isSelected ? portal.textColor : 'text-gray-700'}`}>
                          {portal.label}
                        </span>
                      </div>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isSelected ? portal.textColor + '/70' : 'text-gray-400'}`}>
                        {portal.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {form.allowed_portals?.length === 0 && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> At least one portal must be selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saveMut.isPending || !form.allowed_portals?.length}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-60 flex items-center gap-2">
              {saveMut.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editItem ? 'Update' : 'Create'} Admin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
