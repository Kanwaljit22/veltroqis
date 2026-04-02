import React, { useState } from 'react';
import {
  Shield,
  Bell,
  Globe,
  Palette,
  Database,
  Key,
  Users,
  ChevronRight,
  Check,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Checkbox } from '../components/ui/Checkbox';
import { Select } from '../components/ui/Select';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { ROLE_LABELS } from '../lib/utils';
import {
  ROLE_PERMISSION_MAP,
  PERMISSION_LABELS,
  PERMISSION_ORDER,
  ROLE_ORDER,
  hasPermission,
} from '../lib/permissions';

interface NotificationSettings {
  task_assigned: boolean;
  status_changed: boolean;
  comment_added: boolean;
  deadline_approaching: boolean;
  invitation_sent: boolean;
  email_notifications: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState<NotificationSettings>({
    task_assigned: true,
    status_changed: true,
    comment_added: true,
    deadline_approaching: true,
    invitation_sent: false,
    email_notifications: true,
  });
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Settings saved');
    setSaving(false);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your workspace preferences and permissions</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Sidebar Nav */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 h-fit">
          {[
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'permissions', icon: Shield, label: 'Permissions' },
            { id: 'localization', icon: Globe, label: 'Localization' },
            { id: 'appearance', icon: Palette, label: 'Appearance' },
            { id: 'integrations', icon: Database, label: 'Integrations' },
            { id: 'api', icon: Key, label: 'API Keys' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              {activeTab === id && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="xl:col-span-3 space-y-4">
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Notification Preferences</h3>
              <p className="text-sm text-slate-500 mb-6">Choose what you want to be notified about</p>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">In-App Notifications</h4>
                {[
                  { key: 'task_assigned', label: 'Task assigned to you', desc: 'When a task is assigned to you' },
                  { key: 'status_changed', label: 'Status changes', desc: 'When a task or issue status changes' },
                  { key: 'comment_added', label: 'New comments', desc: 'When someone comments on your tasks' },
                  { key: 'deadline_approaching', label: 'Deadline approaching', desc: 'Reminder 2 days before due date' },
                  { key: 'invitation_sent', label: 'Team invitations', desc: 'When someone joins via your invite' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <Checkbox
                      checked={notifications[key as keyof NotificationSettings]}
                      onChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Email Notifications</h4>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Email notifications</p>
                    <p className="text-xs text-slate-500">Receive all notifications via email as well</p>
                  </div>
                  <Checkbox
                    checked={notifications.email_notifications}
                    onChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, email_notifications: checked }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} loading={saving}>
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Role-Based Permissions</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Overview of what each role can do</p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                      {ROLE_ORDER.map((role) => (
                        <th
                          key={role}
                          className={`text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider ${
                            role === user?.role ? 'text-cyan-600' : 'text-slate-500'
                          }`}
                        >
                          {ROLE_LABELS[role]}
                          {role === user?.role && (
                            <span className="ml-1 text-[9px] bg-cyan-100 text-cyan-700 px-1 py-0.5 rounded-full font-medium">
                              You
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {PERMISSION_ORDER.map((permission) => (
                      <tr key={permission} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-4 text-sm text-slate-700 font-medium">
                          {PERMISSION_LABELS[permission]}
                        </td>
                        {ROLE_ORDER.map((role) => {
                          const allowed = hasPermission(role, permission);
                          const isCurrentRole = role === user?.role;
                          return (
                            <td key={role} className="py-3 px-3 text-center">
                              {allowed ? (
                                <div className={`inline-flex items-center justify-center h-6 w-6 rounded-full mx-auto ${isCurrentRole ? 'bg-cyan-100' : 'bg-green-50'}`}>
                                  <Check className={`h-3.5 w-3.5 ${isCurrentRole ? 'text-cyan-600' : 'text-green-500'}`} />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 mx-auto">
                                  <Lock className="h-3 w-3 text-slate-300" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Role legend */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Role Hierarchy
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_ORDER.map((role) => {
                    const permCount = ROLE_PERMISSION_MAP[role].length;
                    return (
                      <div
                        key={role}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                          role === user?.role
                            ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span>{ROLE_LABELS[role]}</span>
                        <span className="text-[10px] opacity-60">{permCount} permission{permCount !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isAdmin && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-700">
                    Only admins can modify role permissions. Contact your admin to make changes.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Localization</h3>
              <p className="text-sm text-slate-500 mb-6">Language, timezone, and date formats</p>

              <div className="space-y-4">
                <Select
                  label="Language"
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'ja', label: 'Japanese' },
                  ]}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
                <Select
                  label="Timezone"
                  options={[
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'Europe/London', label: 'London (GMT)' },
                    { value: 'Europe/Paris', label: 'Paris (CET)' },
                    { value: 'Asia/Kolkata', label: 'India (IST)' },
                    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                  ]}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
                <Select
                  label="Date Format"
                  options={[
                    { value: 'MMM d, yyyy', label: 'Jan 1, 2024' },
                    { value: 'dd/MM/yyyy', label: '01/01/2024' },
                    { value: 'MM/dd/yyyy', label: '01/01/2024 (US)' },
                    { value: 'yyyy-MM-dd', label: '2024-01-01' },
                  ]}
                  value="MMM d, yyyy"
                  onChange={() => {}}
                />
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} loading={saving}>
                  Save Settings
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Appearance</h3>
              <p className="text-sm text-slate-500 mb-6">Customize how Veltroqis looks for you</p>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">Color Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Default', from: 'from-slate-800', to: 'to-slate-600' },
                      { name: 'Ocean', from: 'from-blue-600', to: 'to-cyan-400' },
                      { name: 'Forest', from: 'from-green-600', to: 'to-emerald-400' },
                    ].map((theme) => (
                      <button
                        key={theme.name}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-colors"
                      >
                        <div className={`h-8 w-full rounded-lg bg-gradient-to-r ${theme.from} ${theme.to}`} />
                        <span className="text-xs text-slate-600">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">Mode</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Light', 'Dark (Coming Soon)'].map((mode) => (
                      <button
                        key={mode}
                        disabled={mode.includes('Coming')}
                        className="p-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-700"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Integrations</h3>
              <p className="text-sm text-slate-500 mb-6">Connect with your favorite tools</p>

              <div className="space-y-3">
                {[
                  { name: 'Slack', desc: 'Get notifications in Slack channels', available: true },
                  { name: 'GitHub', desc: 'Link commits and PRs to tasks', available: true },
                  { name: 'Jira', desc: 'Sync issues with Jira', available: false },
                  { name: 'Linear', desc: 'Import issues from Linear', available: false },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                      <p className="text-xs text-slate-500">{integration.desc}</p>
                    </div>
                    <Button
                      variant={integration.available ? 'outline' : 'secondary'}
                      size="sm"
                      disabled={!integration.available}
                    >
                      {integration.available ? 'Connect' : 'Coming Soon'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-1">API Keys</h3>
              <p className="text-sm text-slate-500 mb-6">Manage API access for external integrations</p>

              <div className="p-4 bg-slate-50 rounded-xl mb-4">
                <p className="text-xs font-medium text-slate-700 mb-1">Your API Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-600">
                    vlt_••••••••••••••••••••••••••••••••
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info('Key copied to clipboard')}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <Button variant="danger" size="sm">
                Regenerate API Key
              </Button>

              <div className="mt-6 p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-700">
                  Keep your API key secret. Never share it publicly or commit it to version control.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
