import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  Search,
  Phone,
  Mail,
  TrendingUp,
  Receipt,
  Loader,
  X,
  Eye,
  Award,
  Plus,
  Minus,
  Trophy,
  Crown,
  Sliders,
  Check,
  Save,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';

const formatPrice = (amountInPaise: number, currency: string = 'INR') => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
  }).format((amountInPaise || 0) / 100);
};

export const ManagerCustomers: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Tab & Leaderboard State
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'LEADERBOARD' | 'LOYALTY_RULES'>('DIRECTORY');
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'points' | 'spend' | 'visits'>('points');

  // Loyalty Config Form State
  const [loyaltyForm, setLoyaltyForm] = useState({
    enabled: true,
    earningMode: 'PERCENTAGE' as 'PERCENTAGE' | 'SPEND_RATIO' | 'FIXED_PER_ORDER',
    earnPercentage: 50,
    spendRatioPaise: 1000,
    fixedPointsPerOrder: 50,
    validityDays: 7,
    pointValuePaise: 50,
    maxRedemptionPercentPerOrder: 50,
    minPointsToRedeem: 50,
  });

  // Loyalty Points Adjustment Modal State
  const [showAdjustPoints, setShowAdjustPoints] = useState(false);
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Manager Courtesy Bonus');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Customers Query
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['managerCustomers', activeRestaurantId, debouncedSearch, page],
    queryFn: async () => {
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/customers?page=${page}&limit=20${searchParam}`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  // Fetch Loyalty Leaderboard Query
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['loyaltyLeaderboard', activeRestaurantId, leaderboardSortBy],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/loyalty/leaderboard?sortBy=${leaderboardSortBy}&limit=25`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && activeTab === 'LEADERBOARD',
  });

  // Fetch Loyalty Config Query
  const { data: loyaltyConfigData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['loyaltyConfig', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/loyalty/config`);
      return res.data;
    },
    enabled: !!activeRestaurantId && activeTab === 'LOYALTY_RULES',
  });

  React.useEffect(() => {
    if (loyaltyConfigData?.data) {
      setLoyaltyForm(prev => ({ ...prev, ...loyaltyConfigData.data }));
    }
  }, [loyaltyConfigData]);

  // Update Loyalty Config Mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}/loyalty/config`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Loyalty settings updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['loyaltyConfig', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to update loyalty settings', 'error');
    },
  });

  // Fetch Selected Customer Details Modal
  const { data: customerDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['managerCustomerDetails', activeRestaurantId, selectedCustomerId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/customers/${selectedCustomerId}`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && !!selectedCustomerId,
  });

  // Fetch Selected Customer Loyalty Ledger
  const { data: loyaltyLedgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['customerLoyaltyLedger', activeRestaurantId, selectedCustomerId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/customers/${selectedCustomerId}/loyalty-ledger`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && !!selectedCustomerId,
  });

  // Adjust Points Mutation
  const adjustPointsMutation = useMutation({
    mutationFn: async (payload: { customerId: string; pointsDelta: number; reason?: string }) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/loyalty/adjust`, payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast(res.message || 'Loyalty points adjusted successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['managerCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['managerCustomerDetails'] });
      queryClient.invalidateQueries({ queryKey: ['customerLoyaltyLedger'] });
      setShowAdjustPoints(false);
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to adjust points', 'error');
    },
  });

  const customers = customersData?.success ? customersData.data.customers : [];
  const pagination = customersData?.success ? customersData.data.pagination : { total: 0, totalPages: 1 };

  // Summary Metrics
  const totalDiners = pagination.total || 0;
  const repeatDiners = customers.filter((c: any) => c.totalOrdersCount > 1).length;
  const totalRevenue = customers.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <Helmet>
        <title>Customer Directory - Pixora QR</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display tracking-tight text-3xl font-semibold text-slate-900 flex items-center gap-3">
            <span>Customer Directory & Loyalty</span>
            {activeTab === 'LEADERBOARD' && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>VIP Leaderboard</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track diner visit frequency, loyalty points, VIP rankings, and order history.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'DIRECTORY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Directory</span>
          </button>
          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'LEADERBOARD' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>VIP Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('LOYALTY_RULES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'LOYALTY_RULES' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-slate-950" />
            <span>Rules & Setup</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Diners</span>
            <h3 className="text-2xl font-black font-mono text-slate-900 mt-0.5">{totalDiners}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Repeat Diners</span>
            <h3 className="text-2xl font-black font-mono text-slate-900 mt-0.5">{repeatDiners}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Diner Volume</span>
            <h3 className="text-2xl font-black font-mono text-emerald-600 mt-0.5">{formatPrice(totalRevenue)}</h3>
          </div>
        </div>
      </div>

      {activeTab === 'DIRECTORY' && (
        <>
          {/* Search Input */}
          <div className="bg-white rounded-3xl p-4 border border-slate-150 shadow-xs flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by diner name, mobile number, or email..."
              className="w-full text-sm font-medium placeholder-slate-400 focus:outline-none bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
                <p className="text-sm font-bold text-slate-700">No diners found</p>
                <p className="text-xs text-slate-400">
                  {debouncedSearch ? 'Try a different search keyword.' : 'Customer records will populate automatically as orders are placed.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-150 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6">Diner</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4 text-center">Visits</th>
                      <th className="py-3.5 px-4 text-center">Loyalty Tier & Points</th>
                      <th className="py-3.5 px-4 text-right">Total Spent</th>
                      <th className="py-3.5 px-4">Last Order</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {customers.map((c: any) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                              {c.name?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {c._id.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{c.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                            c.totalOrdersCount > 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.totalOrdersCount || 0} order{c.totalOrdersCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              c.tier === 'PLATINUM'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : c.tier === 'GOLD'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : c.tier === 'SILVER'
                                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}>
                              ⭐ {c.tier || 'BRONZE'}
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {c.loyaltyPoints || 0} pts (₹{(((c.loyaltyPoints || 0) * 50) / 100).toFixed(0)})
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                          {formatPrice(c.totalSpent)}
                        </td>

                        <td className="py-4 px-4 text-slate-500">
                          {c.lastOrderAt ? (
                            <div>
                              <span className="block">{new Date(c.lastOrderAt).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(c.lastOrderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No orders yet</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedCustomerId(c._id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-150 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  Page {page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-bold rounded-xl transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-bold rounded-xl transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'LEADERBOARD' && (
        /* LEADERBOARD VIEW */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Top Diners Leaderboard</h3>
                <p className="text-xs text-slate-400">Rankings based on overall customer engagement and loyalty points</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 font-mono pl-2 font-bold uppercase">Sort By:</span>
              <button
                onClick={() => setLeaderboardSortBy('points')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  leaderboardSortBy === 'points' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Points Balance
              </button>
              <button
                onClick={() => setLeaderboardSortBy('spend')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  leaderboardSortBy === 'spend' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Total Spend
              </button>
              <button
                onClick={() => setLeaderboardSortBy('visits')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  leaderboardSortBy === 'visits' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Visits Count
              </button>
            </div>
          </div>

          {/* Leaderboard Grid / Table */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden">
            {isLeaderboardLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : (!leaderboardData?.data || leaderboardData.data.length === 0) ? (
              <div className="py-16 text-center space-y-2">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No leaderboard rankings available yet</p>
                <p className="text-xs text-slate-400">Customer rankings will appear as diners earn loyalty points.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-150 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6 text-center">Rank</th>
                      <th className="py-3.5 px-6">Diner</th>
                      <th className="py-3.5 px-4 text-center">Reward Tier</th>
                      <th className="py-3.5 px-4 text-center">Loyalty Points</th>
                      <th className="py-3.5 px-4 text-center">Total Visits</th>
                      <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {leaderboardData.data.map((lb: any) => {
                      const rank = lb.rank;
                      const isTop3 = rank <= 3;
                      return (
                        <tr key={lb.customerId} className={`hover:bg-slate-50/50 transition ${isTop3 ? 'bg-amber-50/20' : ''}`}>
                          <td className="py-4 px-6 text-center">
                            {rank === 1 ? (
                              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-black text-sm inline-flex items-center justify-center shadow-sm">
                                🥇 1
                              </span>
                            ) : rank === 2 ? (
                              <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-black text-sm inline-flex items-center justify-center border border-slate-300">
                                🥈 2
                              </span>
                            ) : rank === 3 ? (
                              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-black text-sm inline-flex items-center justify-center border border-amber-300">
                                🥉 3
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-slate-500 text-xs">
                                #{rank}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs ${
                                rank === 1 ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-900 text-white'
                              }`}>
                                {lb.name?.charAt(0) || 'D'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{lb.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{lb.phone}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              lb.tier === 'PLATINUM'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : lb.tier === 'GOLD'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : lb.tier === 'SILVER'
                                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}>
                              ⭐ {lb.tier || 'BRONZE'}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-mono font-extrabold text-sm text-slate-900 block">
                              {lb.loyaltyPoints || 0} pts
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Worth ₹{(lb.redeemableRupees || 0).toFixed(0)}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                            {lb.totalOrdersCount || 0} visits
                          </td>

                          <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatPrice(lb.totalSpent)}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedCustomerId(lb.customerId)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'LOYALTY_RULES' && (
        /* LOYALTY RULES & SETUP VIEW */
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-xs space-y-6">
          {isConfigLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-500" />
                    <span>Loyalty Points Earning & Validity Settings</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure how customers earn points, 7-day validity rules, and checkout redemption caps.</p>
                </div>
                <button
                  onClick={() => updateConfigMutation.mutate(loyaltyForm)}
                  disabled={updateConfigMutation.isPending}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-sm transition flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  {updateConfigMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Settings</span>
                </button>
              </div>

              {/* Program Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-sm text-slate-900 block">Enable Loyalty Points Program</span>
                  <span className="text-xs text-slate-500">Allow customers to earn and redeem points on menu orders</span>
                </div>
                <button
                  onClick={() => setLoyaltyForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${loyaltyForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${loyaltyForm.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Earning Mode Distribution */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">1. Loyalty Points Earning Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setLoyaltyForm(prev => ({ ...prev, earningMode: 'PERCENTAGE' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${loyaltyForm.earningMode === 'PERCENTAGE' ? 'border-amber-500 bg-amber-50/60 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                      <span>Percentage of Spend</span>
                      {loyaltyForm.earningMode === 'PERCENTAGE' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Diners earn a % of order total as points (e.g. 50% points on ₹420 = 210 pts).</p>
                  </div>

                  <div
                    onClick={() => setLoyaltyForm(prev => ({ ...prev, earningMode: 'SPEND_RATIO' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${loyaltyForm.earningMode === 'SPEND_RATIO' ? 'border-amber-500 bg-amber-50/60 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                      <span>Spend Ratio (₹ per Point)</span>
                      {loyaltyForm.earningMode === 'SPEND_RATIO' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Diners earn 1 point per ₹X spent on orders (e.g. 1 pt per ₹10).</p>
                  </div>

                  <div
                    onClick={() => setLoyaltyForm(prev => ({ ...prev, earningMode: 'FIXED_PER_ORDER' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${loyaltyForm.earningMode === 'FIXED_PER_ORDER' ? 'border-amber-500 bg-amber-50/60 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                      <span>Fixed Flat Points</span>
                      {loyaltyForm.earningMode === 'FIXED_PER_ORDER' && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Diners earn a flat number of points per completed order.</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Earning Inputs */}
              {loyaltyForm.earningMode === 'PERCENTAGE' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Earn Percentage (% of Order Total)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={loyaltyForm.earnPercentage}
                      onChange={e => setLoyaltyForm(prev => ({ ...prev, earnPercentage: Number(e.target.value) }))}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                    />
                    <span className="text-xs text-slate-600">% (Example: spent ₹420 with 50% = 210 points earned)</span>
                  </div>
                </div>
              )}

              {loyaltyForm.earningMode === 'FIXED_PER_ORDER' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Fixed Points per Order</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={loyaltyForm.fixedPointsPerOrder}
                      onChange={e => setLoyaltyForm(prev => ({ ...prev, fixedPointsPerOrder: Number(e.target.value) }))}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                    />
                    <span className="text-xs text-slate-600">points awarded per completed order</span>
                  </div>
                </div>
              )}

              {/* Validity & Expiry Days */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">2. Points Expiry & Validity Window</label>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Validity Period (Days)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={loyaltyForm.validityDays}
                      onChange={e => setLoyaltyForm(prev => ({ ...prev, validityDays: Number(e.target.value) }))}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                    />
                    <span className="text-xs text-slate-600">days (Set to 7 for 7-day expiry, or 0 for Never Expire)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    ⚠️ Points unredeemed past this validity window are automatically expired and deducted from customer balance.
                  </p>
                </div>
              </div>

              {/* Checkout Redemption Limits */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">3. Next Order Checkout Redemption Limits</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800">Max Bill Discount Cap (%)</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={loyaltyForm.maxRedemptionPercentPerOrder}
                      onChange={e => setLoyaltyForm(prev => ({ ...prev, maxRedemptionPercentPerOrder: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                    />
                    <span className="text-[11px] text-slate-500 block">Max % of bill total payable via points (e.g. 50% max discount).</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800">Point Cash Value (Paise per point)</label>
                    <input
                      type="number"
                      min="1"
                      value={loyaltyForm.pointValuePaise}
                      onChange={e => setLoyaltyForm(prev => ({ ...prev, pointValuePaise: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                    />
                    <span className="text-[11px] text-slate-500 block">50 paise = ₹0.50 per point. 100 paise = ₹1.00 per point.</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Customer Order History Modal */}
      <AnimatePresence>
        {selectedCustomerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl border border-slate-150 shadow-2xl p-6 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {customerDetailsData?.data?.customer?.name || 'Customer Profile'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {customerDetailsData?.data?.customer?.phone}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isDetailsLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stat bar */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Visits</span>
                      <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                        {customerDetailsData?.data?.customer?.totalOrdersCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cumulative Spend</span>
                      <span className="text-lg font-black font-mono text-emerald-600 mt-0.5 block">
                        {formatPrice(customerDetailsData?.data?.customer?.totalSpent)}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Points & Reward Tier Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {customerDetailsData?.data?.customer?.loyaltyPoints || 0} Loyalty Points
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            {customerDetailsData?.data?.customer?.tier || 'BRONZE'} TIER
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Worth ₹{(((customerDetailsData?.data?.customer?.loyaltyPoints || 0) * 50) / 100).toFixed(2)} in direct redemption discounts
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdjustPoints(!showAdjustPoints)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showAdjustPoints ? 'Cancel Adjustment' : 'Adjust Points'}</span>
                    </button>
                  </div>

                  {/* Adjust Points Inline Form */}
                  {showAdjustPoints && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-slate-900 block">Manual Points Adjustment</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                          <button
                            type="button"
                            onClick={() => setAdjustType('CREDIT')}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              adjustType === 'CREDIT' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Credit (+)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustType('DEBIT')}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              adjustType === 'DEBIT' ? 'bg-rose-600 text-white' : 'text-slate-600'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                            <span>Debit (-)</span>
                          </button>
                        </div>

                        <div>
                          <input
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value) || 0))}
                            placeholder="Points amount"
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Reason (e.g. Courtesy bonus)"
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (adjustAmount <= 0) return;
                            const delta = adjustType === 'CREDIT' ? adjustAmount : -adjustAmount;
                            adjustPointsMutation.mutate({
                              customerId: selectedCustomerId!,
                              pointsDelta: delta,
                              reason: adjustReason.trim(),
                            });
                          }}
                          disabled={adjustPointsMutation.isPending}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {adjustPointsMutation.isPending ? 'Saving...' : 'Apply Points Adjustment'}
                        </button>
                      </div>
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Orders
                  </h4>

                  {(!customerDetailsData?.data?.recentOrders || customerDetailsData.data.recentOrders.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No order records found for this customer.</p>
                  ) : (
                    <div className="space-y-3">
                      {customerDetailsData.data.recentOrders.map((ord: any) => (
                        <div
                          key={ord._id}
                          className="bg-white border border-slate-150 rounded-2xl p-4 space-y-2 shadow-xs"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold font-mono text-slate-900">
                              Order #{ord.orderNumber}
                            </span>
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {ord.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex justify-between">
                            <span>{new Date(ord.createdAt).toLocaleString()}</span>
                            {ord.tableId?.displayName && (
                              <span className="font-bold text-slate-700">{ord.tableId.displayName}</span>
                            )}
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-50">
                            {ord.items?.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs text-slate-600">
                                <span>{it.quantity}x {it.nameSnapshot}</span>
                                <span className="font-mono">{formatPrice(it.itemTotal || it.itemSubtotal)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-bold">
                            <span className="text-slate-500">Order Total</span>
                            <span className="font-mono text-slate-900">{formatPrice(ord.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Points History Ledger */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Loyalty Points History
                    </h4>
                    {isLedgerLoading ? (
                      <div className="py-4 text-center">
                        <Loader className="w-4 h-4 animate-spin text-amber-500 mx-auto" />
                      </div>
                    ) : (!loyaltyLedgerData?.data || loyaltyLedgerData.data.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No points history transactions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {loyaltyLedgerData.data.map((tx: any) => (
                          <div key={tx._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">{tx.reason || tx.type}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(tx.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-extrabold ${
                                (tx.points ?? tx.pointsChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {(tx.points ?? tx.pointsChange ?? 0) >= 0 ? `+${tx.points ?? tx.pointsChange}` : (tx.points ?? tx.pointsChange)} pts
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Bal: {tx.balanceAfter}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerCustomers;
