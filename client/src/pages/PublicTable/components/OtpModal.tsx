import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldCheck, Loader } from 'lucide-react';
import { OtpModalProps } from '../types';

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  isPlacingOrder,
  isVerifyingOtp,
  isSendingOtp,
  otpSent,
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
  onOtpDigitsChange,
  onResetOtpSent,
}) => {
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
              if (!isPlacingOrder && !isVerifyingOtp) onClose();
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
                  <span>Verify to Order</span>
                </h3>
                <button
                  onClick={onClose}
                  disabled={isPlacingOrder || isVerifyingOtp}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {!otpSent ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Enter your name and mobile number to place your kitchen order at {tableDisplayName}.
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
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 uppercase tracking-wider"
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

                  {/* Premium 4-Box PIN Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono text-center">Enter PIN</label>
                    <div className="flex justify-center gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { otpInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          autoFocus={idx === 0 && otpSent}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '').slice(-1);
                            const newDigits = [...otpDigits];
                            newDigits[idx] = val;
                            onOtpDigitsChange(newDigits);
                            if (val && idx < 3) {
                              otpInputRefs.current[idx + 1]?.focus();
                            }
                            if (val && idx === 3) {
                              const fullCode = newDigits.join('');
                              if (fullCode.length === 4) {
                                setTimeout(() => onVerifyOtpAndPlaceOrder(), 80);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && idx > 0) {
                              const newDigits = [...otpDigits];
                              newDigits[idx - 1] = '';
                              onOtpDigitsChange(newDigits);
                              otpInputRefs.current[idx - 1]?.focus();
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
                            if (pasted) {
                              const newDigits = ['', '', '', ''];
                              for (let i = 0; i < pasted.length && i < 4; i++) newDigits[i] = pasted[i];
                              onOtpDigitsChange(newDigits);
                              const focusIdx = Math.min(pasted.length, 3);
                              otpInputRefs.current[focusIdx]?.focus();
                              if (pasted.length === 4) setTimeout(() => onVerifyOtpAndPlaceOrder(), 80);
                            }
                          }}
                          className={`w-14 h-16 text-center text-2xl font-black font-mono rounded-2xl border-2 outline-none transition-all duration-150 ${
                            digit
                              ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-md shadow-amber-100'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          } focus:border-[var(--theme-accent)] focus:ring-4 focus:ring-[var(--theme-accent)]/15 focus:bg-white focus:shadow-lg`}
                        />
                      ))}
                    </div>

                    {/* Demo PIN hint badge */}
                    <div className="flex justify-center pt-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                        <span className="text-[11px] text-amber-700">Demo PIN:</span>
                        <span className="text-[11px] font-black font-mono text-amber-700 tracking-widest">0&nbsp;0&nbsp;0&nbsp;0</span>
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
                        className="text-[11px] text-amber-600 hover:text-amber-800 font-bold underline transition"
                      >
                        Resend PIN
                      </button>
                    )}
                    <button
                      onClick={onResetOtpSent}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Change Phone
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={onResetOtpSent}
                      disabled={isPlacingOrder || isVerifyingOtp}
                      className="w-1/3 py-3 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={onVerifyOtpAndPlaceOrder}
                      disabled={isPlacingOrder || isVerifyingOtp || otpDigits.join('').length !== 4}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 uppercase tracking-wide"
                    >
                      {(isPlacingOrder || isVerifyingOtp) && <Loader className="w-4 h-4 animate-spin text-slate-950" />}
                      <span>Verify & Place Order</span>
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
