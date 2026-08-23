import React from 'react';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffData: {
    name: string;
    email: string;
    password: string;
    role: 'MANAGER' | 'STAFF';
    pin: string;
    isActive: boolean;
  };
  setStaffData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      role: 'MANAGER' | 'STAFF';
      pin: string;
      isActive: boolean;
    }>
  >;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  staffData,
  setStaffData,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Staff Account</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={staffData.name}
              onChange={(e) => setStaffData({ ...staffData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Email Address *</label>
            <input
              type="email"
              placeholder="staff@restaurant.com"
              value={staffData.email}
              onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Login Password *</label>
            <input
              type="password"
              placeholder="Temporary password"
              value={staffData.password}
              onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Role</label>
              <select
                value={staffData.role}
                onChange={(e) => setStaffData({ ...staffData, role: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Captain / Waiter</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Captain PIN (4 Digits)</label>
              <input
                type="text"
                maxLength={4}
                placeholder="1234"
                value={staffData.pin}
                onChange={(e) => setStaffData({ ...staffData, pin: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!staffData.name || !staffData.email || !staffData.password || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  newPassword: string;
  setNewPassword: (pwd: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  newPassword,
  setNewPassword,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Reset Staff Password</h3>

        <div>
          <label className="text-[11px] font-bold text-slate-700">New Password *</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!newPassword || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};
