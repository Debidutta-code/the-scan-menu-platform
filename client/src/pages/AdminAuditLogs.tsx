import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import {
  Search,
  Loader,
  UserCheck,
  Store,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: auditResponse, isLoading } = useQuery({
    queryKey: ['adminAuditLogs', severityFilter, searchTerm],
    queryFn: () =>
      adminService.getAuditLogs({
        page: 1,
        limit: 100,
        severity: severityFilter,
        search: searchTerm,
      }),
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const logs = auditResponse?.data?.logs || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Security & Operational Inspector</span>
          <h2 className="font-display text-3xl font-bold mt-1">Global System Audit Logs</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Track administrative operations, tenant lifecycle events, plan modifications, and system security actions across all outlets.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">Search Action / Actor / Tenant</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">Severity Filter</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO font-bold">INFO (Standard Operations)</option>
              <option value="WARN">WARN (Warnings & Retries)</option>
              <option value="CRITICAL">CRITICAL (Suspensions & Security)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Audit Log History ({logs.length})</span>
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No audit logs found matching criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => {
              const isExpanded = expandedLogId === log._id;

              return (
                <div
                  key={log._id}
                  className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full ${
                          log.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : log.severity === 'WARN'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {log.severity}
                      </span>
                      <h4 className="font-extrabold text-xs text-slate-900 font-mono">{log.action}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      Actor: <strong className="text-slate-900">{log.actorName || 'System'}</strong> ({log.actorRole || 'SYSTEM'})
                    </span>

                    {log.restaurantName && (
                      <span className="flex items-center gap-1 font-medium">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        Target Outlet: <strong className="text-slate-900">{log.restaurantName}</strong>
                      </span>
                    )}
                  </div>

                  {isExpanded && log.details && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Event Details Payload:</span>
                      <pre className="bg-slate-950 text-amber-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto mt-1">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
