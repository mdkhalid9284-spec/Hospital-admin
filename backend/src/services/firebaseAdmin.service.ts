import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { config } from '../config/index.js';
import { AppError } from '../middlewares/errorHandler.js';

export interface FirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  signInProvider?: string;
}

export const isFirebaseAdminConfigured = (): boolean =>
  Boolean(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey);

const getAdminAuth = () => {
  if (!isFirebaseAdminConfigured()) {
    throw new AppError(
      'Firebase Authentication is not configured on the server.',
      503,
      'FIREBASE_NOT_CONFIGURED'
    );
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }

  return getAuth();
};

export const verifyFirebaseIdToken = async (idToken: string): Promise<FirebaseIdentity> => {
  try {
    const decoded: DecodedIdToken = await getAdminAuth().verifyIdToken(idToken, true);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) {
      throw new AppError(
        'The Firebase account has no email address. HospitalCare cannot authorise it.',
        401,
        'FIREBASE_EMAIL_REQUIRED'
      );
    }

    return {
      uid: decoded.uid,
      email,
      emailVerified: decoded.email_verified === true,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
      signInProvider: decoded.firebase?.sign_in_provider,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string }).code;
    if (code === 'auth/id-token-revoked' || code === 'auth/session-cookie-revoked') {
      throw new AppError('Session has been terminated. Please log in again.', 401, 'TOKEN_REVOKED');
    }
    throw new AppError('Session has expired or token is invalid. Please log in again.', 401, 'INVALID_TOKEN');
  }
};

export const deleteFirebaseUser = async (uid: string): Promise<void> => {
  if (!isFirebaseAdminConfigured() || !uid) return;
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/user-not-found') return;
    console.error('[Firebase] Failed to delete user during rollback:', code || 'unknown');
  }
};

export const revokeFirebaseSessions = async (uid: string): Promise<void> => {
  if (!isFirebaseAdminConfigured() || !uid) return;
  try {
    await getAdminAuth().revokeRefreshTokens(uid);
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error('[Firebase] Failed to revoke sessions:', code || 'unknown');
  }
};

/**
 * Create or take over the Firebase email/password user for an existing
 * HospitalCare account after the legacy password has been verified.
 * Email is marked verified because the person already proved control of the
 * hospital account. New self-registrations do not use this path.
 */
export const provisionFirebaseUser = async (input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<string> => {
  const auth = getAdminAuth();
  try {
    const existing = await auth.getUserByEmail(input.email);
    await auth.updateUser(existing.uid, {
      password: input.password,
      displayName: input.fullName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') {
      throw new AppError(
        'The existing hospital account could not be linked to Firebase.',
        502,
        'FIREBASE_PROVISION_FAILED'
      );
    }
  }

  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
      emailVerified: true,
    });
    return created.uid;
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error('[Firebase] Account provisioning failed:', code || 'unknown');
    throw new AppError(
      'The existing hospital account could not be linked to Firebase.',
      502,
      'FIREBASE_PROVISION_FAILED'
    );
  }
};
