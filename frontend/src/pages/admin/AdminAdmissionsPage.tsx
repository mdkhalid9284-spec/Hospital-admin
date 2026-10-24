import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAdmission, IPatient, IDoctor, IWard } from '../../types';
import { UserCheck, Plus, CheckCircle, AlertCircle, FileText, BedDouble, Calendar, ArrowRight, Download } from 'lucide-react';
import { Avatar, StatusBadge, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const AdminAdmissionsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [wards, setWards] = useState<IWard[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [dischargeAdmission, setDischargeAdmission] = useState<IAdmission | null>(null);
  const [viewSummaryAdmission, setViewSummaryAdmission] = useState<IAdmission | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Forms
  const [admitForm, setAdmitForm] = useState({
    patientId: '',
    doctorId: '',
    wardId: 'ward-icu',
    roomNumber: 'ICU-101',
    bedNumber: 'ICU-101-B',
    reason: '',
  });

  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: 'Acute condition stabilized. Normotensive on discharge.',
    treatmentGiven: 'Beta blockers administered. Continuous ECG telemetry for 48 hours.',
    adviceOnDischarge: 'Follow-up in cardiology OPD in 2 weeks. Maintain low sodium diet.',
    followUpDate: '2026-10-20',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [admRes, patRes, docRes, bedRes] = await Promise.all([
        apiClient.get('/admissions'),
        apiClient.get('/patients'),
        apiClient.get('/doctors'),
        apiClient.get('/beds/board'),
      ]);
      setAdmissions(admRes.data.data.admissions);
      setPatients(patRes.data.data.patients);
      setDoctors(docRes.data.data.doctors);
      setWards(bedRes.data.data.wards);

      if (patRes.data.data.patients.length > 0 && !admitForm.patientId) {
        setAdmitForm((p) => ({ ...p, patientId: patRes.data.data.patients[0].id }));
      }
      if (docRes.data.data.doctors.length > 0 && !admitForm.doctorId) {
        setAdmitForm((p) => ({ ...p, doctorId: docRes.data.data.doctors[0].id }));
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

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admissions', admitForm);
      setShowAdmitModal(false);
      setToastMsg('Patient admitted & bed locked with concurrency protection.');
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to admit patient');
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeAdmission) return;
    try {
      await apiClient.post(`/admissions/${dischargeAdmission.id}/discharge`, {
        dischargeSummary: dischargeForm,
      });
      setDischargeAdmission(null);
      setToastMsg(`Patient discharged and bed ${dischargeAdmission.bedNumber} freed atomically.`);
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to discharge patient');
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Admissions & Discharge
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Inpatient lifecycle: Bed reservations, active hospitalizations, and clinical discharge summaries
          </p>
        </div>

        <button
          onClick={() => setShowAdmitModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Admit Inpatient
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Admissions Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight mb-4">
          Hospital Inpatient Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="py-3 pl-2">Patient</th>
                <th className="py-3">Admission Code</th>
                <th className="py-3">Attending Doctor</th>
                <th className="py-3">Ward & Bed</th>
                <th className="py-3">Admission Date</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={adm.patientName} size="sm" className="w-8 h-8 text-[11px]" />
                      <div>
                        <p className="font-bold text-slate-900 text-[13px]">{adm.patientName}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{adm.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-slate-700">{adm.admissionCode}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{adm.doctorName}</td>
                  <td className="py-3.5">
                    <p className="font-bold text-slate-900">{adm.bedNumber}</p>
                    <p className="text-slate-400 text-[11px]">{adm.wardName}</p>
                  </td>
                  <td className="py-3.5 text-slate-600">
                    {new Date(adm.admissionDate).toLocaleDateString()}
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={adm.status} />
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    {adm.status === 'Admitted' ? (
                      <button
                        onClick={() => setDischargeAdmission(adm)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-full text-[11px] transition-colors border border-rose-200"
                      >
                        Process Discharge
                      </button>
                    ) : (
                      <button
                        onClick={() => setViewSummaryAdmission(adm)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-[11px] transition-colors"
                      >
                        View Summary
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Admit Patient */}
      <Modal open={showAdmitModal} onClose={() => setShowAdmitModal(false)}>
        <ModalHeader
          title="Admit Inpatient to Bed"
          subtitle="Allocates bed atomically with concurrency protection"
          onClose={() => setShowAdmitModal(false)}
        />
        <form onSubmit={handleAdmit} className="p-6 space-y-4">
          <Field label="Select Patient *">
            <select
              required
              value={admitForm.patientId}
              onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}
              className={inputCls}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Attending Doctor *">
            <select
              required
              value={admitForm.doctorId}
              onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })}
              className={inputCls}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} — {d.specialization}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Ward *">
              <select
                value={admitForm.wardId}
                onChange={(e) => setAdmitForm({ ...admitForm, wardId: e.target.value })}
                className={inputCls}
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room *">
              <input
                required
                value={admitForm.roomNumber}
                onChange={(e) => setAdmitForm({ ...admitForm, roomNumber: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Bed *">
              <input
                required
                value={admitForm.bedNumber}
                onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Reason for Hospitalization *">
            <textarea
              required
              rows={3}
              value={admitForm.reason}
              onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
              placeholder="e.g. Acute chest discomfort requiring cardiac ICU monitoring..."
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdmitModal(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hc-btn-blue">
              Confirm & Lock Bed
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Process Discharge */}
      {dischargeAdmission && (
        <Modal open={true} onClose={() => setDischargeAdmission(null)}>
          <ModalHeader
            title="Discharge Summary & Bed Release"
            subtitle={`Discharging ${dischargeAdmission.patientName} from Bed ${dischargeAdmission.bedNumber}`}
            onClose={() => setDischargeAdmission(null)}
          />
          <form onSubmit={handleDischarge} className="p-6 space-y-4">
            <Field label="Final Clinical Diagnosis *">
              <input
                required
                value={dischargeForm.diagnosis}
                onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Treatment Given During Stay *">
              <textarea
                required
                rows={3}
                value={dischargeForm.treatmentGiven}
                onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentGiven: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Advice on Discharge *">
              <textarea
                required
                rows={2}
                value={dischargeForm.adviceOnDischarge}
                onChange={(e) => setDischargeForm({ ...dischargeForm, adviceOnDischarge: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Recommended Follow-up Date">
              <input
                type="date"
                value={dischargeForm.followUpDate}
                onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              Note: Submitting this form marks the admission as "Discharged" and atomically releases Bed{' '}
              {dischargeAdmission.bedNumber} back to Available status.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDischargeAdmission(null)}
                className="hc-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="hc-btn-blue !bg-rose-600 hover:!bg-rose-700">
                Execute Discharge & Free Bed
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Discharge Summary */}
      {viewSummaryAdmission && (
        <Modal open={true} onClose={() => setViewSummaryAdmission(null)}>
          <ModalHeader
            title="Official Discharge Summary"
            subtitle={`${viewSummaryAdmission.patientName} (${viewSummaryAdmission.admissionCode})`}
            onClose={() => setViewSummaryAdmission(null)}
          />
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Final Diagnosis</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {viewSummaryAdmission.dischargeSummary?.diagnosis || 'Cardiac observation stabilized'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Treatment Given</p>
                <p className="text-slate-700 mt-0.5 leading-relaxed">
                  {viewSummaryAdmission.dischargeSummary?.treatmentGiven || 'Monitored under telemetry care and pharmacotherapy.'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Advice on Discharge</p>
                <p className="text-slate-700 mt-0.5 leading-relaxed">
                  {viewSummaryAdmission.dischargeSummary?.adviceOnDischarge || 'Low sodium diet, resume light activities.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewSummaryAdmission(null)}
                className="hc-btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
