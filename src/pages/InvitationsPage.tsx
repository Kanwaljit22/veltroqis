import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Clock, CheckCircle, XCircle, Send, Copy, RotateCcw, Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { StatCard } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { SkeletonTable, ErrorState } from '../components/ui/Skeleton';
import { ROLE_LABELS, ROLE_COLORS, formatDateShort, cn } from '../lib/utils';
import {
  useInvitations, useSendInvitation, useResendInvitation, useRevokeInvitation,
} from '../hooks/useInvitations';
import { useNewItemHighlight } from '../hooks/useNewItemHighlight';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../lib/permissions';
import { PermissionGuard } from '../components/ui/PermissionGuard';
import type { Invitation, InvitationStatus, UserRole } from '../types';

const schema = z.object({
  email: z.string().email('Invalid email'),
  role: z.string().min(1, 'Role required'),
  message: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_CONFIG: Record<
  InvitationStatus,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-inset text-dim', icon: XCircle },
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_lead', label: 'Project Lead' },
  { value: 'designer', label: 'Designer' },
  { value: 'developer', label: 'Developer' },
  { value: 'qa', label: 'QA' },
];

export const InvitationsPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();

  const { data: invitations = [], isLoading, error, refetch } = useInvitations();
  const highlightedIds = useNewItemHighlight(invitations, !isLoading);
  const sendInvitation = useSendInvitation();
  const resendInvitation = useResendInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const pending = invitations.filter((i) => i.status === 'pending');
  const accepted = invitations.filter((i) => i.status === 'accepted');
  const expired = invitations.filter((i) => i.status === 'expired');

  const tabs = [
    { id: 'all', label: 'All', count: invitations.length },
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'accepted', label: 'Accepted', count: accepted.length },
    { id: 'expired', label: 'Expired', count: expired.length },
  ];

  const filtered =
    activeTab === 'all' ? invitations : invitations.filter((i) => i.status === activeTab);

  const onSubmit = async (data: FormData) => {
    await sendInvitation.mutateAsync({
      email: data.email,
      role: data.role as UserRole,
      message: data.message,
      invitedBy: currentUser?.id ?? '',
    });
    setModalOpen(false);
    reset();
  };

  const handleCopyLink = (inv: Invitation) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/accept-invite?token=${inv.token}`
    );
    toast.success('Link copied to clipboard');
  };

  if (error) {
    return <ErrorState message="Failed to load invitations" onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-hi">Invitations</h1>
          <p className="text-sm text-dim mt-0.5">Manage user invitations and track their status</p>
        </div>
        <PermissionGuard permission="send_invitations">
          <Button icon={<Send className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Send Invitation
          </Button>
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Invites" value={invitations.length}
          icon={<Mail className="h-5 w-5 text-blue-500" />} iconBg="bg-blue-50" />
        <StatCard title="Pending" value={pending.length}
          icon={<Clock className="h-5 w-5 text-yellow-500" />} iconBg="bg-yellow-50" />
        <StatCard title="Accepted" value={accepted.length}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />} iconBg="bg-green-50" />
        <StatCard title="Expired" value={expired.length}
          icon={<XCircle className="h-5 w-5 text-red-500" />} iconBg="bg-red-50" />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-base shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-subtle">
          <h3 className="font-semibold text-hi mb-1">All Invitations</h3>
          <p className="text-xs text-dim mb-3">View and manage all sent invitations</p>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={4} cols={5} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-subtle">
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Sent</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-xs font-medium text-dim uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filtered.map((inv) => {
                  const statusConfig = STATUS_CONFIG[inv.status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={inv.id} className={cn('hover:bg-inset/50 transition-colors', highlightedIds.has(inv.id) && 'row-highlight')}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-weak" />
                          <span className="text-sm text-body">{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={ROLE_COLORS[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-dim">{formatDateShort(inv.sent_at)}</td>
                      <td className="px-6 py-4 text-sm text-dim">{formatDateShort(inv.expires_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyLink(inv)}
                            title="Copy invite link"
                            className="p-1.5 rounded-lg text-weak hover:text-dim hover:bg-inset transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {can('send_invitations') && (inv.status === 'pending' || inv.status === 'expired') && (
                            <button
                              onClick={() => resendInvitation.mutate(inv.id)}
                              title="Resend invitation"
                              className="p-1.5 rounded-lg text-weak hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {can('send_invitations') && inv.status === 'pending' && (
                            <button
                              onClick={() => revokeInvitation.mutate(inv.id)}
                              title="Revoke invitation"
                              className="p-1.5 rounded-lg text-weak hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-weak">
                      No invitations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Send Invite Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset(); }}
        title="Send Invitation"
        description="Invite a new user to join your organization"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="user@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            placeholder="Select a role"
            error={errors.role?.message}
            {...register('role')}
          />
          <Textarea
            label="Custom Message (Optional)"
            placeholder="Add a personal message..."
            rows={3}
            {...register('message')}
          />
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> The invitation will expire in 7 days. The user will receive
              an email with a secure link to create their account.
            </p>
          </div>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setModalOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={sendInvitation.isPending} icon={<Send className="h-4 w-4" />}>
              Send Invitation
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};
