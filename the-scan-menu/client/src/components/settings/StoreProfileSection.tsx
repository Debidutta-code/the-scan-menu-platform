import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Store,
  Save,
  Loader,
  MapPin,
  Palette,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ThemeBrandingSection } from './ThemeBrandingSection';

export interface StoreProfileSectionProps {
  restaurantId?: string;
  isSuperAdminEdit?: boolean;
  onSaved?: () => void;
  defaultSubTab?: 'identity' | 'contact' | 'theme';
}

export const StoreProfileSection: React.FC<StoreProfileSectionProps> = ({
  restaurantId: propRestaurantId,
  isSuperAdminEdit,
  onSaved,
  defaultSubTab = 'identity',
}) => {
  const { user, activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;
  const isEditable = isSuperAdminEdit ?? (user?.role === 'SUPER_ADMIN');

  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'contact' | 'theme'>(defaultSubTab);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
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
      setSlug(p.slug || '');
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
    }
  }, [restaurantResponse]);

  // Completion calculation for each sub-tab
  const identityStatus = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('Name');
    if (!description.trim()) missing.push('Description');
    if (!logoUrl.trim()) missing.push('Logo');
    return {
      isComplete: missing.length === 0,
      missing,
    };
  }, [name, description, logoUrl]);

  const contactStatus = useMemo(() => {
    const missing: string[] = [];
    if (!address.trim()) missing.push('Address');
    if (!phone.trim()) missing.push('Phone');
    if (!email.trim()) missing.push('Email');
    if (!gstNumber.trim()) missing.push('GST');
    return {
      isComplete: missing.length === 0,
      missing,
    };
  }, [address, phone, email, gstNumber]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Store settings updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating settings', 'error');
    },
  });

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      logoUrl: logoUrl.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      branding: {
        logoUrl: logoUrl.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
      },
    });
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      googleReviewUrl: googleReviewUrl.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      timings: {
        open: openTime,
        close: closeTime,
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
    <div className="space-y-5 font-sans">
      {/* Sub-Tab Navigation Header with Completion Badges */}
      <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSubTab('identity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'identity'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>1. Store Identity & Overview</span>
          {identityStatus.isComplete ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Completed" />
          ) : (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
              {identityStatus.missing.length} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'contact'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>2. Location, Contacts & Timings</span>
          {contactStatus.isComplete ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Completed" />
          ) : (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
              {contactStatus.missing.length} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('theme')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'theme'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>3. Theme & Customer UI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: STORE IDENTITY & OVERVIEW                      */}
      {/* ========================================================= */}
      {activeSubTab === 'identity' && (
        <form onSubmit={handleSaveIdentity} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                <span>Restaurant Identity & Brand Assets</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Outlet name, slug link, brand tagline, logo, and cover visual.</p>
            </div>
            {identityStatus.isComplete ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Section Complete</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Missing: {identityStatus.missing.join(', ')}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Restaurant Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Woodfired Bistro"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 disabled:bg-slate-50 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                URL Identifier Slug
              </label>
              <div className="flex rounded-xl shadow-2xs">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono">
                  /r/
                </span>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="woodfired-bistro"
                  className="flex-1 min-w-0 px-3.5 py-2.5 border border-slate-200 rounded-r-xl text-sm focus:outline-none focus:border-amber-500 disabled:bg-slate-50 font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Restaurant Description & Story
              </label>
              <textarea
                disabled={!isEditable}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief tagline or description displayed on customer digital menus..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 disabled:bg-slate-50 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Logo URL</label>
              <input
                type="url"
                disabled={!isEditable}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Cover Banner Image URL</label>
              <input
                type="url"
                disabled={!isEditable}
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Visual Preview Card */}
          {(logoUrl || coverImageUrl) && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              )}
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Live Brand Preview</span>
                <h5 className="text-sm font-bold text-slate-900">{name || 'Untitled Restaurant'}</h5>
                <p className="text-xs text-slate-500 line-clamp-1">{description || 'No description provided yet.'}</p>
              </div>
            </div>
          )}

          {isEditable && (
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
                <span>Save Store Identity</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: LOCATION, CONTACTS & OPERATING HOURS           */}
      {/* ========================================================= */}
      {activeSubTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
                <span>Location, Contacts & Operating Hours</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Physical address, support contacts, operating schedule, and tax registration.</p>
            </div>
            {contactStatus.isComplete ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Section Complete</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Missing: {contactStatus.missing.join(', ')}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Physical Outlet Address <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Gourmet Boulevard, Indiranagar, Bengaluru, 560038"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contact Phone <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Support Email <span className="text-amber-500">*</span>
              </label>
              <input
                type="email"
                disabled={!isEditable}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@woodfiredbistro.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp Orders Contact</label>
              <input
                type="text"
                disabled={!isEditable}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">GST Registration (GSTIN)</label>
              <input
                type="text"
                disabled={!isEditable}
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono font-bold disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Daily Opening Time</label>
              <input
                type="time"
                disabled={!isEditable}
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Daily Closing Time</label>
              <input
                type="time"
                disabled={!isEditable}
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Google Review Page URL</label>
              <input
                type="url"
                disabled={!isEditable}
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/woodfiredbistro-reviews"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:bg-slate-50"
              />
            </div>
          </div>

          {isEditable && (
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
                <span>Save Contact & Location</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: THEME & BRANDING                               */}
      {/* ========================================================= */}
      {activeSubTab === 'theme' && (
        <ThemeBrandingSection restaurantId={targetRestaurantId} onSaved={onSaved} />
      )}
    </div>
  );
};
