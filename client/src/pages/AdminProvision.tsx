import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import {
  PlusCircle,
  Store,
  UserCheck,
  Loader,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const AdminProvision: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Manager details
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('PixoraDemo123!');

  const provisionMutation = useMutation({
    mutationFn: adminService.provisionRestaurant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast('Restaurant tenant and manager provisioned successfully!', 'success');
      const newRestId = data?.data?.restaurant?._id;
      if (newRestId) {
        navigate(`/admin/restaurants/${newRestId}`);
      } else {
        navigate('/admin/restaurants');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Error provisioning restaurant tenant');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Restaurant name is required.');
      return;
    }
    if (!managerName.trim() || !managerEmail.trim() || !managerPassword.trim()) {
      setErrorMsg('Manager name, email, and temporary password are required.');
      return;
    }

    provisionMutation.mutate({
      restaurant: {
        name,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        currency,
        timezone,
      },
      manager: {
        name: managerName,
        email: managerEmail,
        password: managerPassword,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to Tenants</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
          <Sparkles className="w-6 h-6" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold">One-Click Provisioning Wizard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Atomically creates tenant profile, manager account, 10 default dining tables with QR tokens, default tax rules, and initial settings in a single transaction.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Provisioning Form */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Section 1: Tenant Information */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Store className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
            <span>1. Restaurant Tenant Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Restaurant Name *</label>
              <input
                type="text"
                placeholder="Grand Royal Cafe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Slug (Optional)</label>
              <input
                type="text"
                placeholder="grand-royal-cafe"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              placeholder="Fine dining and coffee house..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="contact@grandroyal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
              <input
                type="text"
                placeholder="456 MG Road, Bangalore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (+05:30)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Manager Credentials */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
            <span>2. Manager Account Credentials</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Manager Full Name *</label>
              <input
                type="text"
                placeholder="Alice Smith"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Manager Email Address *</label>
              <input
                type="email"
                placeholder="manager@grandroyal.com"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Temporary Password *</label>
              <input
                type="text"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Summary & Submission */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">Automated Provisions Included</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              • 10 Initial Dining Tables (T1–T10) with QR Code Tokens<br />
              • FREE Plan Subscription Assigned & Feature Flags Configured
            </p>
          </div>
          <button
            type="submit"
            disabled={provisionMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shrink-0 shadow-md"
          >
            {provisionMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            <span>Provision Outlet Now</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProvision;
