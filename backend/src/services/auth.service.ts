import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { config } from '../config/index.js';
import { IUser, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class AuthService {
  public static async register(data: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
    phone?: string;
  }): Promise<{ user: Partial<IUser>; token: string }> {
    const existing = db.users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const userId = `usr-${uuidv4().substring(0, 8)}`;
    const role: UserRole = data.role || 'patient';

    const newUser: IUser = {
      id: userId,
      email: data.email.toLowerCase(),
      passwordHash,
      role,
      fullName: data.fullName,
      phone: data.phone,
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    // If registering as a patient, automatically create patient profile skeleton
    if (role === 'patient') {
      const patientCode = `PAT-${1000 + db.patients.length + 1}`;
      db.patients.push({
        id: `pat-${uuidv4().substring(0, 8)}`,
        userId: newUser.id,
        patientCode,
        fullName: newUser.fullName,
        dob: '1990-01-01',
        gender: 'other',
        phone: data.phone || '+1 (555) 000-0000',
        email: newUser.email,
        address: 'Pending demographic update',
        emergencyContact: {
          name: 'Pending',
          relationship: 'Pending',
          phone: '+1 (555) 000-0000',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const token = this.generateToken(newUser);

    logAuditEvent(
      { id: newUser.id, name: newUser.fullName, role: newUser.role },
      'USER_REGISTRATION',
      'User',
      newUser.id,
      'SUCCESS',
      undefined,
      { role: newUser.role, email: newUser.email }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
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
