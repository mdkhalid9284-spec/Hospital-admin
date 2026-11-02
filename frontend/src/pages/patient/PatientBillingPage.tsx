import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { IBill, IInsuranceClaim } from '../../types';
import { 
  CreditCard, Shield, FileText, CheckCircle, AlertTriangle, 
  Clock, DollarSign, PlusCircle, Printer, X, Download
} from 'lucide-react';

export const PatientBillingPage: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<IBill[]>([]);
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected bill for detailed / printable view
  const [selectedBill, setSelectedBill] = useState<IBill | null>(null);

  // Insurance claim modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimBillId, setClaimBillId] = useState('');
  const [claimProvider, setClaimProvider] = useState('');
  const [claimPolicyNumber, setClaimPolicyNumber] = useState('');
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [claimRemarks, setClaimRemarks] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.patientId) return;
    try {
      setIsLoading(true);
      setError(null);
      const [billsRes, claimsRes] = await Promise.all([
        apiClient.get(`/bills/patient/${user.patientId}`),
        apiClient.get(`/insurance/patient/${user.patientId}`),
      ]);
      setBills((billsRes.data.data?.bills ?? billsRes.data.data) || []);
      setClaims((claimsRes.data.data?.claims ?? claimsRes.data.data) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing and insurance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.patientId]);

  const handleOpenClaimModal = (bill?: IBill) => {
    if (bill) {
      setClaimBillId(bill.id);
      setClaimAmount(bill.balance > 0 ? bill.balance : bill.total);
    } else if (bills.length > 0) {
      setClaimBillId(bills[0].id);
      setClaimAmount(bills[0].balance > 0 ? bills[0].balance : bills[0].total);
    }
    setClaimError(null);
    setIsClaimModalOpen(true);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.patientId || !claimBillId || !claimProvider || !claimPolicyNumber || claimAmount <= 0) {
      setClaimError('Please provide all required claim details and a valid claim amount.');
      return;
    }

    try {
      setIsSubmittingClaim(true);
      setClaimError(null);

      await apiClient.post('/insurance/claims', {
        patientId: user.patientId,
        billId: claimBillId,
        provider: claimProvider.trim(),
        policyNumber: claimPolicyNumber.trim(),
        claimAmount: Number(claimAmount),
        remarks: claimRemarks.trim() || undefined,
      });

      setSuccessMsg('Insurance claim filed successfully and is currently under review.');
      setIsClaimModalOpen(false);
      setClaimProvider('');
      setClaimPolicyNumber('');
      setClaimRemarks('');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit insurance claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const totalBilled = bills.reduce((acc, b) => acc + (b.total || 0), 0);
  const totalPaid = bills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
  const totalOutstanding = bills.reduce((acc, b) => acc + (b.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Insurance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review invoices, payment history, and track insurance claims in real-time.
          </p>
        </div>

        <button
          onClick={() => handleOpenClaimModal()}
          disabled={bills.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#0B3D20] text-white font-medium shadow-md shadow-[#14532D]/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" /> File Insurance Claim
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

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">${totalBilled.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-1">{bills.length} total generated invoices</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">${totalPaid.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-1">Processed hospital receipts</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Due</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold mt-2 ${totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            ${totalOutstanding.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">{totalOutstanding > 0 ? 'Action required' : 'All clear'}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Claims Filed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{claims.length}</div>
          <p className="text-xs text-slate-400 mt-1">
            {claims.filter(c => c.status === 'Submitted').length} pending adjudication
          </p>
        </div>
      </div>

      {/* Itemized Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Hospital Invoices & Receipts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Official statement of clinical charges and bed stays</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading your invoices...</div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-700">No invoices on record</p>
            <p className="text-xs text-slate-400 mt-1">You have no active billing charges.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200/60 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Invoice Code</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Items Breakdown</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Paid</th>
                  <th className="py-3.5 px-5">Balance</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-medium text-slate-900">{bill.billCode}</td>
                    <td className="py-4 px-5 text-slate-600">{new Date(bill.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-5 text-slate-700 max-w-xs truncate">
                      {bill.items.map(i => `${i.description} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-900">${bill.total.toLocaleString()}</td>
                    <td className="py-4 px-5 text-emerald-600 font-medium">${bill.amountPaid.toLocaleString()}</td>
                    <td className="py-4 px-5 font-semibold text-amber-600">${bill.balance.toLocaleString()}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        bill.status === 'Partially Paid' ? 'bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75]' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> View
                      </button>
                      {bill.balance > 0 && (
                        <button
                          onClick={() => handleOpenClaimModal(bill)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAF9D8] hover:bg-blue-100 text-[#0B3D20] text-xs font-semibold transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5" /> Claim
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insurance Claims Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Insurance Claims History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Third-party payer claims submitted for this patient</p>
          </div>
        </div>

        {claims.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No insurance claims have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200/60 font-semibold">
                <tr>
                  <th className="py-3 px-5">Claim ID</th>
                  <th className="py-3 px-5">Provider</th>
                  <th className="py-3 px-5">Policy Number</th>
                  <th className="py-3 px-5">Claim Amount</th>
                  <th className="py-3 px-5">Approved Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-900">{claim.claimCode}</td>
                    <td className="py-3.5 px-5 font-medium text-slate-800">{claim.provider}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600">{claim.policyNumber}</td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">${claim.claimAmount.toLocaleString()}</td>
                    <td className="py-3.5 px-5 font-semibold text-emerald-600">
                      {claim.approvedAmount ? `$${claim.approvedAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        claim.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500 max-w-xs truncate">{claim.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Printable Bill Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Hospital Care Invoice</h3>
                  <p className="text-xs font-mono text-slate-400">REF: {selectedBill.billCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">Billed To</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedBill.patientName}</span>
                  <span className="text-slate-500 font-mono mt-0.5 block">ID: {selectedBill.patientId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">Invoice Date</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {new Date(selectedBill.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedBill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBill.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 px-4 text-slate-500">{item.category}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedBill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%):</span>
                  <span>+${selectedBill.tax.toFixed(2)}</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-${selectedBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Amount:</span>
                  <span>${selectedBill.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-600 font-semibold">${selectedBill.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200/60 pt-1">
                  <span>Remaining Balance:</span>
                  <span className="text-amber-600">${selectedBill.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">File Insurance Claim</h3>
                  <p className="text-xs text-slate-500">Submit an adjudication claim to your insurer</p>
                </div>
              </div>
              <button 
                onClick={() => setIsClaimModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="mt-4 space-y-4 text-xs">
              {claimError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Bill to Claim</label>
                <select
                  value={claimBillId}
                  onChange={(e) => {
                    setClaimBillId(e.target.value);
                    const b = bills.find(x => x.id === e.target.value);
                    if (b) setClaimAmount(b.balance > 0 ? b.balance : b.total);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billCode} - Total: ${b.total} (Balance: ${b.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Insurance Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g. BlueCross Health / MetLife / Cigna"
                  value={claimProvider}
                  onChange={(e) => setClaimProvider(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy / Member ID</label>
                <input
                  type="text"
                  placeholder="e.g. POL-98234-XYZ"
                  value={claimPolicyNumber}
                  onChange={(e) => setClaimPolicyNumber(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Diagnosis Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional coverage codes or instructions..."
                  value={claimRemarks}
                  onChange={(e) => setClaimRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isSubmittingClaim ? 'Filing Claim...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientBillingPage;
