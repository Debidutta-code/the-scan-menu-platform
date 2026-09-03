import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldCheck, Loader } from 'lucide-react';
import { OtpModalProps } from '../types';

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  isPlacingOrder = false,
  isVerifyingOtp,
  isSendingOtp,
  otpSent,
  customerOtpEnabled = false,
  customerName,
  phoneNumber,
  otpDigits,
  otpCooldownRemaining,
  tableDisplayName,
  otpInputRefs,
  onClose,
  onNameChange,
  onPhoneChange,
  onSendOtp,
  onVerifyOtpAndPlaceOrder,
  onVerifyOtp,
  onDirectPlaceOrder,
  onOtpDigitsChange,
  onResetOtpSent,
}) => {
  const handleVerify = onVerifyOtp || onVerifyOtpAndPlaceOrder;
  const handleDirectPlace = onDirectPlaceOrder || onVerifyOtpAndPlaceOrder || onVerifyOtp;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!isPlacingOrder && !isVerifyingOtp && !isSendingOtp) onClose();
            }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl font-sans overflow-hidden"
          >
            {/* Drag handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3" />

            <div className="px-6 pb-8 space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h3 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  <span>{customerOtpEnabled ? 'Verify Phone to Order' : 'Your Details'}</span>
                </h3>
                <button
                  onClick={onClose}
                  disabled={isPlacingOrder || isVerifyingOtp || isSendingOtp}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {/* ── Mode 1: OTP Disabled (Direct Name + Phone Entry) ── */}
              {!customerOtpEnabled ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Enter your name and mobile number to place your order at <strong className="text-slate-700">{tableDisplayName}</strong>.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                      Your Name <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="E.g., Alice Sharma"
                      value={customerName}
                      onChange={(e) => onNameChange(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                      Mobile Number <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono font-bold text-slate-400 select-none">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="98765 43210"
                        value={phoneNumber}
                        onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono font-bold tracking-wide"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
                    <span>Your contact details are used for order confirmation and dining updates.</span>
                  </p>

                  <button
                    onClick={handleDirectPlace}
                    disabled={isPlacingOrder || phoneNumber.length < 10 || !customerName.trim()}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                  >
                    {isPlacingOrder && <Loader className="w-4 h-4 animate-spin text-slate-950" />}
                    <span>{isPlacingOrder ? 'Placing Order...' : 'Place Order'}</span>
                  </button>
                </div>
              ) : !otpSent ? (
                /* ── Mode 2: OTP Enabled - Step 1: Request OTP ── */
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Enter your name and mobile number to unlock your loyalty points and order at {tableDisplayName}.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Your Name</label>
                    <input
                      type="text"
                      placeholder="E.g., Alice Sharma"
                      value={customerName}
                      onChange={(e) => onNameChange(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Mobile Number</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono font-bold text-slate-400 select-none">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="98765 43210"
                        value={phoneNumber}
                        onChange={(e) => onPhoneChange(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono font-bold tracking-wide"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
                    <span>Your phone number is strictly private and never shared.</span>
                  </p>

                  <button
                    onClick={onSendOtp}
                    disabled={isSendingOtp || phoneNumber.length < 10 || !customerName.trim()}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                  >
                    {isSendingOtp && <Loader className="w-4 h-4 animate-spin text-amber-400" />}
                    <span>Get 4-Digit PIN</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <p className="text-sm text-slate-600 leading-normal">
                      Enter the 4-digit PIN sent to <strong className="text-slate-900">+91 {phoneNumber}</strong>
                    </p>
                  </div>

                  {/* 4-Box PIN Input */}
                  <div className="space-y-2">
                    <div className="flex justify-center gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const newDigits = [...otpDigits];
                            newDigits[idx] = val ? val[val.length - 1] : '';
                            onOtpDigitsChange(newDigits);
                            if (val && idx < 3) {
                              otpInputRefs.current[idx + 1]?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                              otpInputRefs.current[idx - 1]?.focus();
                            }
                          }}
                          className={`w-12 h-14 text-center text-xl font-bold font-mono border rounded-2xl focus:outline-none transition-all ${
                            digit
                              ? 'border-amber-500 bg-amber-50/20 text-slate-900 ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-slate-50/50 text-slate-400 focus:border-amber-500 focus:bg-white'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                        <span className="text-[11px] text-amber-700">Demo PIN:</span>
                        <span className="text-[11px] font-black font-mono text-amber-700 tracking-widest">0 0 0 0</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {otpCooldownRemaining > 0 ? (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Resend in {otpCooldownRemaining}s
                      </span>
                    ) : (
                      <button
                        onClick={onSendOtp}
                        disabled={isSendingOtp}
                        className="text-[11px] text-amber-600 hover:text-amber-800 font-bold underline transition cursor-pointer"
                      >
                        Resend PIN
                      </button>
                    )}
                    <button
                      onClick={onResetOtpSent}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Change Phone
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={onResetOtpSent}
                      disabled={isPlacingOrder || isVerifyingOtp}
                      className="w-1/3 py-3 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={isPlacingOrder || isVerifyingOtp || otpDigits.join('').length !== 4}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer"
                    >
                      {isVerifyingOtp && <Loader className="w-4 h-4 animate-spin text-slate-950" />}
                      <span>Verify & Continue to Cart</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
