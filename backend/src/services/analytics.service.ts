import { db } from '../database/index.js';

export class AnalyticsService {
  public static async getSummaryMetrics(): Promise<{
    totalPatients: number;
    currentAdmissions: number;
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
    occupancyRate: number;
    todayAppointments: number;
    totalRevenue: number;
    pendingRevenue: number;
    pendingInsuranceClaims: number;
    recentActivityCount: number;
  }> {
    const totalPatients = db.patients.length;
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

    const todayDate = new Date().toISOString().split('T')[0];
    const todayAppointments = db.appointments.filter(
      (a) => a.appointmentDate === todayDate || a.status === 'Confirmed'
    ).length;

    let totalRevenue = 0;
    let pendingRevenue = 0;

    for (const bill of db.bills) {
      totalRevenue += bill.amountPaid;
      pendingRevenue += bill.balance;
    }

    const pendingInsuranceClaims = db.insuranceClaims.filter((c) => c.status === 'Submitted').length;
    const recentActivityCount = db.auditLogs.length;

    return {
      totalPatients,
      currentAdmissions,
      totalBeds,
      availableBeds,
      occupiedBeds,
      occupancyRate,
      todayAppointments,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      pendingInsuranceClaims,
      recentActivityCount,
    };
  }
}
