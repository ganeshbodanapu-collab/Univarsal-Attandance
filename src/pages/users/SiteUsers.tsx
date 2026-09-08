import React, { useState } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toast } from '../../components/common/Toast';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Lock,
  RefreshCw,
  Building2,
  Phone,
  Printer,
  LogIn,
  CheckCircle2,
  Search,
} from 'lucide-react';
import type { AppUser } from '../../types';

export const SiteUsers: React.FC = () => {
  const {
    appUsers,
    sites,
    currentUser,
    switchUser,
    loginWithCredentials,
    addAppUser,
    updateAppUser,
  } = useAttendanceContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  // Password visibility state map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  // Copied feedback key
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Selected user for reset
  const [selectedUserForReset, setSelectedUserForReset] = useState<AppUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Create User Form State
  const [createRole, setCreateRole] = useState<'supervisor' | 'admin'>('supervisor');
  const [createSiteId, setCreateSiteId] = useState('');
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createMobile, setCreateMobile] = useState('');
  const [createEmail, setCreateEmail] = useState('');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Toggle password visibility
  const toggleVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Copy to clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMessage(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate a random strong password
  const generateRandomPassword = (prefix = 'Site') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}@${randomPart}26`;
  };

  // Auto-generate username and password when site is picked in create modal
  const handleSiteSelectChange = (siteId: string) => {
    setCreateSiteId(siteId);
    const site = sites.find((s) => s.id === siteId);
    if (site) {
      const slug = site.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      setCreateUsername(`site_${slug}`);
      setCreateName(site.inCharge || `${site.name} Supervisor`);
      setCreateMobile(site.mobile || '');
      setCreatePassword(generateRandomPassword(site.name.split(' ')[0]));
    }
  };

  // Handle Create User Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !createPassword.trim() || !createName.trim()) {
      alert('Please fill in all required fields: Name, User ID, and Password.');
      return;
    }

    // Check duplicate username
    const exists = appUsers.some(
      (u) => u.username.toLowerCase() === createUsername.trim().toLowerCase()
    );
    if (exists) {
      alert(`The User ID "${createUsername}" is already in use. Please choose another.`);
      return;
    }

    addAppUser({
      username: createUsername.trim().toLowerCase(),
      password: createPassword.trim(),
      name: createName.trim(),
      role: createRole,
      assignedSiteId: createRole === 'supervisor' ? createSiteId : undefined,
      mobile: createMobile.trim(),
      email: createEmail.trim(),
      status: 'active',
    });

    setShowCreateModal(false);
    setToastMessage(`Site user account "${createUsername}" created successfully!`);
    setCreateUsername('');
    setCreatePassword('');
    setCreateName('');
    setCreateMobile('');
    setCreateEmail('');
    setCreateSiteId('');
  };

  // Handle Reset Password Submit
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPasswordInput.trim()) return;

    updateAppUser(selectedUserForReset.id, { password: newPasswordInput.trim() });
    setShowResetModal(false);
    setToastMessage(`Password for ${selectedUserForReset.name} updated successfully!`);
    setSelectedUserForReset(null);
    setNewPasswordInput('');
  };

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const result = loginWithCredentials(loginUsername, loginPassword);
    if (result.success && result.user) {
      setShowLoginModal(false);
      setToastMessage(`Authenticated as ${result.user.name} (${result.user.role === 'admin' ? 'Universal Admin' : 'Site Supervisor'})!`);
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError(result.message || 'Login failed. Please check credentials.');
    }
  };

  // Filtered Users
  const filteredUsers = appUsers.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterSiteId !== 'all') {
      if (filterSiteId === 'admin_only' && u.role !== 'admin') return false;
      if (filterSiteId !== 'admin_only' && u.assignedSiteId !== filterSiteId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const s = sites.find((site) => site.id === u.assignedSiteId);
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchSite = s ? s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) : false;
      const matchMobile = u.mobile ? u.mobile.includes(q) : false;
      if (!matchName && !matchUsername && !matchSite && !matchMobile) return false;
    }
    return true;
  });

  // KPIs
  const totalAccounts = appUsers.length;
  const supervisorAccounts = appUsers.filter((u) => u.role === 'supervisor').length;
  const adminAccounts = appUsers.filter((u) => u.role === 'admin').length;
  const activeAccounts = appUsers.filter((u) => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-slate-900/10">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="h-4 w-4" />
            <span>Site Access Control & Credentials</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Site Users & Passwords
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Centralized credential vault for construction site supervisors. Each site has its dedicated User ID and Password for localized attendance tracking and data isolation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 border border-white/15 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-blue-300" />
            <span>Print Slips</span>
          </button>

          <button
            onClick={() => {
              setLoginError(null);
              setShowLoginModal(true);
            }}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 border border-white/15 cursor-pointer"
          >
            <LogIn className="h-4 w-4 text-emerald-300" />
            <span>Login with ID</span>
          </button>

          <button
            onClick={() => {
              setCreateRole('supervisor');
              setCreateSiteId(sites[0]?.id || '');
              handleSiteSelectChange(sites[0]?.id || '');
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Site User</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total User Accounts"
          value={totalAccounts}
          icon={<KeyRound className="h-5 w-5 text-blue-600" />}
          description="Configured in vault"
        />
        <StatCard
          title="Site Supervisors"
          value={supervisorAccounts}
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
          description="Dedicated site logins"
        />
        <StatCard
          title="Universal Admins"
          value={adminAccounts}
          icon={<Shield className="h-5 w-5 text-purple-600" />}
          description="Cross-site system access"
        />
        <StatCard
          title="Active Status"
          value={`${activeAccounts} of ${totalAccounts}`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          description="Currently authorized"
        />
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by User ID, Name, Site, Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Site Filter */}
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Sites & Admins</option>
            <option value="admin_only">System Admins Only</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Roles</option>
            <option value="supervisor">Site Supervisors</option>
            <option value="admin">System Admins</option>
          </select>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Showing {filteredUsers.length} user credential records
        </div>
      </div>

      {/* Active User Banner */}
      <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-900">Current Session:</span>
              <span className="text-xs font-extrabold text-blue-950">{currentUser?.name || 'User'}</span>
              <span className="font-mono text-[11px] font-bold bg-white text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                {currentUser?.username || '—'}
              </span>
            </div>
            <p className="text-[11px] text-blue-700 mt-0.5">
              {currentUser?.role === 'admin'
                ? 'Full administrative control over all sites, sections, wage settlements, and reports.'
                : `Scoped strictly to site ${sites.find((s) => s.id === currentUser?.assignedSiteId)?.name || currentUser?.assignedSiteId || 'Assigned Site'}.`}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200/80 shadow-2xs self-end sm:self-center">
          Active Now
        </span>
      </div>

      {/* Credentials Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((user) => {
          const site = sites.find((s) => s.id === user.assignedSiteId);
          const isVisible = !!visiblePasswords[user.id];
          const isCurrentSession = currentUser?.id === user.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-3xl border transition-all duration-200 p-5 space-y-4 shadow-xs relative overflow-hidden ${
                isCurrentSession
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {user.role === 'admin' ? <Shield className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">{user.name}</h3>
                      {isCurrentSession && (
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {user.role === 'admin' ? 'Universal System Admin' : `Site Supervisor • ${site?.code || 'General'}`}
                    </span>
                  </div>
                </div>

                <StatusBadge status={user.status} />
              </div>

              {/* Site Assignment Tag */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Assigned Location:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">
                  {site ? `${site.code} - ${site.name}` : 'All Sites (Universal)'}
                </span>
              </div>

              {/* CREDENTIALS VAULT BOX */}
              <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 shadow-inner">
                {/* User ID / Username */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Site User ID / Login
                    </span>
                    <span className="font-mono text-xs font-black text-blue-400 select-all">
                      {user.username}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(user.username, `user_${user.id}`)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {copiedKey === `user_${user.id}` ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Password Field with Mask & Reveal */}
                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Password
                    </span>
                    <span className="font-mono text-xs font-black tracking-wider text-amber-300 select-all">
                      {isVisible ? user.password : '••••••••••••'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => toggleVisibility(user.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={isVisible ? 'Hide Password' : 'Show Password'}
                    >
                      {isVisible ? (
                        <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleCopy(user.password, `pwd_${user.id}`)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedKey === `pwd_${user.id}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Extra Info: Mobile & Last Login */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center space-x-1.5 truncate">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{user.mobile || 'No contact'}</span>
                </span>
                <span>Last: {user.lastLogin || 'Never'}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedUserForReset(user);
                    setNewPasswordInput(generateRandomPassword(site ? site.name.split(' ')[0] : 'Admin'));
                    setShowResetModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Reset Pwd</span>
                </button>

                <button
                  onClick={() => {
                    switchUser(user.id);
                    setToastMessage(`Switched session to ${user.name} (${user.username})!`);
                  }}
                  disabled={isCurrentSession}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    isCurrentSession
                      ? 'bg-blue-50 text-blue-400 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20 cursor-pointer'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{isCurrentSession ? 'Current' : 'Login As'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW SITE USER MODAL */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Site User Credentials"
          subtitle="Generate site-wise supervisor credentials with tailored access scope."
          icon={<Plus className="h-5 w-5" />}
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Account Role *"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as 'supervisor' | 'admin')}
                options={[
                  { value: 'supervisor', label: 'Site Supervisor (Site Bound)' },
                  { value: 'admin', label: 'Universal Admin (All Sites)' },
                ]}
              />

              {createRole === 'supervisor' ? (
                <Select
                  label="Assign To Project Site *"
                  value={createSiteId}
                  onChange={(e) => handleSiteSelectChange(e.target.value)}
                  options={sites.map((s) => ({
                    value: s.id,
                    label: `${s.code} - ${s.name}`,
                  }))}
                />
              ) : (
                <Input
                  label="Access Scope"
                  value="All Construction Sites (Universal)"
                  disabled
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supervisor / Full Name *"
                placeholder="e.g. Ramesh Varma"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />

              <Input
                label="Contact Mobile"
                placeholder="e.g. +91 98765 43210"
                value={createMobile}
                onChange={(e) => setCreateMobile(e.target.value)}
              />
            </div>

            {/* Credentials Fields */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                <span>Login Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="User ID / Username *"
                    placeholder="e.g. site_downtown"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value.toLowerCase())}
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Use lowercase letters, numbers, and underscores (e.g. site_s001).
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Password *</label>
                    <button
                      type="button"
                      onClick={() => setCreatePassword(generateRandomPassword())}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Auto Generate</span>
                    </button>
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. Downtown@2026"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Input
              label="Contact Email (Optional)"
              type="email"
              placeholder="e.g. supervisor@company.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                Save Site User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedUserForReset && (
        <Modal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          title={`Reset Password: ${selectedUserForReset.name}`}
          subtitle={`User ID: ${selectedUserForReset.username}`}
          icon={<KeyRound className="h-5 w-5 text-amber-600" />}
          size="md"
        >
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
              Enter a new secure password or click auto-generate to create a strong password for this supervisor.
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">New Password *</label>
                <button
                  type="button"
                  onClick={() => setNewPasswordInput(generateRandomPassword())}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Generate Strong Password</span>
                </button>
              </div>
              <Input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TEST LOGIN MODAL */}
      {showLoginModal && (
        <Modal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Authenticate with Site Credentials"
          subtitle="Test logging in using any site supervisor User ID and Password."
          icon={<LogIn className="h-5 w-5 text-blue-600" />}
          size="md"
        >
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-2xl">
                {loginError}
              </div>
            )}

            <Input
              label="Site User ID / Username *"
              placeholder="e.g. site_downtown or admin"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Password *"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
              <span className="font-bold text-slate-700 block mb-1">Quick Sample Logins:</span>
              <div>Admin: <span className="font-mono text-blue-600 font-bold">admin</span> / <span className="font-mono text-slate-700 font-bold">Admin@2026</span></div>
              <div>Downtown Site: <span className="font-mono text-blue-600 font-bold">site_downtown</span> / <span className="font-mono text-slate-700 font-bold">Downtown@2026</span></div>
              <div>Marina Bay Site: <span className="font-mono text-blue-600 font-bold">site_marinabay</span> / <span className="font-mono text-slate-700 font-bold">Marina@2026</span></div>
              <div>Metro Green Site: <span className="font-mono text-blue-600 font-bold">site_metrogreen</span> / <span className="font-mono text-slate-700 font-bold">Metro@2026</span></div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PRINT / EXPORT CREDENTIALS SHEET MODAL */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Site Credentials Sheet"
          subtitle="Official supervisor login distribution slip for field personnel."
          icon={<Printer className="h-5 w-5 text-indigo-600" />}
          size="xl"
        >
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Univarsal Attandance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official Site Supervisor Credentials Manifest &bull; Generated {new Date().toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
                  CONFIDENTIAL
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-2.5 font-bold">Site / Scope</th>
                      <th className="p-2.5 font-bold">Supervisor Name</th>
                      <th className="p-2.5 font-bold">User ID (Login)</th>
                      <th className="p-2.5 font-bold">Default Password</th>
                      <th className="p-2.5 font-bold">Mobile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {appUsers.map((u) => {
                      const site = sites.find((s) => s.id === u.assignedSiteId);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">
                            {site ? `${site.code} - ${site.name}` : 'Universal Admin'}
                          </td>
                          <td className="p-2.5">{u.name}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-700 bg-blue-50/50">
                            {u.username}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-amber-700 bg-amber-50/50">
                            {u.password}
                          </td>
                          <td className="p-2.5 text-slate-600">{u.mobile || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Instructions: Keep credentials secure. Do not share across non-assigned sites.</span>
                <span>Univarsal Attandance &bull; Site Operations</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SiteUsers;
