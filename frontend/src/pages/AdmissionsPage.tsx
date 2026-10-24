import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IAdmission, IPatient, IDoctor, IWard } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, LogOut, X, AlertCircle } from 'lucide-react';
import { Card, PageHeader, SearchInput, StatusBadge, Avatar, EmptyState, Modal, ModalHeader, Tabs, Field, inputCls } from '../components/ui/primitives';

export const AdmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState<IAdmission[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [wards, setWards] = useState<IWard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const [showAdmit, setShowAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState({ patientId: '', doctorId: '', wardId: '', roomNumber: '', bedNumber: '', reason: '' });
  const [discharging, setDischarging] = useState<IAdmission | null>(null);
  const [disForm, setDisForm] = useState({ diagnosis: '', treatmentGiven: '', adviceOnDischarge: '', followUpDate: '2026-10-15' });
  const [viewSummary, setViewSummary] = useState<IAdmission | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, p, d, w] = await Promise.all([apiClient.get('/admissions'), apiClient.get('/patients'), apiClient.get('/doctors'), apiClient.get('/beds/board')]);
      setAdmissions(a.data.data.admissions);
      setPatients(p.data.data.patients);
      setDoctors(d.data.data.doctors);
      setWards(w.data.data.wards);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const wardObj = wards.find((w) => w.id === admitForm.wardId);
  const rooms = wardObj ? wardObj.rooms : [];
  const roomObj = rooms.find((r) => r.roomNumber === admitForm.roomNumber);
  const freeBeds = roomObj ? roomObj.beds.filter((b) => b.status === 'Available') : [];

  const submitAdmit = async (e: React.FormEvent) => {
    e.preventDefault(); setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/admissions', admitForm);
      setShowAdmit(false);
      setAdmitForm({ patientId: '', doctorId: '', wardId: '', roomNumber: '', bedNumber: '', reason: '' });
      fetchData();
    } catch (e: any) { setModalError(e.message || 'Failed to complete admission'); }
    finally { setSubmitting(false); }
  };

  const submitDischarge = async (e: React.FormEvent) => {
    e.preventDefault(); if (!discharging) return;
    setModalError(null); setSubmitting(true);
    try {
      await apiClient.post(`/admissions/${discharging.id}/discharge`, disForm);
      setDischarging(null);
      setDisForm({ diagnosis: '', treatmentGiven: '', adviceOnDischarge: '', followUpDate: '2026-10-15' });
      fetchData();
    } catch (e: any) { setModalError(e.message || 'Failed to discharge'); }
    finally { setSubmitting(false); }
  };

  const list = admissions.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (!q) return true;
    const v = q.toLowerCase();
    return a.patientName.toLowerCase().includes(v) || a.admissionCode.toLowerCase().includes(v) || a.wardName.toLowerCase().includes(v) || a.doctorName.toLowerCase().includes(v);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admissions & Discharge"
        subtitle={`${admissions.filter((a) => a.status === 'Admitted').length} active inpatients · atomic bed binding with auto-release on discharge`}
        icon={<UserCheck size={18} />}
        actions={user?.role === 'admin' ? <button onClick={() => setShowAdmit(true)} className="hc-btn-blue"><Plus size={15} /> Start Admission</button> : undefined}
      />

      <div className="flex flex-col sm:flex-row gap-2.5">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, code, ward, doctor…" className="flex-1" />
        <Tabs tabs={[{ id: 'all', label: 'All', count: admissions.length }, { id: 'Admitted', label: 'Admitted', count: admissions.filter((a) => a.status === 'Admitted').length }, { id: 'Discharged', label: 'Discharged', count: admissions.filter((a) => a.status === 'Discharged').length }]} active={filter} onChange={setFilter} />
      </div>

      <Card className="overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-16 !rounded-xl" />)}</div>
        : list.length === 0 ? <EmptyState icon={<UserCheck size={22} />} title="No admissions found" hint="Inpatient admissions will appear here with ward and bed assignment." />
        : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full hc-table">
                <thead><tr><th>Admission</th><th>Patient</th><th>Placement</th><th>Date</th><th>Status</th><th className="!text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td><span className="font-mono text-xs font-bold text-sky-700">{a.admissionCode}</span></td>
                      <td><div className="flex items-center gap-2.5"><Avatar name={a.patientName} size="sm" tone="bg-violet-50 text-violet-700 border-violet-200" /><div><p className="font-bold text-slate-900 text-[13px]">{a.patientName}</p><p className="text-[11px] text-slate-400 truncate max-w-[220px]">{a.reason}</p></div></div></td>
                      <td className="text-xs"><p className="font-bold text-slate-800">{a.wardName}</p><p className="text-slate-500">Rm {a.roomNumber} · Bed {a.bedNumber} · {a.doctorName}</p></td>
                      <td className="text-xs text-slate-500">{new Date(a.admissionDate).toLocaleDateString()}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="!text-right">
                        {a.status === 'Admitted' && user?.role === 'admin'
                          ? <button onClick={() => setDischarging(a)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">Discharge</button>
                          : a.dischargeSummary ? <button onClick={() => setViewSummary(a)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl">Summary</button> : <span className="text-xs text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {list.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-center gap-3"><Avatar name={a.patientName} /><div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-slate-900 truncate">{a.patientName}</p><p className="text-[11px] text-slate-500 font-mono">{a.admissionCode} · {a.wardName} Bed {a.bedNumber}</p></div><StatusBadge status={a.status} /></div>
                  <div className="flex gap-2 mt-3">
                    {a.status === 'Admitted' && user?.role === 'admin'
                      ? <button onClick={() => setDischarging(a)} className="flex-1 py-2.5 bg-rose-600 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-1.5"><LogOut size={14} /> Discharge</button>
                      : a.dischargeSummary ? <button onClick={() => setViewSummary(a)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-[13px] font-bold rounded-xl">View Summary</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} width="max-w-xl">
        <ModalHeader title="Start hospital admission" subtitle="Atomic binding of patient, bed and doctor" onClose={() => setShowAdmit(false)} />
        <form onSubmit={submitAdmit} className="p-6 space-y-4">
          {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2"><AlertCircle size={15} className="shrink-0" />{modalError}</div>}
          <Field label="Patient *"><select required value={admitForm.patientId} onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })} className={inputCls}><option value="">Choose patient…</option>{patients.filter((p) => !p.currentAdmissionId).map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>)}</select></Field>
          <Field label="Attending doctor *"><select required value={admitForm.doctorId} onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })} className={inputCls}><option value="">Choose doctor…</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} — {d.specialization}</option>)}</select></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Ward *"><select required value={admitForm.wardId} onChange={(e) => setAdmitForm({ ...admitForm, wardId: e.target.value, roomNumber: '', bedNumber: '' })} className={inputCls}><option value="">Ward…</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.availableBeds} free)</option>)}</select></Field>
            <Field label="Room *"><select required disabled={!admitForm.wardId} value={admitForm.roomNumber} onChange={(e) => setAdmitForm({ ...admitForm, roomNumber: e.target.value, bedNumber: '' })} className={inputCls}><option value="">Room…</option>{rooms.map((r) => <option key={r.roomNumber} value={r.roomNumber}>{r.roomNumber}</option>)}</select></Field>
            <Field label="Bed *"><select required disabled={!admitForm.roomNumber} value={admitForm.bedNumber} onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })} className={inputCls}><option value="">Bed…</option>{freeBeds.map((b) => <option key={b.bedNumber} value={b.bedNumber}>{b.bedNumber}</option>)}</select></Field>
          </div>
          {admitForm.wardId && freeBeds.length === 0 && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">No free beds in the selected room — choose another room or ward.</p>}
          <Field label="Reason for hospitalization *"><textarea required rows={3} value={admitForm.reason} onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })} className={inputCls} placeholder="Clinical indication, symptoms, post-operative care…" /></Field>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAdmit(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Admitting…' : 'Complete Admission'}</button></div>
        </form>
      </Modal>

      <Modal open={!!discharging} onClose={() => setDischarging(null)}>
        <ModalHeader title="Process discharge" subtitle={discharging ? `${discharging.patientName} · Bed ${discharging.bedNumber}` : ''} onClose={() => setDischarging(null)} />
        <form onSubmit={submitDischarge} className="p-6 space-y-4">
          {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">{modalError}</div>}
          <Field label="Final diagnosis *"><input required value={disForm.diagnosis} onChange={(e) => setDisForm({ ...disForm, diagnosis: e.target.value })} className={inputCls} placeholder="e.g. Stabilized acute condition" /></Field>
          <Field label="Treatment given *"><textarea required rows={2} value={disForm.treatmentGiven} onChange={(e) => setDisForm({ ...disForm, treatmentGiven: e.target.value })} className={inputCls} /></Field>
          <Field label="Advice on discharge *"><textarea required rows={2} value={disForm.adviceOnDischarge} onChange={(e) => setDisForm({ ...disForm, adviceOnDischarge: e.target.value })} className={inputCls} /></Field>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800"><b>Automatic:</b> confirming releases the bed back to available immediately.</div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setDischarging(null)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50">{submitting ? 'Discharging…' : 'Confirm & Release Bed'}</button></div>
        </form>
      </Modal>

      <Modal open={!!viewSummary} onClose={() => setViewSummary(null)}>
        <ModalHeader title="Discharge summary" subtitle={viewSummary ? `${viewSummary.patientName} · ${viewSummary.admissionCode}` : ''} onClose={() => setViewSummary(null)} />
        {viewSummary?.dischargeSummary && (
          <div className="p-6 space-y-3 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div><p className="text-[11px] font-bold uppercase text-slate-400">Diagnosis</p><p className="font-bold text-slate-900">{viewSummary.dischargeSummary.diagnosis}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-slate-400">Treatment</p><p className="text-slate-700">{viewSummary.dischargeSummary.treatmentGiven}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-slate-400">Advice</p><p className="text-slate-700">{viewSummary.dischargeSummary.adviceOnDischarge}</p></div>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex justify-between"><span>By {viewSummary.dischargeSummary.dischargedBy}</span><span>{new Date(viewSummary.dischargeSummary.dischargedAt).toLocaleDateString()}</span></div>
            </div>
            <div className="flex justify-end"><button onClick={() => setViewSummary(null)} className="hc-btn-ghost !py-2 text-xs">Close</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
};
