import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IPatient, IBill } from '../../types';
import { 
  Users, Search, Phone, Mail, MapPin, 
  CreditCard, Shield, AlertTriangle, FileText, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BillingPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected patient account billing drawer / modal
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [patientsRes, billsRes] = await Promise.all([
          apiClient.get('/patients'),
          apiClient.get('/bills'),
        ]);
        setPatients((patientsRes.data.data?.patients ?? patientsRes.data.data) || []);
        setBills((billsRes.data.data?.bills ?? billsRes.data.data) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch patients list');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.patientCode.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  const getPatientBills = (patientId: string) => {
    return bills.filter((b) => b.patientId === patientId);
  };

  const getPatientBalance = (patientId: string) => {
    const pBills = getPatientBills(patientId);
    return pBills.reduce((acc, b) => acc + (b.balance || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Billing Accounts</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Demographic-Only Boundary
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Lookup patient account balances, insurance policy holders, and statement ledgers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient by name, MRN code, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredPatients.length} of {patients.length} patients
        </span>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading patient accounts...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No patients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200/60 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">MRN Code</th>
                  <th className="py-3.5 px-5">Patient Name</th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5">Emergency Contact</th>
                  <th className="py-3.5 px-5">Invoices</th>
                  <th className="py-3.5 px-5">Outstanding Due</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => {
                  const patientBills = getPatientBills(patient.id);
                  const patientBalance = getPatientBalance(patient.id);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 font-mono font-semibold text-slate-900">{patient.patientCode}</td>
                      <td className="py-4 px-5 font-semibold text-slate-900">{patient.fullName}</td>
                      <td className="py-4 px-5 text-xs text-slate-600">
                        <div>{patient.phone}</div>
                        <div className="text-slate-400">{patient.email}</div>
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-600">
                        {patient.emergencyContact?.name ? (
                          <div>
                            <span className="font-medium text-slate-800">{patient.emergencyContact.name}</span>
                            <span className="text-slate-400 block">({patient.emergencyContact.relationship}) {patient.emergencyContact.phone}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {patientBills.length} Invoices
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold">
                        <span className={patientBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          ${patientBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="px-3 py-1.5 rounded-lg bg-[#EAF9D8] hover:bg-blue-100 text-[#0B3D20] text-xs font-semibold transition-colors"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Ledger Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center font-bold">
                  {selectedPatient.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedPatient.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono">MRN: {selectedPatient.patientCode}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl grid grid-cols-2 gap-2 text-slate-600">
                <div>Phone: <span className="font-semibold text-slate-800">{selectedPatient.phone}</span></div>
                <div>Email: <span className="font-semibold text-slate-800">{selectedPatient.email}</span></div>
                <div className="col-span-2">Address: <span className="font-semibold text-slate-800">{selectedPatient.address}</span></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Invoices on Record</h4>
                {getPatientBills(selectedPatient.id).length === 0 ? (
                  <p className="text-slate-400">No invoices generated for this patient yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getPatientBills(selectedPatient.id).map((b) => (
                      <div key={b.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between bg-white">
                        <div>
                          <span className="font-mono font-semibold text-slate-900 block">{b.billCode}</span>
                          <span className="text-slate-400 text-[11px]">{new Date(b.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">${b.total.toFixed(2)}</span>
                          <span className={`text-[11px] font-semibold ${b.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {b.status} (Bal: ${b.balance})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
              <Link
                to="/portal/billing/invoices"
                className="text-xs font-semibold text-[#14532D] hover:underline"
              >
                Go to Invoices Manager →
              </Link>
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingPatientsPage;
