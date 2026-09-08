import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Modal } from './Modal';
import {
  Shield,
  Users,
  ArrowDown,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface SwitchToAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SwitchToAdminModal: React.FC<SwitchToAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, appUsers, sites, switchUser } = useAttendanceContext();
  const navigate = useNavigate();

  const isSupervisor = currentUser?.role === 'supervisor';
  const currentSite = sites.find((s) => s.id === currentUser?.assignedSiteId);

  // Admin user record
  const adminUser = appUsers.find((u) => u.role === 'admin') || appUsers[0];

  // Supervisor users (for switching from Admin to Supervisor if opened by admin)
  const supervisorUsers = appUsers.filter((u) => u.role === 'supervisor');
  const [selectedTargetSupervisorId, setSelectedTargetSupervisorId] = useState<string>(
    supervisorUsers[0]?.id || ''
  );

  // Password verify state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSwitching(false);
    }
  }, [isOpen]);

  const handleExecuteSwitch = (targetUserId: string) => {
    setIsSwitching(true);
    setError(null);

    setTimeout(() => {
      switchUser(targetUserId);
      setIsSwitching(false);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      navigate('/dashboard');
    }, 200);
  };

  const handleInstantSwitchToAdmin = () => {
    if (!adminUser) return;
    handleExecuteSwitch(adminUser.id);
  };

  const handlePasswordSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    if (password !== adminUser.password) {
      setError('Incorrect Admin password. Please check credentials or use 1-Click Instant Switch.');
      return;
    }

    handleExecuteSwitch(adminUser.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSupervisor ? 'Change to Admin App' : 'App & Role Switcher'}
      subtitle={
        isSupervisor
          ? 'Switch from Site Supervisor portal to Central Universal Admin App'
          : 'Switch between Universal Admin and Site Supervisor App modes'
      }
      icon={<Shield className="h-5 w-5 text-purple-600" />}
      size="lg"
    >
      <div className="space-y-5">
        {/* CURRENT SESSION CARD */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Current Active App
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isSupervisor
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {isSupervisor ? 'Supervisor App' : 'Admin App'}
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0 ${
                isSupervisor
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
              }`}
            >
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-slate-900 truncate">
                {currentUser?.name || 'User'}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {isSupervisor
                  ? `${currentSite?.name || currentUser?.assignedSiteId} • ${currentUser?.teamName || 'Site Crew'}`
                  : 'Universal Management • All Sites'}
              </p>
            </div>
          </div>
        </div>

        {/* TRANSITION ARROW INDICATOR */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shadow-2xs">
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            <span>Switching To</span>
          </div>
        </div>

        {/* TARGET ADMIN APP CARD */}
        {isSupervisor ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/5 via-indigo-950/5 to-blue-950/5 border-2 border-purple-300 space-y-3 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-purple-900">
                  Target: Central Universal Admin App
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
                Full Authority
              </span>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-purple-600/30 shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-purple-950">
                  {adminUser?.name || 'Amit Singh'} ({adminUser?.username || 'admin'})
                </h4>
                <p className="text-xs text-purple-800/80 font-medium">
                  Universal System Administrator
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-950/80 pt-2 border-t border-purple-200/60 font-medium">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>All {sites.length} Construction Sites</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Enterprise Workforce Registry</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Advance &amp; Commission Ledgers</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>System-Wide Reports &amp; PDF</span>
              </div>
            </div>
          </div>
        ) : (
          /* When current user is Admin, allow switching to any supervisor app */
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-900 block">
              Select Target Site Supervisor Portal:
            </span>
            <div className="space-y-2">
              {supervisorUsers.map((sup) => {
                const sObj = sites.find((s) => s.id === sup.assignedSiteId);
                const isSelected = selectedTargetSupervisorId === sup.id;
                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedTargetSupervisorId(sup.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-xs'
                        : 'bg-white/70 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {sup.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{sup.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {sObj?.name} ({sObj?.code}) &bull; {sup.teamName || 'Crew'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ERROR NOTICE */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ACTION OPTION 1: 1-CLICK INSTANT SWITCH (DEMO MODE) */}
        {isSupervisor ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={isSwitching}
              onClick={handleInstantSwitchToAdmin}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/25 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>⚡ 1-Click Instant Change to Admin App</span>
            </button>

            {/* ACTION OPTION 2: VERIFY WITH ADMIN PASSWORD */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Or Verify with Admin Password
              </span>
              <form onSubmit={handlePasswordSwitch} className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Admin Password (Admin@2026)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!password || isSwitching}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Verify &amp; Switch
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => handleExecuteSwitch(selectedTargetSupervisorId)}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Users className="h-4 w-4" />
              <span>Switch to Selected Supervisor App</span>
            </button>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs text-slate-500">
          <span>Role changes take effect instantly across all screens.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
