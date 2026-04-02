export type UserRole = 'admin' | 'project_lead' | 'designer' | 'developer' | 'qa';

export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  designation?: string;
  department?: string;
  phone?: string;
  location?: string;
  bio?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  lead_id: string | null;
  lead?: User | null;
  start_date?: string;
  deadline?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: User[];
  task_count?: number;
  completed_task_count?: number;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'code_review' | 'review' | 'testing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'design' | 'documentation' | 'hotfix';

export interface Task {
  id: string;
  project_id: string;
  project?: Project;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
  assignees?: User[];
  reporter_id: string;
  reporter?: User;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: SubTask[];
  dependencies?: string[];
  attachments?: Attachment[];
  comment_count?: number;
  order_index?: number;
  labels?: TaskLabel[];
  story_points?: number;
  sprint_id?: string;
}

export interface SubTask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export type IssueType = 'bug' | 'feature_request' | 'improvement';
export type IssueSeverity = 'minor' | 'major' | 'critical' | 'blocker';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  project_id: string;
  project?: Project;
  task_id?: string;
  title: string;
  description?: string;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter_id: string;
  reporter?: User;
  assignee_id?: string;
  assignee?: User;
  steps_to_reproduce?: string;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  comment_count?: number;
}

export interface Comment {
  id: string;
  entity_type: 'task' | 'issue';
  entity_id: string;
  author_id: string;
  author?: User;
  content: string;
  parent_id?: string;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invited_by: string;
  inviter?: User;
  message?: string;
  token: string;
  sent_at: string;
  expires_at: string;
  accepted_at?: string;
}

export interface Attachment {
  id: string;
  entity_type: 'task' | 'issue' | 'project';
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

export type NotificationEvent =
  | 'task_assigned'
  | 'status_changed'
  | 'comment_added'
  | 'deadline_approaching'
  | 'invitation_sent'
  | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationEvent;
  title: string;
  message: string;
  read: boolean;
  entity_type?: string;
  entity_id?: string;
  actor?: User;
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  total_story_points?: number;
  completed_story_points?: number;
  velocity?: number;
}

export interface BurndownPoint {
  day: string;
  ideal: number;
  actual: number | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  pending_invites: number;
  admin_users: number;
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  open_issues: number;
  /** Previous-month snapshots used to compute MoM change percentages */
  prev_total_users: number;
  prev_active_users: number;
  prev_pending_invites: number;
  prev_admin_users: number;
}

export interface RoleDistribution {
  role: UserRole;
  count: number;
}

// ─── Daily Scrum / Stand-up Types ─────────────────────────────────────────────

export interface StandupTaskLink {
  task_id?: string;
  task?: Task;
  note: string;
}

export type StandupBlockerSeverity = 'low' | 'medium' | 'high';

export interface StandupBlocker {
  id: string;
  description: string;
  task_id?: string;
  task?: Task;
  severity: StandupBlockerSeverity;
  resolved: boolean;
  days_blocked: number;
}

export interface StandupEntry {
  id: string;
  session_id: string;
  user_id: string;
  user?: User;
  yesterday: StandupTaskLink[];
  today: StandupTaskLink[];
  blockers: StandupBlocker[];
  submitted_at?: string;
  attended: boolean;
  time_taken?: number;
}

export type StandupSessionMode = 'async' | 'live';
export type StandupSessionStatus = 'upcoming' | 'in_progress' | 'completed';

export interface StandupSummary {
  completed_tasks: number;
  in_progress_tasks: number;
  blockers_count: number;
  attendees: number;
  total_members: number;
  notes?: string;
}

export interface StandupSession {
  id: string;
  project_id: string;
  project?: Project;
  sprint_id?: string;
  date: string;
  mode: StandupSessionMode;
  status: StandupSessionStatus;
  meeting_link?: string;
  started_at?: string;
  ended_at?: string;
  entries: StandupEntry[];
  summary?: StandupSummary;
  created_at: string;
  updated_at: string;
}
