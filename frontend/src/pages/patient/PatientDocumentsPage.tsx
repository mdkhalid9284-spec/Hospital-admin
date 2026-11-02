import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { IMedicalDocument, DocumentCategory } from '../../types';
import { 
  FileText, Upload, Download, Filter, Search, 
  CheckCircle, AlertTriangle, File, ShieldCheck, X
} from 'lucide-react';

export const PatientDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<IMedicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Report');
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!user?.patientId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/documents/patient/${user.patientId}`);
      setDocuments(res.data.data?.documents ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch medical documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user?.patientId]);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setSelectedFile(null);
        setUploadError('Unsupported file type. Upload a PDF, JPEG, PNG or WebP file.');
        return;
      }
      if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        setSelectedFile(null);
        setUploadError(`Unsupported MIME type '${file.type}'.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setSelectedFile(null);
        setUploadError('File size exceeds the 10 MB maximum limit.');
        return;
      }
      if (file.size === 0) {
        setSelectedFile(null);
        setUploadError('The selected file is empty.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim() || !user?.patientId) {
      setUploadError('Please select a file and enter a valid document title.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', user.patientId);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle.trim());

      await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMsg('Document successfully uploaded and secured in patient vault.');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadTitle('');
      fetchDocuments();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: IMedicalDocument) => {
    try {
      setDownloadError(null);
      const response = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: (response.headers['content-type'] as string) || doc.mimeType,
      });
      if (blob.size === 0) {
        throw new Error('The stored file is empty or missing.');
      }
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', doc.originalFilename || `${doc.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setDownloadError(
        `Could not download “${doc.title}”: ${err.message || 'Error retrieving file'}`
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const formatLabel = doc.mimeType.split('/').pop() ?? '';
    const extension = doc.originalFilename.split('.').pop() ?? '';
    const matchesSearch =
      query.length === 0 ||
      [doc.title, doc.originalFilename, doc.category, doc.mimeType, formatLabel, extension]
        .join(' ')
        .toLowerCase()
        .includes(query);
    return matchesCat && matchesSearch;
  });

  const categories: ('ALL' | DocumentCategory)[] = ['ALL', 'Report', 'Prescription', 'Scan', 'Bill', 'Insurance', 'Other'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Medical Documents</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Encrypted
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Access, upload, and securely download your clinical reports, lab analyses, and discharge summaries.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#0B3D20] text-white font-medium shadow-md shadow-[#14532D]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={fetchDocuments}
            className="self-start rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {downloadError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="flex-1">{downloadError}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            aria-label="Dismiss download error"
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Files' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading your medical files...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No documents found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'No documents match your active search filters.'
              : 'You have not uploaded any external medical documents yet. You can upload previous diagnostic reports or test scans.'}
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                    doc.category === 'Report' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    doc.category === 'Prescription' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    doc.category === 'Scan' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                    doc.category === 'Bill' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {doc.category}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 line-clamp-1 text-base">{doc.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-mono truncate">{doc.originalFilename}</p>
                
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {doc.mimeType === 'application/pdf' ? 'PDF' : 'Image'} ·{' '}
                    {formatFileSize(doc.fileSizeBytes)}
                  </span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-3">
                <button
                  onClick={() => handleDownload(doc)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 hover:bg-[#EAF9D8] text-slate-700 hover:text-[#0B3D20] text-xs font-semibold border border-slate-200 hover:border-[#C7FF75] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Upload Medical Document</h3>
                  <p className="text-xs text-slate-500">Securely store files in your patient profile</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="Report">Diagnostic Report</option>
                  <option value="Scan">Imaging / Scan (MRI, CT, X-Ray)</option>
                  <option value="Prescription">External Prescription</option>
                  <option value="Insurance">Insurance / Claim Form</option>
                  <option value="Bill">Prior Hospital Bill</option>
                  <option value="Other">Other Clinical Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Brain MRI Scan - April 2026"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select File (PDF, PNG, JPG, max 10MB)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <File className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm font-semibold text-slate-700">
                      {selectedFile ? selectedFile.name : 'Choose a file or drag & drop here'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      {selectedFile ? `${formatFileSize(selectedFile.size)} selected` : 'PDF, JPEG, PNG up to 10MB'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#0B3D20] text-white text-sm font-semibold shadow-md shadow-[#14532D]/20 disabled:opacity-50 transition-all"
                >
                  {isUploading ? 'Uploading & Encrypting...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientDocumentsPage;
