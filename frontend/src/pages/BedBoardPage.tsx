import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { IWard, IBed, BedStatus } from '../types';
import { BedDouble, RefreshCw, Plus, Search, CheckCircle2, Lock, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, SearchInput, Badge, Tabs } from '../components/ui/primitives';
import { cn } from '../components/ui/primitives';

export const BedBoardPage: React.FC = () => {
  const [wards, setWards] = useState<IWard[]>([]);
  const [stats, setStats] = useState<{ totalBeds: number; availableBeds: number; occupiedBeds: number; occupancyRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BedStatus>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<{ ward: IWard; bed: IBed; room: string } | null>(null);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/beds/board');
      setWards(res.data.data.wards);
      setStats(res.data.data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, []);

  const filtered = useMemo(() => wards
    .filter((w) => wardFilter === 'all' || w.id === wardFilter)
    .map((w) => ({
      ...w,
      rooms: w.rooms
        .map((r) => ({ ...r, beds: r.beds.filter((b) => (statusFilter === 'all' || b.status === statusFilter) && (!q || b.bedNumber.toLowerCase().includes(q.toLowerCase()) || (b.currentPatientName || '').toLowerCase().includes(q.toLowerCase()) || r.roomNumber.toLowerCase().includes(q.toLowerCase()))) }))
        .filter((r) => r.beds.length > 0),
    }))
    .filter((w) => w.rooms.length > 0), [wards, wardFilter, statusFilter, q]);

  const chip = (s: BedStatus) =>
    s === 'Available' ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-sm'
    : s === 'Occupied' ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
    : 'bg-amber-50 border-amber-200 hover:border-amber-400';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bed Board"
        subtitle="Live ward → room → bed hierarchy with atomic allocation locks"
        icon={<BedDouble size={18} />}
        actions={<><button onClick={fetchBoard} className="hc-btn-ghost !py-2.5 text-[13px]"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button><Link to="/admissions" className="hc-btn-blue"><Plus size={15} /> New Admission</Link></>}
      />

      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 !rounded-2xl" />)}</div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total capacity</p><p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBeds} <span className="text-sm font-medium text-slate-400">beds</span></p></Card>
          <Card className="p-4 !border-emerald-200 !bg-emerald-50/40"><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Available</p><p className="text-2xl font-bold text-emerald-600 mt-1">{stats.availableBeds} <span className="text-sm font-medium">ready</span></p></Card>
          <Card className="p-4 !border-rose-200 !bg-rose-50/40"><p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Occupied</p><p className="text-2xl font-bold text-rose-600 mt-1">{stats.occupiedBeds} <span className="text-sm font-medium">inpatients</span></p></Card>
          <Card className="p-4 !bg-slate-900 !border-slate-900 text-white"><p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Occupancy</p><p className="text-2xl font-bold mt-1">{stats.occupancyRate}%</p><div className="h-1.5 bg-white/15 rounded-full mt-2 overflow-hidden"><div className="h-full bg-sky-400 rounded-full" style={{ width: `${stats.occupancyRate}%` }} /></div></Card>
        </div>
      )}

      <Card className="p-3.5 flex flex-col xl:flex-row gap-2.5 xl:items-center">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bed number, room, or patient…" className="flex-1 !border-0 !shadow-none !bg-slate-100/70" />
        <div className="flex flex-wrap gap-2">
          <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-transparent">
            <option value="all">All wards</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Tabs tabs={[{ id: 'all', label: 'All' }, { id: 'Available', label: 'Available' }, { id: 'Occupied', label: 'Occupied' }, { id: 'Reserved', label: 'Reserved' }]} active={statusFilter} onChange={(id) => setStatusFilter(id as any)} />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">{[0,1].map((i) => <div key={i} className="skeleton h-64 !rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ward) => (
            <Card key={ward.id} className="overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-slate-900 text-[15px]">{ward.name}</h3><Badge tone="blue">{ward.type}</Badge><Badge>{ward.availableBeds} free / {ward.totalBeds}</Badge></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40 sm:w-52 h-2 bg-slate-200 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', ward.occupiedBeds / ward.totalBeds > 0.8 ? 'bg-rose-500' : 'bg-sky-500')} style={{ width: `${(ward.occupiedBeds / ward.totalBeds) * 100}%` }} /></div>
                  <span className="text-[11px] font-bold text-slate-500">{Math.round((ward.occupiedBeds / ward.totalBeds) * 100)}%</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {ward.rooms.map((room) => (
                  <div key={room.roomNumber} className="rounded-2xl bg-slate-50/70 border border-slate-200/70 p-3.5">
                    <div className="flex items-center justify-between mb-2.5"><span className="text-xs font-bold text-slate-700 font-mono">ROOM {room.roomNumber}</span><span className="text-[11px] text-slate-400 font-semibold">{room.beds.length} beds</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      {room.beds.map((b) => (
                        <button key={b.bedNumber} onClick={() => setSel({ ward, bed: b, room: room.roomNumber })} className={cn('p-2.5 rounded-xl border text-left transition-all active:scale-[0.98]', chip(b.status))}>
                          <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-slate-900">{b.bedNumber}</span>{b.status === 'Available' ? <CheckCircle2 size={14} className="text-emerald-600" /> : b.status === 'Reserved' ? <Clock size={14} className="text-amber-600" /> : <Lock size={13} className="text-rose-500" />}</div>
                          <p className="text-[11px] font-bold mt-0.5 text-slate-700">{b.status}</p>
                          {b.currentPatientName ? <p className="text-[10.5px] truncate text-slate-500 font-medium">{b.currentPatientName}</p> : <p className="text-[10.5px] text-slate-400">Ready for allocation</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <Card className="p-10 text-center text-sm text-slate-500">No beds match the current filters.</Card>}
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setSel(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl border p-6 anim-pop">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{sel.ward.name} · Room {sel.room}</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5 font-mono">Bed {sel.bed.bedNumber}</h3>
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[13px] space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={cn('font-bold', sel.bed.status === 'Available' ? 'text-emerald-600' : 'text-rose-600')}>{sel.bed.status}</span></div>
              {sel.bed.currentPatientName && <div className="flex justify-between gap-2"><span className="text-slate-500">Patient</span><span className="font-bold text-slate-900 text-right">{sel.bed.currentPatientName}</span></div>}
              {sel.bed.allocatedAt && <div className="flex justify-between"><span className="text-slate-500">Since</span><span className="font-semibold">{new Date(sel.bed.allocatedAt).toLocaleDateString()}</span></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setSel(null)} className="hc-btn-ghost flex-1 !py-2.5 text-[13px]">Close</button>
              {sel.bed.status === 'Available' && <Link to="/admissions" className="hc-btn-blue flex-1 !py-2.5 text-[13px]">Admit Here</Link>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
