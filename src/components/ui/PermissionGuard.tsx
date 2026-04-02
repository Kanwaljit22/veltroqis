import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { usePermission, usePermissions } from '../../lib/permissions';
import type { Permission } from '../../lib/permissions';
import { Button } from './Button';

// ─── Inline guard (renders nothing or a fallback) ─────────────────────────────

interface PermissionGuardProps {
  /** The permission required to render children */
  permission: Permission;
  /** What to render when the user lacks the permission. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps any piece of UI. Children are only rendered when the current user
 * holds the required permission; otherwise `fallback` (default: nothing) is shown.
 *
 * @example
 * <PermissionGuard permission="create_projects">
 *   <Button>New Project</Button>
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
};

// ─── Route-level guard (redirects or shows access-denied screen) ──────────────

interface RouteGuardProps {
  /** The permission required to access this route */
  permission: Permission;
  /**
   * Where to redirect unauthorized users.
   * Defaults to `/dashboard` to avoid redirect loops.
   */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Wraps a route element. Unauthorized users are redirected away.
 *
 * @example
 * <Route
 *   path="/users"
 *   element={
 *     <RoutePermissionGuard permission="manage_users">
 *       <UserManagementPage />
 *     </RoutePermissionGuard>
 *   }
 * />
 */
export const RoutePermissionGuard: React.FC<RouteGuardProps> = ({
  permission,
  redirectTo = '/dashboard',
  children,
}) => {
  const allowed = usePermission(permission);
  if (!allowed) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

// ─── Standalone access-denied page/banner ─────────────────────────────────────

interface AccessDeniedProps {
  /** Override the default title */
  title?: string;
  /** Override the default description */
  description?: string;
  /** Show a "Go back" button (default: true) */
  showBack?: boolean;
}

/**
 * Full-page (or inline) access-denied screen used by route guards and
 * pages that want to surface a richer error message.
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Access Denied',
  description = "You don't have permission to view this page. Contact your admin if you think this is a mistake.",
  showBack = true,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
      <ShieldOff className="h-8 w-8 text-red-400" />
    </div>
    <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
    <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
    {showBack && (
      <Button variant="outline" onClick={() => window.history.back()}>
        Go back
      </Button>
    )}
  </div>
);

// ─── Multi-permission variant ─────────────────────────────────────────────────

interface MultiPermissionGuardProps {
  /** All listed permissions must be satisfied */
  permissions: Permission[];
  /** Strategy: 'all' (default) or 'any' */
  strategy?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Like `PermissionGuard` but accepts multiple permissions.
 *
 * @example
 * <MultiPermissionGuard permissions={['manage_users', 'manage_roles']} strategy="any">
 *   <AdminPanel />
 * </MultiPermissionGuard>
 */
export const MultiPermissionGuard: React.FC<MultiPermissionGuardProps> = ({
  permissions,
  strategy = 'all',
  fallback = null,
  children,
}) => {
  const { canAll, canAny } = usePermissions();
  const allowed = strategy === 'any' ? canAny(permissions) : canAll(permissions);
  return <>{allowed ? children : fallback}</>;
};
