import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit } from 'lucide-react';
import { getUsers, createUser, updateUser, getRoles, assignRole } from '../../api/admin';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import usePermission from '../../hooks/usePermission';

export default function UserManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', is_active: true, role_id: '' });
  const qc = useQueryClient();
  const { can } = usePermission();

  const { data: usersData, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => getUsers().then(r => r.data) });
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => getRoles().then(r => r.data) });

  const saveMut = useMutation({
    mutationFn: (d) => editItem ? updateUser(editItem.id, d) : createUser(d),
    onSuccess: () => { toast.success(editItem ? 'Updated' : 'User created'); qc.invalidateQueries(['users']); setFormOpen(false); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  });

  const columns = [
    { key: 'username', label: 'Username', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles', render: (v) => (
      <div className="flex gap-1 flex-wrap">
        {(v || []).map(r => <Badge key={r} color="indigo">{r}</Badge>)}
        {!(v?.length) && <span className="text-gray-400 text-xs">No role</span>}
      </div>
    )},
    { key: 'is_active', label: 'Status', render: (v) => <Badge color={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: 'date_joined', label: 'Joined', render: (v) => formatDate(v) },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex gap-1">
        {can('users.manage') && <button onClick={() => { 
          // Find the role_id from the user's role list (if any). Since roles is a list of strings, 
          // we need to find the matching role object from rolesData to get its ID.
          let currentRoleId = '';
          if (row.roles && row.roles.length > 0 && rolesData) {
             const r = (rolesData?.results || rolesData || []).find(role => role.name === row.roles[0]);
             if (r) currentRoleId = r.id;
          }
          setEditItem(row); 
          setForm({ username: row.username, email: row.email, password: '', is_active: row.is_active, role_id: currentRoleId }); 
          setFormOpen(true); 
        }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can('users.manage') && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditItem(null); setForm({ username: '', email: '', password: '', is_active: true, role_id: '' }); setFormOpen(true); }}>Add User</Button>
        )}
      </div>
      <Card padding={false}>
        <Table columns={columns} data={usersData?.results || usersData || []} loading={isLoading} emptyMessage="No users found" />
      </Card>
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const dataToSubmit = { ...form };
          if (!dataToSubmit.role_id) delete dataToSubmit.role_id;
          saveMut.mutate(dataToSubmit); 
        }} className="space-y-4">
          <Input label="Username" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label={editItem ? 'New Password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required={!editItem} />
          <Select label="Status" value={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
            <option value="true">Active</option><option value="false">Inactive</option>
          </Select>
          <Select label="Role (Optional)" value={form.role_id} onChange={(e) => setForm(f => ({ ...f, role_id: e.target.value }))}>
            <option value="">No Role</option>
            {(rolesData?.results || rolesData || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <div className="flex justify-end"><Button type="submit" loading={saveMut.isPending}>Save User</Button></div>
        </form>
      </Modal>
    </div>
  );
}
