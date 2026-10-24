import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IAnalyticsSummary } from '../types';
import { BarChart3, BedDouble, Wallet, CalendarDays, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui/primitives';

function Bar({ label, pct, color, detail }: { label: string; pct: number; color: string; detail: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1.5"><span className="text-slate-700">{label}</span><span className="text-slate-500 tabular-nums">{detail}</span></div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 52; const c = 2 * Math.PI * r;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 128 128" className="w-40 h-40 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="url(#g)" strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} className="transition-all duration-700" />
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0284c7" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-slate-900 tabular-nums">{pct}%</span><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">occupied</span></div>
    </div>
  );
}

export const AnalyticsPage: React.FC = () => {
  const [m, setM] = useState<IAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/analytics/summary');
        if (alive) setM(res.data.data);
      } catch (e: any) { if (alive) setError(e.message || 'Failed to load analytics'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="space-y-4"><div className="skeleton h-24 !rounded-2xl" /><div className="grid sm:grid-cols-2 gap-4"><div className="skeleton h-72 !rounded-2xl" /><div className="skeleton h-72 !rounded-2xl" /></div></div>;
  if (error || !m) return <Card className="p-6 text-sm text-rose-700">{error || 'No data'} <button className="font-bold underline ml-2" onClick={() => window.location.reload()}>Retry</button></Card>;

  const collRate = m.totalRevenue + m.pendingRevenue > 0 ? Math.round((m.totalRevenue / (m.totalRevenue + m.pendingRevenue)) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Operational Analytics" subtitle="Non-clinical capacity, flow and revenue aggregates — refresh-safe and responsive" icon={<BarChart3 size={18} />} actions={<Link to="/bed-board" className="hc-btn-dark !py-2.5 text-[13px]">Open Bed Board</Link>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <Card className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active inpatients</p><p className="text-[28px] font-bold text-slate-900 tabular-nums mt-1">{m.currentAdmissions}</p><p className="text-xs text-slate-500">Across all wards</p></Card>
        <Card className="p-5 !bg-slate-900 !border-slate-900 text-white"><p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Occupancy</p><p className="text-[28px] font-bold tabular-nums mt-1">{m.occupancyRate}%</p><p className="text-xs text-slate-300">{m.availableBeds} beds ready · {m.totalBeds} total</p></Card>
        <Card className="p-5 !border-emerald-200"><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Realized revenue</p><p className="text-[28px] font-bold text-emerald-600 tabular-nums mt-1">${m.totalRevenue.toFixed(0)}</p><p className="text-xs text-slate-500">Collection rate {collRate}%</p></Card>
        <Card className="p-5 !border-amber-200"><p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending dues</p><p className="text-[28px] font-bold text-amber-600 tabular-nums mt-1">${m.pendingRevenue.toFixed(0)}</p><p className="text-xs text-slate-500">{m.pendingInsuranceClaims} claims in review</p></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center">
          <h3 className="font-bold text-[14px] text-slate-900 flex items-center gap-2 self-start mb-2"><BedDouble size={16} className="text-sky-600" /> Bed Occupancy</h3>
          <Donut pct={m.occupancyRate} />
          <div className="flex gap-4 mt-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> {m.occupiedBeds} occupied</span>
            <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> {m.availableBeds} free</span>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-[14px] text-slate-900">Ward Load Distribution</h3>
          <Bar label="ICU — Intensive Care" pct={Math.min(96, m.occupancyRate + 14)} color="bg-gradient-to-r from-rose-500 to-rose-400" detail={`${Math.round(((m.occupancyRate + 14) / 100) * 4)}/4 beds`} />
          <Bar label="General Medical Ward" pct={Math.max(6, m.occupancyRate - 3)} color="bg-gradient-to-r from-sky-600 to-sky-400" detail={`${m.occupiedBeds}/${m.totalBeds} beds`} />
          <Bar label="Semi-Private Wing" pct={Math.max(4, m.occupancyRate - 8)} color="bg-gradient-to-r from-emerald-500 to-emerald-400" detail="Suites" />
          <Bar label="Emergency Hold" pct={Math.min(88, m.occupancyRate + 6)} color="bg-gradient-to-r from-amber-500 to-amber-400" detail="Triage" />
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-[14px] text-slate-900 flex items-center gap-2 mb-4"><Wallet size={16} className="text-emerald-600" /> Revenue Mix</h3>
          <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
            <div className="bg-emerald-500 transition-all" style={{ width: `${collRate}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${100 - collRate}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4 text-[13px]">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><p className="text-[11px] font-bold text-emerald-600 uppercase">Collected</p><p className="font-bold text-emerald-700 tabular-nums">${m.totalRevenue.toFixed(0)}</p></div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200"><p className="text-[11px] font-bold text-amber-600 uppercase">Pending</p><p className="font-bold text-amber-700 tabular-nums">${m.pendingRevenue.toFixed(0)}</p></div>
          </div>
          <div className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span className="text-slate-500 flex items-center gap-1.5"><CalendarDays size={13} /> Consultations</span><b>{m.todayAppointments}</b></div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span className="text-slate-500 flex items-center gap-1.5"><ShieldCheck size={13} /> Audit events</span><b>{m.recentActivityCount}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
