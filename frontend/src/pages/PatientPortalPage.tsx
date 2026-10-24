import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IPatient, IMedicalRecord, IPrescription, IBill, IMedicalDocument } from '../types';
import { HeartPulse, Pill, FileText, Receipt, FolderOpen, CalendarDays, Upload, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Avatar, EmptyState, StatusBadge, Badge, Tabs } from '../components/ui/primitives';

export const PatientPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [rx, setRx] = useState<IPrescription[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [docs, setDocs] = useState<IMedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.patientId) return;
      try {
        setLoading(true);
        const [p, r, x, b, d] = await Promise.all([
          apiClient.get(`/patients/${user.patientId}`),
          apiClient.get(`/records/patient/${user.patientId}`),
          apiClient.get(`/prescriptions/patient/${user.patientId}`),
          apiClient.get(`/bills/patient/${user.patientId}`).catch(() => ({ data: { data: { bills: [] } } })),
          apiClient.get(`/documents/patient/${user.patientId}`),
        ]);
        if (!alive) return;
        setPatient(p.data.data.patient);
        setRecords(r.data.data.records);
        setRx(x.data.data.prescriptions);
        setBills(b.data.data.bills || []);
        setDocs(d.data.data.documents);
      } catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user]);

  if (loading) return <div className="space-y-4"><div className="skeleton h-32 !rounded-2xl" /><div className="grid sm:grid-cols-2 gap-4"><div className="skeleton h-64 !rounded-2xl" /><div className="skeleton h-64 !rounded-2xl" /></div></div>;

  const due = bills.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="space-y-5">
      {patient && (
        <Card className="p-5 sm:p-6 !bg-slate-900 !border-slate-900 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-500/25 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar name={patient.fullName} size="lg" className="!bg-sky-500 !text-white !border-sky-400" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><h1 className="text-lg font-bold truncate">{patient.fullName}</h1><span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-sky-200">{patient.patientCode}</span></div>
                <p className="text-xs text-slate-300 mt-1">DOB {patient.dob} · {patient.gender} · Blood {patient.bloodGroup || '—'} · {patient.phone}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Badge tone="slate" className="!bg-white/10 !text-slate-200 !border-white/15">{rx.length} prescriptions</Badge>
                  <Badge tone="slate" className="!bg-white/10 !text-slate-200 !border-white/15">{records.length} clinical notes</Badge>
                  {due > 0 && <Badge tone="amber">Due ${due.toFixed(2)}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/documents" className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-[13px] font-semibold flex items-center gap-1.5"><Upload size={14} /> Upload Records</Link>
              <Link to="/appointments" className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-[13px] font-bold flex items-center gap-1.5"><CalendarDays size={14} /> Book Visit</Link>
            </div>
          </div>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'rx', label: 'Medicines', count: rx.length },
          { id: 'records', label: 'History', count: records.length },
          { id: 'bills', label: 'Bills', count: bills.length },
          { id: 'docs', label: 'Files', count: docs.length },
        ]}
        active={tab} onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-bold text-[14px] flex items-center gap-2 mb-3"><Pill size={16} className="text-sky-600" /> Current Medicines</h3>
            {rx.length === 0 ? <p className="text-xs text-slate-400">No active prescriptions.</p> : rx.slice(0, 2).map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 mb-2 last:mb-0">
                <p className="text-[13px] font-bold text-slate-900">{r.diagnosis} <span className="font-normal text-slate-500">· Dr. {r.doctorName}</span></p>
                {r.medicines.slice(0, 3).map((m, i) => <p key={i} className="text-xs text-slate-600 mt-1">• <b className="text-slate-900">{m.medicineName}</b> {m.dosage} — {m.frequency} ({m.duration})</p>)}
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-[14px] flex items-center gap-2 mb-3"><Receipt size={16} className="text-sky-600" /> Billing Snapshot</h3>
            {bills.length === 0 ? <p className="text-xs text-slate-400">No invoices.</p> : (
              <>
                <p className="text-3xl font-bold text-slate-900">${due.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mb-3">outstanding across {bills.length} invoice(s)</p>
                {bills.slice(0, 3).map((b) => <div key={b.id} className="flex items-center justify-between py-2 border-t border-slate-100 text-[13px]"><span className="font-mono font-bold">{b.billCode}</span><StatusBadge status={b.status} /></div>)}
                <Link to="/billing" className="text-xs font-bold text-sky-600 hover:underline mt-2 inline-block">Open billing →</Link>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'rx' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rx.length === 0 && <Card className="lg:col-span-2"><EmptyState icon={<Pill size={20} />} title="No prescriptions" hint="Your doctor's digital prescriptions will show here with dosage and timing." /></Card>}
          {rx.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-sky-700">{r.prescriptionCode}</span><span className="text-[11px] text-slate-400">{new Date(r.prescribedAt).toLocaleDateString()}</span></div>
              <p className="font-bold text-slate-900 mt-1 text-[14px]">{r.diagnosis}</p>
              <p className="text-xs text-slate-500">Prescribed by Dr. {r.doctorName}</p>
              <div className="mt-3 bg-slate-50 rounded-2xl border divide-y divide-slate-100">
                {r.medicines.map((m, i) => <div key={i} className="px-4 py-2.5 text-[13px]"><p className="font-bold text-slate-900">{m.medicineName} <span className="font-normal text-slate-500">· {m.dosage}</span></p><p className="text-xs text-slate-500">{m.frequency} · {m.duration}{m.instructions ? ` · ${m.instructions}` : ''}</p></div>)}
              </div>
              {r.generalAdvice && <p className="text-xs text-slate-500 italic mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{r.generalAdvice}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'records' && (
        <div className="space-y-2.5">
          {records.length === 0 && <Card><EmptyState icon={<FileText size={20} />} title="No clinical history yet" hint="Visit notes from your care team will appear here." /></Card>}
          {records.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between gap-2"><p className="font-bold text-[14px] text-slate-900">{r.title}</p><span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span></div>
              <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{r.notes}</p>
              {r.vitalSigns && <div className="flex flex-wrap gap-1.5 mt-2.5"><Badge>BP {r.vitalSigns.bloodPressure || '—'}</Badge><Badge>Pulse {r.vitalSigns.heartRate ?? '—'}</Badge><Badge>SpO₂ {r.vitalSigns.spo2 ?? '—'}%</Badge></div>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'bills' && (
        <div className="space-y-2.5">
          {bills.length === 0 && <Card><EmptyState icon={<Receipt size={20} />} title="No invoices" hint="Hospital bills will appear here when generated." /></Card>}
          {bills.map((b) => (
            <Card key={b.id} className="p-4 flex items-center justify-between gap-3">
              <div><p className="font-mono text-[13px] font-bold">{b.billCode}</p><p className="text-xs text-slate-500">Total ${b.total.toFixed(2)} · Paid ${b.amountPaid.toFixed(2)} · <b className="text-rose-600">Due ${b.balance.toFixed(2)}</b></p></div>
              <StatusBadge status={b.status} />
            </Card>
          ))}
        </div>
      )}

      {tab === 'docs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.length === 0 && <Card className="sm:col-span-2"><EmptyState icon={<FolderOpen size={20} />} title="No files yet" hint="Upload external reports or scans from the Documents page." /></Card>}
          {docs.map((d) => (
            <Card key={d.id} hover className="p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><FileText size={18} /></span>
              <span className="flex-1 min-w-0"><span className="block font-bold text-[13px] truncate">{d.title}</span><span className="block text-[11px] text-slate-500">{d.category} · {(d.fileSizeBytes / 1024).toFixed(0)} KB</span></span>
              <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="hc-icon-btn !w-9 !h-9 shrink-0"><Download size={15} /></a>
            </Card>
          ))}
        </div>
      )}

      <div className="hidden">{JSON.stringify(patient?.id)}<HeartPulse size={0} /></div>
    </div>
  );
};
