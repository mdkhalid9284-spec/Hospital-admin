import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<IUser>;
  registerPatient: (data: {
    identifier: string;
    dob: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<IUser>;
  logout: () => void;
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
        // Always clear the boot spinner — never leave "Authenticating…" forever.
        setIsLoading(false);
      }
    };
    void initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<IUser> => {
    const res = await apiClient.post('/auth/login', { email, password: pass });
    const payload = res.data?.data;
    if (!payload?.user || !payload?.token) {
      throw new Error('Login response was incomplete. Please try again.');
    }
    const { user: authedUser, token: authToken } = payload;
    // Role is derived entirely from the server response — never from client input
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
    const res = await apiClient.post('/auth/patient-signup', data);
    const { user: authedUser, token: authToken } = res.data.data;
    setUser(authedUser);
    setToken(authToken);
    localStorage.setItem('hospitalcare_token', authToken);
    localStorage.setItem('hospitalcare_user', JSON.stringify(authedUser));
    return authedUser;
  };

  const logout = async () => {
    // Terminate the session server-side so the JWT is revoked.
    if (token) {
      try {
        await apiClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Ignore logout errors — client state is cleared regardless.
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
        login,
        registerPatient,
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
