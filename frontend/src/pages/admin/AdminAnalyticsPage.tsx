import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { IAnalyticsSummary } from '../../types';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  BedDouble,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';

type RangeKey = '7d' | '30d' | '90d' | '1y';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '1y', label: '1Y' },
];

const money = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compactMoney = (value: number): string =>
  value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`;

const escapeCsv = (value: string | number): string => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const AdminAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<IAnalyticsSummary | null>(null);
  const [dateRange, setDateRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: RangeKey) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/analytics/summary', { params: { range } });
      setMetrics(res.data.data);
    } catch (err: any) {
      setMetrics(null);
      setError(err.message || 'Unable to load analytics for the selected period.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateRange);
  }, [dateRange, load]);

  const rangeLabel = metrics
    ? `${metrics.range.fromDate} → ${metrics.range.toDate}`
    : `${dateRange.toUpperCase()} period`;

  const maxRevenue = useMemo(() => {
    if (!metrics?.revenueTrend?.length) return 1;
    return Math.max(
      1,
      ...metrics.revenueTrend.map((point) => Math.max(point.billed, point.collected))
    );
  }, [metrics]);

  const maxOccupancy = useMemo(() => {
    if (!metrics?.bedOccupancyTrend?.length) return 1;
    return Math.max(1, ...metrics.bedOccupancyTrend.map((point) => point.occupancyRate));
  }, [metrics]);

  const handleExport = () => {
    if (!metrics) return;

    const lines: string[] = [];
    lines.push('HospitalCare Analytics Report');
    lines.push(`Range,${metrics.range.key}`);
    lines.push(`From,${metrics.range.fromDate}`);
    lines.push(`To,${metrics.range.toDate}`);
    lines.push('');
    lines.push('KPI,Value');
    lines.push(`Gross Billed,${metrics.grossBilled.toFixed(2)}`);
    lines.push(`Realized Cash,${metrics.totalRevenue.toFixed(2)}`);
    lines.push(`Receivables,${metrics.pendingRevenue.toFixed(2)}`);
    lines.push(`Insurer Recoveries,${metrics.insurerRecoveries.toFixed(2)}`);
    lines.push(`Average Bed Occupancy %,${metrics.averageOccupancyRate}`);
    lines.push(`Appointments in Range,${metrics.appointmentsInRange}`);
    lines.push(`Today's Appointments,${metrics.todayAppointments}`);
    lines.push(`New Patients in Range,${metrics.newPatientsInRange}`);
    lines.push(`Pending Insurance Claims,${metrics.pendingInsuranceClaims}`);
    lines.push('');
    lines.push('Revenue Trend,Date,Billed,Collected');
    metrics.revenueTrend.forEach((point) => {
      lines.push(`"${point.label}",${point.date},${point.billed.toFixed(2)},${point.collected.toFixed(2)}`);
    });
    lines.push('');
    lines.push('Bed Occupancy Trend,Date,Occupied Beds,Total Beds,Occupancy %');
    metrics.bedOccupancyTrend.forEach((point) => {
      lines.push(
        `"${point.label}",${point.date},${point.occupiedBeds},${point.totalBeds},${point.occupancyRate}`
      );
    });
    lines.push('');
    lines.push('Consultation Breakdown,Count,Share %');
    metrics.consultationBreakdown.forEach((item) => {
      lines.push(`"${item.label}",${item.count},${item.percentage}`);
    });
    lines.push('');
    lines.push('Appointment Status,Count,Share %');
    metrics.appointmentStatusBreakdown.forEach((item) => {
      lines.push(`"${item.label}",${item.count},${item.percentage}`);
    });

    const header = lines
      .slice(0, 5)
      .map((line) => line.split(',').map(escapeCsv).join(','));
    const body = lines.slice(5).map((line) =>
      line.includes('"')
        ? line
        : line
            .split(',')
            .map((cell) => escapeCsv(cell))
            .join(',')
    );

    const csv = `\uFEFF${[...header, ...body].join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospitalcare-analytics-${metrics.range.key}-${metrics.range.fromDate}_to_${metrics.range.toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Analytics &amp; Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {loading ? 'Loading live hospital metrics…' : `Showing ${rangeLabel}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setDateRange(option.key)}
                aria-pressed={dateRange === option.key}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  dateRange === option.key
                    ? 'bg-[#14532D] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!metrics || loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={14} /> Export Report
          </button>

          <button
            type="button"
            onClick={() => load(dateRange)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Error state — never render zeroes as genuine data */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800">Could not load analytics</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(dateRange)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {metrics && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Gross Billed',
                value: money(metrics.grossBilled),
                hint: `${metrics.revenueTrend.length} trend buckets`,
                icon: DollarSign,
                tone: 'bg-[#EAF9D8] text-[#0B3D20] border-sky-200',
              },
              {
                label: 'Realized Cash',
                value: money(metrics.totalRevenue),
                hint: `Receivables ${money(metrics.pendingRevenue)}`,
                icon: Receipt,
                tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              {
                label: 'Avg Bed Occupancy',
                value: `${metrics.averageOccupancyRate}%`,
                hint: `${metrics.occupiedBeds} of ${metrics.totalBeds} beds now`,
                icon: BedDouble,
                tone: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              {
                label: 'Appointments',
                value: String(metrics.appointmentsInRange),
                hint: `${metrics.todayAppointments} today · ${metrics.newPatientsInRange} new patients`,
                icon: Calendar,
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

          {/* Secondary roll-up */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Insurer Recoveries',
                value: money(metrics.insurerRecoveries),
                icon: ShieldCheck,
              },
              {
                label: 'Pending Claims',
                value: String(metrics.pendingInsuranceClaims),
                icon: ShieldCheck,
              },
              {
                label: 'Current Admissions',
                value: String(metrics.currentAdmissions),
                icon: BedDouble,
              },
              {
                label: 'Audit Events',
                value: String(metrics.recentActivityCount),
                icon: Users,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <item.icon size={15} className="text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-slate-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {metrics.appointmentsInRange === 0 && metrics.grossBilled === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <BarChart3 className="mx-auto mb-2 text-slate-300" size={26} />
              <p className="text-sm font-semibold text-slate-600">
                No activity recorded in this period
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try a wider range such as 90D or 1Y.
              </p>
            </div>
          )}

          {/* Revenue trend */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#14532D]" />
                <h2 className="text-sm font-bold text-slate-900">Revenue Trend</h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-sky-200" /> Billed
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-[#14532D]" /> Collected
                </span>
              </div>
            </div>

            {metrics.revenueTrend.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No billing records in this period.</p>
            ) : (
              <div className="overflow-x-auto pb-1">
                <div
                  className="flex h-44 items-end gap-1"
                  style={{ minWidth: Math.max(320, metrics.revenueTrend.length * 22) }}
                >
                  {metrics.revenueTrend.map((point) => (
                    <div
                      key={point.date}
                      className="group flex h-full min-w-[10px] flex-1 flex-col justify-end"
                      title={`${point.label}: billed ${money(point.billed)}, collected ${money(
                        point.collected
                      )}`}
                    >
                      <div className="flex h-full items-end gap-[2px]">
                        <div
                          className="flex-1 rounded-t bg-sky-200 transition-all group-hover:bg-sky-300"
                          style={{ height: `${Math.max(2, (point.billed / maxRevenue) * 100)}%` }}
                        />
                        <div
                          className="flex-1 rounded-t bg-[#14532D] transition-all group-hover:bg-sky-700"
                          style={{
                            height: `${Math.max(2, (point.collected / maxRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="mt-1 truncate text-center text-[8px] font-medium text-slate-400">
                        {metrics.revenueTrend.length <= 12
                          ? point.label
                          : point.label.split(' ')[1] ?? point.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Bed occupancy trend */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <BedDouble size={16} className="text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Bed Occupancy Breakdown</h2>
              </div>

              {metrics.bedOccupancyTrend.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No occupancy data.</p>
              ) : (
                <div className="space-y-2.5">
                  {metrics.bedOccupancyTrend.slice(-10).map((point) => (
                    <div key={point.date} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-[10px] font-semibold text-slate-500">
                        {point.label}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${Math.max(
                              2,
                              (point.occupancyRate / Math.max(1, maxOccupancy)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-[10px] font-bold text-slate-600">
                        {point.occupiedBeds}/{point.totalBeds} · {point.occupancyRate}%
                      </span>
                    </div>
                  ))}
                  {metrics.bedOccupancyTrend.length > 10 && (
                    <p className="pt-1 text-[10px] text-slate-400">
                      Showing the most recent 10 of {metrics.bedOccupancyTrend.length} buckets.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Consultation breakdown */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-600" />
                <h2 className="text-sm font-bold text-slate-900">Consultation Breakdown</h2>
              </div>

              {metrics.consultationBreakdown.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No consultations recorded in this period.
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.consultationBreakdown.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="font-bold text-slate-500">
                          {item.count} · {item.percentage}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.max(2, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Appointment status mix
                </p>
                <div className="flex flex-wrap gap-2">
                  {metrics.appointmentStatusBreakdown.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {item.label}: {item.count}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
