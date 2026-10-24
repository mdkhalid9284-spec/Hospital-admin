import { db } from '../database/index.js';
import { IWard, IBed, BedStatus } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class BedService {
  public static async getBedBoard(): Promise<{
    wards: IWard[];
    stats: { totalBeds: number; availableBeds: number; occupiedBeds: number; occupancyRate: number };
  }> {
    const wards = db.wards;
    let totalBeds = 0;
    let availableBeds = 0;
    let occupiedBeds = 0;

    for (const ward of wards) {
      totalBeds += ward.totalBeds;
      availableBeds += ward.availableBeds;
      occupiedBeds += ward.occupiedBeds;
    }

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      wards,
      stats: { totalBeds, availableBeds, occupiedBeds, occupancyRate },
    };
  }

  public static async findBed(
    wardId: string,
    roomNumber: string,
    bedNumber: string
  ): Promise<{ ward: IWard; bed: IBed }> {
    const ward = db.wards.find((w) => w.id === wardId);
    if (!ward) {
      throw new AppError(`Ward '${wardId}' not found.`, 404, 'WARD_NOT_FOUND');
    }

    const room = ward.rooms.find((r) => r.roomNumber === roomNumber);
    if (!room) {
      throw new AppError(`Room '${roomNumber}' in ward '${ward.name}' not found.`, 404, 'ROOM_NOT_FOUND');
    }

    const bed = room.beds.find((b) => b.bedNumber === bedNumber);
    if (!bed) {
      throw new AppError(`Bed '${bedNumber}' in room '${roomNumber}' not found.`, 404, 'BED_NOT_FOUND');
    }

    return { ward, bed };
  }

  /**
   * Concurrency-safe atomic bed allocation
   */
  public static async allocateBed(
    wardId: string,
    roomNumber: string,
    bedNumber: string,
    patientId: string,
    patientName: string,
    admissionId: string,
    actor: { id: string; name: string; role: any }
  ): Promise<IBed> {
    const { ward, bed } = await this.findBed(wardId, roomNumber, bedNumber);

    if (bed.status !== 'Available') {
      throw new AppError(
        `Bed '${bedNumber}' is currently ${bed.status} and cannot be allocated.`,
        409,
        'BED_UNAVAILABLE'
      );
    }

    // Atomic status update
    bed.status = 'Occupied';
    bed.currentPatientId = patientId;
    bed.currentPatientName = patientName;
    bed.currentAdmissionId = admissionId;
    bed.allocatedAt = new Date().toISOString();

    // Recalculate ward counts
    ward.availableBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Available').length;
    ward.occupiedBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Occupied').length;

    logAuditEvent(actor, 'BED_ALLOCATED', 'Bed', bed.bedNumber, 'SUCCESS', undefined, {
      wardId,
      roomNumber,
      patientId,
      admissionId,
    });

    return bed;
  }

  /**
   * Concurrency-safe atomic bed release
   */
  public static async releaseBed(
    wardId: string,
    roomNumber: string,
    bedNumber: string,
    actor: { id: string; name: string; role: any }
  ): Promise<IBed> {
    const { ward, bed } = await this.findBed(wardId, roomNumber, bedNumber);

    bed.status = 'Available';
    bed.currentPatientId = null;
    bed.currentPatientName = null;
    bed.currentAdmissionId = null;
    bed.allocatedAt = null;

    // Recalculate ward counts
    ward.availableBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Available').length;
    ward.occupiedBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Occupied').length;

    logAuditEvent(actor, 'BED_RELEASED', 'Bed', bed.bedNumber, 'SUCCESS', undefined, {
      wardId,
      roomNumber,
    });

    return bed;
  }

  public static async updateStatus(
    wardId: string,
    roomNumber: string,
    bedNumber: string,
    status: BedStatus,
    actor: { id: string; name: string; role: any }
  ): Promise<IBed> {
    const { ward, bed } = await this.findBed(wardId, roomNumber, bedNumber);
    bed.status = status;
    if (status === 'Available') {
      bed.currentPatientId = null;
      bed.currentPatientName = null;
      bed.currentAdmissionId = null;
      bed.allocatedAt = null;
    }
    ward.availableBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Available').length;
    ward.occupiedBeds = ward.rooms.flatMap((r) => r.beds).filter((b) => b.status === 'Occupied').length;

    logAuditEvent(actor, 'BED_STATUS_UPDATED', 'Bed', bed.bedNumber, 'SUCCESS', undefined, {
      wardId,
      roomNumber,
      status,
    });

    return bed;
  }
}
