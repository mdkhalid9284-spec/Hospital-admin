import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAnalyticsSummary, IAdmission, IAppointment, IPatient, IDoctor, IWard } from '../../types';
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
  ArrowRight,
  Sparkles,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<IAnalyticsSummary | null>(null);
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [wards, setWards] = useState<IWard[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewAdmission, setShowNewAdmission] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form states
  const [admitForm, setAdmitForm] = useState({ patientId: '', doctorId: '', wardId: 'ward-icu', roomNumber: 'ICU-101', bedNumber: 'ICU-101-B', reason: '' });
  const [patientForm, setPatientForm] = useState({ fullName: '', dob: '1995-05-20', gender: 'male', phone: '+1 (555) 019-3321', email: '', address: '450 Lexington Ave, New York', emergencyContact: { name: 'Sarah Miller', relationship: 'Spouse', phone: '+1 (555) 019-3322' } });
  const [apptForm, setApptForm] = useState({ patientId: '', doctorId: '', appointmentDate: '2026-10-06', timeSlot: '10:00 - 10:30', reason: 'General checkup' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, admRes, apptRes, patRes, docRes, bedRes] = await Promise.all([
        apiClient.get('/analytics/summary'),
        apiClient.get('/admissions'),
        apiClient.get('/appointments'),
        apiClient.get('/patients'),
        apiClient.get('/doctors'),
        apiClient.get('/beds/board'),
      ]);
      setMetrics(sumRes.data.data);
      setAdmissions(admRes.data.data.admissions);
      setAppointments(apptRes.data.data.appointments);
      setPatients(patRes.data.data.patients);
      setDoctors(docRes.data.data.doctors);
      setWards(bedRes.data.data.wards);

      if (patRes.data.data.patients.length > 0) {
        setAdmitForm((p) => ({ ...p, patientId: patRes.data.data.patients[0].id }));
        setApptForm((p) => ({ ...p, patientId: patRes.data.data.patients[0].id }));
      }
      if (docRes.data.data.doctors.length > 0) {
        setAdmitForm((p) => ({ ...p, doctorId: docRes.data.data.doctors[0].id }));
        setApptForm((p) => ({ ...p, doctorId: docRes.data.data.doctors[0].id }));
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

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/patients', patientForm);
      setShowNewPatient(false);
      setFeedback('Patient successfully registered into HospitalCare.');
      fetchData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to register patient');
    }
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admissions', admitForm);
      setShowNewAdmission(false);
      setFeedback('Patient admitted and bed locked atomically.');
      fetchData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to admit patient');
    }
  };

  const handleCreateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/appointments', apptForm);
      setShowNewAppt(false);
      setFeedback('Appointment scheduled successfully.');
      fetchData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to book appointment');
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Subheader Title & Action Controls matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">Dashboard</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">{todayStr}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const data = JSON.stringify(metrics, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hospital_metrics_${Date.now()}.json`;
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

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* 4 Metric Cards Row — Avocado Health forest & lime palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Patients */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF9D8] text-[#0B3D20] text-[10px] font-bold">
              +3%
            </span>
            <div className="w-9 h-9 rounded-full bg-[#EAF9D8] flex items-center justify-center text-[#14532D]">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#667367] font-semibold uppercase tracking-wider">Patients</p>
            <p className="text-[28px] font-bold text-[#26352A] tracking-tight leading-none mt-1">
              {metrics?.totalPatients || 35}
            </p>
          </div>
        </div>

        {/* Metric 2: Forest Green Hero Card (Appointments) */}
        <div className="hc-card-forest-elevated flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-[#C7FF75] text-[#0B3D20] text-[10px] font-bold">
              +2.1%
            </span>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[#C7FF75]">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#EAF9D8] font-semibold uppercase tracking-wider">Appointments</p>
            <p className="text-[28px] font-bold text-white tracking-tight leading-none mt-1">
              {metrics?.todayAppointments || 16}
            </p>
          </div>
        </div>

        {/* Metric 3: Reports */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF9D8] text-[#0B3D20] text-[10px] font-bold">
              +2%
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F5F6F2] flex items-center justify-center text-[#26352A]">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#667367] font-semibold uppercase tracking-wider">Reports</p>
            <p className="text-[28px] font-bold text-[#26352A] tracking-tight leading-none mt-1">
              {metrics?.recentActivityCount || 22}
            </p>
          </div>
        </div>

        {/* Metric 4: Bed Occupancy */}
        <div className="hc-kpi flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF9D8] text-[#0B3D20] text-[10px] font-bold">
              +3%
            </span>
            <div className="w-9 h-9 rounded-full bg-[#F5F6F2] flex items-center justify-center text-[#26352A]">
              <BedDouble size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-[#667367] font-semibold uppercase tracking-wider">Bed Occupancy</p>
            <p className="text-[28px] font-bold text-[#26352A] tracking-tight leading-none mt-1">
              {metrics?.occupancyRate || 30}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Right Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left & Center Columns: Patients Statistics + Top Consultations Radar */}
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Segmented Pill Bar Chart */}
            <PatientsStatisticsBarChart admittedTotal={35} recoveredTotal={33} />

            {/* 3D Floating Top Consultations Radar */}
            <TopConsultationsRadar total={22} />
          </div>

          {/* Upcoming Patients Table matching screenshot media_1792651876079.png */}
          <div className="bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight">Upcoming Patients</h3>
              <button
                onClick={() => navigate('/portal/admin/patients')}
                className="text-xs font-bold text-[#14532D] hover:text-[#0B3D20] transition-colors"
              >
                View directory →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="text-[#667367] font-semibold border-b border-[#E3E8DE]">
                    <th className="pb-3 pl-1">Patient Name</th>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Reason/Concern</th>
                    <th className="pb-3">Contact No.</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Visit Type</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8DE]/60">
                  {[
                    { name: 'Robert Johnson', time: '11:30 AM', reason: 'Mental Health Concern', contact: '+1 234 567 890', payment: 'Pending', type: 'Consult', active: true },
                    { name: 'Ava Brown', time: '12:30 PM', reason: 'Hypertension Follow-up', contact: '+1 321 654 987', payment: 'Pending', type: 'Follow-up' },
                    { name: 'Emily Williams', time: '01:00 PM', reason: 'Routine Checkup', contact: '+1 987 654 321', payment: 'Pending', type: 'Consult' },
                    { name: 'Alena Moore', time: '02:00 PM', reason: 'Diabetes Medication Review', contact: '+1 654 321 789', payment: 'Pending', type: 'Consult' },
                    { name: 'Jonathan Foley', time: '03:00 PM', reason: 'Hypertension Follow-up', contact: '+1 123 456 789', payment: 'Pending', type: 'Follow-up' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAF6] transition-colors">
                      <td className="py-3 pl-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} size="sm" className="w-7 h-7 text-[10px]" />
                          <span className="font-bold text-[#26352A]">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[#667367] font-medium">{row.time}</td>
                      <td className="py-3 text-[#26352A] font-medium">{row.reason}</td>
                      <td className="py-3 text-[#667367] font-mono text-[11px]">{row.contact}</td>
                      <td className="py-3">
                        <span className="text-[#9A6700] font-bold">{row.payment}</span>
                      </td>
                      <td className="py-3 text-[#667367] font-medium">{row.type}</td>
                      <td className="py-3 text-right pr-1">
                        <button
                          onClick={() => navigate('/portal/admin/appointments')}
                          className={`px-3.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                            row.active
                              ? 'bg-[#14532D] hover:bg-[#0B3D20] text-white shadow-xs'
                              : 'bg-[#F5F6F2] hover:bg-[#E3E8DE] text-[#26352A]'
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

        {/* Right Column: Schedule & Quick Actions + Health Alerts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight">Today's Schedule</h3>
            <p className="text-xs text-[#667367] mt-0.5">Assigned consultations on the board</p>

            <div className="grid grid-cols-2 gap-3 mt-3.5">
              <div className="p-3.5 rounded-2xl bg-[#F5F6F2] border border-[#E3E8DE]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#667367]">Appointments</p>
                <p className="text-2xl font-bold text-[#26352A] mt-1">16</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#EAF9D8] border border-[#C7FF75]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D20]">Available Slots</p>
                <p className="text-2xl font-bold text-[#0B3D20] mt-1">04</p>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="mt-4 pt-3 border-t border-[#E3E8DE]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#667367] mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowNewAppt(true)}
                  className="py-2.5 px-3 bg-[#14532D] hover:bg-[#0B3D20] text-white font-bold rounded-full text-xs text-center transition-all shadow-xs active:scale-95"
                >
                  New Appointment
                </button>
                <button
                  onClick={() => setShowNewPatient(true)}
                  className="py-2.5 px-3 bg-white border border-[#E3E8DE] hover:bg-[#F5F6F2] text-[#26352A] font-bold rounded-full text-xs text-center transition-all shadow-xs active:scale-95"
                >
                  New Patient
                </button>
              </div>
              <button
                onClick={() => setShowNewAdmission(true)}
                className="w-full mt-2 py-2.5 px-3 bg-[#C7FF75] hover:bg-[#bbf654] text-[#0B3D20] font-bold rounded-full text-xs text-center transition-all shadow-xs active:scale-95"
              >
                + Admit Inpatient to Bed
              </button>
            </div>

            {/* Upcoming Appointments preview */}
            <div className="mt-4 pt-3 border-t border-[#E3E8DE] space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#667367]">Upcoming Appointments</p>

              <div className="p-3 rounded-2xl bg-[#F5F6F2] border border-[#E3E8DE] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#26352A]">Routine Medical Checkup</p>
                  <p className="text-[11px] text-[#667367]">Amelia Bennett · Video · 10:00</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#8A998B]" />
              </div>

              <div className="p-3 rounded-2xl bg-[#14532D] text-white shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#C7FF75]">Cold and Fever</p>
                  <p className="text-[11px] text-white/80">Hannah Collins · Video · 11:00</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#C7FF75]" />
              </div>
            </div>
          </div>

          {/* Patient Health Monitoring & Alerts */}
          <PatientHealthAlerts />
        </div>
      </div>

      {/* Modal: Register Patient */}
      <Modal open={showNewPatient} onClose={() => setShowNewPatient(false)}>
        <ModalHeader title="Register New Patient" subtitle="Create permanent patient record in database" onClose={() => setShowNewPatient(false)} />
        <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
          <Field label="Full Name *">
            <input required value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} placeholder="John Doe" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth *">
              <input type="date" required value={patientForm.dob} onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Gender *">
              <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })} className={inputCls}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone *">
              <input required value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Email *">
              <input type="email" required value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} placeholder="patient@example.com" className={inputCls} />
            </Field>
          </div>
          <Field label="Residential Address *">
            <input required value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} className={inputCls} />
          </Field>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-2">
              <input required placeholder="Name" value={patientForm.emergencyContact.name} onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: { ...patientForm.emergencyContact, name: e.target.value } })} className={inputCls} />
              <input required placeholder="Relationship" value={patientForm.emergencyContact.relationship} onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: { ...patientForm.emergencyContact, relationship: e.target.value } })} className={inputCls} />
              <input required placeholder="Phone" value={patientForm.emergencyContact.phone} onChange={(e) => setPatientForm({ ...patientForm, emergencyContact: { ...patientForm.emergencyContact, phone: e.target.value } })} className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNewPatient(false)} className="hc-btn-ghost">Cancel</button>
            <button type="submit" className="hc-btn-blue">Register Patient</button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Hospital Admission */}
      <Modal open={showNewAdmission} onClose={() => setShowNewAdmission(false)}>
        <ModalHeader title="Admit Inpatient to Bed" subtitle="Atomic bed allocation with concurrency protection" onClose={() => setShowNewAdmission(false)} />
        <form onSubmit={handleCreateAdmission} className="p-6 space-y-4">
          <Field label="Select Patient *">
            <select required value={admitForm.patientId} onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })} className={inputCls}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>
              ))}
            </select>
          </Field>
          <Field label="Attending Doctor *">
            <select required value={admitForm.doctorId} onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })} className={inputCls}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} — {d.specialization}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Ward *">
              <select value={admitForm.wardId} onChange={(e) => setAdmitForm({ ...admitForm, wardId: e.target.value })} className={inputCls}>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Room *">
              <input required value={admitForm.roomNumber} onChange={(e) => setAdmitForm({ ...admitForm, roomNumber: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Bed Number *">
              <input required value={admitForm.bedNumber} onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Clinical Reason for Admission *">
            <textarea required rows={3} value={admitForm.reason} onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })} placeholder="Acute symptoms, required observation, telemetry..." className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNewAdmission(false)} className="hc-btn-ghost">Cancel</button>
            <button type="submit" className="hc-btn-blue">Confirm Admission & Lock Bed</button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Appointment */}
      <Modal open={showNewAppt} onClose={() => setShowNewAppt(false)}>
        <ModalHeader title="Schedule Consultation" subtitle="Real-time availability and conflict prevention" onClose={() => setShowNewAppt(false)} />
        <form onSubmit={handleCreateAppt} className="p-6 space-y-4">
          <Field label="Patient *">
            <select required value={apptForm.patientId} onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })} className={inputCls}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>
              ))}
            </select>
          </Field>
          <Field label="Doctor *">
            <select required value={apptForm.doctorId} onChange={(e) => setApptForm({ ...apptForm, doctorId: e.target.value })} className={inputCls}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} — {d.specialization}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input type="date" required value={apptForm.appointmentDate} onChange={(e) => setApptForm({ ...apptForm, appointmentDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Time Slot *">
              <select value={apptForm.timeSlot} onChange={(e) => setApptForm({ ...apptForm, timeSlot: e.target.value })} className={inputCls}>
                <option value="09:00 - 09:30">09:00 - 09:30</option>
                <option value="10:00 - 10:30">10:00 - 10:30</option>
                <option value="11:00 - 11:30">11:00 - 11:30</option>
                <option value="14:00 - 14:30">14:00 - 14:30</option>
                <option value="15:00 - 15:30">15:00 - 15:30</option>
              </select>
            </Field>
          </div>
          <Field label="Reason *">
            <input required value={apptForm.reason} onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNewAppt(false)} className="hc-btn-ghost">Cancel</button>
            <button type="submit" className="hc-btn-blue">Schedule Consultation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
