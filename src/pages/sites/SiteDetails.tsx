import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toast } from '../../components/common/Toast';
import {
  MapPin,
  Building,
  Users,
  CalendarCheck,
  DollarSign,
  Utensils,
  Layers,
  Phone,
  Edit3,
  Plus,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  LogIn,
  KeyRound,
  AlertCircle,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const SiteDetails: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const {
    sites,
    sections,
    workers,
    attendance,
    advances,
    payments,
    currentUser,
    appUsers,
    switchUser,
    updateSite,
    addSection,
    deleteSite,
    deleteSection,
  } = useAttendanceContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sitePwdVisible, setSitePwdVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [showDeleteSiteConfirm, setShowDeleteSiteConfirm] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);

  // Edit Site Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editInCharge, setEditInCharge] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editRemarks, setEditRemarks] = useState('');

  // Add Section Modal
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [secCode, setSecCode] = useState('');
  const [secName, setSecName] = useState('');
  const [secInCharge, setSecInCharge] = useState('');
  const [secMobile, setSecMobile] = useState('');
  const [secRemarks, setSecRemarks] = useState('');

  // Find site
  const site = sites.find((s) => {
    if (!siteId) return false;
    const clean = decodeURIComponent(siteId).toLowerCase();
    return s.id.toLowerCase() === clean || s.code.toLowerCase() === clean;
  });

  if (!site) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Site Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          No project site matches identifier: <span className="font-mono font-semibold text-slate-800">{siteId}</span>
        </p>
        <button
          onClick={() => navigate('/sites')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          Back to Sites Overview
        </button>
      </div>
    );
  }

  // Site-specific data
  const siteSections = sections.filter((sec) => sec.siteId === site.id);
  const siteWorkers = workers.filter((w) => w.currentSiteId === site.id);
  const activeWorkers = siteWorkers.filter((w) => w.status === 'active');

  const siteWorkerIds = new Set(siteWorkers.map((w) => w.id));
  const siteAttendance = attendance.filter((a) => siteWorkerIds.has(a.workerId));

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = siteAttendance.filter((a) => a.date === today);
  const presentToday = todayRecords.filter((a) => a.status === 'present').length;
  const halfDayToday = todayRecords.filter((a) => a.status === 'halfDay').length;
  const absentToday = todayRecords.filter((a) => a.status === 'absent').length;

  const siteAdvances = advances.filter((a) => siteWorkerIds.has(a.workerId));
  const totalAdvances = siteAdvances.reduce((sum, a) => sum + a.amount, 0);

  const sitePayments = payments.filter((p) => p.siteId === site.id || siteWorkerIds.has(p.workerId));
  const totalWagesPaid = sitePayments.reduce((sum, p) => sum + p.grossWage, 0);

  const totalFoodCount = siteAttendance.reduce((sum, a) => {
    if (a.status === 'present') return sum + 1;
    if (a.status === 'halfDay') return sum + 0.5;
    return sum;
  }, 0);

  const assignedUser = appUsers.find((u) => u.assignedSiteId === site.id);

  // Edit Site Handlers
  const handleOpenEdit = () => {
    setEditName(site.name);
    setEditLocation(site.location);
    setEditAddress(site.address || '');
    setEditInCharge(site.inCharge);
    setEditMobile(site.mobile);
    setEditStatus(site.status);
    setEditRemarks(site.remarks || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editInCharge.trim() || !editMobile.trim()) {
      alert('Please fill in all required options.');
      return;
    }
    updateSite({
      ...site,
      name: editName.trim(),
      location: editLocation.trim(),
      address: editAddress.trim() || undefined,
      inCharge: editInCharge.trim(),
      mobile: editMobile.trim(),
      status: editStatus,
      remarks: editRemarks.trim() || undefined,
    });
    setToastMessage(`Site "${editName}" updated successfully.`);
    setShowEditModal(false);
  };

  const handleSaveSection = () => {
    if (!secCode.trim() || !secName.trim() || !secInCharge.trim() || !secMobile.trim()) {
      alert('Please fill in section code, name, and in-charge details.');
      return;
    }
    addSection({
      code: secCode.trim(),
      name: secName.trim(),
      siteId: site.id,
      inCharge: secInCharge.trim(),
      mobile: secMobile.trim(),
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
      remarks: secRemarks.trim() || undefined,
    });
    setToastMessage(`Section "${secName}" added to site successfully.`);
    setShowAddSectionModal(false);
    setSecCode('');
    setSecName('');
    setSecInCharge('');
    setSecMobile('');
    setSecRemarks('');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/sites" className="hover:text-blue-600 transition-colors">Project Sites</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{site.name} ({site.code})</span>
      </div>

      {/* Modern Site Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shadow-blue-500/20 shrink-0">
              <Building className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{site.name}</h1>
                <StatusBadge status={site.status} />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  Site Code: {site.code}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                <span className="inline-flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{site.location}</span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Manager: <strong>{site.inCharge}</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{site.mobile}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowNewEmployeeModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Add New Employee</span>
                </button>
                <button
                  onClick={() => setShowAddSectionModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200/60 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Section</span>
                </button>
                <button
                  onClick={handleOpenEdit}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Site</span>
                </button>
                <button
                  onClick={() => setShowDeleteSiteConfirm(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/60 transition-all active:scale-95 cursor-pointer"
                  title="Delete Site"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Site</span>
                </button>
              </>
            )}
            <Link
              to="/workers"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Deploy Worker</span>
            </Link>
          </div>
        </div>

        {site.remarks && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
            <strong>Project Scope:</strong> {site.remarks}
          </div>
        )}
      </div>

      {/* 8 Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
        <StatCard
          title="Assigned Workers"
          value={siteWorkers.length}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Total in roster"
        />
        <StatCard
          title="Active Workers"
          value={activeWorkers.length}
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          description="On-site staff"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={<CalendarCheck className="h-4 w-4 text-emerald-600" />}
          description="Full day duty"
        />
        <StatCard
          title="Half Day"
          value={halfDayToday}
          icon={<CalendarCheck className="h-4 w-4 text-amber-500" />}
          description="0.5 day duty"
        />
        <StatCard
          title="Absent"
          value={absentToday}
          icon={<AlertCircle className="h-4 w-4 text-rose-500" />}
          description="Off site today"
        />
        <StatCard
          title="Sections"
          value={siteSections.length}
          icon={<Layers className="h-4 w-4 text-indigo-600" />}
          description="Work teams"
        />
        <StatCard
          title="Total Wages"
          value={`₹${totalWagesPaid.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-teal-600" />}
          description="Disbursed pay"
        />
        <StatCard
          title="Total Advances"
          value={`₹${totalAdvances.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-purple-600" />}
          description="Advances issued"
        />
        <StatCard
          title="Food Meals"
          value={totalFoodCount}
          icon={<Utensils className="h-4 w-4 text-orange-500" />}
          description="Meals served"
        />
      </div>

      {/* 7 Interactive Site Navigation Tabs */}
      <Tabs
        options={[
          { id: 'overview', label: 'Site Overview' },
          { id: 'sections', label: `Sections (${siteSections.length})` },
          { id: 'workers', label: `Deployed Workers (${siteWorkers.length})` },
          { id: 'attendance', label: `Attendance Log (${siteAttendance.length})` },
          { id: 'food', label: 'Food Consumption' },
          { id: 'payments', label: `Wages & Payouts (${sitePayments.length})` },
          { id: 'reports', label: 'Site Reports' },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Project Site Specifications</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Official Name:</span>
                <span className="font-bold text-slate-900">{site.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Unique Code:</span>
                <span className="font-mono font-bold text-blue-700">{site.code}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Geo Location:</span>
                <span className="font-medium text-slate-800">{site.location}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Complete Address:</span>
                <span className="font-medium text-slate-800 text-right max-w-xs">{site.address || site.location}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Project In Charge:</span>
                <span className="font-bold text-slate-900">{site.inCharge}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-semibold">Official Contact:</span>
                <span className="font-bold text-slate-900">{site.mobile}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 font-semibold">Operational Status:</span>
                <StatusBadge status={site.status} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Active Work Sections Summary</h3>
            <div className="space-y-3">
              {siteSections.map((sec) => {
                const secWorkers = workers.filter((w) => w.currentSectionId === sec.id);
                return (
                  <Link
                    key={sec.id}
                    to={`/sites?siteId=${site.id}&sectionId=${sec.id}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/60 transition-all group"
                    title="Open Section Employees & Attendance"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-700">{sec.code}</span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {sec.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">In Charge: {sec.inCharge} ({sec.mobile})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                        {secWorkers.length} Workers
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Site Supervisor Login Credentials Card */}
          <div className="md:col-span-2 bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600/30 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Site Supervisor Login & Access Credentials</h3>
                  <p className="text-xs text-slate-400">Official authentication User ID and password for {site.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to="/users"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>All Site Vault</span>
                </Link>
                {assignedUser && (
                  <button
                    onClick={() => {
                      switchUser(assignedUser.id);
                      setToastMessage(`Switched session to ${assignedUser.name} (${assignedUser.username})!`);
                    }}
                    disabled={currentUser?.id === assignedUser.id}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      currentUser?.id === assignedUser.id
                        ? 'bg-blue-950 text-blue-400 border border-blue-800 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>{currentUser?.id === assignedUser.id ? 'Active Session' : 'Login As Supervisor'}</span>
                  </button>
                )}
              </div>
            </div>

            {assignedUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Supervisor In Charge
                  </span>
                  <span className="text-sm font-bold text-white block">{assignedUser.name}</span>
                  <span className="text-xs text-slate-400">{assignedUser.mobile || site.mobile}</span>
                </div>

                <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Site User ID / Login
                    </span>
                    <span className="font-mono text-xs font-black text-blue-400 select-all">
                      {assignedUser.username}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(assignedUser.username);
                      setCopiedKey('uid');
                      setToastMessage(`Copied "${assignedUser.username}" to clipboard!`);
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {copiedKey === 'uid' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Site Password
                    </span>
                    <span className="font-mono text-xs font-black tracking-wider text-amber-300 select-all">
                      {sitePwdVisible ? assignedUser.password : '••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setSitePwdVisible(!sitePwdVisible)}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={sitePwdVisible ? 'Hide Password' : 'Show Password'}
                    >
                      {sitePwdVisible ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(assignedUser.password);
                        setCopiedKey('pwd');
                        setToastMessage('Copied password to clipboard!');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedKey === 'pwd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800/50 rounded-2xl text-xs text-slate-400 flex items-center justify-between">
                <span>No dedicated supervisor user account has been assigned to this site yet.</span>
                <Link
                  to="/users"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Create User ID & Password
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SECTIONS LIST */}
      {activeTab === 'sections' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Operational Sections in {site.name}</h3>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + Add Section
              </button>
            )}
          </div>

          <DataTable
            data={siteSections}
            columns={[
              { header: 'Section Code', accessor: 'code', render: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.code}</span> },
              {
                header: 'Section Name',
                accessor: 'name',
                sortable: true,
                render: (row) => (
                  <Link
                    to={`/sites?siteId=${site.id}&sectionId=${row.id}`}
                    className="font-bold text-xs text-blue-700 hover:text-blue-900 transition-colors"
                    title="Open Section Employees & Attendance"
                  >
                    {row.name}
                  </Link>
                ),
              },
              { header: 'In Charge', accessor: 'inCharge', render: (row) => <span className="font-medium text-xs text-slate-800">{row.inCharge}</span> },
              { header: 'Mobile', accessor: 'mobile' },
              {
                header: 'Deployed Workers',
                render: (row) => {
                  const count = workers.filter((w) => w.currentSectionId === row.id).length;
                  return (
                    <Link
                      to={`/sites?siteId=${site.id}&sectionId=${row.id}`}
                      className="font-bold text-xs text-blue-700 hover:underline"
                    >
                      {count} workers
                    </Link>
                  );
                },
              },
              { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Action',
                render: (row) => (
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/sites?siteId=${site.id}&sectionId=${row.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                      title="Open Section Employees & Attendance"
                    >
                      <span>Employees & Attendance</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => setSectionToDelete(row)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* TAB 3: WORKERS DEPLOYED */}
      {activeTab === 'workers' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Workforce Deployed at {site.name}</h3>
            <span className="text-xs text-slate-500">{siteWorkers.length} registered personnel</span>
          </div>

          <DataTable
            data={siteWorkers}
            columns={[
              {
                header: 'Serial No',
                render: (row) => <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{row.serialNumber || (row.id.startsWith('W') ? `${site.code}-${row.id}` : row.id)}</span>,
              },
              {
                header: 'Employee ID',
                accessor: 'id',
                render: (row) => <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{row.id}</span>,
              },
              {
                header: 'Worker Name & Phone',
                accessor: 'name',
                sortable: true,
                render: (row) => (
                  <div>
                    <Link to={`/workers/${row.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                      {row.name}
                    </Link>
                    <span className="block text-[11px] text-slate-500">{row.mobile}</span>
                  </div>
                ),
              },
              {
                header: 'Section',
                render: (row) => {
                  const sec = sections.find((s) => s.id === row.currentSectionId);
                  return <span className="text-xs font-medium text-slate-800">{sec?.name || 'Unassigned'}</span>;
                },
              },
              {
                header: 'Type',
                accessor: 'workerType',
                render: (row) => (
                  <span className={`capitalize text-[11px] font-bold px-2 py-0.5 rounded-full border ${row.workerType === 'company' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                    {row.workerType}
                  </span>
                ),
              },
              { header: 'Wage', render: (row) => <span className="font-bold text-xs text-slate-900">₹{row.dailyWage}</span> },
              { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Action',
                render: (row) => (
                  <Link
                    to={`/workers/${row.id}`}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors inline-flex items-center space-x-1 text-xs font-bold"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>360</span>
                  </Link>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* TAB 4: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Site Attendance History</h3>
            <span className="text-xs text-slate-500">{siteAttendance.length} records</span>
          </div>

          <DataTable
            data={siteAttendance}
            columns={[
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Worker',
                render: (row) => {
                  const w = workers.find((wk) => wk.id === row.workerId);
                  return (
                    <Link to={`/workers/${row.workerId}`} className="text-xs font-bold text-slate-900 hover:text-blue-600">
                      {w?.name || row.workerId}
                    </Link>
                  );
                },
              },
              {
                header: 'Status',
                accessor: 'status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              { header: 'Check In', accessor: 'checkIn', render: (row) => row.checkIn || '-' },
              { header: 'Check Out', accessor: 'checkOut', render: (row) => row.checkOut || '-' },
              {
                header: 'Authentication',
                accessor: 'method',
                render: (row) => <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">{row.method}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* TAB 5: FOOD CONSUMPTION */}
      {activeTab === 'food' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Site Kitchen & Meal Summary</h3>
            <div className="px-3 py-1 bg-orange-50 text-orange-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 border border-orange-200/60">
              <Utensils className="h-4 w-4 text-orange-600" />
              <span>Total Meals: {totalFoodCount}</span>
            </div>
          </div>

          <DataTable
            data={siteAttendance}
            columns={[
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Worker',
                render: (row) => {
                  const w = workers.find((wk) => wk.id === row.workerId);
                  return <span className="font-bold text-xs text-slate-900">{w?.name || row.workerId}</span>;
                },
              },
              { header: 'Attendance Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Food Allocation',
                render: (row) => {
                  const val = row.status === 'present' ? 1 : row.status === 'halfDay' ? 0.5 : 0;
                  return <span className="font-bold text-xs text-orange-600">{val} meal</span>;
                },
              },
            ]}
          />
        </div>
      )}

      {/* TAB 6: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Disbursed Wages & Slips</h3>
            <span className="text-xs text-slate-500">Gross Paid: ₹{totalWagesPaid.toLocaleString()}</span>
          </div>

          <DataTable
            data={sitePayments}
            columns={[
              { header: 'Payment ID', accessor: 'id', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Worker',
                render: (row) => {
                  const w = workers.find((wk) => wk.id === row.workerId);
                  return <span className="font-bold text-xs text-slate-900">{w?.name || row.workerId}</span>;
                },
              },
              { header: 'Gross Wage', render: (row) => <span className="font-bold text-slate-900">₹{row.grossWage}</span> },
              { header: 'Advance Recovery', render: (row) => <span className="font-bold text-rose-600">-₹{row.advanceRecovery}</span> },
              { header: 'Net Payout', render: (row) => <span className="font-black text-emerald-700">₹{row.netPay}</span> },
              {
                header: 'Status',
                accessor: 'status',
                render: (row) => (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {row.status.toUpperCase()}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Site Performance & Compliance Export Hub</h3>
              <p className="text-xs text-slate-500">Download formatted sheets for Site {site.code} ({site.name}).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900">Daily Attendance Muster</span>
                <p className="text-[11px] text-slate-500 mt-1">Detailed list of check-in, check-out, and mode verifications.</p>
              </div>
              <button
                onClick={() => alert(`Exporting Site ${site.code} Muster to Excel...`)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all self-start"
              >
                Export Excel (.xlsx)
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900">Kitchen Food Report</span>
                <p className="text-[11px] text-slate-500 mt-1">Daily meals breakdown for catering bill verification.</p>
              </div>
              <button
                onClick={() => alert(`Exporting Site ${site.code} Food Log to CSV...`)}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all self-start"
              >
                Export CSV (.csv)
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900">Wage Billing Statement</span>
                <p className="text-[11px] text-slate-500 mt-1">Gross wages, advance deductions, and contractor commission ledger.</p>
              </div>
              <button
                onClick={() => alert(`Exporting Site ${site.code} Wage Statement to PDF...`)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all self-start"
              >
                Export PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SITE MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Project Site: ${site.name}`}
        subtitle={`Site Code: ${site.code}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Site Name *" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input label="Location Area *" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
          </div>

          <Input
            label="Complete Physical Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder="Plot, road, district..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Manager In Charge *" value={editInCharge} onChange={(e) => setEditInCharge(e.target.value)} />
            <Input label="Contact Mobile *" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Operational Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Input
              label="Remarks / Project Notes"
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {currentUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setShowDeleteSiteConfirm(true);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Site</span>
              </button>
            ) : <div />}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ADD SECTION MODAL */}
      <Modal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        title={`Add Section to ${site.name}`}
        subtitle={`Parent Site: ${site.code}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Section Code *" placeholder="e.g. SEC-018" value={secCode} onChange={(e) => setSecCode(e.target.value)} />
            <Input label="Section Name *" placeholder="e.g. Electrical Conduit" value={secName} onChange={(e) => setSecName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Supervisor In Charge *" placeholder="e.g. Amit Sen" value={secInCharge} onChange={(e) => setSecInCharge(e.target.value)} />
            <Input label="Supervisor Mobile *" placeholder="e.g. 9988776611" value={secMobile} onChange={(e) => setSecMobile(e.target.value)} />
          </div>

          <Input
            label="Section Scope / Remarks"
            placeholder="Optional notes..."
            value={secRemarks}
            onChange={(e) => setSecRemarks(e.target.value)}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowAddSectionModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Add Section
            </button>
          </div>
        </div>
      </Modal>

      {/* NEW EMPLOYEE JOINING MODAL (PRE-CONFIGURED FOR CURRENT SITE) */}
      {showNewEmployeeModal && (
        <NewEmployeeJoiningModal
          isOpen={showNewEmployeeModal}
          onClose={() => setShowNewEmployeeModal(false)}
          site={site}
          onSuccess={(newWorker) => {
            setToastMessage(`✓ New Employee "${newWorker.name}" enrolled into ${site.name} with Serial ${site.code}-${newWorker.id}!`);
            setShowNewEmployeeModal(false);
          }}
        />
      )}

      {/* CONFIRM DELETE SITE */}
      {showDeleteSiteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteSiteConfirm}
          onClose={() => setShowDeleteSiteConfirm(false)}
          onConfirm={() => {
            deleteSite(site.id);
            navigate('/sites', { replace: true });
          }}
          title={`Delete Site: ${site.name}`}
          message={`Are you sure you want to permanently delete site "${site.name}" (${site.code})? This will also remove all child work sections, assigned employees, attendance logs, and site supervisor accounts. This action cannot be undone.`}
          confirmText="Delete Site"
          variant="danger"
        />
      )}

      {/* CONFIRM DELETE SECTION */}
      {sectionToDelete && (
        <ConfirmDialog
          isOpen={!!sectionToDelete}
          onClose={() => setSectionToDelete(null)}
          onConfirm={() => {
            deleteSection(sectionToDelete.id);
            setToastMessage(`Section "${sectionToDelete.name}" and its deployed workers have been removed.`);
            setSectionToDelete(null);
          }}
          title={`Delete Section: ${sectionToDelete.name}`}
          message={`Are you sure you want to delete section "${sectionToDelete.name}" (${sectionToDelete.code})? All workers assigned to this section will also be removed. This action cannot be undone.`}
          confirmText="Delete Section"
          variant="danger"
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default SiteDetails;
