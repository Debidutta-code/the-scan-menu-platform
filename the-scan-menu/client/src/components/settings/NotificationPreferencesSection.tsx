import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Bell,
  Save,
  Loader,
} from 'lucide-react';

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
    <form onSubmit={handleSaveNotifications} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Notification Preferences</span>
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">Toggle alert channels for new orders, summaries, and receipts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
          />
          <div>
            <p className="text-xs font-bold text-slate-900">Email Alerts</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Order summaries & daily shift reports</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={smsNotifications}
            onChange={(e) => setSmsNotifications(e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
          />
          <div>
            <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Instant SMS dispatch notifications</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={whatsappNotifications}
            onChange={(e) => setWhatsappNotifications(e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
          />
          <div>
            <p className="text-xs font-bold text-slate-900">WhatsApp Alerts</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Real-time WhatsApp customer alerts</p>
          </div>
        </label>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400 cursor-pointer"
        >
          {updateMutation.isPending ? (
            <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="w-4 h-4" strokeWidth={1.75} />
          )}
          <span>Save Notification Settings</span>
        </button>
      </div>
    </form>
  );
};
