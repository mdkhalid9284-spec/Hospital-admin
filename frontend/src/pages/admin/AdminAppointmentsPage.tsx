import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAppointment, IDoctor, IPatient } from '../../types';
import { InteractiveCalendar } from '../../components/ui/InteractiveCalendar';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import { CalendarDays, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { todayISO } from '../../utils/date';

export const AdminAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [doctorAvailable, setDoctorAvailable] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedPatId, setSelectedPatId] = useState('');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const [apptRes, docRes, patRes] = await Promise.all([
        apiClient.get('/appointments'),
        apiClient.get('/doctors'),
        apiClient.get('/patients'),
      ]);
      setAppointments(apptRes.data.data.appointments);
      setDoctors(docRes.data.data.doctors);
      setPatients(patRes.data.data.patients);

      if (docRes.data.data.doctors.length > 0 && !selectedDocId) {
        setSelectedDocId(docRes.data.data.doctors[0].id);
      }
      if (patRes.data.data.patients.length > 0 && !selectedPatId) {
        setSelectedPatId(patRes.data.data.patients[0].id);
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

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (!selectedDocId || !selectedDate) return;
    (async () => {
      try {
        const res = await apiClient.get(
          `/appointments/available-slots?doctorId=${selectedDocId}&date=${selectedDate}`
        );
        const slots = res.data.data.availableSlots ?? [];
        setAvailableSlots(slots);
        setDoctorAvailable(res.data.data.isDoctorAvailable !== false);
        setSelectedSlot(slots[0] || '');
      } catch {
        setAvailableSlots([]);
        setDoctorAvailable(false);
        setSelectedSlot('');
      }
    })();
  }, [selectedDocId, selectedDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBooking(true);
    setBookError(null);
    try {
      await apiClient.post('/appointments', {
        patientId: selectedPatId,
        doctorId: selectedDocId,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        reason,
      });
      setShowBookModal(false);
      setReason('');
      setToastMsg('Consultation scheduled & confirmed.');
      fetchAppointments();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setBookError(err.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: 'Confirmed' | 'Completed' | 'Cancelled'
  ) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status });
      setToastMsg(`Appointment status updated to ${status}.`);
      fetchAppointments();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to update status');
      setTimeout(() => setToastMsg(null), 4500);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Appointments
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Day, week & month views with real-time slot locks and status workflows
          </p>
        </div>

        <button
          onClick={() => {
            setBookError(null);
            setShowBookModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Schedule Appointment
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Interactive Calendar matching screenshot media_1792651876197.png */}
      <InteractiveCalendar
        appointments={appointments}
        onBookNew={() => setShowBookModal(true)}
        onStatusChange={handleStatusChange}
        onViewPatient={(patId) => {
          navigate(`/portal/admin/patients`);
        }}
      />

      {/* Modal: Schedule Appointment */}
      <Modal open={showBookModal} onClose={() => setShowBookModal(false)}>
        <ModalHeader
          title="Schedule New Consultation"
          subtitle="Real-time conflict prevention and slot booking"
          onClose={() => setShowBookModal(false)}
        />
        <form onSubmit={handleBook} className="p-6 space-y-4">
          <Field label="Select Patient *">
            <select
              required
              value={selectedPatId}
              onChange={(e) => setSelectedPatId(e.target.value)}
              className={inputCls}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Doctor *">
            <select
              required
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
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
            <Field label="Appointment Date *">
              <input
                type="date"
                required
                min={todayISO()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Available Time Slot *">
              <select
                required
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
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
                  onClick={() => setSelectedSlot(s)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    selectedSlot === s
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <Field label="Clinical Reason / Chief Complaint *">
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hypertension review, persistent migraine..."
              className={inputCls}
            />
          </Field>

          {bookError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{bookError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBookModal(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={booking || !selectedSlot}
              className="hc-btn-blue"
            >
              {booking ? 'Scheduling…' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
