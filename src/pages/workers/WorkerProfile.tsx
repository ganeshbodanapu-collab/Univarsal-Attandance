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
import { DatePicker } from '../../components/common/DatePicker';
import { Toast } from '../../components/common/Toast';
import {
  User,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  ArrowRightLeft,
  UserMinus,
  UserCheck,
  FileText,
  CheckCircle2,
  Utensils,
  Award,
  Edit3,
  HelpCircle,
  AlertCircle,
  CreditCard,
  Coins,
  Trash2,
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { OpeningEmployeeModal } from '../../components/workers/OpeningEmployeeModal';

export const WorkerProfile: React.FC = () => {
  const { workerId } = useParams<{ workerId: string }>();
  const navigate = useNavigate();

  const {
    workers,
    sites,
    sections,
    referrers,
    assignments,
    employmentHistory,
    attendance,
    advances,
    recoveries,
    payments,
    settlementRecords,
    settings,
    currentUser,
    transferWorker,
    markWorkerLeft,
    rejoinWorker,
    updateWorker,
    deleteWorker,
    addAdvance,
    addManualRecovery,
    markPaymentPaid,
  } = useAttendanceContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);

  // Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Transfer Form State
  const [transferSiteId, setTransferSiteId] = useState('');
  const [transferSectionId, setTransferSectionId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReason, setTransferReason] = useState('Site workload balancing');
  const [transferRemarks, setTransferRemarks] = useState('');

  // Leave Form State
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('Personal reasons / hometown visit');
  const [leaveRemarks, setLeaveRemarks] = useState('');

  // Rejoin Form State
  const [rejoinSiteId, setRejoinSiteId] = useState('');
  const [rejoinSectionId, setRejoinSectionId] = useState('');
  const [rejoinDate, setRejoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejoinRemarks, setRejoinRemarks] = useState('Rejoined workforce with permanent ID');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editWage, setEditWage] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editIdProof, setEditIdProof] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Advance Form State
  const [advAmount, setAdvAmount] = useState('');
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [advReason, setAdvReason] = useState('');
  const [advRecoveryMethod, setAdvRecoveryMethod] = useState<'perDay' | 'percentage' | 'fixedMonthly' | 'manual'>('perDay');
  const [advDailyRecoveryAmount, setAdvDailyRecoveryAmount] = useState('100');

  // Recovery Form State
  const [recAdvanceId, setRecAdvanceId] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recRemarks, setRecRemarks] = useState('');

  // Find Worker by ID, serial number, or name
  const worker = workers.find((w) => {
    if (!workerId) return false;
    const cleanParam = decodeURIComponent(workerId).trim().toLowerCase();
    if (w.id.toLowerCase() === cleanParam) return true;
    const currentSite = sites.find((s) => s.id === w.currentSiteId);
    const serial = `${currentSite?.code || w.currentSiteId}-${w.id}`.toLowerCase();
    if (serial === cleanParam) return true;
    if (w.name.toLowerCase().includes(cleanParam)) return true;
    return false;
  });

  if (!worker) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Worker Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          No worker record matches identifier: <span className="font-mono font-semibold text-slate-800">{workerId}</span>
        </p>
        <button
          onClick={() => navigate('/workers')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          Back to Workforce Registry
        </button>
      </div>
    );
  }

  // Related entities
  const currentSite = sites.find((s) => s.id === worker.currentSiteId);
  const currentSection = sections.find((s) => s.id === worker.currentSectionId);
  const referrer = worker.referrerId ? referrers.find((r) => r.id === worker.referrerId) : null;
  const serialNumber = worker.serialNumber || (worker.id.startsWith('W') ? `${currentSite?.code || worker.currentSiteId}-${worker.id}` : worker.id);

  // Worker Attendance
  const workerAttendance = attendance.filter((a) => a.workerId === worker.id);
  const presentCount = workerAttendance.filter((a) => a.status === 'present').length;
  const halfDayCount = workerAttendance.filter((a) => a.status === 'halfDay').length;
  const absentCount = workerAttendance.filter((a) => a.status === 'absent').length;
  const totalWorkingDays = presentCount + halfDayCount;

  // Earnings & Food
  const grossEarnings = presentCount * worker.dailyWage + halfDayCount * (worker.dailyWage * 0.5);
  const totalFoodDays = presentCount * (settings.foodPresentRate ?? 1) + halfDayCount * (settings.foodHalfDayRate ?? 0.5);

  // Advances & Recovery
  const workerAdvances = advances.filter((a) => a.workerId === worker.id);
  const totalAdvanceTaken = workerAdvances.reduce((sum, a) => sum + a.amount, 0);

  const workerRecoveries = recoveries.filter((r) => r.workerId === worker.id);
  const totalAdvanceRecovered = workerRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const currentAdvanceBalance = Math.max(0, totalAdvanceTaken - totalAdvanceRecovered);

  // Commission Calculations
  let totalCommission = 0;
  if (worker.workerType === 'outside' && worker.referrerId) {
    if (worker.commissionType === 'perDay') {
      totalCommission = (presentCount + halfDayCount * 0.5) * worker.commissionRate;
    } else if (worker.commissionType === 'percentage') {
      totalCommission = Math.round(grossEarnings * (worker.commissionRate / 100));
    } else if (worker.commissionType === 'fixedMonthly') {
      totalCommission = worker.commissionRate;
    }
  }
  const workerPayments = payments.filter((p) => p.workerId === worker.id);
  const commissionPaid = Math.round(totalCommission * 0.7); // 70% settled
  const commissionBalance = Math.max(0, totalCommission - commissionPaid);

  // Worker Assignments & History
  const workerAssignments = assignments.filter((asg) => asg.workerId === worker.id);
  const workerHistory = employmentHistory.filter((eh) => eh.workerId === worker.id);

  // Handlers
  const handleOpenEdit = () => {
    setEditName(worker.name);
    setEditMobile(worker.mobile);
    setEditWage(String(worker.dailyWage));
    setEditEmergency(worker.emergencyContact || '');
    setEditIdProof(worker.idProofNumber || '');
    setEditRemarks(worker.remarks || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const wage = parseFloat(editWage);
    if (!editName.trim() || !editMobile.trim() || isNaN(wage) || wage <= 0) {
      alert('Please provide valid name, mobile, and positive daily wage.');
      return;
    }
    updateWorker({
      ...worker,
      name: editName.trim(),
      mobile: editMobile.trim(),
      dailyWage: wage,
      emergencyContact: editEmergency.trim() || undefined,
      idProofNumber: editIdProof.trim() || undefined,
      remarks: editRemarks.trim() || undefined,
    });
    setToastMessage('Worker profile details updated successfully.');
    setShowEditModal(false);
  };

  const handleTransfer = () => {
    if (!transferSiteId || !transferSectionId) {
      alert('Please select both target site and section.');
      return;
    }
    transferWorker(worker.id, transferSiteId, transferSectionId, transferDate, transferReason, transferRemarks);
    setToastMessage(`Worker transferred to new site/section successfully.`);
    setShowTransferModal(false);
  };

  const handleMarkLeft = () => {
    markWorkerLeft(worker.id, leaveDate, `${leaveReason}. ${leaveRemarks}`.trim());
    setToastMessage(`Worker marked as left. Permanent ID ${worker.id} remains preserved.`);
    setShowLeaveModal(false);
  };

  const handleRejoin = () => {
    if (!rejoinSiteId || !rejoinSectionId) {
      alert('Please choose site and section for rejoining worker.');
      return;
    }
    rejoinWorker(worker.id, rejoinSiteId, rejoinSectionId, rejoinDate, rejoinRemarks);
    setToastMessage(`Worker rejoined successfully under permanent ID ${worker.id}.`);
    setShowRejoinModal(false);
  };

  const handleIssueAdvance = () => {
    const amt = parseFloat(advAmount);
    if (isNaN(amt) || amt <= 0 || !advReason.trim()) {
      alert('Please enter a valid advance amount and purpose.');
      return;
    }
    const dailyAmt = parseFloat(advDailyRecoveryAmount) || undefined;
    addAdvance({
      workerId: worker.id,
      amount: amt,
      date: advDate,
      reason: advReason.trim(),
      recoveryMethod: advRecoveryMethod,
      dailyRecoveryAmount: dailyAmt,
    });
    setToastMessage(`Advance loan of ₹${amt.toLocaleString()} issued.`);
    setShowAdvanceModal(false);
    setAdvAmount('');
    setAdvReason('');
  };

  const handleManualRecovery = () => {
    const amt = parseFloat(recAmount);
    if (!recAdvanceId || isNaN(amt) || amt <= 0) {
      alert('Please select the active advance loan and enter recovery amount.');
      return;
    }
    addManualRecovery({
      advanceId: recAdvanceId,
      workerId: worker.id,
      date: recDate,
      amount: amt,
      remarks: recRemarks.trim() || 'Manual cash settlement',
    });
    setToastMessage(`Manual recovery payment of ₹${amt.toLocaleString()} recorded.`);
    setShowRecoveryModal(false);
    setRecAmount('');
    setRecRemarks('');
  };

  // Filter sections for modals
  const transferSections = sections.filter((s) => s.siteId === transferSiteId && s.status === 'active');
  const rejoinSections = sections.filter((s) => s.siteId === rejoinSiteId && s.status === 'active');

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/workers" className="hover:text-blue-600 transition-colors">Workforce</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{worker.name} ({worker.id})</span>
      </div>

      {/* Modern Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shadow-blue-500/20 shrink-0">
              {worker.name.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{worker.name}</h1>
                <StatusBadge status={worker.status} />
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    worker.workerType === 'company'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                      : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  }`}
                >
                  {worker.workerType === 'company' ? 'Company Worker' : 'Outside Contractor'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                  <Briefcase className="h-3 w-3 mr-1 text-emerald-600" />
                  <span>Purpose: {worker.designation || worker.purpose || 'General Duty'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                <span className="inline-flex items-center text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/50">
                  Emp ID: {worker.id}
                </span>
                <span className="inline-flex items-center text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                  Serial No: {serialNumber}
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{worker.mobile}</span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{currentSite?.name || 'Unassigned'}</span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>{currentSection?.name || 'Unassigned'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Lifecycle Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {worker.status === 'active' && (
              <>
                <button
                  onClick={() => {
                    setTransferSiteId(worker.currentSiteId);
                    setTransferSectionId('');
                    setShowTransferModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200/60 transition-all active:scale-95"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Transfer Worker</span>
                </button>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200/60 transition-all active:scale-95"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  <span>Mark as Left</span>
                </button>
              </>
            )}

            {worker.status === 'left' && (
              <button
                onClick={() => {
                  setRejoinSiteId(worker.currentSiteId);
                  setRejoinSectionId('');
                  setShowRejoinModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Rejoin Worker</span>
              </button>
            )}

            <button
              onClick={handleOpenEdit}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>

            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowOpeningModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/60 transition-all active:scale-95 cursor-pointer"
                  title="Configure Employee Opening Balance & Historical Attendance"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{worker.openingRecord ? 'Opening Record' : '+ Set Opening'}</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/60 transition-all active:scale-95 cursor-pointer"
                  title="Delete Employee Permanently"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Highlight Banner on Joining & Permanent ID */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 font-medium">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Joined: <strong>{worker.joiningDate}</strong></span>
            </span>
            {worker.lastRejoinedDate && (
              <span className="flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Last Rejoined: {worker.lastRejoinedDate}</span>
              </span>
            )}
            {referrer && (
              <span className="flex items-center space-x-1 font-medium">
                <Award className="h-3.5 w-3.5 text-purple-600" />
                <span>Agent: <strong>{referrer.name}</strong> ({referrer.mobile})</span>
              </span>
            )}
          </div>
          <div className="text-slate-400 text-[11px] font-mono">
            * Permanent Worker ID ({worker.id}) is permanent across all rejoining cycles.
          </div>
        </div>
      </div>

      {/* 12 Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Work Days"
          value={totalWorkingDays}
          icon={<Clock className="h-5 w-5 text-blue-600" />}
          description="Present + Half Day"
        />
        <StatCard
          title="Present Days"
          value={presentCount}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          description="Full days on duty"
        />
        <StatCard
          title="Half Days"
          value={halfDayCount}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          description="0.5 day credits"
        />
        <StatCard
          title="Absent Days"
          value={absentCount}
          icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
          description="Unexcused or leave"
        />
        <StatCard
          title="Gross Earnings"
          value={`₹${grossEarnings.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
          description={`@ ₹${worker.dailyWage}/day`}
        />
        <StatCard
          title="Advance Taken"
          value={`₹${totalAdvanceTaken.toLocaleString()}`}
          icon={<CreditCard className="h-5 w-5 text-purple-600" />}
          description={`${workerAdvances.length} loans issued`}
        />
        <StatCard
          title="Advance Recovered"
          value={`₹${totalAdvanceRecovered.toLocaleString()}`}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          description="Wage deductions"
        />
        <StatCard
          title="Advance Balance"
          value={`₹${currentAdvanceBalance.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-amber-600" />}
          description={currentAdvanceBalance > 0 ? 'Pending recovery' : 'Zero debt'}
        />
        <StatCard
          title="Food Days"
          value={totalFoodDays}
          icon={<Utensils className="h-5 w-5 text-orange-500" />}
          description="Meals consumed"
        />
        <StatCard
          title="Total Commission"
          value={`₹${totalCommission.toLocaleString()}`}
          icon={<Award className="h-5 w-5 text-violet-600" />}
          description={worker.referrerId ? worker.commissionType : 'N/A'}
        />
        <StatCard
          title="Commission Paid"
          value={`₹${commissionPaid.toLocaleString()}`}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
          description="Paid to Agent"
        />
        <StatCard
          title="Commission Due"
          value={`₹${commissionBalance.toLocaleString()}`}
          icon={<Coins className="h-5 w-5 text-rose-600" />}
          description="Balance payable"
        />
      </div>

      {/* 11 Interactive Navigation Tabs */}
      <Tabs
        options={[
          { id: 'overview', label: 'Overview & Q&A' },
          { id: 'attendance', label: `Attendance (${workerAttendance.length})` },
          { id: 'monthly', label: 'Monthly Summary' },
          { id: 'assignments', label: `Site & Sections (${workerAssignments.length})` },
          { id: 'employment', label: `Employment History (${workerHistory.length})` },
          { id: 'advances', label: `Advances (${workerAdvances.length})` },
          { id: 'recovery', label: `Recovery (${workerRecoveries.length})` },
          { id: 'food', label: 'Food Log' },
          { id: 'payments', label: `Wage Payments (${workerPayments.length})` },
          { id: 'commission', label: 'Commission' },
          { id: 'documents', label: 'Documents & Notes' },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB CONTENT 1: OVERVIEW & SECTION 59 TELUGU Q&A PANEL */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 59 Master Telugu Insight Box */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex items-center space-x-2.5 text-blue-300 mb-4">
              <HelpCircle className="h-5 w-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Worker 360 Telugu UX Q&A (క్షేత్రస్థాయి తక్షణ సమాధానాలు)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-blue-200/80 mb-6 font-medium">
              సూపర్‌వైజర్లు మరియు మేనేజర్లు ఒకే క్లిక్‌తో వర్కర్ పూర్తి స్థితిని తెలుసుకోవడానికి రూపొందించబడింది:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">1. వర్కర్ ఎప్పుడు జాయిన్ అయ్యాడు? (Join Date)</span>
                <span className="text-base font-bold text-white mt-1 block">{worker.joiningDate}</span>
                <span className="text-[11px] text-blue-200/70">Initial onboarding timestamp</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">2. రీజాయిన్ అయ్యాడా? (Rejoined Status)</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {worker.lastRejoinedDate ? `అవును (${worker.lastRejoinedDate})` : 'లేదు (తొలి నియామకమే)'}
                </span>
                <span className="text-[11px] text-blue-200/70">Permanent ID {worker.id} మారదు</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">3. మొత్తం ఎన్ని రోజులు పనిచేశాడు? (Total Days)</span>
                <span className="text-base font-bold text-white mt-1 block">{totalWorkingDays} రోజులు ({presentCount} Full, {halfDayCount} Half)</span>
                <span className="text-[11px] text-blue-200/70">Attendance records aggregated</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">4. ఎంత అడ్వాన్స్ తీసుకున్నాడు? (Advance Taken)</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">₹{totalAdvanceTaken.toLocaleString()}</span>
                <span className="text-[11px] text-blue-200/70">{workerAdvances.length} రుణాలు జారీ చేయబడ్డాయి</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">5. ఎంత కట్ అయింది? (Advance Recovered)</span>
                <span className="text-base font-bold text-amber-300 mt-1 block">₹{totalAdvanceRecovered.toLocaleString()}</span>
                <span className="text-[11px] text-blue-200/70">రోజువారీ జీతం నుండి ఆటో రికవరీ</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">6. ఇంకా ఎంత బ్యాలెన్స్ ఉంది? (Balance Advance)</span>
                <span className={`text-base font-bold mt-1 block ${currentAdvanceBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{currentAdvanceBalance.toLocaleString()}
                </span>
                <span className="text-[11px] text-blue-200/70">{currentAdvanceBalance > 0 ? 'బకాయి ఉన్న అడ్వాన్స్' : 'అడ్వాన్స్ క్లియర్ అయింది'}</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">7. ఫుడ్ ఎన్ని రోజులు కౌంట్ అయింది? (Food Days)</span>
                <span className="text-base font-bold text-white mt-1 block">{totalFoodDays} భోజనాలు</span>
                <span className="text-[11px] text-blue-200/70">హాజరు ఆధారంగా ఆటో లెక్క</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">8. ఏజెంట్ ఎవరు & కమీషన్ ఎంత? (Referrer & Comm.)</span>
                <span className="text-base font-bold text-purple-300 mt-1 block">
                  {referrer ? `${referrer.name} (బకాయి: ₹${commissionBalance.toLocaleString()})` : 'డైరెక్ట్ కంపెనీ వర్కర్'}
                </span>
                <span className="text-[11px] text-blue-200/70">{worker.workerType === 'outside' ? `రూల్: ${worker.commissionType}` : 'No commission'}</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <span className="text-[11px] font-bold text-blue-300 block">9. ప్రస్తుతం ఏ సైట్ & సెక్షన్ లో ఉన్నాడు?</span>
                <span className="text-base font-bold text-cyan-300 mt-1 block">
                  {currentSite?.name || 'N/A'} - {currentSection?.name || 'N/A'}
                </span>
                <span className="text-[11px] text-blue-200/70">Site Code: {currentSite?.code || 'S001'}</span>
              </div>
            </div>
          </div>

          {/* Opening Balance & Prior Service Dossier Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 text-indigo-700 flex items-center justify-center font-bold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Opening Balance &amp; Historical Prior Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pre-digital service record, old advance loans, and historical wage balances.
                  </p>
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowOpeningModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer self-start sm:self-center"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{worker.openingRecord ? 'Edit Opening Record' : '+ Set Opening Balance'}</span>
                </button>
              )}
            </div>

            {worker.openingRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Original Joining Date
                    </span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {worker.openingRecord.originalJoiningDate}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      As-Of: {worker.openingRecord.asOfDate}
                    </span>
                  </div>

                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Prior Working Mandays
                    </span>
                    <span className="text-sm font-black text-indigo-900 mt-1 block">
                      {worker.openingRecord.totalPriorDays} Days
                    </span>
                    <span className="text-[10px] text-indigo-700/70">
                      {worker.openingRecord.priorWorkingDays} Full • {worker.openingRecord.priorHalfDays} Half
                    </span>
                  </div>

                  <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                      Old Advance Carried (Dr)
                    </span>
                    <span className="text-sm font-black text-rose-700 mt-1 block">
                      ₹{worker.openingRecord.openingAdvanceBalance.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-rose-600/70">Prior unrecovered loan</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Old Pending Wages (Cr)
                    </span>
                    <span className="text-sm font-black text-emerald-700 mt-1 block">
                      ₹{worker.openingRecord.openingPendingWages.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600/70">Past unpaid earnings</span>
                  </div>
                </div>

                {/* Net Opening Position and Ledger Notes Bar */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-semibold">Net Opening Position:</span>
                      <span className="font-bold text-white">
                        {worker.openingRecord.netOpeningBalance > 0
                          ? `+₹${worker.openingRecord.netOpeningBalance.toLocaleString()} (Company Owes Worker)`
                          : worker.openingRecord.netOpeningBalance < 0
                          ? `-₹${Math.abs(worker.openingRecord.netOpeningBalance).toLocaleString()} (Worker Owes Company)`
                          : '₹0.00 (Balanced)'}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-black uppercase ${
                          worker.openingRecord.netOpeningBalance > 0
                            ? 'bg-emerald-500 text-slate-950'
                            : worker.openingRecord.netOpeningBalance < 0
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {worker.openingRecord.netOpeningBalance > 0 ? 'NET PAYABLE' : worker.openingRecord.netOpeningBalance < 0 ? 'NET RECOVERABLE' : 'EVEN'}
                      </span>
                    </div>
                    {worker.openingRecord.remarks && (
                      <p className="text-[11px] text-slate-400 italic">
                        <strong>Ledger Note:</strong> {worker.openingRecord.remarks}
                      </p>
                    )}
                  </div>

                  {worker.openingRecord.openingFoodMeals > 0 && (
                    <span className="text-[11px] text-slate-300 font-medium px-2.5 py-1 bg-slate-800 rounded-lg shrink-0">
                      Prior Canteen Meals: {worker.openingRecord.openingFoodMeals}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block">No Opening Record Configured</span>
                  This employee does not have pre-digital prior service or old advance balances recorded yet.
                </div>
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setShowOpeningModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    + Configure Opening Record
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Detailed Spec Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <span>Personal Identification & Employment Specification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Legal Name</span>
                <p className="text-sm font-bold text-slate-800">{worker.name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permanent Worker ID</span>
                <p className="text-sm font-bold text-blue-700 font-mono">{worker.id} (Permanent & Non-fungible)</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Display Serial</span>
                <p className="text-sm font-bold text-slate-800 font-mono">{serialNumber}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                <p className="text-sm font-semibold text-slate-800">{worker.mobile}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Contact</span>
                <p className="text-sm font-semibold text-slate-800">{worker.emergencyContact || '9812345699 (Family)'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">National ID / Aadhaar</span>
                <p className="text-sm font-semibold text-slate-800 font-mono">{worker.idProofNumber || 'AADHAAR-8921-4432-1092'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contract Daily Wage</span>
                <p className="text-sm font-bold text-slate-900">₹{worker.dailyWage} / day</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance Authentication Modes</span>
                <div className="flex space-x-1.5 mt-1">
                  {worker.attendanceModes.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold capitalize">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Supervisor Notes</span>
                <p className="text-sm text-slate-600 italic">{worker.remarks || 'No pending disciplinary notes.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ATTENDANCE HISTORY */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recorded Check-in Logs</h3>
            <span className="text-xs text-slate-500">{workerAttendance.length} records available</span>
          </div>

          <DataTable
            data={workerAttendance}
            columns={[
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Site & Section',
                render: (row) => {
                  const asg = assignments.find((a) => a.id === row.assignmentId);
                  const st = asg ? sites.find((s) => s.id === asg.siteId) : currentSite;
                  const sc = asg ? sections.find((s) => s.id === asg.sectionId) : currentSection;
                  return (
                    <div>
                      <div className="text-xs font-bold text-slate-800">{st?.name || 'Default Site'}</div>
                      <div className="text-[11px] text-slate-500">{sc?.name || 'Concreting'}</div>
                    </div>
                  );
                },
              },
              {
                header: 'Status',
                accessor: 'status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                header: 'Check In',
                accessor: 'checkIn',
                render: (row) => row.checkIn ? <span className="font-mono text-xs">{row.checkIn}</span> : '-',
              },
              {
                header: 'Check Out',
                accessor: 'checkOut',
                render: (row) => row.checkOut ? <span className="font-mono text-xs">{row.checkOut}</span> : '-',
              },
              {
                header: 'Method',
                accessor: 'method',
                render: (row) => (
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    {row.method}
                  </span>
                ),
              },
              {
                header: 'Earned Wage',
                render: (row) => {
                  const wage = row.status === 'present' ? worker.dailyWage : row.status === 'halfDay' ? worker.dailyWage * 0.5 : 0;
                  return <span className="font-bold text-xs text-slate-900">₹{wage}</span>;
                },
              },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 3: MONTHLY SUMMARY */}
      {activeTab === 'monthly' && (() => {
        // Compute real month-by-month summary from live data
        const workerAttendance = attendance.filter((a) => a.workerId === worker.id);
        const workerAdvances = advances.filter((a) => a.workerId === worker.id);
        const workerRecoveries = recoveries.filter((r) => r.workerId === worker.id);

        // Group attendance by month (YYYY-MM)
        const monthMap = new Map<string, {
          present: number; halfDay: number; absent: number; foodDays: number;
        }>();
        for (const rec of workerAttendance) {
          const month = rec.date.slice(0, 7);
          if (!monthMap.has(month)) monthMap.set(month, { present: 0, halfDay: 0, absent: 0, foodDays: 0 });
          const m = monthMap.get(month)!;
          if (rec.status === 'present') { m.present++; m.foodDays += 1; }
          else if (rec.status === 'halfDay') { m.halfDay++; m.foodDays += 0.5; }
          else if (rec.status === 'absent') { m.absent++; }
        }

        // Build rows sorted newest first
        const rows = Array.from(monthMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([month, att]) => {
            const grossWage = (att.present + att.halfDay * 0.5) * worker.dailyWage;
            const monthAdvances = workerAdvances.filter((a) => a.date?.slice(0, 7) === month).reduce((s, a) => s + a.amount, 0);
            const monthRecoveries = workerRecoveries.filter((r) => r.date?.slice(0, 7) === month).reduce((s, r) => s + r.amount, 0);
            const monthSettlement = settlementRecords.find((p) => p.workerId === worker.id && p.month === month);
            const advanceDeducted = monthRecoveries || monthAdvances;
            const netPay = grossWage - advanceDeducted;
            const workingDays = att.present + att.halfDay + att.absent;
            return {
              month,
              workingDays,
              present: att.present,
              halfDay: att.halfDay,
              absent: att.absent,
              foodDays: att.foodDays,
              grossWage,
              advanceDeducted,
              netPay,
              status: monthSettlement ? 'Settled' : (att.present + att.halfDay > 0 ? 'Pending' : '—'),
            };
          });

        if (rows.length === 0) {
          return (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 shadow-xs text-center">
              <h3 className="text-base font-bold text-slate-900 mb-4">Month-by-Month Aggregate Summary</h3>
              <div className="text-slate-400 text-sm">No attendance records found for this employee yet.</div>
            </div>
          );
        }

        return (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Month-by-Month Aggregate Summary</h3>
            </div>
            <DataTable
              data={rows}
              columns={[
                { header: 'Month', accessor: 'month', sortable: true, render: (row) => <span className="font-bold text-slate-900">{row.month}</span> },
                { header: 'Working Days', accessor: 'workingDays' },
                { header: 'Present', accessor: 'present', render: (row) => <span className="font-semibold text-emerald-600">{row.present}</span> },
                { header: 'Half Day', accessor: 'halfDay', render: (row) => <span className="font-semibold text-amber-600">{row.halfDay}</span> },
                { header: 'Absent', accessor: 'absent', render: (row) => <span className="font-semibold text-rose-500">{row.absent}</span> },
                { header: 'Food Count', accessor: 'foodDays', render: (row) => <span className="font-semibold text-orange-600">{row.foodDays} meals</span> },
                { header: 'Gross Wage', render: (row) => <span className="font-bold text-slate-800">₹{row.grossWage.toLocaleString()}</span> },
                { header: 'Advance Cut', render: (row) => <span className="font-bold text-rose-600">-₹{row.advanceDeducted.toLocaleString()}</span> },
                { header: 'Net Payout', render: (row) => <span className="font-black text-emerald-700">₹{row.netPay.toLocaleString()}</span> },
                {
                  header: 'Bill Status',
                  render: (row) => (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.status === 'Settled' ? 'bg-emerald-50 text-emerald-700' : row.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                      {row.status}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        );
      })()}

      {/* TAB CONTENT 4: SITE & SECTION HISTORY */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Site & Section Deployment Timeline</h3>
              <p className="text-xs text-slate-500">Every site transfer closes the previous assignment and initiates a new one.</p>
            </div>
            {worker.status === 'active' && (
              <button
                onClick={() => {
                  setTransferSiteId(worker.currentSiteId);
                  setTransferSectionId('');
                  setShowTransferModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + New Transfer
              </button>
            )}
          </div>

          <DataTable
            data={workerAssignments}
            columns={[
              { header: 'Assignment ID', accessor: 'id', render: (row) => <span className="font-mono text-xs text-slate-600">{row.id}</span> },
              {
                header: 'Site Location',
                render: (row) => {
                  const s = sites.find((x) => x.id === row.siteId);
                  return (
                    <div>
                      <span className="font-bold text-slate-900">{s?.name || row.siteId}</span>
                      <span className="text-slate-400 text-xs ml-1 font-mono">({s?.code || row.siteId})</span>
                    </div>
                  );
                },
              },
              {
                header: 'Section',
                render: (row) => {
                  const sec = sections.find((x) => x.id === row.sectionId);
                  return <span className="font-medium text-slate-700">{sec?.name || row.sectionId}</span>;
                },
              },
              { header: 'From Date', accessor: 'fromDate' },
              {
                header: 'To Date',
                render: (row) => row.toDate ? row.toDate : <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Present (Active)</span>,
              },
              { header: 'Transfer Reason', render: (row) => row.reason || 'General deployment' },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 5: EMPLOYMENT HISTORY (JOIN, LEFT, REJOIN) */}
      {activeTab === 'employment' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Employment Lifecycle Events</h3>
              <p className="text-xs text-slate-500">Tracks all Join, Leave, and Rejoin milestones under Permanent ID {worker.id}.</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {workerHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No past leave/rejoin cycles recorded. Worker has continuous active tenure since {worker.joiningDate}.
              </div>
            ) : (
              workerHistory.map((event, idx) => {
                const s = sites.find((x) => x.id === event.siteId);
                const isRejoined = event.event === 'rejoined';
                const isLeft = event.event === 'left';

                return (
                  <div
                    key={event.id || idx}
                    className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isRejoined
                          ? 'bg-emerald-100 text-emerald-700'
                          : isLeft
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isRejoined ? <UserCheck className="h-5 w-5" /> : isLeft ? <UserMinus className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isRejoined
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isLeft
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {event.event}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{event.date}</span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 mt-2">
                        Site: {s?.name || event.siteId}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{event.remarks}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: ADVANCES (LOANS ISSUED) */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Advances & Loans Register</h3>
              <p className="text-xs text-slate-500">All issued advances, recovery terms, and running balance.</p>
            </div>
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              + Issue Advance
            </button>
          </div>

          <DataTable
            data={workerAdvances}
            columns={[
              { header: 'Advance ID', accessor: 'id', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { header: 'Date Issued', accessor: 'date', sortable: true },
              { header: 'Principal Amount', render: (row) => <span className="font-bold text-slate-900">₹{row.amount.toLocaleString()}</span> },
              {
                header: 'Recovery Rule',
                render: (row) => (
                  <span className="text-xs font-semibold capitalize text-slate-700">
                    {row.recoveryMethod === 'perDay' ? `Per Day (₹${row.dailyRecoveryAmount || 100})` : row.recoveryMethod}
                  </span>
                ),
              },
              {
                header: 'Status',
                render: (row) => (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.status === 'active' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800'}`}>
                    {row.status === 'active' ? 'Active / Recovering' : 'Fully Recovered'}
                  </span>
                ),
              },
              { header: 'Reason', accessor: 'reason' },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 7: RECOVERY LEDGER */}
      {activeTab === 'recovery' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Advance Recovery Ledger</h3>
              <p className="text-xs text-slate-500">Auto-deductions from attendance wages and manual cash repayments.</p>
            </div>
            {currentAdvanceBalance > 0 && (
              <button
                onClick={() => {
                  const activeAdv = workerAdvances.find((a) => a.status === 'active');
                  if (activeAdv) setRecAdvanceId(activeAdv.id);
                  setShowRecoveryModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + Manual Cash Recovery
              </button>
            )}
          </div>

          <DataTable
            data={workerRecoveries}
            columns={[
              { header: 'Recovery ID', accessor: 'id', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { header: 'Date', accessor: 'date', sortable: true },
              { header: 'Linked Advance', accessor: 'advanceId', render: (row) => <span className="font-mono text-xs">{row.advanceId}</span> },
              { header: 'Amount Recovered', render: (row) => <span className="font-bold text-emerald-600">₹{row.amount.toLocaleString()}</span> },
              {
                header: 'Type',
                render: (row) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.isManual ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                    {row.isManual ? 'Manual Cash' : 'Auto Daily Wage'}
                  </span>
                ),
              },
              { header: 'Remarks', accessor: 'remarks' },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 8: FOOD CONSUMPTION LOG */}
      {activeTab === 'food' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Food / Meal Consumption Derived from Attendance</h3>
              <p className="text-xs text-slate-500">Present = 1.0 Food, Half-Day = 0.5 Food, Absent = 0 Food.</p>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200/60 font-bold text-xs flex items-center space-x-1.5">
              <Utensils className="h-4 w-4 text-orange-500" />
              <span>Total Meals Credited: {totalFoodDays}</span>
            </div>
          </div>

          <DataTable
            data={workerAttendance}
            columns={[
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Attendance Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                header: 'Meal Credited',
                render: (row) => {
                  const food = row.status === 'present' ? 1 : row.status === 'halfDay' ? 0.5 : 0;
                  return (
                    <span className={`font-bold text-xs ${food > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {food} meal {food === 1 ? '(Full)' : food === 0.5 ? '(Half)' : '(None)'}
                    </span>
                  );
                },
              },
              {
                header: 'Location',
                render: () => <span>{currentSite?.name || 'Downtown Plaza'}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 9: WAGE PAYMENTS SLIP */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daily / Weekly Wage Disbursements</h3>
              <p className="text-xs text-slate-500">Gross earnings, advance deductions, and payout status.</p>
            </div>
          </div>

          <DataTable
            data={workerPayments}
            columns={[
              { header: 'Payment ID', accessor: 'id', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { header: 'Date', accessor: 'date', sortable: true },
              { header: 'Gross Wage', render: (row) => <span className="font-bold text-slate-800">₹{row.grossWage}</span> },
              { header: 'Advance Recovery', render: (row) => <span className="font-bold text-rose-600">-₹{row.advanceRecovery}</span> },
              { header: 'Net Pay Disbursed', render: (row) => <span className="font-black text-emerald-700">₹{row.netPay}</span> },
              {
                header: 'Disbursement Method',
                accessor: 'paymentMethod',
                render: (row) => <span className="capitalize text-xs font-semibold">{row.paymentMethod}</span>,
              },
              {
                header: 'Status',
                render: (row) => (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {row.status.toUpperCase()}
                  </span>
                ),
              },
              {
                header: 'Action',
                render: (row) =>
                  row.status !== 'paid' ? (
                    <button
                      onClick={() => {
                        markPaymentPaid(row.id);
                        setToastMessage(`Payment ${row.id} marked as paid.`);
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Settled</span>
                    </span>
                  ),
              },
            ]}
          />
        </div>
      )}

      {/* TAB CONTENT 10: REFERRAL COMMISSION */}
      {activeTab === 'commission' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span>Referral & Sourcing Agent Relationship</span>
            </h3>

            {referrer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Referrer / Agent Name</span>
                  <p className="text-sm font-bold text-slate-900">{referrer.name}</p>
                  <p className="text-xs text-slate-500 font-mono">ID: {referrer.id}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Phone</span>
                  <p className="text-sm font-semibold text-slate-900">{referrer.mobile}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commission Structure</span>
                  <p className="text-sm font-bold text-purple-700">
                    {worker.commissionType === 'perDay'
                      ? `₹${worker.commissionRate} / day worked`
                      : worker.commissionType === 'percentage'
                      ? `${worker.commissionRate}% of gross wage`
                      : `Fixed ₹${worker.commissionRate} / month`}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Commission Due</span>
                  <p className="text-base font-black text-rose-600">₹{commissionBalance.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400">Total generated: ₹{totalCommission.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                This worker was registered directly as an in-house company worker. No third-party agent or commission applies.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 11: DOCUMENTS & NOTES */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Identity Proofs, Emergency Files & Supervisor Notes</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">ID Proof Document</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    ID
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Govt. Photo Identification Card</p>
                    <p className="text-[11px] font-mono text-slate-500">{worker.idProofNumber || 'AADHAAR-8921-4432-1092'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">Verified</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Supervisor Internal Remarks</span>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                {worker.remarks || 'Registered under standard safety clearance. No incidents recorded.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TRANSFER WORKER */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title={`Transfer Worker: ${worker.name} (${worker.id})`}
        subtitle="Closes current active assignment and initiates new assignment at target site/section."
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-200/60">
            <strong>Current:</strong> {currentSite?.name} ({currentSite?.code}) &rarr; {currentSection?.name}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Destination Site *"
              value={transferSiteId}
              onChange={(e) => {
                setTransferSiteId(e.target.value);
                setTransferSectionId('');
              }}
              options={[
                { value: '', label: 'Select target site...' },
                ...sites.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })),
              ]}
            />

            <Select
              label="Target Section *"
              value={transferSectionId}
              onChange={(e) => setTransferSectionId(e.target.value)}
              disabled={!transferSiteId}
              options={[
                { value: '', label: 'Select section...' },
                ...transferSections.map((sec) => ({ value: sec.id, label: `${sec.code} - ${sec.name}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              label="Effective Transfer Date *"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
            <Input
              label="Transfer Reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Workload balancing, Project Phase 2"
            />
          </div>

          <Input
            label="Additional Remarks"
            value={transferRemarks}
            onChange={(e) => setTransferRemarks(e.target.value)}
            placeholder="Optional supervisor notes..."
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: MARK AS LEFT */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title={`Mark Worker as Left: ${worker.name}`}
        subtitle={`Preserves Permanent ID ${worker.id} and closes active site deployment.`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200/60">
            <strong>Note:</strong> The worker will be deactivated, but their permanent profile, past wages, advances, and biometric assignments remain permanently preserved for future rejoining.
          </div>

          <DatePicker
            label="Date of Departure *"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
          />

          <Input
            label="Reason for Leaving *"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="e.g. Personal family leave, medical, farming season"
          />

          <Input
            label="Remarks"
            value={leaveRemarks}
            onChange={(e) => setLeaveRemarks(e.target.value)}
            placeholder="Optional supervisor notes..."
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkLeft}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Confirm Departure
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: REJOIN WORKER */}
      <Modal
        isOpen={showRejoinModal}
        onClose={() => setShowRejoinModal(false)}
        title={`Rejoin Worker: ${worker.name} (${worker.id})`}
        subtitle={`Reactivates worker under permanent ID ${worker.id}. Serial number will update based on selected site.`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200/60">
            <strong>Guaranteed Consistency:</strong> Rejoining workers retain their original Permanent ID ({worker.id}), historical attendance, advances, and audit history.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Rejoining Site *"
              value={rejoinSiteId}
              onChange={(e) => {
                setRejoinSiteId(e.target.value);
                setRejoinSectionId('');
              }}
              options={[
                { value: '', label: 'Select site...' },
                ...sites.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })),
              ]}
            />

            <Select
              label="Rejoining Section *"
              value={rejoinSectionId}
              onChange={(e) => setRejoinSectionId(e.target.value)}
              disabled={!rejoinSiteId}
              options={[
                { value: '', label: 'Select section...' },
                ...rejoinSections.map((sec) => ({ value: sec.id, label: `${sec.code} - ${sec.name}` })),
              ]}
            />
          </div>

          <DatePicker
            label="Rejoin Date *"
            value={rejoinDate}
            onChange={(e) => setRejoinDate(e.target.value)}
          />

          <Input
            label="Remarks"
            value={rejoinRemarks}
            onChange={(e) => setRejoinRemarks(e.target.value)}
            placeholder="e.g. Rejoined workforce after harvest season"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowRejoinModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejoin}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Reactivate Worker
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: EDIT WORKER DETAILS */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Worker Profile: ${worker.name}`}
        subtitle={`Permanent Worker ID: ${worker.id}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name *" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input label="Mobile Number *" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Daily Wage (₹) *"
              type="number"
              value={editWage}
              onChange={(e) => setEditWage(e.target.value)}
            />
            <Input
              label="Emergency Contact"
              value={editEmergency}
              onChange={(e) => setEditEmergency(e.target.value)}
              placeholder="e.g. 9812345699 (Brother)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ID Proof / Aadhaar Number"
              value={editIdProof}
              onChange={(e) => setEditIdProof(e.target.value)}
              placeholder="e.g. AADHAAR-8921-4432-1092"
            />
            <Input
              label="Supervisor Remarks"
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {currentUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setShowDeleteConfirm(true);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Employee</span>
              </button>
            ) : <div />}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: ISSUE ADVANCE */}
      <Modal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        title={`Issue Advance to ${worker.name}`}
        subtitle={`Current outstanding balance: ₹${currentAdvanceBalance.toLocaleString()}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Advance Loan Amount (₹) *"
              type="number"
              value={advAmount}
              onChange={(e) => setAdvAmount(e.target.value)}
              placeholder="e.g. 2000"
            />
            <DatePicker label="Disbursement Date *" value={advDate} onChange={(e) => setAdvDate(e.target.value)} />
          </div>

          <Input
            label="Reason / Purpose *"
            value={advReason}
            onChange={(e) => setAdvReason(e.target.value)}
            placeholder="e.g. Medical emergency, family festival"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Recovery Method"
              value={advRecoveryMethod}
              onChange={(e) => setAdvRecoveryMethod(e.target.value as any)}
              options={[
                { value: 'perDay', label: 'Per Day Worked (Auto-cut)' },
                { value: 'manual', label: 'Manual Cash Recovery Only' },
              ]}
            />
            {advRecoveryMethod === 'perDay' && (
              <Input
                label="Daily Cut Amount (₹)"
                type="number"
                value={advDailyRecoveryAmount}
                onChange={(e) => setAdvDailyRecoveryAmount(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowAdvanceModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleIssueAdvance}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Issue Loan
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 6: MANUAL RECOVERY */}
      <Modal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        title={`Record Manual Cash Recovery: ${worker.name}`}
        subtitle={`Outstanding balance: ₹${currentAdvanceBalance.toLocaleString()}`}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Select Active Advance Loan *"
            value={recAdvanceId}
            onChange={(e) => setRecAdvanceId(e.target.value)}
            options={[
              { value: '', label: 'Choose loan...' },
              ...workerAdvances.filter((a) => a.status === 'active').map((a) => ({
                value: a.id,
                label: `${a.id} (₹${a.amount}) - ${a.reason}`,
              })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Payment Amount (₹) *"
              type="number"
              value={recAmount}
              onChange={(e) => setRecAmount(e.target.value)}
              placeholder="e.g. 500"
            />
            <DatePicker label="Receipt Date *" value={recDate} onChange={(e) => setRecDate(e.target.value)} />
          </div>

          <Input
            label="Cashier Remarks"
            value={recRemarks}
            onChange={(e) => setRecRemarks(e.target.value)}
            placeholder="e.g. Handed cash in site office"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleManualRecovery}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Record Repayment
            </button>
          </div>
        </div>
      </Modal>

      {/* OPENING EMPLOYEE MODAL */}
      {showOpeningModal && (
        <OpeningEmployeeModal
          isOpen={showOpeningModal}
          onClose={() => setShowOpeningModal(false)}
          worker={worker}
          onSuccess={() => {
            setToastMessage(`✓ Opening record and prior service updated for "${worker.name}".`);
            setShowOpeningModal(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deleteWorker(worker.id);
            navigate('/workers', { replace: true });
          }}
          title={`Delete Employee: ${worker.name}`}
          message={`Are you sure you want to delete employee "${worker.name}" (${worker.id})? All historical attendance logs, advance loans, repayment recovery records, site assignments, and payroll payouts will be permanently deleted. This action cannot be undone.`}
          confirmText="Delete Employee"
          variant="danger"
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
