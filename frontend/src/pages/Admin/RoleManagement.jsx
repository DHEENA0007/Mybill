import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, ChevronDown, ChevronUp, Users, CheckSquare, Square } from 'lucide-react';
import { getRoles, createRole, updateRole, deleteRole, getPermissions, assignPermissions } from '../../api/admin';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Badge from '../../components/UI/Badge';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
  inventory: 'Inventory', purchases: 'Purchases', sales: 'Sales',
  returns: 'Returns', financial: 'Financial', reports: 'Reports', users: 'Users',
};

const CATEGORY_COLORS = {
  inventory: 'bg-blue-50 border-blue-200 text-blue-700',
  purchases: 'bg-amber-50 border-amber-200 text-amber-700',
  sales: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  returns: 'bg-orange-50 border-orange-200 text-orange-700',
  financial: 'bg-purple-50 border-purple-200 text-purple-700',
  reports: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  users: 'bg-red-50 border-red-200 text-red-700',
};

export default function RoleManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const qc = useQueryClient();

  const { data: rolesData, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => getRoles().then(r => r.data) });
  const { data: permsData } = useQuery({ queryKey: ['permissions'], queryFn: () => getPermissions().then(r => r.data) });

  const saveMut = useMutation({
    mutationFn: (d) => editItem ? updateRole(editItem.id, d) : createRole(d),
    onSuccess: () => { toast.success(editItem ? 'Role updated' : 'Role created'); qc.invalidateQueries(['roles']); setFormOpen(false); },
    onError: (e) => toast.error(e.response?.data?.name?.[0] || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries(['roles']); setDeleteId(null); },
  });

  const assignMut = useMutation({
    mutationFn: ({ roleId, data }) => assignPermissions(roleId, data),
    onSuccess: () => { toast.success('Permissions saved'); qc.invalidateQueries(['roles']); setPermOpen(false); },
  });

  const roles = Array.isArray(rolesData) ? rolesData : (rolesData?.results || []);
  const permissions = Array.isArray(permsData) ? permsData : (permsData?.results || []);

  const permsByCategory = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const openCreate = () => { setEditItem(null); setForm({ name: '', description: '' }); setFormOpen(true); };
  const openEdit = (role) => { setEditItem(role); setForm({ name: role.name, description: role.description || '' }); setFormOpen(true); };
  const openPermissions = (role) => { setSelectedRole(role); setSelectedPerms(role.permissions?.map(p => p.id) || []); setPermOpen(true); };

  const togglePerm = (id) => setSelectedPerms(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleCategory = (cat) => {
    const ids = (permsByCategory[cat] || []).map(p => p.id);
    const allSel = ids.every(id => selectedPerms.includes(id));
    setSelectedPerms(s => allSel ? s.filter(id => !ids.includes(id)) : [...new Set([...s, ...ids])]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Roles & Permissions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create roles and assign fine-grained permissions to each</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Create Role</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading roles…</div>
      ) : !roles.length ? (
        <Card>
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No roles yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first role to control access</p>
            <div className="mt-4"><Button onClick={openCreate}>Create Role</Button></div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {roles.map(role => {
            const isExpanded = expandedRole === role.id;
            const permCount = role.permissions?.length || 0;
            const byCategory = (role.permissions || []).reduce((acc, p) => {
              if (!acc[p.category]) acc[p.category] = [];
              acc[p.category].push(p);
              return acc;
            }, {});

            return (
              <Card key={role.id} padding={false}>
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <Badge color="indigo">{permCount} permissions</Badge>
                      {role.user_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />{role.user_count} user{role.user_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {role.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{role.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openPermissions(role)}
                      className="text-xs px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors font-medium">
                      Edit Permissions
                    </button>
                    <button onClick={() => openEdit(role)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(role.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                    {permCount === 0 ? (
                      <p className="text-sm text-gray-400 italic">No permissions assigned. Click "Edit Permissions" to configure.</p>
                    ) : (
                      <div className="flex flex-wrap gap-6">
                        {Object.entries(byCategory).map(([cat, perms]) => (
                          <div key={cat}>
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border inline-block mb-2 ${CATEGORY_COLORS[cat] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                            <div className="flex flex-col gap-1">
                              {perms.map(p => (
                                <span key={p.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Role' : 'Create Role'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
          <Input label="Role Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Cashier, Store Manager" required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this role's responsibilities"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMut.isPending}>{editItem ? 'Save Changes' : 'Create Role'}</Button>
          </div>
        </form>
      </Modal>

      {/* Permission Editor Modal */}
      <Modal open={permOpen} onClose={() => setPermOpen(false)} title={`Permissions — ${selectedRole?.name}`} size="xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{selectedPerms.length}</span> of {permissions.length} permissions selected
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedPerms(permissions.map(p => p.id))} className="text-xs text-indigo-600 hover:underline font-medium">Select All</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setSelectedPerms([])} className="text-xs text-gray-500 hover:underline">Clear All</button>
            </div>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {Object.entries(permsByCategory).map(([cat, perms]) => {
              const catIds = perms.map(p => p.id);
              const allSel = catIds.every(id => selectedPerms.includes(id));
              const someSel = catIds.some(id => selectedPerms.includes(id));
              const colorClass = CATEGORY_COLORS[cat] || 'bg-gray-50 border-gray-200 text-gray-600';
              const selCount = catIds.filter(id => selectedPerms.includes(id)).length;

              return (
                <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-2.5 cursor-pointer ${colorClass}`}
                    onClick={() => toggleCategory(cat)}>
                    <span className="text-xs font-bold uppercase tracking-wide">{CATEGORY_LABELS[cat] || cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-75">{selCount}/{catIds.length}</span>
                      {allSel ? <CheckSquare className="w-4 h-4" /> : someSel ? <Square className="w-4 h-4 opacity-60" /> : <Square className="w-4 h-4 opacity-40" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 bg-white divide-x divide-gray-50">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50">
                        <input type="checkbox" checked={selectedPerms.includes(perm.id)} onChange={() => togglePerm(perm.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-800 font-medium leading-tight">{perm.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{perm.codename}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setPermOpen(false)}>Cancel</Button>
            <Button onClick={() => assignMut.mutate({ roleId: selectedRole?.id, data: { permission_ids: selectedPerms } })} loading={assignMut.isPending}>
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending} title="Delete Role"
        message="Delete this role? All users assigned this role will lose its permissions immediately." />
    </div>
  );
}
