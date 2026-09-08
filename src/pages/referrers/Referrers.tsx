import React, { useState, useMemo } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Toast } from '../../components/common/Toast';
import { calculateCommission } from '../../utils/calculations/calculateCommission';
import {
  Coins,
  Plus,
  Filter,
  RotateCcw,
  CreditCard,
  Building2,
  Layers,
  CheckCircle2,
  Clock,
  Wallet,
  Send,
  UserCheck,
  Search,
  ReceiptText,
  User,
  Briefcase,
  Sparkles,
  AlertTriangle,
  Users,
  Check,
} from 'lucide-react';

interface CommissionLedgerRow {
  workerId: string;
  workerName: string;
  workerSerial: string;
  workerMobile: string;
  referrerId: string;
  referrerName: string;
  referrerMobile: string;
  referrerType: 'agency' | 'seniorEmployee';
  referrerWorkerId?: string;
  referrerDesignation?: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  commissionType: 'perDay' | 'percentage' | 'fixedMonthly';
  commissionRate: number;
  dailyWage: number;
  presentDays: number;
  halfDays: number;
  commissionAmount: number;
  usedAmount: number;
  requestAmount: number;
  closingBalance: number;
  paymentStatus: 'paid' | 'processing' | 'pending' | 'partially_paid' | 'unpaid';
}

export const Referrers: React.FC = () => {
  const {
    referrers,
    addReferrer,
    workers,
    sites,
    sections,
    attendance,
    settings,
    commissionRequests,
    addBulkCommissionPaymentRequests,
    updateCommissionPaymentRequestStatus,
  } = useAttendanceContext();

  // Active View Tab: 'ledger' | 'requests' | 'agencies'
  const [activeTab, setActiveTab] = useState<'ledger' | 'requests' | 'agencies'>('ledger');

  // Clear View Filters State
  const [referrerCategoryFilter, setReferrerCategoryFilter] = useState<'all' | 'agency' | 'seniorEmployee'>('all');
  const [selectedReferrer, setSelectedReferrer] = useState<string>('');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0); // last day of current month
    return d.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Feedback
  const [showAddAgencyModal, setShowAddAgencyModal] = useState(false);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Agency / Senior Employee Registration Form State
  const [regType, setRegType] = useState<'agency' | 'seniorEmployee'>('seniorEmployee');
  const [agencyName, setAgencyName] = useState('');
  const [agencyMobile, setAgencyMobile] = useState('');
  const [agencyStatus, setAgencyStatus] = useState<'active' | 'inactive'>('active');
  const [selectedSeniorWorkerId, setSelectedSeniorWorkerId] = useState('');
  const [seniorDesignation, setSeniorDesignation] = useState('Senior Mason / Mestri');
  const [regRemarks, setRegRemarks] = useState('');

  // Multi-Worker Payment Request Modal Form State
  const [reqReferrerId, setReqReferrerId] = useState('');
  // Map of workerId -> entered request amount string
  const [workerRequestAmounts, setWorkerRequestAmounts] = useState<Record<string, string>>({});
  // Map of workerId -> validation error string (if entered > closing balance)
  const [workerRequestErrors, setWorkerRequestErrors] = useState<Record<string, string>>({});

  const [reqPayoutMode, setReqPayoutMode] = useState<'upi' | 'bankTransfer' | 'cash'>('upi');
  const [reqUpiNumber, setReqUpiNumber] = useState('');
  const [reqBankName, setReqBankName] = useState('');
  const [reqBankAccountNumber, setReqBankAccountNumber] = useState('');
  const [reqBankIfsc, setReqBankIfsc] = useState('');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [reqRemarks, setReqRemarks] = useState('');
  const [reqError, setReqError] = useState('');

  // Directory filter within the Reference Persons tab
  const [directoryTypeFilter, setDirectoryTypeFilter] = useState<'all' | 'agency' | 'seniorEmployee'>('all');

  // Company workers who can act as senior employee referrers
  const companyWorkers = useMemo(() => {
    return workers.filter((w) => w.workerType === 'company');
  }, [workers]);

  // Outside workers list (personnel who can be referred)
  const outsideWorkers = useMemo(() => {
    return workers.filter((w) => w.workerType === 'outside' || Boolean(w.referrerId));
  }, [workers]);

  // Compute Commission Ledger Data for outside workers
  const ledgerData: CommissionLedgerRow[] = useMemo(() => {
    return outsideWorkers.map((w, idx) => {
      const ref = referrers.find((r) => r.id === w.referrerId);
      const site = sites.find((s) => s.id === w.currentSiteId);
      const section = sections.find((sec) => sec.id === w.currentSectionId);

      // Attendance records within selected date range
      const workerAtt = attendance.filter((att) => {
        if (att.workerId !== w.id) return false;
        if (fromDate && att.date < fromDate) return false;
        if (toDate && att.date > toDate) return false;
        return true;
      });

      let presentDays = 0;
      let halfDays = 0;
      let earnedCommission = 0;

      workerAtt.forEach((att) => {
        if (att.status === 'present') {
          presentDays++;
          if (w.commissionType === 'percentage') {
            earnedCommission += (w.dailyWage * (w.commissionRate / 100)) * settings.commissionPresentMultiplier;
          } else if (w.commissionType === 'fixedMonthly') {
            earnedCommission += Math.round(w.commissionRate / 26);
          } else {
            earnedCommission += calculateCommission('present', w.commissionRate, settings);
          }
        } else if (att.status === 'halfDay') {
          halfDays++;
          if (w.commissionType === 'percentage') {
            earnedCommission += (w.dailyWage * (w.commissionRate / 100)) * settings.commissionHalfDayMultiplier;
          } else if (w.commissionType === 'fixedMonthly') {
            earnedCommission += Math.round(w.commissionRate / 52);
          } else {
            earnedCommission += calculateCommission('halfDay', w.commissionRate, settings);
          }
        }
      });

      // Existing requests for this worker
      const workerReqs = commissionRequests.filter((r) => r.workerId === w.id);
      const usedAmount = workerReqs
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0);

      const requestAmount = workerReqs
        .filter((r) => r.status === 'pending' || r.status === 'processing')
        .reduce((sum, r) => sum + r.amount, 0);

      const closingBalance = Math.max(0, Math.round(earnedCommission - usedAmount - requestAmount));

      let paymentStatus: CommissionLedgerRow['paymentStatus'] = 'unpaid';
      if (earnedCommission > 0) {
        if (closingBalance === 0 && usedAmount > 0 && requestAmount === 0) {
          paymentStatus = 'paid';
        } else if (requestAmount > 0) {
          const hasProcessing = workerReqs.some((r) => r.status === 'processing');
          paymentStatus = hasProcessing ? 'processing' : 'pending';
        } else if (usedAmount > 0 && closingBalance > 0) {
          paymentStatus = 'partially_paid';
        } else {
          paymentStatus = 'pending';
        }
      }

      const referrerType: 'agency' | 'seniorEmployee' = ref?.type || 'agency';

      return {
        workerId: w.id,
        workerName: w.name,
        workerSerial: String(idx + 1).padStart(3, '0'),
        workerMobile: w.mobile,
        referrerId: w.referrerId || 'REF001',
        referrerName: ref ? ref.name : 'Direct / Unassigned',
        referrerMobile: ref ? ref.mobile : '-',
        referrerType,
        referrerWorkerId: ref?.workerId,
        referrerDesignation: ref?.designation,
        siteId: w.currentSiteId,
        siteCode: site?.code || site?.id || 'S001',
        siteName: site?.name || 'Main Site',
        sectionId: w.currentSectionId,
        sectionCode: section?.code || section?.id || 'SEC001',
        sectionName: section?.name || 'Operations',
        commissionType: w.commissionType,
        commissionRate: w.commissionRate,
        dailyWage: w.dailyWage,
        presentDays,
        halfDays,
        commissionAmount: Math.round(earnedCommission),
        usedAmount,
        requestAmount,
        closingBalance,
        paymentStatus,
      };
    });
  }, [outsideWorkers, referrers, sites, sections, attendance, fromDate, toDate, settings, commissionRequests]);

  // Filtered Ledger Rows
  const filteredLedger = useMemo(() => {
    return ledgerData.filter((row) => {
      // Category filter (Agency vs Senior Employee)
      if (referrerCategoryFilter !== 'all' && row.referrerType !== referrerCategoryFilter) return false;
      // Referrer filter
      if (selectedReferrer && row.referrerId !== selectedReferrer) return false;
      // Worker filter
      if (selectedWorker && row.workerId !== selectedWorker) return false;
      // Status pill filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && row.paymentStatus !== 'pending') return false;
        if (statusFilter === 'processing' && row.paymentStatus !== 'processing') return false;
        if (statusFilter === 'partially_paid' && row.paymentStatus !== 'partially_paid') return false;
        if (statusFilter === 'paid' && row.paymentStatus !== 'paid') return false;
      }
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          row.workerName.toLowerCase().includes(query) ||
          row.workerId.toLowerCase().includes(query) ||
          row.referrerName.toLowerCase().includes(query) ||
          row.referrerId.toLowerCase().includes(query) ||
          (row.referrerWorkerId && row.referrerWorkerId.toLowerCase().includes(query)) ||
          (row.referrerDesignation && row.referrerDesignation.toLowerCase().includes(query)) ||
          row.siteName.toLowerCase().includes(query) ||
          row.siteCode.toLowerCase().includes(query) ||
          row.sectionName.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [ledgerData, referrerCategoryFilter, selectedReferrer, selectedWorker, statusFilter, searchQuery]);

  // Active Filters Count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (referrerCategoryFilter !== 'all') count++;
    if (selectedReferrer) count++;
    if (selectedWorker) count++;
    if (fromDate || toDate) count++; // any date filter active
    if (statusFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [referrerCategoryFilter, selectedReferrer, selectedWorker, fromDate, toDate, statusFilter, searchQuery]);

  // Reset Filters
  const handleResetFilters = () => {
    setReferrerCategoryFilter('all');
    setSelectedReferrer('');
    setSelectedWorker('');
    const fd = new Date(); fd.setDate(1);
    const td = new Date(); td.setMonth(td.getMonth() + 1, 0);
    setFromDate(fd.toISOString().split('T')[0]);
    setToDate(td.toISOString().split('T')[0]);
    setStatusFilter('all');
    setSearchQuery('');
  };

  // KPIs
  const totals = useMemo(() => {
    return filteredLedger.reduce(
      (acc, item) => {
        acc.commission += item.commissionAmount;
        acc.used += item.usedAmount;
        acc.requested += item.requestAmount;
        acc.closing += item.closingBalance;
        if (item.referrerType === 'seniorEmployee') {
          acc.seniorCommission += item.commissionAmount;
        } else {
          acc.agencyCommission += item.commissionAmount;
        }
        return acc;
      },
      { commission: 0, used: 0, requested: 0, closing: 0, seniorCommission: 0, agencyCommission: 0 }
    );
  }, [filteredLedger]);

  // Referrer object selected in the Payment Request Modal
  const selectedReqReferrerObj = useMemo(() => {
    return referrers.find((r) => r.id === reqReferrerId) || null;
  }, [referrers, reqReferrerId]);

  // All outside workers referred by the selected referrer with live financial data
  const modalReferredWorkers = useMemo(() => {
    if (!reqReferrerId) return [];
    return outsideWorkers
      .filter((w) => w.referrerId === reqReferrerId)
      .map((w) => {
        const rowData = ledgerData.find((r) => r.workerId === w.id);
        return {
          worker: w,
          closingBalance: rowData?.closingBalance ?? 0,
          commissionAmount: rowData?.commissionAmount ?? 0,
          usedAmount: rowData?.usedAmount ?? 0,
          requestAmount: rowData?.requestAmount ?? 0,
          paymentStatus: rowData?.paymentStatus ?? 'unpaid',
          siteCode: rowData?.siteCode ?? 'S001',
          siteName: rowData?.siteName ?? 'Site',
          sectionName: rowData?.sectionName ?? 'Section',
        };
      });
  }, [reqReferrerId, outsideWorkers, ledgerData]);

  // Open Payment Request Modal prefilled from a row or blank
  const handleOpenPaymentRequest = (row?: CommissionLedgerRow) => {
    setReqError('');
    if (row) {
      setReqReferrerId(row.referrerId);
      // Pre-fill amount for this specific worker with their available closing balance
      setWorkerRequestAmounts({
        [row.workerId]: row.closingBalance > 0 ? String(row.closingBalance) : '',
      });
      setWorkerRequestErrors({});
      const ref = referrers.find((r) => r.id === row.referrerId);
      setReqUpiNumber(ref?.mobile ? `${ref.mobile}@upi` : '');
    } else {
      const defaultRefId = referrers[0]?.id || '';
      setReqReferrerId(defaultRefId);
      setWorkerRequestAmounts({});
      setWorkerRequestErrors({});
      const ref = referrers.find((r) => r.id === defaultRefId);
      setReqUpiNumber(ref?.mobile ? `${ref.mobile}@upi` : '');
    }
    setReqPayoutMode('upi');
    setReqBankName('State Bank of India');
    setReqBankAccountNumber('');
    setReqBankIfsc('SBIN0001234');
    setReqDate(new Date().toISOString().split('T')[0]);
    setReqRemarks('');
    setShowPaymentRequestModal(true);
  };

  // When referrer changes in the payment modal
  const handleModalReferrerChange = (newRefId: string) => {
    setReqReferrerId(newRefId);
    setWorkerRequestAmounts({});
    setWorkerRequestErrors({});
    setReqError('');
    const ref = referrers.find((r) => r.id === newRefId);
    if (ref?.mobile) {
      setReqUpiNumber(`${ref.mobile}@upi`);
    }
  };

  // Handle single worker amount input with strict "extra amount not allowed" validation
  const handleWorkerAmountChange = (workerId: string, val: string, maxClosing: number) => {
    setWorkerRequestAmounts((prev) => ({ ...prev, [workerId]: val }));

    if (val.trim() === '') {
      setWorkerRequestErrors((prev) => {
        const next = { ...prev };
        delete next[workerId];
        return next;
      });
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      setWorkerRequestErrors((prev) => ({
        ...prev,
        [workerId]: 'Please enter a valid number.',
      }));
    } else if (num < 0) {
      setWorkerRequestErrors((prev) => ({
        ...prev,
        [workerId]: 'Amount cannot be negative.',
      }));
    } else if (num > maxClosing) {
      // Extra amount strictly prevented
      setWorkerRequestErrors((prev) => ({
        ...prev,
        [workerId]: `Extra amount not allowed! Maximum is ₹${maxClosing.toLocaleString('en-IN')}`,
      }));
    } else {
      setWorkerRequestErrors((prev) => {
        const next = { ...prev };
        delete next[workerId];
        return next;
      });
    }
  };

  // Fill exact max closing balance for a single worker
  const handleFillMaxForWorker = (workerId: string, maxClosing: number) => {
    if (maxClosing <= 0) return;
    handleWorkerAmountChange(workerId, String(maxClosing), maxClosing);
  };

  // Fill exact max closing balance for all referred workers under this agent
  const handleFillAllMax = () => {
    const newAmounts: Record<string, string> = {};
    modalReferredWorkers.forEach((item) => {
      if (item.closingBalance > 0) {
        newAmounts[item.worker.id] = String(item.closingBalance);
      }
    });
    setWorkerRequestAmounts(newAmounts);
    setWorkerRequestErrors({});
    setReqError('');
  };

  // Clear all amounts
  const handleClearAllAmounts = () => {
    setWorkerRequestAmounts({});
    setWorkerRequestErrors({});
    setReqError('');
  };

  // Total request sum across all workers
  const totalRequestedPayout = useMemo(() => {
    let sum = 0;
    Object.values(workerRequestAmounts).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) sum += num;
    });
    return sum;
  }, [workerRequestAmounts]);

  // Total available closing balance across all referred workers
  const totalAvailableClosing = useMemo(() => {
    return modalReferredWorkers.reduce((sum, item) => sum + item.closingBalance, 0);
  }, [modalReferredWorkers]);

  // Count of workers with valid entered amount
  const selectedWorkersCount = useMemo(() => {
    return Object.values(workerRequestAmounts).filter((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }).length;
  }, [workerRequestAmounts]);

  // Check if any row has an excess error
  const hasExcessErrors = Object.keys(workerRequestErrors).length > 0;

  // Submit Multi-Worker Payment Request
  const handleSubmitPaymentRequest = () => {
    setReqError('');
    if (!reqReferrerId) {
      setReqError('Please select a Referrer / Senior Employee.');
      return;
    }

    // Collect all valid worker requests
    const validRequests: Array<{ workerId: string; amount: number }> = [];

    for (const item of modalReferredWorkers) {
      const wId = item.worker.id;
      const rawVal = workerRequestAmounts[wId];
      if (!rawVal || rawVal.trim() === '') continue;

      const numAmount = parseFloat(rawVal);
      if (isNaN(numAmount) || numAmount <= 0) continue;

      // Strict check: extra amount cannot be given
      if (numAmount > item.closingBalance) {
        setReqError(
          `Extra amount not allowed! Requested amount of ₹${numAmount} for ${item.worker.name} exceeds available balance of ₹${item.closingBalance}.`
        );
        return;
      }

      validRequests.push({ workerId: wId, amount: numAmount });
    }

    if (validRequests.length === 0) {
      setReqError('Please enter a request amount greater than ₹0 for at least one referred employee.');
      return;
    }

    if (hasExcessErrors) {
      setReqError('Please fix amounts that exceed available closing balances before submitting.');
      return;
    }

    if (reqPayoutMode === 'upi' && !reqUpiNumber.trim()) {
      setReqError('Please enter a valid UPI Number / VPA ID.');
      return;
    }

    if (reqPayoutMode === 'bankTransfer' && (!reqBankAccountNumber.trim() || !reqBankIfsc.trim())) {
      setReqError('Please provide Bank Account Number and IFSC Code.');
      return;
    }

    const ref = referrers.find((r) => r.id === reqReferrerId);
    const isSeniorEmp = ref?.type === 'seniorEmployee';

    // Batch create requests for all selected workers
    const batchRequests = validRequests.map((entry) => {
      const wRecord = workers.find((w) => w.id === entry.workerId);
      return {
        referrerId: reqReferrerId,
        workerId: entry.workerId,
        amount: entry.amount,
        date: reqDate,
        payoutMode: reqPayoutMode,
        upiNumber: reqPayoutMode === 'upi' ? reqUpiNumber.trim() : undefined,
        bankName: reqPayoutMode === 'bankTransfer' ? reqBankName.trim() : undefined,
        bankAccountNumber: reqPayoutMode === 'bankTransfer' ? reqBankAccountNumber.trim() : undefined,
        bankIfsc: reqPayoutMode === 'bankTransfer' ? reqBankIfsc.trim() : undefined,
        remarks:
          reqRemarks.trim() ||
          `${isSeniorEmp ? 'Senior employee referral commission' : 'Agency commission payout'} for ${
            wRecord?.name || entry.workerId
          }`,
        status: 'pending' as const,
      };
    });

    addBulkCommissionPaymentRequests(batchRequests);

    setToastMessage(
      `Submitted commission payment request of ₹${totalRequestedPayout.toLocaleString('en-IN')} across ${
        validRequests.length
      } referred worker(s) for ${ref?.name || reqReferrerId}.`
    );
    setShowPaymentRequestModal(false);
  };

  // Open Register Referrer Modal
  const handleOpenRegisterModal = () => {
    setRegType('seniorEmployee');
    const firstCompanyWorker = companyWorkers[0];
    if (firstCompanyWorker) {
      setSelectedSeniorWorkerId(firstCompanyWorker.id);
      setAgencyName(`${firstCompanyWorker.name} (Senior Craftsman)`);
      setAgencyMobile(firstCompanyWorker.mobile);
      setSeniorDesignation('Senior Mason / Mestri');
    } else {
      setAgencyName('');
      setAgencyMobile('');
    }
    setAgencyStatus('active');
    setRegRemarks('');
    setShowAddAgencyModal(true);
  };

  // When senior worker selection changes in registration modal
  const handleSeniorWorkerSelectionChange = (workerId: string) => {
    setSelectedSeniorWorkerId(workerId);
    const w = companyWorkers.find((item) => item.id === workerId);
    if (w) {
      setAgencyName(`${w.name} (${seniorDesignation || 'Senior Employee'})`);
      setAgencyMobile(w.mobile);
    }
  };

  // Save New Referrer (External Agency OR Senior Employee)
  const handleSaveReferrer = () => {
    if (regType === 'seniorEmployee') {
      if (!selectedSeniorWorkerId) {
        alert('Please select a senior company employee.');
        return;
      }
      const w = companyWorkers.find((item) => item.id === selectedSeniorWorkerId);
      if (!w) {
        alert('Selected employee not found.');
        return;
      }

      addReferrer({
        name: `${w.name} (${seniorDesignation.trim() || 'Senior Craftsman'})`,
        mobile: w.mobile,
        status: agencyStatus,
        type: 'seniorEmployee',
        workerId: w.id,
        designation: seniorDesignation.trim() || 'Senior Craftsman',
        remarks: regRemarks.trim() || `Company senior employee referring outside workforce.`,
      });

      setToastMessage(`Senior employee "${w.name}" registered as reference person successfully.`);
    } else {
      // External Agency
      if (!agencyName.trim() || !agencyMobile.trim()) {
        alert('Please fill in Agency Name and Mobile Number.');
        return;
      }

      addReferrer({
        name: agencyName.trim(),
        mobile: agencyMobile.trim(),
        status: agencyStatus,
        type: 'agency',
        remarks: regRemarks.trim() || 'External manpower recruitment contractor',
      });

      setToastMessage(`Agency "${agencyName}" registered successfully.`);
    }

    setShowAddAgencyModal(false);
  };

  // Table Columns
  const columns: Column<CommissionLedgerRow>[] = [
    {
      header: 'S.No',
      render: (_, idx) => (
        <span className="font-semibold text-slate-500 text-xs">{idx + 1}</span>
      ),
    },
    {
      header: 'Referrer / Reference Person',
      accessor: 'referrerName',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{row.referrerName}</span>
            {row.referrerType === 'seniorEmployee' ? (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs">
                <span>👷</span>
                <span>Senior Employee</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-2xs">
                <span>🏢</span>
                <span>External Agent</span>
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-bold">
              {row.referrerWorkerId ? `${row.referrerId} • Emp: ${row.referrerWorkerId}` : row.referrerId}
            </span>
            {row.referrerDesignation && (
              <span className="text-purple-700 font-medium text-[11px]">• {row.referrerDesignation}</span>
            )}
            <span>• Mob: {row.referrerMobile}</span>
          </span>
        </div>
      ),
    },
    {
      header: 'Employee Name & ID',
      accessor: 'workerName',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm">{row.workerName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200/60">
              {row.workerId}
            </span>
            <span className="text-[11px] text-slate-500">S.No {row.workerSerial}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Site Code with Name',
      accessor: 'siteName',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 max-w-[220px]">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 border border-indigo-200/70">
            {row.siteCode}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-800 text-xs truncate" title={`[${row.siteCode}] ${row.siteName}`}>
              [{row.siteCode}] {row.siteName}
            </span>
            <span className="text-[10px] text-slate-400">Site Assignment</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Section',
      accessor: 'sectionName',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80">
            <Layers className="h-3 w-3 mr-1 text-slate-500" />
            {row.sectionName}
          </span>
          <span className="text-[10px] font-mono text-slate-400">({row.sectionCode})</span>
        </div>
      ),
    },
    {
      header: 'Commission Amount',
      accessor: 'commissionAmount',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col text-right">
          <span className="font-extrabold text-slate-900 text-sm">
            ₹{row.commissionAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {row.commissionType === 'percentage'
              ? `${row.commissionRate}% wage`
              : row.commissionType === 'fixedMonthly'
              ? `₹${row.commissionRate}/mo`
              : `₹${row.commissionRate}/day`}
            {' '}({row.presentDays}P {row.halfDays > 0 ? `+ ${row.halfDays}HD` : ''})
          </span>
        </div>
      ),
    },
    {
      header: 'Used Amount',
      accessor: 'usedAmount',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <span
            className={`font-semibold text-xs ${
              row.usedAmount > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200' : 'text-slate-400'
            }`}
          >
            ₹{row.usedAmount.toLocaleString('en-IN')}
          </span>
        </div>
      ),
    },
    {
      header: 'Request Amount',
      accessor: 'requestAmount',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          {row.requestAmount > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
              <Clock className="h-3 w-3 mr-1 text-amber-600" />
              ₹{row.requestAmount.toLocaleString('en-IN')}
            </span>
          ) : (
            <span className="text-slate-400 text-xs font-medium">₹0</span>
          )}
        </div>
      ),
    },
    {
      header: 'Closing Balance',
      accessor: 'closingBalance',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <span
            className={`font-extrabold text-sm ${
              row.closingBalance > 0 ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            ₹{row.closingBalance.toLocaleString('en-IN')}
          </span>
        </div>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      sortable: true,
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenPaymentRequest(row)}
            disabled={row.closingBalance <= 0}
            title={row.closingBalance <= 0 ? 'No closing balance available to request' : 'Submit payment request'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center space-x-1.5 ${
              row.closingBalance > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Request Payment</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Referrers & Agents</h1>
              <p className="text-xs text-slate-500 font-medium">
                Commission ledger & payout requests for External Agencies and Senior Company Employees.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* Add Referrer / Senior Employee Trigger */}
          <button
            onClick={handleOpenRegisterModal}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs"
          >
            <Plus className="h-4 w-4 text-slate-500" />
            <span>Add Referrer / Senior Emp</span>
          </button>

          {/* Primary Action: Request Commission Payment */}
          <button
            onClick={() => handleOpenPaymentRequest()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-xs font-bold inline-flex items-center space-x-2 shadow-md shadow-blue-500/25 active:scale-95"
          >
            <CreditCard className="h-4 w-4" />
            <span>Request Commission Payment</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills / Views */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3 flex-wrap gap-y-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-2 ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <ReceiptText className="h-3.5 w-3.5" />
          <span>Commission Ledger ({filteredLedger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-2 ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Payment Requests & Status ({commissionRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agencies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-2 ${
            activeTab === 'agencies'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Registered Reference Persons ({referrers.length})</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Commission</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">₹{totals.commission.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Agencies: ₹{totals.agencyCommission.toLocaleString('en-IN')} • Senior Emps: ₹{totals.seniorCommission.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Used / Paid Out</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">₹{totals.used.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Disbursed to agents & senior workers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Request Amount</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700 mt-2">₹{totals.requested.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">In pending / processing</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closing Balance</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-black text-blue-700 mt-2">₹{totals.closing.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">Available for payment request</p>
        </div>
      </div>

      {/* TAB 1: MAIN COMMISSION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Clear View Filters Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4">
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Filter className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Filters</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-full">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Quick Referrer Category Tabs (Agencies vs Senior Employees) */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Referrer Type:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                {[
                  { key: 'all', label: 'All Reference Persons' },
                  { key: 'agency', label: '🏢 External Agencies' },
                  { key: 'seniorEmployee', label: '👷 Senior Employees' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setReferrerCategoryFilter(cat.key as any);
                      setSelectedReferrer('');
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      referrerCategoryFilter === cat.key
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Referrer / Agent / Senior Employee Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Reference Person / Agent
                </label>
                <select
                  value={selectedReferrer}
                  onChange={(e) => {
                    setSelectedReferrer(e.target.value);
                    if (e.target.value) {
                      const w = outsideWorkers.find((item) => item.id === selectedWorker);
                      if (w && w.referrerId !== e.target.value) {
                        setSelectedWorker('');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="">All Reference Persons</option>
                  <optgroup label="🏢 External Agencies">
                    {referrers
                      .filter((r) => r.type !== 'seniorEmployee')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [Agent] {r.name} ({r.id})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="👷 Senior Company Employees">
                    {referrers
                      .filter((r) => r.type === 'seniorEmployee')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [Senior Emp] {r.name} ({r.workerId || r.id})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* 2. Employee ("emplys") Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Outside Employees
                </label>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="">All Outside Employees</option>
                  {outsideWorkers
                    .filter((w) => {
                      if (selectedReferrer && w.referrerId !== selectedReferrer) return false;
                      if (referrerCategoryFilter !== 'all') {
                        const r = referrers.find((ref) => ref.id === w.referrerId);
                        const rType = r?.type || 'agency';
                        if (rType !== referrerCategoryFilter) return false;
                      }
                      return true;
                    })
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.id})
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. From Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* 4. To Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Quick Status Filter Pills & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Status:</span>
                {[
                  { key: 'all', label: 'All Deployments' },
                  { key: 'pending', label: 'Pending Request' },
                  { key: 'processing', label: 'In Processing' },
                  { key: 'partially_paid', label: 'Partially Paid' },
                  { key: 'paid', label: 'Cleared / Fully Paid' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === tab.key
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Keyword Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search worker, senior emp, site..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <DataTable
            columns={columns}
            data={filteredLedger}
            emptyTitle="No Outside Worker Commission Records Found"
            emptyDescription="Try adjusting your filters or date range to inspect commission deployments."
          />
        </div>
      )}

      {/* TAB 2: PAYMENT REQUESTS & STATUS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Commission Payment Requests & Finance Pipeline</h3>
                <p className="text-xs text-slate-500">
                  Track payout requests submitted for external agencies and senior company employees.
                </p>
              </div>
              <button
                onClick={() => handleOpenPaymentRequest()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Request</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {commissionRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No payment requests recorded yet.</div>
              ) : (
                commissionRequests.map((req) => {
                  const ref = referrers.find((r) => r.id === req.referrerId);
                  const worker = workers.find((w) => w.id === req.workerId);
                  const site = sites.find((s) => s.id === worker?.currentSiteId);
                  const isSenior = ref?.type === 'seniorEmployee';

                  return (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {req.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {ref?.name || req.referrerId}
                          </span>
                          {isSenior ? (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold flex items-center gap-1">
                              <span>👷</span>
                              <span>Senior Emp</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold flex items-center gap-1">
                              <span>🏢</span>
                              <span>Agent</span>
                            </span>
                          )}
                          <StatusBadge status={req.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            Worker:{' '}
                            <strong className="text-slate-800 font-semibold">{worker?.name || req.workerId}</strong>{' '}
                            ({worker?.id})
                          </span>
                          <span>•</span>
                          <span>
                            Site:{' '}
                            <strong className="text-slate-700">[{site?.code || site?.id}] {site?.name}</strong>
                          </span>
                          <span>•</span>
                          <span>Date: {req.date}</span>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                          <div className="flex items-center space-x-2 font-medium">
                            <span className="text-slate-500">Payout Mode:</span>
                            <span className="font-bold text-slate-800 uppercase text-[11px]">{req.payoutMode}</span>
                            {req.payoutMode === 'upi' && req.upiNumber && (
                              <span className="text-blue-600 font-mono">({req.upiNumber})</span>
                            )}
                            {req.payoutMode === 'bankTransfer' && (
                              <span className="text-slate-700">
                                ({req.bankName} - A/C: {req.bankAccountNumber} - IFSC: {req.bankIfsc})
                              </span>
                            )}
                          </div>
                          {req.remarks && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">Note: "{req.remarks}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Requested</span>
                          <span className="text-lg font-black text-slate-900">
                            ₹{req.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {req.status === 'pending' && (
                            <button
                              onClick={() => {
                                updateCommissionPaymentRequestStatus(req.id, 'processing');
                                setToastMessage(`Request ${req.id} moved to processing in Finance.`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Process
                            </button>
                          )}
                          {(req.status === 'pending' || req.status === 'processing') && (
                            <button
                              onClick={() => {
                                updateCommissionPaymentRequestStatus(req.id, 'paid');
                                setToastMessage(`Request ${req.id} marked as Paid & Disbursed.`);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
                            >
                              Confirm Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTERED REFERENCE PERSONS (AGENCIES & SENIOR EMPLOYEES) */}
      {activeTab === 'agencies' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Reference Persons & Labor Contractors</h3>
              <p className="text-xs text-slate-500">
                Directory of external recruitment agencies and senior company employees referring workforce members.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
                {[
                  { key: 'all', label: `All (${referrers.length})` },
                  { key: 'agency', label: `Agencies (${referrers.filter((r) => r.type !== 'seniorEmployee').length})` },
                  { key: 'seniorEmployee', label: `Senior Emps (${referrers.filter((r) => r.type === 'seniorEmployee').length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDirectoryTypeFilter(tab.key as any)}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      directoryTypeFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleOpenRegisterModal}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center space-x-1 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Referrer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {referrers
              .filter((ref) => {
                if (directoryTypeFilter !== 'all') {
                  const isSenior = ref.type === 'seniorEmployee';
                  if (directoryTypeFilter === 'seniorEmployee' && !isSenior) return false;
                  if (directoryTypeFilter === 'agency' && isSenior) return false;
                }
                return true;
              })
              .map((ref) => {
                const countWorkers = outsideWorkers.filter((w) => w.referrerId === ref.id).length;
                const isSenior = ref.type === 'seniorEmployee';
                const workerRecord = isSenior && ref.workerId ? workers.find((w) => w.id === ref.workerId) : null;
                const siteRecord = workerRecord ? sites.find((s) => s.id === workerRecord.currentSiteId) : null;

                return (
                  <div
                    key={ref.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isSenior
                        ? 'border-purple-200 bg-purple-50/20 hover:bg-white hover:border-purple-300'
                        : 'border-slate-200/80 bg-slate-50/50 hover:bg-white'
                    } hover:shadow-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {ref.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isSenior ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold flex items-center gap-1">
                            <span>👷</span>
                            <span>Senior Employee</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold flex items-center gap-1">
                            <span>🏢</span>
                            <span>Agency</span>
                          </span>
                        )}
                        <StatusBadge status={ref.status} />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{ref.name}</h4>
                      {isSenior && ref.designation && (
                        <p className="text-xs font-semibold text-purple-700 mt-0.5 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          <span>{ref.designation}</span>
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 font-medium">Contact: {ref.mobile}</p>
                      {workerRecord && siteRecord && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Stationed at: <strong>[{siteRecord.code}] {siteRecord.name}</strong>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Workers Referred:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full border ${
                          isSenior
                            ? 'text-purple-700 bg-purple-50 border-purple-200'
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                        }`}
                      >
                        {countWorkers} Personnel
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL 1: REQUEST COMMISSION PAYMENT (WITH MULTI-EMPLOYEE LEDGER & EXTRA AMOUNT PREVENTION) */}
      <Modal
        isOpen={showPaymentRequestModal}
        onClose={() => setShowPaymentRequestModal(false)}
        title="Request Commission Payment"
        subtitle="Review referred outside employees, available commission balances, and enter payout amounts."
        icon={<CreditCard className="h-5 w-5 text-blue-600" />}
        size="xl"
      >
        <div className="space-y-4 pt-1">
          {reqError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <span>{reqError}</span>
            </div>
          )}

          {/* Top Row: Referrer Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Reference Person / Agent <span className="text-rose-500">*</span>
            </label>
            <select
              value={reqReferrerId}
              onChange={(e) => handleModalReferrerChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <optgroup label="🏢 External Agencies">
                {referrers
                  .filter((r) => r.type !== 'seniorEmployee')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      [Agent] {r.name} ({r.id})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="👷 Senior Company Employees">
                {referrers
                  .filter((r) => r.type === 'seniorEmployee')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      [Senior Emp] {r.name} ({r.workerId || r.id})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Senior Employee Notice Banner if Senior Employee is chosen */}
          {selectedReqReferrerObj?.type === 'seniorEmployee' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
              <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-purple-900 block">
                  Senior Company Employee Referral Payout:
                </span>
                <span className="text-purple-700">
                  This payout will be disbursed to senior employee <strong>{selectedReqReferrerObj.name}</strong> ({selectedReqReferrerObj.designation || 'Senior Craftsman'}) for introducing referred workforce members.
                </span>
              </div>
            </div>
          )}

          {/* REFERRED OUTSIDE EMPLOYEES: MULTI-EMPLOYEE LEDGER LIST */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Referred Outside Employees ({modalReferredWorkers.length})
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter requested payout for each employee. <strong className="text-slate-700">Extra amount is strictly prohibited</strong> — cannot exceed available closing balance.
                </p>
              </div>

              {/* Quick Multi-Worker Action Helpers */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleFillAllMax}
                  disabled={totalAvailableClosing <= 0}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors inline-flex items-center space-x-1 ${
                    totalAvailableClosing > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Check className="h-3 w-3" />
                  <span>Fill Max for All</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllAmounts}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Multi-Worker Rows Container */}
            {modalReferredWorkers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No outside employees currently referred by this agency / senior employee.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200/90 rounded-2xl bg-white shadow-2xs scrollbar-thin">
                {modalReferredWorkers.map((item) => {
                  const wId = item.worker.id;
                  const currentVal = workerRequestAmounts[wId] || '';
                  const hasError = Boolean(workerRequestErrors[wId]);
                  const errorMessage = workerRequestErrors[wId];
                  const isZeroBalance = item.closingBalance <= 0;

                  return (
                    <div
                      key={wId}
                      className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        hasError
                          ? 'bg-rose-50/40'
                          : currentVal && parseFloat(currentVal) > 0
                          ? 'bg-blue-50/20'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Left: Employee Details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">{item.worker.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200/60">
                            {wId}
                          </span>
                          <StatusBadge status={item.paymentStatus} />
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 flex-wrap">
                          <span>
                            [{item.siteCode}] {item.siteName}
                          </span>
                          <span>•</span>
                          <span>Section: {item.sectionName}</span>
                          <span>•</span>
                          <span>Daily Wage: ₹{item.worker.dailyWage}</span>
                        </div>
                      </div>

                      {/* Middle: Financial Status Badges */}
                      <div className="flex items-center gap-2 text-xs flex-wrap md:justify-end">
                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-right min-w-[80px]">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block leading-tight">Earned</span>
                          <span className="font-bold text-slate-800 text-xs">
                            ₹{item.commissionAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-right min-w-[75px]">
                          <span className="text-[9px] text-emerald-600 font-bold uppercase block leading-tight">Paid</span>
                          <span className="font-bold text-emerald-700 text-xs">
                            ₹{item.usedAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-blue-50/80 px-2.5 py-1.5 rounded-xl border border-blue-200/70 text-right min-w-[95px]">
                          <span className="text-[9px] text-blue-600 font-bold uppercase block leading-tight">Closing Balance</span>
                          <span className="font-black text-blue-700 text-xs">
                            ₹{item.closingBalance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Right: Enter Amount Input with strict Max Enforcement */}
                      <div className="w-full md:w-56 flex-shrink-0 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              disabled={isZeroBalance}
                              placeholder={isZeroBalance ? 'No Balance' : 'Enter amount'}
                              value={currentVal}
                              onChange={(e) => handleWorkerAmountChange(wId, e.target.value, item.closingBalance)}
                              className={`w-full pl-6 pr-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none transition-all ${
                                isZeroBalance
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : hasError
                                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400/20'
                                  : 'bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs'
                              }`}
                            />
                          </div>

                          {!isZeroBalance && (
                            <button
                              type="button"
                              onClick={() => handleFillMaxForWorker(wId, item.closingBalance)}
                              title={`Fill max available: ₹${item.closingBalance}`}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-[11px] font-bold border border-slate-200 transition-colors flex-shrink-0"
                            >
                              Max
                            </button>
                          )}
                        </div>

                        {/* Error Warning: Extra amount blocked */}
                        {hasError && (
                          <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 leading-tight">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span>{errorMessage}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Summary Banner for Multi-Employee Request */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 rounded-2xl border border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-800">
                    Selected: {selectedWorkersCount} of {modalReferredWorkers.length} referred workers
                  </span>
                  {hasExcessErrors && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Extra amount blocked</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Total available across these employees: <strong className="text-slate-700">₹{totalAvailableClosing.toLocaleString('en-IN')}</strong>
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-[10px] text-slate-500 uppercase font-bold block leading-tight">
                  Total Request Payout
                </span>
                <span className={`text-xl font-black ${hasExcessErrors ? 'text-rose-600' : 'text-blue-700'}`}>
                  ₹{totalRequestedPayout.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Payout Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Payout Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'upi', label: 'UPI / PhonePe' },
                { id: 'bankTransfer', label: 'Bank Transfer' },
                { id: 'cash', label: 'Cash Voucher' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setReqPayoutMode(mode.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    reqPayoutMode === mode.id
                      ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Specific Inputs */}
          {reqPayoutMode === 'upi' && (
            <Input
              label="UPI ID / Mobile Number"
              placeholder="e.g. 9111222333@upi"
              value={reqUpiNumber}
              onChange={(e) => setReqUpiNumber(e.target.value)}
            />
          )}

          {reqPayoutMode === 'bankTransfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Bank Name"
                placeholder="e.g. HDFC Bank"
                value={reqBankName}
                onChange={(e) => setReqBankName(e.target.value)}
              />
              <Input
                label="Account Number"
                placeholder="e.g. 501004829104"
                value={reqBankAccountNumber}
                onChange={(e) => setReqBankAccountNumber(e.target.value)}
              />
              <Input
                label="IFSC Code"
                placeholder="e.g. HDFC0001234"
                value={reqBankIfsc}
                onChange={(e) => setReqBankIfsc(e.target.value)}
              />
            </div>
          )}

          {/* Request Date & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Request Date"
              type="date"
              value={reqDate}
              onChange={(e) => setReqDate(e.target.value)}
            />
            <Input
              label="Remarks / Notes"
              placeholder="e.g. Monthly batch referral payout"
              value={reqRemarks}
              onChange={(e) => setReqRemarks(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowPaymentRequestModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitPaymentRequest}
              disabled={totalRequestedPayout <= 0 || hasExcessErrors}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 ${
                totalRequestedPayout <= 0 || hasExcessErrors
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/25'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Payment Request (₹{totalRequestedPayout.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: REGISTER REFERRER (AGENCY OR SENIOR EMPLOYEE) */}
      <Modal
        isOpen={showAddAgencyModal}
        onClose={() => setShowAddAgencyModal(false)}
        title="Register Reference Person"
        subtitle="Register an external contractor agency OR an existing senior company employee who refers workforce."
        icon={<UserCheck className="h-5 w-5 text-blue-600" />}
        size="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Choice: External Agency vs Senior Company Employee */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Referrer Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRegType('seniorEmployee')}
                className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                  regType === 'seniorEmployee'
                    ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700 flex-shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block">Senior Company Employee</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Internal mason, mestri, or craftsman referring new workers.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRegType('agency')}
                className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                  regType === 'agency'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block">External Agency / Agent</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Third-party contractor or labor recruitment supplier.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* If Senior Employee is selected */}
          {regType === 'seniorEmployee' ? (
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select Senior Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSeniorWorkerId}
                  onChange={(e) => handleSeniorWorkerSelectionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 cursor-pointer"
                >
                  {companyWorkers.map((w) => {
                    const site = sites.find((s) => s.id === w.currentSiteId);
                    return (
                      <option key={w.id} value={w.id}>
                        [{w.id}] {w.name} • Wage: ₹{w.dailyWage}/day • Site: [{site?.code || site?.id}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Senior Designation / Role"
                  placeholder="e.g. Senior Mason / Mestri"
                  value={seniorDesignation}
                  onChange={(e) => setSeniorDesignation(e.target.value)}
                  helperText="Role (e.g. Senior Mason, Lead Mate, Site Foreman)"
                />

                <Input
                  label="Registered Mobile"
                  value={agencyMobile}
                  onChange={(e) => setAgencyMobile(e.target.value)}
                  helperText="Primary mobile contact for commission payouts"
                />
              </div>
            </div>
          ) : (
            /* If External Agency is selected */
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <Input
                label="Agency / Contractor Name"
                placeholder="e.g. Sri Balaji Labour Suppliers"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />

              <Input
                label="Agency Mobile Contact"
                placeholder="e.g. 9811223344"
                value={agencyMobile}
                onChange={(e) => setAgencyMobile(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={agencyStatus}
                onChange={(e) => setAgencyStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <Input
              label="Remarks / Referral Terms"
              placeholder="e.g. Brings outside masonry specialists"
              value={regRemarks}
              onChange={(e) => setRegRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowAddAgencyModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReferrer}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/25 inline-flex items-center space-x-1.5"
            >
              <span>Save Reference Person</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Feedback Toast */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Referrers;
