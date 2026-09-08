import React, { useState, useEffect, useRef } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Advance, LedgerEntry } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { DatePicker } from '../../components/common/DatePicker';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Toast } from '../../components/common/Toast';
import { StatCard } from '../../components/common/StatCard';
import { SignaturePad } from '../../components/common/SignaturePad';
import { calculateAdvanceBalance } from '../../utils/calculations/calculateAdvanceBalance';
import {
  Plus,
  Receipt,
  Landmark,
  Scale,
  DollarSign,
  Coins,
  Send,
  Clock,
  CheckCircle2,
  FileText,
  Camera,
  Upload,
  Eye,
  Wallet,
  CreditCard,
  RefreshCw,
  User,
  SlidersHorizontal,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

interface AdvanceRow extends Advance {
  workerName: string;
  siteId: string;
  siteName: string;
  sectionId: string;
  sectionName: string;
  recovered: number;
  outstanding: number;
}

export const Advances: React.FC = () => {
  const {
    advances,
    recoveries,
    workers,
    sites,
    sections,
    assignments,
    attendance,
    payments,
    addAdvance,
    updateAdvancePaymentStatus,
    addManualRecovery,
    closeAdvance,
    currentUser,
  } = useAttendanceContext();

  // Two-Tab View State: 'advances' (Advance Amounts & Status) vs 'recovery' (Recovery Progress & Balances)
  const [activeTab, setActiveTab] = useState<'advances' | 'recovery'>('advances');

  // Filters State (Only Employee Name, Section, Payment Status, From Date, To Date)
  const [filterWorker, setFilterWorker] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Reset filterSection if user switches
  useEffect(() => {
    setFilterSection('');
  }, [currentUser]);

  // Modals / Drawer State
  const [showNewAdvanceModal, setShowNewAdvanceModal] = useState(false);
  const [selectedLedgerWorkerId, setSelectedLedgerWorkerId] = useState<string | null>(null);
  const [selectedRecoveryAdvance, setSelectedRecoveryAdvance] = useState<AdvanceRow | null>(null);
  const [selectedCloseAdvanceId, setSelectedCloseAdvanceId] = useState<string | null>(null);
  const [selectedVoucherAdvance, setSelectedVoucherAdvance] = useState<AdvanceRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Advance Request Form State (Send to Finance Team)
  const [formSectionId, setFormSectionId] = useState('');
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formRecoveryMethod, setFormRecoveryMethod] = useState<'perDay' | 'percentage' | 'fixedMonthly' | 'manual'>('perDay');
  const [formDailyRecovery, setFormDailyRecovery] = useState('');
  const [formRecoveryPercentage, setFormRecoveryPercentage] = useState('');
  const [formFixedMonthly, setFormFixedMonthly] = useState('');

  // Payout Details
  const [formPayoutMode, setFormPayoutMode] = useState<'upi' | 'bankTransfer' | 'cash'>('upi');
  const [formUpiNumber, setFormUpiNumber] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');

  // Signatures & Photo
  const [workerSignature, setWorkerSignature] = useState<string | null>(null);
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Recovery Form State
  const [recoveryDate, setRecoveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryRemarks, setRecoveryRemarks] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Available sections for current context
  const availableSections = sections.filter((s) => {
    if (currentUser?.role === 'supervisor' && currentUser.assignedSiteId) {
      return s.siteId === currentUser.assignedSiteId;
    }
    return true;
  });

  // Filter workers based on selected Section
  const filteredSectionWorkers = workers.filter((w) => {
    if (w.status !== 'active') return false;
    if (!formSectionId) return true;
    const activeAsg = assignments.find((asg) => asg.workerId === w.id && asg.toDate === null);
    return w.currentSectionId === formSectionId || activeAsg?.sectionId === formSectionId;
  });

  // Selected worker details & automatic balance calculation
  const selectedWorker = workers.find((w) => w.id === formWorkerId);
  const selectedWorkerAdvances = selectedWorker
    ? advances.filter((a) => a.workerId === selectedWorker.id)
    : [];
  const selectedWorkerRecoveries = selectedWorker
    ? recoveries.filter((r) => r.workerId === selectedWorker.id)
    : [];
  const autoOutstandingBalance = calculateAdvanceBalance(selectedWorkerAdvances, selectedWorkerRecoveries);
  const autoTotalAdvances = selectedWorkerAdvances.reduce((sum, a) => sum + a.amount, 0);
  const autoTotalRecovered = selectedWorkerRecoveries.reduce((sum, r) => sum + r.amount, 0);

  // Worker Attendance & Earned Wages calculation
  const workerAttendance = selectedWorker
    ? attendance.filter((a) => a.workerId === selectedWorker.id)
    : [];
  const presentCount = workerAttendance.filter((a) => a.status === 'present').length;
  const halfDayCount = workerAttendance.filter((a) => a.status === 'halfDay').length;
  const workerDailyWage = selectedWorker?.dailyWage || 0;
  const grossEarnedWages = presentCount * workerDailyWage + halfDayCount * (workerDailyWage * 0.5);

  // Payments already settled/paid
  const paidWages = selectedWorker
    ? payments
        .filter((p) => p.workerId === selectedWorker.id && p.status === 'paid')
        .reduce((sum, p) => sum + p.netPay, 0)
    : 0;

  // Employee Current Balance (Earned Wages minus existing advance debt minus already paid wages)
  const employeeCurrentBalance = Math.max(0, grossEarnedWages - autoOutstandingBalance - paidWages);

  // Advance Amount entered and balance comparison flags
  const advanceAmountNum = parseFloat(formAmount) || 0;
  const isBalanceAboveAdvance = advanceAmountNum > 0 && employeeCurrentBalance >= advanceAmountNum;
  const isBalanceBelowAdvance = advanceAmountNum > 0 && employeeCurrentBalance < advanceAmountNum;

  // Manual override state to allow supervisor to configure recovery even when covered
  const [overrideShowRecovery, setOverrideShowRecovery] = useState(false);

  // Reset override whenever worker or amount changes
  useEffect(() => {
    setOverrideShowRecovery(false);
  }, [formWorkerId, formAmount]);

  // Auto fill payment info and photo when worker is selected
  useEffect(() => {
    if (selectedWorker) {
      setFormUpiNumber(selectedWorker.phonePeNumber || '');
      setFormBankName(selectedWorker.bankName || '');
      setFormBankAccount(selectedWorker.bankAccountNo || '');
      setFormBankIfsc(selectedWorker.bankIfsc || '');
      if (selectedWorker.photoUrl) {
        setPhotoUrl(selectedWorker.photoUrl);
      }
      if (selectedWorker.dailyWage) {
        setFormDailyRecovery(String(Math.round(selectedWorker.dailyWage * 0.2)));
      }
    }
  }, [selectedWorker]);

  // Helper to get recovered so far and outstanding balance for a single advance
  const getAdvanceSummary = (adv: Advance) => {
    const advRecoveries = recoveries.filter((r) => r.advanceId === adv.id);
    const recovered = advRecoveries.reduce((sum, r) => sum + r.amount, 0);
    const outstanding = Math.max(0, adv.amount - recovered);
    return { recovered, outstanding };
  };

  const handleResetFilters = () => {
    setFilterWorker('');
    setFilterSection('');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const isFiltered = Boolean(
    filterWorker ||
    filterSection ||
    filterStatus !== 'all' ||
    filterStartDate ||
    filterEndDate
  );

  // 1. Filter advances list (Only Employee Name, Section, Payment Status, From Date, To Date)
  const filteredAdvances: AdvanceRow[] = advances
    .map((adv) => {
      const worker = workers.find((w) => w.id === adv.workerId);
      const assignment = assignments.find((asg) => asg.workerId === adv.workerId && asg.toDate === null);
      const secId = adv.sectionId || assignment?.sectionId || '';
      const section = sections.find((sec) => sec.id === secId);
      const site = sites.find((s) => s.id === (section ? section.siteId : assignment?.siteId));
      const { recovered, outstanding } = getAdvanceSummary(adv);

      return {
        ...adv,
        workerName: worker?.name || 'Unknown Worker',
        siteId: site?.id || assignment?.siteId || '',
        siteName: site?.name || 'Universal Project',
        sectionId: secId,
        sectionName: section?.name || 'General Section',
        recovered,
        outstanding,
      };
    })
    .filter((row) => {
      if (filterStatus !== 'all' && row.status !== filterStatus) return false;
      // Supervisor site isolation maintained in the background
      if (currentUser?.role === 'supervisor' && currentUser.assignedSiteId && row.siteId !== currentUser.assignedSiteId) {
        return false;
      }
      if (filterSection && row.sectionId !== filterSection) return false;
      if (filterStartDate && row.date < filterStartDate) return false;
      if (filterEndDate && row.date > filterEndDate) return false;
      if (
        filterWorker &&
        !row.workerName.toLowerCase().includes(filterWorker.toLowerCase()) &&
        !row.workerId.toLowerCase().includes(filterWorker.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  // KPI Calculations for Tab 1 (Advance Amounts & Status)
  const pendingCount = advances.filter((a) => a.status === 'pending').length;
  const pendingAmount = advances.filter((a) => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);
  const processingCount = advances.filter((a) => a.status === 'processing').length;
  const processingAmount = advances.filter((a) => a.status === 'processing').reduce((sum, a) => sum + a.amount, 0);
  const activeCount = advances.filter((a) => a.status === 'active').length;
  const activeOutstanding = advances.filter((a) => a.status === 'active').reduce((sum, a) => sum + getAdvanceSummary(a).outstanding, 0);
  const closedCount = advances.filter((a) => a.status === 'closed').length;

  // KPI Calculations for Tab 2 (Recovery Progress & Balances)
  const totalAdvancesGranted = advances.reduce((sum, a) => sum + a.amount, 0);
  const allRecoveriesTotal = recoveries.reduce((sum, r) => sum + r.amount, 0);
  const netOutstandingDebt = advances
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + getAdvanceSummary(a).outstanding, 0);
  const overallRecoveryRate = totalAdvancesGranted > 0
    ? Math.min(100, Math.round((allRecoveriesTotal / totalAdvancesGranted) * 100))
    : 0;

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhotoUrl(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Advance Request To Finance Team
  const handleSendToFinanceTeam = () => {
    if (!formSectionId) {
      alert('Please select an operational section.');
      return;
    }
    if (!formWorkerId) {
      alert('Please select an employee name from the dropdown.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid advance amount (₹).');
      return;
    }

    const isCoveredByBalance = employeeCurrentBalance >= amt;
    const shouldAskRecovery = (!isCoveredByBalance || overrideShowRecovery || employeeCurrentBalance === 0);

    let dailyAmt: number | undefined;
    let percentageRate: number | undefined;
    let monthlyAmt: number | undefined;

    if (shouldAskRecovery) {
      if (formRecoveryMethod === 'perDay') {
        dailyAmt = parseFloat(formDailyRecovery);
        if (isNaN(dailyAmt) || dailyAmt <= 0) {
          alert('Please specify a positive daily recovery amount.');
          return;
        }
      } else if (formRecoveryMethod === 'percentage') {
        percentageRate = parseFloat(formRecoveryPercentage);
        if (isNaN(percentageRate) || percentageRate <= 0 || percentageRate > 100) {
          alert('Please specify a recovery percentage between 1% and 100%.');
          return;
        }
      } else if (formRecoveryMethod === 'fixedMonthly') {
        monthlyAmt = parseFloat(formFixedMonthly);
        if (isNaN(monthlyAmt) || monthlyAmt <= 0) {
          alert('Please specify a positive monthly recovery amount.');
          return;
        }
      }
    }

    if (formPayoutMode === 'upi' && !formUpiNumber.trim()) {
      alert('Please enter the employee UPI / PhonePe number or ID.');
      return;
    }
    if (formPayoutMode === 'bankTransfer' && (!formBankAccount.trim() || !formBankIfsc.trim())) {
      alert('Please enter the employee Bank Account Number and IFSC Code.');
      return;
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const fallbackWorkerSig = workerSignature || `Digitally signed by ${selectedWorker?.name || 'Employee'}`;
    const fallbackSupervisorSig = supervisorSignature || `Approved by ${currentUser?.name || 'Section Supervisor'}`;

    addAdvance({
      workerId: formWorkerId,
      sectionId: formSectionId,
      date: formDate,
      amount: amt,
      reason: formReason.trim() || (isCoveredByBalance ? 'Salary Advance (Covered by Current Balance)' : 'Advance Request'),
      recoveryMethod: shouldAskRecovery ? formRecoveryMethod : 'manual',
      dailyRecoveryAmount: shouldAskRecovery && formRecoveryMethod === 'perDay' ? dailyAmt : undefined,
      recoveryPercentage: shouldAskRecovery && formRecoveryMethod === 'percentage' ? percentageRate : undefined,
      fixedMonthlyAmount: shouldAskRecovery && formRecoveryMethod === 'fixedMonthly' ? monthlyAmt : undefined,
      status: 'pending', // Starts as pending finance review
      payoutMode: formPayoutMode,
      upiNumber: formPayoutMode === 'upi' ? formUpiNumber : undefined,
      bankName: formPayoutMode === 'bankTransfer' ? formBankName : undefined,
      bankAccountNumber: formPayoutMode === 'bankTransfer' ? formBankAccount : undefined,
      bankIfsc: formPayoutMode === 'bankTransfer' ? formBankIfsc : undefined,
      workerSignature: fallbackWorkerSig,
      supervisorSignature: fallbackSupervisorSig,
      photoUrl: photoUrl || selectedWorker?.photoUrl,
      sentToFinanceAt: timestamp,
      remarks: formReason.trim()
        ? `${formReason.trim()}${isCoveredByBalance && !overrideShowRecovery ? ` • Direct wage adjustment (Covered by Emply Current Balance ₹${employeeCurrentBalance.toLocaleString()})` : ''}`
        : (isCoveredByBalance && !overrideShowRecovery ? `Direct wage adjustment (Covered by Emply Current Balance ₹${employeeCurrentBalance.toLocaleString()})` : 'Voucher submitted to Finance Team'),
    });

    setToastMessage(`Advance request of ₹${amt.toLocaleString()} sent to Finance Team successfully.`);
    setShowNewAdvanceModal(false);

    // Reset Form
    setFormSectionId('');
    setFormWorkerId('');
    setFormAmount('');
    setFormReason('');
    setFormDailyRecovery('');
    setFormRecoveryPercentage('');
    setFormFixedMonthly('');
    setFormUpiNumber('');
    setFormBankName('');
    setFormBankAccount('');
    setFormBankIfsc('');
    setWorkerSignature(null);
    setSupervisorSignature(null);
    setPhotoUrl(null);
  };

  // Submit Manual Recovery Handler
  const handleSaveRecovery = () => {
    if (!selectedRecoveryAdvance) return;

    const amt = parseFloat(recoveryAmount);
    const { outstanding } = getAdvanceSummary(selectedRecoveryAdvance);

    if (isNaN(amt) || amt <= 0) {
      setRecoveryError('Amount must be a positive number.');
      return;
    }

    if (amt > outstanding) {
      setRecoveryError(`Recovery amount cannot exceed outstanding balance of ₹${outstanding}.`);
      return;
    }

    addManualRecovery({
      advanceId: selectedRecoveryAdvance.id,
      workerId: selectedRecoveryAdvance.workerId,
      date: recoveryDate,
      amount: amt,
      remarks: recoveryRemarks || 'Manual cash repayment',
    });

    setToastMessage(`Manual recovery of ₹${amt} logged successfully.`);
    setSelectedRecoveryAdvance(null);
  };

  // Close Advance Handler
  const handleConfirmClose = () => {
    if (!selectedCloseAdvanceId) return;
    const target = advances.find((a) => a.id === selectedCloseAdvanceId);
    if (!target) return;

    const { outstanding } = getAdvanceSummary(target);

    closeAdvance(
      selectedCloseAdvanceId,
      outstanding > 0 ? `Force closed with ₹${outstanding} unpaid balance.` : 'Closed.'
    );

    setToastMessage(`Advance ${selectedCloseAdvanceId} closed.`);
    setSelectedCloseAdvanceId(null);
  };

  // Tab 1 Columns: Advance Amounts & Payment Status
  const advanceColumns: Column<AdvanceRow>[] = [
    { header: 'S.No', render: (_, idx) => idx + 1 },
    {
      header: 'Advance ID & Date',
      accessor: 'id',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-gray-800">{row.id}</span>
          <span className="block text-[10px] text-gray-400">{row.date}</span>
        </div>
      ),
    },
    {
      header: 'Employee Name & ID',
      render: (row) => {
        const w = workers.find((wk) => wk.id === row.workerId);
        return (
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
              {row.photoUrl || w?.photoUrl ? (
                <img
                  src={row.photoUrl || w?.photoUrl}
                  alt={row.workerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-xs text-gray-900 block">{row.workerName}</span>
              <span className="text-[11px] font-mono text-gray-500">
                {row.siteId ? `${row.siteId}-${row.workerId}` : row.workerId}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Section & Site',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-gray-800 block">{row.sectionName}</span>
          <span className="text-[10px] text-gray-400">{row.siteName}</span>
        </div>
      ),
    },
    {
      header: 'Advance Amount & Reason',
      render: (row) => (
        <div>
          <span className="font-bold text-xs text-gray-900">₹{row.amount.toLocaleString()}</span>
          <span className="block text-[10px] text-gray-500 capitalize truncate max-w-[150px]" title={row.reason}>
            {row.reason || (
              row.recoveryMethod === 'perDay'
                ? `₹${row.dailyRecoveryAmount || 0}/day`
                : row.recoveryMethod === 'percentage'
                ? `${row.recoveryPercentage || 0}%/wage`
                : row.recoveryMethod === 'fixedMonthly'
                ? `₹${row.fixedMonthlyAmount || 0}/mo`
                : 'Manual'
            )}
          </span>
        </div>
      ),
    },
    {
      header: 'Payout Mode & Details',
      render: (row) => (
        <div>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            {row.payoutMode === 'upi' ? (
              <>
                <Wallet className="h-3 w-3 text-emerald-600" />
                <span>UPI / PhonePe</span>
              </>
            ) : row.payoutMode === 'bankTransfer' ? (
              <>
                <CreditCard className="h-3 w-3 text-blue-600" />
                <span>Bank Transfer</span>
              </>
            ) : (
              <>
                <Coins className="h-3 w-3 text-amber-600" />
                <span>Cash Payout</span>
              </>
            )}
          </span>
          {row.upiNumber && (
            <span className="block text-[10px] font-mono text-gray-500 truncate max-w-[130px]" title={row.upiNumber}>
              {row.upiNumber}
            </span>
          )}
          {row.bankAccountNumber && (
            <span className="block text-[10px] font-mono text-gray-500 truncate max-w-[130px]" title={`${row.bankName || ''} A/C: ${row.bankAccountNumber}`}>
              A/C: ...{row.bankAccountNumber.slice(-4)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'status',
      render: (row) => (
        <div className="space-y-0.5">
          <StatusBadge status={row.status} />
          {row.status === 'pending' && row.sentToFinanceAt && (
            <span className="block text-[10px] text-amber-600 font-medium">Sent: {row.sentToFinanceAt}</span>
          )}
          {row.status === 'processing' && row.processedAt && (
            <span className="block text-[10px] text-blue-600 font-medium">Processing: {row.processedAt}</span>
          )}
          {row.status === 'active' && row.disbursedAt && (
            <span className="block text-[10px] text-emerald-600 font-medium">Disbursed: {row.disbursedAt}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Voucher & Finance Actions',
      render: (row) => (
        <div className="flex items-center flex-wrap gap-1.5">
          {/* View Voucher / Signatures */}
          <button
            onClick={() => setSelectedVoucherAdvance(row)}
            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-[11px] rounded font-semibold text-gray-700 inline-flex items-center space-x-1 shadow-2xs"
            title="View Digital Voucher"
          >
            <Eye className="h-3 w-3 text-blue-600" />
            <span>Voucher</span>
          </button>

          {/* Ledger */}
          <button
            onClick={() => setSelectedLedgerWorkerId(row.workerId)}
            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-[11px] rounded font-semibold text-gray-700 inline-flex items-center space-x-1 shadow-2xs"
            title="View Ledger"
          >
            <Receipt className="h-3 w-3 text-gray-500" />
            <span>Ledger</span>
          </button>

          {/* Finance Workflow Action Buttons */}
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  updateAdvancePaymentStatus(row.id, 'processing');
                  setToastMessage(`Advance ${row.id} moved to Processing in Finance.`);
                }}
                className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-[11px] rounded font-bold inline-flex items-center space-x-1"
                title="Finance start processing"
              >
                <Clock className="h-3 w-3" />
                <span>Process</span>
              </button>
              <button
                onClick={() => {
                  updateAdvancePaymentStatus(row.id, 'active');
                  setToastMessage(`Advance ${row.id} approved and disbursed (Active).`);
                }}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded font-bold inline-flex items-center space-x-1 shadow-2xs"
                title="Approve and mark active"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Disburse</span>
              </button>
            </>
          )}

          {row.status === 'processing' && (
            <button
              onClick={() => {
                updateAdvancePaymentStatus(row.id, 'active');
                setToastMessage(`Advance ${row.id} marked as Disbursed & Active.`);
              }}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded font-bold inline-flex items-center space-x-1 shadow-2xs"
              title="Disburse and mark active"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Disburse</span>
            </button>
          )}

          {row.status === 'active' && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Disbursed
            </span>
          )}

          {row.status === 'closed' && (
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Settled
            </span>
          )}
        </div>
      ),
    },
  ];

  // Tab 2 Columns: Recovery Progress Amount & Debt Tracking
  const recoveryColumns: Column<AdvanceRow>[] = [
    { header: 'S.No', render: (_, idx) => idx + 1 },
    {
      header: 'Advance ID & Date',
      accessor: 'id',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-gray-800">{row.id}</span>
          <span className="block text-[10px] text-gray-400">{row.date}</span>
        </div>
      ),
    },
    {
      header: 'Employee Name & ID',
      render: (row) => {
        const w = workers.find((wk) => wk.id === row.workerId);
        return (
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
              {row.photoUrl || w?.photoUrl ? (
                <img
                  src={row.photoUrl || w?.photoUrl}
                  alt={row.workerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-xs text-gray-900 block">{row.workerName}</span>
              <span className="text-[11px] font-mono text-gray-500">
                {row.siteId ? `${row.siteId}-${row.workerId}` : row.workerId}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Section & Site',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-gray-800 block">{row.sectionName}</span>
          <span className="text-[10px] text-gray-400">{row.siteName}</span>
        </div>
      ),
    },
    {
      header: 'Total Advance (₹)',
      render: (row) => (
        <div>
          <span className="font-bold text-xs text-gray-900">₹{row.amount.toLocaleString()}</span>
          <span className="block text-[10px] text-gray-500">
            {row.status === 'pending' || row.status === 'processing' ? 'Pending Payout' : 'Issued Advance'}
          </span>
        </div>
      ),
    },
    {
      header: 'Recovered Amount (₹)',
      render: (row) => {
        const pct = row.amount > 0 ? Math.min(100, Math.round((row.recovered / row.amount) * 100)) : 0;
        return (
          <div>
            <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
              ₹{row.recovered.toLocaleString()}
            </span>
            <span className="block text-[10px] text-gray-500 font-medium mt-0.5">
              {pct}% recovered
            </span>
          </div>
        );
      },
    },
    {
      header: 'Outstanding Debt (₹)',
      render: (row) => (
        <div>
          <span
            className={`font-bold text-xs px-2 py-0.5 rounded-md border inline-block ${
              row.outstanding === 0
                ? 'text-slate-600 bg-slate-100 border-slate-200'
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
          >
            ₹{row.outstanding.toLocaleString()}
          </span>
          <span className="block text-[10px] text-gray-400 mt-0.5">
            {row.outstanding === 0 ? 'Fully Cleared' : 'Remaining Debt'}
          </span>
        </div>
      ),
    },
    {
      header: 'Recovery Rule',
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-gray-800 block">
            {row.recoveryMethod === 'perDay'
              ? `₹${row.dailyRecoveryAmount || 0} / day`
              : row.recoveryMethod === 'percentage'
              ? `${row.recoveryPercentage || 0}% / daily wage`
              : row.recoveryMethod === 'fixedMonthly'
              ? `₹${row.fixedMonthlyAmount || 0} / month`
              : 'Manual Repayment'}
          </span>
          <span className="text-[10px] text-gray-400 capitalize">
            {row.recoveryMethod === 'manual' ? 'Direct cash payback' : 'Paycheck deduction'}
          </span>
        </div>
      ),
    },
    {
      header: 'Recovery Progress',
      render: (row) => {
        if (row.status === 'pending' || row.status === 'processing') {
          return (
            <div className="space-y-1 w-36">
              <span className="text-xs text-gray-400 italic">Pending Disbursement</span>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gray-300 h-full w-0" />
              </div>
            </div>
          );
        }
        const pct = row.amount > 0 ? Math.min(100, Math.round((row.recovered / row.amount) * 100)) : 0;
        return (
          <div className="space-y-1 w-36">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">{pct}%</span>
              <span className="text-[10px] text-gray-500 font-mono">
                ₹{row.recovered.toLocaleString()} / ₹{row.amount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
              <div
                className={`h-full transition-all duration-300 ${
                  pct === 100
                    ? 'bg-emerald-500'
                    : pct >= 50
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Recovery Status',
      render: (row) => {
        if (row.status === 'pending' || row.status === 'processing') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              Pending Payout
            </span>
          );
        }
        if (row.status === 'closed' || row.outstanding === 0) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
              Fully Recovered
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 mr-1 text-amber-600" />
            In Recovery
          </span>
        );
      },
    },
    {
      header: 'Recovery Actions',
      render: (row) => (
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Recovery button if active and outstanding balance exists */}
          {row.status === 'active' && row.outstanding > 0 && (
            <button
              onClick={() => {
                setSelectedRecoveryAdvance(row);
                setRecoveryAmount('');
                setRecoveryRemarks('');
                setRecoveryError(null);
              }}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded font-bold inline-flex items-center space-x-1 shadow-2xs transition-colors"
              title="Log manual recovery repayment"
            >
              <Plus className="h-3 w-3" />
              <span>+ Recovery</span>
            </button>
          )}

          {/* Ledger */}
          <button
            onClick={() => setSelectedLedgerWorkerId(row.workerId)}
            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-[11px] rounded font-semibold text-gray-700 inline-flex items-center space-x-1 shadow-2xs"
            title="View Full Ledger"
          >
            <Receipt className="h-3 w-3 text-gray-500" />
            <span>Ledger</span>
          </button>

          {/* View Voucher */}
          <button
            onClick={() => setSelectedVoucherAdvance(row)}
            className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-[11px] rounded font-semibold text-gray-700 inline-flex items-center space-x-1 shadow-2xs"
            title="View Digital Voucher"
          >
            <Eye className="h-3 w-3 text-blue-600" />
            <span>Voucher</span>
          </button>

          {/* Close button if active */}
          {row.status === 'active' && (
            <button
              onClick={() => setSelectedCloseAdvanceId(row.id)}
              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] rounded font-semibold inline-flex items-center space-x-1"
              title="Force close advance"
            >
              <span>Close</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // Compute Ledger for drawer
  const ledgerWorker = workers.find((w) => w.id === selectedLedgerWorkerId);
  const workerAdvances = advances.filter((a) => a.workerId === selectedLedgerWorkerId);
  const workerRecoveries = recoveries.filter((r) => r.workerId === selectedLedgerWorkerId);

  const ledgerEntries: LedgerEntry[] = [];
  let ledgerId = 1;
  workerAdvances.forEach((adv) => {
    ledgerEntries.push({
      id: `LDG${ledgerId++}`,
      workerId: adv.workerId,
      date: adv.date,
      type: 'advance',
      amount: adv.amount,
      runningBalance: 0,
      remarks: `Advance Issued: ${adv.reason} (Status: ${adv.status})`,
    });
  });
  workerRecoveries.forEach((rec) => {
    ledgerEntries.push({
      id: `LDG${ledgerId++}`,
      workerId: rec.workerId,
      date: rec.date,
      type: 'recovery',
      amount: rec.amount,
      runningBalance: 0,
      remarks: rec.isManual
        ? `Manual Cash Repayment: ${rec.remarks || ''}`
        : `Auto Salary Deduction (Method: ${rec.method})`,
    });
  });

  const sortedLedger = ledgerEntries.sort((a, b) => a.date.localeCompare(b.date));
  let runningBal = 0;
  const computedLedger = sortedLedger.map((entry) => {
    if (entry.type === 'advance') {
      runningBal += entry.amount;
    } else {
      runningBal -= entry.amount;
    }
    runningBal = Math.max(0, runningBal);
    return { ...entry, runningBalance: runningBal };
  });

  const totalAdvanceTaken = workerAdvances.reduce((sum, a) => sum + a.amount, 0);
  const totalRecovered = workerRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const outstandingBal = calculateAdvanceBalance(workerAdvances, workerRecoveries);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Advance Payments and Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Submit advance requests to the Finance Team, track pending & processing payouts, and monitor repayments.
          </p>
        </div>

        <button
          onClick={() => {
            setShowNewAdvanceModal(true);
            if (availableSections.length > 0 && !formSectionId) {
              setFormSectionId(availableSections[0].id);
            }
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Request Advance (Send to Finance)</span>
        </button>
      </div>

      {/* Tab Switcher: Advance Amounts & Status vs Recovery Progress Amount */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-2 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveTab('advances')}
            className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center space-x-2 transition-all ${
              activeTab === 'advances'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <DollarSign className={`h-4 w-4 ${activeTab === 'advances' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Advance Amounts & Status</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'advances'
                  ? 'bg-blue-100 text-blue-700 font-bold'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {filteredAdvances.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center space-x-2 transition-all ${
              activeTab === 'recovery'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <TrendingUp className={`h-4 w-4 ${activeTab === 'recovery' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Recovery Progress Amount</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'recovery'
                  ? 'bg-emerald-100 text-emerald-700 font-bold'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {filteredAdvances.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2 flex items-center space-x-1.5">
          {activeTab === 'advances' ? (
            <span>Tracking advance requests, payout channels (UPI/Bank/Cash), and Finance approvals</span>
          ) : (
            <span>Tracking repayment amounts, progress bars, debt collection, and outstanding balances</span>
          )}
        </div>
      </div>

      {/* KPI Stats Cards - Dynamically rendered for the active tab */}
      {activeTab === 'advances' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Pending Finance Review"
            value={`${pendingCount} Requests`}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            description={`₹${pendingAmount.toLocaleString()} awaiting approval`}
          />
          <StatCard
            title="Processing in Finance"
            value={`${processingCount} Requests`}
            icon={<RefreshCw className="h-5 w-5 text-blue-600" />}
            description={`₹${processingAmount.toLocaleString()} batch transfer`}
          />
          <StatCard
            title="Active & Disbursed"
            value={`${activeCount} Advances`}
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            description={`₹${activeOutstanding.toLocaleString()} unpaid balance`}
          />
          <StatCard
            title="Fully Closed / Paid"
            value={`${closedCount} Advances`}
            icon={<CheckCircle2 className="h-5 w-5 text-slate-600" />}
            description="100% recovered loans"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Advances Granted"
            value={`₹${totalAdvancesGranted.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            description={`${advances.length} advances approved & issued`}
          />
          <StatCard
            title="Total Recovered Amount"
            value={`₹${allRecoveriesTotal.toLocaleString()}`}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            description={`${recoveries.length} deduction & cash repayments`}
          />
          <StatCard
            title="Net Outstanding Debt"
            value={`₹${netOutstandingDebt.toLocaleString()}`}
            icon={<Scale className="h-5 w-5 text-amber-600" />}
            description={`${activeCount} active loans being repaid`}
          />
          <StatCard
            title="Overall Recovery Rate"
            value={`${overallRecoveryRate}%`}
            icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
            description={`₹${allRecoveriesTotal.toLocaleString()} of ₹${totalAdvancesGranted.toLocaleString()}`}
          />
        </div>
      )}

      {/* =========================================================================
          CLEAR VIEW ONLY FILTERS TAB
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Header of Filters Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Clear View Filters
                </h3>
                {isFiltered && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                    Filtered ({filteredAdvances.length} of {advances.length})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'advances'
                  ? 'Filter advance payment records by employee name, section, payment status, and date range.'
                  : 'Filter recovery progress records by employee name, section, status, and date range.'}
              </p>
            </div>
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="self-start sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear View / Reset Filters</span>
            </button>
          )}
        </div>

        {/* Quick Payment Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex-shrink-0">
            Status Tab:
          </span>
          {[
            { id: 'all', label: 'All Records', count: advances.length },
            { id: 'pending', label: 'Pending Finance', count: pendingCount },
            { id: 'processing', label: 'Processing Payments', count: processingCount },
            { id: 'active', label: 'Active (Disbursed)', count: activeCount },
            { id: 'closed', label: 'Closed (Paid)', count: closedCount },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center space-x-1.5 flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 5 Filter Controls: Employee Name, Section, Payment Status, From Date, To Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* 1. Employee Name ("Emply Name") */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Employee Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Emply Name or ID..."
                value={filterWorker}
                onChange={(e) => setFilterWorker(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
              {filterWorker && (
                <button
                  type="button"
                  onClick={() => setFilterWorker('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Section */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Section
            </label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
            >
              <option value="">All Sections</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Payment Status */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Payment Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
            >
              <option value="all">All Records</option>
              <option value="pending">Pending Finance</option>
              <option value="processing">Processing Payments</option>
              <option value="active">Active (Disbursed)</option>
              <option value="closed">Closed (Fully Paid)</option>
            </select>
          </div>

          {/* 4. From Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              From Date
            </label>
            <DatePicker
              label=""
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-9 w-full"
            />
          </div>

          {/* 5. To Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              To Date
            </label>
            <DatePicker
              label=""
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* Advance Payments or Recovery Progress Table */}
      <DataTable
        columns={activeTab === 'advances' ? advanceColumns : recoveryColumns}
        data={filteredAdvances}
        emptyTitle={
          activeTab === 'advances'
            ? 'No advance payments found'
            : 'No recovery records found'
        }
        emptyDescription={
          activeTab === 'advances'
            ? 'There are no advance payment records matching your filter criteria.'
            : 'There are no recovery progress records matching your filter criteria.'
        }
      />

      {/* =========================================================================
          NEW ADVANCE REQUEST MODAL (SEND TO FINANCE TEAM)
         ========================================================================= */}
      <Modal
        isOpen={showNewAdvanceModal}
        onClose={() => setShowNewAdvanceModal(false)}
        title="Request Advance Payment"
        subtitle="Select section and employee to auto-calculate balance, attach payout details & signatures, and submit to Finance Team."
        icon={<DollarSign className="h-5 w-5 text-blue-600" />}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
          {/* Section & Employee Select Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Select Section"
              value={formSectionId}
              onChange={(e) => {
                setFormSectionId(e.target.value);
                setFormWorkerId('');
              }}
              options={[
                { value: '', label: 'Select Section...' },
                ...availableSections.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.code})`,
                })),
              ]}
              required
            />

            <Select
              label="Select Employee Name"
              value={formWorkerId}
              onChange={(e) => setFormWorkerId(e.target.value)}
              disabled={!formSectionId}
              options={[
                { value: '', label: formSectionId ? 'Select Employee in Section...' : 'Select section first...' },
                ...filteredSectionWorkers.map((w) => ({
                  value: w.id,
                  label: `${w.name} (ID: ${w.id}) - Wage: ₹${w.dailyWage}/day`,
                })),
              ]}
              required
            />
          </div>

          {/* AUTOMATIC EMPLOYEE FINANCIAL BALANCE CARD */}
          {selectedWorker && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-slate-700 border-2 border-slate-500 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {photoUrl || selectedWorker.photoUrl ? (
                      <img
                        src={photoUrl || selectedWorker.photoUrl}
                        alt={selectedWorker.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{selectedWorker.name}</h4>
                    <p className="text-[11px] text-slate-300 font-mono">
                      Serial: {selectedWorker.currentSiteId || 'SITE'}-{selectedWorker.id} • Wage: ₹{selectedWorker.dailyWage}/day
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Emply Current Balance
                  </span>
                  <span
                    className={`text-xl font-black ${
                      employeeCurrentBalance > 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    ₹ {employeeCurrentBalance.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Available Earned Wage
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-700/70 text-[11px]">
                <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Earned Wages</span>
                  <span className="font-bold text-white text-xs">
                    ₹ {grossEarnedWages.toLocaleString()}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    {presentCount}P • {halfDayCount}H days
                  </span>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Advance Debt</span>
                  <span className="font-bold text-amber-400 text-xs">
                    ₹ {autoOutstandingBalance.toLocaleString()}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    Taken: ₹{autoTotalAdvances.toLocaleString()} • Rec: ₹{autoTotalRecovered.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Balance Status</span>
                  <span className={`font-bold text-xs ${employeeCurrentBalance > 0 ? 'text-teal-300' : 'text-amber-300'}`}>
                    {employeeCurrentBalance > 0 ? 'Wage Credit' : 'Zero Balance'}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    {employeeCurrentBalance > 0 ? 'Ready for advance' : 'Needs recovery'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advance Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <DatePicker
              label="Request Date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />

            <Input
              label="Advance Amount (₹)"
              type="number"
              placeholder="e.g. 3000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />
          </div>

          {/* Live Balance Coverage & Recovery Status Indicator */}
          {selectedWorker && advanceAmountNum > 0 && (
            <div>
              {/* Emply Current Balance Above of Advance Payment -> Don't Show Recovery Option */}
              {isBalanceAboveAdvance && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3">
                  <div className="p-1 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-bold text-xs text-emerald-900">
                        100% Covered by Emply Current Balance (₹{employeeCurrentBalance.toLocaleString()})
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full self-start">
                        Recovery Option Hidden
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                      Employee Current Balance (₹{employeeCurrentBalance.toLocaleString()}) is <strong>above</strong> the advance payment (₹{advanceAmountNum.toLocaleString()}).
                      Paycheck recovery rule is <strong>not required</strong> — this advance will be adjusted directly against the worker's current accrued wages at month-end.
                    </p>
                    {!overrideShowRecovery ? (
                      <button
                        type="button"
                        onClick={() => setOverrideShowRecovery(true)}
                        className="text-[11px] text-emerald-800 font-semibold underline hover:text-emerald-900 mt-1.5 block cursor-pointer"
                      >
                        + Show / configure paycheck recovery rules anyway
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOverrideShowRecovery(false)}
                        className="text-[11px] text-slate-500 font-semibold underline hover:text-slate-700 mt-1.5 block cursor-pointer"
                      >
                        ← Hide recovery options (use direct balance adjustment)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Emply Current Balance Below of Advance Payment -> Ask Paycheck Recovery Rule is Active */}
              {isBalanceBelowAdvance && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3">
                  <div className="p-1 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-bold text-xs text-amber-900">
                        Advance Exceeds Current Balance (Deficit: ₹{(advanceAmountNum - employeeCurrentBalance).toLocaleString()})
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full self-start">
                        Paycheck Recovery Active
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                      Employee Current Balance (₹{employeeCurrentBalance.toLocaleString()}) is <strong>below</strong> the advance payment (₹{advanceAmountNum.toLocaleString()}).
                      Please select a paycheck recovery rule below to recover the deficit from upcoming daily wages.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedWorker && advanceAmountNum === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
              <span>
                Employee Current Balance: <strong className="text-slate-900">₹{employeeCurrentBalance.toLocaleString()}</strong>
              </span>
              <span className="text-[11px] text-slate-500">
                {employeeCurrentBalance > 0 ? 'Enter advance amount to evaluate balance coverage' : 'Advance will require recovery rule'}
              </span>
            </div>
          )}

          {/* Paycheck Recovery Rule: Shown if Balance is Below Advance, or if Balance is 0, or if User Chose Override */}
          {((isBalanceBelowAdvance) || (advanceAmountNum === 0 && employeeCurrentBalance === 0) || overrideShowRecovery) && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Paycheck Recovery Rule
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['perDay', 'percentage', 'fixedMonthly', 'manual'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormRecoveryMethod(method)}
                      className={`py-1.5 px-2 border rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        formRecoveryMethod === method
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {method === 'perDay'
                        ? 'Per Day Deduction'
                        : method === 'fixedMonthly'
                        ? 'Monthly Fixed'
                        : method === 'percentage'
                        ? '% Wage Cut'
                        : 'Manual Recovery'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Recovery Inputs */}
              {formRecoveryMethod === 'perDay' && (
                <Input
                  label="Daily Recovery Amount (₹ deducted from daily wage)"
                  type="number"
                  placeholder="e.g. 100"
                  value={formDailyRecovery}
                  onChange={(e) => setFormDailyRecovery(e.target.value)}
                />
              )}

              {formRecoveryMethod === 'percentage' && (
                <Input
                  label="Salary Deduction Percentage (%)"
                  type="number"
                  placeholder="e.g. 15"
                  value={formRecoveryPercentage}
                  onChange={(e) => setFormRecoveryPercentage(e.target.value)}
                />
              )}

              {formRecoveryMethod === 'fixedMonthly' && (
                <Input
                  label="Monthly Recovery Deduction (₹)"
                  type="number"
                  placeholder="e.g. 1000"
                  value={formFixedMonthly}
                  onChange={(e) => setFormFixedMonthly(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Payout Mode (UPI vs Bank vs Cash) */}
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
              Payout Method & Account Information
            </label>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFormPayoutMode('upi')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  formPayoutMode === 'upi'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Wallet className="h-4 w-4" />
                <span>UPI / PhonePe</span>
              </button>

              <button
                type="button"
                onClick={() => setFormPayoutMode('bankTransfer')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  formPayoutMode === 'bankTransfer'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setFormPayoutMode('cash')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  formPayoutMode === 'cash'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Coins className="h-4 w-4" />
                <span>Cash Payout</span>
              </button>
            </div>

            {/* UPI Details Input */}
            {formPayoutMode === 'upi' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <Input
                  label="Employee PhonePe / UPI Number or VPA"
                  placeholder="e.g. 9876543210@ybl or 9876543210"
                  value={formUpiNumber}
                  onChange={(e) => setFormUpiNumber(e.target.value)}
                  required
                />
                <p className="text-[11px] text-gray-500">
                  {selectedWorker?.phonePeNumber
                    ? `✓ Auto-filled from ${selectedWorker.name}'s registered profile.`
                    : 'Enter the worker UPI address or PhonePe mobile number for direct credit.'}
                </p>
              </div>
            )}

            {/* Bank Transfer Details Inputs */}
            {formPayoutMode === 'bankTransfer' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Bank Name"
                    placeholder="e.g. State Bank of India"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                  />
                  <Input
                    label="IFSC Code"
                    placeholder="e.g. SBIN0001234"
                    value={formBankIfsc}
                    onChange={(e) => setFormBankIfsc(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <Input
                  label="Bank Account Number"
                  placeholder="e.g. 10293847561"
                  value={formBankAccount}
                  onChange={(e) => setFormBankAccount(e.target.value)}
                  required
                />
                <p className="text-[11px] text-gray-500">
                  {selectedWorker?.bankAccountNo
                    ? `✓ Auto-filled from ${selectedWorker.name}'s registered bank profile.`
                    : 'Verify account number and IFSC code before sending to Finance Team.'}
                </p>
              </div>
            )}

            {/* Cash Payout Details */}
            {formPayoutMode === 'cash' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <p className="font-semibold">Cash Disbursement Protocol:</p>
                <p className="text-[11px] mt-0.5 text-amber-700">
                  Cash advance will be issued directly from site cash reserve and authenticated with employee signature below.
                </p>
              </div>
            )}
          </div>

          {/* Remarks ("Remarker") */}
          <div className="space-y-1">
            <Input
              label="Remarks / Reason for Advance (Remarker)"
              placeholder="e.g. Medical emergency, urgent house repair, family occasion"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              required
            />
          </div>

          {/* Photo Proof Upload */}
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
              Verification Photo Proof
            </label>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Proof" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center space-x-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Photo Proof</span>
                  </button>
                  {selectedWorker?.photoUrl && !photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(selectedWorker.photoUrl || null)}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100"
                    >
                      Use Profile Photo
                    </button>
                  )}
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Upload worker face or acknowledgment slip photo for Finance audit verification.
                </p>
              </div>
            </div>
          </div>

          {/* SIGNATURES: Worker Signature & Supervisor Signature */}
          <div className="border-t border-gray-200 pt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee Signature */}
              <SignaturePad
                label="Employee Signature (Signacher)"
                signeeName={selectedWorker?.name || 'Worker'}
                roleDescription="Applicant Acknowledgment"
                value={workerSignature}
                onChange={setWorkerSignature}
                required
              />

              {/* Supervisor Signature */}
              <SignaturePad
                label="Supervisor Signature (Supervisor Signacher)"
                signeeName={currentUser?.name || 'Site Supervisor'}
                roleDescription="Verification & Authorization"
                value={supervisorSignature}
                onChange={setSupervisorSignature}
                required
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={() => setShowNewAdvanceModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendToFinanceTeam}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-md transition-all active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span>Send to Finance Team</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          DIGITAL VOUCHER INSPECTION MODAL
         ========================================================================= */}
      <Modal
        isOpen={!!selectedVoucherAdvance}
        onClose={() => setSelectedVoucherAdvance(null)}
        title={`Advance Voucher: ${selectedVoucherAdvance?.id || ''}`}
        subtitle="Digital disbursement slip with authorized employee and supervisor signatures."
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        size="lg"
      >
        {selectedVoucherAdvance && (
          <div className="space-y-4 text-xs">
            {/* Voucher Header Slip */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Universal Workforce Financial Voucher
                  </span>
                  <h3 className="text-base font-black text-white">{selectedVoucherAdvance.id}</h3>
                  <p className="text-slate-300 text-xs">
                    {selectedVoucherAdvance.sectionName} • {selectedVoucherAdvance.siteName}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={selectedVoucherAdvance.status} />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Date: {selectedVoucherAdvance.date}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-xs">
                <span>Requested Advance Principal:</span>
                <span className="text-lg font-black text-amber-400">
                  ₹ {selectedVoucherAdvance.amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Employee Details & Proof Photo */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full border border-gray-300 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                  {selectedVoucherAdvance.photoUrl ? (
                    <img
                      src={selectedVoucherAdvance.photoUrl}
                      alt={selectedVoucherAdvance.workerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedVoucherAdvance.workerName}</h4>
                  <p className="text-gray-500 font-mono text-[11px]">Worker ID: {selectedVoucherAdvance.workerId}</p>
                  <p className="text-gray-600 mt-0.5">
                    <strong>Remarks:</strong> {selectedVoucherAdvance.reason || selectedVoucherAdvance.remarks || 'Cash loan'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payout & Recovery Terms */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Payout Method</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {selectedVoucherAdvance.payoutMode === 'upi'
                    ? `UPI: ${selectedVoucherAdvance.upiNumber || 'Registered UPI'}`
                    : selectedVoucherAdvance.payoutMode === 'bankTransfer'
                    ? `${selectedVoucherAdvance.bankName || 'Bank'} A/C: ${selectedVoucherAdvance.bankAccountNumber || 'N/A'} (IFSC: ${selectedVoucherAdvance.bankIfsc || 'N/A'})`
                    : 'Direct Cash Handover'}
                </span>
              </div>

              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Recovery Method</span>
                <span className="font-semibold text-gray-900">
                  {selectedVoucherAdvance.recoveryMethod === 'perDay'
                    ? `Per Day deduction: ₹${selectedVoucherAdvance.dailyRecoveryAmount || 0}`
                    : selectedVoucherAdvance.recoveryMethod === 'percentage'
                    ? `${selectedVoucherAdvance.recoveryPercentage || 0}% from daily wage`
                    : selectedVoucherAdvance.recoveryMethod === 'fixedMonthly'
                    ? `₹${selectedVoucherAdvance.fixedMonthlyAmount || 0} monthly`
                    : 'Manual repayment'}
                </span>
              </div>
            </div>

            {/* Signatures Display */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Employee Signature
                </span>
                <div className="h-16 flex items-center justify-center border-b border-dashed border-gray-200">
                  {selectedVoucherAdvance.workerSignature?.startsWith('data:image') ? (
                    <img
                      src={selectedVoucherAdvance.workerSignature}
                      alt="Worker Signature"
                      className="max-h-14 object-contain"
                    />
                  ) : (
                    <span className="font-serif italic text-blue-900 font-bold text-base">
                      {selectedVoucherAdvance.workerName}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 block pt-1">Verified Applicant</span>
              </div>

              <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-1 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Supervisor Signature
                </span>
                <div className="h-16 flex items-center justify-center border-b border-dashed border-gray-200">
                  {selectedVoucherAdvance.supervisorSignature?.startsWith('data:image') ? (
                    <img
                      src={selectedVoucherAdvance.supervisorSignature}
                      alt="Supervisor Signature"
                      className="max-h-14 object-contain"
                    />
                  ) : (
                    <span className="font-serif italic text-indigo-900 font-bold text-base">
                      Authorized Supervisor
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 block pt-1">Site Authorization Seal</span>
              </div>
            </div>

            {/* Finance Actions in Voucher Modal */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <div className="flex items-center space-x-2">
                {selectedVoucherAdvance.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateAdvancePaymentStatus(selectedVoucherAdvance.id, 'processing');
                      setSelectedVoucherAdvance({ ...selectedVoucherAdvance, status: 'processing' });
                      setToastMessage(`Advance ${selectedVoucherAdvance.id} moved to processing.`);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Move to Processing</span>
                  </button>
                )}

                {(selectedVoucherAdvance.status === 'pending' || selectedVoucherAdvance.status === 'processing') && (
                  <button
                    onClick={() => {
                      updateAdvancePaymentStatus(selectedVoucherAdvance.id, 'active');
                      setSelectedVoucherAdvance({ ...selectedVoucherAdvance, status: 'active' });
                      setToastMessage(`Advance ${selectedVoucherAdvance.id} disbursed and active.`);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve & Disburse</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedVoucherAdvance(null)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 font-semibold text-xs hover:bg-gray-50"
              >
                Close Voucher
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Recovery Modal */}
      <Modal
        isOpen={!!selectedRecoveryAdvance}
        onClose={() => setSelectedRecoveryAdvance(null)}
        title={`Log Cash Recovery: ${selectedRecoveryAdvance?.workerName || ''}`}
        subtitle="Record manual cash repayment towards outstanding worker advance balance."
        icon={<Coins className="h-5 w-5" />}
        size="md"
      >
        {selectedRecoveryAdvance && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs grid grid-cols-2 gap-2 text-gray-600">
              <div>
                <span>Advance ID:</span> <span className="font-bold text-gray-900">{selectedRecoveryAdvance.id}</span>
              </div>
              <div>
                <span>Advance Principal:</span> <span className="font-bold text-gray-900">₹{selectedRecoveryAdvance.amount}</span>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-1 mt-1 font-semibold text-amber-700 flex justify-between">
                <span>Current Outstanding:</span>
                <span>₹{getAdvanceSummary(selectedRecoveryAdvance).outstanding}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Recovery Date" value={recoveryDate} onChange={(e) => setRecoveryDate(e.target.value)} />
              <Input
                label="Amount (₹)"
                type="number"
                placeholder="e.g. 500"
                value={recoveryAmount}
                onChange={(e) => {
                  setRecoveryAmount(e.target.value);
                  setRecoveryError(null);
                }}
                error={recoveryError || undefined}
              />
            </div>

            <Input
              label="Remarks / Reference"
              placeholder="e.g. Repaid cash directly to manager"
              value={recoveryRemarks}
              onChange={(e) => setRecoveryRemarks(e.target.value)}
            />

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setSelectedRecoveryAdvance(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecovery}
                className="px-4 py-2 bg-gray-950 text-white rounded-md text-xs font-semibold hover:bg-gray-900 transition-colors"
              >
                Save Recovery
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ledger Drawer */}
      <Drawer
        isOpen={!!selectedLedgerWorkerId}
        onClose={() => setSelectedLedgerWorkerId(null)}
        title={`Financial Ledger: ${ledgerWorker?.name || ''}`}
      >
        <div className="space-y-6">
          <div className="bg-gray-950 text-white p-4 rounded-xl shadow-md space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <Landmark className="h-4 w-4" />
              <span>Outstanding Advance Balance</span>
            </div>
            <div className="text-3xl font-black text-white">
              ₹ {outstandingBal.toLocaleString()}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-3 text-xs text-gray-300">
              <div>
                <span className="block text-gray-500 font-bold uppercase tracking-wider text-[9px]">Total Borrowed</span>
                <span className="font-bold text-sm text-white">₹{totalAdvanceTaken.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-gray-500 font-bold uppercase tracking-wider text-[9px]">Total Recovered</span>
                <span className="font-bold text-sm text-green-400">₹{totalRecovered.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Transaction Ledger</h3>

            {computedLedger.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs italic">
                No cash advances issued.
              </div>
            ) : (
              <div className="space-y-3.5">
                {computedLedger.map((entry) => (
                  <div key={entry.id} className="p-3.5 border border-gray-200 rounded-lg space-y-2 bg-white shadow-sm">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span className="font-bold uppercase">Log: {entry.id}</span>
                      <span>{entry.date}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-gray-500 capitalize">Type:</span>
                        <StatusBadge status={entry.type === 'advance' ? 'warning' : 'present'} />
                      </div>
                      <div className="font-black text-sm">
                        {entry.type === 'advance' ? '+' : '-'} ₹{entry.amount}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed font-medium">{entry.remarks}</p>

                    <div className="text-[10px] text-gray-500 font-bold border-t border-gray-100 pt-2 flex justify-between items-center mt-1">
                      <span className="inline-flex items-center text-gray-400 uppercase tracking-wide">
                        <Scale className="h-3 w-3 mr-1" /> Running Debt
                      </span>
                      <span className="font-black text-gray-900 text-xs">₹{entry.runningBalance}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Force Close Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!selectedCloseAdvanceId}
        onClose={() => setSelectedCloseAdvanceId(null)}
        onConfirm={handleConfirmClose}
        title="Close Advance Record"
        message="Are you sure you want to close this advance? If there is an outstanding balance remaining, it will be force closed and no further automatic paycheck recoveries will be processed."
        confirmText="Close Record"
        cancelText="Cancel"
      />

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Advances;
