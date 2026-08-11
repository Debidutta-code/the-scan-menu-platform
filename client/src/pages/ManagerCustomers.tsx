import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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
          <h1 className="font-display tracking-tight text-3xl font-semibold text-slate-900">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track diner visit frequency, cumulative spend, and order history.
          </p>
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
