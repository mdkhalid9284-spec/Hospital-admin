import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { IBill, IInsuranceClaim } from '../../types';
import {
  BarChart3,
  Download,
  Printer,
  DollarSign,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { addDays, formatDateShort, todayISO, toISODate } from '../../utils/date';

type TimeRange = '30D' | '90D' | 'ALL';

const RANGE_OPTIONS: Array<{ key: TimeRange; label: string; days: number | null }> = [
  { key: '30D', label: 'Last 30 Days', days: 30 },
  { key: '90D', label: 'Last 90 Days', days: 90 },
  { key: 'ALL', label: 'All Records', days: null },
];

const money = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const escapeCsv = (value: string | number): string => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadBlob = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const BillingReportsPage: React.FC = () => {
  const [bills, setBills] = useState<IBill[]>([]);
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  const rangeStart = useMemo(() => {
    const option = RANGE_OPTIONS.find((item) => item.key === timeRange);
    if (!option?.days) return null;
    return toISODate(addDays(new Date(`${todayISO()}T00:00:00`), -(option.days - 1)));
  }, [timeRange]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = rangeStart ? { from: rangeStart } : undefined;
      const [billsRes, claimsRes] = await Promise.all([
        apiClient.get('/bills', { params }),
        apiClient.get('/insurance/claims', { params }),
      ]);

      setBills(billsRes.data.data?.bills ?? []);
      setClaims(claimsRes.data.data?.claims ?? []);
    } catch (err: any) {
      setError(err.message || 'Unable to load financial records.');
      // Keep any previously loaded rows visible but never present zeroes as
      // genuine data when nothing has been loaded.
      setBills([]);
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, [rangeStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    const grossBilled = bills.reduce((sum, bill) => sum + bill.total, 0);
    const realizedCash = bills.reduce((sum, bill) => sum + bill.amountPaid, 0);
    const receivables = bills.reduce((sum, bill) => sum + bill.balance, 0);
    const insurerRecoveries = claims
      .filter((claim) => claim.status === 'Approved')
      .reduce((sum, claim) => sum + (claim.approvedAmount ?? 0), 0);

    return { grossBilled, realizedCash, receivables, insurerRecoveries };
  }, [bills, claims]);

  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const bill of bills) {
      for (const item of bill.items) {
        map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      }
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [bills]);

  const ledgerRows = useMemo(
    () =>
      [...bills].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bills]
  );

  const claimRows = useMemo(
    () => [...claims].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [claims]
  );

  const handleExportCsv = () => {
    const lines: string[] = [];
    const option = RANGE_OPTIONS.find((item) => item.key === timeRange);
    lines.push('HospitalCare Financial Ledger');
    lines.push(`Range,${option?.label ?? timeRange}`);
    lines.push(`From,${rangeStart ?? 'All records'}`);
    lines.push(`To,${todayISO()}`);
    lines.push('');
    lines.push('Summary,Amount');
    lines.push(`Gross Billed,${totals.grossBilled.toFixed(2)}`);
    lines.push(`Realized Cash,${totals.realizedCash.toFixed(2)}`);
    lines.push(`Receivables,${totals.receivables.toFixed(2)}`);
    lines.push(`Insurer Recoveries,${totals.insurerRecoveries.toFixed(2)}`);
    lines.push('');
    lines.push('Revenue by Service Category,Amount');
    categoryRevenue.forEach((row) => {
      lines.push(`"${row.category}",${row.amount.toFixed(2)}`);
    });
    lines.push('');
    lines.push('Invoice Ledger,Date,Patient,Subtotal,Tax,Discount,Total,Paid,Balance,Status');
    ledgerRows.forEach((bill) => {
      lines.push(
        [
          bill.billCode,
          bill.createdAt.slice(0, 10),
          bill.patientName,
          bill.subtotal.toFixed(2),
          bill.tax.toFixed(2),
          bill.discount.toFixed(2),
          bill.total.toFixed(2),
          bill.amountPaid.toFixed(2),
          bill.balance.toFixed(2),
          bill.status,
        ]
          .map(escapeCsv)
          .join(',')
      );
    });
    lines.push('');
    lines.push('Insurance Ledger,Submitted,Patient,Provider,Bill,Claimed,Approved,Status');
    claimRows.forEach((claim) => {
      const bill = bills.find((item) => item.id === claim.billId);
      lines.push(
        [
          claim.claimCode,
          claim.submittedAt.slice(0, 10),
          claim.patientName,
          claim.provider,
          bill?.billCode ?? claim.billId,
          claim.claimAmount.toFixed(2),
          (claim.approvedAmount ?? 0).toFixed(2),
          claim.status,
        ]
          .map(escapeCsv)
          .join(',')
      );
    });

    downloadBlob(
      `\uFEFF${lines.join('\r\n')}`,
      `hospitalcare-financial-ledger-${timeRange.toLowerCase()}-${todayISO()}.csv`
    );
  };

  const handlePrint = () => window.print();

  const showEmpty = !isLoading && !error && bills.length === 0 && claims.length === 0;

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Financial Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {rangeStart
              ? `${formatDateShort(new Date(`${rangeStart}T00:00:00`))} – ${formatDateShort(
                  new Date(`${todayISO()}T00:00:00`)
                )}`
              : 'All persisted invoices and insurance adjudications'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
            <Calendar size={13} className="text-slate-400" />
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as TimeRange)}
              aria-label="Report period"
              className="bg-transparent text-xs font-bold text-slate-700 outline-none"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || !!error || (bills.length === 0 && claims.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={14} /> Export CSV Ledger
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoading || !!error || (bills.length === 0 && claims.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Printer size={14} /> Print Statement
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            aria-label="Retry loading financial reports"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800">Financial reports unavailable</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
              <p className="text-[11px] text-red-600 mt-1">
                Figures are intentionally not shown because the request failed.
              </p>
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

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <div className="print-area space-y-5">
          {/* Print-only letterhead */}
          <div className="hidden print:block">
            <h2 className="text-xl font-bold text-slate-900">HospitalCare Financial Statement</h2>
            <p className="text-xs text-slate-500">
              Period: {rangeStart ?? 'All records'} to {todayISO()} · Generated{' '}
              {new Date().toLocaleString('en-US')}
            </p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Gross Billed',
                value: money(totals.grossBilled),
                hint: `${bills.length} invoice${bills.length === 1 ? '' : 's'}`,
                icon: DollarSign,
                tone: 'bg-sky-50 text-sky-700 border-sky-200',
              },
              {
                label: 'Realized Cash',
                value: money(totals.realizedCash),
                hint: 'Payments received against these invoices',
                icon: CreditCard,
                tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              {
                label: 'Receivables',
                value: money(totals.receivables),
                hint: 'Outstanding patient balances',
                icon: FileSpreadsheet,
                tone: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              {
                label: 'Insurer Recoveries',
                value: money(totals.insurerRecoveries),
                hint: `${claims.filter((claim) => claim.status === 'Approved').length} approved claim${
                  claims.filter((claim) => claim.status === 'Approved').length === 1 ? '' : 's'
                }`,
                icon: ShieldCheck,
                tone: 'bg-cyan-50 text-cyan-700 border-cyan-200',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {card.value}
                    </p>
                  </div>
                  <span className={`rounded-xl border p-2 ${card.tone}`}>
                    <card.icon size={17} />
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-500">{card.hint}</p>
              </div>
            ))}
          </div>

          {showEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <BarChart3 className="mx-auto mb-2 text-slate-300" size={28} />
              <p className="text-sm font-semibold text-slate-600">
                No financial records in this period
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Choose “All Records” or widen the reporting period.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Revenue by category */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Revenue by Service Category</h2>
              </div>

              {categoryRevenue.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No invoice line items in this period.
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryRevenue.map((row) => (
                    <div key={row.category}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">{row.category}</span>
                        <span className="font-bold text-slate-600">{money(row.amount)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${Math.max(
                              2,
                              (row.amount / Math.max(1, categoryRevenue[0].amount)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Claim summary */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan-600" />
                <h2 className="text-sm font-bold text-slate-900">Insurance Claim Position</h2>
              </div>

              {claims.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No insurance claims in this period.
                </p>
              ) : (
                <div className="space-y-2">
                  {(['Submitted', 'Approved', 'Rejected'] as const).map((status) => {
                    const group = claims.filter((claim) => claim.status === status);
                    const amount = group.reduce(
                      (sum, claim) =>
                        sum +
                        (status === 'Approved'
                          ? claim.approvedAmount ?? 0
                          : claim.claimAmount),
                      0
                    );
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-700">{status}</p>
                          <p className="text-[10px] text-slate-400">{group.length} claim(s)</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{money(amount)}</p>
                      </div>
                    );
                  })}
                  <p className="pt-1 text-[10px] text-slate-400">
                    Approved totals use the adjudicated approved amount; submitted/rejected
                    totals use the claimed amount.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Invoice ledger */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">General Ledger — Invoices</h2>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                {ledgerRows.length} row(s)
              </span>
            </div>

            {ledgerRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                No invoices in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-bold">Invoice</th>
                      <th className="px-4 py-2 font-bold">Date</th>
                      <th className="px-4 py-2 font-bold">Patient</th>
                      <th className="px-4 py-2 text-right font-bold">Total</th>
                      <th className="px-4 py-2 text-right font-bold">Paid</th>
                      <th className="px-4 py-2 text-right font-bold">Balance</th>
                      <th className="px-4 py-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerRows.map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-mono text-[11px] font-bold text-sky-700">
                          {bill.billCode}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {formatDateShort(new Date(`${bill.createdAt.slice(0, 10)}T00:00:00`))}
                        </td>
                        <td className="px-4 py-2 font-semibold text-slate-700">
                          {bill.patientName}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">
                          {money(bill.total)}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-700">
                          {money(bill.amountPaid)}
                        </td>
                        <td className="px-4 py-2 text-right text-amber-700">
                          {money(bill.balance)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              bill.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : bill.status === 'Partially Paid'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-[11px] uppercase">
                        Totals
                      </td>
                      <td className="px-4 py-2 text-right">{money(totals.grossBilled)}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">
                        {money(totals.realizedCash)}
                      </td>
                      <td className="px-4 py-2 text-right text-amber-700">
                        {money(totals.receivables)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Insurance ledger */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">General Ledger — Insurance</h2>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                {claimRows.length} row(s)
              </span>
            </div>

            {claimRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                No insurance claims in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-bold">Claim</th>
                      <th className="px-4 py-2 font-bold">Submitted</th>
                      <th className="px-4 py-2 font-bold">Patient</th>
                      <th className="px-4 py-2 font-bold">Provider</th>
                      <th className="px-4 py-2 text-right font-bold">Claimed</th>
                      <th className="px-4 py-2 text-right font-bold">Approved</th>
                      <th className="px-4 py-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claimRows.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-mono text-[11px] font-bold text-cyan-700">
                          {claim.claimCode}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {formatDateShort(
                            new Date(`${claim.submittedAt.slice(0, 10)}T00:00:00`)
                          )}
                        </td>
                        <td className="px-4 py-2 font-semibold text-slate-700">
                          {claim.patientName}
                        </td>
                        <td className="px-4 py-2 text-slate-500">{claim.provider}</td>
                        <td className="px-4 py-2 text-right text-slate-800">
                          {money(claim.claimAmount)}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-700">
                          {money(claim.approvedAmount ?? 0)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              claim.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : claim.status === 'Rejected'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-[11px] uppercase">
                        Total insurer recoveries
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700">
                        {money(totals.insurerRecoveries)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <p className="text-[10px] text-slate-400 print:hidden">
            Definitions: Gross Billed = sum of invoice totals; Realized Cash = payments
            recorded; Receivables = outstanding balances; Insurer Recoveries = approved claim
            amounts. All figures are computed from persisted records for the selected period.
          </p>
        </div>
      )}
    </div>
  );
};
