import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IPrescription, IPatient, IPrescriptionMedicine } from '../../types';
import { Pill, Plus, Trash2, CheckCircle, Printer, FileText, Search } from 'lucide-react';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const DoctorPrescriptionsPage: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewRx, setViewRx] = useState<IPrescription | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [generalAdvice, setGeneralAdvice] = useState('Maintain proper hydration and complete full dosage course.');
  const [medicines, setMedicines] = useState<IPrescriptionMedicine[]>([
    {
      medicineName: 'Amoxicillin & Clavulanate',
      dosage: '625mg',
      frequency: 'Twice daily (after food)',
      duration: '5 days',
      instructions: 'Take with plenty of water',
    },
    {
      medicineName: 'Paracetamol',
      dosage: '500mg',
      frequency: 'As needed (SOS for fever)',
      duration: '3 days',
      instructions: 'Max 4 doses in 24 hours',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const patRes = await apiClient.get('/patients');
      const pats = patRes.data.data.patients;
      setPatients(pats);
      if (pats.length > 0 && !patientId) setPatientId(pats[0].id);

      // Fetch all prescriptions for assigned patients
      const allRx: IPrescription[] = [];
      for (const p of pats) {
        try {
          const rxRes = await apiClient.get(`/prescriptions/patient/${p.id}`);
          allRx.push(...(rxRes.data.data.prescriptions || []));
        } catch {}
      }
      setPrescriptions(allRx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        medicineName: '',
        dosage: '500mg',
        frequency: 'Once daily',
        duration: '7 days',
        instructions: 'Take after meals',
      },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof IPrescriptionMedicine, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !diagnosis.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/prescriptions', {
        patientId,
        diagnosis,
        medicines,
        generalAdvice,
      });
      setShowBuilder(false);
      setToastMsg('Electronic prescription created & signed successfully.');
      setDiagnosis('');
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Prescription failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Prescription Builder
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Electronic drug order builder with dynamic dosage scheduling, instructions & PDF export
          </p>
        </div>

        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Compose Prescription
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Prescriptions List Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight mb-4">
          Clinical Prescriptions Log
        </h3>

        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {rx.prescriptionCode}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Patient: {rx.patientName}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 mt-1.5">
                  Diagnosis: {rx.diagnosis}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rx.medicines.map((m, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                    >
                      <b className="text-slate-900">{m.medicineName}</b> {m.dosage} ({m.frequency})
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewRx(rx)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Printer size={13} /> View & Print
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Compose Prescription */}
      <Modal open={showBuilder} onClose={() => setShowBuilder(false)}>
        <ModalHeader
          title="Compose Electronic Prescription"
          subtitle="Add drug items with dosage, timing schedules and instructions"
          onClose={() => setShowBuilder(false)}
        />
        <form onSubmit={handleCreatePrescription} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <Field label="Select Patient *">
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className={inputCls}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Clinical Diagnosis *">
            <input
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Pharyngitis with low-grade pyrexia"
              className={inputCls}
            />
          </Field>

          {/* Dynamic Medicines Rows */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Prescribed Medicines
              </span>
              <button
                type="button"
                onClick={addMedicineRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={13} /> Add Medicine
              </button>
            </div>

            {medicines.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    Medicine #{idx + 1}
                  </span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicineRow(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Medicine Name (e.g. Amoxicillin)"
                    value={m.medicineName}
                    onChange={(e) => updateMedicine(idx, 'medicineName', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    required
                    placeholder="Dosage (e.g. 500mg)"
                    value={m.dosage}
                    onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Frequency (e.g. Twice daily after meals)"
                    value={m.frequency}
                    onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}
                    className={inputCls}
                  />
                  <input
                    required
                    placeholder="Duration (e.g. 7 days)"
                    value={m.duration}
                    onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <input
                  placeholder="Instructions (e.g. Take with full glass of water)"
                  value={m.instructions}
                  onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <Field label="General Advice & Precautions">
            <textarea
              rows={2}
              value={generalAdvice}
              onChange={(e) => setGeneralAdvice(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="hc-btn-blue">
              {submitting ? 'Signing…' : 'Sign & Issue Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View & Print Prescription */}
      {viewRx && (
        <Modal open={true} onClose={() => setViewRx(null)}>
          <ModalHeader
            title="HospitalCare Medical Prescription"
            subtitle={`Official clinical order #${viewRx.prescriptionCode}`}
            onClose={() => setViewRx(null)}
          />
          <div className="p-6 space-y-4 text-xs">
            {/* Formal printable prescription layout */}
            <div className="p-5 bg-white border border-slate-300 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">HospitalCare Medical Center</h2>
                  <p className="text-[11px] text-slate-500">Department of Clinical Medicine & Care</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800">{viewRx.prescriptionCode}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(viewRx.prescribedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</p>
                  <p className="font-bold text-slate-900 text-sm">{viewRx.patientName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Prescribing Doctor</p>
                  <p className="font-bold text-slate-900 text-sm">Dr. {viewRx.doctorName}</p>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Diagnosis</p>
                  <p className="font-bold text-blue-700">{viewRx.diagnosis}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800 text-xs">Rx Medications:</p>
                <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                  {viewRx.medicines.map((m, i) => (
                    <div key={i} className="p-2.5 flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {i + 1}. {m.medicineName} <span className="font-normal text-slate-500">({m.dosage})</span>
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Schedule: {m.frequency} · Duration: {m.duration}
                        </p>
                        {m.instructions && (
                          <p className="text-[10.5px] text-slate-400 italic">
                            Instructions: {m.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewRx.generalAdvice && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <p className="font-bold text-blue-900 text-[11px]">General Advice:</p>
                  <p className="text-blue-800 text-[11px] mt-0.5">{viewRx.generalAdvice}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="hc-btn-blue !py-2 text-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Prescription
              </button>
              <button
                type="button"
                onClick={() => setViewRx(null)}
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
