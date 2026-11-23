import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { ensureUserProfile, getProfileByUid } from '../lib/api';
import type { Profile } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isVerified: boolean;
  needsEmailVerification: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  loginWithEmail: (params: { email: string; password: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  reloadAuthUser: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUserVerified(firebaseUser: User | null): boolean {
  if (!firebaseUser) return false;
  return firebaseUser.emailVerified;
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email using a different sign-in provider (Google or Email). Please sign in with that method.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Browser blocked the sign-in popup. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not yet enabled in Firebase Console (Authentication → Sign-in method). Please enable it in Firebase Console or use Google Sign-In.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncProfileForUser = useCallback(
    async (
      firebaseUser: User | null,
      extra?: {
        usernameSeed?: string;
        githubUrl?: string;
        bio?: string;
        location?: string;
        portfolioUrl?: string;
      }
    ) => {
      if (!isUserVerified(firebaseUser) || !firebaseUser) {
        setProfile(null);
        return;
      }
      try {
        const loaded = await ensureUserProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || extra?.usernameSeed || '',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          ...extra,
        });
        setProfile(loaded);
      } catch (err) {
        console.error('Failed to sync profile:', err);
      }
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      await syncProfileForUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, [syncProfileForUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      await syncProfileForUser(cred.user);
    } catch (err) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, [syncProfileForUser]);

  const registerWithEmail = useCallback(
    async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      setAuthError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateFirebaseProfile(cred.user, { displayName: displayName.trim() });
        }
        await sendEmailVerification(cred.user);
        setUser(cred.user);
      } catch (err) {
        const msg = mapFirebaseAuthError(err);
        setAuthError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const loginWithEmail = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setAuthError(null);
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncProfileForUser(cred.user);
      } catch (err) {
        const msg = mapFirebaseAuthError(err);
        setAuthError(msg);
        throw new Error(msg);
      }
    },
    [syncProfileForUser]
  );

  const resetPassword = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const reloadAuthUser = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    setUser(refreshed);
    if (isUserVerified(refreshed)) {
      await syncProfileForUser(refreshed);
      return true;
    }
    return false;
  }, [syncProfileForUser]);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const fresh = await getProfileByUid(auth.currentUser.uid);
    if (fresh) setProfile(fresh);
  }, []);

  const isVerified = isUserVerified(user);
  const needsEmailVerification = Boolean(user && !isVerified);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isVerified,
        needsEmailVerification,
        authError,
        clearAuthError,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        resetPassword,
        resendVerification,
        reloadAuthUser,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
