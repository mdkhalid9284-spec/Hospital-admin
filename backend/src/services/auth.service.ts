import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { config } from '../config/index.js';
import { IUser, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { normalizeCode, normalizeEmail, normalizePhone } from '../utils/identity.js';

export class AuthService {
  /**
   * Patient portal self-registration.
   *
   * A portal account is linked to an existing hospital patient record. This
   * method never creates a new medical record. Ownership is verified against
   * the patient's ID/registered email or phone, date of birth and registered
   * phone number. No OTP provider is configured in this deployment, so we do
   * not claim email/OTP verification works.
   */
  public static async registerPatientAccount(data: {
    identifier: string;
    dob: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<{ user: Partial<IUser> & { patientId: string }; token: string; patientId: string }> {
    const identifier = normalizeCode(data.identifier);
    const phone = normalizePhone(data.phone);
    const email = normalizeEmail(data.email);

    const patient = db.patients.find(
      (candidate) =>
        normalizeCode(candidate.patientCode) === identifier ||
        normalizeEmail(candidate.email) === normalizeEmail(data.identifier) ||
        normalizePhone(candidate.phone) === normalizePhone(data.identifier)
    );

    if (!patient) {
      throw new AppError(
        'No hospital patient record matches that Patient ID, phone or email. Contact the hospital reception to register first.',
        404,
        'PATIENT_RECORD_NOT_FOUND'
      );
    }

    if (patient.dob !== data.dob) {
      throw new AppError(
        'Identity verification failed. The date of birth does not match the hospital record.',
        403,
        'PATIENT_VERIFICATION_FAILED'
      );
    }

    if (!phone || phone !== normalizePhone(patient.phone)) {
      throw new AppError(
        'Identity verification failed. The registered phone number does not match the hospital record.',
        403,
        'PATIENT_VERIFICATION_FAILED'
      );
    }

    const linkedUser =
      patient.userId && db.users.find((user) => user.id === patient.userId);
    if (linkedUser) {
      throw new AppError(
        'This patient record is already linked to a portal account. Sign in instead or contact hospital support.',
        409,
        'PATIENT_ACCOUNT_ALREADY_LINKED'
      );
    }

    const existing = db.users.find((user) => user.email.toLowerCase() === email);
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const userId = `usr-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const newUser: IUser = {
      id: userId,
      email,
      passwordHash,
      role: 'patient',
      fullName: patient.fullName,
      phone: patient.phone,
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    // Link the account to the existing medical record. Do not create a new one.
    patient.userId = newUser.id;
    patient.updatedAt = now;

    const token = this.generateToken(newUser, patient.id);

    logAuditEvent(
      { id: newUser.id, name: newUser.fullName, role: newUser.role },
      'PATIENT_PORTAL_ACCOUNT_CREATED',
      'User',
      newUser.id,
      'SUCCESS',
      undefined,
      { patientId: patient.id, patientCode: patient.patientCode },
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return { user: { ...safeUser, patientId: patient.id }, token, patientId: patient.id };
  }

  public static async register(data: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
    phone?: string;
  }): Promise<{ user: Partial<IUser>; token: string }> {
    // Legacy endpoint guard: public registration must never create arbitrary
    // staff accounts or a duplicate patient record.
    throw new AppError(
      'Direct registration is disabled. Patients must create a portal account from an existing hospital patient record.',
      410,
      'REGISTRATION_MOVED',
    );
  }

  public static async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<{ user: Partial<IUser> & { patientId?: string; doctorId?: string }; token: string }> {
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      logAuditEvent(
        { id: 'anonymous', name: email, role: 'patient' },
        'LOGIN_FAILED_UNKNOWN_USER',
        'User',
        'unknown',
        'FAILURE',
        ipAddress,
        { email }
      );
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Check progressive backoff lock / throttling state
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000)
      );
      throw new AppError(
        `Too many failed login attempts. Temporarily throttled. Please try again in ${remainingMinutes} minute(s).`,
        429,
        'ACCOUNT_THROTTLED'
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginAttempts += 1;
      // Progressive backoff: on 5th failed attempt, schedule 15-minute throttle for subsequent attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      user.updatedAt = new Date().toISOString();

      logAuditEvent(
        { id: user.id, name: user.fullName, role: user.role },
        'LOGIN_FAILED',
        'User',
        user.id,
        'FAILURE',
        ipAddress,
        { attempts: user.failedLoginAttempts }
      );

      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed counter and lock state upon successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    let patientId: string | undefined;
    let doctorId: string | undefined;

    if (user.role === 'patient') {
      const patient = db.patients.find((p) => p.userId === user.id);
      if (patient) patientId = patient.id;
    } else if (user.role === 'doctor') {
      const doctor = db.doctors.find((d) => d.userId === user.id);
      if (doctor) doctorId = doctor.id;
    }

    const token = this.generateToken(user, patientId, doctorId);

    logAuditEvent(
      { id: user.id, name: user.fullName, role: user.role },
      'USER_LOGIN',
      'User',
      user.id,
      'SUCCESS',
      ipAddress
    );

    const { passwordHash: _, ...safeUser } = user;
    return { user: { ...safeUser, patientId, doctorId }, token };
  }

  public static async forgotPassword(email: string): Promise<string> {
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Return success-like response to prevent email enumeration attack
      return 'If the email exists, a password reset token has been dispatched.';
    }

    const resetToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    user.updatedAt = new Date().toISOString();

    logAuditEvent(
      { id: user.id, name: user.fullName, role: user.role },
      'PASSWORD_RESET_REQUESTED',
      'User',
      user.id,
      'SUCCESS'
    );

    return resetToken;
  }

  public static async resetPassword(token: string, newPass: string): Promise<void> {
    const user = db.users.find(
      (u) =>
        u.resetPasswordToken === token &&
        u.resetPasswordExpires &&
        new Date(u.resetPasswordExpires) > new Date()
    );

    if (!user) {
      throw new AppError('Invalid or expired password reset token.', 400, 'INVALID_RESET_TOKEN');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPass, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.updatedAt = new Date().toISOString();

    logAuditEvent(
      { id: user.id, name: user.fullName, role: user.role },
      'PASSWORD_RESET_COMPLETED',
      'User',
      user.id,
      'SUCCESS'
    );
  }

  private static generateToken(user: IUser, patientId?: string, doctorId?: string): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        patientId,
        doctorId,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as any
    );
  }
}
