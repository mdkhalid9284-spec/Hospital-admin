import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { config } from '../config/index.js';
import { IPatient, IUser } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { PatientService } from './patient.service.js';
import {
  deleteFirebaseUser,
  FirebaseIdentity,
  provisionFirebaseUser,
} from './firebaseAdmin.service.js';
import { normalizeCode, normalizeEmail, normalizePhone, patientIdentityKey } from '../utils/identity.js';

export interface PortalProfile {
  id: string;
  email: string;
  role: IUser['role'];
  fullName: string;
  phone?: string;
  patientId?: string;
  doctorId?: string;
  /** Present for Firebase sessions. Legacy local sessions omit it. */
  emailVerified?: boolean;
}

const VERIFICATION_MESSAGE = 'We could not verify those hospital record details.';

const failure = (message: string, status: number, code: string): AppError =>
  new AppError(message, status, code);

const publicProfile = (user: IUser, emailVerified?: boolean): PortalProfile => {
  let patientId: string | undefined;
  let doctorId: string | undefined;
  if (user.role === 'patient') {
    patientId = db.patients.find((patient) => patient.userId === user.id)?.id;
  } else if (user.role === 'doctor') {
    doctorId = db.doctors.find((doctor) => doctor.userId === user.id)?.id;
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
    patientId,
    doctorId,
    ...(emailVerified === undefined ? {} : { emailVerified }),
  };
};

const assertDob = (dob: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw failure('Date of birth must use the YYYY-MM-DD format.', 400, 'VALIDATION_ERROR');
  }
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
    throw failure('Date of birth must be a real date in the past.', 400, 'VALIDATION_ERROR');
  }
};

const nextPatientCode = (): string => {
  let highest = 1000;
  for (const patient of db.patients) {
    const match = /^PAT-(\d+)$/i.exec(patient.patientCode || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `PAT-${highest + 1}`;
};

/**
 * Per-email mutex. Two registrations for the same address cannot both pass
 * the duplicate check and insert.
 */
const chains = new Map<string, Promise<unknown>>();

const withLock = async <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  chains.set(key, tail);
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (chains.get(key) === tail) chains.delete(key);
  }
};

const signClaim = (patientId: string, email: string): string =>
  jwt.sign({ purpose: 'patient-claim', patientId, email }, config.jwt.secret, { expiresIn: '15m' });

const readClaim = (token: string): { patientId: string; email: string } => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      purpose?: string;
      patientId?: string;
      email?: string;
    };
    if (decoded.purpose !== 'patient-claim' || !decoded.patientId || !decoded.email) {
      throw new Error('invalid claim');
    }
    return { patientId: decoded.patientId, email: normalizeEmail(decoded.email) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw failure('The hospital-record verification has expired. Start again.', 400, 'CLAIM_EXPIRED');
  }
};

const findSinglePatient = (identifier: string): IPatient | undefined => {
  const code = normalizeCode(identifier);
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const matches = db.patients.filter(
    (patient) =>
      normalizeCode(patient.patientCode) === code ||
      (email.includes('@') && normalizeEmail(patient.email) === email) ||
      (phone.length >= 7 && normalizePhone(patient.phone) === phone)
  );
  return matches.length === 1 ? matches[0] : undefined;
};

const unusablePasswordHash = async (): Promise<string> => bcrypt.hash(uuidv4(), 10);

export class FirebaseAccountService {
  /**
   * Existing hospital patient proves control of the medical record.
   * The response is a short-lived claim. No portal user is created yet,
   * and unknown records use the same message as a wrong date of birth.
   */
  public static async prepareExistingPatient(data: {
    identifier: string;
    dob: string;
    phone: string;
    email: string;
  }): Promise<{ claimToken: string; fullName: string }> {
    assertDob(data.dob);
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);
    const patient = findSinglePatient(data.identifier);

    if (!patient || patient.dob !== data.dob || !phone || phone !== normalizePhone(patient.phone)) {
      throw failure(VERIFICATION_MESSAGE, 403, 'PATIENT_VERIFICATION_FAILED');
    }

    if (patient.userId && db.users.some((user) => user.id === patient.userId)) {
      throw failure(
        'This patient record already has a portal account. Sign in instead.',
        409,
        'PATIENT_ACCOUNT_ALREADY_LINKED'
      );
    }

    if (db.users.some((user) => normalizeEmail(user.email) === email)) {
      throw failure('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    return { claimToken: signClaim(patient.id, email), fullName: patient.fullName };
  }

  public static async completeExistingPatient(
    identity: FirebaseIdentity,
    claimToken: string
  ): Promise<{ user: PortalProfile }> {
    const claim = readClaim(claimToken);
    if (claim.email !== identity.email) {
      throw failure(
        'The Firebase account email does not match the email verified against the hospital record.',
        403,
        'EMAIL_MISMATCH'
      );
    }

    return withLock(`email:${identity.email}`, async () => {
      const patient = db.patients.find((item) => item.id === claim.patientId);
      if (!patient || (patient.userId && db.users.some((user) => user.id === patient.userId))) {
        throw failure(
          'This patient record already has a portal account. Sign in instead.',
          409,
          'PATIENT_ACCOUNT_ALREADY_LINKED'
        );
      }
      if (db.users.some((user) => user.firebaseUid === identity.uid || normalizeEmail(user.email) === identity.email)) {
        throw failure('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
      }

      const now = new Date().toISOString();
      const user: IUser = {
        id: `usr-${uuidv4().substring(0, 8)}`,
        email: identity.email,
        passwordHash: await unusablePasswordHash(),
        firebaseUid: identity.uid,
        role: 'patient',
        fullName: patient.fullName,
        phone: patient.phone,
        isActive: true,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(user);
      const previousUserId = patient.userId;
      patient.userId = user.id;
      patient.updatedAt = now;

      try {
        logAuditEvent(
          { id: user.id, name: user.fullName, role: user.role },
          'PATIENT_PORTAL_ACCOUNT_LINKED',
          'User',
          user.id,
          'SUCCESS',
          undefined,
          { patientId: patient.id, patientCode: patient.patientCode }
        );
      } catch (error) {
        db.users.splice(db.users.findIndex((item) => item.id === user.id), 1);
        patient.userId = previousUserId;
        await deleteFirebaseUser(identity.uid);
        throw error;
      }

      return { user: publicProfile(user, identity.emailVerified) };
    });
  }

  public static async registerNewPatient(
    identity: FirebaseIdentity,
    data: {
      fullName: string;
      dob: string;
      gender: IPatient['gender'];
      email: string;
      phone: string;
      address: string;
      emergencyContact: { name: string; relationship: string; phone: string };
    }
  ): Promise<{ user: PortalProfile }> {
    assertDob(data.dob);
    if (normalizeEmail(data.email) !== identity.email) {
      throw failure(
        'The email address does not match the Firebase account.',
        403,
        'EMAIL_MISMATCH'
      );
    }
    if (normalizePhone(data.phone).length < 7 || normalizePhone(data.emergencyContact.phone).length < 7) {
      throw failure('Enter a valid phone number.', 400, 'VALIDATION_ERROR');
    }

    const fullName = data.fullName.trim();
    const phone = data.phone.trim();

    return withLock(`email:${identity.email}`, async () => {
      if (db.users.some((user) => user.firebaseUid === identity.uid || normalizeEmail(user.email) === identity.email)) {
        throw failure('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
      }
      if (db.patients.some((patient) => normalizeEmail(patient.email) === identity.email)) {
        throw failure(
          'This email is already on a hospital record. Use existing-patient registration.',
          409,
          'EXISTING_RECORD_FOUND'
        );
      }
      if (db.patients.some((patient) => normalizePhone(patient.phone) === normalizePhone(phone))) {
        throw failure(
          'This phone number is already on a hospital record. Use existing-patient registration.',
          409,
          'EXISTING_RECORD_FOUND'
        );
      }

      const strong = PatientService.findDuplicateCandidates({
        fullName,
        dob: data.dob,
        gender: data.gender,
        phone,
        email: identity.email,
      }).filter((candidate) => candidate.isStrongMatch);
      if (strong.length > 0) {
        throw failure(
          'These details match an existing hospital record. Use existing-patient registration.',
          409,
          'EXISTING_RECORD_FOUND'
        );
      }

      const now = new Date().toISOString();
      const user: IUser = {
        id: `usr-${uuidv4().substring(0, 8)}`,
        email: identity.email,
        passwordHash: await unusablePasswordHash(),
        firebaseUid: identity.uid,
        role: 'patient',
        fullName,
        phone,
        isActive: true,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      };
      const patient: IPatient = {
        id: `pat-${uuidv4().substring(0, 8)}`,
        userId: user.id,
        patientCode: nextPatientCode(),
        fullName,
        dob: data.dob,
        gender: data.gender,
        phone,
        email: identity.email,
        address: data.address.trim(),
        emergencyContact: {
          name: data.emergencyContact.name.trim(),
          relationship: data.emergencyContact.relationship.trim(),
          phone: data.emergencyContact.phone.trim(),
        },
        identityKey: patientIdentityKey(fullName, phone) ?? undefined,
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(user);
      db.patients.push(patient);
      try {
        logAuditEvent(
          { id: user.id, name: user.fullName, role: 'patient' },
          'PATIENT_SELF_REGISTERED',
          'Patient',
          patient.id,
          'SUCCESS',
          undefined,
          { patientCode: patient.patientCode }
        );
      } catch (error) {
        db.users.splice(db.users.findIndex((item) => item.id === user.id), 1);
        db.patients.splice(db.patients.findIndex((item) => item.id === patient.id), 1);
        await deleteFirebaseUser(identity.uid);
        throw error;
      }

      return { user: publicProfile(user, identity.emailVerified) };
    });
  }

  /**
   * Load the MongoDB profile for a verified Firebase identity.
   * Email equality never links or creates an account. Privileged roles stay
   * on their existing records until a password-proven link stores firebaseUid.
   */
  public static establishSession(identity: FirebaseIdentity): { user: PortalProfile; emailVerified: boolean } {
    let user = db.users.find((item) => item.firebaseUid === identity.uid);
    if (!user) {
      const emailOwner = db.users.find((item) => normalizeEmail(item.email) === identity.email);
      if (emailOwner && emailOwner.role === 'patient' && !emailOwner.firebaseUid && identity.emailVerified) {
        emailOwner.firebaseUid = identity.uid;
        emailOwner.updatedAt = new Date().toISOString();
        user = emailOwner;
      } else if (emailOwner) {
        throw failure(
          'This email already belongs to a hospital account. Sign in with the hospital password once to link it. A verified email alone is not enough.',
          403,
          'ACCOUNT_NOT_LINKED'
        );
      }
      throw failure('No HospitalCare profile is linked to this sign-in yet.', 409, 'PROFILE_REQUIRED');
    }
    if (!user.isActive) {
      throw failure('This account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED');
    }

    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = user.lastLoginAt;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    logAuditEvent(
      { id: user.id, name: user.fullName, role: user.role },
      'USER_LOGIN',
      'User',
      user.id,
      'SUCCESS',
      undefined,
      { provider: identity.signInProvider || 'firebase' }
    );

    return { user: publicProfile(user, identity.emailVerified), emailVerified: identity.emailVerified };
  }

  /**
   * Password-proven migration. The caller has already checked the bcrypt hash.
   * The Firebase user is marked verified because the person proved control of
   * the existing hospital account. Roles are copied from MongoDB unchanged.
   */
  public static async linkVerifiedLegacyUser(user: IUser, password: string): Promise<void> {
    const uid = await provisionFirebaseUser({
      email: normalizeEmail(user.email),
      password,
      fullName: user.fullName,
    });
    if (user.firebaseUid && user.firebaseUid !== uid) {
      throw failure(
        'This hospital account is already linked to a different sign-in.',
        409,
        'ACCOUNT_ALREADY_LINKED'
      );
    }
    const taken = db.users.find((item) => item.firebaseUid === uid && item.id !== user.id);
    if (taken) {
      throw failure(
        'This Firebase account is already linked to another hospital user.',
        409,
        'ACCOUNT_ALREADY_LINKED'
      );
    }
    user.firebaseUid = uid;
    user.updatedAt = new Date().toISOString();
    logAuditEvent(
      { id: user.id, name: user.fullName, role: user.role },
      'FIREBASE_ACCOUNT_LINKED',
      'User',
      user.id,
      'SUCCESS',
      undefined,
      { role: user.role }
    );
  }
}
