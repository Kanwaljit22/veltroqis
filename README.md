# Veltroqis — Intelligent Dev Collaboration Platform

A full-stack project management and dev collaboration platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication** — Email/password + Google OAuth, forgot password, email verification
- **Dashboard** — Live stats, activity feed, role distribution, task/bug charts
- **User Management** — RBAC with 5 roles (Admin, Project Lead, Designer, Developer, QA)
- **Projects** — Create/edit/delete projects with status, timeline, team assignment
- **Task Board** — Drag-and-drop Kanban with To Do / In Progress / Review / Done columns
- **Issue Tracker** — Bug reports, feature requests, improvements with severity levels
- **Invitations** — Token-based invite system with expiry and resend
- **Profile** — Avatar upload, personal info, password change
- **Notifications** — In-app notification center with read/unread states
- **Settings** — Notification preferences, permissions, localization, API keys

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Supabase (Auth, DB, Storage, Realtime) |
| Router | React Router v6 |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase (optional — app runs with mock data without it)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up Supabase database

In the Supabase SQL Editor, run the contents of `supabase/schema.sql`.

### 4. Start the dev server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **No Supabase?** The app runs fully with mock data out of the box. Just sign in with any email and you'll be logged in as the demo admin user.

## Demo Credentials (Mock Mode)

Any email/password combination works. The app logs you in as **John Doe (Admin)** with full access.

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar, Sidebar, AppLayout
│   └── ui/              # Button, Input, Modal, Badge, etc.
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── utils.ts         # Helpers, color maps, formatters
│   ├── mockData.ts      # Demo data for development
│   └── database.types.ts # Supabase DB type definitions
├── pages/
│   ├── auth/            # Login, Signup, ForgotPassword
│   ├── DashboardPage.tsx
│   ├── UserManagementPage.tsx
│   ├── InvitationsPage.tsx
│   ├── ProfilePage.tsx
│   ├── ProjectsPage.tsx
│   ├── ProjectDetailsPage.tsx
│   ├── TaskBoardPage.tsx
│   ├── IssueTrackerPage.tsx
│   └── SettingsPage.tsx
├── store/
│   ├── authStore.ts     # Zustand auth state
│   └── appStore.ts      # Zustand UI state
└── types/
    └── index.ts         # All TypeScript interfaces
supabase/
└── schema.sql           # Complete DB schema + RLS policies
```

## Supabase Features Used

- **Auth** — Email/password + OAuth (Google)
- **Database** — PostgreSQL with full schema
- **Row Level Security** — Role-based data access
- **Realtime** — Live updates on tasks, notifications
- **Storage** — Avatar and attachment uploads
- **Edge Functions** — (Ready for invite email triggers)

## Roles & Permissions

| Permission | Admin | Project Lead | Designer | Developer | QA |
|-----------|-------|-------------|---------|-----------|-----|
| Create Projects | ✓ | ✓ | | | |
| Delete Projects | ✓ | | | | |
| Assign Tasks | ✓ | ✓ | | | |
| Create Issues | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✓ | | | | |
| Send Invitations | ✓ | ✓ | | | |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
```
