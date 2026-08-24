import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Globe,
  Save,
  Loader,
} from 'lucide-react';

export interface SocialChannelsSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const SocialChannelsSection: React.FC<SocialChannelsSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

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
      const p = restaurantResponse.data;
      if (p.socialLinks) {
        setFacebook(p.socialLinks.facebook || '');
        setInstagram(p.socialLinks.instagram || '');
        setTwitter(p.socialLinks.twitter || '');
      }
    }
  }, [restaurantResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Social Media Channels saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating social channels', 'error');
    },
  });

  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      socialLinks: {
        facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined,
        twitter: twitter.trim() || undefined,
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
    <form onSubmit={handleSaveSocial} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Social Media Channels</span>
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">Links displayed on customer digital menus.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Facebook Profile</label>
          <input
            type="text"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="https://facebook.com/mybistro"
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instagram Handle</label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/mybistro"
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Twitter / X Channel</label>
          <input
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://twitter.com/mybistro"
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
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
          <span>Save Social Channels</span>
        </button>
      </div>
    </form>
  );
};
