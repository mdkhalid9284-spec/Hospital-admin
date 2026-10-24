import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IMedicalRecord, IPatient } from '../../types';
import { FilePlus, Edit2, CheckCircle, Search, Activity, Stethoscope, HeartPulse } from 'lucide-react';
import { Avatar, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const DoctorRecordsPage: React.FC = () => {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IMedicalRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [bp, setBp] = useState('120/80');
  const [hr, setHr] = useState(75);
  const [temp, setTemp] = useState(98.6);
  const [spo2, setSpo2] = useState(98);
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/patients');
      const pats = res.data.data.patients;
      setPatients(pats);
      if (pats.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pats[0].id);
        fetchRecords(pats[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (pid: string) => {
    try {
      const res = await apiClient.get(`/records/patient/${pid}`);
      setRecords(res.data.data.records);
    } catch (e) {
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handlePatientSelect = (pid: string) => {
    setSelectedPatientId(pid);
    fetchRecords(pid);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !title.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/records/clinical-note', {
        patientId: selectedPatientId,
        title,
        notes,
        vitalSigns: {
          bloodPressure: bp,
          heartRate: Number(hr),
          temperature: Number(temp),
          spo2: Number(spo2),
        },
      });
      setShowAddModal(false);
      setTitle('');
      setNotes('');
      setToastMsg('Clinical note saved and appended to patient record.');
      fetchRecords(selectedPatientId);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/records/${editingRecord.id}`, {
        title: editingRecord.title,
        notes: editingRecord.notes,
        vitalSigns: editingRecord.vitalSigns,
      });
      setEditingRecord(null);
      setToastMsg('Clinical note updated successfully.');
      fetchRecords(selectedPatientId);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update note');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Clinical Notes & Observations
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Working clinical-note editor with save/update capabilities and vital signs
          </p>
        </div>

        {selectedPatient && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <FilePlus size={14} /> New Clinical Note
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Main 2-column layout: Patient Selector & Clinical Notes History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Patient Selection Card */}
        <div className="lg:col-span-4 bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Assigned Patients ({patients.length})
          </p>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePatientSelect(p.id)}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  selectedPatientId === p.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <Avatar name={p.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate">{p.fullName}</p>
                  <p className={`text-[11px] font-mono ${selectedPatientId === p.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {p.patientCode} · {p.gender}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Notes Stream */}
        <div className="lg:col-span-8 bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Medical Notes for {selectedPatient?.fullName || 'Patient'}
              </h3>
              <p className="text-xs text-slate-400">Chronological clinical documentation</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {records.length} records
            </span>
          </div>

          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No clinical notes recorded yet for this patient. Click "New Clinical Note" above to write an observation.
              </div>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[13.5px] font-bold text-slate-900">{r.title}</h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Authored by Dr. {r.doctorName} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setEditingRecord(r)}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-full text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Edit2 size={12} /> Edit Note
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {r.notes}
                  </p>

                  {r.vitalSigns && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60 text-[11px] font-mono">
                      <span className="px-2 py-0.5 bg-white border rounded-md text-blue-700 font-bold">
                        BP: {r.vitalSigns.bloodPressure || '—'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border rounded-md text-emerald-700 font-bold">
                        HR: {r.vitalSigns.heartRate || '—'} bpm
                      </span>
                      <span className="px-2 py-0.5 bg-white border rounded-md text-amber-700 font-bold">
                        Temp: {r.vitalSigns.temperature || '—'} °F
                      </span>
                      <span className="px-2 py-0.5 bg-white border rounded-md text-purple-700 font-bold">
                        SpO2: {r.vitalSigns.spo2 || '—'}%
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: New Clinical Note */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <ModalHeader
          title="Compose Clinical Observation"
          subtitle={`Official clinical note for ${selectedPatient?.fullName}`}
          onClose={() => setShowAddModal(false)}
        />
        <form onSubmit={handleCreateNote} className="p-6 space-y-4">
          <Field label="Note Title *">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ward Consultation & Cardiac Auscultation"
              className={inputCls}
            />
          </Field>
          <Field label="Clinical Findings & Treatment Plan *">
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document physical exam, chest sounds, patient complaints, follow-up..."
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="Blood Pressure">
              <input value={bp} onChange={(e) => setBp(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Heart Rate">
              <input type="number" value={hr} onChange={(e) => setHr(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Temperature (°F)">
              <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="SpO2 (%)">
              <input type="number" value={spo2} onChange={(e) => setSpo2(Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="hc-btn-blue">
              {submitting ? 'Saving…' : 'Save Clinical Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Clinical Note */}
      {editingRecord && (
        <Modal open={true} onClose={() => setEditingRecord(null)}>
          <ModalHeader
            title="Update Clinical Observation"
            subtitle="Working editor with server-persisted updates"
            onClose={() => setEditingRecord(null)}
          />
          <form onSubmit={handleUpdateNote} className="p-6 space-y-4">
            <Field label="Note Title *">
              <input
                required
                value={editingRecord.title}
                onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Clinical Findings & Notes *">
              <textarea
                required
                rows={4}
                value={editingRecord.notes}
                onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Blood Pressure">
                <input
                  value={editingRecord.vitalSigns?.bloodPressure || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      vitalSigns: { ...editingRecord.vitalSigns, bloodPressure: e.target.value },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Heart Rate">
                <input
                  type="number"
                  value={editingRecord.vitalSigns?.heartRate || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      vitalSigns: { ...editingRecord.vitalSigns, heartRate: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Temp (°F)">
                <input
                  type="number"
                  step="0.1"
                  value={editingRecord.vitalSigns?.temperature || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      vitalSigns: { ...editingRecord.vitalSigns, temperature: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="SpO2 (%)">
                <input
                  type="number"
                  value={editingRecord.vitalSigns?.spo2 || ''}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      vitalSigns: { ...editingRecord.vitalSigns, spo2: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="hc-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="hc-btn-blue">
                {submitting ? 'Updating…' : 'Update Clinical Note'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
