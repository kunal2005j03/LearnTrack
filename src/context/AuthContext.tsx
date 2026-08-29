import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, loginWithGoogle, loginAsGuest, logoutUser } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setLoading(false);

        // When a user signs in, save or update their profile document in Firestore
        if (currentUser) {
          try {
            const userDocRef = doc(db, `users/${currentUser.uid}`);
            const userSnap = await getDoc(userDocRef);

            const profileData: any = {
              uid: currentUser.uid,
              email: currentUser.email || null,
              displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Learner' : 'Learner'),
              photoURL: currentUser.photoURL || null,
              isAnonymous: currentUser.isAnonymous,
              lastLoginAt: new Date().toISOString(),
            };

            if (!userSnap.exists()) {
              profileData.createdAt = new Date().toISOString();
            }

            await setDoc(userDocRef, profileData, { merge: true });
          } catch (e) {
            console.warn('Error saving user profile to Firestore:', e);
          }
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    setAuthError(null);
    try {
      const { user, accessToken } = await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // Handle popup closed or blocked gracefully
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign in window was closed before completing.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign in popup was blocked by the browser. Please allow popups.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setAuthError(`Unauthorized domain (${currentHost}). Add '${currentHost}' to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`);
      } else {
        setAuthError(err.message || 'Failed to sign in with Google');
      }
      throw err;
    }
  };

  const signInGuest = async () => {
    setAuthError(null);
    try {
      await loginAsGuest();
    } catch (err: any) {
      console.error('Guest Sign In error:', err);
      setAuthError(err.message || 'Failed to initialize session');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await logoutUser();
      setUser(null);
    } catch (err: any) {
      console.error('Sign Out error:', err);
    }
  };

  const userProfile: UserProfile | null = user
    ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.isAnonymous ? 'Guest Learner' : 'Learner'),
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInGoogle,
        signInGuest,
        signOut,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
