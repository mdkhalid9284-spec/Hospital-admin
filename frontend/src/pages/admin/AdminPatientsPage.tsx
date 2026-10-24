import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IPatient, IMedicalRecord, IPrescription, IMedicalDocument } from '../../types';
import { PatientClinicalProfileView } from '../../components/ui/PatientClinicalProfileView';
import { Avatar, Badge, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import {
  Users,
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  Edit2,
  Calendar,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export const AdminPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admitted' | 'outpatient'>('all');

  // Selected patient for full clinical profile view (media_1792651876163.png)
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [patientRecords, setPatientRecords] = useState<IMedicalRecord[]>([]);
  const [patientRx, setPatientRx] = useState<IPrescription[]>([]);
  const [patientDocs, setPatientDocs] = useState<IMedicalDocument[]>([]);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editPatient, setEditPatient] = useState<IPatient | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Forms
  const [regForm, setRegForm] = useState({
    fullName: '',
    dob: '1990-01-15',
    gender: 'female',
    phone: '+1 (555) 018-9944',
    email: '',
    address: '100 Broadway, New York, NY',
    emergencyContact: { name: 'David Smith', relationship: 'Spouse', phone: '+1 (555) 018-9945' },
  });

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/patients');
      setPatients(res.data.data.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const openProfile = async (p: IPatient) => {
    setSelectedPatient(p);
    try {
      const [recRes, rxRes, docRes] = await Promise.all([
        apiClient.get(`/records/patient/${p.id}`).catch(() => ({ data: { data: { records: [] } } })),
        apiClient.get(`/prescriptions/patient/${p.id}`).catch(() => ({ data: { data: { prescriptions: [] } } })),
        apiClient.get(`/documents/patient/${p.id}`).catch(() => ({ data: { data: { documents: [] } } })),
      ]);
      setPatientRecords(recRes.data.data.records || []);
      setPatientRx(rxRes.data.data.prescriptions || []);
      setPatientDocs(docRes.data.data.documents || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/patients', regForm);
      setShowRegisterModal(false);
      setToastMsg('Patient successfully registered into hospital database.');
      fetchPatients();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    try {
      await apiClient.patch(`/patients/${editPatient.id}`, {
        phone: editPatient.phone,
        address: editPatient.address,
        emergencyContact: editPatient.emergencyContact,
      });
      setEditPatient(null);
      setToastMsg('Patient demographics updated successfully.');
      fetchPatients();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const filtered = patients.filter((p) => {
    const matchesQ =
      !searchQ ||
      p.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.patientCode.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.phone.includes(searchQ) ||
      p.email.toLowerCase().includes(searchQ.toLowerCase());

    if (filterType === 'admitted') return matchesQ && p.currentAdmissionId;
    if (filterType === 'outpatient') return matchesQ && !p.currentAdmissionId;
    return matchesQ;
  });

  const handleExportCSV = () => {
    const csv = [
      ['ID', 'Patient Code', 'Full Name', 'DOB', 'Gender', 'Phone', 'Email', 'Status'],
      ...filtered.map((p) => [
        p.id,
        p.patientCode,
        p.fullName,
        p.dob,
        p.gender,
        p.phone,
        p.email,
        p.currentAdmissionId ? 'Inpatient' : 'Outpatient',
      ]),
    ]
      .map((r) => r.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_patients_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedPatient) {
    return (
      <PatientClinicalProfileView
        patient={selectedPatient}
        records={patientRecords}
        prescriptions={patientRx}
        documents={patientDocs}
        onClose={() => setSelectedPatient(null)}
        onAddNote={async (note) => {
          await apiClient.post('/records/clinical-note', {
            patientId: selectedPatient.id,
            ...note,
          });
          const recRes = await apiClient.get(`/records/patient/${selectedPatient.id}`);
          setPatientRecords(recRes.data.data.records);
        }}
        onUploadDoc={async (file, category, title) => {
          const form = new FormData();
          form.append('file', file);
          form.append('patientId', selectedPatient.id);
          form.append('category', category);
          form.append('title', title);
          await apiClient.post('/documents/upload', form);
          const docRes = await apiClient.get(`/documents/patient/${selectedPatient.id}`);
          setPatientDocs(docRes.data.data.documents);
        }}
      />
    );
  }

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Patient Directory
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Registered patients, profiles, demographics & admission history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={14} /> Register Patient
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Directory Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        {/* Controls: Search & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by name, ID (#PAT-1001), phone, or email…"
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/70 text-xs font-bold">
            {(['all', 'admitted', 'outpatient'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full capitalize transition-all ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Patients' : t === 'admitted' ? 'Inpatients' : 'Outpatients'}
              </button>
            ))}
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="py-3 pl-2">Patient</th>
                <th className="py-3">Code</th>
                <th className="py-3">DOB / Gender</th>
                <th className="py-3">Phone & Email</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4">
                      <div className="skeleton h-10 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.fullName} size="sm" className="w-8 h-8 text-[11px]" />
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{p.fullName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-700">
                      {p.patientCode}
                    </td>
                    <td className="py-3 text-slate-600">
                      <span>{p.dob}</span> · <span className="capitalize">{p.gender}</span>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{p.phone}</p>
                      <p className="text-slate-400 truncate max-w-[160px]">{p.email}</p>
                    </td>
                    <td className="py-3">
                      {p.currentAdmissionId ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10.5px] border border-emerald-200">
                          Admitted Inpatient
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10.5px]">
                          Outpatient
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openProfile(p)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full font-bold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <Eye size={13} /> View 3D Profile
                        </button>
                        <button
                          onClick={() => setEditPatient(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                          title="Edit Demographics"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Patient */}
      <Modal open={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
        <ModalHeader
          title="Register New Patient"
          subtitle="Add patient to directory with demographics and emergency contact"
          onClose={() => setShowRegisterModal(false)}
        />
        <form onSubmit={handleRegister} className="p-6 space-y-4">
          <Field label="Full Name *">
            <input
              required
              value={regForm.fullName}
              onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
              placeholder="e.g. Sarah Smith"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth *">
              <input
                type="date"
                required
                value={regForm.dob}
                onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Gender *">
              <select
                value={regForm.gender}
                onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
                className={inputCls}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone Number *">
              <input
                required
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email Address *">
              <input
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="sarah@example.com"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Address *">
            <input
              required
              value={regForm.address}
              onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Emergency Contact
            </p>
            <div className="grid grid-cols-3 gap-2">
              <input
                required
                placeholder="Name"
                value={regForm.emergencyContact.name}
                onChange={(e) =>
                  setRegForm({
                    ...regForm,
                    emergencyContact: { ...regForm.emergencyContact, name: e.target.value },
                  })
                }
                className={inputCls}
              />
              <input
                required
                placeholder="Relationship"
                value={regForm.emergencyContact.relationship}
                onChange={(e) =>
                  setRegForm({
                    ...regForm,
                    emergencyContact: { ...regForm.emergencyContact, relationship: e.target.value },
                  })
                }
                className={inputCls}
              />
              <input
                required
                placeholder="Phone"
                value={regForm.emergencyContact.phone}
                onChange={(e) =>
                  setRegForm({
                    ...regForm,
                    emergencyContact: { ...regForm.emergencyContact, phone: e.target.value },
                  })
                }
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hc-btn-blue">
              Save Patient Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Demographics */}
      {editPatient && (
        <Modal open={true} onClose={() => setEditPatient(null)}>
          <ModalHeader
            title="Edit Demographics"
            subtitle={`Update address and contact info for ${editPatient.fullName}`}
            onClose={() => setEditPatient(null)}
          />
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            <Field label="Phone *">
              <input
                required
                value={editPatient.phone}
                onChange={(e) => setEditPatient({ ...editPatient, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Address *">
              <input
                required
                value={editPatient.address}
                onChange={(e) => setEditPatient({ ...editPatient, address: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Emergency Contact
              </p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  placeholder="Name"
                  value={editPatient.emergencyContact?.name || ''}
                  onChange={(e) =>
                    setEditPatient({
                      ...editPatient,
                      emergencyContact: {
                        ...(editPatient.emergencyContact || { relationship: '', phone: '' }),
                        name: e.target.value,
                      },
                    })
                  }
                  className={inputCls}
                />
                <input
                  required
                  placeholder="Relationship"
                  value={editPatient.emergencyContact?.relationship || ''}
                  onChange={(e) =>
                    setEditPatient({
                      ...editPatient,
                      emergencyContact: {
                        ...(editPatient.emergencyContact || { name: '', phone: '' }),
                        relationship: e.target.value,
                      },
                    })
                  }
                  className={inputCls}
                />
                <input
                  required
                  placeholder="Phone"
                  value={editPatient.emergencyContact?.phone || ''}
                  onChange={(e) =>
                    setEditPatient({
                      ...editPatient,
                      emergencyContact: {
                        ...(editPatient.emergencyContact || { name: '', relationship: '' }),
                        phone: e.target.value,
                      },
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditPatient(null)}
                className="hc-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="hc-btn-blue">
                Update Demographics
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
