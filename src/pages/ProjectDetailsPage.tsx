import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  ChevronRight,
  CheckSquare,
  Bug,
  LayoutGrid,
  List,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Progress';
import { AvatarGroup, Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { useProject } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useIssues } from '../hooks/useIssues';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  ISSUE_TYPE_COLORS,
  ISSUE_TYPE_LABELS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  formatDate,
  cn,
} from '../lib/utils';

export const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: project } = useProject(id ?? '');
  const { data: tasks = [] } = useTasks(project?.id);
  const { data: issues = [] } = useIssues(project?.id);

  if (!project) {
    return (
      <div className="bg-surface rounded-2xl border border-base shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-hi mb-2">Project not found</h1>
        <p className="text-sm text-dim mb-5">
          The project may have been removed or you may not have access to it.
        </p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const progress = project.task_count
    ? Math.round(((project.completed_task_count || 0) / project.task_count) * 100)
    : 0;

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-dim">
        <Link to="/projects" className="hover:text-hi transition-colors">Projects</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-hi font-medium">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-lg hover:bg-inset transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-dim" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-hi">{project.name}</h1>
              <Badge className={PROJECT_STATUS_COLORS[project.status]}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-dim mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/scrumboard')}>
            View Board
          </Button>
          <Button onClick={() => navigate('/scrumboard')}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

        {/* Progress Card */}
        <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">
          <div className="h-[3px] bg-linear-to-r from-blue-500 to-cyan-400" />
          <div className="px-4 pt-3 pb-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-blue-500" />
                </div>
                <span className="text-[10px] font-semibold text-weak uppercase tracking-widest">Progress</span>
              </div>
              <span className="text-[10px] font-medium text-weak">{100 - progress}% left</span>
            </div>
            <div className="flex items-baseline gap-0.5 mb-2">
              <span className="text-2xl font-bold text-hi leading-none">{progress}</span>
              <span className="text-sm text-weak font-semibold">%</span>
            </div>
            <div className="w-full bg-inset rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">
          <div className="h-[3px] bg-linear-to-r from-violet-500 to-purple-400" />
          <div className="px-4 pt-3 pb-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-5 h-5 rounded-md bg-violet-50 flex items-center justify-center">
                <CheckSquare className="h-3 w-3 text-violet-500" />
              </div>
              <span className="text-[10px] font-semibold text-weak uppercase tracking-widest">Tasks</span>
            </div>
            <div className="flex items-baseline gap-0.5 mb-2">
              <span className="text-2xl font-bold text-hi leading-none">{project.completed_task_count}</span>
              <span className="text-sm text-weak font-semibold">/{project.task_count}</span>
              <span className="text-[10px] text-weak ml-1">done</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden gap-[2px]">
              <div className="bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.done.length / (project.task_count || 1)) * 100}%` }} />
              <div className="bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.in_progress.length / (project.task_count || 1)) * 100}%` }} />
              <div className="bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.review.length / (project.task_count || 1)) * 100}%` }} />
              <div className="bg-inset flex-1 rounded-full" />
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">
          <div className="h-[3px] bg-linear-to-r from-amber-400 to-orange-400" />
          <div className="px-4 pt-3 pb-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
                <Calendar className="h-3 w-3 text-amber-500" />
              </div>
              <span className="text-[10px] font-semibold text-weak uppercase tracking-widest">Timeline</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="w-px h-4 bg-slate-200 my-0.5" />
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[9px] text-weak uppercase tracking-wide leading-none mb-0.5">Start</p>
                  <p className="text-xs font-semibold text-hi leading-none">
                    {project.start_date ? formatDate(project.start_date) : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-weak uppercase tracking-wide leading-none mb-0.5">Deadline</p>
                  <p className="text-xs font-semibold text-hi leading-none">
                    {project.deadline ? formatDate(project.deadline) : 'No deadline'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Card */}
        <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">
          <div className="h-[3px] bg-linear-to-r from-emerald-400 to-teal-400" />
          <div className="px-4 pt-3 pb-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                  <Users className="h-3 w-3 text-emerald-500" />
                </div>
                <span className="text-[10px] font-semibold text-weak uppercase tracking-widest">Team</span>
              </div>
              {project.members && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                  {project.members.length} members
                </span>
              )}
            </div>
            {project.members && <AvatarGroup users={project.members} max={5} />}
            {project.lead && (
              <div className="flex items-center gap-1 mt-1.5">
                <MapPin className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                <p className="text-[10px] text-weak truncate">
                  Lead: <span className="text-body font-semibold">{project.lead.full_name}</span>
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks', count: tasks.length },
          { id: 'issues', label: 'Issues', count: issues.length },
          { id: 'team', label: 'Team', count: project.members?.length || 0 },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Task Status */}
          <div className="bg-surface rounded-2xl border border-subtle shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-hi flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-inset flex items-center justify-center">
                  <CheckSquare className="h-3.5 w-3.5 text-dim" />
                </div>
                Task Status
              </h3>
              <span className="text-xs font-medium text-weak bg-inset border border-subtle px-2 py-0.5 rounded-full">
                {tasks.length} total
              </span>
            </div>

            {/* Stacked distribution bar */}
            <div className="flex h-1.5 rounded-full overflow-hidden gap-[2px] mb-4">
              <div className="bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.done.length / (tasks.length || 1)) * 100}%` }} />
              <div className="bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.in_progress.length / (tasks.length || 1)) * 100}%` }} />
              <div className="bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(tasksByStatus.review.length / (tasks.length || 1)) * 100}%` }} />
              <div className="bg-inset flex-1 rounded-full" />
            </div>

            {/* Status rows */}
            <div className="space-y-2">
              {(Object.keys(tasksByStatus) as (keyof typeof tasksByStatus)[]).map((status) => {
                const count = tasksByStatus[status].length;
                const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
                const barColor: Record<string, string> = {
                  todo: 'bg-slate-300',
                  in_progress: 'bg-blue-400',
                  review: 'bg-amber-400',
                  done: 'bg-emerald-400',
                };
                return (
                  <div key={status} className="flex items-center gap-3 group">
                    <div className="w-24 shrink-0">
                      <Badge className={cn(STATUS_COLORS[status], 'w-full justify-center')} size="sm">
                        {STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <div className="flex-1 bg-inset rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor[status])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-body w-5 text-right tabular-nums">{count}</span>
                    <span className="text-[11px] text-weak w-7 text-right tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Issues */}
          <div className="bg-surface rounded-2xl border border-subtle shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-hi flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center">
                  <Bug className="h-3.5 w-3.5 text-rose-500" />
                </div>
                Recent Issues
              </h3>
              {issues.length > 0 && (
                <span className="text-xs font-medium text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                  {issues.length} open
                </span>
              )}
            </div>
            {issues.length > 0 ? (
              <div className="space-y-1">
                {issues.slice(0, 4).map((issue, idx) => (
                  <div
                    key={issue.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-inset transition-colors group"
                  >
                    <span className="text-[11px] font-mono text-weak w-4 shrink-0 group-hover:text-weak transition-colors">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <Badge className={ISSUE_TYPE_COLORS[issue.type]} size="sm">
                      {ISSUE_TYPE_LABELS[issue.type]}
                    </Badge>
                    <p className="text-sm text-body flex-1 truncate font-medium">{issue.title}</p>
                    <Badge className={SEVERITY_COLORS[issue.severity]} size="sm">
                      {SEVERITY_LABELS[issue.severity]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-5 gap-2">
                <div className="w-10 h-10 rounded-full bg-inset flex items-center justify-center">
                  <Bug className="h-5 w-5 text-weak" />
                </div>
                <p className="text-sm text-weak">No issues reported</p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-surface rounded-xl border border-base shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
            <h3 className="font-semibold text-hi">Tasks ({tasks.length})</h3>
            <div className="flex gap-1">
              <button className="p-1.5 rounded-lg text-weak hover:text-dim hover:bg-inset">
                <List className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded-lg text-weak hover:text-dim hover:bg-inset">
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-subtle">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-inset/50 transition-colors">
                <Badge className={STATUS_COLORS[task.status]} size="sm">{STATUS_LABELS[task.status]}</Badge>
                <p className="text-sm font-medium text-hi flex-1">{task.title}</p>
                <Badge className={PRIORITY_COLORS[task.priority]} size="sm">{PRIORITY_LABELS[task.priority]}</Badge>
                {task.assignees && task.assignees.length > 0 && (
                  <AvatarGroup users={task.assignees} max={3} size="xs" />
                )}
                {task.due_date && (
                  <span className="text-xs text-weak">{formatDate(task.due_date)}</span>
                )}
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-weak text-center py-5">No tasks yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="bg-surface rounded-xl border border-base shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-subtle">
            <h3 className="font-semibold text-hi">Issues ({issues.length})</h3>
          </div>
          <div className="divide-y divide-subtle">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-center gap-4 px-6 py-4 hover:bg-inset/50 transition-colors">
                <Badge className={ISSUE_TYPE_COLORS[issue.type]} size="sm">{ISSUE_TYPE_LABELS[issue.type]}</Badge>
                <p className="text-sm font-medium text-hi flex-1">{issue.title}</p>
                <Badge className={SEVERITY_COLORS[issue.severity]} size="sm">{SEVERITY_LABELS[issue.severity]}</Badge>
                {issue.reporter && (
                  <div className="flex items-center gap-1.5">
                    <Avatar src={issue.reporter.avatar_url} name={issue.reporter.full_name} size="xs" />
                    <span className="text-xs text-dim hidden sm:block">{issue.reporter.full_name}</span>
                  </div>
                )}
              </div>
            ))}
            {issues.length === 0 && (
              <p className="text-sm text-weak text-center py-5">No issues reported</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-surface rounded-xl border border-base shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-subtle">
            <h3 className="font-semibold text-hi">Team Members ({project.members?.length || 0})</h3>
          </div>
          <div className="divide-y divide-subtle">
            {project.members?.map((member) => (
              <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-inset/50 transition-colors">
                <Avatar src={member.avatar_url} name={member.full_name} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-hi">
                    {member.full_name}
                    {member.id === project.lead_id && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(Lead)</span>
                    )}
                  </p>
                  <p className="text-xs text-dim">{member.email}</p>
                </div>
                <Badge className="bg-inset text-dim" size="sm">
                  {member.designation || member.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
