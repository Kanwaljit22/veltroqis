import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, FolderKanban, Calendar, Users, CheckSquare,
  MoreHorizontal, Edit2, Trash2, Eye, ShieldCheck, Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import { ProgressBar } from '../components/ui/Progress';
import { AvatarGroup } from '../components/ui/Avatar';
import { SkeletonCard, ErrorState } from '../components/ui/Skeleton';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, formatDate } from '../lib/utils';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../store/authStore';
import { usePermissions, canViewAllProjects } from '../lib/permissions';
import { PermissionGuard } from '../components/ui/PermissionGuard';
import type { Project, ProjectStatus } from '../types';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  lead_id: z.string().min(1, 'Lead required'),
  status: z.string().min(1, 'Status required'),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();
  const isAdmin = canViewAllProjects(currentUser?.role);

  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const { data: users = [] } = useUsers();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const userOptions = users.map((u) => ({ value: u.id, label: u.full_name }));

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    reset({ name: '', description: '', lead_id: '', status: 'active' });
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditTarget(p);
    setValue('name', p.name);
    setValue('description', p.description || '');
    setValue('lead_id', p.lead_id);
    setValue('status', p.status);
    setValue('start_date', p.start_date || '');
    setValue('deadline', p.deadline || '');
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editTarget) {
      await updateProject.mutateAsync({
        id: editTarget.id,
        updates: {
          name: data.name,
          description: data.description,
          lead_id: data.lead_id,
          status: data.status as ProjectStatus,
          start_date: data.start_date,
          deadline: data.deadline,
        },
      });
    } else {
      await createProject.mutateAsync({
        name: data.name,
        description: data.description,
        lead_id: data.lead_id,
        status: data.status as ProjectStatus,
        start_date: data.start_date,
        deadline: data.deadline,
        created_by: currentUser?.id ?? '',
      });
    }
    setModalOpen(false);
    setEditTarget(null);
    reset();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
    setDeleteTarget(null);
  };

  const isSubmitting = createProject.isPending || updateProject.isPending;

  if (error) {
    return <ErrorState message="Failed to load projects" onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all your projects</p>
        </div>
        <PermissionGuard permission="create_projects">
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Project
          </Button>
        </PermissionGuard>
      </div>

      {/* Access-context banner */}
      {isAdmin ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-xs font-medium text-purple-700 w-fit">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Admin view — showing all {projects.length} project{projects.length !== 1 ? 's' : ''} across the workspace
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 w-fit">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Showing {projects.length} project{projects.length !== 1 ? 's' : ''} you&apos;re assigned to
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No projects found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search || statusFilter ? 'Try adjusting your filters' : 'Create your first project'}
            </p>
          </div>
        ) : (
          filtered.map((project) => {
            const progress = project.task_count
              ? Math.round(((project.completed_task_count || 0) / project.task_count) * 100)
              : 0;
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 m-0 min-w-0">
                        <Link
                          to={`/projects/${project.id}`}
                          className="truncate block text-inherit rounded-sm hover:text-blue-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          {project.name}
                        </Link>
                      </h3>
                      <Badge className={PROJECT_STATUS_COLORS[project.status]} size="sm">
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </div>
                  </div>
                  <Dropdown
                    trigger={
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    }
                    items={[
                      { label: 'View Details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/projects/${project.id}`) },
                      ...(can('create_projects') ? [{ label: 'Edit Project', icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => openEdit(project) }] : []),
                      ...(can('delete_projects') ? [{ separator: true as const }, { label: 'Delete Project', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteTarget(project), danger: true as const }] : []),
                    ]}
                  />
                </div>

                {project.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-3">
                  <ProgressBar
                    value={progress}
                    label={`${progress}% complete`}
                    showLabel
                    size="md"
                    color={progress === 100 ? 'bg-green-500' : 'bg-blue-500'}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {project.completed_task_count}/{project.task_count} tasks
                    </div>
                    {project.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(project.deadline)}
                      </div>
                    )}
                  </div>
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AvatarGroup users={project.members} max={4} />
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project.members.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); reset(); }}
        title={editTarget ? 'Edit Project' : 'Create New Project'}
        description={editTarget ? 'Update project details' : 'Set up a new project for your team'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Project Name" placeholder="e.g. Mobile App Redesign" error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" placeholder="What is this project about?" rows={3} {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Project Lead" options={userOptions} placeholder="Select lead" error={errors.lead_id?.message} {...register('lead_id')} />
            <Select label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...register('start_date')} />
            <Input label="Deadline" type="date" {...register('deadline')} />
          </div>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>
              {editTarget ? 'Save Changes' : 'Create Project'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All tasks and issues will also be deleted.`}
        size="sm"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteProject.isPending}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
