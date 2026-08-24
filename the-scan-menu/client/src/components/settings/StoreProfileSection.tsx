import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Store,
  Lock,
  ShieldAlert,
  Save,
  Loader,
  Clock,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  MapPin,
} from 'lucide-react';

export interface StoreProfileSectionProps {
  restaurantId?: string;
  isSuperAdminEdit?: boolean;
  onSaved?: () => void;
}

export const StoreProfileSection: React.FC<StoreProfileSectionProps> = ({
  restaurantId: propRestaurantId,
  isSuperAdminEdit,
  onSaved,
}) => {
  const { user, activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;
  const isEditable = isSuperAdminEdit ?? (user?.role === 'SUPER_ADMIN');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

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
      setName(p.name || '');
      setDescription(p.description || '');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setAddress(p.address || '');
      setGoogleReviewUrl(p.googleReviewUrl || '');
      setGstNumber(p.gstNumber || '');
      setWhatsapp(p.whatsapp || '');
      setLogoUrl(p.branding?.logoUrl || p.logoUrl || '');
      setCoverImageUrl(p.branding?.coverImageUrl || p.coverImageUrl || '');

      if (p.timings) {
        setOpenTime(p.timings.open || '09:00');
        setCloseTime(p.timings.close || '23:00');
      }

      const settingsObj = p.settings;
      if (settingsObj) {
        setReceiptHeader(settingsObj.receiptHeader || '');
        setReceiptFooter(settingsObj.receiptFooter || '');
      }
    }
  }, [restaurantResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Store Profile updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating Store Profile', 'error');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Restaurant Name is required', 'error');
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      googleReviewUrl: googleReviewUrl.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      timings: {
        open: openTime,
        close: closeTime,
      },
      branding: {
        logoUrl: logoUrl.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
      },
      settings: {
        receiptHeader: receiptHeader.trim() || undefined,
        receiptFooter: receiptFooter.trim() || undefined,
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
    <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Store Profile & Physical Details</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Core restaurant information displayed to customers and invoices.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-amber-800 text-[10px] font-bold tracking-wide uppercase font-mono shrink-0 self-start sm:self-auto">
          <Lock className="w-3 h-3 text-amber-600" />
          <span>Configured by SuperAdmin</span>
        </div>
      </div>

      {/* Central Governance Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h5 className="font-bold text-amber-950">Centrally Governed Configuration</h5>
          <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
            Store identity, tax registration (GST), business contacts, and physical outlet details are managed centrally by platform SuperAdmin.
            {isEditable ? ' As a SuperAdmin, you can modify these details below.' : ' To request updates to your store configuration, please reach out to platform support.'}
          </p>
        </div>
      </div>

      {isEditable ? (
        /* SuperAdmin Editable Mode */
        <form onSubmit={handleSave} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Restaurant Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Woodfired Bistro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Support Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@woodfired.com"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Google Review URL</label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AAAAA1111A1Z1"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">WhatsApp Contact</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Restaurant Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Serving genuine hand-tossed sourdough pizza in a rustic woodfired furnace..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="456 Gourmet Lane, Mumbai, Maharashtra"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover Image URL</label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
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
              <span>Save General Profile</span>
            </button>
          </div>
        </form>
      ) : (
        /* Manager View-Only Presentation Hub */
        <div className="space-y-6 pt-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Restaurant Name</span>
              <p className="font-bold text-slate-900 text-sm mt-1">{name || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">GST Registration</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-1">{gstNumber || 'Not specified'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Daily Operating Hours</span>
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                {openTime || '09:00'} - {closeTime || '23:00'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-150 space-y-3">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] font-mono">
              Communication & Support Channels
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono">{phone || 'No phone recorded'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono truncate">{email || 'No email recorded'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <span className="text-emerald-600 font-bold font-mono text-sm">WA</span>
                <span className="font-mono">{whatsapp || 'No WhatsApp added'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                {googleReviewUrl ? (
                  <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline flex items-center gap-1 truncate font-mono text-[11px]"
                  >
                    <span>Google Reviews</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400">No review URL</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Physical Address</span>
              <p className="text-slate-800 text-xs font-semibold mt-0.5 leading-relaxed">
                {address || 'No physical address configured on platform.'}
              </p>
            </div>
          </div>

          {description && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">About the Restaurant</span>
              <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">{description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Brand Logo</span>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white" />
                  <span className="text-[11px] text-slate-500 font-mono truncate">{logoUrl}</span>
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">No brand logo configured.</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Cover Banner</span>
              {coverImageUrl ? (
                <div className="flex items-center gap-3">
                  <img src={coverImageUrl} alt="Cover" className="w-20 h-12 rounded-xl object-cover border border-slate-200 bg-white" />
                  <span className="text-[11px] text-slate-500 font-mono truncate">{coverImageUrl}</span>
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">No cover image banner configured.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
