import { useAuthStore } from '../store/authStore';
import type { Project, UserRole } from '../types';

// ─── Permission Catalogue ─────────────────────────────────────────────────────

/**
 * Every discrete action a user can perform.
 * This list is the single source of truth for the RBAC matrix.
 */
export type Permission =
  | 'create_projects'
  | 'delete_projects'
  | 'assign_tasks'
  | 'create_issues'
  | 'manage_users'
  | 'send_invitations'
  | 'view_analytics'
  | 'manage_roles';

// ─── Role → Permission Map ─────────────────────────────────────────────────────

/**
 * Declarative mapping of which permissions each role holds.
 * Add new permissions here first; UI enforcement follows automatically.
 */
export const ROLE_PERMISSION_MAP: Record<UserRole, readonly Permission[]> = {
  admin: [
    'create_projects',
    'delete_projects',
    'assign_tasks',
    'create_issues',
    'manage_users',
    'send_invitations',
    'view_analytics',
    'manage_roles',
  ],
  project_lead: [
    'create_projects',
    'assign_tasks',
    'create_issues',
    'send_invitations',
    'view_analytics',
  ],
  designer: [
    'create_issues',
    'view_analytics',
  ],
  developer: [
    'create_issues',
    'view_analytics',
  ],
  qa: [
    'create_issues',
    'view_analytics',
  ],
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pure function — safe to call outside React (e.g. in hooks, route loaders).
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSION_MAP[role] as readonly string[]).includes(permission);
}

/**
 * Checks whether a role holds **every** permission in the list.
 */
export function hasAllPermissions(
  role: UserRole | undefined | null,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Checks whether a role holds **at least one** permission in the list.
 */
export function hasAnyPermission(
  role: UserRole | undefined | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * Convenience hook — components call `usePermission('delete_projects')` and
 * get back a boolean without touching the auth store directly.
 */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return hasPermission(role, permission);
}

/**
 * Returns an object of `{ can: (p: Permission) => boolean }` for inline checks
 * in JSX without calling multiple hooks.
 *
 * @example
 * const { can } = usePermissions();
 * {can('create_projects') && <Button>New Project</Button>}
 */
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);
  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
  };
}

// ─── Display Helpers (for the permissions matrix UI) ─────────────────────────

/** Human-readable labels for each permission action */
export const PERMISSION_LABELS: Record<Permission, string> = {
  create_projects: 'Create Projects',
  delete_projects: 'Delete Projects',
  assign_tasks: 'Assign Tasks',
  create_issues: 'Create Issues',
  manage_users: 'Manage Users',
  send_invitations: 'Send Invitations',
  view_analytics: 'View Analytics',
  manage_roles: 'Manage Roles',
};

/** Ordered list for rendering the matrix rows consistently */
export const PERMISSION_ORDER: Permission[] = [
  'create_projects',
  'delete_projects',
  'assign_tasks',
  'create_issues',
  'manage_users',
  'send_invitations',
  'view_analytics',
  'manage_roles',
];

/** All roles in the display order used in the matrix columns */
export const ROLE_ORDER: UserRole[] = [
  'admin',
  'project_lead',
  'designer',
  'developer',
  'qa',
];

// ─── Project Visibility ───────────────────────────────────────────────────────

/**
 * Returns true only for the `admin` role.
 * Admins have unrestricted visibility over all projects.
 * All other roles (including project_lead) see only their assigned projects.
 */
export function canViewAllProjects(role: UserRole | undefined | null): boolean {
  return role === 'admin';
}

/**
 * Project visibility is scoped by membership for every non-admin role.
 * A project is visible when the user is its lead or an explicit member.
 */
export function canAccessProject(
  project: Pick<Project, 'lead_id' | 'members'>,
  userId: string | undefined | null,
  role: UserRole | undefined | null,
): boolean {
  if (!userId) return false;
  if (canViewAllProjects(role)) return true;

  return (
    project.lead_id === userId ||
    project.members?.some((member) => member.id === userId) === true
  );
}

export function filterAccessibleProjects(
  projects: Project[],
  userId: string | undefined | null,
  role: UserRole | undefined | null,
): Project[] {
  if (canViewAllProjects(role)) return projects;
  return projects.filter((project) => canAccessProject(project, userId, role));
}
