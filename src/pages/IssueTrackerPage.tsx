import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, MessageSquare, MoreHorizontal, Edit2, Trash2, Filter,
  ChevronDown, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import { Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { SkeletonTable, ErrorState } from '../components/ui/Skeleton';
import {
  ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS, ISSUE_STATUS_LABELS, ISSUE_STATUS_COLORS,
  SEVERITY_LABELS, SEVERITY_COLORS, formatTimeAgo, cn,
} from '../lib/utils';
import { useIssues, useCreateIssue, useUpdateIssue, useDeleteIssue } from '../hooks/useIssues';
import { useNewItemHighlight } from '../hooks/useNewItemHighlight';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../store/authStore';
import type { Issue, IssueType, IssueSeverity, IssueStatus } from '../types';

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type required'),
  severity: z.string().min(1, 'Severity required'),
  project_id: z.string().min(1, 'Project required'),
  assignee_id: z.string().optional(),
  steps_to_reproduce: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const editSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type required'),
  severity: z.string().min(1, 'Severity required'),
  status: z.string().min(1, 'Status required'),
  assignee_id: z.string().optional(),
  steps_to_reproduce: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'improvement', label: 'Improvement' },
];
const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
  { value: 'blocker', label: 'Blocker' },
];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const IssueTrackerPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();

  const { data: issues = [], isLoading, error, refetch } = useIssues();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const highlightedIds = useNewItemHighlight(issues, !isLoading);
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) });

  // Keep editIssue in sync with live query data after mutations
  useEffect(() => {
    if (!editIssue) return;
    const live = issues.find((i) => i.id === editIssue.id);
    if (live) setEditIssue(live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues]);

  const filtered = issues.filter((issue) => {
    const matchSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || issue.type === typeFilter;
    const matchSeverity = !severityFilter || issue.severity === severityFilter;
    const matchStatus = statusTab === 'all' || issue.status === statusTab;
    return matchSearch && matchType && matchSeverity && matchStatus;
  });

  const tabs = [
    { id: 'all', label: 'All', count: issues.length },
    { id: 'open', label: 'Open', count: issues.filter((i) => i.status === 'open').length },
    { id: 'in_progress', label: 'In Progress', count: issues.filter((i) => i.status === 'in_progress').length },
    { id: 'resolved', label: 'Resolved', count: issues.filter((i) => i.status === 'resolved').length },
  ];

  const onSubmit = async (data: FormData) => {
    await createIssue.mutateAsync({
      project_id: data.project_id,
      title: data.title,
      description: data.description,
      type: data.type as IssueType,
      severity: data.severity as IssueSeverity,
      reporter_id: currentUser?.id ?? '',
      assignee_id: data.assignee_id || undefined,
      steps_to_reproduce: data.steps_to_reproduce,
    });
    setCreateModalOpen(false);
    reset();
  };

  const onEditSubmit = async (data: EditFormData) => {
    if (!editIssue) return;
    await updateIssue.mutateAsync({
      id: editIssue.id,
      updates: {
        title: data.title,
        description: data.description || undefined,
        type: data.type as IssueType,
        severity: data.severity as IssueSeverity,
        status: data.status as IssueStatus,
        assignee_id: data.assignee_id || undefined,
        steps_to_reproduce: data.steps_to_reproduce || undefined,
      },
    });
    setEditIssue(null);
  };

  const openEditModal = (issue: Issue) => {
    editReset({
      title: issue.title,
      description: issue.description ?? '',
      type: issue.type,
      severity: issue.severity,
      status: issue.status,
      assignee_id: issue.assignee_id ?? '',
      steps_to_reproduce: issue.steps_to_reproduce ?? '',
    });
    setEditIssue(issue);
  };

  const handleStatusChange = async (issue: Issue, status: IssueStatus) => {
    await updateIssue.mutateAsync({ id: issue.id, updates: { status } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteIssue.mutateAsync({
      id: deleteTarget.id,
      projectId: deleteTarget.project_id,
      title: deleteTarget.title,
    });
    setDeleteTarget(null);
  };

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: u.full_name })),
  ];

  if (error) {
    return <ErrorState message="Failed to load issues" onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-hi">Issue Tracker</h1>
          <p className="text-xs text-dim mt-0.5">Track bugs, features, and improvements</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)}>
          New Issue
        </Button>
      </div>


      {/* Table + Filters — unified panel */}
      <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-subtle">
          <div className="flex items-center justify-between gap-3">
            {/* Status tabs */}
            <Tabs tabs={tabs} activeTab={statusTab} onChange={setStatusTab} />

            {/* Inline filters */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-weak pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-48 bg-inset border border-base rounded-lg pl-8 pr-3 text-xs text-body placeholder:text-weak focus:outline-none focus:ring-2 focus:ring-hi/10 focus:border-slate-300 transition-all"
                />
              </div>

              {/* Type */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 appearance-none bg-inset border border-base rounded-lg pl-3 pr-7 text-xs text-dim focus:outline-none focus:ring-2 focus:ring-hi/10 focus:border-slate-300 cursor-pointer transition-all"
                >
                  <option value="">All Types</option>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-weak pointer-events-none" />
              </div>

              {/* Severity */}
              <div className="relative">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="h-8 appearance-none bg-inset border border-base rounded-lg pl-3 pr-7 text-xs text-dim focus:outline-none focus:ring-2 focus:ring-hi/10 focus:border-slate-300 cursor-pointer transition-all"
                >
                  <option value="">All Severities</option>
                  {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-weak pointer-events-none" />
              </div>

              {/* Active filter count pill */}
              {(search || typeFilter || severityFilter) && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter(''); setSeverityFilter(''); }}
                  className="h-8 px-2.5 text-xs font-medium text-dim bg-inset hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Filter className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-5">
              <SkeletonTable rows={5} cols={6} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-subtle bg-inset/50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Issue</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Reporter</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-weak uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filtered.map((issue) => (
                  <tr key={issue.id} className={cn('hover:bg-inset/50 transition-colors group', highlightedIds.has(issue.id) && 'row-highlight')}>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        type="button"
                        onClick={() => openEditModal(issue)}
                        className="text-sm font-semibold text-hi text-left w-full leading-snug hover:text-blue-600 hover:underline underline-offset-2 transition-colors cursor-pointer truncate block"
                        title={issue.title}
                      >
                        {issue.title}
                      </button>
                      {issue.description && (
                        <p className="text-xs text-weak truncate mt-0.5 leading-snug">{issue.description}</p>
                      )}
                      {!!issue.comment_count && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-weak mt-1">
                          <MessageSquare className="h-3 w-3" />{issue.comment_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ISSUE_TYPE_COLORS[issue.type]} size="sm">{ISSUE_TYPE_LABELS[issue.type]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={SEVERITY_COLORS[issue.severity]} size="sm">{SEVERITY_LABELS[issue.severity]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ISSUE_STATUS_COLORS[issue.status]} size="sm">{ISSUE_STATUS_LABELS[issue.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {issue.reporter && (
                        <div className="flex items-center gap-2">
                          <Avatar src={issue.reporter.avatar_url} name={issue.reporter.full_name} size="xs" />
                          <span className="text-xs text-dim truncate max-w-[100px]">{issue.reporter.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar src={issue.assignee.avatar_url} name={issue.assignee.full_name} size="xs" />
                          <span className="text-xs text-dim truncate max-w-[100px]">{issue.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-weak">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-weak whitespace-nowrap">{formatTimeAgo(issue.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Dropdown
                        trigger={
                          <button className="p-1 rounded-lg text-weak hover:text-dim hover:bg-inset transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        }
                        items={[
                          { label: 'Edit Issue', icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => openEditModal(issue) },
                          { separator: true },
                          { label: 'Mark In Progress', icon: <Clock className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(issue, 'in_progress') },
                          { label: 'Mark Resolved', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(issue, 'resolved') },
                          { label: 'Close Issue', icon: <XCircle className="h-3.5 w-3.5" />, onClick: () => handleStatusChange(issue, 'closed') },
                          { separator: true },
                          { label: 'Delete Issue', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteTarget(issue), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-inset flex items-center justify-center">
                          <Filter className="h-5 w-5 text-weak" />
                        </div>
                        <p className="text-sm font-medium text-dim">No issues found</p>
                        <p className="text-xs text-weak">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Issue Modal */}
      <Modal
        open={!!editIssue}
        onClose={() => setEditIssue(null)}
        title="Edit Issue"
        description="Update the issue details below"
        size="lg"
      >
        {editIssue && (
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="Brief description of the issue"
              error={editErrors.title?.message}
              {...editRegister('title')}
            />
            <Textarea
              label="Description"
              placeholder="Detailed description..."
              rows={3}
              {...editRegister('description')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                options={TYPE_OPTIONS}
                placeholder="Select type"
                error={editErrors.type?.message}
                {...editRegister('type')}
              />
              <Select
                label="Severity"
                options={SEVERITY_OPTIONS}
                placeholder="Select severity"
                error={editErrors.severity?.message}
                {...editRegister('severity')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                placeholder="Select status"
                error={editErrors.status?.message}
                {...editRegister('status')}
              />
              <Select
                label="Assignee"
                options={userOptions}
                {...editRegister('assignee_id')}
              />
            </div>
            <Textarea
              label="Steps to Reproduce"
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              rows={3}
              {...editRegister('steps_to_reproduce')}
            />
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" type="button" onClick={() => setEditIssue(null)}>
            Cancel
          </Button>
          <Button onClick={editHandleSubmit(onEditSubmit)} loading={updateIssue.isPending}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Create Issue Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); reset(); }}
        title="Report New Issue"
        description="Describe the bug, feature request, or improvement"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" placeholder="Brief description of the issue" error={errors.title?.message} {...register('title')} />
          <Textarea label="Description" placeholder="Detailed description..." rows={3} {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Project" options={projectOptions} placeholder="Select project"
              error={errors.project_id?.message} {...register('project_id')} />
            <Select label="Type" options={TYPE_OPTIONS} placeholder="Select type"
              error={errors.type?.message} {...register('type')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Severity" options={SEVERITY_OPTIONS} placeholder="Select severity"
              error={errors.severity?.message} {...register('severity')} />
            <Select label="Assignee" options={userOptions} {...register('assignee_id')} />
          </div>
          <Textarea label="Steps to Reproduce" placeholder="1. Go to...\n2. Click on...\n3. See error" rows={3}
            {...register('steps_to_reproduce')} />
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setCreateModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createIssue.isPending}>Create Issue</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Issue"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        size="sm"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteIssue.isPending}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
