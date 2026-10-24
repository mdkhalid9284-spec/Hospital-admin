import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAuditLog } from '../../types';
import { ShieldCheck, Download, Search, CheckCircle, AlertCircle, Filter } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/audit-logs');
        setLogs(res.data.data.logs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = logs.filter((l) => {
    const matchQ =
      !searchQ ||
      l.action.toLowerCase().includes(searchQ.toLowerCase()) ||
      l.actorName.toLowerCase().includes(searchQ.toLowerCase()) ||
      l.resourceType.toLowerCase().includes(searchQ.toLowerCase());

    if (statusFilter === 'all') return matchQ;
    return matchQ && l.status === statusFilter;
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'Status', 'IP'],
      ...filtered.map((l) => [l.timestamp, l.actorName, l.actorRole, l.action, l.resourceType, l.status, l.ipAddress || '127.0.0.1']),
    ]
      .map((r) => r.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Audit Trail & Security Logs
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Tamper-resistant append-only logging of admissions, prescriptions, payments & downloads
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <Download size={14} /> Export Audit Log
        </button>
      </div>

      {/* Audit Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by action, actor name, or resource…"
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="py-3 pl-2">Timestamp</th>
                <th className="py-3">Actor & Role</th>
                <th className="py-3">Action</th>
                <th className="py-3">Resource</th>
                <th className="py-3">Outcome</th>
                <th className="py-3 text-right pr-2">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2 font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <p className="font-bold text-slate-900">{log.actorName}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[11.5px] font-bold text-blue-700">
                    {log.action}
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">
                    {log.resourceType} <span className="text-slate-400 text-[11px]">({log.resourceId})</span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right pr-2 font-mono text-slate-400 text-[11px]">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
