import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IAppointment, IPatient, IDoctor } from '../../types';
import { PatientsStatisticsBarChart } from '../../components/ui/PatientsStatisticsBarChart';
import { TopConsultationsRadar } from '../../components/ui/TopConsultationsRadar';
import { PatientHealthAlerts } from '../../components/ui/PatientHealthAlerts';
import { Avatar, StatusBadge, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import {
  Users,
  Calendar,
  FileText,
  BedDouble,
  Download,
  Plus,
  ChevronDown,
  CheckCircle,
  Stethoscope,
  Pill,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick action modals
  const [showApptModal, setShowApptModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [apptForm, setApptForm] = useState({
    patientId: '',
    appointmentDate: '2026-10-06',
    timeSlot: '11:00 - 11:30',
    reason: 'Clinical follow-up consultation',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [apptRes, patRes] = await Promise.all([
        apiClient.get('/appointments'),
        apiClient.get('/patients'),
      ]);
      setAppointments(apptRes.data.data.appointments);
      setPatients(patRes.data.data.patients);
      if (patRes.data.data.patients.length > 0) {
        setApptForm((p) => ({ ...p, patientId: patRes.data.data.patients[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/appointments', {
        doctorId: user?.doctorId || 'doc-001',
        ...apptForm,
      });
      setShowApptModal(false);
      setToastMsg('Consultation scheduled in doctor calendar.');
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to schedule appointment');
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Subheader bar matching screenshot media_1792651876079.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">Dashboard</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">{todayStr}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const data = JSON.stringify({ appointments, patientsCount: patients.length }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `doctor_daily_summary_${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <Download size={14} /> Export
          </button>

          <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all">
            Today <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* 4 Metric Cards Row — 3D dimensional KPI surface */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Patients */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              +3%
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">My Patients</p>
            <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none mt-1">{patients.length}</p>
          </div>
        </div>

        {/* Metric 2: Elevated 3D Blue Card (Appointments) */}
        <div className="hc-elev-blue flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
              +2.1%
            </span>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-blue-100 font-semibold uppercase tracking-wider">Appointments</p>
            <p className="text-[28px] font-bold text-white tracking-tight leading-none mt-1">{appointments.length}</p>
          </div>
        </div>

        {/* Metric 3: Reports */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              +2%
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Clinical Notes</p>
            <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none mt-1">{patients.length}</p>
          </div>
        </div>

        {/* Metric 4: Active Today */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              +3%
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <BedDouble size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Scheduled Today</p>
            <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none mt-1">
              {appointments.filter((a) => a.status === 'Confirmed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Right Schedule Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Patients Statistics & 3D Top Consultations */}
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PatientsStatisticsBarChart admittedTotal={35} recoveredTotal={33} />
            <TopConsultationsRadar total={22} />
          </div>

          {/* Upcoming Patients Table matching screenshot */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Upcoming Patients</h3>
              <button
                onClick={() => navigate('/portal/doctor/patients')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View assigned patients →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100">
                    <th className="pb-3 pl-1">Patient Name</th>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Reason/Concern</th>
                    <th className="pb-3">Contact No.</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Visit Type</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Robert Johnson', time: '11:30 AM', reason: 'Mental Health Concern', contact: '+1 234 567 890', payment: 'Pending', type: 'Consult', blue: true },
                    { name: 'Ava Brown', time: '12:30 PM', reason: 'Hypertension Follow-up', contact: '+1 321 654 987', payment: 'Pending', type: 'Follow-up' },
                    { name: 'Emily Williams', time: '01:00 PM', reason: 'Routine Checkup', contact: '+1 987 654 321', payment: 'Pending', type: 'Consult' },
                    { name: 'Alena Moore', time: '02:00 PM', reason: 'Diabetes Medication Review', contact: '+1 654 321 789', payment: 'Pending', type: 'Consult' },
                    { name: 'Jonathan Foley', time: '03:00 PM', reason: 'Hypertension Follow-up', contact: '+1 123 456 789', payment: 'Pending', type: 'Follow-up' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} size="sm" className="w-7 h-7 text-[10px]" />
                          <span className="font-bold text-slate-900">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-500 font-medium">{row.time}</td>
                      <td className="py-3 text-slate-700 font-medium">{row.reason}</td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">{row.contact}</td>
                      <td className="py-3">
                        <span className="text-amber-600 font-bold">{row.payment}</span>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">{row.type}</td>
                      <td className="py-3 text-right pr-1">
                        <button
                          onClick={() => navigate('/portal/doctor/records')}
                          className={`px-3.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                            row.blue
                              ? 'bg-[#1d6cf2] hover:bg-blue-700 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          Start Consult
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Quick Actions + Patient Health Alerts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Today's Schedule</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your today's appointments</p>

            <div className="grid grid-cols-2 gap-3 mt-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Appointments</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">16</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available Slots</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">04</p>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowApptModal(true)}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs text-center transition-all shadow-sm active:scale-95"
                >
                  New Appointment
                </button>
                <button
                  onClick={() => navigate('/portal/doctor/prescriptions')}
                  className="py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-full text-xs text-center transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                >
                  <Pill size={13} /> Prescribe
                </button>
              </div>
            </div>

            {/* Upcoming Appointments preview */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Upcoming Appointments</p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Routine Medical Checkup</p>
                  <p className="text-[11px] text-slate-400">Amelia Bennett · Video · 10:00</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              </div>

              <div className="p-3 rounded-2xl bg-[#1d6cf2] text-white shadow-md shadow-blue-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Cold and Fever</p>
                  <p className="text-[11px] text-blue-100">Hannah Collins · Video · 11:00</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Patient Health Monitoring & Alerts */}
          <PatientHealthAlerts />
        </div>
      </div>

      {/* Modal: New Appointment */}
      <Modal open={showApptModal} onClose={() => setShowApptModal(false)}>
        <ModalHeader
          title="Schedule Patient Consultation"
          subtitle="Reserve a slot in your doctor schedule"
          onClose={() => setShowApptModal(false)}
        />
        <form onSubmit={handleBookAppt} className="p-6 space-y-4">
          <Field label="Select Patient *">
            <select
              required
              value={apptForm.patientId}
              onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })}
              className={inputCls}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input
                type="date"
                required
                value={apptForm.appointmentDate}
                onChange={(e) => setApptForm({ ...apptForm, appointmentDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Time Slot *">
              <select
                value={apptForm.timeSlot}
                onChange={(e) => setApptForm({ ...apptForm, timeSlot: e.target.value })}
                className={inputCls}
              >
                <option value="10:00 - 10:30">10:00 - 10:30</option>
                <option value="11:00 - 11:30">11:00 - 11:30</option>
                <option value="12:00 - 12:30">12:00 - 12:30</option>
                <option value="14:00 - 14:30">14:00 - 14:30</option>
                <option value="15:00 - 15:30">15:00 - 15:30</option>
              </select>
            </Field>
          </div>
          <Field label="Clinical Concern / Reason *">
            <input
              required
              value={apptForm.reason}
              onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowApptModal(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hc-btn-blue">
              Confirm Consultation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
