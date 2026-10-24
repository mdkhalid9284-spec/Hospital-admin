import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IPatient, IMedicalRecord, IPrescription, IPrescriptionMedicine } from '../types';
import { Stethoscope, FilePlus, Pill, HeartPulse, Plus, Trash2 } from 'lucide-react';
import { Card, PageHeader, SearchInput, Avatar, EmptyState, Badge, Modal, ModalHeader, Field, inputCls } from '../components/ui/primitives';
import { cn } from '../components/ui/primitives';

export const DoctorPortalPage: React.FC = () => {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<IPatient | null>(null);
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [rx, setRx] = useState<IPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState({ title: '', notes: '', bloodPressure: '120/80', heartRate: 75, temperature: 98.6, spo2: 98 });
  const [showRx, setShowRx] = useState(false);
  const [rxForm, setRxForm] = useState({ diagnosis: '', generalAdvice: '', medicines: [{ medicineName: '', dosage: '500mg', frequency: 'Twice daily after food', duration: '5 days', instructions: 'Take with plenty of water' }] as IPrescriptionMedicine[] });
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/patients');
      setPatients(res.data.data.patients);
      if (res.data.data.patients.length && !selected) setSelected(res.data.data.patients[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchClinical = async (pid: string) => {
    try {
      const [r, p] = await Promise.all([apiClient.get(`/records/patient/${pid}`), apiClient.get(`/prescriptions/patient/${pid}`)]);
      setRecords(r.data.data.records);
      setRx(p.data.data.prescriptions);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchPatients(); }, []);
  useEffect(() => { if (selected) fetchClinical(selected.id); }, [selected]);

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/records/clinical-note', {
        patientId: selected.id, title: note.title, notes: note.notes,
        vitalSigns: { bloodPressure: note.bloodPressure, heartRate: Number(note.heartRate), temperature: Number(note.temperature), spo2: Number(note.spo2) },
      });
      setShowNote(false);
      setNote({ title: '', notes: '', bloodPressure: '120/80', heartRate: 75, temperature: 98.6, spo2: 98 });
      fetchClinical(selected.id);
    } catch (e: any) { setModalError(e.message || 'Failed to save note'); }
    finally { setSubmitting(false); }
  };

  const submitRx = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/prescriptions', { patientId: selected.id, diagnosis: rxForm.diagnosis, medicines: rxForm.medicines, generalAdvice: rxForm.generalAdvice });
      setShowRx(false);
      setRxForm({ diagnosis: '', generalAdvice: '', medicines: [{ medicineName: '', dosage: '500mg', frequency: 'Twice daily after food', duration: '5 days', instructions: 'Take with plenty of water' }] });
      fetchClinical(selected.id);
    } catch (e: any) { setModalError(e.message || 'Failed to prescribe'); }
    finally { setSubmitting(false); }
  };

  const list = patients.filter((p) => !q || p.fullName.toLowerCase().includes(q.toLowerCase()) || p.patientCode.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinical Console"
        subtitle="Assigned patients, observations with vitals, and multi-drug prescriptions"
        icon={<Stethoscope size={18} />}
        actions={selected ? <><button onClick={() => setShowNote(true)} className="hc-btn-dark !py-2.5 text-[13px]"><FilePlus size={15} className="text-sky-400" /> Clinical Note</button><button onClick={() => setShowRx(true)} className="hc-btn-blue !py-2.5 text-[13px]"><Pill size={15} /> Prescribe</button></> : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <Card className="lg:col-span-4 p-3.5 lg:sticky lg:top-20">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assigned patients…" className="!border-0 !shadow-none !bg-slate-100/70" />
          <p className="px-2 mt-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned · {list.length}</p>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5">
            {loading ? [0,1,2].map((i) => <div key={i} className="skeleton h-16 !rounded-xl" />)
            : list.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No patients assigned.</p>
            : list.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className={cn('w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3', selected?.id === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 hover:border-slate-300')}>
                <Avatar name={p.fullName} size="sm" tone={selected?.id === p.id ? '!bg-sky-500 !text-white !border-sky-400' : undefined} />
                <span className="flex-1 min-w-0"><span className={cn('block font-bold text-[13.5px] truncate', selected?.id === p.id ? 'text-white' : 'text-slate-900')}>{p.fullName}</span><span className={cn('block text-[11px] font-mono truncate', selected?.id === p.id ? 'text-slate-300' : 'text-slate-400')}>{p.patientCode} · {p.gender}</span></span>
                {p.currentAdmissionId && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Admitted" />}
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-8 space-y-4 min-w-0">
          {!selected ? <Card><EmptyState icon={<Stethoscope size={22} />} title="Select a patient" hint="Choose someone from the list to review history and document care." /></Card> : (
            <>
              <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between !bg-slate-900 !border-slate-900 text-white">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={selected.fullName} size="lg" className="!bg-sky-500 !text-white !border-sky-400" />
                  <div className="min-w-0"><h2 className="text-[17px] font-bold truncate">{selected.fullName}</h2><p className="text-xs text-slate-300 font-mono truncate">{selected.patientCode} · DOB {selected.dob} · {selected.bloodGroup || '—'}</p></div>
                </div>
                {selected.currentAdmissionId ? <Badge tone="emerald">Active inpatient</Badge> : <Badge tone="slate" className="!bg-white/10 !text-slate-200 !border-white/15">Outpatient</Badge>}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold text-[14px] text-slate-900 flex items-center gap-2 mb-3"><Pill size={16} className="text-sky-600" /> Prescriptions <Badge>{rx.length}</Badge></h3>
                {rx.length === 0 ? <p className="text-xs text-slate-400 py-2">No prescriptions yet — issue the first one above.</p> : (
                  <div className="space-y-2.5">
                    {rx.map((r) => (
                      <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[13px]">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono font-bold text-sky-700 text-xs">{r.prescriptionCode}</span><span className="text-[11px] text-slate-400">{new Date(r.prescribedAt).toLocaleDateString()}</span></div>
                        <p className="font-bold text-slate-900 mt-1">{r.diagnosis}</p>
                        <div className="mt-2 bg-white rounded-xl border divide-y divide-slate-100">
                          {r.medicines.map((m, i) => <div key={i} className="px-3 py-2 flex flex-col sm:flex-row sm:justify-between gap-0.5 text-xs"><span className="font-bold text-slate-900">{m.medicineName} ({m.dosage})</span><span className="text-slate-500">{m.frequency} · {m.duration}</span></div>)}
                        </div>
                        {r.generalAdvice && <p className="text-[11.5px] text-slate-500 italic mt-2">{r.generalAdvice}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="font-bold text-[14px] text-slate-900 flex items-center gap-2 mb-3"><HeartPulse size={16} className="text-sky-600" /> Clinical Notes <Badge>{records.length}</Badge></h3>
                <div className="relative space-y-0">
                  {records.length === 0 && <p className="text-xs text-slate-400 py-2">No notes yet — record the first observation above.</p>}
                  {records.map((rec, i) => (
                    <div key={rec.id} className="relative pl-7 pb-5 last:pb-0">
                      {i !== records.length - 1 && <span className="absolute left-[9px] top-6 bottom-0 w-px bg-slate-200" />}
                      <span className="absolute left-1 top-1.5 w-4 h-4 rounded-full bg-sky-600 ring-4 ring-sky-100" />
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between gap-2"><p className="font-bold text-[13.5px] text-slate-900">{rec.title}</p><span className="text-[11px] text-slate-400 shrink-0">{new Date(rec.createdAt).toLocaleDateString()}</span></div>
                        <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{rec.notes}</p>
                        {rec.vitalSigns && <div className="flex flex-wrap gap-1.5 mt-2.5"><Badge>BP {rec.vitalSigns.bloodPressure || '—'}</Badge><Badge>{rec.vitalSigns.heartRate ?? '—'} bpm</Badge><Badge>{rec.vitalSigns.temperature ?? '—'}°F</Badge><Badge>SpO₂ {rec.vitalSigns.spo2 ?? '—'}%</Badge></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal open={showNote} onClose={() => setShowNote(false)}>
        <ModalHeader title="Record clinical note" subtitle={selected ? `${selected.fullName} (${selected.patientCode})` : ''} onClose={() => setShowNote(false)} />
        <form onSubmit={submitNote} className="p-6 space-y-3.5">
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          <Field label="Title *"><input required value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} className={inputCls} placeholder="e.g. Ward round review" /></Field>
          <Field label="Observations *"><textarea required rows={3} value={note.notes} onChange={(e) => setNote({ ...note, notes: e.target.value })} className={inputCls} placeholder="Findings, symptoms, plan…" /></Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <Field label="BP"><input value={note.bloodPressure} onChange={(e) => setNote({ ...note, bloodPressure: e.target.value })} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" /></Field>
            <Field label="Pulse"><input type="number" value={note.heartRate} onChange={(e) => setNote({ ...note, heartRate: Number(e.target.value) })} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" /></Field>
            <Field label="Temp °F"><input type="number" step="0.1" value={note.temperature} onChange={(e) => setNote({ ...note, temperature: Number(e.target.value) })} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" /></Field>
            <Field label="SpO₂ %"><input type="number" value={note.spo2} onChange={(e) => setNote({ ...note, spo2: Number(e.target.value) })} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" /></Field>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowNote(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Saving…' : 'Save Note'}</button></div>
        </form>
      </Modal>

      <Modal open={showRx} onClose={() => setShowRx(false)} width="max-w-xl">
        <ModalHeader title="Write prescription" subtitle={selected ? `${selected.fullName} (${selected.patientCode})` : ''} onClose={() => setShowRx(false)} />
        <form onSubmit={submitRx} className="p-6 space-y-4">
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          <Field label="Diagnosis *"><input required value={rxForm.diagnosis} onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })} className={inputCls} placeholder="e.g. Essential hypertension" /></Field>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between"><span className="hc-label !mb-0">Medicines</span><button type="button" onClick={() => setRxForm({ ...rxForm, medicines: [...rxForm.medicines, { medicineName: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: 'As directed' }] })} className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"><Plus size={13} /> Add medicine</button></div>
            {rxForm.medicines.map((m, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex gap-2">
                  <input required value={m.medicineName} onChange={(e) => { const u = [...rxForm.medicines]; u[idx].medicineName = e.target.value; setRxForm({ ...rxForm, medicines: u }); }} placeholder="Medicine name" className="flex-1 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                  <input required value={m.dosage} onChange={(e) => { const u = [...rxForm.medicines]; u[idx].dosage = e.target.value; setRxForm({ ...rxForm, medicines: u }); }} placeholder="500mg" className="w-24 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                  {rxForm.medicines.length > 1 && <button type="button" onClick={() => setRxForm({ ...rxForm, medicines: rxForm.medicines.filter((_, i) => i !== idx) })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={15} /></button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input required value={m.frequency} onChange={(e) => { const u = [...rxForm.medicines]; u[idx].frequency = e.target.value; setRxForm({ ...rxForm, medicines: u }); }} placeholder="Frequency" className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                  <input required value={m.duration} onChange={(e) => { const u = [...rxForm.medicines]; u[idx].duration = e.target.value; setRxForm({ ...rxForm, medicines: u }); }} placeholder="Duration" className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                  <input value={m.instructions} onChange={(e) => { const u = [...rxForm.medicines]; u[idx].instructions = e.target.value; setRxForm({ ...rxForm, medicines: u }); }} placeholder="Instructions" className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                </div>
              </div>
            ))}
          </div>
          <Field label="General advice"><textarea rows={2} value={rxForm.generalAdvice} onChange={(e) => setRxForm({ ...rxForm, generalAdvice: e.target.value })} className={inputCls} placeholder=" Fluids, rest, follow-up…" /></Field>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowRx(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Issuing…' : 'Issue Prescription'}</button></div>
        </form>
      </Modal>
    </div>
  );
};
