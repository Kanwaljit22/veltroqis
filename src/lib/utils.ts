import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type { UserRole, TaskPriority, TaskStatus, TaskLabel, IssueSeverity, IssueStatus, IssueType, ProjectStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d');
}

export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  project_lead: 'Project Lead',
  designer: 'Designer',
  developer: 'Developer',
  qa: 'QA',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  project_lead: 'bg-blue-100 text-blue-700',
  designer: 'bg-green-100 text-green-700',
  developer: 'bg-yellow-100 text-yellow-700',
  qa: 'bg-red-100 text-red-700',
};

export const ROLE_BAR_COLORS: Record<UserRole, string> = {
  admin: '#9333ea',
  project_lead: '#3b82f6',
  designer: '#22c55e',
  developer: '#eab308',
  qa: '#ef4444',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-600',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  code_review: 'Code Review',
  review: 'Review',
  testing: 'Testing / QA',
  done: 'Done',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-slate-100 text-slate-600',
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  code_review: 'bg-purple-100 text-purple-700',
  review: 'bg-yellow-100 text-yellow-700',
  testing: 'bg-orange-100 text-orange-700',
  done: 'bg-green-100 text-green-700',
};

export const LABEL_LABELS: Record<TaskLabel, string> = {
  bug: '🐞 Bug',
  feature: '🚀 Feature',
  enhancement: '⚙️ Enhancement',
  design: '🎨 Design',
  documentation: '📄 Docs',
  hotfix: '🔥 Hotfix',
};

export const LABEL_COLORS: Record<TaskLabel, string> = {
  bug: 'bg-red-100 text-red-700 border-red-200',
  feature: 'bg-blue-100 text-blue-700 border-blue-200',
  enhancement: 'bg-purple-100 text-purple-700 border-purple-200',
  design: 'bg-pink-100 text-pink-700 border-pink-200',
  documentation: 'bg-gray-100 text-gray-600 border-gray-200',
  hotfix: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-600',
};

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
  blocker: 'Blocker',
};

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  minor: 'bg-gray-100 text-gray-600',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  blocker: 'bg-rose-200 text-rose-800',
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  improvement: 'Improvement',
};

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  bug: 'bg-red-100 text-red-700',
  feature_request: 'bg-blue-100 text-blue-700',
  improvement: 'bg-green-100 text-green-700',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

/** Human-readable dashboard line for `activity_logs.action` + `entity_name`. */
export function formatActivityLogSummary(action: string, entityName: string): string {
  const verbs: Record<string, string> = {
    'project.created': 'Created project',
    'project.updated': 'Updated project',
    'task.created': 'Created task',
    'task.updated': 'Updated task',
    'task.status_changed': 'Changed task status',
    'task.assignees_updated': 'Updated task assignees',
    'issue.created': 'Created issue',
    'issue.updated': 'Updated issue',
    'user.created': 'New user joined',
    'user.updated': 'Updated user profile',
    'user.role_changed': 'Changed user role',
    'invitation.sent': 'Sent invitation',
  };
  const verb = verbs[action] ?? action.replace(/\./g, ' ');
  const detail = entityName?.trim() ? ` · ${entityName}` : '';
  return `${verb}${detail}`;
}
