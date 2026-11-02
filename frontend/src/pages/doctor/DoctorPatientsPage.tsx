import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IPatient, IMedicalRecord, IPrescription, IMedicalDocument } from '../../types';
import { PatientClinicalProfileView } from '../../components/ui/PatientClinicalProfileView';
import { Avatar, Badge } from '../../components/ui/primitives';
import { Search, Eye, Stethoscope, CheckCircle, FilePlus, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DoctorPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  // Selected patient for full clinical profile view (media_1792651876163.png)
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [patientRecords, setPatientRecords] = useState<IMedicalRecord[]>([]);
  const [patientRx, setPatientRx] = useState<IPrescription[]>([]);
  const [patientDocs, setPatientDocs] = useState<IMedicalDocument[]>([]);

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

  const filtered = patients.filter(
    (p) =>
      !searchQ ||
      p.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.patientCode.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.phone.includes(searchQ)
  );

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
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Assigned Patients
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Clinical case directory, individual health profiles, vitals analytics & observations
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/doctor/prescriptions')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all active:scale-95"
        >
          <Pill size={14} /> New Prescription
        </button>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
        <div className="pb-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search assigned patients by name or ID…"
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="py-3 pl-2">Patient Name</th>
                <th className="py-3">Patient Code</th>
                <th className="py-3">DOB / Gender</th>
                <th className="py-3">Blood Group</th>
                <th className="py-3">Inpatient / Outpatient</th>
                <th className="py-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.fullName} size="sm" className="w-8 h-8 text-[11px]" />
                      <span className="font-bold text-slate-900 text-[13px]">{p.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-slate-700">{p.patientCode}</td>
                  <td className="py-3.5 text-slate-600">
                    {p.dob} · <span className="capitalize">{p.gender}</span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold font-mono text-[11px]">
                      {p.bloodGroup || 'O+'}
                    </span>
                  </td>
                  <td className="py-3.5">
                    {p.currentAdmissionId ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10.5px] border border-emerald-200">
                        Inpatient (Admitted)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10.5px]">
                        Outpatient
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <button
                      onClick={() => openProfile(p)}
                      className="px-3.5 py-1.5 bg-[#EAF9D8] hover:bg-blue-100 text-[#0B3D20] rounded-full font-bold text-xs transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      <Eye size={13} /> View 3D Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
