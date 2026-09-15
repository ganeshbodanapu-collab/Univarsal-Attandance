import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Capacitor } from '@capacitor/core';
import {
  Building2,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  MapPin,
  Users,
  ArrowLeft,
  AlertCircle,
  LogIn,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { sendLoginAccessRequest, verifyApprovalAndLogin } from '../../lib/loginRequest';
import { supabase } from '../../lib/supabase';


export const SiteLogin: React.FC = () => {
  const { sites, workers, currentUser, loginWithCredentials } = useAttendanceContext();
  const navigate = useNavigate();

  // Selected site or 'admin' (null means Step 1: Site Selection / Website Modal)
  // On Android APK / Capacitor native platform, hide Website Modal and open directly to Login Screen ('admin').
  const [selectedPortal, setSelectedPortal] = useState<string | null>(
    Capacitor.isNativePlatform() ? 'admin' : null
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Request to Admin State
  const [showRequestButton, setShowRequestButton] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState<{ success: boolean; message: string } | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  // Selected Site Object or Admin metadata
  const selectedSite = selectedPortal && selectedPortal !== 'admin'
    ? sites.find((s) => s.id === selectedPortal)
    : null;

  const isAdminPortal = selectedPortal === 'admin';

  // When user clicks a site or admin card
  const handleSelectSite = (portalId: string) => {
    setSelectedPortal(portalId);
    setError(null);
    setShowRequestButton(false);
    setRequestResult(null);
    setUsername('');
    setPassword('');
  };

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent concurrent duplicate submit clicks
    setError(null);
    setRequestResult(null);
    setShowRequestButton(false);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithCredentials(
        username.trim(),
        password.trim(),
        selectedPortal || undefined
      );

      if (result.success && result.user) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Invalid User ID or Password.');
        if (result.userNotFound) {
          setShowRequestButton(false);
        } else {
          setShowRequestButton(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid User ID or Password.');
      setShowRequestButton(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle Realtime approval auto-login with strict UI state machine
  const handleApprovalAutoLogin = async (requestId: string, token: string) => {
    console.log(`[STEP-28 DIAGNOSTIC] Approval signal received for request ID: ${requestId}. Initiating authentication handoff...`);
    setError(null);
    setRequestResult({
      success: true,
      message: '✅ Login Request APPROVED by Admin! Signing in automatically...',
    });

    const authRes = await verifyApprovalAndLogin(requestId, token);
    if (authRes.success) {
      console.log(`[STEP-28 DIAGNOSTIC] Authentication session verified & profile loaded. Navigating to /dashboard...`);
      setRequestResult({
        success: true,
        message: '🎉 Authenticated successfully! Redirecting to Dashboard...',
      });
      navigate('/dashboard', { replace: true });
    } else {
      console.error(`[STEP-28 DIAGNOSTIC] Auto-login handoff failed:`, authRes.error);
      const userFacingErr = authRes.error && !authRes.error.includes('non-2xx')
        ? authRes.error
        : 'Approval received, but automatic login failed. Please try again.';

      setRequestResult({
        success: false,
        message: `Approval received, but automatic login failed: ${userFacingErr}`,
      });
      setError(null);
      localStorage.removeItem('pending_login_request_id');
      localStorage.removeItem('pending_login_user_id');
    }
  };

  // Check pending request on component mount & subscribe if pending + 3s DB Polling Fallback
  useEffect(() => {
    const pendingRequestId = localStorage.getItem('pending_login_request_id');
    if (!pendingRequestId) return;
    const reqId = pendingRequestId;

    let channel: any = null;
    let pollTimer: any = null;
    let isHandled = false;

    async function checkAndListenPendingRequest() {
      if (isHandled) return;
      console.log(`[STEP-28 DIAGNOSTIC] Checking DB status for pending request: ${reqId}`);
      const { data: requestRecord } = await supabase
        .from('login_requests')
        .select('*')
        .eq('request_id', reqId)
        .maybeSingle();

      if (!requestRecord) {
        console.log(`[STEP-28 DIAGNOSTIC] No request record found in DB for ${reqId}. Clearing storage.`);
        localStorage.removeItem('pending_login_request_id');
        localStorage.removeItem('pending_login_user_id');
        if (pollTimer) clearInterval(pollTimer);
        return;
      }

      console.log(`[STEP-28 DIAGNOSTIC] Status for ${reqId}: ${requestRecord.status}`);

      if (requestRecord.status === 'APPROVED' && requestRecord.raw_token) {
        isHandled = true;
        if (pollTimer) clearInterval(pollTimer);
        if (channel) supabase.removeChannel(channel);
        await handleApprovalAutoLogin(reqId, requestRecord.raw_token);
      } else if (requestRecord.status === 'REJECTED') {
        isHandled = true;
        if (pollTimer) clearInterval(pollTimer);
        if (channel) supabase.removeChannel(channel);
        setRequestResult({
          success: false,
          message: '❌ Login request rejected by Admin.',
        });
        localStorage.removeItem('pending_login_request_id');
        localStorage.removeItem('pending_login_user_id');
      } else if (requestRecord.status === 'PENDING') {
        setShowRequestButton(true);
        setRequestResult({
          success: true,
          message: 'Request sent to Admin successfully. Waiting for approval...',
        });

        // 1. Subscribe to Realtime UPDATE event
        if (!channel) {
          console.log(`[STEP-28 DIAGNOSTIC] Subscribing to Realtime channel login_req_${reqId}`);
          channel = supabase
            .channel(`login_req_${reqId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'login_requests',
                filter: `request_id=eq.${reqId}`,
              },
              async (payload) => {
                const updatedRow = payload.new;
                console.log(`[STEP-28 DIAGNOSTIC] Realtime UPDATE event received for ${reqId}: status=${updatedRow?.status}`);
                if (updatedRow && updatedRow.status === 'APPROVED' && updatedRow.raw_token && !isHandled) {
                  isHandled = true;
                  if (pollTimer) clearInterval(pollTimer);
                  if (channel) supabase.removeChannel(channel);
                  await handleApprovalAutoLogin(reqId, updatedRow.raw_token);
                } else if (updatedRow && updatedRow.status === 'REJECTED' && !isHandled) {
                  isHandled = true;
                  if (pollTimer) clearInterval(pollTimer);
                  if (channel) supabase.removeChannel(channel);
                  setRequestResult({
                    success: false,
                    message: '❌ Login request rejected by Admin.',
                  });
                  localStorage.removeItem('pending_login_request_id');
                  localStorage.removeItem('pending_login_user_id');
                }
              }
            )
            .subscribe((status) => {
              console.log(`[STEP-28 DIAGNOSTIC] Realtime subscription status for ${reqId}: ${status}`);
            });
        }
      }
    }

    checkAndListenPendingRequest();

    // 2. Add 3s DB Fallback Polling Timer (guarantees completion even if WebSockets delay)
    pollTimer = setInterval(() => {
      checkAndListenPendingRequest();
    }, 3000);

    // App Resume / Visibility Change Listener (Handles switching back from Telegram)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`[STEP-28 DIAGNOSTIC] App returned to foreground. Re-checking request status for: ${reqId}`);
        checkAndListenPendingRequest();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);


  // Handle Send Request to Admin
  const handleSendRequestToAdmin = async () => {
    if (sendingRequest) return;
    if (!username.trim()) {
      setError('Please enter your User ID before sending request to Admin.');
      return;
    }

    setSendingRequest(true);
    setRequestResult(null);

    const res = await sendLoginAccessRequest(username.trim());
    setSendingRequest(false);

    if (res.success && res.requestId) {
      const cleanRequestId = res.requestId;
      setRequestResult({
        success: true,
        message: 'Request sent to Admin successfully. Waiting for approval...',
      });

      // Subscribe to Realtime update for this fresh request
      const channel = supabase
        .channel(`login_req_${cleanRequestId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'login_requests',
            filter: `request_id=eq.${cleanRequestId}`,
          },
          async (payload) => {
            const updatedRow = payload.new;
            if (updatedRow && updatedRow.status === 'APPROVED' && updatedRow.raw_token) {
              supabase.removeChannel(channel);
              await handleApprovalAutoLogin(cleanRequestId, updatedRow.raw_token);
            } else if (updatedRow && updatedRow.status === 'REJECTED') {
              supabase.removeChannel(channel);
              setRequestResult({
                success: false,
                message: '❌ Login request rejected by Admin.',
              });
              localStorage.removeItem('pending_login_request_id');
              localStorage.removeItem('pending_login_user_id');
            }
          }
        )
        .subscribe();
    } else {
      setRequestResult({
        success: false,
        message: res.message,
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/10 relative z-10 gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <span className="font-black text-white text-base sm:text-lg tracking-tight block">
              Univarsal Attandance
            </span>
            <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase block">
              Multi-Site Workforce Portal
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[11px]">System Active</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-5xl mx-auto w-full py-8 md:py-12 relative z-10 my-auto">
        {!selectedPortal ? (
          /* ============================================================ */
          /* STEP 1: SELECT SITE OR ADMIN PORTAL                          */
          /* ============================================================ */
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                <span>Step 1: Choose Operational Location</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Select Your Project Site
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Each construction site has localized supervisor credentials. Select your site or log in as System Administrator to proceed.
              </p>
            </div>

            {/* Central Admin Portal Option */}
            <div
              onClick={() => handleSelectSite('admin')}
              className="bg-gradient-to-r from-purple-900/40 via-slate-900/60 to-indigo-900/40 border border-purple-500/30 hover:border-purple-400 rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                      Universal System Administrator
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Chief Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Central authority with full multi-site access, monthly bill settlements, system-wide reports, and workforce deployment.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold group-hover:translate-x-1 transition-transform self-end sm:self-center shrink-0">
                <span>Admin Login</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Project Sites Grid */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Project Construction Sites ({sites.length})
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {sites.map((site) => {
                  const siteWorkers = workers.filter((w) => w.currentSiteId === site.id);

                  return (
                    <div
                      key={site.id}
                      onClick={() => handleSelectSite(site.id)}
                      className="bg-slate-900/70 hover:bg-slate-850 border border-white/10 hover:border-blue-500/50 rounded-3xl p-5 space-y-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="h-10 w-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <span className="font-mono text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                            {site.code}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                            {site.name}
                          </h3>
                          <div className="flex items-center space-x-1 text-xs text-slate-400 mt-1">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{site.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Supervisor:</span>
                          <span className="font-bold text-slate-200">{site.inCharge}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Active Workforce:</span>
                          <span className="font-bold text-emerald-400 flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{siteWorkers.length} Workers</span>
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-end text-blue-400 text-xs font-bold group-hover:text-blue-300">
                          <span className="flex items-center space-x-1">
                            <span>Select Site</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* STEP 2: SITE-SPECIFIC USER ID & PASSWORD PROMPT              */
          /* ============================================================ */
          <div className="max-w-md mx-auto w-full animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPortal(null)}
                className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>← Back to Site Selection</span>
              </button>
            </div>

            {/* Selected Site / Admin Header Banner */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center space-x-4 border-b border-white/10 pb-5">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 ${
                    isAdminPortal
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/30'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-600/30'
                  }`}
                >
                  {isAdminPortal ? <Shield className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                    {isAdminPortal ? 'System Administration' : `Site Code: ${selectedSite?.code}`}
                  </span>
                  <h2 className="text-lg font-black text-white">
                    {isAdminPortal ? 'Universal Admin Portal' : selectedSite?.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isAdminPortal
                      ? 'Enter Chief Administrator credentials'
                      : `Supervisor: ${selectedSite?.inCharge} • ${selectedSite?.location}`}
                  </p>
                </div>
              </div>

              {/* Error Alert Banner */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium p-3.5 rounded-2xl flex items-start space-x-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Request Result Alert Banner */}
              {requestResult && (
                <div
                  className={`text-xs font-medium p-3.5 rounded-2xl flex items-start space-x-2.5 border ${
                    requestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {requestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{requestResult.message}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    {isAdminPortal ? 'Administrator User ID *' : 'Site User ID / Username *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder={isAdminPortal ? 'Enter User ID' : 'Enter User ID'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/15 rounded-2xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/15 rounded-2xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || sendingRequest}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isAdminPortal
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>
                        {isAdminPortal ? 'Access Admin Dashboard' : `Enter ${selectedSite?.name || 'Site'}`}
                      </span>
                    </>
                  )}
                </button>

                {/* Send Request to Admin Button (Shown when login fails) */}
                {showRequestButton && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSendRequestToAdmin}
                      disabled={sendingRequest || requestResult?.success}
                      className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer ${
                        requestResult?.success
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 opacity-80 cursor-not-allowed'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 active:scale-98'
                      }`}
                    >
                      {sendingRequest ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                          <span>Sending Request to Admin...</span>
                        </>
                      ) : requestResult?.success ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Request Sent to Admin</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 text-amber-300" />
                          <span>Send Request to Admin</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="max-w-6xl mx-auto w-full py-4 border-t border-white/10 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-10">
        <span>Univarsal Attandance &bull; Multi-Site Worker Attendance &amp; Wage Management System</span>
        <span className="text-[11px] text-slate-400">Production Auth v1.0</span>
      </div>
    </div>
  );
};

export default SiteLogin;
