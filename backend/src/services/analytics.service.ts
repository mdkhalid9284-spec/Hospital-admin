import { db } from '../database/index.js';
import { addDays, rangeStartDate, toISODate } from '../utils/date.js';
import { AppError } from '../middlewares/errorHandler.js';

export const ANALYTICS_RANGES = ['7d', '30d', '90d', '1y'] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGES)[number];

export interface RevenueTrendPoint {
  label: string;
  date: string;
  billed: number;
  collected: number;
}

export interface OccupancyTrendPoint {
  label: string;
  date: string;
  occupiedBeds: number;
  totalBeds: number;
  occupancyRate: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  range: {
    key: AnalyticsRangeKey;
    fromDate: string;
    toDate: string;
    days: number;
  };
  totalPatients: number;
  newPatientsInRange: number;
  currentAdmissions: number;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  averageOccupancyRate: number;
  todayAppointments: number;
  appointmentsInRange: number;
  totalRevenue: number;
  grossBilled: number;
  pendingRevenue: number;
  pendingInsuranceClaims: number;
  insurerRecoveries: number;
  recentActivityCount: number;
  revenueTrend: RevenueTrendPoint[];
  bedOccupancyTrend: OccupancyTrendPoint[];
  consultationBreakdown: BreakdownItem[];
  appointmentStatusBreakdown: BreakdownItem[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const dayOf = (iso: string): string => toISODate(new Date(iso));
const inRange = (iso: string | null | undefined, from: string, to: string): boolean => {
  if (!iso) return false;
  const day = dayOf(iso);
  return day >= from && day <= to;
};

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date): string =>
  date.toLocaleString('en-US', { month: 'short', year: 'numeric' });

const dayLabel = (date: Date): string =>
  date.toLocaleString('en-US', { month: 'short', day: 'numeric' });

export class AnalyticsService {
  public static isValidRange(value: unknown): value is AnalyticsRangeKey {
    return typeof value === 'string' && (ANALYTICS_RANGES as readonly string[]).includes(value);
  }

  public static async getSummaryMetrics(rangeInput: string = '30d'): Promise<AnalyticsSummary> {
    if (!this.isValidRange(rangeInput)) {
      throw new AppError(
        `Unsupported analytics range '${rangeInput}'. Choose one of: ${ANALYTICS_RANGES.join(', ')}.`,
        400,
        'INVALID_ANALYTICS_RANGE'
      );
    }

    const { days, from, to } = rangeStartDate(rangeInput);
    const fromDate = toISODate(from);
    const toDate = toISODate(to);
    const todayDate = toISODate(new Date());

    // ---- Point-in-time inventory ----
    const totalPatients = db.patients.length;
    const newPatientsInRange = db.patients.filter((p) => inRange(p.createdAt, fromDate, toDate)).length;
    const currentAdmissions = db.admissions.filter((a) => a.status === 'Admitted').length;

    let totalBeds = 0;
    let availableBeds = 0;
    let occupiedBeds = 0;
    for (const ward of db.wards) {
      totalBeds += ward.totalBeds;
      availableBeds += ward.availableBeds;
      occupiedBeds += ward.occupiedBeds;
    }
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // ---- Appointments ----
    const appointmentsInRange = db.appointments.filter((a) =>
      inRange(`${a.appointmentDate}T12:00:00`, fromDate, toDate)
    );
    const todayAppointments = db.appointments.filter(
      (a) => a.appointmentDate === todayDate && a.status !== 'Cancelled'
    ).length;

    const statusCounts = new Map<string, number>();
    appointmentsInRange.forEach((a) => {
      statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
    });
    const appointmentStatusBreakdown: BreakdownItem[] = ['Confirmed', 'Pending', 'Completed', 'Cancelled']
      .map((status) => {
        const count = statusCounts.get(status) ?? 0;
        return {
          label: status,
          count,
          percentage: appointmentsInRange.length
            ? Math.round((count / appointmentsInRange.length) * 100)
            : 0,
        };
      });

    // ---- Consultations grouped by speciality (real appointment data) ----
    const specialityCounts = new Map<string, number>();
    for (const appointment of appointmentsInRange) {
      const doctor = db.doctors.find((d) => d.id === appointment.doctorId);
      const label = doctor?.specialization ?? 'General Medicine';
      specialityCounts.set(label, (specialityCounts.get(label) ?? 0) + 1);
    }
    const consultationBreakdown: BreakdownItem[] = Array.from(specialityCounts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: appointmentsInRange.length
          ? Math.round((count / appointmentsInRange.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ---- Financials (real persisted bills) ----
    const billsInRange = db.bills.filter((b) => inRange(b.createdAt, fromDate, toDate));
    const grossBilled = round2(billsInRange.reduce((sum, bill) => sum + bill.total, 0));
    const totalRevenue = round2(billsInRange.reduce((sum, bill) => sum + bill.amountPaid, 0));
    const pendingRevenue = round2(billsInRange.reduce((sum, bill) => sum + bill.balance, 0));

    const claimsInRange = db.insuranceClaims.filter((c) => inRange(c.submittedAt, fromDate, toDate));
    const pendingInsuranceClaims = claimsInRange.filter((c) => c.status === 'Submitted').length;
    // Use submittedAt so the figure reconciles exactly with the financial
    // reports, whose claim query is filtered by submission date.
    const insurerRecoveries = round2(
      claimsInRange
        .filter((c) => c.status === 'Approved')
        .reduce((sum, claim) => sum + (claim.approvedAmount ?? 0), 0)
    );

    const recentActivityCount = db.auditLogs.filter((log) =>
      inRange(log.timestamp, fromDate, toDate)
    ).length;

    // ---- Bucketing: daily for 7/30/90 days, monthly for a year ----
    const useMonthlyBuckets = days > 120;
    const revenueBuckets = new Map<string, RevenueTrendPoint>();
    const occupancyBuckets = new Map<string, { date: string; label: string; days: Date[] }>();

    if (useMonthlyBuckets) {
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cursor <= to) {
        const key = monthKey(cursor);
        const label = monthLabel(cursor);
        revenueBuckets.set(key, { label, date: key, billed: 0, collected: 0 });

        const bucketDays: Date[] = [];
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const firstDay = cursor < from ? from : new Date(cursor);
        const lastDay = monthEnd > to ? to : monthEnd;
        for (let d = new Date(firstDay); d <= lastDay; d = addDays(d, 1)) {
          bucketDays.push(new Date(d));
        }
        occupancyBuckets.set(key, { date: key, label, days: bucketDays });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) {
        const key = toISODate(cursor);
        revenueBuckets.set(key, {
          label: dayLabel(cursor),
          date: key,
          billed: 0,
          collected: 0,
        });
        occupancyBuckets.set(key, {
          date: key,
          label: dayLabel(cursor),
          days: [new Date(cursor)],
        });
      }
    }

    for (const bill of billsInRange) {
      const day = dayOf(bill.createdAt);
      const key = useMonthlyBuckets ? day.slice(0, 7) : day;
      const bucket = revenueBuckets.get(key);
      if (bucket) {
        bucket.billed = round2(bucket.billed + bill.total);
        bucket.collected = round2(bucket.collected + bill.amountPaid);
      }
    }

    const isAdmissionActiveOn = (
      admission: (typeof db.admissions)[number],
      date: string
    ): boolean => {
      const admitted = dayOf(admission.admissionDate);
      if (admitted > date) return false;
      if (admission.status === 'Discharged' && admission.dischargeDate) {
        return dayOf(admission.dischargeDate) >= date;
      }
      return admission.status === 'Admitted';
    };

    let occupancyRateTotal = 0;
    let occupancyDayCount = 0;
    const bedOccupancyTrend: OccupancyTrendPoint[] = [];

    for (const bucket of occupancyBuckets.values()) {
      let bucketOccupancySum = 0;
      for (const day of bucket.days) {
        const dayString = toISODate(day);
        const activeAdmissions = db.admissions.filter((admission) =>
          isAdmissionActiveOn(admission, dayString)
        ).length;
        const rate = totalBeds > 0 ? (Math.min(activeAdmissions, totalBeds) / totalBeds) * 100 : 0;
        bucketOccupancySum += rate;
        occupancyRateTotal += rate;
        occupancyDayCount += 1;
      }
      bedOccupancyTrend.push({
        label: bucket.label,
        date: bucket.date,
        occupiedBeds: bucket.days.length
          ? Math.round(
              (bucketOccupancySum / bucket.days.length / 100) * totalBeds
            )
          : 0,
        totalBeds,
        occupancyRate: bucket.days.length
          ? Math.round(bucketOccupancySum / bucket.days.length)
          : 0,
      });
    }

    const averageOccupancyRate = occupancyDayCount
      ? Math.round(occupancyRateTotal / occupancyDayCount)
      : 0;

    return {
      range: { key: rangeInput, fromDate, toDate, days },
      totalPatients,
      newPatientsInRange,
      currentAdmissions,
      totalBeds,
      availableBeds,
      occupiedBeds,
      occupancyRate,
      averageOccupancyRate,
      todayAppointments,
      appointmentsInRange: appointmentsInRange.length,
      totalRevenue,
      grossBilled,
      pendingRevenue,
      pendingInsuranceClaims,
      insurerRecoveries,
      recentActivityCount,
      revenueTrend: Array.from(revenueBuckets.values()),
      bedOccupancyTrend,
      consultationBreakdown,
      appointmentStatusBreakdown,
    };
  }
}
