import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/restaurant.service';
import { useToast } from '../../hooks/useToast';
import {
  Store,
  UserCheck,
  Loader,
  X,
  Sparkles,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  RefreshCw,
  AlertCircle,
  Zap,
  Crown,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface QuickOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlanType = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

const PLAN_OPTIONS: {
  key: PlanType;
  label: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'FREE',
    label: 'Free Tier',
    badge: '14-Day Trial',
    description: 'QR Menu & Catalog',
    icon: Sparkles,
  },
  {
    key: 'STARTER',
    label: 'Starter',
    badge: 'Essential',
    description: 'QR Menu + Waiter Call + Ordering',
    icon: Zap,
  },
  {
    key: 'PROFESSIONAL',
    label: 'Professional',
    badge: 'Popular',
    description: 'Payments + Live Analytics',
    icon: Layers,
  },
  {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    badge: 'All-Inclusive',
    description: 'Full POS + KDS + Multi-Flag Suite',
    icon: Crown,
  },
];

export const QuickOnboardModal: React.FC<QuickOnboardModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [planKey, setPlanKey] = useState<PlanType>('ENTERPRISE');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('Pass@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const provisionMutation = useMutation({
    mutationFn: adminService.provisionRestaurant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupHubOutlets'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast('Outlet onboarded successfully! Launching Setup Studio...', 'success');
      onClose();

      // Reset form state
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      setManagerName('');
      setManagerEmail('');
      setManagerPassword('Pass@1234');
      setErrorMsg(null);

      const newRestId = data?.data?.restaurant?._id;
      if (newRestId) {
        navigate(`/admin/restaurants/${newRestId}`);
      } else {
        navigate('/admin/setup-hub');
      }
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Error creating outlet. Please try again.';
      setErrorMsg(msg);
    },
  });

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManagerPassword(pass);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Restaurant / Outlet Name is required.');
      return;
    }
    if (!managerName.trim()) {
      setErrorMsg('Manager Full Name is required.');
      return;
    }
    if (!managerEmail.trim()) {
      setErrorMsg('Manager Email is required.');
      return;
    }
    if (!managerPassword.trim()) {
      setErrorMsg('Login Password is required.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Amber Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  Onboard New Outlet
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                  Instant Setup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick 1-step tenant creation. Launch directly into the Setup Studio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message Box */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SECTION 1: OUTLET IDENTITY */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Outlet Identity</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">* Required fields</span>
            </div>

            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Restaurant / Outlet Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. The Woodfired Bistro"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                />
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* URL Slug */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Menu URL Slug
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-500 font-mono focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/10 transition-all">
                <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                <span className="text-slate-400 font-semibold select-none">/r/</span>
                <input
                  type="text"
                  placeholder="woodfired-bistro"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  className="w-full bg-transparent text-slate-900 font-bold focus:outline-none ml-1 placeholder:text-slate-400 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-1">
                Customer QR access URL: <code className="text-amber-700 font-mono font-semibold">app.thescanmenu.com/r/{slug || 'outlet-name'}</code>
              </p>
            </div>

            {/* Subscription Plan Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subscription Plan Tier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLAN_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = planKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPlanKey(opt.key)}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-slate-900'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold leading-tight">{opt.label}</div>
                        <div className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: PRIMARY MANAGER ACCOUNT */}
          <div className="space-y-3.5 pt-4 border-t border-slate-100">
            <label className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Primary Manager Account</span>
            </label>

            {/* Manager Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Manager Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Alice Smith"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Manager Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Manager Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="manager@restaurant.com"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Login Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Login Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={provisionMutation.isPending}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {provisionMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Provisioning Outlet...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Create Outlet & Launch Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
