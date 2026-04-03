import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, UserPlus, MoreHorizontal, Filter, Edit2, Trash2, UserCog, Mail,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import { SkeletonTable, ErrorState } from '../components/ui/Skeleton';
import { toast } from '../components/ui/Toast';
import { ROLE_LABELS, ROLE_COLORS, formatDate } from '../lib/utils';
import { useUsers, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useSendInvitation } from '../hooks/useInvitations';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../lib/permissions';
import { PermissionGuard } from '../components/ui/PermissionGuard';
import type { User, UserRole, UserStatus } from '../types';

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  role: z.string().min(1, 'Role required'),
});
type FormData = z.infer<typeof schema>;

const STATUS_STYLES: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-inset text-dim',
  pending: 'bg-yellow-100 text-yellow-700',
};

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'project_lead', label: 'Project Lead' },
  { value: 'designer', label: 'Designer' },
  { value: 'developer', label: 'Developer' },
  { value: 'qa', label: 'QA' },
];
const ROLE_FORM_OPTIONS = ROLE_OPTIONS.slice(1);

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();
  const { data: users = [], isLoading, error, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const sendInvite = useSendInvitation();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openAdd = () => {
    reset({ full_name: '', email: '', role: '' });
    setAddModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setValue('full_name', user.full_name);
    setValue('email', user.email);
    setValue('role', user.role);
  };

  const onSubmit = async (data: FormData) => {
    if (editUser) {
      await updateUser.mutateAsync({
        id: editUser.id,
        updates: { full_name: data.full_name, email: data.email, role: data.role as UserRole },
      });
      setEditUser(null);
    } else {
      // Send invitation for new users
      await sendInvite.mutateAsync({
        email: data.email,
        role: data.role as UserRole,
        invitedBy: currentUser?.id ?? '1',
      });
      setAddModalOpen(false);
    }
    reset();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const isSubmitting = updateUser.isPending || sendInvite.isPending;

  if (error) {
    return <ErrorState message="Failed to load users" onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-hi">User Management</h1>
          <p className="text-sm text-dim mt-0.5">Manage users, roles, and permissions</p>
        </div>
        <PermissionGuard permission="manage_users">
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={openAdd}>
            Add User
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-base shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search users..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={ROLE_OPTIONS}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-base shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-subtle">
          <h3 className="font-semibold text-hi">All Users ({filtered.length})</h3>
          <p className="text-xs text-dim mt-0.5">A list of all users in your organization</p>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={6} cols={5} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-subtle">
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-inset/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} name={user.full_name} size="md" />
                        <div>
                          <p className="text-sm font-medium text-hi">{user.full_name}</p>
                          <p className="text-xs text-dim">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={STATUS_STYLES[user.status]}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-dim">{formatDate(user.joined_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Dropdown
                        trigger={
                          <button className="p-1.5 rounded-lg text-weak hover:text-dim hover:bg-inset transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        }
                        items={[
                          ...(can('manage_users') ? [
                            { label: 'Edit User', icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => openEdit(user) },
                            { label: 'Change Role', icon: <UserCog className="h-3.5 w-3.5" />, onClick: () => openEdit(user), disabled: !can('manage_roles') },
                          ] : []),
                          { label: 'Send Email', icon: <Mail className="h-3.5 w-3.5" />, onClick: () => toast.info('Email feature coming soon') },
                          ...(can('manage_users') ? [
                            { separator: true as const },
                            {
                              label: 'Remove User', icon: <Trash2 className="h-3.5 w-3.5" />,
                              onClick: () => setDeleteTarget(user), danger: true as const,
                              disabled: user.id === currentUser?.id,
                            },
                          ] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-weak">
                      <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={addModalOpen || !!editUser}
        onClose={() => { setAddModalOpen(false); setEditUser(null); reset(); }}
        title={editUser ? 'Edit User' : 'Add New User'}
        description={editUser ? 'Update user details' : 'Invite a new user to your organization'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Email" type="email" placeholder="john@company.com" error={errors.email?.message} {...register('email')} />
          <Select label="Role" options={ROLE_FORM_OPTIONS} placeholder="Select a role" error={errors.role?.message} {...register('role')} />
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setAddModalOpen(false); setEditUser(null); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editUser ? 'Save Changes' : 'Send Invitation'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove User"
        description={`Are you sure you want to remove ${deleteTarget?.full_name}? This cannot be undone.`}
        size="sm"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteUser.isPending}>Remove</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
