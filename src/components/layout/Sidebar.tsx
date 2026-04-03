import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Bug,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Kanban,
  CalendarClock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';
import { usePermissions, type Permission } from '../../lib/permissions';

interface NavItem {
  to: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  /** If set, only shown to users that hold this permission */
  permission?: Permission;
}

const navItems: NavItem[] = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',    icon: FolderKanban,    label: 'Projects' },
  { to: '/scrumboard',  icon: Kanban,          label: 'Scrumboard' },
  { to: '/standup',     icon: CalendarClock,   label: 'Daily Stand-up' },
  { to: '/issues',      icon: Bug,             label: 'Issue Tracker' },
  { to: '/users',       icon: Users,           label: 'User Management', permission: 'manage_users' },
  { to: '/invitations', icon: Mail,            label: 'Invitations',     permission: 'send_invitations' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { can } = usePermissions();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => !item.permission || can(item.permission));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 z-40',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-700/50 shrink-0">
        <div className="shrink-0 h-8 w-8 bg-linear-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm tracking-widest text-white truncate">VELTROQIS</p>
            <p className="text-[9px] text-weak tracking-wider truncate">INTELLIGENT DEV</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5 px-2">
          {visibleItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                title={!sidebarOpen ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-surface/10 text-white'
                    : 'text-weak hover:text-white hover:bg-surface/5'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && (
                  <span className="truncate">{label}</span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Toggle */}
      <div className="px-2 py-2 border-t border-slate-700/50 shrink-0">
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-weak hover:text-white hover:bg-surface/5 transition-colors text-sm"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="text-xs">Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
};
