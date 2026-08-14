import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BellRing, Loader, CheckCircle2, Clock } from 'lucide-react';
import { WaiterTabProps } from '../types';
import {
  ClocheBellIcon,
  ReceiptBillIcon,
  WaterBottleServiceIcon,
  TissuePaperServiceIcon,
  ChatOtherServiceIcon,
  ClappingHandsOutlineIcon,
} from '../icons';
import { formatCooldown } from '../utils';

export const WaiterTab: React.FC<WaiterTabProps> = ({
  selectedRequestType,
  waiterCallState,
  cooldownRemaining,
  recentWaiterCalls,
  onSelectRequestType,
  onTriggerWaiterCall,
  onResetWaiterCallState,
}) => {
  return (
    <motion.div
      key="waiter"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto px-4 py-3 space-y-5 flex flex-col pb-12"
    >
      {/* Top Hero Section: Title + Bell Graphic */}
      <div className="bg-gradient-to-b from-[#FBF9F5] via-[#FCFAF8] to-white rounded-3xl p-5 sm:p-6 border border-slate-150/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2 z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            We're here to <br />
            <span className="text-[#6366F1] font-black">assist</span> you 👋✨
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px]">
            Choose a service and our team will be right with you.
          </p>
        </div>
        <div className="w-[125px] sm:w-[155px] shrink-0 flex items-center justify-end z-10">
          <img
            src="/waiter_call.png"
            alt="Service Bell"
            className="w-full max-h-[125px] sm:max-h-[145px] object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Section Divider with Sparkles and Purple Bar */}
      <div className="text-center py-1 space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm tracking-tight">
          <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>What can we get for you?</span>
          <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
        </div>
        <div className="w-9 h-1 bg-[#6366F1] rounded-full mx-auto" />
      </div>

      {/* 5 Circular Action Cards Grid (3 on Top, 2 on Bottom Centered) */}
      <div className="pt-2 space-y-6">
        {/* Top Row: 3 Options */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 justify-items-center">
          {[
            {
              key: 'CALL_WAITER' as const,
              title: 'Call Waiter',
              subtitle: 'Need assistance from our staff',
              icon: ClocheBellIcon,
              activeRing: 'ring-4 ring-offset-2 ring-purple-500 border-2 border-purple-500 bg-purple-100/90 shadow-[0_14px_35px_rgba(168,85,247,0.42)]',
              activeBadge: 'bg-purple-600',
              activeTextColor: 'text-purple-700',
              ringBorder: 'border-purple-200/70',
              ringBg: 'bg-purple-50/60',
              glowShadow: 'shadow-[0_8px_20px_rgba(147,51,234,0.10)]',
              iconColor: 'text-purple-600',
            },
            {
              key: 'REQUEST_BILL' as const,
              title: 'Request Bill',
              subtitle: 'Get your bill instantly',
              icon: ReceiptBillIcon,
              activeRing: 'ring-4 ring-offset-2 ring-blue-500 border-2 border-blue-500 bg-blue-100/90 shadow-[0_14px_35px_rgba(59,130,246,0.42)]',
              activeBadge: 'bg-blue-600',
              activeTextColor: 'text-blue-700',
              ringBorder: 'border-blue-200/70',
              ringBg: 'bg-blue-50/60',
              glowShadow: 'shadow-[0_8px_20px_rgba(59,130,246,0.10)]',
              iconColor: 'text-blue-500',
            },
            {
              key: 'WATER' as const,
              title: 'Drinking Water',
              subtitle: 'Request fresh drinking water',
              icon: WaterBottleServiceIcon,
              activeRing: 'ring-4 ring-offset-2 ring-cyan-500 border-2 border-cyan-500 bg-cyan-100/90 shadow-[0_14px_35px_rgba(6,182,212,0.42)]',
              activeBadge: 'bg-cyan-600',
              activeTextColor: 'text-cyan-700',
              ringBorder: 'border-cyan-200/70',
              ringBg: 'bg-cyan-50/60',
              glowShadow: 'shadow-[0_8px_20px_rgba(6,182,212,0.10)]',
              iconColor: 'text-cyan-500',
            },
          ].map((opt) => {
            const IconComp = opt.icon;
            const isSelected = selectedRequestType === opt.key;

            return (
              <motion.button
                key={opt.key}
                type="button"
                whileHover={{ scale: isSelected ? 1.10 : 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onSelectRequestType(opt.key);
                  if (waiterCallState === 'waiting') {
                    onResetWaiterCallState();
                  }
                }}
                className={`flex flex-col items-center text-center group cursor-pointer select-none focus:outline-none transition-all duration-300 ${
                  isSelected ? 'scale-105 z-10' : 'opacity-65 hover:opacity-95'
                }`}
              >
                {/* Outer Glowing Halo Circle */}
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border transition-all duration-300 relative flex items-center justify-center p-1.5 ${
                    isSelected
                      ? `${opt.activeRing} scale-108`
                      : `${opt.ringBorder} ${opt.ringBg} ${opt.glowShadow}`
                  }`}
                >
                  {/* Inner Pure White Disc */}
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white shadow-md border-2 border-white'
                        : 'bg-white shadow-inner border border-white/80'
                    }`}
                  >
                    <IconComp
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 ${
                        opt.iconColor
                      } ${isSelected ? 'scale-115 stroke-[2.25]' : 'scale-100'}`}
                    />
                  </div>

                  {/* Prominent Floating Checkmark Badge */}
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${opt.activeBadge} text-white font-black text-[11px] flex items-center justify-center shadow-md ring-2 ring-white`}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>

                {/* Label & Subtitle */}
                <div className="mt-2.5 flex flex-col items-center">
                  <span
                    className={`text-xs sm:text-sm tracking-tight transition-colors ${
                      isSelected
                        ? `${opt.activeTextColor} font-black scale-105`
                        : 'text-slate-800 font-extrabold'
                    }`}
                  >
                    {opt.title}
                  </span>
                  <span
                    className={`text-[10px] sm:text-[11px] leading-tight max-w-[100px] sm:max-w-[115px] mt-0.5 transition-colors ${
                      isSelected ? 'text-slate-700 font-semibold' : 'text-slate-500 font-medium'
                    }`}
                  >
                    {opt.subtitle}
                  </span>

                  {/* Active Pill Indicator underneath */}
                  {isSelected && (
                    <motion.div
                      layoutId="active-waiter-indicator"
                      className={`w-6 h-1 rounded-full ${opt.activeBadge} mt-1.5 shadow-xs`}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom Row: 2 Options Centered */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {[
            {
              key: 'TISSUE' as const,
              title: 'Tissue Paper',
              subtitle: 'Request extra tissue paper',
              icon: TissuePaperServiceIcon,
              activeRing: 'ring-4 ring-offset-2 ring-emerald-500 border-2 border-emerald-500 bg-emerald-100/90 shadow-[0_14px_35px_rgba(16,185,129,0.42)]',
              activeBadge: 'bg-emerald-600',
              activeTextColor: 'text-emerald-700',
              ringBorder: 'border-emerald-200/70',
              ringBg: 'bg-emerald-50/60',
              glowShadow: 'shadow-[0_8px_20px_rgba(16,185,129,0.10)]',
              iconColor: 'text-emerald-500',
            },
            {
              key: 'OTHER' as const,
              title: 'Other Requests',
              subtitle: "Anything else? We're here to help",
              icon: ChatOtherServiceIcon,
              activeRing: 'ring-4 ring-offset-2 ring-amber-500 border-2 border-amber-500 bg-amber-100/90 shadow-[0_14px_35px_rgba(245,158,11,0.42)]',
              activeBadge: 'bg-amber-600',
              activeTextColor: 'text-amber-700',
              ringBorder: 'border-amber-200/70',
              ringBg: 'bg-amber-50/60',
              glowShadow: 'shadow-[0_8px_20px_rgba(245,158,11,0.10)]',
              iconColor: 'text-amber-500',
            },
          ].map((opt) => {
            const IconComp = opt.icon;
            const isSelected = selectedRequestType === opt.key;

            return (
              <motion.button
                key={opt.key}
                type="button"
                whileHover={{ scale: isSelected ? 1.10 : 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onSelectRequestType(opt.key);
                  if (waiterCallState === 'waiting') {
                    onResetWaiterCallState();
                  }
                }}
                className={`flex flex-col items-center text-center group cursor-pointer select-none focus:outline-none transition-all duration-300 ${
                  isSelected ? 'scale-105 z-10' : 'opacity-65 hover:opacity-95'
                }`}
              >
                {/* Outer Glowing Halo Circle */}
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border transition-all duration-300 relative flex items-center justify-center p-1.5 ${
                    isSelected
                      ? `${opt.activeRing} scale-108`
                      : `${opt.ringBorder} ${opt.ringBg} ${opt.glowShadow}`
                  }`}
                >
                  {/* Inner Pure White Disc */}
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white shadow-md border-2 border-white'
                        : 'bg-white shadow-inner border border-white/80'
                    }`}
                  >
                    <IconComp
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 ${
                        opt.iconColor
                      } ${isSelected ? 'scale-115 stroke-[2.25]' : 'scale-100'}`}
                    />
                  </div>

                  {/* Prominent Floating Checkmark Badge */}
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${opt.activeBadge} text-white font-black text-[11px] flex items-center justify-center shadow-md ring-2 ring-white`}
                    >
                      ✓
                    </motion.span>
                  )}
                </div>

                {/* Label & Subtitle */}
                <div className="mt-2.5 flex flex-col items-center">
                  <span
                    className={`text-xs sm:text-sm tracking-tight transition-colors ${
                      isSelected
                        ? `${opt.activeTextColor} font-black scale-105`
                        : 'text-slate-800 font-extrabold'
                    }`}
                  >
                    {opt.title}
                  </span>
                  <span
                    className={`text-[10px] sm:text-[11px] leading-tight max-w-[100px] sm:max-w-[115px] mt-0.5 transition-colors ${
                      isSelected ? 'text-slate-700 font-semibold' : 'text-slate-500 font-medium'
                    }`}
                  >
                    {opt.subtitle}
                  </span>

                  {/* Active Pill Indicator underneath */}
                  {isSelected && (
                    <motion.div
                      layoutId="active-waiter-indicator"
                      className={`w-6 h-1 rounded-full ${opt.activeBadge} mt-1.5 shadow-xs`}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Action Trigger Buttons with Rate-Limit Countdown */}
      <div className="pt-2">
        {waiterCallState === 'idle' && (
          <>
            {cooldownRemaining > 0 ? (
              <button
                type="button"
                disabled
                className="w-full py-4 bg-slate-100 text-slate-400 font-extrabold text-sm rounded-2xl border border-slate-200 flex items-center justify-center gap-2.5 cursor-not-allowed shadow-none select-none transition-all"
              >
                <Clock className="w-4.5 h-4.5 text-slate-400 animate-pulse" />
                <span>Please wait ({formatCooldown(cooldownRemaining)}) to call again</span>
              </button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTriggerWaiterCall(selectedRequestType)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-slate-900/20 cursor-pointer"
              >
                <BellRing className="w-4.5 h-4.5 text-amber-400 animate-bounce" strokeWidth={2.2} />
                <span>Call Waiter for {selectedRequestType.replace('_', ' ').toLowerCase()}</span>
              </motion.button>
            )}
          </>
        )}

        {waiterCallState === 'pulsing' && (
          <div className="w-full py-4 bg-amber-50 text-amber-800 text-sm font-bold rounded-2xl flex items-center justify-center gap-2.5 border border-amber-200 shadow-sm animate-pulse">
            <Loader className="w-4 h-4 animate-spin text-amber-600" />
            <span>Dispatching call to floor team...</span>
          </div>
        )}

        {waiterCallState === 'waiting' && (
          <div className="space-y-3">
            {/* Bottom Confirmation Notification Card ("Request Sent!") */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden"
            >
              {/* Left Checkmark with Decorative Confetti */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#22C55E] flex items-center justify-center text-white shadow-md shadow-green-500/20">
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                  </div>
                  {/* Decorative confetti stars */}
                  <span className="absolute -top-1 -left-1 text-[11px] text-amber-400">✦</span>
                  <span className="absolute -bottom-1 -right-1 text-[11px] text-purple-400">✦</span>
                </div>

                {/* Center text */}
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm sm:text-base text-[#15803D] tracking-tight">
                    Request Sent!
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                    Your request has been sent successfully. <br className="hidden sm:inline" />
                    Our team will be with you shortly.
                  </p>
                </div>
              </div>

              {/* Right Clapping Hands Illustration */}
              <div className="shrink-0 hidden xs:block opacity-60">
                <ClappingHandsOutlineIcon className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-800" />
              </div>
            </motion.div>

            {/* Cooldown or Secondary Re-call Action Button */}
            {cooldownRemaining > 0 ? (
              <button
                type="button"
                disabled
                className="w-full py-3 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed select-none"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                <span>Please wait ({formatCooldown(cooldownRemaining)}) before requesting again</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetWaiterCallState}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                <span>Need another service? Choose & Call</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Service History */}
      {recentWaiterCalls.length > 0 && (
        <div className="space-y-2.5 pt-4 border-t border-slate-150">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
            Recent Service History
          </span>
          <div className="space-y-2">
            {recentWaiterCalls.map((call, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-3 border border-slate-150 flex items-center justify-between text-xs transition shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {call.type.replace('_', ' ')} Requested
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {call.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
