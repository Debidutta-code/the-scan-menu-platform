import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import {
  Loader,
  Lock,
  Receipt,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Globe,
  Printer,
  Check,
  Utensils,
  RefreshCw,
} from 'lucide-react';
import apiClient from '../lib/api';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { printOrderTicket } from '../utils/printReceipt';
import { Button } from '../components/ui/Button';

interface Transaction {
  _id: string;
  provider: string;
  method?: string;
  mode: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  orderId?: any;
  diningSessionId?: any;
  billId?: any;
  metadata?: Record<string, any>;
  providerReferenceId?: string;
  createdAt: string;
}

type DateRangeKey = 'today' | '7d' | '30d' | 'all' | 'custom';

const getDateRange = (range: DateRangeKey, customStart: string, customEnd: string) => {
  if (range === 'all') {
    return { startDate: '', endDate: '' };
  }

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

const formatINR = (paise: number) => {
  const rupees = (paise || 0) > 100 && Number.isInteger(paise) ? paise / 100 : (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
};

export const ManagerTransactions: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);
  const [markingTxnId, setMarkingTxnId] = useState<string | null>(null);

  const limit = 20;

  const { startDate, endDate } = useMemo(
    () => getDateRange(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd]
  );

  // Fetch Restaurant Settings for printing & currency
  const { data: settingsData } = useQuery({
    queryKey: ['restaurantSettings', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const restaurantInfo = useMemo(() => {
    const s = settingsData?.data || {};
    return {
      _id: activeRestaurantId,
      name: s.name || s.branding?.name || 'Restaurant',
      address: s.address,
      phone: s.phone,
      gstNumber: s.gstNumber || s.paymentConfig?.gstNumber || s.printerConfig?.gstNumber,
      fssaiNumber: s.fssaiNumber || s.paymentConfig?.fssaiNumber || s.printerConfig?.fssaiNumber,
      logoUrl: s.branding?.logoUrl || s.logoUrl,
      currency: s.currency || 'INR',
      settings: s.settings || s,
      printerConfig: s.printerConfig || s.settings?.printerConfig,
      headerMessage: s.settings?.receiptHeader || s.printerConfig?.receiptHeader,
      footerMessage: s.settings?.receiptFooter || s.printerConfig?.receiptFooter,
    };
  }, [settingsData, activeRestaurantId]);

  // Fetch Transactions List & Aggregates
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['transactions', activeRestaurantId, statusFilter, methodFilter, searchTerm, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/payments/transactions?${params}`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('payments') && !flagsLoading,
  });

  // Capture / Settle Pending Transaction Mutation
  const captureMutation = useMutation({
    mutationFn: async ({ txnId, method }: { txnId: string; method?: string }) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}/payments/transactions/${txnId}/capture`, {
        method,
      });
      return res.data;
    },
    onSuccess: () => {
      toast('Transaction marked as captured & paid!', 'success');
      queryClient.invalidateQueries({ queryKey: ['transactions', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['orders', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to capture transaction', 'error');
    },
    onSettled: () => {
      setMarkingTxnId(null);
    },
  });

  const transactions: Transaction[] = data?.data?.transactions || [];
  const total: number = data?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const summary = data?.data?.summary || {
    totalRevenue: transactions.filter((t) => t.status === 'CAPTURED').reduce((sum, t) => sum + t.amount, 0),
    capturedCount: transactions.filter((t) => t.status === 'CAPTURED').length,
    pendingCount: transactions.filter((t) => t.status === 'PENDING').length,
    failedCount: transactions.filter((t) => t.status === 'FAILED').length,
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);
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

  const renderMethodBadge = (tx: Transaction) => {
    const rawMethod = (tx.method || tx.provider || 'CASH').toUpperCase();
    if (rawMethod === 'UPI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold font-mono">
          <QrCode className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
          <span>UPI / QR</span>
        </span>
      );
    }
    if (rawMethod === 'CARD') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold font-mono">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
          <span>Card POS</span>
        </span>
      );
    }
    if (rawMethod === 'RAZORPAY' || rawMethod === 'STRIPE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold font-mono">
          <Globe className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
          <span>{rawMethod}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold font-mono">
        <Banknote className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
        <span>Cash</span>
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED':
      case 'PAID':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black font-mono uppercase tracking-wide">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
            <span>Captured</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black font-mono uppercase tracking-wide animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" strokeWidth={2.5} />
            <span>Pending</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200 text-[10px] font-black font-mono uppercase tracking-wide">
            <XCircle className="w-3 h-3 text-rose-600" strokeWidth={2.5} />
            <span>Failed</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black font-mono uppercase tracking-wide">
            <span>Refunded</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
            {status}
          </span>
        );
    }
  };

  if (flagsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mb-4 text-amber-600">
            <Lock className="w-8 h-8" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Upgrade Required</h3>
          <p className="text-slate-600 max-w-md mx-auto text-sm font-sans">
            The Payments &amp; Ledger module is not included in your current plan. Please upgrade to unlock live payment settlements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 font-sans select-none pb-8">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 md:px-5 shadow-xs">
        <div>
          <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            Payment Transactions
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Audit-grade financial ledger, settlement verification, and payment mode analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} strokeWidth={1.75} />}
            title="Refresh transactions"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleExportCsv}
            disabled={isExporting}
            isLoading={isExporting}
            leftIcon={<Download className="w-3.5 h-3.5 text-amber-400" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── SUMMARY KPI CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Total Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-slate-950">
            {formatINR(summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">
            {summary.capturedCount} collected transactions
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Successful / Paid
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-slate-950">
            {summary.capturedCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Settled to register</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Pending Due
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-amber-700">
            {summary.pendingCount}
          </p>
          <p className="text-[10px] text-amber-600 font-medium">Awaiting payment collection</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Failed / Cancelled
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-slate-950">
            {summary.failedCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Voided attempts</p>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2.5 sm:p-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Date range buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-bold font-mono mr-1">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Range:</span>
            </div>
            {(['today', '7d', '30d', 'all', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setDateRange(r);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  dateRange === r
                    ? 'bg-slate-950 text-white border-transparent shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {r === 'today'
                  ? 'Today'
                  : r === '7d'
                  ? '7 Days'
                  : r === '30d'
                  ? '30 Days'
                  : r === 'all'
                  ? 'All Time'
                  : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded-xl text-xs px-2.5 py-1 focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          )}

          {/* Method & Status Selectors & Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Order #, Guest, TXN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Payment Method Dropdown */}
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="">All Methods</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="RAZORPAY">Razorpay Gateway</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="CAPTURED">Captured / Paid</option>
              <option value="PENDING">Pending Due</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TRANSACTIONS TABLE ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-2">
            <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
            <span className="text-xs text-slate-400 font-medium">Loading ledger records...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center px-4">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Receipt className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <p className="text-base font-bold text-slate-800 font-display">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No payment transactions match your selected date range or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-6" />
                  <th className="py-3.5 px-4">Order / Reference</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {transactions.map((tx) => {
                  const isExpanded = expandedId === tx._id;
                  const ord = tx.orderId;
                  const orderNum = ord?.orderNumber || tx.metadata?.orderNumber;
                  const customerName = ord?.customerName || tx.metadata?.customerName;
                  const customerPhone = ord?.customerPhone || tx.metadata?.customerPhone;
                  const tableName = ord?.tableId?.displayName || (ord?.orderMode === 'COUNTER' ? 'Counter POS' : ord?.orderMode || 'Dine-In');

                  return (
                    <React.Fragment key={tx._id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition cursor-pointer ${
                          isExpanded ? 'bg-amber-50/20' : ''
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : tx._id)}
                      >
                        {/* Expand Chevron */}
                        <td className="py-3.5 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
                          )}
                        </td>

                        {/* Order & Ref */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {orderNum ? (
                              <span className="font-mono font-black text-sm text-slate-900">
                                #{orderNum}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-slate-500">
                                TXN
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {tableName}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                            ID: {tx._id.slice(-8)}
                          </p>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4">
                          {renderMethodBadge(tx)}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          {customerName ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900 text-xs">{customerName}</p>
                              {customerPhone && (
                                <p className="font-mono text-[10px] text-slate-400">{customerPhone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Walk-in Guest</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-950">
                          {formatINR(tx.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {renderStatusBadge(tx.status)}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          <span className="text-slate-400 ml-1">
                            {new Date(tx.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Mark as Paid (If Pending) */}
                            {tx.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMarkingTxnId(tx._id);
                                  captureMutation.mutate({ txnId: tx._id, method: tx.method || 'CASH' });
                                }}
                                disabled={captureMutation.isPending && markingTxnId === tx._id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Mark as collected & paid"
                              >
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                <span>Mark Paid</span>
                              </button>
                            )}

                            {/* Print Bill / Receipt */}
                            <button
                              type="button"
                              onClick={() => {
                                if (ord) {
                                  setPrintModalOrder(ord);
                                } else {
                                  // Synthetic order wrapper for standalone payment
                                  setPrintModalOrder({
                                    _id: tx._id,
                                    orderNumber: tx.metadata?.orderNumber || 1,
                                    items: [],
                                    total: tx.amount,
                                    subtotal: tx.amount,
                                    tax: 0,
                                    paymentStatus: tx.status === 'CAPTURED' ? 'PAID' : 'PENDING',
                                    customerName: tx.metadata?.customerName || 'Walk-in Guest',
                                    customerPhone: tx.metadata?.customerPhone,
                                    orderMode: tx.mode === 'POSTPAID' ? 'DINE_IN' : 'COUNTER',
                                    createdAt: tx.createdAt,
                                  });
                                }
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer active:scale-95"
                              title="Print Receipt or KOT"
                            >
                              <Printer className="w-4 h-4" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDED DETAILS ────────────────────────────────────────── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 border-b border-slate-200 bg-slate-50/70">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden p-6 space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Left: Financial Breakdown */}
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                      <Receipt className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Payment Details</span>
                                    </h4>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between text-slate-500">
                                        <span>Transaction ID</span>
                                        <span className="font-mono font-bold text-slate-800 break-all">{tx._id}</span>
                                      </div>
                                      <div className="flex justify-between text-slate-500">
                                        <span>Gateway Provider</span>
                                        <span className="font-mono font-bold text-slate-800">{tx.provider}</span>
                                      </div>
                                      <div className="flex justify-between text-slate-500">
                                        <span>Mode</span>
                                        <span className="font-mono font-bold text-slate-800">{tx.mode}</span>
                                      </div>
                                      {tx.providerReferenceId && (
                                        <div className="flex justify-between text-slate-500">
                                          <span>UTR / Reference ID</span>
                                          <span className="font-mono font-bold text-slate-800">{tx.providerReferenceId}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between text-slate-950 font-black border-t pt-1.5 mt-1">
                                        <span>Total Settled</span>
                                        <span className="font-mono text-emerald-700">{formatINR(tx.amount)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Center: Order Items */}
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Linked Order Items</span>
                                      </h4>
                                      {orderNum && (
                                        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                          Order #{orderNum}
                                        </span>
                                      )}
                                    </div>

                                    {ord?.items && ord.items.length > 0 ? (
                                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {ord.items.map((item: any, idx: number) => {
                                          const itemPrice = item.unitPriceSnapshot || item.price || 0;
                                          const itemTot = item.itemTotal || itemPrice * item.quantity;
                                          return (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-slate-900 w-5">
                                                  {item.quantity}x
                                                </span>
                                                <span className="text-slate-800 font-medium">
                                                  {item.nameSnapshot || item.name || 'Dish'}
                                                </span>
                                              </div>
                                              <span className="font-mono text-slate-700 font-bold">
                                                {formatINR(itemTot)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic py-3">
                                        Direct ledger transaction or no individual dishes recorded.
                                      </p>
                                    )}

                                    {/* Direct Print Button in Expansion */}
                                    <div className="pt-2 border-t flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetOrd = ord || {
                                            _id: tx._id,
                                            orderNumber: tx.metadata?.orderNumber || 1,
                                            items: [],
                                            total: tx.amount,
                                            subtotal: tx.amount,
                                            tax: 0,
                                            paymentStatus: tx.status === 'CAPTURED' ? 'PAID' : 'PENDING',
                                            customerName: tx.metadata?.customerName || 'Walk-in Guest',
                                            customerPhone: tx.metadata?.customerPhone,
                                            orderMode: tx.mode === 'POSTPAID' ? 'DINE_IN' : 'COUNTER',
                                            createdAt: tx.createdAt,
                                          };
                                          printOrderTicket(targetOrd, restaurantInfo, 'CUSTOMER');
                                        }}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Print Customer Receipt (80mm)</span>
                                      </button>
                                    </div>
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

        {/* ── PAGINATION ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            <p className="text-xs text-slate-500 font-mono">
              Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong> · <strong className="text-slate-900">{total}</strong> transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 hover:border-slate-400 transition cursor-pointer shadow-2xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 hover:border-slate-400 transition cursor-pointer shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PRINT ORDER MODAL INTEGRATION ───────────────────────────────── */}
      {printModalOrder && (
        <PrintOrderModal
          isOpen={!!printModalOrder}
          onClose={() => setPrintModalOrder(null)}
          order={printModalOrder}
          restaurantInfo={restaurantInfo}
        />
      )}
    </div>
  );
};

export default ManagerTransactions;
