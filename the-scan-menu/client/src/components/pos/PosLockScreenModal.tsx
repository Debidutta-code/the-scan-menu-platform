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
import { Button } from '../ui/Button';

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
  title = 'Restaurant Terminal Locked',
  subtitle = 'Enter your 4-digit staff or manager PIN to access dashboard',
}) => {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const unlockMutation = useMutation({
    mutationFn: (enteredPin: string) => managerService.unlockPosByPin(restaurantId, enteredPin),
    onSuccess: (res) => {
      toast(res.message || 'Terminal Unlocked', 'success');
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
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          unlockMutation.mutate(nextPin);
        }
      }
    },
    [pin, unlockMutation]
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
      toast('PIN must be 4 digits', 'error');
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
        if (pin.length === 4) {
          unlockMutation.mutate(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleKeyPress, handleBackspace, unlockMutation]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200 font-sans">
      <div
        className={`bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col items-center p-5 sm:p-6 transition-transform duration-150 ${
          isShaking ? 'translate-x-2 animate-bounce' : ''
        }`}
      >
        {/* Lock Icon & Branding */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs mb-3">
          {unlockMutation.isPending ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
        </div>

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 text-slate-500 font-mono text-[9px] uppercase tracking-wider mb-0.5 font-bold">
            <Store className="w-3 h-3 text-amber-500" />
            <span className="truncate max-w-[200px]">{restaurantName || 'Operations Panel'}</span>
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 leading-tight">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[230px] leading-snug">{subtitle}</p>
        </div>

        {/* Masked PIN Indicators (4 Dots) */}
        <div className="flex items-center justify-center gap-3.5 mb-5">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  hasDigit
                    ? 'bg-amber-500 border-amber-500 scale-110 shadow-xs'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Touchscreen Numeric Dialpad (3x4 Grid with tactile square proportions) */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-xl bg-slate-50 hover:bg-amber-50 hover:border-amber-400 border border-slate-200/90 text-slate-900 font-display font-bold text-lg flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center transition active:scale-95 cursor-pointer uppercase tracking-wider font-mono"
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-slate-50 hover:bg-amber-50 hover:border-amber-400 border border-slate-200/90 text-slate-900 font-display font-bold text-lg flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Unlock Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={pin.length < 4}
          isLoading={unlockMutation.isPending}
          leftIcon={<Unlock className={`w-3.5 h-3.5 ${pin.length === 4 ? 'text-amber-400' : 'text-slate-400'}`} />}
          className="w-full max-w-[240px]"
        >
          Unlock Workstation
        </Button>
      </div>
    </div>,
    document.body
  );
};

export default PosLockScreenModal;
