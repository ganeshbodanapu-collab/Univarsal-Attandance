import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import {
  Building2,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  MapPin,
  Users,
  ArrowLeft,
  AlertCircle,
  LogIn,
  X,
  Copy,
  Check,
  Search,
  Globe,
} from 'lucide-react';
import type { AppUser } from '../../types';

export const SiteLogin: React.FC = () => {
  const { sites, workers, appUsers, currentUser, loginWithCredentials } = useAttendanceContext();
  const navigate = useNavigate();

  // Public live link URL
  const publicLiveUrl =
    typeof window !== 'undefined' && window.location.origin.includes('lhr.life')
      ? window.location.origin
      : 'https://8a1afbc9c2801f.lhr.life';

  // Selected site or 'admin' (null means Step 1: Site Selection)
  const [selectedPortal, setSelectedPortal] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Demo Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSearch, setDemoSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPasswordsMap, setShowPasswordsMap] = useState<Record<string, boolean>>({});

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

  // Corresponding default user for this portal (for helper hints)
  const portalUser = isAdminPortal
    ? appUsers.find((u) => u.role === 'admin')
    : appUsers.find((u) => u.assignedSiteId === selectedPortal);

  // When user clicks a site or admin card
  const handleSelectSite = (portalId: string) => {
    setSelectedPortal(portalId);
    setError(null);
    setUsername('');
    setPassword('');
  };

  // Auto-fill demo credentials for quick convenience
  const handleAutoFillDemo = () => {
    if (portalUser) {
      setUsername(portalUser.username);
      setPassword(portalUser.password);
      setError(null);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle password visibility in demo modal
  const toggleDemoPassword = (userId: string) => {
    setShowPasswordsMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // 1-Click Instant Login from Demo Modal
  const handleInstantLogin = (user: AppUser) => {
    setSelectedPortal(user.assignedSiteId || 'admin');
    setUsername(user.username);
    setPassword(user.password);
    setShowDemoModal(false);
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = loginWithCredentials(
        user.username,
        user.password,
        user.assignedSiteId || 'admin'
      );

      if (result.success && result.user) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Authentication failed. Please verify credentials.');
        setLoading(false);
      }
    }, 200);
  };

  // Select User and Fill Form from Demo Modal
  const handleSelectForFill = (user: AppUser) => {
    setSelectedPortal(user.assignedSiteId || 'admin');
    setUsername(user.username);
    setPassword(user.password);
    setError(null);
    setShowDemoModal(false);
  };

  // Handle Login Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = loginWithCredentials(
        username.trim(),
        password.trim(),
        selectedPortal || undefined
      );

      if (result.success && result.user) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Authentication failed. Please verify credentials.');
        setLoading(false);
      }
    }, 250);
  };

  // Filtered users for demo modal
  const filteredUsers = appUsers.filter((u) => {
    const q = demoSearch.trim().toLowerCase();
    if (!q) return true;
    const siteObj = sites.find((s) => s.id === u.assignedSiteId);
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.assignedSiteId && u.assignedSiteId.toLowerCase().includes(q)) ||
      (siteObj && siteObj.name.toLowerCase().includes(q)) ||
      (u.teamName && u.teamName.toLowerCase().includes(q))
    );
  });

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

        {/* Action Controls in Top Bar: Public Link & Demo Modal Trigger */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Public Link Share Pill */}
          <div className="hidden md:flex items-center space-x-1.5 bg-blue-950/60 border border-blue-500/30 px-3 py-1.5 rounded-full text-xs text-blue-200">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-slate-300">Public:</span>
            <span className="font-mono text-[11px] text-blue-300 font-bold max-w-[160px] truncate">
              {publicLiveUrl}
            </span>
            <button
              onClick={() => handleCopyText(publicLiveUrl, 'topPublicLink')}
              className="p-1 hover:text-white rounded transition-colors cursor-pointer"
              title="Copy public link"
            >
              {copiedKey === 'topPublicLink' ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-blue-300" />
              )}
            </button>
          </div>

          {/* Demo Users & Passwords Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-400/40 text-xs font-black inline-flex items-center space-x-2 shadow-lg shadow-amber-500/10 transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Demo Users &amp; Passwords</span>
          </button>

          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[11px]">Online</span>
          </div>
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
                <Sparkles className="h-3.5 w-3.5" />
                <span>Step 1: Choose Operational Location</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Select Your Project Site
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Each construction site has localized supervisor credentials. Select your site or log in as System Administrator to proceed.
              </p>
            </div>

            {/* Prominent Demo Modal Launcher Banner */}
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border border-amber-400/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-black">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-200">
                    Public Demo Access &bull; All User Passwords Available
                  </h4>
                  <p className="text-xs text-amber-300/80">
                    Click the Demo Modal to view credentials for Universal Admin &amp; all Site Supervisors or log in with 1-click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-black inline-flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Open All Demo Users Modal</span>
              </button>
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
                  const siteUser = appUsers.find((u) => u.assignedSiteId === site.id);

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

                        <div className="pt-2 flex items-center justify-between text-blue-400 text-xs font-bold group-hover:text-blue-300">
                          <span className="text-[11px] text-slate-500">
                            User ID: {siteUser?.username || 'site_' + site.code.toLowerCase()}
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>Select</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Demo Credentials Assistant */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-white">Need Login Details?</strong> Click any site above to log in, or open the{' '}
                  <button
                    onClick={() => setShowDemoModal(true)}
                    className="text-amber-300 font-bold underline cursor-pointer hover:text-amber-200"
                  >
                    Demo Users Modal
                  </button>{' '}
                  to view all accounts with 1-click instant login.
                </span>
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

              <div className="flex items-center space-x-3">
                {!isAdminPortal && (
                  <button
                    type="button"
                    onClick={() => handleSelectSite('admin')}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Change to Admin App</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>View All Demo Passwords</span>
                </button>
              </div>
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
                      placeholder={isAdminPortal ? 'e.g. admin' : `e.g. ${portalUser?.username || 'site_...'}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/15 rounded-2xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Case-insensitive login identifier
                  </span>
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

                {/* Auto-fill demo credentials chip */}
                {portalUser && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-400 block">Preset Site Login:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {portalUser.username}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillDemo}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isAdminPortal
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>
                    {loading
                      ? 'Authenticating...'
                      : isAdminPortal
                      ? 'Access Admin Dashboard'
                      : `Enter ${selectedSite?.name || 'Site'}`}
                  </span>
                </button>

                {!isAdminPortal && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSite('admin')}
                      className="w-full py-2.5 px-4 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Shield className="h-4 w-4 text-purple-400" />
                      <span>Change to Universal Admin App</span>
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
        <div className="flex items-center space-x-2">
          <span>Public Link:</span>
          <a
            href={publicLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono"
          >
            {publicLiveUrl}
          </a>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ALL DEMO USERS & PASSWORDS MODAL                                      */}
      {/* ===================================================================== */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setShowDemoModal(false)}
          />

          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                    <span>All Demo Users &amp; Passwords</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Public Demo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select any account to auto-fill or use 1-Click Instant Login to explore immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDemoModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Public Link Callout inside Modal */}
            <div className="px-5 sm:px-6 py-2.5 bg-blue-950/50 border-b border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-blue-300">
                <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Shareable Public Link:</span>
                <span className="font-mono font-bold text-white bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
                  {publicLiveUrl}
                </span>
              </div>
              <button
                onClick={() => handleCopyText(publicLiveUrl, 'modalPublicLink')}
                className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/30 text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer"
              >
                {copiedKey === 'modalPublicLink' ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="p-4 sm:px-6 bg-slate-900 border-b border-slate-800">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={demoSearch}
                  onChange={(e) => setDemoSearch(e.target.value)}
                  placeholder="Search by user name, User ID (admin, site_...), role, or site..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Users Grid Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((user) => {
                  const siteObj = sites.find((s) => s.id === user.assignedSiteId);
                  const isVisible = showPasswordsMap[user.id] || false;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        user.role === 'admin'
                          ? 'bg-purple-950/20 border-purple-500/40 hover:border-purple-400'
                          : 'bg-slate-950/60 border-slate-800 hover:border-blue-500/40'
                      }`}
                    >
                      <div>
                        {/* User Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                                user.role === 'admin'
                                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-600/25'
                                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-600/25'
                              }`}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">{user.name}</h4>
                              <p className="text-[11px] text-slate-400">
                                {user.role === 'admin'
                                  ? 'Central System Administrator'
                                  : `${siteObj?.name || user.assignedSiteId || 'Site'}`}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>

                        {/* Assignment Details */}
                        {user.role === 'supervisor' && (
                          <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                            <p>
                              Team: <span className="text-slate-200 font-bold">{user.teamName || 'Site Crew'}</span>
                            </p>
                            <p>
                              Phone: <span className="text-slate-300">{user.mobile || 'N/A'}</span>
                            </p>
                          </div>
                        )}

                        {/* Credentials Details Box */}
                        <div className="mt-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                          {/* User ID */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px] font-bold uppercase">User ID:</span>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-amber-300 font-bold">{user.username}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(user.username, `uid-${user.id}`)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                title="Copy User ID"
                              >
                                {copiedKey === `uid-${user.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Password */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px] font-bold uppercase">Password:</span>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-slate-200 font-bold">
                                {isVisible ? user.password : '••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleDemoPassword(user.id)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                title={isVisible ? 'Hide password' : 'Show password'}
                              >
                                {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyText(user.password, `pass-${user.id}`)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                title="Copy Password"
                              >
                                {copiedKey === `pass-${user.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: 1-Click Instant Login & Fill Form */}
                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInstantLogin(user)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black inline-flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                            user.role === 'admin'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          <span>⚡ Instant Login</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectForFill(user)}
                          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                          title="Fill credentials into login form"
                        >
                          Fill Form
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Universal Attendance System &bull; Active Credentials Vault</span>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteLogin;
