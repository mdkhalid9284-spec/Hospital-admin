import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { IAppointment, IDoctor, IPatient } from '../types';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, PageHeader, StatusBadge, Avatar, EmptyState, Modal, ModalHeader, Tabs, Field, inputCls, Badge } from '../components/ui/primitives';
import { cn } from '../components/ui/primitives';

type View = 'day' | 'week' | 'month';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function parseApptDate(a: IAppointment): Date | null {
  const d = new Date(a.appointmentDate);
  return isNaN(d.getTime()) ? null : d;
}

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(new Date('2026-10-06'));
  const [selected, setSelected] = useState<IAppointment | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showBook, setShowBook] = useState(false);
  const [docId, setDocId] = useState('');
  const [date, setDate] = useState('2026-10-06');
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState('');
  const [patId, setPatId] = useState(user?.patientId || '');
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/appointments');
      setAppointments(res.data.data.appointments);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    (async () => {
      try {
        const [docRes, patRes] = await Promise.all([
          apiClient.get('/doctors'),
          user?.role === 'admin' ? apiClient.get('/patients') : Promise.resolve({ data: { data: { patients: [] } } }),
        ]);
        setDoctors(docRes.data.data.doctors);
        if (docRes.data.data.doctors.length) setDocId(docRes.data.data.doctors[0].id);
        setPatients(patRes.data.data.patients);
      } catch (e) { console.error(e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!docId || !date) return;
    (async () => {
      try {
        const res = await apiClient.get(`/appointments/available-slots?doctorId=${docId}&date=${date}`);
        setSlots(res.data.data.availableSlots);
        setSlot(res.data.data.availableSlots[0] || '');
      } catch { setSlots([]); setSlot(''); }
    })();
  }, [docId, date]);

  const days: Date[] = useMemo(() => {
    if (view === 'day') return [startOfDay(cursor)];
    if (view === 'week') {
      const s = addDays(startOfDay(cursor), -((startOfDay(cursor).getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const start = addDays(first, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const filtered = appointments.filter((a) => statusFilter === 'all' || a.status === statusFilter);
  const byDay = (d: Date) => filtered.filter((a) => { const p = parseApptDate(a); return p && fmt(p) === fmt(d); });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/appointments', {
        patientId: user?.role === 'patient' ? user.patientId : patId,
        doctorId: docId, appointmentDate: date, timeSlot: slot, reason,
      });
      setShowBook(false); setReason(''); fetchAll();
    } catch (e: any) { setModalError(e.message || 'Failed to book appointment'); }
    finally { setSubmitting(false); }
  };

  const setStatus = async (id: string, status: 'Confirmed' | 'Completed' | 'Cancelled') => {
    try { await apiClient.patch(`/appointments/${id}/status`, { status }); fetchAll(); setSelected(null); }
    catch (e) { console.error(e); }
  };

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointments"
        subtitle="Modern scheduling — day, week and month views with live availability"
        icon={<CalendarDays size={18} />}
        actions={<button onClick={() => setShowBook(true)} className="hc-btn-blue"><Plus size={16} /> Book Appointment</button>}
      />

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(addDays(cursor, view === 'month' ? -30 : view === 'week' ? -7 : -1))} className="hc-icon-btn !w-9 !h-9"><ChevronLeft size={16} /></button>
            <div className="min-w-[170px] text-center">
              <p className="font-bold text-slate-900 text-[15px]">{view === 'day' ? cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : monthLabel}</p>
              <button onClick={() => setCursor(new Date())} className="text-[11px] font-bold text-sky-600 hover:underline">Jump to today</button>
            </div>
            <button onClick={() => setCursor(addDays(cursor, view === 'month' ? 30 : view === 'week' ? 7 : 1))} className="hc-icon-btn !w-9 !h-9"><ChevronRight size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs tabs={[{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]} active={view} onChange={(id) => setView(id as View)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-2 mt-4">{Array.from({ length: view === 'day' ? 1 : 7 }).map((_, i) => <div key={i} className="skeleton h-40 !rounded-xl" />)}</div>
        ) : view === 'day' ? (
          <div className="mt-4 space-y-2">
            {byDay(days[0]).length === 0 && <EmptyState icon={<Clock size={20} />} title="No appointments this day" hint="Pick another date or book a new consultation." />}
            {byDay(days[0]).map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm transition-all flex items-center gap-3">
                <span className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold whitespace-nowrap">{a.timeSlot}</span>
                <Avatar name={a.patientName} size="sm" />
                <span className="flex-1 min-w-0"><span className="block font-bold text-[13.5px] text-slate-900 truncate">{a.patientName} <span className="font-normal text-slate-400">→ {a.doctorName}</span></span><span className="block text-xs text-slate-500 truncate">{a.reason}</span></span>
                <StatusBadge status={a.status} />
              </button>
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-2 mt-4', view === 'week' ? 'grid-cols-1 sm:grid-cols-7' : 'grid-cols-7')}>
            {view === 'month' && ['M','T','W','T','F','S','S'].map((d, i) => <p key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</p>)}
            {days.map((d, i) => {
              const list = byDay(d);
              const isToday = fmt(d) === fmt(new Date());
              const dim = view === 'month' && d.getMonth() !== cursor.getMonth();
              return (
                <div key={i} className={cn('rounded-2xl border p-2 min-h-[110px] transition-colors', isToday ? 'border-sky-400 bg-sky-50/50' : 'border-slate-200 bg-white', dim && 'opacity-45 bg-slate-50')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center', isToday ? 'bg-slate-900 text-white' : 'text-slate-500')}>{d.getDate()}</span>
                    {list.length > 0 && <span className="text-[10px] font-bold text-sky-600">{list.length}</span>}
                  </div>
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {list.slice(0, view === 'month' ? 3 : 6).map((a) => (
                      <button key={a.id} onClick={() => setSelected(a)} className={cn('w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold truncate border transition-all hover:shadow-sm',
                        a.status === 'Confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : a.status === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-700 line-through' : a.status === 'Completed' ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
                        {a.timeSlot} · {a.patientName}
                      </button>
                    ))}
                    {list.length > (view === 'month' ? 3 : 6) && <p className="text-[10px] text-slate-400 font-semibold px-1">+{list.length - (view === 'month' ? 3 : 6)} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Details panel */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl overflow-y-auto anim-drawer p-6">
            <div className="flex items-start justify-between">
              <div><p className="font-mono text-xs font-bold text-sky-600">{selected.appointmentCode}</p><h3 className="text-lg font-bold text-slate-900 mt-0.5">{selected.patientName}</h3></div>
              <button onClick={() => setSelected(null)} className="hc-icon-btn !w-8 !h-8"><X size={14} /></button>
            </div>
            <div className="mt-2"><StatusBadge status={selected.status} /></div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div><p className="text-[11px] font-bold uppercase text-slate-400">Doctor</p><p className="font-bold text-slate-900 text-[13px]">{selected.doctorName}</p></div>
                <div><p className="text-[11px] font-bold uppercase text-slate-400">Date</p><p className="font-bold text-slate-900 text-[13px]">{selected.appointmentDate}</p></div>
                <div><p className="text-[11px] font-bold uppercase text-slate-400">Slot</p><p className="font-bold text-slate-900 text-[13px]">{selected.timeSlot}</p></div>
                <div><p className="text-[11px] font-bold uppercase text-slate-400">Booked</p><p className="font-semibold text-slate-700 text-[13px]">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200"><p className="text-[11px] font-bold uppercase text-slate-400">Reason</p><p className="text-slate-800 text-[13.5px] mt-1">{selected.reason}</p>{selected.notes && <p className="text-slate-500 text-xs mt-2">{selected.notes}</p>}</div>
            </div>
            {selected.status === 'Confirmed' && (
              <div className="flex gap-2 mt-5">
                {(user?.role === 'admin' || user?.role === 'doctor') && <button onClick={() => setStatus(selected.id, 'Completed')} className="hc-btn-blue flex-1 !py-2.5 text-[13px]">Mark Completed</button>}
                <button onClick={() => setStatus(selected.id, 'Cancelled')} className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-[13px] transition-all">Cancel</button>
              </div>
            )}
            {selected.status === 'Pending' && (user?.role === 'admin' || user?.role === 'doctor') && (
              <button onClick={() => setStatus(selected.id, 'Confirmed')} className="hc-btn-dark w-full mt-5 !py-2.5 text-[13px]">Confirm Appointment</button>
            )}
          </aside>
        </div>
      )}

      <Modal open={showBook} onClose={() => setShowBook(false)}>
        <ModalHeader title="Schedule consultation" subtitle="Pick doctor, date and live availability" onClose={() => setShowBook(false)} />
        <form onSubmit={submit} className="p-6 space-y-4">
          {modalError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          {user?.role === 'admin' && (
            <Field label="Patient *"><select required value={patId} onChange={(e) => setPatId(e.target.value)} className={inputCls}><option value="">Choose patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>)}</select></Field>
          )}
          <Field label="Doctor *"><select required value={docId} onChange={(e) => setDocId(e.target.value)} className={inputCls}>{doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} — {d.specialization} (${d.consultationFee})</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Time slot *">
              <select required value={slot} onChange={(e) => setSlot(e.target.value)} className={inputCls}>
                {slots.length === 0 ? <option value="">No slots available</option> : slots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          {slots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => <button type="button" key={s} onClick={() => setSlot(s)} className={cn('px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all', slot === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300')}>{s}</button>)}
            </div>
          )}
          <Field label="Reason for visit *"><input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Symptom or follow-up reason" className={inputCls} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowBook(false)} className="hc-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting || !slot} className="hc-btn-blue">{submitting ? 'Booking…' : 'Confirm Appointment'}</button>
          </div>
        </form>
      </Modal>

      {/* Agenda list */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <h3 className="font-bold text-[15px] text-slate-900">All appointments <Badge className="ml-1">{filtered.length}</Badge></h3>
        </div>
        {filtered.length === 0 ? <EmptyState icon={<CalendarDays size={20} />} title="No appointments" hint="Bookings will appear here across all views." /> : (
          <div className="divide-y divide-slate-100">
            {filtered.slice(0, 12).map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50/70 text-left transition-colors">
                <Avatar name={a.patientName} size="sm" />
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-bold text-slate-900 truncate">{a.patientName} <span className="font-normal text-slate-400">· {a.appointmentCode}</span></span><span className="block text-[11.5px] text-slate-500 truncate">{a.appointmentDate} · {a.timeSlot} · {a.doctorName}</span></span>
                <StatusBadge status={a.status} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
