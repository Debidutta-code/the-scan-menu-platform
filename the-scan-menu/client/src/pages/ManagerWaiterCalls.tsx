import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { Navigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
  CheckCircle2,
  BellRing,
  Loader,
  Droplet,
  Layers,
  HelpCircle,
  FileText,
  UserCheck,
  CheckCheck,
  History,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import apiClient from '../lib/api';

interface StaffAttribution {
  name: string;
  role: string;
}

interface WaiterCall {
  _id: string;
  restaurantId: string;
  tableId: { displayName: string; tableNumber: string } | any;
  tableNumberSnapshot: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED';
  requestType: 'CALL_WAITER' | 'REQUEST_BILL' | 'WATER' | 'TISSUE' | 'OTHER';
  createdAt: string;
  expiresAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: StaffAttribution;
  resolvedAt?: string;
  resolvedBy?: StaffAttribution;
}

const getRequestTypeDetails = (type: string) => {
  switch (type) {
    case 'REQUEST_BILL':
      return {
        label: 'Bill Request',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-100',
        icon: <FileText className="w-4.5 h-4.5 text-emerald-600" strokeWidth={1.75} />,
      };
    case 'WATER':
      return {
        label: 'Bring Water',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-100',
        icon: <Droplet className="w-4.5 h-4.5 text-sky-600" strokeWidth={1.75} />,
      };
    case 'TISSUE':
      return {
        label: 'Bring Tissues',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: <Layers className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.75} />,
      };
    case 'OTHER':
      return {
        label: 'Other Help',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-150',
        icon: <HelpCircle className="w-4.5 h-4.5 text-purple-600" strokeWidth={1.75} />,
      };
    case 'CALL_WAITER':
    default:
      return {
        label: 'Call Waiter',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-100',
        icon: <BellRing className="w-4.5 h-4.5 text-amber-600" strokeWidth={1.75} />,
      };
  }
};

export const ManagerWaiterCalls: React.FC = () => {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Fetch Waiter Calls
  const { data: waiterCallsData, isLoading: isLoadingWaiterCalls } = useQuery({
    queryKey: ['waiterCallsQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/waiter-calls?limit=50`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    refetchInterval: 10000,
  });

  const activeWaiterCalls = React.useMemo(() => {
    if (!waiterCallsData?.success) return [];
    return waiterCallsData.data.waiterCalls.filter(
      (c: WaiterCall) => c.status === 'PENDING' || c.status === 'ACKNOWLEDGED'
    );
  }, [waiterCallsData]);

  const historyWaiterCalls = React.useMemo(() => {
    if (!waiterCallsData?.success) return [];
    return waiterCallsData.data.waiterCalls.filter(
      (c: WaiterCall) => c.status === 'RESOLVED' || c.status === 'EXPIRED' || c.status === 'CANCELLED'
    );
  }, [waiterCallsData]);

  const ackWaiterCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/waiter-calls/${callId}/acknowledge`
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast(`Acknowledged Table ${data.data.tableNumberSnapshot} waiter call`, 'success');
      queryClient.invalidateQueries({ queryKey: ['waiterCallsQueue', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error acknowledging waiter call', 'error');
    },
  });

  const resolveWaiterCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/waiter-calls/${callId}/resolve`
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast(`Resolved Table ${data.data.tableNumberSnapshot} waiter call`, 'success');
      queryClient.invalidateQueries({ queryKey: ['waiterCallsQueue', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error resolving waiter call', 'error');
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Loader className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1">
          You are currently not associated as a manager with any restaurant. Please contact a Super Admin.
        </p>
      </div>
    );
  }

  if (!flagsLoading && !isEnabled('waiter_call')) {
    return <Navigate to="/manager/orders" replace />;
  }

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h3 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Floor Service Assistance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Live customer calls, staff attendance tracking, and 5-minute auto-resolved audit logs.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 shrink-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${activeWaiterCalls.length > 0 ? 'text-amber-500 animate-bounce' : ''}`} />
            <span>Active Queue</span>
            {activeWaiterCalls.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                {activeWaiterCalls.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Call History</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-[10px] font-black">
              {historyWaiterCalls.length}
            </span>
          </button>
        </div>
      </div>

      {isLoadingWaiterCalls ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
        </div>
      ) : activeTab === 'active' ? (
        /* ACTIVE QUEUE */
        activeWaiterCalls.length === 0 ? (
          <div className="max-w-lg mx-auto w-full bg-white rounded-3xl border border-slate-150 p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm my-12">
            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-800">No active calls</h3>
              <p className="text-slate-500 text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                All floor tables are fully attended. New waiter requests will chime here in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {activeWaiterCalls.map((call: WaiterCall) => {
                const isPending = call.status === 'PENDING';
                const details = getRequestTypeDetails(call.requestType || 'CALL_WAITER');
                const callAgeMinutes = Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 60000);

                return (
                  <motion.div
                    key={call._id}
                    layout
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 shadow-sm transition-all duration-200 ${
                      isPending
                        ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                        : 'bg-indigo-50/40 border-indigo-200/80 shadow-indigo-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                            isPending ? 'bg-amber-100 animate-pulse' : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {details.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>Table {call.tableNumberSnapshot}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${details.badgeClass}`}>
                              <span>{details.label}</span>
                            </span>
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {callAgeMinutes < 1 ? 'Just now' : `${callAgeMinutes}m ago`}
                            </span>
                            {callAgeMinutes >= 3 && isPending && (
                              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 font-bold rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold font-mono tracking-wider uppercase shrink-0 ${
                          isPending
                            ? 'bg-amber-200 text-amber-800 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {call.status}
                      </span>
                    </div>

                    {/* Attending Staff Banner */}
                    {call.status === 'ACKNOWLEDGED' && call.acknowledgedBy && (
                      <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
                        <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Attending: <strong className="font-bold text-slate-950">{call.acknowledgedBy.name}</strong> ({call.acknowledgedBy.role})
                        </span>
                      </div>
                    )}

                    {/* Progressive Action Button */}
                    <div className="flex gap-2 shrink-0">
                      {isPending ? (
                        <button
                          onClick={() => ackWaiterCallMutation.mutate(call._id)}
                          disabled={ackWaiterCallMutation.isPending}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Acknowledge (I'm On It)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => resolveWaiterCallMutation.mutate(call._id)}
                          disabled={resolveWaiterCallMutation.isPending}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Mark Resolved (Done)</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      ) : (
        /* CALL HISTORY AUDIT LOG */
        historyWaiterCalls.length === 0 ? (
          <div className="max-w-lg mx-auto w-full bg-white rounded-3xl border border-slate-150 p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm my-12">
            <History className="w-10 h-10 text-slate-300" />
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-800">No past calls logged</h3>
              <p className="text-slate-500 text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                Resolved, expired, and closed assistance calls will appear here for staff performance auditing.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Table & Type</th>
                    <th className="py-3 px-4">Requested At</th>
                    <th className="py-3 px-4">Attended By</th>
                    <th className="py-3 px-4">Resolved By</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {historyWaiterCalls.map((call: WaiterCall) => {
                    const details = getRequestTypeDetails(call.requestType || 'CALL_WAITER');
                    const isExpired = call.status === 'EXPIRED';
                    const isResolved = call.status === 'RESOLVED';

                    return (
                      <tr key={call._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                              {details.icon}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">
                                Table {call.tableNumberSnapshot}
                              </div>
                              <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border ${details.badgeClass} mt-0.5`}>
                                {details.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <div className="text-[10px] text-slate-400">
                            {new Date(call.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {call.acknowledgedBy ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="font-bold text-slate-900">{call.acknowledgedBy.name}</span>
                              <span className="text-[10px] text-slate-400">({call.acknowledgedBy.role})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not acknowledged</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {call.resolvedBy ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-900">{call.resolvedBy.name}</span>
                              <span className="text-[10px] text-slate-400">({call.resolvedBy.role})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              {isExpired ? 'Auto-expired (5m)' : '—'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold font-mono uppercase tracking-wider ${
                              isResolved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isExpired
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {call.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ManagerWaiterCalls;
