import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Phone,
  Utensils,
  Receipt,
  ShoppingBag,
  LogOut,
  Edit2,
  Check,
  X,
  Loader,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { useCustomerAuth } from '../hooks/useCustomerAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';

const formatPrice = (amountInPaise: number, currency: string = 'INR') => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
  }).format((amountInPaise || 0) / 100);
};

export const PublicCustomerPortal: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  // `from` is the table session URL passed when navigating here from the table page.
  // Falls back to browser history, then to the table root if neither is available.
  const returnTo = searchParams.get('from') || null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customer, customerToken, isAuthenticated, isLoading: isAuthLoading, logout, updateProfile } = useCustomerAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(restaurantSlug ? `/r/${restaurantSlug}/login` : '/customer-login');
    }
  }, [isAuthLoading, isAuthenticated, restaurantSlug, navigate]);

  // Fetch Order History
  const { data: ordersResponse, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['customerOrders', customerToken],
    queryFn: async () => {
      const res = await apiClient.get('/public/customers/orders', {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });
      return res.data;
    },
    enabled: !!customerToken,
  });

  const orders = ordersResponse?.success ? ordersResponse.data.orders : [];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ name: editName, email: editEmail });
      toast('Profile updated successfully', 'success');
      setIsEditingProfile(false);
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(customer?.name || '');
    setEditEmail(customer?.email || '');
    setIsEditingProfile(true);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <Helmet>
        <title>{customer.name || 'Diner'} - Customer Portal</title>
      </Helmet>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-4 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(restaurantSlug || returnTo) && (
              <button
                onClick={() => {
                  if (returnTo) {
                    navigate(returnTo);
                  } else if (restaurantSlug) {
                    navigate(`/r/${restaurantSlug}/order`);
                  } else {
                    navigate(-1);
                  }
                }}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
            <div>
              <h1 className="font-display tracking-tight text-xl font-bold text-slate-900">Diner Dashboard</h1>
              <p className="text-[11px] text-slate-500 font-medium">Manage orders & preferences</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate(restaurantSlug ? `/r/${restaurantSlug}/login` : '/customer-login');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200/80"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-2xl flex items-center justify-center text-slate-950 font-display text-3xl font-black shadow-md shadow-amber-500/10 shrink-0">
                {customer.name?.charAt(0) || 'D'}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  {customer.name || 'Valued Diner'}
                </h2>
                <p className="text-xs text-amber-700 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                  <span>{customer.phone}</span>
                </p>
                {customer.email && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{customer.email}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleStartEdit}
              className="self-start sm:self-center px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Total Visits</span>
              <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">
                {customer.totalOrdersCount || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Total Spent</span>
              <span className="text-xl font-black font-mono text-emerald-600 mt-0.5 block">
                {formatPrice(customer.totalSpent)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Member Since</span>
              <span className="text-xs font-bold text-slate-700 mt-1.5 block">
                {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Recent'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditingProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 font-display">Edit Profile Details</h3>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order History Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" strokeWidth={2} />
              <span>Past Orders History</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </span>
          </div>

          {isOrdersLoading ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-200/80 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-250 p-8 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                <ShoppingBag className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No order history found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                When you place food and drink orders using this phone number, they will automatically appear here.
              </p>
              {restaurantSlug && (
                <Link
                  to={`/r/${restaurantSlug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl mt-2 transition shadow-sm"
                >
                  <Utensils className="w-4 h-4" strokeWidth={2} />
                  <span>Browse Menu</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => {
                const dateStr = new Date(order.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-xs font-black text-slate-900">
                          Order #{order.orderNumber}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {dateStr}
                          </span>
                          <span>•</span>
                          <span>{timeStr}</span>
                          {order.tableId?.displayName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-800 font-bold">{order.tableId.displayName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg uppercase ${
                          order.status === 'SERVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-1.5">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700 font-medium">
                            <strong className="text-slate-900 font-mono font-bold">{item.quantity}x</strong>{' '}
                            {item.nameSnapshot}
                          </span>
                          <span className="text-slate-600 font-mono font-semibold">
                            {formatPrice(item.itemTotal || item.itemSubtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Grand Total</span>
                      <span className="text-sm font-mono text-slate-950 font-black">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PublicCustomerPortal;
