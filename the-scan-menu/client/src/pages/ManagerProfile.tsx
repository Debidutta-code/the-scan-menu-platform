import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  LogOut,
  Shield,
  MapPin,
  Phone,
  Loader,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  User,
  CheckCircle2,
  Building2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from '../hooks/useToast';

export const ManagerProfile: React.FC = () => {
  const { user, activeRestaurantId, logout } = useAuth();
  const { toast } = useToast();

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  // Change password state
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch Restaurant Info for Profile
  const { data: restaurantData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['restaurantProfileInfo', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.patch('/auth/profile', { name });
      return res.data;
    },
    onSuccess: () => {
      toast('Name updated successfully!', 'success');
      setIsEditingName(false);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update name', 'error');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await apiClient.post('/auth/change-password', payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Password changed! Please log in again.', 'success');
      setIsChangingPw(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => logout(), 1500);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to change password', 'error');
    },
  });

  const handleSaveName = () => {
    if (!newName.trim()) return;
    updateNameMutation.mutate(newName.trim());
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast('All password fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters', 'error');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-3">
        <Loader className="w-10 h-10 text-amber-500 animate-spin" strokeWidth={2} />
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-xs max-w-sm">
          You are currently not associated as a manager with any restaurant. Please contact a Super Admin.
        </p>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader className="w-9 h-9 animate-spin text-amber-500" strokeWidth={2} />
        <span className="text-xs font-semibold text-slate-500">Loading Profile Details...</span>
      </div>
    );
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'M';

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-amber-400 font-mono text-xs font-black shadow-2xs shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">Manager Account</h1>
            <p className="text-xs text-slate-500 font-medium">Personal profile, credentials, and restaurant association</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 text-xs font-bold rounded-2xl transition flex items-center gap-2 shadow-2xs active:scale-95 shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          Log Out Session
        </button>
      </div>

      {/* ── 2-COLUMN PROFILE LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: HERO USER CARD & QUICK STATS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
            {/* Ambient Background Blur Circle */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-3 relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center font-mono font-black text-2xl shadow-lg ring-4 ring-white/10">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl font-bold font-display text-white tracking-tight">{user?.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  <Shield className="w-3.5 h-3.5" strokeWidth={2} />
                  {user?.role || 'MANAGER'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-bold text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                  Verified Session
                </span>
              </div>
            </div>

            {/* Quick Meta List */}
            <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-300 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Role</span>
                <span className="font-bold text-white uppercase">{user?.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Outlet</span>
                <span className="font-bold text-amber-400 truncate max-w-[180px]">
                  {restaurantData?.data?.name || 'Assigned Restaurant'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Security Status</span>
                <span className="text-emerald-400 font-semibold font-mono">Active &amp; Authenticated</span>
              </div>
            </div>
          </div>

          {/* Active Outlet Card */}
          {restaurantData?.success && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
                    Associated Outlet
                  </h3>
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    {restaurantData.data.name}
                  </h4>
                </div>
              </div>

              {restaurantData.data.description && (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  "{restaurantData.data.description}"
                </p>
              )}

              <div className="space-y-2 pt-1 text-xs text-slate-600 font-medium">
                {restaurantData.data.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span>{restaurantData.data.address}</span>
                  </div>
                )}
                {restaurantData.data.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span className="font-mono">{restaurantData.data.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACCOUNT & SECURITY SETTINGS (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Account Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" strokeWidth={2} />
                <h3 className="text-sm font-bold font-display text-slate-900 tracking-tight">Account Details</h3>
              </div>
              {!isEditingName && (
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setNewName(user?.name || '');
                  }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Edit Name
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Display Name */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                  Full Display Name
                </span>

                {isEditingName ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={updateNameMutation.isPending}
                      className="px-3.5 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {updateNameMutation.isPending ? (
                        <Loader className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setNewName(user?.name || '');
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl font-bold text-slate-900">
                    {user?.name}
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                  Registered Email
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-slate-700 flex items-center justify-between">
                  <span>{user?.email}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
                    Read-only
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" strokeWidth={2} />
                <h3 className="text-sm font-bold font-display text-slate-900 tracking-tight">Security &amp; Password</h3>
              </div>
              {!isChangingPw && (
                <button
                  onClick={() => setIsChangingPw(true)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} /> Update Password
                </button>
              )}
            </div>

            {isChangingPw ? (
              <div className="space-y-3 text-xs">
                {/* Current password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    New Password (Min 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {confirmPassword && newPassword && (
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${
                    newPassword === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="flex-1 py-3 bg-slate-950 text-white rounded-xl text-xs font-extrabold hover:bg-slate-900 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                        Update Password
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPw(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Changing your password will require you to log in again on your next session to verify your credentials.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerProfile;
