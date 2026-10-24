import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IMedicalDocument, IPatient } from '../../types';
import { FolderOpen, Download, Upload, Search, FileText, CheckCircle, Eye } from 'lucide-react';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const DoctorDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<IMedicalDocument[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [targetPatientId, setTargetPatientId] = useState('');
  const [category, setCategory] = useState<'Report' | 'Scan' | 'Prescription' | 'Other'>('Report');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, patRes] = await Promise.all([
        apiClient.get('/documents'),
        apiClient.get('/patients'),
      ]);
      setDocuments(docRes.data.data.documents);
      setPatients(patRes.data.data.patients);
      if (patRes.data.data.patients.length > 0 && !targetPatientId) {
        setTargetPatientId(patRes.data.data.patients[0].id);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetPatientId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('patientId', targetPatientId);
      form.append('category', category);
      form.append('title', docTitle || file.name);

      await apiClient.post('/documents/upload', form);
      setShowUpload(false);
      setFile(null);
      setDocTitle('');
      setToastMsg('Medical document uploaded & verified with magic bytes.');
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: IMedicalDocument) => {
    try {
      const res = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: doc.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  const filtered = documents.filter(
    (d) =>
      !searchQ ||
      d.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.originalFilename.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Medical Documents & Scans
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Clinical reports, 12-lead ECGs & radiology scans with MIME/magic-byte integrity
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Upload size={14} /> Upload Diagnostic File
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Documents Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <div className="pb-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search documents by title, format, or category…"
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="py-3 pl-2">Document Title</th>
                <th className="py-3">Category</th>
                <th className="py-3">File Format / Size</th>
                <th className="py-3">Uploaded Date</th>
                <th className="py-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[13px]">{doc.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                          {doc.originalFilename}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-600 font-mono text-[11px]">
                    {doc.mimeType} · {Math.round(doc.fileSizeBytes / 1024)} KB
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Download size={13} /> Download File
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Upload Document */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)}>
        <ModalHeader
          title="Upload Diagnostic File"
          subtitle="10MB max, verified against MIME & binary signature"
          onClose={() => setShowUpload(false)}
        />
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          <Field label="Target Patient *">
            <select
              required
              value={targetPatientId}
              onChange={(e) => setTargetPatientId(e.target.value)}
              className={inputCls}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientCode})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Document Category *">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className={inputCls}
            >
              <option value="Report">Laboratory Report</option>
              <option value="Scan">Radiology Scan (X-Ray, CT, MRI)</option>
              <option value="Prescription">Electronic Prescription</option>
              <option value="Other">Other Medical File</option>
            </select>
          </Field>
          <Field label="Document Title *">
            <input
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. 12-Lead Electrocardiogram Review"
              className={inputCls}
            />
          </Field>
          <Field label="Select File (PDF, PNG, JPEG, WebP) *">
            <input
              type="file"
              required
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="hc-btn-blue">
              {uploading ? 'Verifying…' : 'Upload Secure File'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
