import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { IAnalyticsSummary, IAdmission, IAppointment, IBill } from '../types';
import { Users, BedDouble, CalendarDays, Wallet, UserCheck, TrendingUp, ArrowRight, Clock, Pill, FileText, Sparkles, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, StatusBadge, Avatar, SkeletonBlock } from '../components/ui/primitives';

function todayStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-36 !rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => <div key={i} className="skeleton h-28 !rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="skeleton h-72 !rounded-2xl lg:col-span-2" />
        <div className="skeleton h-72 !rounded-2xl" />
      </div>
    </div>
  );
}

const Stat: React.FC<{ label: string; value: string; sub: string; icon: React.ReactNode; tint: string; dark?: boolean }> = ({ label, value, sub, icon, tint, dark }) => (
  <Card hover className={`p-5 ${dark ? '!bg-slate-900 !border-slate-900 text-white' : ''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-sky-300' : 'text-slate-400'}`}>{label}</p>
        <p className={`text-[26px] font-bold tracking-tight mt-1 truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <p className={`text-xs mt-1 font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</p>
      </div>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-sky-500/20 text-sky-300' : tint}`}>{icon}</span>
    </div>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<IAnalyticsSummary | null>(null);
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true); setError(null);
        if (user?.role === 'admin' || user?.role === 'billing') {
          const [s, a, ap] = await Promise.all([
            apiClient.get('/analytics/summary'), apiClient.get('/admissions'), apiClient.get('/appointments'),
          ]);
          if (!alive) return;
          setMetrics(s.data.data);
          setAdmissions(a.data.data.admissions.slice(0, 6));
          setAppointments(ap.data.data.appointments.slice(0, 6));
        } else if (user?.role === 'doctor') {
          const [ap, pat] = await Promise.all([apiClient.get('/appointments'), apiClient.get('/patients')]);
          if (!alive) return;
          setAppointments(ap.data.data.appointments.slice(0, 8));
          setMetrics({
            totalPatients: pat.data.data.total ?? pat.data.data.patients?.length ?? 0,
            todayAppointments: ap.data.data.appointments.length,
            currentAdmissions: 0, totalBeds: 0, availableBeds: 0, occupiedBeds: 0, occupancyRate: 0,
            totalRevenue: 0, pendingRevenue: 0, pendingInsuranceClaims: 0, recentActivityCount: 0,
          });
        } else {
          const [ap, b] = await Promise.all([apiClient.get('/appointments'), apiClient.get('/bills')]);
          if (!alive) return;
          setAppointments(ap.data.data.appointments.slice(0, 5));
          setBills(b.data.data.bills.slice(0, 5));
        }
      } catch (e: any) { if (alive) setError(e.message || 'Failed to load dashboard'); }
      finally { if (alive) setLoading(false); }
    };
    load();
    return () => { alive = false; };
  }, [user]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <Card className="p-6 border-rose-200"><p className="text-sm text-rose-700 font-semibold">{error}</p><button onClick={() => window.location.reload()} className="hc-btn-ghost mt-3 !py-2 text-xs">Retry</button></Card>;

  const role = user?.role;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="!bg-slate-900 !border-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -top-24 -right-16 w-80 h-80 bg-sky-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/3 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <Badge tone="dark" className="!bg-white/10 !border-white/15 !text-sky-200"><Sparkles size={12} /> {role?.toUpperCase()} CONSOLE · {todayStr()}</Badge>
            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight mt-2.5">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
            <p className="text-[13px] text-slate-300 mt-1 max-w-lg">
              {role === 'admin' && 'Live hospital operations — beds, admissions, schedule and revenue at a glance.'}
              {role === 'doctor' && 'Your day in focus — upcoming consultations, assigned patients and pending notes.'}
              {role === 'patient' && 'Your health, simply organized — visits, prescriptions and bills in one calm place.'}
              {role === 'billing' && 'Financial control center — invoices, collections and insurance claims.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === 'admin' && <Link to="/admissions" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-[13px] flex items-center gap-2 transition-all"><UserCheck size={16} /> Start Admission</Link>}
            {role === 'doctor' && <Link to="/doctor-portal" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-[13px] transition-all">Open Clinical Portal</Link>}
            {role === 'patient' && <Link to="/appointments" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-[13px] flex items-center gap-2 transition-all"><CalendarDays size={16} /> Book Appointment</Link>}
            {role === 'billing' && <Link to="/billing" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-[13px] transition-all">New Invoice</Link>}
            <Link to={role === 'patient' ? '/patient-portal' : '/analytics'} className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold rounded-xl text-[13px] transition-all">View {role === 'patient' ? 'Health Portal' : 'Analytics'}</Link>
          </div>
        </div>
      </Card>

      {/* ADMIN */}
      {(role === 'admin' || role === 'billing') && metrics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            <Stat dark label="Total Patients" value={String(metrics.totalPatients)} sub="Registered profiles" icon={<Users size={20} />} tint="" />
            <Stat label="Bed Occupancy" value={`${metrics.occupancyRate}%`} sub={`${metrics.occupiedBeds}/${metrics.totalBeds} beds · ${metrics.availableBeds} free`} icon={<BedDouble size={20} />} tint="bg-violet-50 text-violet-600" />
            <Stat label="Active Admissions" value={String(metrics.currentAdmissions)} sub="Inpatient care now" icon={<UserCheck size={20} />} tint="bg-amber-50 text-amber-600" />
            <Stat label={role === 'billing' ? 'Realized Revenue' : 'Total Revenue'} value={`$${metrics.totalRevenue.toFixed(0)}`} sub={`Pending $${metrics.pendingRevenue.toFixed(0)}`} icon={<Wallet size={20} />} tint="bg-emerald-50 text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2"><Activity size={17} className="text-sky-600" /> Occupancy vs Capacity</h3>
                <Link to="/bed-board" className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">Bed board <ArrowRight size={13} /></Link>
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-end gap-2 h-36 mt-2">
                  {[
                    { label: 'ICU', pct: Math.min(95, metrics.occupancyRate + 12) },
                    { label: 'General', pct: Math.max(8, metrics.occupancyRate - 4) },
                    { label: 'Semi-Priv', pct: Math.max(5, metrics.occupancyRate - 8) },
                    { label: 'Maternity', pct: Math.min(80, metrics.occupancyRate + 4) },
                    { label: 'Emergency', pct: Math.min(90, metrics.occupancyRate + 8) },
                  ].map((b) => (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-slate-500">{b.pct}%</span>
                      <div className="w-full max-w-[64px] bg-slate-100 rounded-lg overflow-hidden flex items-end h-24">
                        <div className={`w-full rounded-lg transition-all ${b.pct > 80 ? 'bg-gradient-to-t from-rose-500 to-rose-400' : 'bg-gradient-to-t from-sky-600 to-sky-400'}`} style={{ height: `${b.pct}%` }} />
                      </div>
                      <span className="text-[10.5px] font-semibold text-slate-600">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2 mb-1"><Clock size={16} className="text-sky-600" /> Today's Schedule</h3>
              <p className="text-xs text-slate-400 mb-3">{appointments.length} consultations on the board</p>
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {appointments.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">No consultations scheduled.</p>}
                {appointments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <Avatar name={a.patientName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{a.patientName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.timeSlot} · Dr. {a.doctorName}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
              <Link to="/appointments" className="hc-btn-dark w-full mt-4 !py-2.5 text-[13px]">Manage schedule <ArrowRight size={14} /></Link>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-1">
                <h3 className="font-bold text-slate-900 text-[15px]">Recent Admissions</h3>
                <Link to="/admissions" className="text-xs font-bold text-sky-600 hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {admissions.map((ad) => (
                  <div key={ad.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                    <Avatar name={ad.patientName} size="sm" tone="bg-violet-50 text-violet-700 border-violet-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{ad.patientName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{ad.wardName} · Bed {ad.bedNumber} · {ad.doctorName}</p>
                    </div>
                    <StatusBadge status={ad.status} />
                  </div>
                ))}
                {admissions.length === 0 && <p className="px-5 py-8 text-xs text-slate-400 text-center">No admissions yet.</p>}
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-white to-sky-50/50">
              <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {[
                  { to: '/patients', label: 'Patient Directory', sub: 'Search & register', icon: <Users size={17} /> },
                  { to: '/bed-board', label: 'Bed Board', sub: `${metrics.availableBeds} beds free`, icon: <BedDouble size={17} /> },
                  { to: '/billing', label: 'Billing', sub: `$${metrics.pendingRevenue.toFixed(0)} pending`, icon: <Wallet size={17} /> },
                  { to: '/audit-logs', label: 'Audit Trail', sub: `${metrics.recentActivityCount} events`, icon: <FileText size={17} /> },
                ].map((a) => (
                  <Link key={a.to} to={a.to} className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm transition-all group">
                    <span className="text-sky-600 group-hover:scale-110 transition-transform inline-block">{a.icon}</span>
                    <p className="text-[13px] font-bold text-slate-900 mt-1.5">{a.label}</p>
                    <p className="text-[11px] text-slate-500">{a.sub}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* DOCTOR */}
      {role === 'doctor' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            <Stat dark label="Today's Appointments" value={String(appointments.length)} sub="Consultations booked" icon={<CalendarDays size={20} />} tint="" />
            <Stat label="Assigned Patients" value={String(metrics?.totalPatients ?? 0)} sub="Under your care" icon={<Users size={20} />} tint="bg-sky-50 text-sky-600" />
            <Stat label="Pending Notes" value={String(Math.max(0, appointments.filter((a) => a.status === 'Confirmed').length))} sub="Awaiting documentation" icon={<FileText size={20} />} tint="bg-amber-50 text-amber-600" />
            <Stat label="Prescriptions" value="—" sub="Open doctor portal" icon={<Pill size={20} />} tint="bg-emerald-50 text-emerald-600" />
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-[15px]">What needs you today?</h3>
                <p className="text-xs text-slate-500">Confirmed visits first — complete notes after each consultation.</p>
              </div>
              <Link to="/doctor-portal" className="hc-btn-blue !py-2 text-xs">Clinical Portal <ArrowRight size={14} /></Link>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-2.5">
              {appointments.length === 0 && <p className="text-xs text-slate-400 col-span-2 text-center py-8">No appointments assigned. Enjoy the calm — or review patient histories.</p>}
              {appointments.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm transition-all flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-[13px] font-bold leading-none">{a.timeSlot.split(':')[0] || '•'}</span>
                    <span className="text-[9px] text-slate-300">{a.timeSlot.includes('AM') ? 'AM' : a.timeSlot.includes('PM') ? 'PM' : ''}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-slate-900 truncate">{a.patientName}</p>
                    <p className="text-[11.5px] text-slate-500 truncate">{a.timeSlot} · {a.reason}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* PATIENT */}
      {role === 'patient' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2 p-5 sm:p-6 !bg-gradient-to-br !from-sky-600 !to-sky-800 !border-sky-700 text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Next appointment</p>
            {appointments[0] ? (
              <>
                <h2 className="text-xl font-bold mt-1">Dr. {appointments[0].doctorName}</h2>
                <p className="text-[13px] text-sky-100 mt-0.5">{appointments[0].appointmentDate} · {appointments[0].timeSlot} · {appointments[0].reason}</p>
                <div className="flex gap-2 mt-4">
                  <Link to="/appointments" className="px-4 py-2 bg-white text-sky-800 font-bold rounded-xl text-[13px]">Manage visits</Link>
                  <Link to="/patient-portal" className="px-4 py-2 bg-white/15 border border-white/25 text-white font-semibold rounded-xl text-[13px]">Health portal</Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mt-1">No upcoming visits</h2>
                <p className="text-[13px] text-sky-100 mt-0.5">Book a consultation in under a minute.</p>
                <Link to="/appointments" className="inline-block mt-4 px-4 py-2 bg-white text-sky-800 font-bold rounded-xl text-[13px]">Book now</Link>
              </>
            )}
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-[14px] text-slate-900">Outstanding balance</h3>
              <p className="text-[26px] font-bold text-slate-900 mt-1">${bills.reduce((s, b) => s + b.balance, 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500">Across {bills.length} invoice{bills.length === 1 ? '' : 's'}</p>
              <Link to="/billing" className="text-xs font-bold text-sky-600 hover:underline mt-2 inline-block">Review invoices →</Link>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold text-[14px] text-slate-900 mb-2">Recent visits</h3>
              <div className="space-y-2">
                {appointments.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-slate-800 truncate">{a.doctorName} <span className="font-normal text-slate-400">· {a.appointmentDate}</span></span>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
                {appointments.length === 0 && <p className="text-xs text-slate-400">No visits yet.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
