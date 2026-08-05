import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  User,
  Key,
  Loader,
} from 'lucide-react';

export const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl font-mono shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">{user?.name || 'Super Admin'}</h2>
            <p className="text-xs text-amber-400 font-mono font-semibold uppercase tracking-wider mt-0.5">
              Platform SuperAdmin Account
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Profile Info Details (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
            <span>Account Profile</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Display Name</span>
              <p className="font-bold text-slate-900 mt-0.5">{user?.name}</p>
            </div>

            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Email Address</span>
              <p className="font-bold text-slate-900 font-mono mt-0.5">{user?.email}</p>
            </div>

            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Role & Permissions</span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold font-mono text-[10px] uppercase">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Security / Password Change Form (2/3 width) */}
        <div className="md:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-slate-700" strokeWidth={1.75} />
              <span>Change Security Password</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Ensure your Super Admin account uses a strong password.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminProfile;
