import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

import { useAttendanceContext } from '../../context/AttendanceContext';

export const ApprovalCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser } = useAttendanceContext() as any;

  const requestId = searchParams.get('request');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying approval credentials...');

  useEffect(() => {
    async function handleApproval() {
      if (!requestId || !token) {
        setStatus('error');
        setMessage('Invalid approval link: Missing request ID or token.');
        return;
      }

      try {
        // 1. Invoke Supabase Edge Function to verify single-use token & status
        const { data, error } = await supabase.functions.invoke('verify-approval-token', {
          body: { requestId, token },
        });

        if (error || !data || !data.success) {
          const errText = data?.error || error?.message || 'Verification failed. Token may be invalid or expired.';
          setStatus('error');
          setMessage(errText);
          return;
        }

        // 2. Establish real Supabase Auth session using single-use OTP
        if (data.email && data.otp) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            email: data.email,
            token: data.otp,
            type: 'magiclink',
          });

          if (otpErr) {
            console.warn('OTP verification warning:', otpErr.message);
          }
        }

        // 3. Hydrate profile & update current user
        if (data.profile) {
          const p = data.profile;
          const userObj = {
            id: p.id,
            username: p.username,
            password: '',
            name: p.name,
            role: p.role,
            assignedSiteId: p.assigned_site_id || undefined,
            assignedSectionId: p.assigned_section_id || undefined,
            status: p.status,
            lastLogin: new Date().toLocaleString(),
          };
          if (typeof setCurrentUser === 'function') {
            setCurrentUser(userObj);
          }
        }

        setStatus('success');
        setMessage('Access Approved! Redirecting to Dashboard...');

        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1200);
      } catch (err: any) {
        setStatus('error');
        setMessage(`Verification error: ${err?.message || 'Unable to complete verification.'}`);
      }
    }

    handleApproval();
  }, [requestId, token, navigate, setCurrentUser]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 text-center relative z-10">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
          {status === 'verifying' && <Loader2 className="h-8 w-8 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-300" />}
          {status === 'error' && <AlertCircle className="h-8 w-8 text-rose-300" />}
        </div>

        <div>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
            Universal Attendance Access
          </span>
          <h2 className="text-xl font-black text-white">
            {status === 'verifying' && 'Verifying Access Approval'}
            {status === 'success' && 'Approval Verified!'}
            {status === 'error' && 'Access Verification Failed'}
          </h2>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 text-xs font-medium text-slate-300">
          {message}
        </div>

        {status === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Login</span>
          </button>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center space-x-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Authenticated & Ready</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalCallback;
