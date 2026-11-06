import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IAppointment, IDoctor } from '../../types';
import { Calendar, Plus, Clock, CheckCircle, XCircle, ChevronRight, Stethoscope } from 'lucide-react';
import { StatusBadge, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import { formatDateShort, parseISODate, todayISO } from '../../utils/date';

export const PatientAppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Book Consultation Modal
  const [showBook, setShowBook] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(todayISO());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [doctorAvailable, setDoctorAvailable] = useState(true);
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const [apptRes, docRes] = await Promise.all([
        apiClient.get('/appointments'),
        apiClient.get('/doctors'),
      ]);
      setAppointments(apptRes.data.data.appointments);
      setDoctors(docRes.data.data.doctors);
      if (docRes.data.data.doctors.length > 0 && !doctorId) {
        setDoctorId(docRes.data.data.doctors[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch slots
  useEffect(() => {
    if (!doctorId || !appointmentDate) return;
    (async () => {
      try {
        const res = await apiClient.get(
          `/appointments/available-slots?doctorId=${doctorId}&date=${appointmentDate}`
        );
        const slots = res.data.data.availableSlots ?? [];
        setAvailableSlots(slots);
        setDoctorAvailable(res.data.data.isDoctorAvailable !== false);
        setTimeSlot(slots[0] || '');
      } catch {
        setAvailableSlots([]);
        setDoctorAvailable(false);
        setTimeSlot('');
      }
    })();
  }, [doctorId, appointmentDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) return;
    if (!user?.patientId) {
      setBookError('Your patient record is not linked to this login. Contact hospital reception.');
      return;
    }
    setSubmitting(true);
    setBookError(null);
    try {
      await apiClient.post('/appointments', {
        patientId: user.patientId,
        doctorId,
        appointmentDate,
        timeSlot,
        reason,
      });
      setShowBook(false);
      setReason('');
      setToastMsg('Consultation successfully booked.');
      fetchAppointments();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setBookError(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you wish to cancel this appointment?')) return;
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status: 'Cancelled' });
      setToastMsg('Appointment cancelled. The time slot has been released.');
      fetchAppointments();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to cancel appointment');
      setTimeout(() => setToastMsg(null), 4500);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            My Appointments
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Book consultations with verified doctors, view schedule & manage visits
          </p>
        </div>

        <button
          onClick={() => {
            setBookError(null);
            setShowBook(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Book New Visit
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Appointments List Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight mb-4">
          Consultation Schedule
        </h3>

        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No appointments found. Book your first consultation above.</p>
          ) : (
            appointments.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B3D20] bg-white px-2.5 py-0.5 rounded-full border border-[#C7FF75]">
                      {a.appointmentCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Dr. {a.doctorName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1.5">{a.reason}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    {formatDateShort(parseISODate(a.appointmentDate))} · {a.timeSlot}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <StatusBadge status={a.status} />
                  {a.status !== 'Cancelled' && a.status !== 'Completed' && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-full border border-rose-200 transition-colors"
                    >
                      Cancel Visit
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Book Appointment */}
      <Modal open={showBook} onClose={() => setShowBook(false)}>
        <ModalHeader
          title="Book Doctor Consultation"
          subtitle="Choose doctor, select available date, and lock slot"
          onClose={() => setShowBook(false)}
        />
        <form onSubmit={handleBook} className="p-6 space-y-4">
          <Field label="Attending Doctor *">
            <select
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={inputCls}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} — {d.specialization} (${d.consultationFee})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input
                type="date"
                required
                min={todayISO()}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Available Time Slot *">
              <select
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className={inputCls}
              >
                {availableSlots.length === 0 ? (
                  <option value="">
                    {doctorAvailable ? 'No slots available' : 'Doctor has no clinic this day'}
                  </option>
                ) : (
                  availableSlots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                )}
              </select>
            </Field>
          </div>

          {availableSlots.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableSlots.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setTimeSlot(s)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    timeSlot === s
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <Field label="Reason for Consultation *">
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Headache follow-up, general health checkup"
              className={inputCls}
            />
          </Field>

          {bookError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {bookError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBook(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !timeSlot}
              className="hc-btn-blue"
            >
              {submitting ? 'Booking…' : 'Confirm Consultation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
