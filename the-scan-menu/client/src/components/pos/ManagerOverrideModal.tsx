import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { managerService } from '../../services/restaurant.service';
import { useToast } from '../../hooks/useToast';
import {
  ShieldAlert,
  ShieldCheck,
  Delete,
  X,
  Loader,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface ManagerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  actionTitle?: string;
  actionDescription?: string;
  actionCode?: string;
  onAuthorized: (managerData: { managerId: string; managerName: string }) => void;
}

export const ManagerOverrideModal: React.FC<ManagerOverrideModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  actionTitle = 'Manager Authorization Required',
  actionDescription = 'This protected action requires approval from a Store Manager or SuperAdmin.',
  actionCode = 'MANAGER_OVERRIDE',
  onAuthorized,
}) => {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: (enteredPin: string) =>
      managerService.verifyManagerPin(restaurantId, enteredPin, actionCode),
    onSuccess: (res) => {
      toast('Manager authorization approved', 'success');
      setPin('');
      onAuthorized(res.data);
      onClose();
    },
    onError: (err: any) => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      toast(err.response?.data?.error?.message || 'Invalid Manager PIN. Access denied.', 'error');
    },
  });

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (verifyMutation.isPending) return;
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          verifyMutation.mutate(nextPin);
        }
      }
    },
    [pin, verifyMutation]
  );

  const handleBackspace = useCallback(() => {
    if (verifyMutation.isPending) return;
    setPin((prev) => prev.slice(0, -1));
  }, [verifyMutation.isPending]);

  const handleClear = useCallback(() => {
    if (verifyMutation.isPending) return;
    setPin('');
  }, [verifyMutation.isPending]);

  const handleSubmit = useCallback(() => {
    if (pin.length < 4) {
      toast('Manager PIN must be 4 digits', 'error');
      return;
    }
    verifyMutation.mutate(pin);
  }, [pin, verifyMutation, toast]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          verifyMutation.mutate(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleKeyPress, handleBackspace, verifyMutation, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200 font-sans">
      <div
        className={`bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col items-center p-5 sm:p-6 transition-transform duration-150 ${
          isShaking ? 'translate-x-2 animate-bounce' : ''
        }`}
      >
        <div className="w-full flex justify-end -mt-2 -mr-2">
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shadow-xs mb-3">
          {verifyMutation.isPending ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <ShieldAlert className="w-5 h-5" />
          )}
        </div>

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 text-rose-600 font-mono text-[9px] uppercase font-bold tracking-wider mb-0.5">
            <AlertTriangle className="w-3 h-3" />
            <span>Protected Action</span>
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 leading-tight">{actionTitle}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[230px] leading-snug">{actionDescription}</p>
        </div>

        {/* PIN Indicators (4 Dots) */}
        <div className="flex items-center justify-center gap-3.5 mb-5">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  hasDigit
                    ? 'bg-rose-500 border-rose-500 scale-110 shadow-xs'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Touch Dialpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-300 border border-slate-200/90 text-slate-900 font-display font-bold text-lg flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center transition active:scale-95 cursor-pointer uppercase tracking-wider font-mono"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-300 border border-slate-200/90 text-slate-900 font-display font-bold text-lg flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <Button
          type="button"
          variant="danger"
          onClick={handleSubmit}
          disabled={pin.length < 4}
          isLoading={verifyMutation.isPending}
          leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
          className="w-full max-w-[240px]"
        >
          Authorize Override
        </Button>
      </div>
    </div>,
    document.body
  );
};

export default ManagerOverrideModal;
