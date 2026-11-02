import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IPatient, IAppointment, IMedicalRecord, IPrescription, IBill, IAdmission } from '../../types';
import { WellnessScoreGauge } from '../../components/ui/WellnessScoreGauge';
import { Avatar, StatusBadge } from '../../components/ui/primitives';
import {
  Calendar,
  Pill,
  FileText,
  DollarSign,
  BedDouble,
  HeartPulse,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PatientDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<IPatient | null>(null);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [admission, setAdmission] = useState<IAdmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const pid = user?.patientId || 'pat-001';
      try {
        setLoading(true);
        const [patRes, apptRes, recRes, rxRes, billRes, admRes] = await Promise.all([
          apiClient.get(`/patients/${pid}`).catch(() => null),
          apiClient.get('/appointments').catch(() => ({ data: { data: { appointments: [] } } })),
          apiClient.get(`/records/patient/${pid}`).catch(() => ({ data: { data: { records: [] } } })),
          apiClient.get(`/prescriptions/patient/${pid}`).catch(() => ({ data: { data: { prescriptions: [] } } })),
          apiClient.get(`/bills/patient/${pid}`).catch(() => ({ data: { data: { bills: [] } } })),
          apiClient.get('/admissions').catch(() => ({ data: { data: { admissions: [] } } })),
        ]);

        if (patRes) setPatient(patRes.data.data.patient);
        setAppointments(apptRes.data.data.appointments || []);
        setRecords(recRes.data.data.records || []);
        setPrescriptions(rxRes.data.data.prescriptions || []);
        setBills(billRes.data.data.bills || []);

        const activeAdm = (admRes.data.data.admissions || []).find(
          (a: IAdmission) => a.patientId === pid && a.status === 'Admitted'
        );
        setAdmission(activeAdm || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const totalDue = bills.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Patient Hero Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white rounded-[28px] p-6 sm:p-7 relative overflow-hidden shadow-xl">
        <div className="absolute -top-24 -right-16 w-80 h-80 bg-[#EAF9D8]0/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={patient?.fullName || user?.fullName || 'Patient'} size="lg" className="w-16 h-16 text-base" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Welcome back, {patient?.fullName?.split(' ')[0] || user?.fullName?.split(' ')[0]}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-blue-300 font-bold border border-white/15">
                  {patient?.patientCode || 'PAT-1001'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Blood Group: <b className="text-white">{patient?.bloodGroup || 'O+'}</b> · Gender: <b className="text-white capitalize">{patient?.gender || 'Male'}</b> · DOB: {patient?.dob || '1985-06-14'}
              </p>
              {admission && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <BedDouble size={14} /> Currently Admitted: {admission.wardName} (Bed {admission.bedNumber})
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/portal/patient/documents')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Upload size={14} /> Upload Records
            </button>
            <button
              onClick={() => navigate('/portal/patient/appointments')}
              className="px-4 py-2.5 bg-[#14532D] hover:bg-[#14532D] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all flex items-center gap-1.5"
            >
              <Calendar size={14} /> Book Consultation
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards — 3D dimensional surface */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hc-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Upcoming Visits</span>
            <span className="p-2 rounded-xl bg-[#EAF9D8] text-[#14532D]"><Calendar size={15} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{appointments.length}</p>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Confirmed appointments</span>
        </div>

        <div className="hc-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Active Prescriptions</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Pill size={15} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{prescriptions.length}</p>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Medical drug orders</span>
        </div>

        <div className="hc-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Clinical Notes</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><FileText size={15} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{records.length}</p>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Doctor observations</span>
        </div>

        <div className="hc-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Balance Due</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><DollarSign size={15} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">${totalDue.toFixed(2)}</p>
          <span className="text-[11px] text-amber-700 font-semibold block mt-1">
            {totalDue > 0 ? 'Pending hospital invoice' : 'All accounts settled'}
          </span>
        </div>
      </div>

      {/* Main Grid: Clinical History, Prescriptions, Wellness Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Active Prescriptions & Upcoming Appointments */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Medicines Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Pill size={16} className="text-[#14532D]" />
                Current Prescriptions & Schedule
              </h3>
              <button
                onClick={() => navigate('/portal/patient/records')}
                className="text-xs font-bold text-[#14532D] hover:text-[#0B3D20]"
              >
                View all history →
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No active prescriptions.</p>
              ) : (
                prescriptions.slice(0, 2).map((rx) => (
                  <div key={rx.id} className="p-4 rounded-2xl bg-[#EAF9D8]/50 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {rx.diagnosis} · <span className="font-medium text-slate-500">Dr. {rx.doctorName}</span>
                      </span>
                      <span className="text-[10.5px] font-mono text-[#0B3D20] font-bold bg-white px-2 py-0.5 rounded-full border border-[#C7FF75]">
                        {rx.prescriptionCode}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {rx.medicines.map((m, i) => (
                        <div key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="text-[#14532D] font-bold mt-0.5">•</span>
                          <div>
                            <b className="text-slate-900">{m.medicineName}</b> {m.dosage} — {m.frequency} ({m.duration})
                            {m.instructions && <p className="text-[11px] text-slate-500 italic mt-0.5">{m.instructions}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinical Doctor Observations */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight mb-3 flex items-center gap-2">
              <FileText size={16} className="text-[#14532D]" />
              Doctor Clinical Notes & Vitals
            </h3>
            <div className="space-y-3">
              {records.slice(0, 3).map((r) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{r.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{r.notes}</p>
                  {r.vitalSigns && (
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10.5px]">
                      <span className="bg-white px-2 py-0.5 rounded border text-[#0B3D20] font-bold">
                        BP: {r.vitalSigns.bloodPressure}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border text-emerald-700 font-bold">
                        Heart Rate: {r.vitalSigns.heartRate} bpm
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border text-purple-700 font-bold">
                        SpO2: {r.vitalSigns.spo2}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Wellness Score & Appointments List */}
        <div className="lg:col-span-4 space-y-5">
          {/* Wellness Score Card */}
          <WellnessScoreGauge score={88} />

          {/* Upcoming Consultations */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">Upcoming Visits</h3>
              <button
                onClick={() => navigate('/portal/patient/appointments')}
                className="text-xs font-bold text-[#14532D] hover:text-[#0B3D20]"
              >
                Book visit →
              </button>
            </div>

            <div className="space-y-2.5">
              {appointments.slice(0, 3).map((a) => (
                <div key={a.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{a.reason}</p>
                    <p className="text-[11px] text-slate-400">{a.doctorName} · {a.timeSlot}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
