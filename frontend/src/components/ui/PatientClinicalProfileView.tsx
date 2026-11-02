import React, { useState } from 'react';
import { IPatient, IMedicalRecord, IPrescription, IMedicalDocument } from '../../types';
import { TestAnalyticsBubbleChart } from './TestAnalyticsBubbleChart';
import { WellnessScoreGauge } from './WellnessScoreGauge';
import {
  Download,
  Video,
  MessageSquare,
  Upload,
  Plus,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle,
  FileText,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react';
import { Avatar, Modal, ModalHeader, Field, inputCls } from './primitives';

interface PatientClinicalProfileProps {
  patient: IPatient;
  records: IMedicalRecord[];
  prescriptions: IPrescription[];
  documents: IMedicalDocument[];
  onAddNote?: (note: { title: string; notes: string; bloodPressure: string; heartRate: number; temperature: number; spo2: number }) => Promise<void>;
  onUploadDoc?: (file: File, category: string, title: string) => Promise<void>;
  onClose?: () => void;
  canEditClinical?: boolean;
}

export const PatientClinicalProfileView: React.FC<PatientClinicalProfileProps> = ({
  patient,
  records,
  prescriptions,
  documents,
  onAddNote,
  onUploadDoc,
  onClose,
  canEditClinical = true,
}) => {
  const [medicalRecordTab, setMedicalRecordTab] = useState<'Lab Reports' | 'Consultation History' | 'Medications' | 'Vaccination'>('Lab Reports');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states for adding note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [bp, setBp] = useState('120/80');
  const [hr, setHr] = useState(75);
  const [temp, setTemp] = useState(98.6);
  const [spo2, setSpo2] = useState(98);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Form states for document upload
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Report');
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleExport = () => {
    const data = {
      patient,
      records,
      prescriptions,
      documentsCount: documents.length,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_summary_${patient.patientCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddNote) return;
    setSubmittingNote(true);
    try {
      await onAddNote({
        title: noteTitle,
        notes: noteContent,
        bloodPressure: bp,
        heartRate: Number(hr),
        temperature: Number(temp),
        spo2: Number(spo2),
      });
      setShowAddNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      setToastMsg('Clinical observation saved successfully.');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !onUploadDoc) return;
    setUploading(true);
    try {
      await onUploadDoc(file, docCategory, docTitle || file.name);
      setShowUploadModal(false);
      setFile(null);
      setDocTitle('');
      setToastMsg('Medical document uploaded & verified.');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Breadcrumb Header matching screenshot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-[#14532D] hover:underline mr-1"
            >
              ← Back
            </button>
          )}
          <span className="text-sm font-semibold text-slate-400">Patients</span>
          <span className="text-slate-300 font-bold">›</span>
          <span className="text-sm font-bold text-slate-800">{patient.fullName}</span>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <Download size={13} /> Export
        </button>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* 3-Column Layout from Screenshot media_1792651876163.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Patient Profile + Upcoming Appointments */}
        <div className="lg:col-span-4 space-y-5">
          {/* Patient Profile Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={patient.fullName} size="lg" className="w-14 h-14 text-sm" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{patient.fullName}</h3>
                  <p className="text-xs text-slate-400 font-medium">25 years | Female</p>
                </div>
              </div>

              {/* Video & Chat action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => alert(`Initiating secure video consultation with ${patient.fullName}`)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                  title="Video Call"
                >
                  <Video size={14} />
                </button>
                <button
                  onClick={() => alert(`Opening secure clinical message thread with ${patient.fullName}`)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                  title="Message"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>

            {/* Demographic Info Grid */}
            <div className="mt-5 grid grid-cols-2 gap-4 text-xs border-t border-slate-100 pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient ID</p>
                <p className="font-bold text-slate-800 font-mono mt-0.5">#{patient.patientCode || '128979'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Visit Date</p>
                <p className="font-bold text-slate-800 mt-0.5">12 October, 2026</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact No.</p>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.phone || '+91 6238290882'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                <p className="font-semibold text-slate-800 truncate mt-0.5">{patient.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Contact No.</p>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.emergencyContact?.phone || '+91 6238290882'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                <p className="font-semibold text-slate-700 mt-0.5 leading-snug">{patient.address || '123 Main St, New York, USA'}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments Stack */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] space-y-3">
            <h4 className="text-[13.5px] font-bold text-slate-900">Upcoming Appointments</h4>

            {/* Appointment Card 1 (Light) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <Activity size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Routine Medical Checkup</p>
                  <p className="text-[11px] text-slate-400 truncate">Dr. Amelia Bennett · Video · 10:00</p>
                </div>
              </div>
              <MoreVertical size={14} className="text-slate-400 cursor-pointer shrink-0" />
            </div>

            {/* Appointment Card 2 (Active Avocado Forest Green Card) */}
            <div className="p-3.5 rounded-2xl bg-[#14532D] text-white shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[#C7FF75] shrink-0">
                  <Activity size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Cold and Fever</p>
                  <p className="text-[11px] text-[#EAF9D8] truncate">Dr. Hannah Collins · Video · 11:00</p>
                </div>
              </div>
              <MoreVertical size={14} className="text-[#C7FF75]/80 cursor-pointer shrink-0" />
            </div>
          </div>
        </div>

        {/* Center Column: Test Analytics & Medical Records */}
        <div className="lg:col-span-5 space-y-5">
          {/* Test Analytics with Bubble/Scatter Chart */}
          <TestAnalyticsBubbleChart />

          {/* Medical Records Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Medical Records</h3>

              {canEditClinical && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#14532D] hover:text-[#0B3D20] transition-colors"
                >
                  <Upload size={13} /> Upload Report ↑
                </button>
              )}
            </div>

            {/* Tabs matching screenshot */}
            <div className="flex items-center gap-2 border-b border-[#E3E8DE] pb-2 mb-3 text-xs overflow-x-auto">
              {(['Lab Reports', 'Consultation History', 'Medications', 'Vaccination'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMedicalRecordTab(t)}
                  className={`pb-1 font-semibold whitespace-nowrap transition-colors relative ${
                    medicalRecordTab === t
                      ? 'text-[#14532D] font-bold'
                      : 'text-[#667367] hover:text-[#26352A]'
                  }`}
                >
                  {t}
                  {medicalRecordTab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14532D] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Records Content */}
            {medicalRecordTab === 'Lab Reports' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100">
                      <th className="pb-2">Test Name</th>
                      <th className="pb-2">Referred By</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Comments</th>
                      <th className="pb-2 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900">Blood Test</td>
                      <td className="py-2.5 text-slate-600">Dr. Max Reed</td>
                      <td className="py-2.5 text-slate-500">10 Oct, 2026</td>
                      <td className="py-2.5 text-slate-500">Take Rest</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900">12-Lead ECG</td>
                      <td className="py-2.5 text-slate-600">Dr. Alexander Reed</td>
                      <td className="py-2.5 text-slate-500">08 Oct, 2026</td>
                      <td className="py-2.5 text-slate-500">Telemetry OK</td>
                      <td className="py-2.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          Normal
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {medicalRecordTab === 'Medications' && (
              <div className="space-y-2 text-xs">
                {prescriptions.length === 0 ? (
                  <p className="text-slate-400 py-3">No active prescriptions on file.</p>
                ) : (
                  prescriptions.map((rx) => (
                    <div key={rx.id} className="p-3 bg-slate-50 rounded-xl">
                      <p className="font-bold text-slate-900">{rx.diagnosis} · <span className="font-medium text-slate-500">Dr. {rx.doctorName}</span></p>
                      <div className="mt-1 space-y-1">
                        {rx.medicines.map((m, i) => (
                          <p key={i} className="text-slate-600">• <b className="text-slate-800">{m.medicineName}</b> {m.dosage} ({m.frequency})</p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {medicalRecordTab === 'Consultation History' && (
              <div className="space-y-2 text-xs">
                {records.slice(0, 3).map((r) => (
                  <div key={r.id} className="p-3 bg-slate-50 rounded-xl">
                    <p className="font-bold text-slate-900">{r.title}</p>
                    <p className="text-slate-500 mt-1 line-clamp-2">{r.notes}</p>
                  </div>
                ))}
              </div>
            )}

            {medicalRecordTab === 'Vaccination' && (
              <div className="text-xs space-y-2 text-slate-600 py-2">
                <p>• COVID-19 Booster (Completed · Dec 2025)</p>
                <p>• Influenza Quadrivalent (Annual · Oct 2026)</p>
                <p>• Tetanus / Diphtheria Toxoid (Valid through 2030)</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Doctor's Note & Wellness Score */}
        <div className="lg:col-span-3 space-y-5">
          {/* Doctor's Note Card */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Doctor's Note</h3>
              {canEditClinical && (
                <button
                  onClick={() => setShowAddNoteModal(true)}
                  className="text-xs font-bold text-[#14532D] hover:text-[#0B3D20] transition-colors"
                >
                  Add New
                </button>
              )}
            </div>

            {/* Note Cards Stack from screenshot media_1792651876163.png */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {records.length > 0 ? (
                records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed hover:border-slate-200 transition-colors"
                  >
                    <p className="font-bold text-slate-900 mb-1">{rec.title}</p>
                    <p className="text-slate-600">{rec.notes}</p>
                    {rec.vitalSigns && (
                      <span className="inline-block mt-2 font-mono text-[10px] text-[#14532D] font-bold bg-[#EAF9D8] px-2 py-0.5 rounded-md">
                        BP: {rec.vitalSigns.bloodPressure} · HR: {rec.vitalSigns.heartRate} · SpO2: {rec.vitalSigns.spo2}%
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    Patient complained of skin rash localized on the forearm. No fever/systemic symptoms.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    Patient reports mild chest discomfort over the past few days, especially after physical exertion.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    Follow-up regarding Type 2 Diabetes. Fasting blood sugar reported at 98 mg/dL. Current medication appropriate.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Wellness Score Card */}
          <WellnessScoreGauge score={88} />
        </div>
      </div>

      {/* Modal: Add Doctor's Note */}
      <Modal open={showAddNoteModal} onClose={() => setShowAddNoteModal(false)}>
        <ModalHeader
          title="Add Clinical Observation"
          subtitle={`Save official clinical note for ${patient.fullName}`}
          onClose={() => setShowAddNoteModal(false)}
        />
        <form onSubmit={submitNote} className="p-6 space-y-4">
          <Field label="Note Title *">
            <input
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Follow-up consultation observation"
              className={inputCls}
            />
          </Field>
          <Field label="Clinical Notes / Findings *">
            <textarea
              required
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Detailed physical exam findings, patient complaint, advice..."
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="BP">
              <input value={bp} onChange={(e) => setBp(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Heart Rate">
              <input type="number" value={hr} onChange={(e) => setHr(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Temp (°F)">
              <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="SpO2 (%)">
              <input type="number" value={spo2} onChange={(e) => setSpo2(Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddNoteModal(false)} className="hc-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submittingNote} className="hc-btn-blue">
              {submittingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Report */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <ModalHeader
          title="Upload Medical Document"
          subtitle={`Upload verified laboratory or diagnostic report for ${patient.fullName}`}
          onClose={() => setShowUploadModal(false)}
        />
        <form onSubmit={submitUpload} className="p-6 space-y-4">
          <Field label="Document Title *">
            <input
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Fasting Lipid Profile 2026"
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className={inputCls}
            >
              <option value="Report">Laboratory Report</option>
              <option value="Scan">Radiology Scan</option>
              <option value="Prescription">Prescription</option>
              <option value="Other">Other Clinical Document</option>
            </select>
          </Field>
          <Field label="Select File (PDF, PNG, JPEG up to 10MB) *">
            <input
              type="file"
              required
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-[#26352A] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#EAF9D8] file:text-[#0B3D20] hover:file:bg-[#C7FF75] cursor-pointer"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowUploadModal(false)} className="hc-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="hc-btn-blue">
              {uploading ? 'Uploading…' : 'Upload & Verify'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
