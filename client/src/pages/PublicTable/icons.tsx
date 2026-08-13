import React from 'react';

// ==========================================
// CUSTOM WAITER CALL SERVICE ICONS (High-Fidelity)
// ==========================================

export const ClocheBellIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-purple-600' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 4v2" />
    <path d="M4 18h16" />
    <path d="M4 18a8 8 0 0 1 16 0" />
    <circle cx="12" cy="4" r="1" />
  </svg>
);

export const ReceiptBillIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-blue-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 3v18l3.5-2 3.5 2 3.5-2 3.5 2V3l-3.5 2L12 3 8.5 5z" />
    <path d="M12 8v8" />
    <path d="M9.5 10.5a2.5 2.5 0 0 1 5 0c0 2-5 2-5 4a2.5 2.5 0 0 0 5 0" />
  </svg>
);

export const WaterBottleServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-cyan-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 2h8v3H8z" />
    <path d="M7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M12 11c0 0-3 3.5-3 5.5a3 3 0 0 0 6 0c0-2-3-5.5-3-5.5z" />
  </svg>
);

export const TissuePaperServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-emerald-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 13h18a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" />
    <path d="M7 13V8.5a3.5 3.5 0 0 1 7 0V13" />
    <path d="M10 8.5V4a2 2 0 0 1 4 0v4.5" />
  </svg>
);

export const ChatOtherServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-amber-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="8" cy="10" r="1.25" fill="currentColor" />
    <circle cx="12" cy="10" r="1.25" fill="currentColor" />
    <circle cx="16" cy="10" r="1.25" fill="currentColor" />
  </svg>
);

export const ClappingHandsOutlineIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10 text-emerald-700/50' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 1 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.9-2.7l-4.4-6a1.5 1.5 0 0 1 2.4-1.8L6 13.5" />
  </svg>
);
