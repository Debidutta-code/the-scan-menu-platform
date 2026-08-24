import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/restaurant.service';
import { useToast } from '../../hooks/useToast';
import { Store, UserCheck, Loader, X, Sparkles, ShieldCheck } from 'lucide-react';

interface QuickOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickOnboardModal: React.FC<QuickOnboardModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [planKey, setPlanKey] = useState<'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('Test@1234');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const provisionMutation = useMutation({
    mutationFn: adminService.provisionRestaurant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupHubOutlets'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast('Outlet onboarded successfully! Launching Setup Studio...', 'success');
      onClose();
      // Reset state
      setName('');
      setSlug('');
      setManagerName('');
      setManagerEmail('');
      setManagerPassword('Test@1234');
      setErrorMsg(null);

      const newRestId = data?.data?.restaurant?._id;
      if (newRestId) {
        navigate(`/admin/restaurants/${newRestId}`);
      } else {
        navigate('/admin/setup-hub');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Error creating outlet');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Restaurant Outlet Name is required.');
      return;
    }
    if (!managerName.trim() || !managerEmail.trim() || !managerPassword.trim()) {
      setErrorMsg('Manager name, email, and temporary password are required.');
      return;
    }

    provisionMutation.mutate({
      restaurant: {
        name: name.trim(),
        slug: slug.trim() || undefined,
        planKey,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
      manager: {
        name: managerName.trim(),
        email: managerEmail.trim(),
        password: managerPassword.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg md:text-xl font-bold text-slate-900 leading-tight">
                Onboard New Outlet
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick 1-step tenant creation. Configure full setup in the Studio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outlet Details */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-500" />
              <span>Outlet Identity</span>
            </label>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Restaurant / Outlet Name *</label>
              <input
                type="text"
                placeholder="e.g. The Woodfired Bistro"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
                required
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">URL Slug</label>
                <div className="mt-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-500 font-mono">
                  <span>/r/</span>
                  <input
                    type="text"
                    placeholder="woodfired-bistro"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-transparent text-slate-900 font-bold focus:outline-none ml-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Subscription Plan</label>
                <select
                  value={planKey}
                  onChange={(e) => setPlanKey(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="ENTERPRISE">Enterprise (Full POS + KDS + Flags)</option>
                  <option value="PROFESSIONAL">Professional Plan</option>
                  <option value="STARTER">Starter Plan</option>
                  <option value="FREE">Free Tier</option>
                </select>
              </div>
            </div>
          </div>

          {/* Primary Manager Account */}
          <div className="space-y-3 pt-2 border-t border-slate-150">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Primary Manager Account</span>
            </label>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Manager Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Alice Smith"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Manager Email *</label>
                <input
                  type="email"
                  placeholder="manager@restaurant.com"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  required
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Login Password *</label>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  required
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={provisionMutation.isPending}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {provisionMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-slate-950" />
              )}
              <span>Create Outlet & Launch Studio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
