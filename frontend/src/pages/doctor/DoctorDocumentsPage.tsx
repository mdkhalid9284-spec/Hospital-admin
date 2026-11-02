import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IMedicalDocument, IPatient } from '../../types';
import {
  FolderOpen,
  Download,
  Upload,
  Search,
  FileText,
  CheckCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const DoctorDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<IMedicalDocument[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [targetPatientId, setTargetPatientId] = useState('');
  const [category, setCategory] = useState<'Report' | 'Scan' | 'Prescription' | 'Other'>('Report');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docRes, patRes] = await Promise.all([
        apiClient.get('/documents'),
        apiClient.get('/patients'),
      ]);
      setDocuments(docRes.data.data?.documents ?? []);
      const patientList = patRes.data.data?.patients ?? [];
      setPatients(patientList);
      if (patientList.length > 0 && !targetPatientId) {
        setTargetPatientId(patientList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load documents.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const validateFile = (candidate: File | null): boolean => {
    if (!candidate) return false;
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    const extension = candidate.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedExtensions.includes(extension)) {
      setUploadError('Unsupported file type. Upload a PDF, JPEG, PNG or WebP file.');
      return false;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10 MB maximum limit.');
      return false;
    }
    if (candidate.size === 0) {
      setUploadError('The selected file is empty.');
      return false;
    }
    setUploadError(null);
    return true;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetPatientId) return;
    if (!validateFile(file)) return;
    setUploading(true);
    setUploadError(null);
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
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: IMedicalDocument) => {
    try {
      setActionError(null);
      const res = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: doc.mimeType });
      if (blob.size === 0) throw new Error('The stored file is empty or missing.');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err.message || 'Download failed');
    }
  };

  const filtered = documents.filter((d) => {
    const query = searchQ.trim().toLowerCase();
    if (!query) return true;
    const extension = d.originalFilename.split('.').pop() ?? '';
    const format = d.mimeType.split('/').pop() ?? '';
    return [d.title, d.originalFilename, d.category, d.mimeType, format, extension]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

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
          onClick={() => {
            setUploadError(null);
            setShowUpload(true);
          }}
          disabled={patients.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all active:scale-95 disabled:opacity-50"
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

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-white hover:bg-red-700"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
          >
            ×
          </button>
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
              {loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                    Loading documents…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <FolderOpen className="mx-auto mb-2 text-slate-300" size={26} />
                    <p className="text-xs font-semibold text-slate-500">
                      {documents.length === 0
                        ? 'No documents uploaded yet.'
                        : 'No documents match your search.'}
                    </p>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#EAF9D8] text-[#0B3D20] flex items-center justify-center shrink-0">
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
                      className="px-3.5 py-1.5 bg-[#EAF9D8] hover:bg-blue-100 text-[#0B3D20] rounded-full font-bold text-xs transition-colors inline-flex items-center gap-1.5"
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
          {uploadError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {uploadError}
            </div>
          )}
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
              onChange={(e) => {
                const candidate = e.target.files?.[0] || null;
                if (validateFile(candidate)) {
                  setFile(candidate);
                } else {
                  setFile(null);
                  e.target.value = '';
                }
              }}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#EAF9D8] file:text-[#0B3D20] hover:file:bg-blue-100 cursor-pointer"
            />
            {file && (
              <p className="mt-1 text-[10px] text-slate-400">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
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
