import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';

import { Loader, Lock, Receipt, Calendar, CreditCard, Filter } from 'lucide-react';
import apiClient from '../lib/api';

interface Transaction {
  _id: string;
  provider: string;
  mode: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export const ManagerTransactions: React.FC = () => {
  const { user } = useAuth();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();

  const activeRestaurantId = user?.restaurants?.[0];

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', activeRestaurantId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (statusFilter) params.append('status', statusFilter);

      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/payments/transactions?${params.toString()}`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('payments') && !flagsLoading,
  });

  const transactions: Transaction[] = data?.data?.transactions || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (flagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  if (!isEnabled('payments')) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 font-sans h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">
              Transactions
            </h1>
            <p className="text-slate-500 text-sm">View and manage all payment history</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Upgrade Required</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            The Payment Abstraction Framework is not included in your current plan. Please upgrade your subscription to unlock digital payments and view the transactions ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">
            Transactions
          </h1>
          <p className="text-slate-500 text-sm">View and manage all payment history</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CAPTURED">Captured</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
             <Loader className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No transactions found</h3>
            <p className="text-sm text-slate-500">Payments and manual ledger entries will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Provider & Mode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                      {tx._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-slate-900">
                        <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
                        {tx.provider}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{tx.mode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: tx.currency }).format(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        tx.status === 'CAPTURED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        tx.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        tx.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
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
