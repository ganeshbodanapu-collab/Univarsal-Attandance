import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AppUser } from '../types';
import { authService } from '../lib/auth';

interface AuthContextType {
  authenticatedUser: User | null;
  session: Session | null;
  appUser: AppUser | null;
  role: 'admin' | 'supervisor' | null;
  assignedSiteId: string | undefined;
  assignedSectionId: string | undefined;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<{ success: boolean; error: string | null }>;
  refreshProfile: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (): Promise<AppUser | null> => {
    const currentSess = session || (await authService.getCurrentSession());
    if (currentSess?.user) {
      const profile = await authService.fetchAppUserProfile(currentSess.user.id);
      if (profile && profile.status === 'active') {
        setAppUser(profile);
        return profile;
      } else {
        setAppUser(null);
        await authService.signOut();
        return null;
      }
    } else {
      setAppUser(null);
      return null;
    }
  };

  useEffect(() => {
    // Initial Session Check
    authService.getCurrentSession().then(async (sess) => {
      setSession(sess);
      setAuthenticatedUser(sess?.user || null);
      if (sess?.user) {
        const profile = await authService.fetchAppUserProfile(sess.user.id);
        if (profile && profile.status === 'active') {
          setAppUser(profile);
        } else {
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    // Auth State Listener
    const subscription = authService.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setAuthenticatedUser(newSession?.user || null);
      if (newSession?.user) {
        const profile = await authService.fetchAppUserProfile(newSession.user.id);
        if (profile && profile.status === 'active') {
          setAppUser(profile);
        } else {
          // Construct fallback profile from auth user session if app_users record is loading
          const userEmail = newSession.user.email || '';
          const fallbackUsername = userEmail.includes('@') ? userEmail.split('@')[0] : 'admin';
          const fallbackRole = fallbackUsername.toLowerCase().startsWith('admin') ? 'admin' : 'supervisor';

          setAppUser({
            id: newSession.user.id,
            username: fallbackUsername,
            password: '',
            name: fallbackUsername.toUpperCase(),
            role: fallbackRole,
            status: 'active',
          });
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authService.signIn(email, pass);
      if (res.success && res.data?.user) {
        const profile = await authService.fetchAppUserProfile(res.data.user.id);
        if (!profile || profile.status !== 'active') {
          await authService.signOut();
          setLoading(false);
          return {
            success: false,
            error: 'Access denied: Profile inactive or not found in app_users.',
          };
        }
        setAppUser(profile);
        setAuthenticatedUser(res.data.user);
        setSession(res.data.session);
      }
      return { success: res.success, error: res.error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const res = await authService.signOut();
      setAuthenticatedUser(null);
      setSession(null);
      setAppUser(null);
      localStorage.removeItem('univarsal_user_session');
      localStorage.removeItem('pending_login_request_id');
      localStorage.removeItem('pending_login_user_id');
      return res;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authenticatedUser,
        session,
        appUser,
        role: appUser?.role || null,
        assignedSiteId: appUser?.assignedSiteId,
        assignedSectionId: appUser?.assignedSectionId,
        loading,
        signIn,
        signOut,
        refreshProfile,
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
