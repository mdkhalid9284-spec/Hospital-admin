import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IAuditLog } from '../types';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Card, PageHeader, SearchInput, EmptyState, Badge } from '../components/ui/primitives';
import { cn } from '../components/ui/primitives';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/audit-logs?limit=100');
      setLogs(res.data.data.logs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const list = logs.filter((l) => {
    if (role !== 'all' && l.actorRole !== role) return false;
    if (outcome !== 'all' && l.status !== outcome) return false;
    if (!q) return true;
    const v = q.toLowerCase();
    return l.action.toLowerCase().includes(v) || l.actorName.toLowerCase().includes(v) || l.resourceType.toLowerCase().includes(v) || String(l.resourceId).toLowerCase().includes(v);
  });

  const success = logs.filter((l) => l.status === 'SUCCESS').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail"
        subtitle={`Tamper-evident log · ${logs.length} events · ${success} successful · immutable server record`}
        icon={<ShieldCheck size={18} />}
        actions={<button onClick={fetchLogs} className="hc-btn-ghost !py-2.5 text-[13px]"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>}
      />

      <div className="grid grid-cols-3 gap-3">
        {[{ l: 'Total events', v: logs.length }, { l: 'Success', v: success }, { l: 'Failures', v: logs.length - success }].map((s) => (
          <Card key={s.l} className="p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.l}</p><p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{s.v}</p></Card>
        ))}
      </div>

      <Card className="p-3.5 flex flex-col lg:flex-row gap-2.5 lg:items-center">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, actor, resource…" className="flex-1 !border-0 !shadow-none !bg-slate-100/70" />
        <div className="flex flex-wrap gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
            <option value="all">All roles</option><option value="admin">Admin</option><option value="doctor">Doctor</option><option value="patient">Patient</option><option value="billing">Billing</option>
          </select>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {['all', 'SUCCESS', 'FAILURE'].map((o) => <button key={o} onClick={() => setOutcome(o)} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all', outcome === o ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500')}>{o === 'all' ? 'All' : o === 'SUCCESS' ? 'Success' : 'Failed'}</button>)}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[0,1,2,3,4].map((i) => <div key={i} className="skeleton h-14 !rounded-xl" />)}</div>
        : list.length === 0 ? <EmptyState icon={<ShieldCheck size={20} />} title="No audit events" hint="Adjust filters — every login, admission and billing change is recorded here." />
        : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full hc-table min-w-[760px]">
                <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Resource</th><th>Outcome</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="font-mono text-[11.5px] text-slate-500 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                      <td><p className="font-bold text-[13px] text-slate-900">{l.actorName}</p><Badge className="!text-[9.5px] uppercase">{l.actorRole}</Badge></td>
                      <td className="font-mono text-xs font-bold text-slate-800">{l.action}</td>
                      <td><span className="px-2 py-1 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-600">{l.resourceType}:{String(l.resourceId).slice(0, 12)}</span></td>
                      <td>{l.status === 'SUCCESS' ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14} /> Success</span> : <span className="flex items-center gap-1 text-rose-600 text-xs font-bold"><XCircle size={14} /> Failed</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {list.map((l) => (
                <div key={l.id} className="p-4">
                  <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-bold text-slate-800 truncate">{l.action}</span>{l.status === 'SUCCESS' ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> : <XCircle size={15} className="text-rose-500 shrink-0" />}</div>
                  <p className="text-xs text-slate-500 mt-1">{l.actorName} ({l.actorRole}) · {new Date(l.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
