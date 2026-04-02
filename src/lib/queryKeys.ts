/**
 * Centralized TanStack Query key factory.
 * Using arrays ensures proper cache invalidation hierarchy.
 */
export const QUERY_KEYS = {
  // Users
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,

  // Projects
  // Include userId so different users never share a stale project list cache.
  projects: (userId?: string) =>
    userId ? (['projects', { userId }] as const) : (['projects'] as const),
  project: (id: string) => ['projects', id] as const,
  projectMembers: (id: string) => ['projects', id, 'members'] as const,

  // Tasks
  tasks: (projectId?: string) =>
    projectId ? ['tasks', { projectId }] : ['tasks'],
  task: (id: string) => ['tasks', id] as const,

  // Issues
  issues: (projectId?: string) =>
    projectId ? ['issues', { projectId }] : ['issues'],
  issue: (id: string) => ['issues', id] as const,

  // Invitations
  invitations: ['invitations'] as const,

  // Notifications
  notifications: (userId: string) => ['notifications', userId] as const,

  // Dashboard — all stat/chart hooks share this single base key so React Query
  // only fires one set of network requests and derives each result via `select`.
  dashboardBase: ['dashboard', 'base'] as const,
  activityLogs: ['dashboard', 'activity'] as const,

  // Comments / Activity
  comments: (entityType: string, entityId: string) =>
    ['comments', { entityType, entityId }] as const,
  entityActivity: (entityType: string, entityId: string, limit?: number) =>
    ['activity', { entityType, entityId, limit: limit ?? 10 }] as const,

  // Daily Scrum / Stand-up
  standupSessions: (projectId?: string) =>
    projectId ? ['standup', { projectId }] : ['standup'],
  standupSession: (id: string) => ['standup', id] as const,
  standupToday: (projectId: string) => ['standup', 'today', projectId] as const,
} as const;
