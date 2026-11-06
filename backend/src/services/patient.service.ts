import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IPatient, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import {
  nameSimilarity,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  patientIdentityKey,
} from '../utils/identity.js';

export interface DuplicateCandidate {
  id: string;
  patientCode: string;
  fullName: string;
  dob: string;
  gender: IPatient['gender'];
  phone: string;
  email: string;
  matchScore: number;
  reasons: string[];
  isStrongMatch: boolean;
}

interface PatientActor {
  id: string;
  name: string;
  role: UserRole;
}

type PatientInput = Omit<
  IPatient,
  'id' | 'userId' | 'patientCode' | 'identityKey' | 'createdAt' | 'updatedAt'
> & {
  confirmDistinct?: boolean;
};

export class PatientService {
  /** Per-identity mutex so two admin tabs cannot pass the duplicate check together. */
  private static identityLocks = new Map<string, Promise<unknown>>();

  private static async withIdentityLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.identityLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.identityLocks.set(key, tail);

    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (this.identityLocks.get(key) === tail) this.identityLocks.delete(key);
    }
  }

  public static async getAll(
    query: { search?: string; limit?: number; offset?: number },
    actorRole: UserRole,
    actorDoctorId?: string
  ): Promise<{ patients: Partial<IPatient>[]; total: number }> {
    let list = [...db.patients];

    // If doctor, filter to assigned patients unless searching
    if (actorRole === 'doctor' && actorDoctorId) {
      list = list.filter((p) => p.assignedDoctorId === actorDoctorId);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.patientCode.toLowerCase().includes(s) ||
          p.phone.includes(s) ||
          p.email.toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paged = list.slice(offset, offset + limit);

    // Filter fields according to role privacy
    const sanitized = paged.map((p) => {
      if (actorRole === 'billing') {
        return {
          id: p.id,
          patientCode: p.patientCode,
          fullName: p.fullName,
          phone: p.phone,
          email: p.email,
          currentAdmissionId: p.currentAdmissionId,
        };
      }
      return p;
    });

    return { patients: sanitized, total };
  }

  public static async getById(patientId: string): Promise<IPatient> {
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' was not found.`, 404, 'PATIENT_NOT_FOUND');
    }
    return patient;
  }

  public static async getByUserId(userId: string): Promise<IPatient | undefined> {
    return db.patients.find((p) => p.userId === userId);
  }

  /**
   * Returns existing patients that are highly similar to the supplied
   * demographics. Email is intentionally not part of the identity score.
   */
  public static findDuplicateCandidates(
    data: {
      fullName?: string;
      dob?: string;
      gender?: IPatient['gender'];
      phone?: string;
      email?: string;
    },
    excludePatientId?: string
  ): DuplicateCandidate[] {
    const inputName = normalizeName(data.fullName);
    const inputPhone = normalizePhone(data.phone);

    if (!inputName && !inputPhone) return [];

    const candidates: DuplicateCandidate[] = [];

    for (const patient of db.patients) {
      if (excludePatientId && patient.id === excludePatientId) continue;

      const existingName = normalizeName(patient.fullName);
      const existingPhone = normalizePhone(patient.phone);
      const sameName = Boolean(inputName) && inputName === existingName;
      const similarName =
        Boolean(inputName) &&
        !sameName &&
        inputName.length >= 4 &&
        existingName.length >= 4 &&
        nameSimilarity(inputName, existingName) >= 0.85;
      const sameDob = Boolean(data.dob) && data.dob === patient.dob;
      const samePhone = Boolean(inputPhone) && inputPhone === existingPhone;
      const sameGender = Boolean(data.gender) && data.gender === patient.gender;

      let score = 0;
      const reasons: string[] = [];

      if (samePhone) {
        score += 90;
        reasons.push('Same phone number');
      }
      if (sameName && sameDob) {
        score += 100;
        reasons.push('Same full name and date of birth');
      } else if (similarName && sameDob) {
        score += 70;
        reasons.push('Very similar full name and same date of birth');
      }
      if (sameName && sameGender) {
        score += 40;
        reasons.push('Same full name and gender');
      }
      if (sameName && samePhone) {
        score += 20;
        reasons.push('Same full name and phone number');
      }

      if (score < 60) continue;

      candidates.push({
        id: patient.id,
        patientCode: patient.patientCode,
        fullName: patient.fullName,
        dob: patient.dob,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        matchScore: score,
        reasons,
        isStrongMatch: samePhone || (sameName && sameDob) || (similarName && sameDob),
      });
    }

    return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  private static nextPatientCode(): string {
    let highest = 1000;
    for (const patient of db.patients) {
      const match = /^PAT-(\d+)$/i.exec(patient.patientCode || '');
      if (match) highest = Math.max(highest, Number(match[1]));
    }
    return `PAT-${highest + 1}`;
  }

  public static async create(
    data: PatientInput,
    actor: PatientActor
  ): Promise<IPatient> {
    const lockKey = `${normalizeName(data.fullName)}|${normalizePhone(data.phone)}`;

    return this.withIdentityLock(lockKey, async () => {
      const candidates = this.findDuplicateCandidates({
        fullName: data.fullName,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
      });

      const strongMatches = candidates.filter((candidate) => candidate.isStrongMatch);
      if (strongMatches.length > 0 && !data.confirmDistinct) {
        throw new AppError(
          'A highly similar patient already exists. Review the suggested records before creating a duplicate.',
          409,
          'POSSIBLE_DUPLICATE_PATIENT',
          { candidates: strongMatches }
        );
      }

      const confirmDistinct = Boolean(data.confirmDistinct);
      const {
        confirmDistinct: _confirmDistinct,
        ...demographics
      } = data;

      const now = new Date().toISOString();
      const identityKey = confirmDistinct
        ? undefined
        : patientIdentityKey(demographics.fullName, demographics.phone) ?? undefined;

      const newPatient: IPatient = {
        ...demographics,
        id: `pat-${uuidv4().substring(0, 8)}`,
        userId: '',
        patientCode: this.nextPatientCode(),
        identityKey,
        createdAt: now,
        updatedAt: now,
      };

      if (confirmDistinct) {
        // Persist the exemption so a future reload does not recreate the key.
        (newPatient as any).identityKeyExempt = true;
      }

      db.patients.push(newPatient);

      logAuditEvent(actor, 'PATIENT_CREATED', 'Patient', newPatient.id, 'SUCCESS', undefined, {
        patientCode: newPatient.patientCode,
        fullName: newPatient.fullName,
        duplicateOverride: Boolean(confirmDistinct),
      });

      return newPatient;
    });
  }

  public static async update(
    patientId: string,
    updates: Partial<IPatient>,
    actor: PatientActor
  ): Promise<IPatient> {
    const patient = await this.getById(patientId);

    // Patients may only edit contact/residence/emergency information. Clinical
    // identifiers (name, DOB, gender, blood group, assignments) remain under
    // hospital staff control.
    const patientEditableFields: Array<keyof IPatient> = [
      'phone',
      'email',
      'address',
      'emergencyContact',
    ];

    const allowedUpdates: Partial<IPatient> = {};
    const fieldsToApply =
      actor.role === 'patient'
        ? patientEditableFields
        : (Object.keys(updates) as Array<keyof IPatient>);

    for (const field of fieldsToApply) {
      if (updates[field] !== undefined) {
        (allowedUpdates as any)[field] = updates[field];
      }
    }

    // Never let an update change immutable identifiers.
    delete (allowedUpdates as any).id;
    delete (allowedUpdates as any).userId;
    delete (allowedUpdates as any).patientCode;
    delete (allowedUpdates as any).createdAt;
    delete (allowedUpdates as any).identityKey;

    const nextName = allowedUpdates.fullName ?? patient.fullName;
    const nextDob = allowedUpdates.dob ?? patient.dob;
    const nextGender = allowedUpdates.gender ?? patient.gender;
    const nextPhone = allowedUpdates.phone ?? patient.phone;

    const phoneChanged = normalizePhone(nextPhone) !== normalizePhone(patient.phone);
    const nameChanged = normalizeName(nextName) !== normalizeName(patient.fullName);

    if (phoneChanged || nameChanged) {
      const candidates = this.findDuplicateCandidates(
        { fullName: nextName, dob: nextDob, gender: nextGender, phone: nextPhone },
        patient.id
      ).filter((candidate) => candidate.isStrongMatch);

      if (candidates.length > 0 && !(updates as any).confirmDistinct) {
        throw new AppError(
          'The updated details match another patient record. Resolve the duplicate before saving.',
          409,
          'POSSIBLE_DUPLICATE_PATIENT',
          { candidates },
        );
      }
    }

    Object.assign(patient, allowedUpdates, { updatedAt: new Date().toISOString() });

    if (!(patient as any).identityKeyExempt) {
      patient.identityKey = patientIdentityKey(patient.fullName, patient.phone) ?? undefined;
    }

    if (allowedUpdates.email !== undefined) {
      patient.email = normalizeEmail(patient.email);
    }

    logAuditEvent(actor, 'PATIENT_UPDATED', 'Patient', patient.id, 'SUCCESS', undefined, allowedUpdates);

    return patient;
  }
}
