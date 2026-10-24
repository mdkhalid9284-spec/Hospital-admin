import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { IPatient } from '../../types';
import { 
  User, Phone, Mail, MapPin, Heart, Shield, 
  CheckCircle, AlertTriangle, Save, Edit3, Activity
} from 'lucide-react';

export const PatientProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields state
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!user?.patientId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/patients/${user.patientId}`);
      const data: IPatient = res.data.data;
      setPatient(data);
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setEmergencyName(data.emergencyContact?.name || '');
      setEmergencyRelation(data.emergencyContact?.relationship || '');
      setEmergencyPhone(data.emergencyContact?.phone || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.patientId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.patientId) return;

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        phone: phone.trim(),
        address: address.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          phone: emergencyPhone.trim(),
        },
      };

      const res = await apiClient.patch(`/patients/${user.patientId}`, payload);
      setPatient(res.data.data);
      setSuccessMsg('Your contact and emergency profile details have been saved successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading your profile information...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal contact details, verified address, and emergency contact network.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {patient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Fixed Clinical Identity Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90" />
              
              <div className="relative pt-6">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg mx-auto p-1.5 border-2 border-white">
                  <div className="w-full h-full rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-2xl">
                    {patient.fullName.charAt(0)}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-3">{patient.fullName}</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold mt-1">
                  <span>MRN: {patient.patientCode}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-left">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                  <span className="text-sm font-bold text-rose-600 mt-0.5 block">{patient.bloodGroup || 'O+'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Gender</span>
                  <span className="text-sm font-bold text-slate-800 capitalize mt-0.5 block">{patient.gender}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Birth Date</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{patient.dob}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className={`text-sm font-bold mt-0.5 block ${patient.currentAdmissionId ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {patient.currentAdmissionId ? 'Inpatient' : 'Outpatient'}
                  </span>
                </div>
              </div>

              <div className="mt-6 text-left text-xs text-slate-500 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Clinical identifiers and medical codes are managed exclusively by hospital admissions.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" /> Contact & Residence Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Used for appointment SMS updates and hospital mail</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={patient.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600" /> Emergency Contact Designation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Primary individual contacted during hospital admissions or critical alerts</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    required
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    required
                    placeholder="e.g. Spouse, Parent, Sibling"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    required
                    placeholder="e.g. +1 555-0199"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientProfilePage;
