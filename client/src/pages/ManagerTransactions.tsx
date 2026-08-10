import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import {
  Loader,
  Lock,
  Receipt,
  Calendar,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import apiClient from '../lib/api';

interface Transaction {
  _id: string;
  provider: string;
  mode: string;
  amount: number;
  currency: string;
  status: string;
  orderId?: string;
  createdAt: string;
}

type DateRangeKey = 'today' | '7d' | '30d' | 'custom';

const getDateRange = (range: DateRangeKey, customStart: string, customEnd: string) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (range === '7d') start.setDate(start.getDate() - 6);
  else if (range === '30d') start.setDate(start.getDate() - 29);
  else if (range === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const statusStyle: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CAPTURED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const formatINR = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);

export const ManagerTransactions: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const limit = 25;

  const { startDate, endDate } = getDateRange(dateRange, customStart, customEnd);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', activeRestaurantId, statusFilter, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/payments/transactions?${params}`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('payments') && !flagsLoading,
  });

  const transactions: Transaction[] = data?.data?.transactions || [];
  const total: number = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Summary stats from current page data
  const successTxns = transactions.filter((t) => ['SUCCESS', 'PAID', 'CAPTURED'].includes(t.status));
  const failedTxns = transactions.filter((t) => t.status === 'FAILED');
  const pendingTxns = transactions.filter((t) => t.status === 'PENDING');
  const totalRevenue = successTxns.reduce((sum, t) => sum + t.amount, 0);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/payments/transactions/export?${params}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV exported successfully', 'success');
    } catch {
      toast('Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (flagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  if (!isEnabled('payments')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage all payment history</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Upgrade Required</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            The Payments module is not included in your current plan. Please upgrade to unlock the transactions ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Full payment ledger for this outlet</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
        >
          {isExporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={1.75} />}
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: formatINR(totalRevenue),
            icon: <TrendingUp className="w-4.5 h-4.5" strokeWidth={1.75} />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Successful',
            value: successTxns.length,
            icon: <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={1.75} />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Pending',
            value: pendingTxns.length,
            icon: <Clock className="w-4.5 h-4.5" strokeWidth={1.75} />,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Failed',
            value: failedTxns.length,
            icon: <XCircle className="w-4.5 h-4.5" strokeWidth={1.75} />,
            color: 'text-red-500',
            bg: 'bg-red-50',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-150 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className={`${card.bg} ${card.color} p-1.5 rounded-lg`}>{card.icon}</div>
            </div>
            <p className="text-xl font-black font-mono text-slate-900">{card.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">current page</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-4 flex flex-wrap items-center gap-3">
        {/* Date range */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          {(['today', '7d', '30d', 'custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                dateRange === r
                  ? 'bg-slate-950 text-white border-transparent'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
              className="border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mb-3" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-500">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or status filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-150">
                <tr>
                  <th className="py-3 px-4 w-5" />
                  <th className="py-3 px-4">Provider / Mode</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isExpanded = expandedId === tx._id;
                  return (
                    <React.Fragment key={tx._id}>
                      <tr
                        className="hover:bg-slate-50/60 cursor-pointer transition"
                        onClick={() => setExpandedId(isExpanded ? null : tx._id)}
                      >
                        <td className="py-3.5 px-4 text-slate-400">
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                            : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{tx.provider}</p>
                          <p className="text-slate-400 mt-0.5 uppercase font-mono text-[10px]">{tx.mode}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                          {formatINR(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-full border ${statusStyle[tx.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-100">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <p className="text-slate-400 font-mono uppercase text-[9px] tracking-wider mb-0.5">Transaction ID</p>
                                    <p className="font-mono font-bold text-slate-700 break-all">{tx._id}</p>
                                  </div>
                                  {tx.orderId && (
                                    <div>
                                      <p className="text-slate-400 font-mono uppercase text-[9px] tracking-wider mb-0.5">Order ID</p>
                                      <p className="font-mono font-bold text-slate-700 break-all">{tx.orderId}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-slate-400 font-mono uppercase text-[9px] tracking-wider mb-0.5">Currency</p>
                                    <p className="font-mono font-bold text-slate-700">{tx.currency}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-mono uppercase text-[9px] tracking-wider mb-0.5">Provider</p>
                                    <p className="font-mono font-bold text-slate-700">{tx.provider}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-mono uppercase text-[9px] tracking-wider mb-0.5">Mode</p>
                                    <p className="font-mono font-bold text-slate-700">{tx.mode}</p>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-500 font-mono">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-40 hover:border-slate-400 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-40 hover:border-slate-400 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTransactions;
