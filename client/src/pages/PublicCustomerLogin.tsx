import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Phone,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  Loader,
  Sparkles,
  Utensils,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useCustomerAuth } from '../hooks/useCustomerAuth';
import { useToast } from '../hooks/useToast';

export const PublicCustomerLogin: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendOtp, verifyOtp, isAuthenticated, customer } = useCustomerAuth();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated and no returnUrl, redirect to portal
  React.useEffect(() => {
    if (isAuthenticated && customer) {
      if (returnUrl) {
        navigate(returnUrl);
      } else if (restaurantSlug) {
        navigate(`/r/${restaurantSlug}/portal`);
      }
    }
  }, [isAuthenticated, customer, returnUrl, restaurantSlug, navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      toast('Please enter a valid phone number', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOtp(phone.trim(), restaurantSlug);
      if (res.success) {
        setOtpSent(true);
        setIsExistingUser(res.data.isExistingUser);
        if (res.data.customerName) {
          setName(res.data.customerName);
        }
        toast('Demo OTP sent! Use code 1234 to verify.', 'info');
      }
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Failed to send OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 4) {
      toast('Please enter the 4-digit verification code', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtp(phone.trim(), otp.trim(), restaurantSlug, undefined, name.trim());
      if (res.success) {
        toast(`Welcome, ${res.data.customer?.name || 'Diner'}!`, 'success');
        if (returnUrl) {
          navigate(returnUrl);
        } else if (restaurantSlug) {
          navigate(`/r/${restaurantSlug}/portal`);
        }
      }
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Invalid verification code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      <Helmet>
        <title>Diner Sign In - Pixora QR</title>
      </Helmet>

      {/* Decorative ambient glowing circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-2xl flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-amber-500/20">
            <Utensils className="w-7 h-7" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display tracking-tight text-3xl font-semibold text-white">
              Diner Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with your mobile number to view your order history & save preferences.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <AnimatePresence mode="wait">
          {!otpSent ? (
            <motion.form
              key="phone-step"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSendOtp}
              className="space-y-5"
            >
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </>
                )}
              </button>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-2.5 text-[11px] text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} />
                <span>Demo mode active. Code will be <strong>1234</strong>.</span>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="otp-step"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-400">
                  Verifying <strong className="text-amber-400 font-mono">{phone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>

              {/* Name field for new or returning customers */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Your Name {isExistingUser && <span className="text-slate-500 lowercase">(optional to update)</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                </div>
              </div>

              {/* OTP Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  4-Digit Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="1234"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-base font-mono font-bold tracking-widest text-center text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Back Link */}
        <div className="pt-2 text-center">
          {returnUrl ? (
            <Link
              to={returnUrl}
              className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Back to Menu / Order</span>
            </Link>
          ) : restaurantSlug ? (
            <Link
              to={`/r/${restaurantSlug}`}
              className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Back to Restaurant</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
            >
              Are you restaurant staff or manager? Staff Login &rarr;
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PublicCustomerLogin;
