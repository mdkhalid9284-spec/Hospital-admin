import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IInsuranceClaim, IPatient, IBill, ClaimStatus } from '../../types';
import { 
  Shield, Plus, Search, Filter, CheckCircle, 
  AlertTriangle, DollarSign, Clock, Check, X, FileText
} from 'lucide-react';

export const BillingInsurancePage: React.FC = () => {
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Claim Modal
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [claimPatientId, setClaimPatientId] = useState('');
  const [claimBillId, setClaimBillId] = useState('');
  const [claimProvider, setClaimProvider] = useState('');
  const [claimPolicyNumber, setClaimPolicyNumber] = useState('');
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [claimRemarks, setClaimRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Adjudicate / Update Status Modal
  const [adjudicateClaim, setAdjudicateClaim] = useState<IInsuranceClaim | null>(null);
  const [adjudicateStatus, setAdjudicateStatus] = useState<ClaimStatus>('Approved');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [adjudicateRemarks, setAdjudicateRemarks] = useState('');
  const [isAdjudicating, setIsAdjudicating] = useState(false);
  const [adjudicateError, setAdjudicateError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [claimsRes, billsRes, patientsRes] = await Promise.all([
        apiClient.get('/insurance'),
        apiClient.get('/billing'),
        apiClient.get('/patients'),
      ]);
      setClaims(claimsRes.data.data || []);
      setBills(billsRes.data.data || []);
      setPatients(patientsRes.data.data || []);
      if (patientsRes.data.data?.length > 0) {
        setClaimPatientId(patientsRes.data.data[0].id);
      }
      if (billsRes.data.data?.length > 0) {
        setClaimBillId(billsRes.data.data[0].id);
        setClaimAmount(billsRes.data.data[0].balance || billsRes.data.data[0].total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load insurance claims');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePatientSelect = (patientId: string) => {
    setClaimPatientId(patientId);
    const patientBills = bills.filter((b) => b.patientId === patientId);
    if (patientBills.length > 0) {
      setClaimBillId(patientBills[0].id);
      setClaimAmount(patientBills[0].balance || patientBills[0].total);
    }
  };

  const handleBillSelect = (billId: string) => {
    setClaimBillId(billId);
    const b = bills.find((x) => x.id === billId);
    if (b) setClaimAmount(b.balance || b.total);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPatientId || !claimBillId || !claimProvider || !claimPolicyNumber || claimAmount <= 0) {
      setSubmitError('Please complete all required fields with a positive claim amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await apiClient.post('/insurance/claims', {
        patientId: claimPatientId,
        billId: claimBillId,
        provider: claimProvider.trim(),
        policyNumber: claimPolicyNumber.trim(),
        claimAmount: Number(claimAmount),
        remarks: claimRemarks.trim() || undefined,
      });

      setSuccessMsg('Insurance claim submitted successfully for processing.');
      setIsSubmitOpen(false);
      setClaimProvider('');
      setClaimPolicyNumber('');
      setClaimRemarks('');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit insurance claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjudicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjudicateClaim) return;

    try {
      setIsAdjudicating(true);
      setAdjudicateError(null);

      await apiClient.patch(`/insurance/claims/${adjudicateClaim.id}/status`, {
        status: adjudicateStatus,
        approvedAmount: adjudicateStatus === 'Approved' ? Number(approvedAmount) : 0,
        remarks: adjudicateRemarks.trim() || undefined,
      });

      setSuccessMsg(`Claim ${adjudicateClaim.claimCode} marked as ${adjudicateStatus}.`);
      setAdjudicateClaim(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setAdjudicateError(err.message || 'Failed to update claim adjudication.');
    } finally {
      setIsAdjudicating(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      c.claimCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Insurance Claims & Adjudication</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track claims submitted to private health plans and update payer adjudication decisions.
          </p>
        </div>

        <button
          onClick={() => {
            setSubmitError(null);
            setIsSubmitOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Submit Claim
        </button>
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
          {(['ALL', 'Submitted', 'Approved', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All Claims' : status}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search provider, code, or patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No insurance claims match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200/60 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Claim ID</th>
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-5">Insurance Provider</th>
                  <th className="py-3.5 px-5">Policy Number</th>
                  <th className="py-3.5 px-5">Claim Amount</th>
                  <th className="py-3.5 px-5">Approved</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-semibold text-slate-900">{claim.claimCode}</td>
                    <td className="py-4 px-5 font-medium text-slate-800">{claim.patientName}</td>
                    <td className="py-4 px-5 text-slate-700">{claim.provider}</td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-500">{claim.policyNumber}</td>
                    <td className="py-4 px-5 font-bold text-slate-900">${claim.claimAmount.toLocaleString()}</td>
                    <td className="py-4 px-5 font-semibold text-emerald-600">
                      {claim.approvedAmount ? `$${claim.approvedAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        claim.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setAdjudicateClaim(claim);
                          setAdjudicateStatus(claim.status === 'Submitted' ? 'Approved' : claim.status);
                          setApprovedAmount(claim.approvedAmount || claim.claimAmount);
                          setAdjudicateRemarks(claim.remarks || '');
                          setAdjudicateError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors"
                      >
                        Adjudicate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Claim Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Submit Third-Party Insurance Claim</h3>
                  <p className="text-xs text-slate-500">Attach patient invoice and file for coverage</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubmitOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="mt-4 space-y-4 text-xs">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Patient</label>
                <select
                  value={claimPatientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Hospital Bill</label>
                <select
                  value={claimBillId}
                  onChange={(e) => handleBillSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {bills
                    .filter((b) => !claimPatientId || b.patientId === claimPatientId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.billCode} - Total: ${b.total} (Balance: ${b.balance})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Insurance Provider</label>
                <input
                  type="text"
                  placeholder="e.g. Aetna, UnitedHealthcare, Cigna"
                  value={claimProvider}
                  onChange={(e) => setClaimProvider(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy / Subscriber Number</label>
                <input
                  type="text"
                  placeholder="e.g. POL-7721-XYZ"
                  value={claimPolicyNumber}
                  onChange={(e) => setClaimPolicyNumber(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Claim Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Filing...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjudicate Status Modal */}
      {adjudicateClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Claim Adjudication</h3>
                  <p className="text-xs text-slate-500">{adjudicateClaim.claimCode} - {adjudicateClaim.provider}</p>
                </div>
              </div>
              <button 
                onClick={() => setAdjudicateClaim(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjudicateSubmit} className="mt-4 space-y-4 text-xs">
              {adjudicateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{adjudicateError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                <div className="text-slate-600">Patient: <span className="font-bold text-slate-800">{adjudicateClaim.patientName}</span></div>
                <div className="text-slate-600">Claimed Amount: <span className="font-bold text-slate-900">${adjudicateClaim.claimAmount.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjudication Decision</label>
                <select
                  value={adjudicateStatus}
                  onChange={(e) => setAdjudicateStatus(e.target.value as ClaimStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Approved">Approved (Insurer Paid)</option>
                  <option value="Rejected">Rejected (Claim Denied)</option>
                  <option value="Submitted">Pending Adjudication</option>
                </select>
              </div>

              {adjudicateStatus === 'Approved' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Approved Payer Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjudication Remarks / EOB Details</label>
                <textarea
                  rows={2}
                  placeholder="Notes from Explanation of Benefits (EOB)..."
                  value={adjudicateRemarks}
                  onChange={(e) => setAdjudicateRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjudicateClaim(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjudicating}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isAdjudicating ? 'Saving...' : 'Update Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingInsurancePage;
