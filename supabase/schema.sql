-- ============================================================
-- VELTROQIS — Supabase Database Schema (complete, v2)
-- Run this entire file in Supabase → SQL Editor → New Query
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS  (mirrors auth.users, auto-populated on signup)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT        NOT NULL UNIQUE,
  full_name    TEXT        NOT NULL DEFAULT '',
  avatar_url   TEXT,
  role         TEXT        NOT NULL DEFAULT 'admin'
                           CHECK (role IN ('admin','project_lead','designer','developer','qa')),
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','inactive','pending')),
  designation  TEXT,
  department   TEXT,
  phone        TEXT,
  location     TEXT,
  bio          TEXT,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','on_hold','completed','archived')),
  lead_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  start_date   DATE,
  deadline     DATE,
  created_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id)    ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- ============================================================
-- SPRINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sprints (
  id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id              UUID        REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name                    TEXT        NOT NULL,
  goal                    TEXT,
  start_date              DATE        NOT NULL,
  end_date                DATE        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'planning'
                                      CHECK (status IN ('planning','active','completed')),
  total_story_points      INTEGER     DEFAULT 0,
  completed_story_points  INTEGER     DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- NOTE: status includes all board columns used in the UI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id    UUID        REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  sprint_id     UUID        REFERENCES public.sprints(id)  ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'backlog'
                            CHECK (status IN ('backlog','todo','in_progress','code_review','review','testing','done')),
  priority      TEXT        NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low','medium','high','critical')),
  assignee_ids  UUID[]      NOT NULL DEFAULT '{}',
  reporter_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  due_date      DATE,
  labels        TEXT[]      DEFAULT '{}',
  story_points  INTEGER,
  comment_count INTEGER     NOT NULL DEFAULT 0,
  order_index   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBTASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id     UUID        REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title       TEXT        NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ISSUES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.issues (
  id                 UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id         UUID        REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id            UUID        REFERENCES public.tasks(id)    ON DELETE SET NULL,
  title              TEXT        NOT NULL,
  description        TEXT,
  type               TEXT        NOT NULL DEFAULT 'bug'
                                 CHECK (type IN ('bug','feature_request','improvement')),
  severity           TEXT        NOT NULL DEFAULT 'major'
                                 CHECK (severity IN ('minor','major','critical','blocker')),
  status             TEXT        NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open','in_progress','resolved','closed')),
  reporter_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  assignee_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  steps_to_reproduce TEXT,
  comment_count      INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('task','issue')),
  entity_id   UUID        NOT NULL,
  author_id   UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content     TEXT        NOT NULL,
  parent_id   UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('admin','project_lead','designer','developer','qa')),
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','expired','cancelled')),
  invited_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  message     TEXT,
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  entity_type TEXT,
  entity_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  entity_name TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG — append helper + table triggers (auditable events)
-- ============================================================
-- Inserts bypass client RLS via SECURITY DEFINER.  Triggers record projects,
-- tasks (incl. scrumboard status / assignees), issues, users, invitations.
-- ============================================================

CREATE OR REPLACE FUNCTION public.append_activity_log(
  p_user_id     UUID,
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_entity_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, entity_name)
  VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    LEFT(COALESCE(p_entity_name, ''), 500)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.append_activity_log(_actor, 'project.created', 'project', NEW.id, NEW.name);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.lead_id IS DISTINCT FROM NEW.lead_id
       OR OLD.start_date IS DISTINCT FROM NEW.start_date
       OR OLD.deadline IS DISTINCT FROM NEW.deadline
       OR OLD.created_by IS DISTINCT FROM NEW.created_by
    THEN
      PERFORM public.append_activity_log(_actor, 'project.updated', 'project', NEW.id, NEW.name);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.append_activity_log(_actor, 'task.created', 'task', NEW.id, NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (
      OLD.title IS NOT DISTINCT FROM NEW.title
      AND OLD.description IS NOT DISTINCT FROM NEW.description
      AND OLD.status IS NOT DISTINCT FROM NEW.status
      AND OLD.priority IS NOT DISTINCT FROM NEW.priority
      AND OLD.assignee_ids IS NOT DISTINCT FROM NEW.assignee_ids
      AND OLD.due_date IS NOT DISTINCT FROM NEW.due_date
      AND OLD.labels IS NOT DISTINCT FROM NEW.labels
      AND OLD.story_points IS NOT DISTINCT FROM NEW.story_points
      AND OLD.sprint_id IS NOT DISTINCT FROM NEW.sprint_id
      AND OLD.order_index IS NOT DISTINCT FROM NEW.order_index
      AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
      AND OLD.reporter_id IS NOT DISTINCT FROM NEW.reporter_id
    ) THEN
      RETURN NEW;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.append_activity_log(
        _actor, 'task.status_changed', 'task', NEW.id,
        NEW.title || ' → ' || NEW.status
      );
    END IF;
    IF OLD.assignee_ids IS DISTINCT FROM NEW.assignee_ids THEN
      PERFORM public.append_activity_log(_actor, 'task.assignees_updated', 'task', NEW.id, NEW.title);
    END IF;
    IF OLD.title IS DISTINCT FROM NEW.title
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.priority IS DISTINCT FROM NEW.priority
       OR OLD.due_date IS DISTINCT FROM NEW.due_date
       OR OLD.labels IS DISTINCT FROM NEW.labels
       OR OLD.story_points IS DISTINCT FROM NEW.story_points
       OR OLD.sprint_id IS DISTINCT FROM NEW.sprint_id
       OR OLD.order_index IS DISTINCT FROM NEW.order_index
       OR OLD.project_id IS DISTINCT FROM NEW.project_id
       OR OLD.reporter_id IS DISTINCT FROM NEW.reporter_id
    THEN
      PERFORM public.append_activity_log(_actor, 'task.updated', 'task', NEW.id, NEW.title);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_issue_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.append_activity_log(_actor, 'issue.created', 'issue', NEW.id, NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (
      OLD.title IS NOT DISTINCT FROM NEW.title
      AND OLD.description IS NOT DISTINCT FROM NEW.description
      AND OLD.type IS NOT DISTINCT FROM NEW.type
      AND OLD.severity IS NOT DISTINCT FROM NEW.severity
      AND OLD.status IS NOT DISTINCT FROM NEW.status
      AND OLD.reporter_id IS NOT DISTINCT FROM NEW.reporter_id
      AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id
      AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
      AND OLD.task_id IS NOT DISTINCT FROM NEW.task_id
      AND OLD.comment_count IS NOT DISTINCT FROM NEW.comment_count
    ) THEN
      RETURN NEW;
    END IF;
    PERFORM public.append_activity_log(_actor, 'issue.updated', 'issue', NEW.id, NEW.title);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.append_activity_log(
      COALESCE(_actor, NEW.id),
      'user.created',
      'user',
      NEW.id,
      NEW.full_name
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.append_activity_log(
        _actor,
        'user.role_changed',
        'user',
        NEW.id,
        NEW.full_name || ' → ' || NEW.role
      );
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.full_name IS DISTINCT FROM NEW.full_name
       OR OLD.email IS DISTINCT FROM NEW.email
    THEN
      IF OLD.role IS DISTINCT FROM NEW.role THEN
        NULL;
      ELSE
        PERFORM public.append_activity_log(_actor, 'user.updated', 'user', NEW.id, NEW.full_name);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_invitation_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.append_activity_log(
    auth.uid(),
    'invitation.sent',
    'invitation',
    NEW.id,
    NEW.email || ' (' || NEW.role || ')'
  );
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_project_ai') THEN
    CREATE TRIGGER trg_log_project_ai AFTER INSERT ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.log_project_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_project_au') THEN
    CREATE TRIGGER trg_log_project_au AFTER UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.log_project_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_task_ai') THEN
    CREATE TRIGGER trg_log_task_ai AFTER INSERT ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_task_au') THEN
    CREATE TRIGGER trg_log_task_au AFTER UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_issue_ai') THEN
    CREATE TRIGGER trg_log_issue_ai AFTER INSERT ON public.issues
      FOR EACH ROW EXECUTE FUNCTION public.log_issue_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_issue_au') THEN
    CREATE TRIGGER trg_log_issue_au AFTER UPDATE ON public.issues
      FOR EACH ROW EXECUTE FUNCTION public.log_issue_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_user_ai') THEN
    CREATE TRIGGER trg_log_user_ai AFTER INSERT ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.log_user_profile_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_user_au') THEN
    CREATE TRIGGER trg_log_user_au AFTER UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.log_user_profile_activity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_invitation_ai') THEN
    CREATE TRIGGER trg_log_invitation_ai AFTER INSERT ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.log_invitation_activity();
  END IF;
END $$;

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type  TEXT        NOT NULL CHECK (entity_type IN ('task','issue','project')),
  entity_id    UUID        NOT NULL,
  file_name    TEXT        NOT NULL,
  file_url     TEXT        NOT NULL,
  file_size    INTEGER     NOT NULL,
  file_type    TEXT        NOT NULL,
  uploaded_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at')    THEN CREATE TRIGGER update_users_updated_at    BEFORE UPDATE ON public.users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at')    THEN CREATE TRIGGER update_tasks_updated_at    BEFORE UPDATE ON public.tasks    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_issues_updated_at')   THEN CREATE TRIGGER update_issues_updated_at   BEFORE UPDATE ON public.issues   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); END IF;
END $$;

-- ============================================================
-- AUTO-INCREMENT comment_count  (tasks & issues)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entity_type = 'task' THEN
    UPDATE public.tasks  SET comment_count = comment_count + 1 WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'issue' THEN
    UPDATE public.issues SET comment_count = comment_count + 1 WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_comment_inserted') THEN
    CREATE TRIGGER on_comment_inserted AFTER INSERT ON public.comments
      FOR EACH ROW EXECUTE FUNCTION increment_comment_count();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.entity_type = 'task' THEN
    UPDATE public.tasks  SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.entity_id;
  ELSIF OLD.entity_type = 'issue' THEN
    UPDATE public.issues SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.entity_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_comment_deleted') THEN
    CREATE TRIGGER on_comment_deleted AFTER DELETE ON public.comments
      FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();
  END IF;
END $$;

-- ============================================================
-- AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role TEXT;
BEGIN
  -- Read role from signup metadata so invitation-based flows can pre-assign roles.
  -- 'admin' is intentionally excluded — admins can only be created by an existing
  -- admin via the UI or the one-time bootstrap_first_admin() function below.
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'developer');

  IF _role NOT IN ('project_lead', 'designer', 'developer', 'qa') THEN
    _role := 'developer';
  END IF;

  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    _role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BOOTSTRAP FIRST ADMIN
-- ============================================================
-- Safe one-time-use function to create the very first admin.
-- After at least one admin exists, this function becomes a no-op, so it is
-- safe to leave deployed.  Call it from the Supabase SQL Editor:
--
--   SELECT public.bootstrap_first_admin('<your-user-uuid>');
--
-- You can find your UUID under Authentication → Users in the Supabase dashboard.
-- ============================================================
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _admin_count  INTEGER;
  _profile_exists BOOLEAN;
  _auth_email   TEXT;
  _auth_name    TEXT;
  _auth_avatar  TEXT;
  _auth_created TIMESTAMPTZ;
BEGIN
  -- Guard: no-op once an admin already exists (safe to call repeatedly)
  SELECT COUNT(*) INTO _admin_count FROM public.users WHERE role = 'admin';
  IF _admin_count > 0 THEN
    RETURN 'Skipped: an admin already exists. Use the User Management page to promote users.';
  END IF;

  -- Check if profile row already exists in public.users
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = target_user_id)
    INTO _profile_exists;

  IF NOT _profile_exists THEN
    -- The trigger was missing when this user signed up — their row in auth.users
    -- exists but public.users was never populated.  Read the auth record and
    -- create the missing profile now before promoting.
    SELECT
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
      au.raw_user_meta_data->>'avatar_url',
      au.created_at
    INTO _auth_email, _auth_name, _auth_avatar, _auth_created
    FROM auth.users au
    WHERE au.id = target_user_id;

    IF _auth_email IS NULL THEN
      RETURN 'Error: UUID ' || target_user_id
          || ' was not found in auth.users either. '
          || 'Check the UUID under Authentication → Users in the Supabase dashboard.';
    END IF;

    -- Create the missing profile row directly as admin
    INSERT INTO public.users (id, email, full_name, avatar_url, role, joined_at, created_at, updated_at)
    VALUES (
      target_user_id,
      _auth_email,
      _auth_name,
      _auth_avatar,
      'admin',
      _auth_created,
      _auth_created,
      NOW()
    );

    RETURN 'Success (profile auto-created): user ' || target_user_id
        || ' (' || _auth_email || ') has been created as admin. '
        || 'This function will be a no-op for all future calls.';
  END IF;

  -- Profile already exists — just promote it
  UPDATE public.users
  SET    role       = 'admin',
         updated_at = NOW()
  WHERE  id = target_user_id;

  RETURN 'Success: user ' || target_user_id || ' is now an admin. '
      || 'This function will be a no-op for all future calls.';
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================================
-- RLS HELPER FUNCTIONS  (breaks projects ↔ project_members recursion)
-- ============================================================
-- Direct policies that SELECT from `projects` inside `project_members` policies,
-- while `projects` policies also SELECT from `project_members`, cause PostgreSQL
-- error 42P17 ("infinite recursion detected in policy for relation …").
--
-- These SECURITY DEFINER helpers query the underlying tables with the definer's
-- rights, which bypasses RLS and removes the circular dependency graph.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_admin_or_project_lead()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin','project_lead')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_lead(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.lead_id IS NOT NULL AND p.lead_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = _project_id AND pm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.auth_is_admin()
      OR public.is_project_lead(_project_id, auth.uid())
      OR public.is_project_member(_project_id, auth.uid())
      -- Creator can read immediately after INSERT.returning before member row exists
      OR EXISTS (
           SELECT 1 FROM public.projects p
           WHERE p.id = _project_id AND p.created_by = auth.uid()
         );
$$;

GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_admin_or_project_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_lead(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_project(UUID) TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop stale policies before re-creating (idempotent)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- USERS
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Any authenticated user may update their own profile row.
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins may update ANY user row (e.g. to change role or status).
-- The sub-select uses auth.uid() directly so there is no circular RLS recursion;
-- users_select is auth.role()='authenticated' which does not re-enter this policy.
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "users_insert_service" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PROJECTS — visibility via helpers (no direct projects↔project_members cross-queries)
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (public.user_can_access_project(public.projects.id));
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (public.auth_is_admin_or_project_lead());
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (public.auth_is_admin_or_project_lead());
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (public.auth_is_admin());

-- PROJECT MEMBERS
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    public.auth_is_admin()
    OR user_id = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
  );
CREATE POLICY "project_members_manage" ON public.project_members
  FOR ALL USING (public.auth_is_admin_or_project_lead());

-- SPRINTS
CREATE POLICY "sprints_select" ON public.sprints
  FOR SELECT USING (public.user_can_access_project(project_id));
CREATE POLICY "sprints_manage" ON public.sprints
  FOR ALL USING (public.auth_is_admin_or_project_lead())
  WITH CHECK (public.auth_is_admin_or_project_lead());

-- TASKS
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (public.user_can_access_project(project_id));
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (public.auth_is_admin_or_project_lead());

-- SUBTASKS
CREATE POLICY "subtasks_all" ON public.subtasks
  FOR ALL USING (auth.role() = 'authenticated');

-- ISSUES
CREATE POLICY "issues_all" ON public.issues
  FOR ALL USING (auth.role() = 'authenticated');

-- COMMENTS
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- INVITATIONS
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','project_lead'))
  );
CREATE POLICY "invitations_manage" ON public.invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','project_lead'))
  );

-- NOTIFICATIONS — own only
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ACTIVITY LOGS — admin: full audit feed; others: rows for entities they can access (task detail)
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT USING (public.auth_is_admin());
CREATE POLICY "activity_logs_select_task_access" ON public.activity_logs
  FOR SELECT USING (
    entity_type = 'task'
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = activity_logs.entity_id
        AND public.user_can_access_project(t.project_id)
    )
  );
CREATE POLICY "activity_logs_select_project_access" ON public.activity_logs
  FOR SELECT USING (
    entity_type = 'project'
    AND public.user_can_access_project(entity_id)
  );
CREATE POLICY "activity_logs_select_issue_access" ON public.activity_logs
  FOR SELECT USING (
    entity_type = 'issue'
    AND EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = activity_logs.entity_id
        AND public.user_can_access_project(i.project_id)
    )
  );
-- No INSERT from clients — rows come only from append_activity_log() via triggers

-- ATTACHMENTS
CREATE POLICY "attachments_all" ON public.attachments
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('attachments', 'attachments', false)
  ON CONFLICT (id) DO NOTHING;

-- Avatars are public
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_user_upload' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_user_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_user_update' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attachments_auth' AND tablename = 'objects') THEN
    CREATE POLICY "attachments_auth" ON storage.objects FOR ALL USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS — admin → project stakeholders (SECURITY DEFINER)
-- Client RLS only allows users to write their own notification rows; this RPC
-- inserts for project lead + members (+ optional assignees) when an admin acts.
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.notify_project_stakeholders(
  p_project_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_extra_user_ids UUID[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  recipients UUID[];
  extras UUID[] := COALESCE(p_extra_user_ids, ARRAY[]::UUID[]);
BEGIN
  IF v_actor IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_actor AND role = 'admin') THEN
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[]::UUID[]) INTO recipients
  FROM (
    SELECT p.lead_id AS uid FROM public.projects p WHERE p.id = p_project_id AND p.lead_id IS NOT NULL
    UNION
    SELECT pm.user_id FROM public.project_members pm WHERE pm.project_id = p_project_id
    UNION
    SELECT x AS uid FROM unnest(extras) AS x
  ) s
  WHERE uid IS NOT NULL AND uid IS DISTINCT FROM v_actor;

  IF recipients IS NULL OR cardinality(recipients) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, actor_id)
  SELECT u, p_type, p_title, p_message, p_entity_type, p_entity_id, v_actor
  FROM unnest(recipients) AS u;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_project_stakeholders(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_project_stakeholders(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID[]) TO authenticated;

-- ============================================================
-- REALTIME
-- ============================================================
-- Idempotent: only add a table to the publication if it is not already a member.
DO $$
DECLARE
  _tables text[] := ARRAY[
    'public.notifications',
    'public.tasks',
    'public.comments',
    'public.activity_logs'
  ];
  _t text;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_publication_tables
      WHERE  pubname    = 'supabase_realtime'
        AND  schemaname = split_part(_t, '.', 1)
        AND  tablename  = split_part(_t, '.', 2)
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', _t);
    END IF;
  END LOOP;
END;
$$;
