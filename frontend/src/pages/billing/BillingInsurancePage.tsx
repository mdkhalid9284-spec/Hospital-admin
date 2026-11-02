import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  IInsuranceClaim,
  IInsurancePolicy,
  IPatient,
  IBill,
  ClaimStatus,
} from '../../types';
import {
  Shield,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  Check,
  X,
  FileText,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import { formatDateShort, parseISODate } from '../../utils/date';

type Decision = 'Approved' | 'Rejected';

const money = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (status: ClaimStatus): string => {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const BillingInsurancePage: React.FC = () => {
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [policies, setPolicies] = useState<IInsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClaimStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit claim modal
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [claimPatientId, setClaimPatientId] = useState('');
  const [claimBillId, setClaimBillId] = useState('');
  const [claimProvider, setClaimProvider] = useState('');
  const [claimPolicyNumber, setClaimPolicyNumber] = useState('');
  const [claimPolicyId, setClaimPolicyId] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Adjudication modal
  const [actionClaim, setActionClaim] = useState<IInsuranceClaim | null>(null);
  const [decision, setDecision] = useState<Decision>('Approved');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isAdjudicating, setIsAdjudicating] = useState(false);

  const flash = (message: string): void => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [claimsRes, billsRes, patientsRes, policiesRes] = await Promise.all([
        apiClient.get('/insurance/claims'),
        apiClient.get('/bills'),
        apiClient.get('/patients'),
        apiClient.get('/insurance/policies'),
      ]);

      setClaims(claimsRes.data.data?.claims ?? []);
      setBills(billsRes.data.data?.bills ?? []);
      setPatients(patientsRes.data.data?.patients ?? []);
      setPolicies(policiesRes.data.data?.policies ?? []);
    } catch (err: any) {
      setError(err.message || 'Unable to load insurance claims.');
      setClaims([]);
      setBills([]);
      setPatients([]);
      setPolicies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const billById = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);

  const activeClaimBillIds = useMemo(
    () =>
      new Set(
        claims
          .filter((claim) => claim.status === 'Submitted' || claim.status === 'Approved')
          .map((claim) => claim.billId)
      ),
    [claims]
  );

  const filteredClaims = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return claims.filter((claim) => {
      if (statusFilter !== 'ALL' && claim.status !== statusFilter) return false;
      if (!query) return true;
      return [claim.claimCode, claim.patientName, claim.provider, claim.policyNumber]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [claims, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalClaimed = claims.reduce((sum, claim) => sum + claim.claimAmount, 0);
    const approved = claims
      .filter((claim) => claim.status === 'Approved')
      .reduce((sum, claim) => sum + (claim.approvedAmount ?? 0), 0);
    const pending = claims
      .filter((claim) => claim.status === 'Submitted')
      .reduce((sum, claim) => sum + claim.claimAmount, 0);
    const rejected = claims
      .filter((claim) => claim.status === 'Rejected')
      .reduce((sum, claim) => sum + claim.claimAmount, 0);
    return { totalClaimed, approved, pending, rejected };
  }, [claims]);

  const patientBills = useMemo(
    () => bills.filter((bill) => bill.patientId === claimPatientId),
    [bills, claimPatientId]
  );

  const patientPolicies = useMemo(
    () => policies.filter((policy) => policy.patientId === claimPatientId),
    [policies, claimPatientId]
  );

  const selectedBill = billById.get(claimBillId);

  const openSubmit = (): void => {
    const firstPatient = patients[0];
    setClaimPatientId(firstPatient?.id ?? '');
    setClaimBillId('');
    setClaimProvider('');
    setClaimPolicyNumber('');
    setClaimPolicyId('');
    setClaimAmount('');
    setClaimNotes('');
    setFormError(null);
    setIsSubmitOpen(true);
  };

  const handlePatientChange = (patientId: string): void => {
    setClaimPatientId(patientId);
    setClaimBillId('');
    setClaimProvider('');
    setClaimPolicyNumber('');
    setClaimPolicyId('');
    setClaimAmount('');
  };

  const handleBillChange = (billId: string): void => {
    setClaimBillId(billId);
    const bill = bills.find((item) => item.id === billId);
    if (bill) {
      setClaimAmount((bill.balance > 0 ? bill.balance : bill.total).toFixed(2));
    }
  };

  const handlePolicyChange = (policyId: string): void => {
    setClaimPolicyId(policyId);
    const policy = policies.find((item) => item.id === policyId);
    if (policy) {
      setClaimProvider(policy.provider);
      setClaimPolicyNumber(policy.policyNumber);
    }
  };

  const handleSubmitClaim = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    if (!claimPatientId) return setFormError('Select a patient.');
    if (!claimBillId) return setFormError('Select the invoice to claim against.');
    if (selectedBill && selectedBill.patientId !== claimPatientId) {
      return setFormError('The selected invoice does not belong to this patient.');
    }
    if (activeClaimBillIds.has(claimBillId)) {
      return setFormError('This invoice already has an active insurance claim.');
    }

    const amount = Number(claimAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setFormError('Claim amount must be greater than zero.');
    }
    if (selectedBill && amount > selectedBill.total + 0.001) {
      return setFormError(
        `Claim amount cannot exceed the invoice total of ${money(selectedBill.total)}.`
      );
    }
    if (claimProvider.trim().length < 2) {
      return setFormError('Insurance provider is required.');
    }
    if (claimPolicyNumber.trim().length < 3) {
      return setFormError('A valid policy number is required.');
    }

    try {
      setSubmitting(true);
      await apiClient.post('/insurance/claims', {
        patientId: claimPatientId,
        billId: claimBillId,
        provider: claimProvider.trim(),
        policyNumber: claimPolicyNumber.trim(),
        claimAmount: amount,
        remarks: claimNotes.trim() || undefined,
      });
      setIsSubmitOpen(false);
      flash('Insurance claim submitted and persisted.');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Unable to submit the claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjudication = (claim: IInsuranceClaim): void => {
    setActionClaim(claim);
    setDecision('Approved');
    setApprovedAmount(claim.claimAmount.toFixed(2));
    setDecisionNotes('');
    setFormError(null);
  };

  const handleAdjudicate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!actionClaim) return;
    setFormError(null);

    const amount = Number(approvedAmount);
    if (decision === 'Approved') {
      if (!Number.isFinite(amount) || amount <= 0) {
        return setFormError('Approved amount must be greater than zero.');
      }
      if (amount > actionClaim.claimAmount + 0.001) {
        return setFormError(
          `Approved amount cannot exceed the claimed amount of ${money(
            actionClaim.claimAmount
          )}.`
        );
      }
    }
    if (decision === 'Rejected' && decisionNotes.trim().length < 3) {
      return setFormError('Adjudication notes are required when rejecting a claim.');
    }

    try {
      setIsAdjudicating(true);
      await apiClient.patch(`/insurance/claims/${actionClaim.id}/status`, {
        status: decision,
        approvedAmount: decision === 'Approved' ? amount : 0,
        remarks: decisionNotes.trim() || undefined,
      });
      setActionClaim(null);
      flash(`Claim ${actionClaim.claimCode} marked ${decision}.`);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Unable to update the claim.');
    } finally {
      setIsAdjudicating(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Insurance Claims
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Submit, track and adjudicate claims against persisted patient invoices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            aria-label="Refresh claims"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openSubmit}
            disabled={patients.length === 0 || bills.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#14532D] px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <Plus size={14} /> Submit Claim
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          <CheckCircle size={16} className="shrink-0 text-emerald-600" /> {successMsg}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800">Claims could not be loaded</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Total Claimed',
            value: money(stats.totalClaimed),
            hint: `${claims.length} claim(s)`,
            tone: 'bg-[#EAF9D8] text-[#0B3D20] border-sky-200',
            icon: DollarSign,
          },
          {
            label: 'Approved Recoveries',
            value: money(stats.approved),
            hint: `${claims.filter((claim) => claim.status === 'Approved').length} approved`,
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: Shield,
          },
          {
            label: 'Pending Review',
            value: money(stats.pending),
            hint: `${claims.filter((claim) => claim.status === 'Submitted').length} submitted`,
            tone: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: Clock,
          },
          {
            label: 'Rejected',
            value: money(stats.rejected),
            hint: `${claims.filter((claim) => claim.status === 'Rejected').length} rejected`,
            tone: 'bg-red-50 text-red-700 border-red-200',
            icon: X,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{card.hint}</p>
              </div>
              <span className={`rounded-xl border p-2 ${card.tone}`}>
                <card.icon size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          {(['ALL', 'Submitted', 'Approved', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reference, provider or patient…"
            aria-label="Search insurance claims"
            className="hc-input w-full py-2 pl-8 pr-3 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Shield className="mx-auto mb-2 text-slate-300" size={30} />
            <p className="text-sm font-semibold text-slate-600">
              {claims.length === 0 ? 'No insurance claims yet' : 'No claims match your filters'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {claims.length === 0
                ? 'Submit a claim against a patient invoice to get started.'
                : 'Adjust the status filter or search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Reference</th>
                  <th className="px-4 py-2.5 font-bold">Patient</th>
                  <th className="px-4 py-2.5 font-bold">Provider / Policy</th>
                  <th className="px-4 py-2.5 font-bold">Invoice</th>
                  <th className="px-4 py-2.5 text-right font-bold">Claimed</th>
                  <th className="px-4 py-2.5 text-right font-bold">Approved</th>
                  <th className="px-4 py-2.5 font-bold">Submitted</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => {
                  const bill = billById.get(claim.billId);
                  const patient = patientById.get(claim.patientId);
                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-mono text-[11px] font-bold text-[#0B3D20]">
                          {claim.claimCode}
                        </p>
                        {claim.remarks && (
                          <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-slate-400">
                            {claim.remarks}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{claim.patientName}</p>
                        <p className="text-[10px] text-slate-400">
                          {patient?.patientCode ?? claim.patientId}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">{claim.provider}</p>
                        <p className="text-[10px] text-slate-400">{claim.policyNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-[11px] font-semibold text-slate-600">
                          {bill?.billCode ?? claim.billId}
                        </p>
                        {bill && (
                          <p className="text-[10px] text-slate-400">
                            Invoice {money(bill.total)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {money(claim.claimAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {claim.status === 'Approved' ? money(claim.approvedAmount ?? 0) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateShort(parseISODate(claim.submittedAt))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(
                            claim.status
                          )}`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {claim.status === 'Submitted' ? (
                          <button
                            type="button"
                            onClick={() => openAdjudication(claim)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-[#EAF9D8] px-2.5 py-1.5 text-[10px] font-bold text-[#0B3D20] hover:bg-sky-100"
                          >
                            <FileText size={12} /> Adjudicate
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {claim.adjudicatedAt
                              ? `Closed ${formatDateShort(parseISODate(claim.adjudicatedAt))}`
                              : 'Closed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Claim Modal */}
      <Modal open={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} width="max-w-2xl">
        <ModalHeader
          title="Submit Insurance Claim"
          subtitle="Populated from authorized patient and invoice records"
          onClose={() => setIsSubmitOpen(false)}
        />
        <form onSubmit={handleSubmitClaim} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Patient *">
              <select
                required
                value={claimPatientId}
                onChange={(event) => handlePatientChange(event.target.value)}
                className={inputCls}
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} ({patient.patientCode})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Invoice *">
              <select
                required
                value={claimBillId}
                onChange={(event) => handleBillChange(event.target.value)}
                className={inputCls}
                disabled={!claimPatientId}
              >
                <option value="">
                  {patientBills.length === 0 ? 'No invoices for this patient' : 'Select invoice'}
                </option>
                {patientBills.map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.billCode} · {money(bill.total)} · balance {money(bill.balance)}
                    {activeClaimBillIds.has(bill.id) ? ' · already claimed' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Registered Policy (optional)">
            <select
              value={claimPolicyId}
              onChange={(event) => handlePolicyChange(event.target.value)}
              className={inputCls}
              disabled={!claimPatientId || patientPolicies.length === 0}
            >
              <option value="">
                {patientPolicies.length === 0
                  ? 'No registered policy — enter details below'
                  : 'Select a registered policy'}
              </option>
              {patientPolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.provider} · {policy.policyNumber}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Insurance Provider *">
              <input
                required
                value={claimProvider}
                onChange={(event) => setClaimProvider(event.target.value)}
                placeholder="e.g. Blue Cross"
                className={inputCls}
              />
            </Field>
            <Field label="Policy Number *">
              <input
                required
                value={claimPolicyNumber}
                onChange={(event) => setClaimPolicyNumber(event.target.value)}
                placeholder="e.g. BCBS-9948201-IL"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Claim Amount (USD) *">
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={selectedBill?.total}
              required
              value={claimAmount}
              onChange={(event) => setClaimAmount(event.target.value)}
              className={inputCls}
            />
            {selectedBill && (
              <p className="mt-1 text-[10px] text-slate-400">
                Invoice total {money(selectedBill.total)} · outstanding balance{' '}
                {money(selectedBill.balance)}
              </p>
            )}
          </Field>

          <Field label="Notes (optional)">
            <textarea
              rows={3}
              value={claimNotes}
              onChange={(event) => setClaimNotes(event.target.value)}
              placeholder="Supporting information for the insurer…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSubmitOpen(false)}
              className="hc-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="hc-btn-blue">
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjudication Modal */}
      <Modal open={!!actionClaim} onClose={() => setActionClaim(null)}>
        <ModalHeader
          title={`Adjudicate ${actionClaim?.claimCode ?? 'Claim'}`}
          subtitle="Submitted → Approved / Rejected (terminal states)"
          onClose={() => setActionClaim(null)}
        />
        {actionClaim && (
          <form onSubmit={handleAdjudicate} className="space-y-4 p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-semibold text-slate-800">{actionClaim.patientName}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Provider</span>
                <span className="font-semibold text-slate-800">{actionClaim.provider}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Claimed amount</span>
                <span className="font-bold text-slate-900">
                  {money(actionClaim.claimAmount)}
                </span>
              </div>
            </div>

            <Field label="Decision *">
              <div className="grid grid-cols-2 gap-2">
                {(['Approved', 'Rejected'] as Decision[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecision(option)}
                    aria-pressed={decision === option}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      decision === option
                        ? option === 'Approved'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-red-300 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option === 'Approved' ? (
                      <Check size={14} className="mr-1 inline" />
                    ) : (
                      <X size={14} className="mr-1 inline" />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </Field>

            {decision === 'Approved' && (
              <Field label="Approved Amount (USD) *">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={actionClaim.claimAmount}
                  required
                  value={approvedAmount}
                  onChange={(event) => setApprovedAmount(event.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            <Field label={decision === 'Rejected' ? 'Rejection Notes *' : 'Adjudication Notes'}>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(event) => setDecisionNotes(event.target.value)}
                placeholder={
                  decision === 'Rejected'
                    ? 'Explain why the claim was rejected…'
                    : 'Optional notes for the audit trail…'
                }
                className={`${inputCls} resize-none`}
              />
            </Field>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
              >
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActionClaim(null)}
                className="hc-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={isAdjudicating} className="hc-btn-blue">
                {isAdjudicating ? 'Recording…' : `Mark ${decision}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
