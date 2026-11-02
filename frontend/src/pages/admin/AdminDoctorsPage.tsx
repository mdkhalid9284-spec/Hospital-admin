import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IDoctor, IPatient } from '../../types';
import { Avatar, Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  DollarSign,
} from 'lucide-react';

export const AdminDoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  // Modals
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [assignModal, setAssignModal] = useState<{ doctor: IDoctor } | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form state
  const [docForm, setDocForm] = useState({
    fullName: 'Dr. Marcus Thorne, MD',
    specialization: 'Orthopedics',
    department: 'Orthopedic Surgery',
    qualification: 'MBBS, MS (Ortho), FACS',
    phone: '+1 (555) 018-4422',
    email: 'm.thorne@hospitalcare.demo',
    consultationFee: 160,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    slotDurationMinutes: 30,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, patRes] = await Promise.all([
        apiClient.get('/doctors'),
        apiClient.get('/patients'),
      ]);
      setDoctors(docRes.data.data.doctors);
      setPatients(patRes.data.data.patients);
      if (patRes.data.data.patients.length > 0) {
        setSelectedPatientId(patRes.data.data.patients[0].id);
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

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/doctors', docForm);
      setShowAddDoctor(false);
      setToastMsg('Doctor created and registered in directory.');
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to add doctor');
    }
  };

  const handleToggleStatus = async (doc: IDoctor) => {
    try {
      await apiClient.patch(`/doctors/${doc.id}/toggle-status`);
      setToastMsg(`Dr. ${doc.fullName}'s active status toggled.`);
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleAssignPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal || !selectedPatientId) return;
    try {
      await apiClient.post('/doctors/assign-patient', {
        doctorId: assignModal.doctor.id,
        patientId: selectedPatientId,
      });
      setAssignModal(null);
      setToastMsg(`Patient successfully assigned to ${assignModal.doctor.fullName}.`);
      fetchData();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to assign patient');
    }
  };

  const filtered = doctors.filter(
    (d) =>
      !searchQ ||
      d.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.department.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.doctorCode.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Doctors & Staff Management
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Clinical personnel directory, patient assignments & active status controls
          </p>
        </div>

        <button
          onClick={() => setShowAddDoctor(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] text-white rounded-full text-xs font-bold shadow-md shadow-[#14532D]/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Add Doctor
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="bg-white rounded-[26px] border border-slate-200/90 p-4 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] flex items-center">
        <div className="relative w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by name, specialization, or department…"
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Doctors Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={doc.fullName} size="md" className="w-12 h-12 text-xs" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{doc.fullName}</h3>
                    <p className="text-xs text-[#14532D] font-semibold">{doc.specialization}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                    doc.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {doc.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <GraduationCap size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{doc.qualification}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope size={13} className="text-slate-400 shrink-0" />
                  <span>{doc.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={13} className="text-slate-400 shrink-0" />
                  <span>${doc.consultationFee.toFixed(2)} Consultation Fee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{doc.availableDays?.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span>{doc.phone}</span>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  Assigned Patients:
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                  {doc.assignedPatientIds?.length || 0}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setAssignModal({ doctor: doc })}
                className="flex-1 py-2 bg-[#EAF9D8] hover:bg-blue-100 text-[#0B3D20] rounded-full font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <UserCheck size={13} /> Assign Patient
              </button>
              <button
                onClick={() => handleToggleStatus(doc)}
                className={`px-3 py-2 rounded-full font-bold text-xs transition-colors flex items-center gap-1 ${
                  doc.isActive
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                }`}
                title="Toggle Active / Inactive"
              >
                {doc.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Doctor */}
      <Modal open={showAddDoctor} onClose={() => setShowAddDoctor(false)}>
        <ModalHeader
          title="Add New Doctor"
          subtitle="Register medical professional and assign department"
          onClose={() => setShowAddDoctor(false)}
        />
        <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
          <Field label="Full Name *">
            <input
              required
              value={docForm.fullName}
              onChange={(e) => setDocForm({ ...docForm, fullName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Specialization *">
              <input
                required
                value={docForm.specialization}
                onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Department *">
              <input
                required
                value={docForm.department}
                onChange={(e) => setDocForm({ ...docForm, department: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Qualifications *">
            <input
              required
              value={docForm.qualification}
              onChange={(e) => setDocForm({ ...docForm, qualification: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone *">
              <input
                required
                value={docForm.phone}
                onChange={(e) => setDocForm({ ...docForm, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                required
                value={docForm.email}
                onChange={(e) => setDocForm({ ...docForm, email: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Consultation Fee ($) *">
              <input
                type="number"
                required
                value={docForm.consultationFee}
                onChange={(e) => setDocForm({ ...docForm, consultationFee: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Slot Duration (Minutes)">
              <input
                type="number"
                value={docForm.slotDurationMinutes}
                onChange={(e) => setDocForm({ ...docForm, slotDurationMinutes: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddDoctor(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="hc-btn-blue">
              Add Doctor
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Patient to Doctor */}
      {assignModal && (
        <Modal open={true} onClose={() => setAssignModal(null)}>
          <ModalHeader
            title="Assign Patient to Doctor"
            subtitle={`Assign clinical care under ${assignModal.doctor.fullName} (${assignModal.doctor.specialization})`}
            onClose={() => setAssignModal(null)}
          />
          <form onSubmit={handleAssignPatient} className="p-6 space-y-4">
            <Field label="Select Patient *">
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className={inputCls}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.patientCode})
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="hc-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="hc-btn-blue">
                Confirm Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
