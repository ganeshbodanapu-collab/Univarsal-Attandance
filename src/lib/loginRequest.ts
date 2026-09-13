import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

export interface LoginRequestResult {
  success: boolean;
  message: string;
  requestId?: string;
}

/**
 * Sends a secure Login Access Request to Admin via Supabase Edge Function.
 * NEVER sends passwords, tokens, or secret credentials.
 */
export async function sendLoginAccessRequest(username: string): Promise<LoginRequestResult> {
  if (!username || !username.trim()) {
    return {
      success: false,
      message: 'Please enter a valid User ID before requesting access.',
    };
  }

  const cleanUsername = username.trim();
  const platform = Capacitor.isNativePlatform() ? 'ANDROID' : 'WEB';
  const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const { data, error } = await supabase.functions.invoke('send-login-request', {
      body: {
        username: cleanUsername,
        platform,
        requestId,
      },
    });

    if (error || !data || data.success === false) {
      const errMsg = data?.error || error?.message || 'Unable to send request to Admin. Please try again.';
      return {
        success: false,
        message: errMsg,
      };
    }

    // Persist pending request ID in localStorage for Cold Start / App Re-open recovery
    localStorage.setItem('pending_login_request_id', requestId);
    localStorage.setItem('pending_login_user_id', cleanUsername);

    return {
      success: true,
      message: 'Request sent to Admin successfully. Waiting for approval.',
      requestId,
    };
  } catch (err) {
    console.error('Error invoking send-login-request:', err);
    return {
      success: false,
      message: 'Unable to send request to Admin. Please try again.',
    };
  }
}

/**
 * Verifies one-time approval token and authenticates session via Supabase Auth OTP.
 */
export async function verifyApprovalAndLogin(requestId: string, token: string): Promise<{ success: boolean; error?: string; profile?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-approval-token', {
      body: { requestId, token },
    });

    if (error || !data || !data.success) {
      let cleanError = 'Token verification failed. Please try again.';
      if (data?.error) {
        cleanError = data.error;
      } else if (error) {
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            if (body && (body.error || body.message)) {
              cleanError = body.error || body.message;
            }
          }
        } catch {
          // ignore json parse error
        }
        if (cleanError === 'Token verification failed. Please try again.' && error.message && !error.message.includes('non-2xx')) {
          cleanError = error.message;
        }
      }
      return { success: false, error: cleanError };
    }

    const { email, otp, profile } = data;

    // Authenticate session via Supabase Auth Magic Link OTP
    const { data: authData, error: authErr } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (authErr || !authData.session) {
      return { success: false, error: authErr?.message || 'Failed to establish Supabase Auth session.' };
    }

    // Verify session user identity matches profile auth_user_id
    if (profile?.auth_user_id && authData.session.user.id !== profile.auth_user_id) {
      await supabase.auth.signOut();
      return { success: false, error: 'Authentication identity mismatch. Session terminated.' };
    }

    // Clear pending login request keys from storage
    localStorage.removeItem('pending_login_request_id');
    localStorage.removeItem('pending_login_user_id');

    return { success: true, profile };
  } catch (err) {
    console.error('verifyApprovalAndLogin error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
