import React from 'react';
import { Plus, KeyRound, EyeOff, Eye, Trash2 } from 'lucide-react';
import { Staff } from '../../../../services/restaurant.service';

interface StaffTabProps {
  staffList: Staff[];
  revealPinForId: string | null;
  setRevealPinForId: (id: string | null) => void;
  onOpenAddStaffModal: () => void;
  onToggleStaffStatus: (staffId: string, currentStatus: boolean) => void;
  onOpenResetPasswordModal: (userId: string) => void;
  onDeleteStaff: (staffId: string) => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffList,
  revealPinForId,
  setRevealPinForId,
  onOpenAddStaffModal,
  onToggleStaffStatus,
  onOpenResetPasswordModal,
  onDeleteStaff,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900">
            Staff & Manager Accounts ({staffList.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign manager credentials, kitchen display staff, or captain PINs for mobile table taking.
          </p>
        </div>

        <button
          onClick={onOpenAddStaffModal}
          className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Staff Account</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((member: Staff) => (
          <div
            key={member._id}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 text-amber-400 font-extrabold text-sm flex items-center justify-center shadow-2xs">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{member.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-100 text-amber-900 uppercase">
                  {member.role}
                </span>
              </div>

              {/* PIN & Status display */}
              <div className="mt-3 flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/70">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-mono">
                    PIN: {revealPinForId === member._id ? member.pin || 'None' : member.pin ? '••••' : 'None'}
                  </span>
                </div>

                {member.pin && (
                  <button
                    onClick={() => setRevealPinForId(revealPinForId === member._id ? null : member._id)}
                    className="text-slate-400 hover:text-slate-700"
                    title={revealPinForId === member._id ? 'Hide PIN' : 'Reveal PIN'}
                  >
                    {revealPinForId === member._id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <button
                onClick={() => onToggleStaffStatus(member._id, member.isActive)}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                  member.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {member.isActive ? 'ACTIVE' : 'SUSPENDED'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenResetPasswordModal(member._id)}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 transition"
                >
                  Reset Password
                </button>

                <button
                  onClick={() => onDeleteStaff(member._id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                  title="Remove Staff"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {staffList.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            No staff accounts assigned. Click "Add Staff Account" to create a Manager.
          </div>
        )}
      </div>
    </div>
  );
};
