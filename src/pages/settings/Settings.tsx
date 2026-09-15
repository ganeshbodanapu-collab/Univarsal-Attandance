import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Toast } from '../../components/common/Toast';
import {
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Building2,
  Layers,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Shield,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft,
  Crown,
  ExternalLink,
  Trash2,
  UserPlus,
  X,
  ShieldAlert,
} from 'lucide-react';
import type { AppUser } from '../../types';
import { authService } from '../../lib/auth';


export const Settings: React.FC = () => {
  const {
    appUsers,
    currentUser,
    updateAppUser,
    addAppUser,
    deleteAppUser,
    sites,
    sections,
    updateSection,
    workers,
    attendance,
    settings,
    updateSettings,
  } = useAttendanceContext();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isSupervisor = currentUser?.role === 'supervisor';
  const isAdmin = currentUser?.role === 'admin';

  // Group accounts
  const adminUsers = appUsers.filter((u) => u.role === 'admin');
  const supervisorUsers = isSupervisor
    ? appUsers.filter((u) => u.id === currentUser?.id)
    : appUsers.filter((u) => u.role === 'supervisor');

  // Default active user ID:
  // For supervisor: strictly currentUser.id
  // For admin: currentUser.id (the logged-in administrator) or first admin
  const defaultUserId = isSupervisor
    ? (currentUser?.id || '')
    : (currentUser?.id || adminUsers[0]?.id || supervisorUsers[0]?.id || '');

  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUserId);

  // Active user object:
  // Supervisors can ONLY ever see their own account (currentUser)
  // Admins can see either their own Admin account or any selected supervisor account
  const activeUser: AppUser | undefined = isSupervisor
    ? currentUser
    : (appUsers.find((u) => u.id === selectedUserId) || currentUser || appUsers[0]);

  // --------------------------------------------------------------------------
  // SUPERVISOR MANAGEMENT & PASSWORD VISIBILITY STATE
  // --------------------------------------------------------------------------
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [showAddSupervisorModal, setShowAddSupervisorModal] = useState(false);

  const [newSupName, setNewSupName] = useState('');
  const [newSupUsername, setNewSupUsername] = useState('');
  const [newSupPassword, setNewSupPassword] = useState('');
  const [newSupSiteId, setNewSupSiteId] = useState('');
  const [newSupSectionId, setNewSupSectionId] = useState('');
  const [newSupMobile, setNewSupMobile] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateNewSupPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    const prefix = newSupName ? newSupName.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Site';
    const pass = `${prefix}@${rand}26`;
    setNewSupPassword(pass);
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newSupUsername.trim().toLowerCase();
    if (!newSupName.trim() || !cleanUser || !newSupPassword.trim()) {
      alert('Please fill in Name, User ID, and Password.');
      return;
    }
    if (cleanUser.length < 3) {
      alert('User ID must be at least 3 characters long.');
      return;
    }
    if (/\s/.test(cleanUser)) {
      alert('User ID cannot contain spaces.');
      return;
    }
    const exists = appUsers.some((u) => u.username.toLowerCase() === cleanUser);
    if (exists) {
      alert(`User ID "${cleanUser}" is already taken. Please choose a unique User ID.`);
      return;
    }

    const assignedSite = sites.find((s) => s.id === newSupSiteId) || sites[0];
    const assignedSec = sections.find((s) => s.id === newSupSectionId) || sections.find((s) => s.siteId === assignedSite?.id);

    const res = await authService.adminCreateUser({
      name: newSupName.trim(),
      username: cleanUser,
      password: newSupPassword.trim(),
      role: 'supervisor',
      assignedSiteId: assignedSite?.id || '',
      assignedSectionId: assignedSec?.id || '',
      mobile: newSupMobile.trim(),
      email: newSupEmail.trim(),
    });

    if (!res.success) {
      alert(`Failed to create site supervisor: ${res.error}`);
      return;
    }

    if (res.appUser) {
      const created = addAppUser({
        name: res.appUser.name,
        username: res.appUser.username,
        password: '',
        role: 'supervisor',
        assignedSiteId: res.appUser.assigned_site_id || '',
        assignedSectionId: res.appUser.assigned_section_id || '',
        teamName: assignedSec ? `${assignedSec.name} Team` : 'Site Team',
        mobile: res.appUser.mobile || '',
        email: res.appUser.email || '',
        status: 'active',
        createdDate: new Date().toISOString().split('T')[0],
      });
      setSelectedUserId(created.id);
    }

    setToastMessage(`✓ Site Supervisor "${newSupName.trim()}" created in Supabase Auth! User ID: "${cleanUser}"`);
    setShowAddSupervisorModal(false);
    setNewSupName('');
    setNewSupUsername('');
    setNewSupPassword('');
    setNewSupSiteId('');
    setNewSupSectionId('');
    setNewSupMobile('');
    setNewSupEmail('');
  };


  const handleDeleteSupervisor = (userId: string, supName: string) => {
    if (!window.confirm(`Are you sure you want to delete supervisor account "${supName}"?`)) return;
    deleteAppUser(userId);
    if (selectedUserId === userId) {
      setSelectedUserId(currentUser?.id || adminUsers[0]?.id || '');
    }
    setToastMessage(`Supervisor account "${supName}" deleted.`);
  };

  // --------------------------------------------------------------------------
  // 1. PROFILE FORM STATE (Admin or Supervisor)
  // --------------------------------------------------------------------------
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // --------------------------------------------------------------------------
  // 2. USER ID & PASSWORD CHANGING FORM STATE
  // --------------------------------------------------------------------------
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --------------------------------------------------------------------------
  // 3. TEAM CHANGING FORM STATE (For supervisors)
  // --------------------------------------------------------------------------
  const [targetSiteId, setTargetSiteId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [customTeamName, setCustomTeamName] = useState('');

  // --------------------------------------------------------------------------
  // 4. ADVANCED MULTIPLIERS (COLLAPSIBLE OPTION - Admin only)
  // --------------------------------------------------------------------------
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);
  const [foodPresent, setFoodPresent] = useState(String(settings.foodPresentRate));
  const [foodHalfDay, setFoodHalfDay] = useState(String(settings.foodHalfDayRate));
  const [foodAbsent, setFoodAbsent] = useState(String(settings.foodAbsentRate));
  const [wagePresent, setWagePresent] = useState(String(settings.wagePresentMultiplier));
  const [wageHalfDay, setWageHalfDay] = useState(String(settings.wageHalfDayMultiplier));
  const [wageAbsent, setWageAbsent] = useState(String(settings.wageAbsentMultiplier));
  const [commPresent, setCommPresent] = useState(String(settings.commissionPresentMultiplier));
  const [commHalfDay, setCommHalfDay] = useState(String(settings.commissionHalfDayMultiplier));
  const [commAbsent, setCommAbsent] = useState(String(settings.commissionAbsentMultiplier));

  // Sync state whenever selected user changes
  useEffect(() => {
    if (activeUser) {
      setProfileName(activeUser.name || '');
      setProfileMobile(activeUser.mobile || '');
      setProfileEmail(activeUser.email || '');
      setNewUsername(activeUser.username || '');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      if (activeUser.role === 'supervisor') {
        const currentSite =
          isSupervisor && currentUser?.assignedSiteId
            ? currentUser.assignedSiteId
            : activeUser.assignedSiteId || sites[0]?.id || '';
        setTargetSiteId(currentSite);

        // Find section for this supervisor
        const supSection = sections.find(
          (sec) =>
            sec.id === activeUser.assignedSectionId ||
            sec.inCharge?.toLowerCase() === activeUser.name?.toLowerCase() ||
            sec.siteId === currentSite
        );

        setTargetSectionId(activeUser.assignedSectionId || supSection?.id || '');
        setCustomTeamName(activeUser.teamName || (supSection ? `${supSection.name} Team` : ''));
      }
    }
  }, [selectedUserId, activeUser?.id, isSupervisor, currentUser?.assignedSiteId]);

  // Handle site change in team changer (Admin only - supervisors are locked to their assigned site)
  const handleSiteChange = (siteId: string) => {
    if (isSupervisor) return;
    setTargetSiteId(siteId);
    const siteSecs = sections.filter((s) => s.siteId === siteId);
    if (siteSecs.length > 0) {
      setTargetSectionId(siteSecs[0].id);
      setCustomTeamName(`${siteSecs[0].name} Team`);
    } else {
      setTargetSectionId('');
      setCustomTeamName('');
    }
  };

  // Handle section change in team changer
  const handleSectionChange = (sectionId: string) => {
    setTargetSectionId(sectionId);
    const sec = sections.find((s) => s.id === sectionId);
    if (sec) {
      setCustomTeamName(`${sec.name} Team`);
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMessage(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate a random secure password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = activeUser?.name
      ? activeUser.name.split(' ')[0].replace(/[^a-zA-Z]/g, '')
      : (activeUser?.role === 'admin' ? 'Admin' : 'Site');
    const pass = `${prefix}@${randomPart}26`;
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    setToastMessage(`Generated strong password: ${pass}`);
  };

  // Save Profile Details (Name, Phone, Email)
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    if (!profileName.trim()) {
      alert('Name cannot be empty.');
      return;
    }

    updateAppUser(activeUser.id, {
      name: profileName.trim(),
      mobile: profileMobile.trim(),
      email: profileEmail.trim(),
    });

    setToastMessage(
      `${activeUser.role === 'admin' ? 'Administrator' : 'Supervisor'} profile for "${profileName}" updated successfully!`
    );
  };

  // Save User ID (Username)
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    const cleanUser = newUsername.trim().toLowerCase();

    if (!cleanUser) {
      alert('User ID cannot be empty.');
      return;
    }

    if (cleanUser.length < 3) {
      alert('User ID must be at least 3 characters.');
      return;
    }

    if (/\s/.test(cleanUser)) {
      alert('User ID cannot contain spaces.');
      return;
    }

    // Check duplicate across all other accounts
    const exists = appUsers.some(
      (u) => u.id !== activeUser.id && u.username.toLowerCase() === cleanUser
    );
    if (exists) {
      alert(`User ID "${cleanUser}" is already taken by another account. Please choose a unique User ID.`);
      return;
    }

    const res = await authService.updateUserCredentials({
      targetUserId: activeUser.id,
      targetUsername: activeUser.username,
      newUsername: cleanUser,
    });

    if (!res.success) {
      alert(`Failed to update User ID: ${res.error}`);
      return;
    }

    updateAppUser(activeUser.id, { username: cleanUser });
    setToastMessage(
      `✓ User ID updated successfully in Supabase Auth & Database to "${cleanUser}" for ${activeUser.role === 'admin' ? 'Administrator' : activeUser.name}!`
    );
  };

  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || isSavingPassword) return;

    if (!newPassword.trim()) {
      alert('Please enter a new password.');
      return;
    }

    if (newPassword.trim().length < 6) {
      alert('Password must be at least 6 characters long for security.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New Password and Confirm Password do not match. Please re-enter.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await authService.updateUserCredentials({
        targetUserId: activeUser.id,
        targetUsername: activeUser.username,
        newPassword: newPassword.trim(),
      });

      if (!res.success) {
        alert(`Password change failed: ${res.error || 'Please try again.'}`);
        return;
      }

      updateAppUser(activeUser.id, {});
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage(
        `✓ Password changed successfully in Supabase Auth & Database for ${activeUser.role === 'admin' ? 'Administrator (' + activeUser.username + ')' : activeUser.name}!`
      );
    } finally {
      setIsSavingPassword(false);
    }
  };


  // Save Team Changing Option (Supervisors only)
  const handleSaveTeamChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || activeUser.role !== 'supervisor') return;

    const siteIdToUse =
      isSupervisor && currentUser?.assignedSiteId
        ? currentUser.assignedSiteId
        : targetSiteId;
    const assignedSite = sites.find((s) => s.id === siteIdToUse);
    const assignedSection = sections.find((s) => s.id === targetSectionId);
    const teamTitle = customTeamName.trim() || (assignedSection ? `${assignedSection.name} Team` : 'Site Team');

    // 1. Update Supervisor AppUser with new assigned site, section, and team name
    updateAppUser(activeUser.id, {
      assignedSiteId: siteIdToUse,
      assignedSectionId: targetSectionId,
      teamName: teamTitle,
    });

    // 2. Also update the Section in-charge to this supervisor
    if (assignedSection) {
      updateSection({
        ...assignedSection,
        inCharge: activeUser.name,
      });
    }

    setToastMessage(
      `✓ Team successfully changed! ${activeUser.name} is now assigned to ${teamTitle} at ${assignedSite?.name || siteIdToUse}.`
    );
  };

  // Save Multipliers (Admin only)
  const handleSaveMultipliers = () => {
    const fPres = parseFloat(foodPresent);
    const fHalf = parseFloat(foodHalfDay);
    const fAbs = parseFloat(foodAbsent);
    const wPres = parseFloat(wagePresent);
    const wHalf = parseFloat(wageHalfDay);
    const wAbs = parseFloat(wageAbsent);
    const cPres = parseFloat(commPresent);
    const cHalf = parseFloat(commHalfDay);
    const cAbs = parseFloat(commAbsent);

    if (
      isNaN(fPres) || isNaN(fHalf) || isNaN(fAbs) ||
      isNaN(wPres) || isNaN(wHalf) || isNaN(wAbs) ||
      isNaN(cPres) || isNaN(cHalf) || isNaN(cAbs)
    ) {
      alert('Please fill in all multiplier options with valid numbers.');
      return;
    }

    updateSettings({
      foodPresentRate: fPres,
      foodHalfDayRate: fHalf,
      foodAbsentRate: fAbs,
      wagePresentMultiplier: wPres,
      wageHalfDayMultiplier: wHalf,
      wageAbsentMultiplier: wAbs,
      commissionPresentMultiplier: cPres,
      commissionHalfDayMultiplier: cHalf,
      commissionAbsentMultiplier: cAbs,
    });

    setToastMessage('Advanced multipliers saved successfully!');
  };

  // Contextual Data for Active User (if supervisor)
  const currentAssignedSite = sites.find(
    (s) => s.id === (isSupervisor ? currentUser?.assignedSiteId : activeUser?.assignedSiteId)
  );
  const currentAssignedSection = sections.find(
    (s) =>
      s.id === activeUser?.assignedSectionId ||
      s.inCharge?.toLowerCase() === activeUser?.name?.toLowerCase() ||
      (activeUser?.assignedSiteId && s.siteId === activeUser.assignedSiteId)
  );

  // Active workers in current supervisor's team
  const supervisorTeamWorkers = workers.filter(
    (w) =>
      w.currentSectionId === (activeUser?.assignedSectionId || currentAssignedSection?.id) &&
      w.currentSiteId === (isSupervisor ? currentUser?.assignedSiteId : activeUser?.assignedSiteId)
  );

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(
    (a) =>
      a.date === todayStr &&
      supervisorTeamWorkers.some((w) => w.id === a.workerId)
  );
  const todayPresentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const todayAbsentCount = todayAttendance.filter((a) => a.status === 'absent').length;

  // Sections under the target site (locked to supervisor's site when role is supervisor)
  const effectiveSiteId =
    isSupervisor && currentUser?.assignedSiteId ? currentUser.assignedSiteId : targetSiteId;
  const filteredTargetSections = sections.filter((s) => s.siteId === effectiveSiteId);
  const selectedTargetSectionObj = sections.find((s) => s.id === targetSectionId);
  const targetSectionWorkersCount = workers.filter(
    (w) => w.currentSectionId === targetSectionId && w.currentSiteId === effectiveSiteId
  ).length;

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-md ${
                activeUser?.role === 'admin'
                  ? 'bg-slate-900 text-amber-400 shadow-slate-900/20'
                  : 'bg-blue-600 text-white shadow-blue-500/20'
              }`}
            >
              {activeUser?.role === 'admin' ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isSupervisor ? 'My Account & Site Settings' : 'Account & Access Settings'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {isSupervisor
                  ? `Manage your login credentials and work team for ${currentAssignedSite?.name || 'your assigned site'}.`
                  : 'Manage Administrator credentials, site supervisor User IDs & passwords, and team assignments.'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Badge */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {activeUser && (
            <div
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-2xl shadow-2xs ${
                activeUser.role === 'admin'
                  ? 'bg-slate-900 text-amber-300 border border-slate-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  activeUser.role === 'admin' ? 'bg-amber-400' : 'bg-emerald-500'
                } ring-2 ${
                  activeUser.role === 'admin' ? 'ring-amber-300/40' : 'ring-emerald-200'
                } animate-pulse`}
              />
              <span className="text-xs font-bold">
                {activeUser.role === 'admin'
                  ? `Master Admin: ${activeUser.name} (${activeUser.username})`
                  : isSupervisor
                  ? `Assigned Site: ${currentAssignedSite?.name || 'Site'} (${activeUser.name})`
                  : `Supervisor: ${activeUser.name} (${activeUser.username})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ACCOUNT SELECTOR TABS (Only visible to Admin)                         */}
      {/* ===================================================================== */}
      {isAdmin && (
        <div className="p-4 bg-slate-50/95 border border-slate-200/90 rounded-2xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Select Account to Manage (Admin &amp; Supervisors):</span>
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-200/80">
                👑 1 Admin
              </span>
              <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200/80">
                👷 {supervisorUsers.length} Supervisors
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
            {/* 1. ADMIN ACCOUNTS (Prominent first section) */}
            {adminUsers.map((adm) => {
              const isSelected = adm.id === selectedUserId;
              return (
                <button
                  key={adm.id}
                  type="button"
                  onClick={() => setSelectedUserId(adm.id)}
                  className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-amber-400'
                      : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-amber-400 text-slate-950 shadow-xs' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    👑
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="leading-tight font-black">{adm.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                          isSelected
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-amber-50 text-amber-800 border border-amber-200/70'
                        }`}
                      >
                        Admin
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono leading-tight ${
                        isSelected ? 'text-amber-200' : 'text-slate-400'
                      }`}
                    >
                      User ID: {adm.username}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="h-8 w-[1px] bg-slate-300 mx-1 shrink-0" />

            {/* 2. SUPERVISOR ACCOUNTS */}
            {supervisorUsers.map((sup) => {
              const siteObj = sites.find((s) => s.id === sup.assignedSiteId);
              const isSelected = sup.id === selectedUserId;
              return (
                <button
                  key={sup.id}
                  type="button"
                  onClick={() => setSelectedUserId(sup.id)}
                  className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/30'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {sup.name.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="leading-tight">{sup.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isSelected ? 'bg-blue-500/40 text-blue-100' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        Supervisor
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-tight ${
                        isSelected ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {siteObj?.name || sup.assignedSiteId} &bull; <strong className="font-mono">{sup.username}</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN MASTER DIRECTORY: SUPERVISOR SITES, USER IDs & PASSWORDS TABLE  */}
      {/* ===================================================================== */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white flex items-center space-x-2">
                  <span>Supervisor Sites, User IDs &amp; Security Passwords</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Master Admin Control
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  View and manage all site supervisor usernames, login passwords, assigned project sites, and trade teams.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewSupSiteId(sites[0]?.id || '');
                setNewSupSectionId(sections[0]?.id || '');
                setShowAddSupervisorModal(true);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black inline-flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add New Site Supervisor</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Site Supervisor</th>
                  <th className="py-3 px-4">Assigned Site</th>
                  <th className="py-3 px-4">User ID (Username)</th>
                  <th className="py-3 px-4">Security Password</th>
                  <th className="py-3 px-4">Trade Team / Section</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisorUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShieldAlert className="h-8 w-8 text-slate-300" />
                        <p className="text-xs font-semibold">No site supervisors created yet.</p>
                        <button
                          type="button"
                          onClick={() => setShowAddSupervisorModal(true)}
                          className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-blue-700 cursor-pointer"
                        >
                          + Add First Site Supervisor
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  supervisorUsers.map((sup) => {
                    const supSite = sites.find((s) => s.id === sup.assignedSiteId);
                    const supSec = sections.find((s) => s.id === sup.assignedSectionId);
                    const isPassVisible = !!visiblePasswords[sup.id];
                    const isSelected = sup.id === selectedUserId;

                    return (
                      <tr
                        key={sup.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                              {sup.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-black text-slate-900">{sup.name}</span>
                                {isSelected && (
                                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                                    Active Selection
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {sup.mobile || sup.email || `ID: ${sup.id}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {supSite ? (
                            <div className="flex items-center space-x-1.5">
                              <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-800 block">{supSite.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {supSite.code} &bull; {supSite.location}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md text-xs inline-block">
                            {sup.username}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-xs">
                              {isPassVisible ? (
                                <strong className="text-amber-700">{sup.password}</strong>
                              ) : (
                                '••••••••••••'
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(sup.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                              title={isPassVisible ? 'Hide password' : 'Show password'}
                            >
                              {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(sup.password, `pass_${sup.id}`)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Copy password"
                            >
                              {copiedKey === `pass_${sup.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">
                            {sup.teamName || supSec?.name || 'General Team'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserId(sup.id)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>Edit User ID &amp; Password</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSupervisor(sup.id, sup.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete supervisor account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeUser && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* =================================================================== */}
          {/* LEFT COLUMN: PROFILE & SYSTEM STATS (5 COLS)                       */}
          {/* =================================================================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* Profile Overview Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div
                className={`p-5 text-white ${
                  activeUser.role === 'admin'
                    ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950'
                    : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl shadow-md ${
                      activeUser.role === 'admin'
                        ? 'bg-gradient-to-tr from-amber-500 to-indigo-600 border-amber-400/50 text-white'
                        : 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-slate-700 text-white'
                    }`}
                  >
                    {activeUser.role === 'admin' ? '👑' : activeUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-black text-white truncate">
                        {activeUser.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          activeUser.role === 'admin'
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                        }`}
                      >
                        {activeUser.role === 'admin' ? 'Master Admin' : 'Supervisor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 flex items-center space-x-1.5">
                      <span>User ID:</span>
                      <strong className="font-mono text-amber-300 font-bold">
                        {activeUser.username}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Quick Info Badges */}
                <div className="mt-4 pt-3 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                  {activeUser.role === 'admin' ? (
                    <>
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Company Scope</span>
                        <span className="font-bold text-amber-300 truncate block mt-0.5">
                          Universal (All {sites.length} Sites)
                        </span>
                      </div>
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Authority</span>
                        <span className="font-bold text-emerald-300 truncate block mt-0.5">
                          Root Clearance
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Site</span>
                        <span className="font-bold text-slate-100 truncate block mt-0.5">
                          {currentAssignedSite?.name || activeUser.assignedSiteId || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Work Team</span>
                        <span className="font-bold text-amber-300 truncate block mt-0.5">
                          {activeUser.teamName || currentAssignedSection?.name || 'General Team'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Editable Profile Information Form */}
              <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>
                      {activeUser.role === 'admin' ? 'Administrator Contact Details' : 'Supervisor Contact Details'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {activeUser.id}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    {activeUser.role === 'admin' ? 'Administrator Full Name:' : 'Supervisor Full Name:'}
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                    placeholder={activeUser.role === 'admin' ? 'e.g. Amit Singh' : 'e.g. Rahul Dev'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Mobile Phone Number:
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={profileMobile}
                      onChange={(e) => setProfileMobile(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                      placeholder="e.g. +91 98000 11111"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                      placeholder={
                        activeUser.role === 'admin'
                          ? 'e.g. admin@universalattendance.com'
                          : 'e.g. supervisor@universalattendance.com'
                      }
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Save className="h-4 w-4 text-blue-400" />
                    <span>
                      {activeUser.role === 'admin' ? 'Save Administrator Details' : 'Save Supervisor Details'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Scope / Workload Stats Card */}
            {activeUser.role === 'admin' ? (
              <div className="bg-gradient-to-r from-amber-50/80 via-slate-50 to-indigo-50/80 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <span>Universal Head Admin System Scope</span>
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    Master Authority
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Total Sites
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                      {sites.length}
                    </span>
                    <span className="text-[10px] text-slate-500">Active Sites</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-blue-600 block">
                      Sections
                    </span>
                    <span className="text-xl font-black text-blue-700 font-mono mt-0.5 block">
                      {sections.length}
                    </span>
                    <span className="text-[10px] text-blue-600">Trade Teams</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                      Workforce
                    </span>
                    <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                      {workers.length}
                    </span>
                    <span className="text-[10px] text-emerald-600">Registered</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Account Created: {activeUser.createdDate || '2026-01-01'}</span>
                  <span>Last Login: {activeUser.lastLogin || 'Active Now'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Team Workload &amp; Attendance</span>
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    Live Status
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Team Size
                    </span>
                    <span className="text-xl font-black text-slate-800 font-mono mt-0.5 block">
                      {supervisorTeamWorkers.length}
                    </span>
                    <span className="text-[10px] text-slate-500">Registered</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                      Present Today
                    </span>
                    <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                      {todayPresentCount}
                    </span>
                    <span className="text-[10px] text-emerald-600">On Duty</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-rose-600 block">
                      Absent Today
                    </span>
                    <span className="text-xl font-black text-rose-700 font-mono mt-0.5 block">
                      {todayAbsentCount}
                    </span>
                    <span className="text-[10px] text-rose-600">Off Duty</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Account Created: {activeUser.createdDate || '2026-01-01'}</span>
                  <span>Last Login: {activeUser.lastLogin || 'Recent'}</span>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: USER ID & PASSWORD CHANGING + TEAM / PERMISSIONS      */}
          {/* =================================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* ================================================================= */}
            {/* CARD 1: USER ID & PASSWORDS CHANGING OPTION                       */}
            {/* ================================================================= */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      activeUser.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {activeUser.role === 'admin'
                        ? 'Admin User ID & Password Settings'
                        : 'Supervisor User ID & Password Settings'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {activeUser.role === 'admin'
                        ? 'Update your Administrator login User ID and master security password.'
                        : 'Update this supervisor\'s login credentials and security password.'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeUser.role === 'admin'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {activeUser.role === 'admin' ? 'Master Clearance' : 'Security Vault'}
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* 1.1 CHANGE USER ID SUB-SECTION */}
                <form onSubmit={handleSaveUsername} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-700 flex items-center space-x-1.5">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span>Change User ID (Login Username):</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      Current:{' '}
                      <strong className="text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {activeUser.username}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                        placeholder={activeUser.role === 'admin' ? 'e.g. admin' : 'e.g. site_downtown'}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Update User ID</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {activeUser.role === 'admin'
                      ? 'This User ID is used to sign into the Administrator App. Updating your User ID will automatically update your active session without logging you out.'
                      : 'This User ID is used by the supervisor to log into their site in the Universal Attendance System.'}
                  </p>
                </form>

                <div className="border-t border-slate-100" />

                {/* 1.2 CHANGE PASSWORD SUB-SECTION */}
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-700 flex items-center space-x-1.5">
                      <Lock className="h-3.5 w-3.5 text-blue-600" />
                      <span>Change Password:</span>
                    </label>

                    {/* Quick Password Generator Button */}
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                      title="Auto-generate a strong password"
                    >
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      <span>Generate Strong Password</span>
                    </button>
                  </div>

                  {/* Current Password Display with Copy & Eye */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Current Active Password:
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {showCurrentPassword ? activeUser.password : '••••••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(activeUser.password, 'currPass')}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Copy password to clipboard"
                      >
                        {copiedKey === 'currPass' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirm Password Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        New Password:
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Confirm New Password:
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Match Status Hint */}
                  {newPassword && confirmPassword && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-700 font-bold inline-flex items-center">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Passwords match! Ready to save.
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold inline-flex items-center">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Passwords do not match yet.
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!newPassword || newPassword !== confirmPassword}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save &amp; Update Password</span>
                  </button>
                </form>
              </div>
            </div>

            {/* ================================================================= */}
            {/* CARD 2: TEAM CHANGING OPTION (Supervisors) OR ADMIN PRIVILEGES    */}
            {/* ================================================================= */}
            {activeUser.role === 'admin' ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-slate-50 via-amber-50/40 to-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Universal Administrative Privileges &amp; Site Scope
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Master clearance across all company sites, sections, supervisors, and workforce.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    Full Clearance
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center space-x-1.5 text-amber-950 font-bold">
                      <Crown className="h-4 w-4 text-amber-600" />
                      <span>Universal Super Administrator Authority:</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      As the System Administrator, you possess unrestricted clearance to create, view, edit, and delete any
                      Project Site, Trade Section, Employee Record, Attendance Muster, Advance Recovery, and Settlement across
                      the company.
                    </p>
                  </div>

                  {/* Supervisors Managed Directory with Quick Jump */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span>Site Supervisors Reporting to Admin ({supervisorUsers.length}):</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">Click to configure</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {supervisorUsers.map((sup) => {
                        const supSite = sites.find((s) => s.id === sup.assignedSiteId);
                        return (
                          <div
                            key={sup.id}
                            className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {sup.name}
                                </span>
                                <span className="text-[9px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded">
                                  {sup.username}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {supSite?.name || sup.assignedSiteId} &bull; {sup.teamName || 'General Team'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedUserId(sup.id)}
                              className="px-2.5 py-1.5 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-slate-200 hover:border-blue-600 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                            >
                              <span>Manage</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Team Changing Option
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {isSupervisor
                          ? `Switch between trade sections or teams at your assigned site (${currentAssignedSite?.name || 'Assigned Site'}).`
                          : 'Reassign this supervisor to another work team, trade section, or construction site.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    {isSupervisor ? 'Site Team Switcher' : 'Team Reassignment'}
                  </span>
                </div>

                <form onSubmit={handleSaveTeamChange} className="p-5 space-y-5">
                  {/* Current Active Assignment Summary Banner */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Current Work Assignment:
                      </span>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>{currentAssignedSite?.name || activeUser.assignedSiteId}</span>
                        <span className="text-slate-300">&bull;</span>
                        <Layers className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-blue-700">
                          {activeUser.teamName || currentAssignedSection?.name || 'General Team'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
                      {supervisorTeamWorkers.length} Active Workers
                    </span>
                  </div>

                  {/* Team Reassignment Form Fields */}
                  <div className="space-y-4">
                    {isSupervisor ? (
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          1. Assigned Project Site:
                        </label>
                        <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span>
                              {currentAssignedSite
                                ? `${currentAssignedSite.name} (${currentAssignedSite.code}) • ${currentAssignedSite.location}`
                                : currentUser?.assignedSiteId || 'Assigned Site'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Your Assigned Site
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Supervisor scope is restricted to your assigned site. Other sites are managed by their respective supervisors.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          1. Select Project Site:
                        </label>
                        <select
                          value={targetSiteId}
                          onChange={(e) => handleSiteChange(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                        >
                          {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name} ({site.code}) &bull; {site.location}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        2. Select Work Team / Section:
                      </label>
                      <select
                        value={targetSectionId}
                        onChange={(e) => handleSectionChange(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                      >
                        {filteredTargetSections.length === 0 ? (
                          <option value="">No sections found for this site</option>
                        ) : (
                          filteredTargetSections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.name} ({sec.code}) &bull; Current In-Charge: {sec.inCharge}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        3. Custom Team Title (Optional Label):
                      </label>
                      <input
                        type="text"
                        value={customTeamName}
                        onChange={(e) => setCustomTeamName(e.target.value)}
                        placeholder="e.g. RCC Structure & Rebar Team"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Custom label displayed on attendance registers, muster sheets, and settlement slips.
                      </p>
                    </div>
                  </div>

                  {/* Target Team Preview */}
                  {selectedTargetSectionObj && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 flex items-center space-x-1.5">
                          <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                          <span>Target Assignment Preview:</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          {selectedTargetSectionObj.code}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] space-y-0.5">
                        <p>
                          Section: <strong>{selectedTargetSectionObj.name}</strong> &bull; Total Registered Workers:{' '}
                          <strong>{targetSectionWorkersCount}</strong>
                        </p>
                        <p className="text-slate-500">
                          {selectedTargetSectionObj.remarks || 'Standard construction work discipline.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Confirm &amp; Change Team Assignment</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* OPTIONAL COLLAPSIBLE: ADVANCED MULTIPLIERS (Admin Only)               */}
      {/* ===================================================================== */}
      {isAdmin && (
        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAdvancedRules((prev) => !prev)}
            className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">
                Advanced Wage &amp; Food Multipliers (Central Configuration)
              </span>
            </div>
            {showAdvancedRules ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {showAdvancedRules && (
            <div className="mt-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
              <h2 className="text-xs font-black uppercase text-slate-800 border-b border-slate-100 pb-2">
                Attendance &amp; Compensation Multipliers
              </h2>

              {/* Food Multipliers */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">Food Allowance Multiplier</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Present</label>
                    <input
                      type="number"
                      step="0.1"
                      value={foodPresent}
                      onChange={(e) => setFoodPresent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Half Day</label>
                    <input
                      type="number"
                      step="0.1"
                      value={foodHalfDay}
                      onChange={(e) => setFoodHalfDay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Absent</label>
                    <input
                      type="number"
                      step="0.1"
                      value={foodAbsent}
                      onChange={(e) => setFoodAbsent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Wage Multipliers */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700">Daily Wage Multipliers</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Present</label>
                    <input
                      type="number"
                      step="0.1"
                      value={wagePresent}
                      onChange={(e) => setWagePresent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Half Day</label>
                    <input
                      type="number"
                      step="0.1"
                      value={wageHalfDay}
                      onChange={(e) => setWageHalfDay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Absent</label>
                    <input
                      type="number"
                      step="0.1"
                      value={wageAbsent}
                      onChange={(e) => setWageAbsent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Commission Multipliers */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700">Referrer Commission Multipliers</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Present</label>
                    <input
                      type="number"
                      step="0.1"
                      value={commPresent}
                      onChange={(e) => setCommPresent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Half Day</label>
                    <input
                      type="number"
                      step="0.1"
                      value={commHalfDay}
                      onChange={(e) => setCommHalfDay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Absent</label>
                    <input
                      type="number"
                      step="0.1"
                      value={commAbsent}
                      onChange={(e) => setCommAbsent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveMultipliers}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Multipliers
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADD NEW SITE SUPERVISOR MODAL                                         */}
      {/* ===================================================================== */}
      {showAddSupervisorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add New Site Supervisor Account</h3>
                  <p className="text-[11px] text-slate-300">Create new login credentials &amp; site assignment for a supervisor</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSupervisorModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupervisor} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Supervisor Full Name *
                </label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    User ID (Username) *
                  </label>
                  <input
                    type="text"
                    value={newSupUsername}
                    onChange={(e) => setNewSupUsername(e.target.value)}
                    required
                    placeholder="e.g. site_downtown"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-slate-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateNewSupPassword}
                      className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      ⚡ Auto Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newSupPassword}
                    onChange={(e) => setNewSupPassword(e.target.value)}
                    required
                    placeholder="Set security password"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Assigned Project Site
                  </label>
                  <select
                    value={newSupSiteId}
                    onChange={(e) => {
                      setNewSupSiteId(e.target.value);
                      const secForSite = sections.filter((s) => s.siteId === e.target.value);
                      if (secForSite.length > 0) setNewSupSectionId(secForSite[0].id);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Trade Section / Team
                  </label>
                  <select
                    value={newSupSectionId}
                    onChange={(e) => setNewSupSectionId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {sections
                      .filter((s) => !newSupSiteId || s.siteId === newSupSiteId)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} ({sec.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    type="text"
                    value={newSupMobile}
                    onChange={(e) => setNewSupMobile(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                    placeholder="e.g. site.supervisor@universal.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupervisorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Create Supervisor Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Settings;
