import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { managerService } from '../../services/restaurant.service';
import { useToast } from '../../hooks/useToast';
import {
  Lock,
  Unlock,
  Delete,
  Loader,
  Store,
} from 'lucide-react';

export interface PosUnlockedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  unlockedAt: string;
}

export interface PosLockScreenModalProps {
  isOpen: boolean;
  onClose?: () => void;
  restaurantId: string;
  restaurantName?: string;
  onUnlockSuccess: (unlockedUser: PosUnlockedUser) => void;
  title?: string;
  subtitle?: string;
}

export const PosLockScreenModal: React.FC<PosLockScreenModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  onUnlockSuccess,
  title = 'POS Terminal Locked',
  subtitle = 'Enter your 4-6 digit staff or manager PIN to access register',
}) => {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const unlockMutation = useMutation({
    mutationFn: (enteredPin: string) => managerService.unlockPosByPin(restaurantId, enteredPin),
    onSuccess: (res) => {
      toast(res.message || 'POS Unlocked', 'success');
      setPin('');
      onUnlockSuccess(res.data);
      if (onClose) onClose();
    },
    onError: (err: any) => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      toast(err.response?.data?.error?.message || 'Invalid PIN. Access denied.', 'error');
    },
  });

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (unlockMutation.isPending) return;
      if (pin.length < 6) {
        const nextPin = pin + digit;
        setPin(nextPin);
        // If reached 4 digits, user can also auto-trigger or press unlock
        if (nextPin.length >= 4 && nextPin.length <= 6) {
          // Auto submit at 4 if wanted or on Enter
        }
      }
    },
    [pin, unlockMutation.isPending]
  );

  const handleBackspace = useCallback(() => {
    if (unlockMutation.isPending) return;
    setPin((prev) => prev.slice(0, -1));
  }, [unlockMutation.isPending]);

  const handleClear = useCallback(() => {
    if (unlockMutation.isPending) return;
    setPin('');
  }, [unlockMutation.isPending]);

  const handleSubmit = useCallback(() => {
    if (pin.length < 4) {
      toast('PIN must be at least 4 digits', 'error');
      return;
    }
    unlockMutation.mutate(pin);
  }, [pin, unlockMutation, toast]);

  // Handle Physical Keyboard Numpad
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          unlockMutation.mutate(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleKeyPress, handleBackspace, unlockMutation]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div
        className={`bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col items-center p-6 md:p-8 transition-transform duration-150 ${
          isShaking ? 'translate-x-2 animate-bounce' : ''
        }`}
      >
        {/* Lock Icon & Branding */}
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg mb-4">
          {unlockMutation.isPending ? (
            <Loader className="w-8 h-8 animate-spin" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-wider mb-1">
            <Store className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold truncate max-w-[200px]">{restaurantName || 'Counter POS'}</span>
          </div>
          <h3 className="font-display text-xl font-black text-slate-900 leading-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[260px] leading-relaxed">{subtitle}</p>
        </div>

        {/* Masked PIN Indicators */}
        <div className="flex items-center justify-center gap-3.5 mb-8">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 border-2 ${
                  hasDigit
                    ? 'bg-amber-500 border-amber-500 scale-110 shadow-xs'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Touchscreen Numeric Dialpad (3x4 Grid) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-slate-900 font-display font-black text-xl flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-slate-900 font-display font-black text-xl flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Unlock Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pin.length < 4 || unlockMutation.isPending}
          className="w-full max-w-[280px] py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-98"
        >
          {unlockMutation.isPending ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Unlock className="w-4 h-4 text-amber-400" />
          )}
          <span>Unlock Workstation</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default PosLockScreenModal;
