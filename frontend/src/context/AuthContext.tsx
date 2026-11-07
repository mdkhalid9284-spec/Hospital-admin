import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole } from '../types';
import { apiClient } from '../api/client';
import {
  auth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onIdTokenChanged,
} from '../lib/firebase';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  emailVerified: boolean;
  isFirebaseActive: boolean;
  login: (email: string, pass: string) => Promise<IUser>;
  registerPatient: (data: {
    identifier: string;
    dob: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<IUser>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('hospitalcare_token');
        const savedUser = localStorage.getItem('hospitalcare_user');
        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            // Validate that the stored user has required fields to prevent tampering
            if (parsedUser && parsedUser.id && parsedUser.role && parsedUser.email) {
              setUser(parsedUser);
              setToken(savedToken);
            } else {
              throw new Error('Invalid stored user data');
            }
          } catch {
            localStorage.removeItem('hospitalcare_token');
            localStorage.removeItem('hospitalcare_user');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    void initAuth();

    // Listen for Firebase ID token refresh when Firebase is configured
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const freshToken = await fbUser.getIdToken();
            setToken(freshToken);
            localStorage.setItem('hospitalcare_token', freshToken);
            setUser((prev) => {
              if (prev) {
                const updated = { ...prev, emailVerified: fbUser.emailVerified };
                localStorage.setItem('hospitalcare_user', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          } catch {
            // Ignore token refresh error
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const login = async (email: string, pass: string): Promise<IUser> => {
    // 1. Try Firebase Authentication first if configured
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const idToken = await cred.user.getIdToken();

        // Establish session with MongoDB backend
        const sessionRes = await apiClient.post(
          '/auth/session',
          {},
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        const portalUser: IUser = sessionRes.data?.data?.user;
        const fullUser: IUser = {
          ...portalUser,
          emailVerified: cred.user.emailVerified,
        };

        setUser(fullUser);
        setToken(idToken);
        localStorage.setItem('hospitalcare_token', idToken);
        localStorage.setItem('hospitalcare_user', JSON.stringify(fullUser));
        return fullUser;
      } catch (fbErr: any) {
        // If not in Firebase yet, use the backend password verification / migration bridge
        const res = await apiClient.post('/auth/login', { email, password: pass });
        const payload = res.data?.data;

        if (payload?.linked) {
          // Legacy account was successfully linked & provisioned into Firebase
          const cred = await signInWithEmailAndPassword(auth, email, pass);
          const idToken = await cred.user.getIdToken();
          const sessionRes = await apiClient.post(
            '/auth/session',
            {},
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          const portalUser: IUser = sessionRes.data?.data?.user || payload.user;
          const fullUser: IUser = {
            ...portalUser,
            emailVerified: cred.user.emailVerified,
          };

          setUser(fullUser);
          setToken(idToken);
          localStorage.setItem('hospitalcare_token', idToken);
          localStorage.setItem('hospitalcare_user', JSON.stringify(fullUser));
          return fullUser;
        }

        if (payload?.user && payload?.token) {
          const { user: authedUser, token: authToken } = payload;
          setUser(authedUser);
          setToken(authToken);
          localStorage.setItem('hospitalcare_token', authToken);
          localStorage.setItem('hospitalcare_user', JSON.stringify(authedUser));
          return authedUser;
        }

        throw fbErr;
      }
    }

    // 2. Fallback when Firebase client is not configured (local dev / test bridge)
    const res = await apiClient.post('/auth/login', { email, password: pass });
    const payload = res.data?.data;
    if (!payload?.user || !payload?.token) {
      throw new Error('Login response was incomplete. Please try again.');
    }
    const { user: authedUser, token: authToken } = payload;
    setUser(authedUser);
    setToken(authToken);
    localStorage.setItem('hospitalcare_token', authToken);
    localStorage.setItem('hospitalcare_user', JSON.stringify(authedUser));
    return authedUser;
  };

  const registerPatient = async (data: {
    identifier: string;
    dob: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<IUser> => {
    // If Firebase is configured, execute verified record claim + Firebase user creation
    if (isFirebaseConfigured && auth) {
      try {
        // Step 1: Validate against existing hospital medical record
        const prepRes = await apiClient.post('/auth/register/existing/prepare', {
          identifier: data.identifier,
          dob: data.dob,
          phone: data.phone,
          email: data.email,
        });
        const claimToken = prepRes.data?.data?.claimToken;

        // Step 2: Create Firebase email/password user
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            cred = await signInWithEmailAndPassword(auth, data.email, data.password);
          } else {
            throw err;
          }
        }

        // Step 3: Trigger verification email
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Verification email failure should not abort account link
        }

        const idToken = await cred.user.getIdToken();

        // Step 4: Link hospital medical record with Firebase UID in MongoDB
        const compRes = await apiClient.post(
          '/auth/register/existing/complete',
          { claimToken },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        const portalUser: IUser = compRes.data?.data?.user;
        const fullUser: IUser = {
          ...portalUser,
          emailVerified: cred.user.emailVerified,
        };

        setUser(fullUser);
        setToken(idToken);
        localStorage.setItem('hospitalcare_token', idToken);
        localStorage.setItem('hospitalcare_user', JSON.stringify(fullUser));
        return fullUser;
      } catch (err: any) {
        // If /register/existing/prepare or complete fails, fall back to /patient-signup
        if (err?.code === 'FIREBASE_NOT_CONFIGURED' || err?.status === 404 || err?.status === 503) {
          const res = await apiClient.post('/auth/patient-signup', data);
          const { user: authedUser, token: authToken } = res.data.data;
          setUser(authedUser);
          setToken(authToken);
          localStorage.setItem('hospitalcare_token', authToken);
          localStorage.setItem('hospitalcare_user', JSON.stringify(authedUser));
          return authedUser;
        }
        throw err;
      }
    }

    // Direct endpoint fallback (when Firebase client is unconfigured)
    const res = await apiClient.post('/auth/patient-signup', data);
    const { user: authedUser, token: authToken } = res.data.data;
    setUser(authedUser);
    setToken(authToken);
    localStorage.setItem('hospitalcare_token', authToken);
    localStorage.setItem('hospitalcare_user', JSON.stringify(authedUser));
    return authedUser;
  };

  const sendVerificationEmail = async (): Promise<void> => {
    if (auth?.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      await apiClient.post('/auth/forgot-password', { email });
    }
  };

  const reloadUser = async (): Promise<void> => {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      await currentUser.reload();
      const freshToken = await currentUser.getIdToken(true);
      setToken(freshToken);
      localStorage.setItem('hospitalcare_token', freshToken);
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, emailVerified: currentUser.emailVerified };
        localStorage.setItem('hospitalcare_user', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const logout = async (): Promise<void> => {
    if (token) {
      try {
        await apiClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Ignore logout errors
      }
    }
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch {
        // Ignore Firebase signout errors
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('hospitalcare_token');
    localStorage.removeItem('hospitalcare_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user ? user.role : null,
        isLoading,
        emailVerified: user?.emailVerified ?? true,
        isFirebaseActive: isFirebaseConfigured,
        login,
        registerPatient,
        sendVerificationEmail,
        sendPasswordReset,
        reloadUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
