import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Mail, Phone, MapPin, Briefcase, Calendar, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Avatar } from '../components/ui/Avatar';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { ROLE_LABELS, ROLE_COLORS, formatDate } from '../lib/utils';

interface GeneralForm {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  designation: string;
  department: string;
  bio: string;
}

interface SecurityForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerGeneral,
    handleSubmit: handleGeneral,
    formState: { errors: generalErrors },
  } = useForm<GeneralForm>({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      designation: user?.designation || '',
      department: user?.department || '',
      bio: user?.bio || '',
    },
  });

  const { register: registerSecurity, handleSubmit: handleSecurity } = useForm<SecurityForm>();

  const onGeneralSubmit = async (data: GeneralForm) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    await updateProfile(data);
    toast.success('Profile updated', 'Your changes have been saved.');
    setSaving(false);
  };

  const onSecuritySubmit = async (data: SecurityForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Password changed', 'Your password has been updated.');
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await updateProfile({ avatar_url: ev.target?.result as string });
      toast.success('Avatar updated');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
          <div className="relative group mb-4">
            <Avatar src={user?.avatar_url} name={user?.full_name || ''} size="xl" className="h-24 w-24 text-2xl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{user?.full_name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{user?.designation || 'Member'}</p>
          {user?.role && (
            <Badge className={`mt-2 ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </Badge>
          )}

          <div className="w-full mt-6 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            {user?.location && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>{user.location}</span>
              </div>
            )}
            {user?.department && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>{user.department}</span>
              </div>
            )}
            {user?.joined_at && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>Joined {formatDate(user.joined_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Card */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-1">Profile Information</h3>
          <p className="text-xs text-slate-500 mb-4">Update your personal information and bio</p>

          <Tabs
            tabs={[
              { id: 'general', label: 'General' },
              { id: 'security', label: 'Security' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="boxed"
            className="mb-6"
          />

          {activeTab === 'general' && (
            <form onSubmit={handleGeneral(onGeneralSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  error={generalErrors.full_name?.message}
                  {...registerGeneral('full_name', { required: 'Name required' })}
                />
                <Input
                  label="Email"
                  type="email"
                  error={generalErrors.email?.message}
                  {...registerGeneral('email', { required: 'Email required' })}
                />
                <Input label="Phone Number" {...registerGeneral('phone')} />
                <Input label="Location" {...registerGeneral('location')} />
                <Input label="Designation" {...registerGeneral('designation')} />
                <Input label="Department" {...registerGeneral('department')} />
              </div>
              <Textarea
                label="Bio"
                placeholder="Tell us about yourself..."
                rows={3}
                hint="Brief description for your profile. Max 250 characters."
                {...registerGeneral('bio')}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button">Cancel</Button>
                <Button
                  type="submit"
                  loading={saving}
                  icon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSecurity(onSecuritySubmit)} className="space-y-4">
              <Input
                label="Current Password"
                type={showCurrentPwd ? 'text' : 'password'}
                placeholder="Enter current password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowCurrentPwd((s) => !s)} className="text-slate-400 hover:text-slate-600">
                    {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...registerSecurity('currentPassword')}
              />
              <Input
                label="New Password"
                type={showNewPwd ? 'text' : 'password'}
                placeholder="Enter new password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowNewPwd((s) => !s)} className="text-slate-400 hover:text-slate-600">
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                hint="Min 8 characters with uppercase, number, and symbol."
                {...registerSecurity('newPassword')}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password"
                leftIcon={<Lock className="h-4 w-4" />}
                {...registerSecurity('confirmPassword')}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button">Cancel</Button>
                <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>
                  Update Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
