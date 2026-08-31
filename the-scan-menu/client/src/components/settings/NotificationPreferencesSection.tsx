import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Bell,
  Save,
  Loader,
  Volume2,
  VolumeX,
  BellRing,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface NotificationPreferencesSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const NotificationPreferencesSection: React.FC<NotificationPreferencesSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Local device audio chime setting
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manager_sound_chime') !== 'false';
    }
    return true;
  });

  // Browser desktop notification permission status
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manager_sound_chime', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('managerSoundChanged', { detail: enabled }));
    }
    toast(enabled ? 'Order sound chime enabled' : 'Order sound chime muted', 'info');
  };

  const playTestChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const nowTime = ctx.currentTime;
      playNote(523.25, nowTime, 0.35); // C5
      playNote(659.25, nowTime + 0.15, 0.45); // E5
      playNote(783.99, nowTime + 0.3, 0.55); // G5
      toast('Testing synthesized chime 🔔', 'info');
    } catch (err) {
      console.error('Test audio play error:', err);
    }
  }, [toast]);

  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast('Your browser does not support desktop push notifications.', 'error');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPushPermission(result);
      if (result === 'granted') {
        toast('Desktop push notifications enabled successfully!', 'success');
        new Notification('The Scan Menu', {
          body: 'Desktop notifications are active for live orders and waiter calls.',
          icon: '/favicon.ico',
        });
      } else {
        toast('Notification permission was not granted.', 'error');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Server-side channel preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);

  const { data: restaurantResponse, isLoading } = useQuery({
    queryKey: ['restaurantProfileInfo', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  useEffect(() => {
    if (restaurantResponse?.success && restaurantResponse?.data) {
      const raw = restaurantResponse.data;
      if (raw.notificationPreferences) {
        setEmailNotifications(!!raw.notificationPreferences.emailNotifications);
        setSmsNotifications(!!raw.notificationPreferences.smsNotifications);
        setWhatsappNotifications(!!raw.notificationPreferences.whatsappNotifications);
      }
    }
  }, [restaurantResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Notification Preferences saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating notifications', 'error');
    },
  });

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      notificationPreferences: {
        emailNotifications,
        smsNotifications,
        whatsappNotifications,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 font-sans select-none">
      {/* ── 1. Live Browser Audio Chimes ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
              <span>Live Order Audio Chimes</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Play sound chimes on incoming orders, status updates, and waiter calls.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${soundEnabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
              {soundEnabled ? <Volume2 className="w-4 h-4" strokeWidth={2} /> : <VolumeX className="w-4 h-4" strokeWidth={2} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Audio Chimes on Live Events</p>
              <p className="text-[10px] text-slate-500">Alerts kitchen and floor staff immediately when orders arrive</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={playTestChime}
              leftIcon={<Play className="w-3 h-3 text-amber-500 fill-amber-500" />}
            >
              Test Chime
            </Button>

            <Button
              type="button"
              variant={soundEnabled ? 'amber' : 'secondary'}
              size="sm"
              onClick={() => handleToggleSound(!soundEnabled)}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Browser Desktop Push Notifications ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <BellRing className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
              <span>Desktop Browser Push Notifications</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Receive native OS desktop popup alerts even when the browser tab is in the background.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pushPermission === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              <Bell className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900">Desktop Push Notifications</p>
                {pushPermission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded-full">
                    <XCircle className="w-2.5 h-2.5" />
                    {pushPermission === 'denied' ? 'Blocked' : 'Not Enabled'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">Instant desktop popups for order tickets and waiter call alerts</p>
            </div>
          </div>

          <Button
            type="button"
            variant={pushPermission === 'granted' ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleRequestPushPermission}
          >
            {pushPermission === 'granted' ? 'Active' : 'Enable Desktop Alerts'}
          </Button>
        </div>
      </div>

      {/* ── 3. Customer & Manager Dispatch Channels ── */}
      <form onSubmit={handleSaveNotifications} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3.5">
        <div className="border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Bell className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span>Store Dispatch Notification Channels</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Toggle external alert channels for daily summaries, shifts, and receipts.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label className="flex items-center gap-2.5 p-3 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition shadow-2xs">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 accent-amber-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">Email Alerts</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Order summaries &amp; daily shifts</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition shadow-2xs">
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 accent-amber-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Instant SMS notifications</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition shadow-2xs">
            <input
              type="checkbox"
              checked={whatsappNotifications}
              onChange={(e) => setWhatsappNotifications(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 accent-amber-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">WhatsApp Alerts</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time WhatsApp alerts</p>
            </div>
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Channel Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
