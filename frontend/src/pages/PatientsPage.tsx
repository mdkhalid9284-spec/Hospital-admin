import React, { useState, useEffect, useContext } from 'react';
import { apiClient } from '../api/client';
import { IPatient, IMedicalRecord, IPrescription, IBill, IMedicalDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, X, AlertCircle, Phone, Mail, MapPin, Droplet, CalendarDays, FileText, Pill, Receipt, FolderOpen } from 'lucide-react';
import { Card, PageHeader, SearchInput, StatusBadge, Avatar, EmptyState, Badge, Modal, ModalHeader, Tabs, Field, inputCls } from '../components/ui/primitives';
import { GlobalSearchContext } from '../App';

function age(dob?: string) {
  if (!dob) return '—';
  const d = new Date(dob); if (isNaN(d.getTime())) return '—';
  return `${new Date().getFullYear() - d.getFullYear()} yrs`;
}

const PatientProfile: React.FC<{ patient: IPatient; onClose: () => void }> = ({ patient, onClose }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [rx, setRx] = useState<IPrescription[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [docs, setDocs] = useState<IMedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const canSeeClinical = user?.role === 'admin' || user?.role === 'doctor';
  const canSeeFinance = user?.role !== 'doctor' || true;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const reqs: Promise<any>[] = [];
        if (canSeeClinical) {
          reqs.push(apiClient.get(`/records/patient/${patient.id}`).then((r) => setRecords(r.data.data.records)).catch(() => {}));
          reqs.push(apiClient.get(`/prescriptions/patient/${patient.id}`).then((r) => setRx(r.data.data.prescriptions)).catch(() => {}));
        }
        if (user?.role !== 'doctor') {
          reqs.push(apiClient.get(`/bills/patient/${patient.id}`).then((r) => setBills(r.data.data.bills)).catch(() => setBills([])));
        }
        reqs.push(apiClient.get(`/documents/patient/${patient.id}`).then((r) => setDocs(r.data.data.documents)).catch(() => {}));
        await Promise.all(reqs);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(canSeeClinical ? [{ id: 'records', label: 'Records', count: records.length }, { id: 'rx', label: 'Prescriptions', count: rx.length }] : []),
    ...(user?.role !== 'doctor' ? [{ id: 'bills', label: 'Bills', count: bills.length }] : []),
    { id: 'docs', label: 'Documents', count: docs.length },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[560px] bg-[#f8fafc] shadow-2xl overflow-y-auto anim-drawer">
        {/* Identity header */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#EAF9D8]0/25 rounded-full blur-3xl" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X size={15} /></button>
          <div className="relative flex items-center gap-4">
            <Avatar name={patient.fullName} size="lg" className="!bg-[#EAF9D8]0 !text-white !border-sky-400" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{patient.fullName}</h2>
              <p className="text-xs text-slate-300 font-mono">{patient.patientCode} · {patient.gender} · {age(patient.dob)}</p>
              <div className="flex gap-1.5 mt-2">
                {patient.currentAdmissionId ? <Badge tone="emerald">Admitted inpatient</Badge> : <Badge tone="slate" className="!bg-white/10 !text-slate-200 !border-white/15">Outpatient</Badge>}
                {patient.bloodGroup && <Badge tone="rose">{patient.bloodGroup}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          {loading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="skeleton h-20 !rounded-2xl" />)}</div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-3">
                  <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex gap-2.5"><Phone size={15} className="text-[#14532D] mt-0.5 shrink-0" /><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone</p><p className="font-semibold text-slate-900">{patient.phone}</p></div></div>
                    <div className="flex gap-2.5"><Mail size={15} className="text-[#14532D] mt-0.5 shrink-0" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p><p className="font-semibold text-slate-900 truncate">{patient.email}</p></div></div>
                    <div className="flex gap-2.5"><CalendarDays size={15} className="text-[#14532D] mt-0.5 shrink-0" /><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date of birth</p><p className="font-semibold text-slate-900">{patient.dob || '—'}</p></div></div>
                    <div className="flex gap-2.5"><Droplet size={15} className="text-[#14532D] mt-0.5 shrink-0" /><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blood group</p><p className="font-semibold text-slate-900">{patient.bloodGroup || '—'}</p></div></div>
                    <div className="sm:col-span-2 flex gap-2.5"><MapPin size={15} className="text-[#14532D] mt-0.5 shrink-0" /><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Address</p><p className="font-semibold text-slate-900">{patient.address || '—'}</p></div></div>
                  </Card>
                  {patient.emergencyContact && (
                    <Card className="p-5 !border-rose-200 !bg-rose-50/50">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Emergency contact</p>
                      <p className="font-bold text-slate-900 mt-1">{patient.emergencyContact.name} <span className="font-normal text-slate-500">({patient.emergencyContact.relationship})</span></p>
                      <p className="text-sm text-slate-700">{patient.emergencyContact.phone}</p>
                    </Card>
                  )}
                </div>
              )}
              {tab === 'records' && (
                <div className="space-y-2.5">
                  {records.length === 0 && <Card><EmptyState icon={<FileText size={20} />} title="No clinical records" hint="Notes written by doctors will appear here." /></Card>}
                  {records.map((r) => (
                    <Card key={r.id} className="p-4">
                      <div className="flex items-center justify-between gap-2"><p className="font-bold text-[13.5px] text-slate-900">{r.title}</p><span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                      <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{r.notes}</p>
                      {r.vitalSigns && <div className="flex flex-wrap gap-1.5 mt-2">{r.vitalSigns.bloodPressure && <Badge>BP {r.vitalSigns.bloodPressure}</Badge>}{r.vitalSigns.heartRate ? <Badge>{r.vitalSigns.heartRate} bpm</Badge> : null}{r.vitalSigns.temperature ? <Badge>{r.vitalSigns.temperature}°F</Badge> : null}{r.vitalSigns.spo2 ? <Badge>SpO₂ {r.vitalSigns.spo2}%</Badge> : null}</div>}
                      <p className="text-[11px] text-slate-400 mt-2">By {r.doctorName}</p>
                    </Card>
                  ))}
                </div>
              )}
              {tab === 'rx' && (
                <div className="space-y-2.5">
                  {rx.length === 0 && <Card><EmptyState icon={<Pill size={20} />} title="No prescriptions" hint="Digital prescriptions will appear here." /></Card>}
                  {rx.map((p) => (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-[#0B3D20]">{p.prescriptionCode}</span><span className="text-[11px] text-slate-400">{new Date(p.prescribedAt).toLocaleDateString()}</span></div>
                      <p className="text-[13px] font-semibold text-slate-900 mt-1">{p.diagnosis}</p>
                      <div className="mt-2 bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                        {p.medicines.map((m, i) => <div key={i} className="px-3 py-2 flex justify-between text-xs"><span className="font-bold text-slate-900">{m.medicineName} ({m.dosage})</span><span className="text-slate-500">{m.frequency} · {m.duration}</span></div>)}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {tab === 'bills' && (
                <div className="space-y-2.5">
                  {bills.length === 0 && <Card><EmptyState icon={<Receipt size={20} />} title="No invoices" hint="Billing invoices for this patient will appear here." /></Card>}
                  {bills.map((b) => (
                    <Card key={b.id} className="p-4 flex items-center justify-between gap-3">
                      <div><p className="font-mono text-xs font-bold text-slate-900">{b.billCode}</p><p className="text-xs text-slate-500">Total ${b.total.toFixed(2)} · Due ${b.balance.toFixed(2)}</p></div>
                      <StatusBadge status={b.status} />
                    </Card>
                  ))}
                </div>
              )}
              {tab === 'docs' && (
                <div className="space-y-2.5">
                  {docs.length === 0 && <Card><EmptyState icon={<FolderOpen size={20} />} title="No documents" hint="Scans and reports will appear here." /></Card>}
                  {docs.map((d) => (
                    <Card key={d.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0"><p className="font-bold text-[13px] text-slate-900 truncate">{d.title}</p><p className="text-[11px] text-slate-500">{d.category} · {d.originalFilename}</p></div>
                      <Badge>{d.category}</Badge>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
  void canSeeFinance;
};

export const PatientsPage: React.FC = () => {
  const { user } = useAuth();
  const { query } = useContext(GlobalSearchContext);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IPatient | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'admitted' | 'outpatient'>('all');
  const [form, setForm] = useState({ fullName: '', dob: '1990-01-01', gender: 'male' as 'male'|'female'|'other', bloodGroup: 'O+', phone: '', email: '', address: '', emergencyName: '', emergencyRelationship: 'Spouse', emergencyPhone: '' });

  const effectiveSearch = search || query;

  const fetchPatients = async (s: string) => {
    try {
      setLoading(true); setError(null);
      const res = await apiClient.get(`/patients?search=${encodeURIComponent(s)}`);
      setPatients(res.data.data.patients);
    } catch (e: any) { setError(e.message || 'Failed to load patients'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(effectiveSearch), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setSubmitting(true);
    try {
      await apiClient.post('/patients', {
        fullName: form.fullName, dob: form.dob, gender: form.gender, bloodGroup: form.bloodGroup,
        phone: form.phone, email: form.email, address: form.address,
        emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone },
      });
      setShowRegister(false);
      setForm({ fullName: '', dob: '1990-01-01', gender: 'male', bloodGroup: 'O+', phone: '', email: '', address: '', emergencyName: '', emergencyRelationship: 'Spouse', emergencyPhone: '' });
      fetchPatients(effectiveSearch);
    } catch (e: any) { setFormError(e.message || 'Failed to register patient'); }
    finally { setSubmitting(false); }
  };

  const filtered = patients.filter((p) => {
    if (filter === 'admitted') return !!p.currentAdmissionId;
    if (filter === 'outpatient') return !p.currentAdmissionId;
    return true;
  });
  const admittedCount = patients.filter((p) => p.currentAdmissionId).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient Directory"
        subtitle={`${patients.length} registered profiles · ${admittedCount} currently admitted`}
        icon={<Users size={18} />}
        actions={user?.role === 'admin' ? <button onClick={() => setShowRegister(true)} className="hc-btn-blue"><UserPlus size={16} /> Register Patient</button> : undefined}
      />
      <div className="flex flex-col sm:flex-row gap-2.5">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code (PAT-1001), phone, email…" className="flex-1" />
        <Tabs tabs={[{ id: 'all', label: 'All', count: patients.length }, { id: 'admitted', label: 'Admitted', count: admittedCount }, { id: 'outpatient', label: 'Outpatient', count: patients.length - admittedCount }]} active={filter} onChange={(id) => setFilter(id as any)} />
      </div>

      {error && <Card className="p-4 border-rose-200 text-sm text-rose-700">{error} <button className="font-bold underline ml-2" onClick={() => fetchPatients(effectiveSearch)}>Retry</button></Card>}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[0,1,2,3,4].map((i) => <div key={i} className="skeleton h-14 !rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="No patients found" hint="Try a different search, or register a new patient profile." action={user?.role === 'admin' ? <button onClick={() => setShowRegister(true)} className="hc-btn-dark !py-2 text-xs">Register patient</button> : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full hc-table">
                <thead><tr><th>Patient</th><th>Age / Gender</th><th>Contact</th><th>Status</th><th className="!text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                      <td><div className="flex items-center gap-3"><Avatar name={p.fullName} size="sm" /><div><p className="font-bold text-slate-900 text-[13.5px]">{p.fullName}</p><p className="font-mono text-[11px] text-[#14532D] font-semibold">{p.patientCode}</p></div></div></td>
                      <td className="text-slate-600 capitalize text-[13px]">{age(p.dob)} · {p.gender}</td>
                      <td className="text-xs"><p className="text-slate-800 font-medium">{p.phone}</p><p className="text-slate-400 truncate max-w-[200px]">{p.email}</p></td>
                      <td>{p.currentAdmissionId ? <StatusBadge status="Admitted" /> : <Badge>Outpatient</Badge>}</td>
                      <td className="!text-right"><button onClick={(e) => { e.stopPropagation(); setSelected(p); }} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all">View Profile</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left p-4 flex items-center gap-3 active:bg-slate-50">
                  <Avatar name={p.fullName} />
                  <span className="flex-1 min-w-0"><span className="block font-bold text-slate-900 text-[14px] truncate">{p.fullName}</span><span className="block text-[11px] text-slate-500 font-mono">{p.patientCode} · {age(p.dob)}</span></span>
                  {p.currentAdmissionId ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> : <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {selected && <PatientProfile patient={selected} onClose={() => setSelected(null)} />}

      <Modal open={showRegister} onClose={() => setShowRegister(false)} width="max-w-xl">
        <ModalHeader title="Register new patient" subtitle="Mandatory demographic and contact fields" onClose={() => setShowRegister(false)} />
        <form onSubmit={submit} className="p-6 space-y-4">
          {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 text-rose-700 text-xs"><AlertCircle size={15} className="shrink-0 mt-px" />{formError}</div>}
          <Field label="Full legal name *"><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} placeholder="e.g. Jane Cooper" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Date of birth *"><input type="date" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={inputCls} /></Field>
            <Field label="Gender *"><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })} className={inputCls}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
            <Field label="Blood group"><input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className={inputCls} placeholder="O+" /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone *"><input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+1 (555) 000-0000" /></Field>
            <Field label="Email *"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="patient@example.com" /></Field>
          </div>
          <Field label="Address *"><input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Street, City, State, ZIP" /></Field>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Emergency contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input required value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} placeholder="Name" className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
              <input required value={form.emergencyRelationship} onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })} placeholder="Relationship" className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
              <input required value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="Phone" className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowRegister(false)} className="hc-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Registering…' : 'Save Patient Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
