import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IMedicalDocument, IPatient, DocumentCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { FolderOpen, Upload, Download, Trash2, FileText, X, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { Card, PageHeader, SearchInput, Badge, EmptyState, Modal, ModalHeader, Tabs, Field, inputCls } from '../components/ui/primitives';
import { cn } from '../components/ui/primitives';

const catTone = (c: string) =>
  c === 'Scan' ? 'bg-violet-50 text-violet-700 border-violet-200'
  : c === 'Report' ? 'bg-sky-50 text-sky-700 border-sky-200'
  : c === 'Prescription' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : c === 'Bill' ? 'bg-amber-50 text-amber-700 border-amber-200'
  : c === 'Insurance' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
  : 'bg-slate-100 text-slate-600 border-slate-200';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<IMedicalDocument[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const [showUp, setShowUp] = useState(false);
  const [pid, setPid] = useState(user?.patientId || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Report');
  const [isExt, setIsExt] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [d, p] = await Promise.all([
        apiClient.get('/documents'),
        user?.role !== 'patient' ? apiClient.get('/patients') : Promise.resolve({ data: { data: { patients: [] } } }),
      ]);
      setDocs(d.data.data.documents);
      setPatients(p.data.data.patients);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setModalError('Select a file to upload'); return; }
    setModalError(null); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('patientId', user?.role === 'patient' ? user.patientId! : pid);
      fd.append('title', title);
      fd.append('category', category);
      fd.append('isExternalRecord', String(isExt));
      await apiClient.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUp(false); setTitle(''); setFile(null);
      fetchData();
    } catch (e: any) { setModalError(e.message || 'Upload failed'); }
    finally { setSubmitting(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this document? This action is audit-logged.')) return;
    try { setDelError(null); await apiClient.delete(`/documents/${id}`); fetchData(); }
    catch (e: any) { setDelError(e.message || 'Delete failed'); }
  };

  const list = docs.filter((d) => {
    if (cat !== 'all' && d.category !== cat) return false;
    if (!q) return true;
    const v = q.toLowerCase();
    return d.title.toLowerCase().includes(v) || d.originalFilename.toLowerCase().includes(v) || (d.patientName || '').toLowerCase().includes(v);
  });

  const counts = (c: string) => docs.filter((d) => d.category === c).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Document Vault"
        subtitle="Reports, scans and external OPD records — magic-byte verified, tokenized streaming"
        icon={<FolderOpen size={18} />}
        actions={<button onClick={() => setShowUp(true)} className="hc-btn-blue"><Upload size={15} /> Upload Document</button>}
      />

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {(['Report', 'Scan', 'Prescription', 'Bill', 'Insurance', 'Other'] as DocumentCategory[]).map((c) => (
          <button key={c} onClick={() => setCat(cat === c ? 'all' : c)} className={cn('p-3 rounded-2xl border text-left transition-all active:scale-[0.98]', cat === c ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 hover:border-slate-300')}>
            <p className={cn('text-xl font-bold tabular-nums', cat === c ? 'text-white' : 'text-slate-900')}>{counts(c)}</p>
            <p className={cn('text-[11px] font-bold', cat === c ? 'text-slate-300' : 'text-slate-500')}>{c}s</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, filename, patient…" className="flex-1" />
        <Tabs tabs={[{ id: 'all', label: 'All', count: docs.length }, { id: 'Report', label: 'Reports' }, { id: 'Scan', label: 'Scans' }, { id: 'Bill', label: 'Bills' }]} active={cat} onChange={setCat} />
      </div>
      {delError && <Card className="p-3.5 text-[13px] text-rose-700 border-rose-200 bg-rose-50/60 flex items-center justify-between gap-3">{delError}<button onClick={() => setDelError(null)} className="font-bold underline shrink-0">Dismiss</button></Card>}

      {loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{[0,1,2,3,4,5].map((i) => <div key={i} className="skeleton h-28 !rounded-2xl" />)}</div>
      : list.length === 0 ? <Card><EmptyState icon={<FolderOpen size={22} />} title="No documents" hint="Upload PDFs or images — prescriptions, scans, bills and insurer files." action={<button onClick={() => setShowUp(true)} className="hc-btn-dark !py-2 text-xs">Upload first document</button>} /></Card>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((d) => (
            <Card key={d.id} hover className="p-4 flex gap-3">
              <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                {d.mimeType.includes('image') ? <ImageIcon size={18} /> : d.mimeType.includes('pdf') ? <FileText size={18} className="text-rose-500" /> : <FileSpreadsheet size={18} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[13.5px] text-slate-900 truncate">{d.title}</span>
                <span className="block text-[11px] text-slate-400 font-mono truncate">{d.originalFilename} · {(d.fileSizeBytes / 1024).toFixed(0)} KB</span>
                <span className="flex items-center gap-1.5 mt-1.5 flex-wrap"><span className={cn('px-2 py-0.5 text-[10.5px] font-bold rounded-full border', catTone(d.category))}>{d.category}</span>{d.isExternalRecord && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">External</span>}</span>
                <span className="block text-[11px] text-slate-400 mt-1">{d.patientName || 'Patient'} · {new Date(d.createdAt).toLocaleDateString()}</span>
              </span>
              <span className="flex flex-col gap-1.5 shrink-0">
                <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" title="Download" className="w-8 h-8 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-colors"><Download size={14} /></a>
                {(user?.role === 'admin' || user?.id === d.uploadedBy) && <button onClick={() => del(d.id)} title="Delete" className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>}
              </span>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showUp} onClose={() => setShowUp(false)}>
        <ModalHeader title="Upload medical document" subtitle="PDF or image · validated server-side" onClose={() => setShowUp(false)} />
        <form onSubmit={upload} className="p-6 space-y-4">
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          {user?.role !== 'patient' && (
            <Field label="Patient *"><select required value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}><option value="">Choose patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>)}</select></Field>
          )}
          <Field label="Title *"><input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Chest X-Ray / Pathology Report" /></Field>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
            className={cn('rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer', dragOver ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300')}
          >
            <input id="doc-file" type="file" required={!file} accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <label htmlFor="doc-file" className="cursor-pointer">
              <Upload size={20} className="mx-auto text-slate-400" />
              <p className="text-[13px] font-bold text-slate-800 mt-2">{file ? file.name : 'Drop file here or click to browse'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{file ? `${(file.size / 1024).toFixed(0)} KB · verified on upload` : 'PDF, PNG, JPG, WEBP'}</p>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category *"><select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} className={inputCls}>{(['Report', 'Scan', 'Prescription', 'Bill', 'Insurance', 'Other'] as DocumentCategory[]).map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 cursor-pointer"><input type="checkbox" checked={isExt} onChange={(e) => setIsExt(e.target.checked)} className="rounded text-sky-600" /> External / prior-hospital record</label>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUp(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting || !file} className="hc-btn-blue">{submitting ? 'Uploading…' : 'Upload Securely'}</button></div>
        </form>
      </Modal>
    </div>
  );
  void Badge;
};
