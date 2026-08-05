import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { adminService, Restaurant } from '../services/restaurant.service';
import {
  Plus,
  Edit2,
  ShieldAlert,
  CheckCircle,
  UserPlus,
  X,
  Loader,
  TrendingUp,
  LayoutGrid,
  Store,
  Layers,
  Eye,
  Trash2,
  AlertTriangle,
  LogIn,
} from 'lucide-react';

const restaurantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')),
  address: z.string().optional(),
  googleReviewUrl: z.string().optional(),
  subscription: z.object({
    status: z.enum(['ACTIVE', 'EXPIRED', 'TRIAL']),
    planType: z.enum(['STARTER', 'PREMIUM', 'ENTERPRISE']),
    expiresAt: z.string(),
  }).optional(),
});

const managerSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RestaurantFormValues = z.infer<typeof restaurantSchema>;
type ManagerFormValues = z.infer<typeof managerSchema>;

export const AdminRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { impersonateOutlet } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRest, setEditingRest] = useState<Restaurant | null>(null);
  const [assigningRestId, setAssigningRestId] = useState<string | null>(null);
  const [deletingRest, setDeletingRest] = useState<Restaurant | null>(null);
  const [confirmSlugInput, setConfirmSlugInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'TRIAL'>('ALL');

  // Fetch stats
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminService.getPlatformStats,
  });

  // Fetch restaurants
  const { data: restResponse, isLoading: isLoadingRests } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: () => adminService.listRestaurants(1, 100),
  });

  const restaurantsRaw = restResponse?.data?.restaurants || [];

  // Filtered restaurants
  const restaurants = restaurantsRaw.filter((rest: any) => {
    const matchesSearch = rest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (rest.slug && rest.slug.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (rest.email && rest.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const isRestActive = rest.status !== 'SUSPENDED' && rest.status !== 'ARCHIVED';

    const matchesStatus = statusFilter === 'ALL' ||
                          (statusFilter === 'ACTIVE' && isRestActive) ||
                          (statusFilter === 'SUSPENDED' && rest.status === 'SUSPENDED');

    const matchesSub = subscriptionFilter === 'ALL' ||
                        (rest.subscription && rest.subscription.status === subscriptionFilter);

    return matchesSearch && matchesStatus && matchesSub;
  });

  const stats = statsResponse?.data || {
    totalRestaurants: 0,
    activeRestaurants: 0,
    suspendedRestaurants: 0,
    totalOrders: 0,
    activityFeed: [],
  };

  // Create restaurant
  const createMutation = useMutation({
    mutationFn: adminService.createRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setIsCreateOpen(false);
      restForm.reset();
      toast('Restaurant tenant successfully registered on the platform!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error creating restaurant');
    },
  });

  // Edit restaurant
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      adminService.editRestaurant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      setEditingRest(null);
      restForm.reset();
      toast('Restaurant details successfully saved!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error updating restaurant');
    },
  });

  // Suspend
  const suspendMutation = useMutation({
    mutationFn: adminService.suspendRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast('Restaurant suspended immediately. Custom menu disabled.', 'info');
    },
  });

  // Activate
  const activateMutation = useMutation({
    mutationFn: adminService.activateRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast('Restaurant activated. Live checkouts resumed.', 'success');
    },
  });

  // Archive / Soft-delete
  const deleteMutation = useMutation({
    mutationFn: adminService.deleteRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setDeletingRest(null);
      setConfirmSlugInput('');
      toast('Restaurant archived successfully.', 'info');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error archiving restaurant');
    },
  });

  // Create & Assign Manager
  const managerMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: ManagerFormValues }) =>
      adminService.assignManager(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      setAssigningRestId(null);
      managerForm.reset();
      toast('Platform manager credentials created and assigned successfully!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error creating/assigning manager');
    },
  });

  const restForm = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
  });

  const managerForm = useForm<ManagerFormValues>({
    resolver: zodResolver(managerSchema),
  });

  const onRestSubmit = (values: RestaurantFormValues) => {
    setErrorMsg(null);
    const cleanedValues = {
      ...values,
      email: values.email === '' ? undefined : values.email,
    };
    if (editingRest) {
      editMutation.mutate({ id: editingRest._id, data: cleanedValues });
    } else {
      createMutation.mutate(cleanedValues);
    }
  };

  const onManagerSubmit = (values: ManagerFormValues) => {
    setErrorMsg(null);
    if (assigningRestId) {
      managerMutation.mutate({ restaurantId: assigningRestId, data: values });
    }
  };

  const handleEditClick = (rest: any) => {
    setEditingRest(rest);
    restForm.reset({
      name: rest.name,
      slug: rest.slug,
      description: rest.description || '',
      phone: rest.phone || '',
      email: rest.email || '',
      address: rest.address || '',
      googleReviewUrl: rest.googleReviewUrl || '',
      subscription: rest.subscription ? {
        status: rest.subscription.status,
        planType: rest.subscription.planType,
        expiresAt: rest.subscription.expiresAt ? new Date(rest.subscription.expiresAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      } : {
        status: 'TRIAL',
        planType: 'STARTER',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
    setIsCreateOpen(true);
  };

  if (isLoadingStats || isLoadingRests) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      {/* 1. Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Tenants</span>
            <Store className="w-4.5 h-4.5 text-slate-400" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.totalRestaurants}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-green-600">
            <span className="text-xs font-extrabold uppercase tracking-wider">Active</span>
            <CheckCircle className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.activeRestaurants}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Suspended</span>
            <ShieldAlert className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.suspendedRestaurants}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-indigo-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Platform Orders</span>
            <TrendingUp className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{stats.totalOrders}</h3>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Restaurant List Panel (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Registered Restaurant Tenants</h2>
                <p className="text-[11px] text-slate-500">Add, configure, suspend, or inspect tenant profiles inline.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/restaurants/provision')}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-extrabold transition shadow-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  <span>Provision Wizard</span>
                </button>

                <button
                  onClick={() => {
                    setEditingRest(null);
                    restForm.reset({
                      name: '',
                      slug: '',
                      description: '',
                      phone: '',
                      email: '',
                      address: '',
                      googleReviewUrl: '',
                      subscription: {
                        status: 'TRIAL',
                        planType: 'STARTER',
                        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      },
                    });
                    setIsCreateOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm border border-slate-950 shrink-0"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Quick Add</span>
                </button>
              </div>
            </div>

            {/* Advanced search and filter panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Search Name / Slug</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cafes, bistros..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Platform Status</label>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="SUSPENDED">Suspended Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Subscription Plan</label>
                <select
                  value={subscriptionFilter}
                  onChange={(e: any) => setSubscriptionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="ALL">All Subscriptions</option>
                  <option value="ACTIVE">Active Subscriptions</option>
                  <option value="TRIAL">Trial Plans</option>
                  <option value="EXPIRED">Expired Subscriptions</option>
                </select>
              </div>
            </div>
          </div>

          {restaurants.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-150 text-center text-slate-400">
              No restaurants matching filters found on this platform.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {restaurants.map((rest: Restaurant | any) => {
                const isActive = rest.status !== 'SUSPENDED' && rest.status !== 'ARCHIVED';
                return (
                  <div
                    key={rest._id}
                    className="bg-white rounded-3xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between hover:shadow transition"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3
                          onClick={() => navigate(`/admin/restaurants/${rest._id}`)}
                          className="font-bold text-sm text-slate-950 leading-tight hover:text-amber-600 transition cursor-pointer"
                        >
                          {rest.name}
                        </h3>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {rest.status || (isActive ? 'ACTIVE' : 'SUSPENDED')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">Slug: {rest.slug}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                        {rest.description || 'No description provided.'}
                      </p>

                      {/* Subscription Badges */}
                      {rest.subscription && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${
                            rest.subscription.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : rest.subscription.status === 'TRIAL'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {rest.subscription.planKey || rest.subscription.planType} • {rest.subscription.status}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 font-mono shrink-0">
                            Exp: {new Date(rest.subscription.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            impersonateOutlet({ id: rest._id, name: rest.name, slug: rest.slug });
                            navigate('/manager/orders');
                          }}
                          className="flex items-center gap-1 text-slate-950 font-bold bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition shadow-sm"
                          title="Manage Outlet as SuperAdmin"
                        >
                          <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>Impersonate</span>
                        </button>

                        <button
                          onClick={() => navigate(`/admin/restaurants/${rest._id}`)}
                          className="flex items-center gap-1 text-slate-800 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => handleEditClick(rest)}
                          className="flex items-center gap-1 hover:text-slate-900 transition p-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setAssigningRestId(rest._id)}
                          className="flex items-center gap-1 text-amber-600 hover:text-amber-800 transition p-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Manager</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <button
                            onClick={() => suspendMutation.mutate(rest._id)}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 transition p-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => activateMutation.mutate(rest._id)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-800 transition p-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>Activate</span>
                          </button>
                        )}

                        <button
                          onClick={() => { setDeletingRest(rest); setConfirmSlugInput(''); }}
                          className="text-slate-400 hover:text-red-600 transition p-1"
                          title="Archive Tenant"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>Live Activity Feed</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time platform events log.</p>
          </div>

          {stats.activityFeed.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No recent platform activity logged.
            </div>
          ) : (
            <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-1">
              {stats.activityFeed.map((act: any, idx: number) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${act.type === 'RESTAURANT_CREATED' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-slate-700 leading-relaxed font-sans">{act.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create / Edit Restaurant Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">
                {editingRest ? 'Edit Restaurant' : 'New Restaurant'}
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={restForm.handleSubmit(onRestSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="The Pizza Place"
                  {...restForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="pizza-place"
                  {...restForm.register('slug')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  placeholder="Authentic woodfired pizza..."
                  {...restForm.register('description')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9999999999"
                    {...restForm.register('phone')}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="text"
                    placeholder="contact@pizzaplace.com"
                    {...restForm.register('email')}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || editMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {(createMutation.isPending || editMutation.isPending) && <Loader className="w-4 h-4 animate-spin" />}
                  <span>{editingRest ? 'Save Changes' : 'Register Tenant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Manager Modal */}
      {assigningRestId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-amber-500">
                <LayoutGrid className="w-5 h-5" strokeWidth={1.75} />
                <h2 className="font-display text-2xl font-bold">Create Restaurant Manager</h2>
              </div>
              <button onClick={() => setAssigningRestId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={managerForm.handleSubmit(onManagerSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...managerForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="manager@pizzaplace.com"
                  {...managerForm.register('email')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...managerForm.register('password')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAssigningRestId(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={managerMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {managerMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                  <span>Create & Assign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {deletingRest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">Archive Restaurant</h3>
                <p className="text-[11px] text-slate-500">Soft-deletes tenant and revokes access.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This will archive <strong className="text-slate-900">{deletingRest.name}</strong> (`{deletingRest.slug}`).
              To confirm, type the slug <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono font-bold">{deletingRest.slug}</code> below:
            </p>

            <input
              type="text"
              value={confirmSlugInput}
              onChange={(e) => setConfirmSlugInput(e.target.value)}
              placeholder={deletingRest.slug}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 font-mono mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeletingRest(null); setConfirmSlugInput(''); }}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmSlugInput !== deletingRest.slug || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingRest._id)}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminRestaurants;
