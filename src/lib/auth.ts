import { supabase } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { AppUser } from '../types';

export interface AppUserProfile {
  id: string;
  authUserId: string | null;
  username: string;
  name: string;
  role: 'admin' | 'supervisor';
  assignedSiteId?: string;
  assignedSectionId?: string;
  teamName?: string;
  mobile?: string;
  email?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

/**
 * Supabase Auth Service
 */
export const authService = {
  /**
   * Sign in using Supabase Auth (Email & Password)
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { success: false, error: error.message, data: null };
    }
    return { success: true, error: null, data };
  },

  /**
   * Sign out current Supabase Auth session
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  },

  /**
   * Get active Supabase session
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * Get authenticated Supabase User
   */
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  /**
   * Fetch matching app_users profile for current auth user ID
   */
  async fetchAppUserProfile(authUserId: string): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const profile: AppUser = {
        id: data.id,
        username: data.username,
        password: '', // Password not stored in frontend or exposed
        name: data.name,
        role: data.role as 'admin' | 'supervisor',
        assignedSiteId: data.assigned_site_id || undefined,
        assignedSectionId: data.assigned_section_id || undefined,
        teamName: data.team_name || undefined,
        mobile: data.mobile || undefined,
        email: data.email || undefined,
        status: data.status as 'active' | 'inactive',
        lastLogin: data.last_login || undefined,
        createdDate: data.created_at ? data.created_at.split('T')[0] : undefined,
      };

      return profile;
    } catch (err) {
      console.error('Error fetching app_users profile:', err);
      return null;
    }
  },

  /**
   * Change password for currently authenticated Supabase Auth user
   */
  async changePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return { success: false, error: error.message, data: null };
    }
    return { success: true, error: null, data };
  },

  /**
   * Admin or User updates User ID (username/email) and/or Password via Edge Function
   */
  async updateUserCredentials(params: {
    targetUserId?: string;
    targetUsername?: string;
    newUsername?: string;
    newPassword?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('admin-manage-user-password', {
      body: { action: 'updateUserCredentials', ...params },
    });
    if (error || !data?.success) {
      return { success: false, error: data?.error || error?.message || 'Failed to update credentials.' };
    }
    return { success: true, error: null, data };
  },

  /**
   * Admin resets/changes password for target username via Edge Function
   */
  async adminChangeUserPassword(targetUsername: string, newPassword: string) {
    const { data, error } = await supabase.functions.invoke('admin-manage-user-password', {
      body: { action: 'updateUserCredentials', targetUsername, newPassword },
    });
    if (error || !data?.success) {
      return { success: false, error: data?.error || error?.message || 'Failed to update password.' };
    }
    return { success: true, error: null, data };
  },

  /**
   * Admin creates new user via Edge Function
   */
  async adminCreateUser(params: {
    username: string;
    password: string;
    name: string;
    role?: 'supervisor' | 'admin';
    assignedSiteId?: string;
    assignedSectionId?: string;
    mobile?: string;
    email?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('admin-manage-user-password', {
      body: { action: 'createUser', ...params },
    });
    if (error || !data?.success) {
      return { success: false, error: data?.error || error?.message || 'Failed to create user.' };
    }
    return { success: true, error: null, appUser: data.appUser };
  },

  /**
   * Subscribe to Supabase Auth state changes
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },
};

