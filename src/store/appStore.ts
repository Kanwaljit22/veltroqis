import { create } from 'zustand';
import type { Task, Project, Issue, Notification } from '../types';

interface AppState {
  // Search
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Notifications panel
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Current project context
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;

  // Modals
  taskModalOpen: boolean;
  taskModalData: Partial<Task> | null;
  openTaskModal: (data?: Partial<Task>) => void;
  closeTaskModal: () => void;

  issueModalOpen: boolean;
  issueModalData: Partial<Issue> | null;
  openIssueModal: (data?: Partial<Issue>) => void;
  closeIssueModal: () => void;

  projectModalOpen: boolean;
  projectModalData: Partial<Project> | null;
  openProjectModal: (data?: Partial<Project>) => void;
  closeProjectModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  globalSearch: '',
  setGlobalSearch: (q) => set({ globalSearch: q }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  taskModalOpen: false,
  taskModalData: null,
  openTaskModal: (data) => set({ taskModalOpen: true, taskModalData: data || null }),
  closeTaskModal: () => set({ taskModalOpen: false, taskModalData: null }),

  issueModalOpen: false,
  issueModalData: null,
  openIssueModal: (data) => set({ issueModalOpen: true, issueModalData: data || null }),
  closeIssueModal: () => set({ issueModalOpen: false, issueModalData: null }),

  projectModalOpen: false,
  projectModalData: null,
  openProjectModal: (data) => set({ projectModalOpen: true, projectModalData: data || null }),
  closeProjectModal: () => set({ projectModalOpen: false, projectModalData: null }),
}));
