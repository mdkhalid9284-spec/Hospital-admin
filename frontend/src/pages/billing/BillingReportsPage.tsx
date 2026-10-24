import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IBill, IInsuranceClaim } from '../../types';
import { 
  BarChart3, Download, Printer, DollarSign, CreditCard, 
  ShieldCheck, TrendingUp, Calendar, AlertTriangle, FileSpreadsheet
} from 'lucide-react';

export const BillingReportsPage: React.FC = () => {
  const [bills, setBills] = useState<IBill[]>([]);
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time filter
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | 'ALL'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [billsRes, claimsRes] = await Promise.all([
          apiClient.get('/bills'),
          apiClient.get('/insurance/claims'),
        ]);
        setBills((billsRes.data.data?.bills ?? billsRes.data.data) || []);
        setClaims((claimsRes.data.data?.claims ?? claimsRes.data.data) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to generate financial reports');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalBilled = bills.reduce((acc, b) => acc + (b.total || 0), 0);
  const totalCollected = bills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
  const totalReceivable = bills.reduce((acc, b) => acc + (b.balance || 0), 0);
  const totalClaimsApproved = claims
    .filter((c) => c.status === 'Approved')
    .reduce((acc, c) => acc + (c.approvedAmount || 0), 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  bills.forEach((b) => {
    b.items.forEach((item) => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });
  });

  const handleExportCSV = () => {
    const headers = ['Invoice Code', 'Patient Name', 'Date', 'Total', 'Paid', 'Balance', 'Status'];
    const rows = bills.map((b) => [
      b.billCode,
      `"${b.patientName}"`,
      new Date(b.createdAt).toISOString().split('T')[0],
      b.total.toFixed(2),
      b.amountPaid.toFixed(2),
      b.balance.toFixed(2),
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HospitalCare_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue & Financial Audits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile hospital billings, cash collections, receivables, and third-party reimbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Print Statement
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV Ledger
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Billed</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">${totalBilled.toLocaleString()}</div>
          <span className="text-xs text-slate-400 mt-1 block">Full revenue generated</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Realized Cash</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">${totalCollected.toLocaleString()}</div>
          <span className="text-xs text-slate-400 mt-1 block">
            {totalBilled > 0 ? `${((totalCollected / totalBilled) * 100).toFixed(1)}% recovery` : '0%'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">${totalReceivable.toLocaleString()}</div>
          <span className="text-xs text-slate-400 mt-1 block">Uncollected patient balances</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurer Recoveries</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">${totalClaimsApproved.toLocaleString()}</div>
          <span className="text-xs text-slate-400 mt-1 block">Adjudicated claim settlements</span>
        </div>
      </div>

      {/* Breakdown by Clinical Category */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Revenue by Clinical Service Category</h3>
        <p className="text-xs text-slate-400 mb-6">Distribution of invoiced charges across hospital departments</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(categoryTotals).map(([cat, amount]) => {
            const pct = totalBilled > 0 ? ((amount / totalBilled) * 100).toFixed(1) : '0';
            return (
              <div key={cat} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">{cat}</span>
                  <span className="text-lg font-bold text-slate-900 mt-1 block">${amount.toLocaleString()}</span>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(pct))}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block text-right font-medium">{pct}% of gross</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Hospital General Ledger Reconciliation</h3>
          <p className="text-xs text-slate-400 mt-0.5">Audited records of every financial movement and balance state</p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading ledger records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Ref Code</th>
                  <th className="py-3 px-5">Patient Account</th>
                  <th className="py-3 px-5">Recorded Date</th>
                  <th className="py-3 px-5">Subtotal</th>
                  <th className="py-3 px-5">Tax (5%)</th>
                  <th className="py-3 px-5">Gross</th>
                  <th className="py-3 px-5">Paid</th>
                  <th className="py-3 px-5">Receivable Balance</th>
                  <th className="py-3 px-5">Ledger Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">{b.billCode}</td>
                    <td className="py-3.5 px-5 font-medium text-slate-800">{b.patientName}</td>
                    <td className="py-3.5 px-5 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-5 text-slate-600">${b.subtotal.toFixed(2)}</td>
                    <td className="py-3.5 px-5 text-slate-500">+${b.tax.toFixed(2)}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">${b.total.toFixed(2)}</td>
                    <td className="py-3.5 px-5 font-semibold text-emerald-600">${b.amountPaid.toFixed(2)}</td>
                    <td className="py-3.5 px-5 font-bold text-amber-600">${b.balance.toFixed(2)}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                        b.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default BillingReportsPage;
