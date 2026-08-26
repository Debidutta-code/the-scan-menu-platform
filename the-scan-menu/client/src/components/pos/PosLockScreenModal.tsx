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
  WifiOff,
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

interface CachedPinEntry {
  pinHash: string;
  user: PosUnlockedUser;
  lastUsed: string;
}

// SHA-256 helper with Web Crypto
async function computePinHash(restaurantId: string, pin: string): Promise<string> {
  const clean = `${restaurantId}:${pin.trim()}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(clean);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // fallback
    }
  }
  // Fallback simple hash for older environments
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fb_${Math.abs(hash)}`;
}

function getStoredPinCache(restaurantId: string): CachedPinEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`offline_pos_pins_${restaurantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePinCache(restaurantId: string, entry: CachedPinEntry) {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredPinCache(restaurantId).filter((p) => p.pinHash !== entry.pinHash);
    list.unshift(entry);
    localStorage.setItem(`offline_pos_pins_${restaurantId}`, JSON.stringify(list.slice(0, 20)));
  } catch (e) {
    console.error('Error caching offline POS PIN:', e);
  }
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
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
  };

  // Offline PIN check
  const attemptOfflineUnlock = useCallback(
    async (enteredPin: string): Promise<boolean> => {
      const pinHash = await computePinHash(restaurantId, enteredPin);
      const cachedList = getStoredPinCache(restaurantId);
      const matched = cachedList.find((p) => p.pinHash === pinHash);

      if (matched) {
        toast(`Terminal Unlocked (${matched.user.name} • Offline Mode)`, 'success');
        setPin('');
        const updatedUser = {
          ...matched.user,
          unlockedAt: new Date().toISOString(),
        };
        savePinCache(restaurantId, {
          pinHash,
          user: updatedUser,
          lastUsed: new Date().toISOString(),
        });
        onUnlockSuccess(updatedUser);
        if (onClose) onClose();
        return true;
      }

      // Check if session has a known user to fall back on if cache empty
      const rawSession = sessionStorage.getItem(`pos_cashier_${restaurantId}`);
      if (rawSession) {
        try {
          const sessionUser = JSON.parse(rawSession);
          if (sessionUser && sessionUser.name) {
            // Save this pin for future offline unlocks
            savePinCache(restaurantId, {
              pinHash,
              user: sessionUser,
              lastUsed: new Date().toISOString(),
            });
            toast(`Terminal Unlocked (${sessionUser.name} • Offline Mode)`, 'success');
            setPin('');
            onUnlockSuccess(sessionUser);
            if (onClose) onClose();
            return true;
          }
        } catch {
          // ignore
        }
      }

      return false;
    },
    [restaurantId, toast, onUnlockSuccess, onClose]
  );

  const unlockMutation = useMutation({
    mutationFn: async (enteredPin: string) => {
      // If client is already offline, skip network request entirely
      if (!navigator.onLine) {
        const offlineSuccess = await attemptOfflineUnlock(enteredPin);
        if (offlineSuccess) return { offline: true };
        throw new Error('OFFLINE_INVALID_PIN');
      }

      try {
        const res = await managerService.unlockPosByPin(restaurantId, enteredPin);
        return res;
      } catch (err: any) {
        // If network failed (offline, timeout, connection lost), fall back to offline verification
        const isNetworkErr =
          !err.response ||
          err.code === 'ERR_NETWORK' ||
          err.code === 'ECONNABORTED' ||
          err.message?.includes('Network Error');

        if (isNetworkErr) {
          const offlineSuccess = await attemptOfflineUnlock(enteredPin);
          if (offlineSuccess) return { offline: true };
          throw new Error('OFFLINE_INVALID_PIN');
        }

        throw err;
      }
    },
    onSuccess: async (res, enteredPin) => {
      if ((res as any)?.offline) return; // Handled in attemptOfflineUnlock

      toast(res.message || 'Terminal Unlocked', 'success');
      setPin('');

      // Cache valid PIN hash locally for offline use
      if (res.data) {
        const pinHash = await computePinHash(restaurantId, enteredPin);
        savePinCache(restaurantId, {
          pinHash,
          user: res.data,
          lastUsed: new Date().toISOString(),
        });
      }

      onUnlockSuccess(res.data);
      if (onClose) onClose();
    },
    onError: (err: any) => {
      triggerShake();
      if (err.message === 'OFFLINE_INVALID_PIN') {
        toast('Invalid PIN in Offline Mode. Please try again.', 'error');
      } else {
        toast(err.response?.data?.error?.message || 'Invalid PIN. Access denied.', 'error');
      }
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
        className={`bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col items-center p-6 md:p-8 transition-transform duration-150 relative ${
          isShaking ? 'translate-x-2 animate-bounce' : ''
        }`}
      >
        {/* Offline Badge Indicator */}
        {!isOnline && (
          <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
            <WifiOff className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Offline Ready</span>
          </div>
        )}

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
            <span className="font-bold truncate max-w-[200px]">{restaurantName || 'Operations Panel'}</span>
          </div>
          <h3 className="font-display text-xl font-black text-slate-900 leading-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[260px] leading-relaxed">{subtitle}</p>
        </div>

        {/* Masked PIN Indicators (4 Dots) */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full transition-all duration-150 border-2 ${
                  hasDigit
                    ? 'bg-amber-500 border-amber-500 scale-110 shadow-sm'
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
