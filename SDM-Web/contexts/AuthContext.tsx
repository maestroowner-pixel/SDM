// Auth state + actions for SDM Web, backed by Firebase Authentication (web).
// Email/password with email verification and password reset. When Firebase is
// not configured (see utils/firebase), `isConfigured` is false and the app runs
// without a gate.
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../utils/firebase';

interface AuthContextType {
  user: User | null;
  initializing: boolean;
  isConfigured: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  reloadUser: () => Promise<boolean>; // returns emailVerified after reload
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Firebase auth error codes to human-friendly messages.
export const authErrorMessage = (e: any): string => {
  const code = e?.code || '';
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    case 'auth/missing-password': return 'Please enter a password.';
    default: return e?.message || 'Something went wrong. Please try again.';
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setInitializing(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Auth is not configured.');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try { await sendEmailVerification(cred.user); } catch (e) { console.warn('verification send failed', e); }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Auth is not configured.');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) throw new Error('Auth is not configured.');
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth?.currentUser) throw new Error('Not signed in.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!auth?.currentUser) return false;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
    return auth.currentUser.emailVerified;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, initializing, isConfigured: isFirebaseConfigured,
      register, login, logout, resetPassword, resendVerification, reloadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
