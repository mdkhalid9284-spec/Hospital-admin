import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IMedicalRecord, IPrescription } from '../../types';
import { TestAnalyticsBubbleChart } from '../../components/ui/TestAnalyticsBubbleChart';
import { FileText, Pill, Printer, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal, ModalHeader } from '../../components/ui/primitives';
import { calculateAge, formatDateShort, parseISODate } from '../../utils/date';

export const PatientRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [activeTab, setActiveTab] = useState<'rx' | 'notes'>('rx');
  const [viewRx, setViewRx] = useState<IPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const pid = user?.patientId;
    if (!pid) {
      setLoading(false);
      setError('No patient profile is linked to this account.');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [recRes, rxRes] = await Promise.all([
          apiClient.get(`/records/patient/${pid}`),
          apiClient.get(`/prescriptions/patient/${pid}`),
        ]);
        setRecords(recRes.data.data?.records ?? []);
        setPrescriptions(rxRes.data.data?.prescriptions ?? []);
      } catch (err: any) {
        setError(err.message || 'Unable to load your medical records.');
        setRecords([]);
        setPrescriptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, reloadKey]);

  const ageOf = (rx: IPrescription): number =>
    typeof rx.patientAge === 'number' ? rx.patientAge : calculateAge(rx.patientDob, rx.prescribedAt);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Medical Records & Prescriptions
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Authorized health summary, digital prescriptions with dosing instructions & vital signs
          </p>
        </div>
      </div>

      {/* Test Analytics with Bubble Chart */}
      <TestAnalyticsBubbleChart />

      {/* Records & Prescriptions Tab Switcher */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab('rx')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rx'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Pill size={13} /> Active Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText size={13} /> Doctor Clinical Notes ({records.length})
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 sm:flex-row sm:items-center"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="inline-flex items-center gap-1 self-start rounded-lg bg-red-600 px-2.5 py-1 text-white hover:bg-red-700"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {activeTab === 'rx' && (
          <div className="space-y-3">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">Loading prescriptions…</p>
            ) : prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {error ? 'Prescriptions could not be retrieved.' : 'No prescriptions found.'}
              </p>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                          {rx.prescriptionCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Prescribed by {rx.doctorName}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatDateShort(parseISODate(rx.prescribedAt))}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        Diagnosis: {rx.diagnosis}
                      </p>
                    </div>

                    <button
                      onClick={() => setViewRx(rx)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-bold text-slate-700 transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Printer size={12} /> Print Order
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-blue-100/70">
                    {rx.medicines.map((m, i) => (
                      <div key={i} className="text-xs text-slate-700">
                        • <b className="text-slate-900">{m.medicineName}</b> {m.dosage} — {m.frequency} for {m.duration}
                        {m.instructions && (
                          <span className="text-slate-500 italic block pl-2.5">
                            Instructions: {m.instructions}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {rx.generalAdvice && (
                    <p className="text-xs text-blue-800 bg-blue-100/50 p-2.5 rounded-xl font-medium">
                      Advice: {rx.generalAdvice}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">Loading clinical notes…</p>
            ) : records.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {error ? 'Clinical notes could not be retrieved.' : 'No doctor clinical notes recorded.'}
              </p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 text-[13px]">{r.title}</p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {r.doctorName} · {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{r.notes}</p>
                  {r.vitalSigns && (
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10.5px]">
                      <span className="bg-white px-2 py-0.5 rounded border text-blue-700 font-bold">
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
              ))
            )}
          </div>
        )}
      </div>

      {/* Printable Prescription Modal */}
      {viewRx && (
        <Modal open={true} onClose={() => setViewRx(null)}>
          <ModalHeader
            title="HospitalCare Medical Prescription"
            subtitle={`Clinical Order #${viewRx.prescriptionCode}`}
            onClose={() => setViewRx(null)}
          />
          <div className="p-6 space-y-4 text-xs">
            <div className="rx-print-area p-5 bg-white border border-slate-300 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">HospitalCare Medical Center</h2>
                  <p className="text-[11px] text-slate-500">Department of Clinical Medicine</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-800">{viewRx.prescriptionCode}</p>
                  <p className="text-[10px] text-slate-400">
                    Issued {formatDateShort(parseISODate(viewRx.prescribedAt))}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Patient</p>
                  <p className="font-bold text-slate-900">{viewRx.patientName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Patient ID</p>
                  <p className="font-bold text-slate-900">{viewRx.patientCode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Age / DOB</p>
                  <p className="font-bold text-slate-900">
                    {ageOf(viewRx)} yrs
                    {viewRx.patientDob
                      ? ` · ${formatDateShort(parseISODate(viewRx.patientDob))}`
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Doctor</p>
                  <p className="font-bold text-slate-900">{viewRx.doctorName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Prescription Date</p>
                  <p className="font-bold text-slate-900">
                    {formatDateShort(parseISODate(viewRx.prescribedAt))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Diagnosis</p>
                  <p className="font-bold text-blue-700">{viewRx.diagnosis}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-900">Prescribed Medications:</p>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {viewRx.medicines.map((m, i) => (
                    <div key={i} className="p-2.5">
                      <p className="font-bold text-slate-900">{i + 1}. {m.medicineName} ({m.dosage})</p>
                      <p className="text-[11px] text-slate-600">Schedule: {m.frequency} for {m.duration}</p>
                      {m.instructions && (
                        <p className="text-[10.5px] italic text-slate-400">
                          Instructions: {m.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {viewRx.generalAdvice && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-[11px] font-bold text-blue-900">General Advice:</p>
                  <p className="mt-0.5 text-[11px] text-blue-800">{viewRx.generalAdvice}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="hc-btn-blue !py-2 text-xs flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
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
