import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IBill, IInsuranceClaim, IAnalyticsSummary } from '../../types';
import { 
  DollarSign, CreditCard, Shield, TrendingUp, AlertTriangle, 
  CheckCircle, Clock, Plus, ArrowUpRight, FileText, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BillingDashboardPage: React.FC = () => {
  const [bills, setBills] = useState<IBill[]>([]);
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [summary, setSummary] = useState<IAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [billsRes, claimsRes, analyticsRes] = await Promise.all([
          apiClient.get('/bills'),
          apiClient.get('/insurance/claims'),
          apiClient.get('/analytics/summary'),
        ]);
        setBills((billsRes.data.data?.bills ?? billsRes.data.data) || []);
        setClaims((claimsRes.data.data?.claims ?? claimsRes.data.data) || []);
        setSummary(analyticsRes.data.data || null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch billing dashboard records');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBillingData();
  }, []);

  const totalBilled = bills.reduce((acc, b) => acc + (b.total || 0), 0);
  const totalCollections = bills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
  const totalOutstanding = bills.reduce((acc, b) => acc + (b.balance || 0), 0);
  const pendingClaimsCount = claims.filter((c) => c.status === 'Submitted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial & Revenue Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time accounts receivable, patient invoicing, collections, and insurer claims overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/portal/billing/invoices"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#0B3D20] text-white font-semibold text-sm shadow-md shadow-[#14532D]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
          <Link
            to="/portal/billing/insurance"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all"
          >
            <Shield className="w-4 h-4" /> Claims Queue
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Financial Cards — 3D dimensional surface */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue Billed */}
        <div className="hc-kpi flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Billed</span>
            <div className="w-9 h-9 rounded-xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold text-slate-900">${totalBilled.toLocaleString()}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{bills.length} active invoices</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Collections */}
        <div className="hc-kpi flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collections</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold text-emerald-600">${totalCollections.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-2">
              {totalBilled > 0 ? `${((totalCollections / totalBilled) * 100).toFixed(1)}% recovery rate` : '0% recovery'}
            </p>
          </div>
        </div>

        {/* Card 3: Receivables Outstanding */}
        <div className="hc-kpi flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Due</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold text-amber-600">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-2">
              {bills.filter((b) => b.status !== 'Paid').length} invoices awaiting payment
            </p>
          </div>
        </div>

        {/* Card 4: Pending Insurance Claims */}
        <div className="hc-kpi flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Claims</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold text-purple-600">{pendingClaimsCount}</div>
            <p className="text-xs text-slate-400 mt-2">
              ${claims.filter(c => c.status === 'Submitted').reduce((acc, c) => acc + c.claimAmount, 0).toLocaleString()} claimed value
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Recent Invoices & Claims Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Invoices & Payment Status</h2>
              <p className="text-xs text-slate-400">Latest inpatient and outpatient hospital charges</p>
            </div>
            <Link
              to="/portal/billing/invoices"
              className="text-xs font-semibold text-[#14532D] hover:text-[#0B3D20] flex items-center gap-1"
            >
              All Invoices <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading invoices...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No invoices recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">{b.billCode}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{b.patientName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">${b.total.toLocaleString()}</td>
                      <td className="py-3 px-3 font-semibold text-amber-600">${b.balance.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          b.status === 'Partially Paid' ? 'bg-[#EAF9D8] text-[#0B3D20]' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/portal/billing/invoices`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Pending Insurance Claims */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Claims for Adjudication</h2>
                <p className="text-xs text-slate-400">Insurer claims requiring staff review</p>
              </div>
              <Link
                to="/portal/billing/insurance"
                className="text-xs font-semibold text-[#14532D] hover:text-[#0B3D20]"
              >
                Review All
              </Link>
            </div>

            {claims.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No pending insurance claims.</div>
            ) : (
              <div className="space-y-3">
                {claims.slice(0, 4).map((claim) => (
                  <div key={claim.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{claim.claimCode}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                          claim.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">{claim.patientName} • {claim.provider}</p>
                      <p className="text-[11px] font-mono text-slate-400">POL: {claim.policyNumber}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">${claim.claimAmount.toLocaleString()}</span>
                      <Link
                        to="/portal/billing/insurance"
                        className="text-[11px] font-semibold text-[#14532D] hover:underline mt-1 inline-block"
                      >
                        Process
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-[#EAF9D8]/40 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#14532D]" /> HIPAA Billing & Audit Policy
            </h4>
            <p className="text-[11px] text-[#0B3D20] mt-1">
              Billing staff accounts have access strictly to demographics, financial statements, and insurance documents. Clinical notes and psychiatric histories remain encrypted and inaccessible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BillingDashboardPage;
