import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  LogOut,
  Shield,
  Mail,
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Loader className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1">
          You are currently not associated as a manager with any restaurant. Please contact a Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      {isLoadingProfile ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
        </div>
      ) : (
        <div className="max-w-md w-full space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
            {/* Top header */}
            <div className="bg-slate-950 p-6 text-white text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center text-amber-500 font-extrabold mb-3 text-2xl border border-white/10 shadow-inner">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-display tracking-tight text-3xl font-normal">
                {user?.name}
              </h2>
              <span className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                <Shield className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                {user?.role}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Account details */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">My Account</h4>

                {/* Name row */}
                <div className="space-y-2">
                  {isEditingName ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-600">Display Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={updateNameMutation.isPending}
                          className="px-3 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          {updateNameMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => { setIsEditingName(false); setNewName(user?.name || ''); }}
                          className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                        <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                        <span>{user?.name}</span>
                      </div>
                      <button
                        onClick={() => { setIsEditingName(true); setNewName(user?.name || ''); }}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 py-1.5 border-b border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <span className="font-mono">{user?.email}</span>
                </div>
              </div>

              {/* Restaurant Profile */}
              {restaurantData?.success && (
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Active Restaurant
                  </h4>
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 space-y-3">
                    <h3 className="font-bold text-sm text-slate-900">{restaurantData.data.name}</h3>
                    {restaurantData.data.description && (
                      <p className="text-xs text-slate-500 leading-normal">{restaurantData.data.description}</p>
                    )}
                    <div className="space-y-2.5 pt-2 text-[11px] font-medium text-slate-600">
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
                </div>
              )}

              <button
                onClick={logout}
                className="w-full mt-4 py-3.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl text-red-600 hover:text-red-700 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                <span>Log Out from Session</span>
              </button>
            </div>
          </div>

          {/* Change Password card */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Security</h4>
              </div>
              {!isChangingPw && (
                <button
                  onClick={() => setIsChangingPw(true)}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Change Password
                </button>
              )}
            </div>

            {isChangingPw ? (
              <div className="space-y-3">
                {/* Current password */}
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* New password */}
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm password */}
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm pr-10 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {confirmPassword && newPassword && (
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="flex-1 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Lock className="w-3.5 h-3.5" /> Update Password</>
                    )}
                  </button>
                  <button
                    onClick={() => { setIsChangingPw(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Your password was last updated via account setup. Changing your password will log you out of all sessions.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerProfile;
