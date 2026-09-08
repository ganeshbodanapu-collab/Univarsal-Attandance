import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { OfficialRegistersModal } from '../../components/reports/OfficialRegistersModal';
import { WorkforceWeeklySettlementModal } from '../../components/attendance/WorkforceWeeklySettlementModal';
import {
  UniversalReportExportModal,
  type ReportKpi,
  type CustomAuditSlipDetails,
} from '../../components/reports/UniversalReportExportModal';
import { CustomSiteMigrationModal } from '../../components/workers/CustomSiteMigrationModal';
import type { Worker, MonthlySettlementRecord } from '../../types';
import {
  Calendar,
  FileSpreadsheet,
  Users,
  CreditCard,
  Utensils,
  Award,
  Download,
  Printer,
  Search,
  BookOpen,
  Eye,
  FileText,
  FileCheck2,
  CheckCircle2,
  MapPin,
  ArrowRightLeft,
  Building2,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export type ReportType =
  | 'daily-attendance-section'
  | 'weekly-attendance'
  | 'monthly-attendance'
  | 'advance-payments'
  | 'food-report'
  | 'overall-reports'
  | 'transfers-report';

export const Reports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialReport = (searchParams.get('report') as ReportType) || 'daily-attendance-section';

  const {
    sites,
    sections,
    workers,
    attendance,
    advances,
    recoveries,
    referrers,
    payments,
    settlementRecords,
    foodOrders,
    siteMigrations,
    currentUser,
  } = useAttendanceContext();

  const isSupervisor = currentUser?.role === 'supervisor';
  const assignedSiteId = currentUser?.assignedSiteId;

  // Primary active report
  const [activeReport, setActiveReport] = useState<ReportType>(initialReport);

  // Global & Custom (Costam wise) filters
  const [dateFilterMode, setDateFilterMode] = useState<'standard' | 'custom'>('standard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState<number>(4); // Week 1 to 5
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [filterSiteId, setFilterSiteId] = useState(isSupervisor ? assignedSiteId || '' : '');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterWorkerType, setFilterWorkerType] = useState<'all' | 'company' | 'outside'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-dimensions / View modes for each report
  const [weeklyViewMode, setWeeklyViewMode] = useState<'section' | 'employee'>('section');
  const [monthlyViewMode, setMonthlyViewMode] = useState<'section' | 'employee'>('section');
  const [advanceDimension, setAdvanceDimension] = useState<'section' | 'employee' | 'ref_agents'>('section');
  const [advancePeriod, setAdvancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [foodDimension, setFoodDimension] = useState<'section' | 'employee'>('section');
  const [foodPeriod, setFoodPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [overallPeriod, setOverallPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'overall'>('monthly');

  // Transfers report states
  const [transfersSubView, setTransfersSubView] = useState<'all' | 'site' | 'section'>('all');
  const [transfersPeriod, setTransfersPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');
  const [transfersNature, setTransfersNature] = useState<'all' | 'permanent' | 'temporary'>('all');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Drilldown states
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  // Custom Worker Audit & Settlement Slip states
  const [selectedWorkerForSettlementModal, setSelectedWorkerForSettlementModal] = useState<Worker | null>(null);
  const [isCustomSlipPickerOpen, setIsCustomSlipPickerOpen] = useState(false);
  const [customSlipWorkerId, setCustomSlipWorkerId] = useState('');
  const [customSlipMonth, setCustomSlipMonth] = useState(new Date().toISOString().slice(0, 7));
  const [customSlipStartDate, setCustomSlipStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customSlipEndDate, setCustomSlipEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRegistersModalOpen, setIsRegistersModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 7 Core Report Definitions
  const reportDefinitions = [
    {
      id: 'daily-attendance-section' as ReportType,
      name: '1. Daily Attendance (Section-Wise)',
      icon: Calendar,
      desc: 'Daily worker deployment, check-in muster, overtime hours, and attendance rate grouped by work trade section.',
    },
    {
      id: 'weekly-attendance' as ReportType,
      name: '2. Weekly Attendance (Section & Emply)',
      icon: FileSpreadsheet,
      desc: '7-day weekly attendance audit roll with day-by-day P/H/A flags, section summaries, and weekly wage accruals.',
    },
    {
      id: 'monthly-attendance' as ReportType,
      name: '3. Monthly Attendance (Section & Emply)',
      icon: Users,
      desc: 'Full month attendance master roll, cumulative mandays, full duty, half days, and absences by section and employee.',
    },
    {
      id: 'advance-payments' as ReportType,
      name: '4. Advance Payment Report (Multi-Dimension)',
      icon: CreditCard,
      desc: 'Disbursement loans, wage deductions, and running debts by Section, Employee, and Referral Agents across Daily, Weekly, and Monthly.',
    },
    {
      id: 'food-report' as ReportType,
      name: '5. Food Report (Multi-Dimension & Period)',
      icon: Utensils,
      desc: 'Canteen meal indents, parcels delivered, and consumption units (Present=1, Half Day=0.5) by Section & Employee across Daily, Weekly, Monthly.',
    },
    {
      id: 'overall-reports' as ReportType,
      name: '6. Overall Reports (360° Employee Master)',
      icon: Award,
      desc: 'Unified 360° Employee Dossier combining Attendance, Food, and Wage/Advance Payments across Daily, Weekly, Monthly, and Lifetime.',
    },
    {
      id: 'transfers-report' as ReportType,
      name: '7. Employees Transfers & Migrations',
      icon: ArrowRightLeft,
      desc: 'Section Transfers list, Site Transfers list, and custom date migration audit logs with PDF & Canvas image exports.',
    },
  ];

  // Helper: calculate week date window for a given month and week index (1-5)
  const getWeekRange = (monthStr: string, weekNum: number) => {
    const [y, m] = monthStr.split('-').map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = Math.min(weekNum * 7, totalDays);
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDate = `${monthStr}-${pad(startDay)}`;
    const endDate = `${monthStr}-${pad(endDay)}`;
    return {
      startDate,
      endDate,
      label: `Week ${weekNum} (${monthStr}-${pad(startDay)} to ${monthStr}-${pad(endDay)})`,
      dayDates: Array.from({ length: endDay - startDay + 1 }, (_, i) => `${monthStr}-${pad(startDay + i)}`),
    };
  };

  const activeWeekInfo = useMemo(() => getWeekRange(selectedMonth, selectedWeek), [selectedMonth, selectedWeek]);

  // Helper: Get or synthesize a MonthlySettlementRecord for any worker
  const getSettlementForWorker = (worker: Worker, month: string): MonthlySettlementRecord => {
    const existing = settlementRecords.find((s) => s.workerId === worker.id && s.month === month);
    if (existing) return existing;

    const wAtt = attendance.filter((a) => a.workerId === worker.id && a.date.startsWith(month));
    const pDays = wAtt.filter((a) => a.status === 'present').length;
    const hDays = wAtt.filter((a) => a.status === 'halfDay').length;
    const aDays = wAtt.filter((a) => a.status === 'absent').length;
    const grossWage = pDays * worker.dailyWage + hDays * (worker.dailyWage * 0.5);

    const wAdv = advances.filter((a) => a.workerId === worker.id && a.date.startsWith(month));
    const advanceTaken = wAdv.reduce((s, a) => s + a.amount, 0);

    const wRec = recoveries.filter((r) => r.workerId === worker.id && r.date.startsWith(month));
    const advanceRecovery = wRec.reduce((s, r) => s + r.amount, 0);

    const allAdv = advances.filter((a) => a.workerId === worker.id && a.status !== 'rejected').reduce((s, a) => s + a.amount, 0);
    const allRec = recoveries.filter((r) => r.workerId === worker.id).reduce((s, r) => s + r.amount, 0);
    const outstandingAdvance = Math.max(0, allAdv - allRec);

    const netPay = Math.max(0, grossWage - advanceRecovery);

    return {
      id: `SETTL-${worker.id}-${month}`,
      month,
      workerId: worker.id,
      siteId: worker.currentSiteId,
      sectionId: worker.currentSectionId,
      workingDays: 30,
      presentDays: pDays,
      halfDays: hDays,
      absentDays: aDays,
      grossWage,
      advanceTaken,
      advanceRecovery,
      otherDeductions: 0,
      netPay,
      foodDays: pDays + hDays * 0.5,
      commission: 0,
      commissionPaid: 0,
      outstandingAdvance,
      status: 'approved',
      remarks: 'Reconciled workforce settlement record',
    };
  };

  // Accessible workers based on supervisor permissions and active site/section filters
  const accessibleWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (isSupervisor && w.currentSiteId !== assignedSiteId) return false;
      if (filterSiteId && w.currentSiteId !== filterSiteId) return false;
      if (filterSectionId && w.currentSectionId !== filterSectionId) return false;
      if (filterWorkerType !== 'all' && w.workerType !== filterWorkerType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchId = w.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [workers, isSupervisor, assignedSiteId, filterSiteId, filterSectionId, filterWorkerType, searchQuery]);

  const accessibleWorkerIds = useMemo(() => new Set(accessibleWorkers.map((w) => w.id)), [accessibleWorkers]);

  // Accessible sections
  const accessibleSections = useMemo(() => {
    return sections.filter((s) => {
      if (isSupervisor && s.siteId !== assignedSiteId) return false;
      if (filterSiteId && s.siteId !== filterSiteId) return false;
      if (filterSectionId && s.id !== filterSectionId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchCode = s.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [sections, isSupervisor, assignedSiteId, filterSiteId, filterSectionId, searchQuery]);

  // Handle report change
  const handleSwitchReport = (repId: ReportType) => {
    setActiveReport(repId);
    setSearchParams({ report: repId });
    setExpandedSectionId(null);
    const def = reportDefinitions.find((r) => r.id === repId);
    if (def) showToast(`Switched to: ${def.name}`);
  };

  // -------------------------------------------------------------
  // COMPUTED REPORT DATASETS (with Custom Date Range support)
  // -------------------------------------------------------------

  // REPORT 1: Daily Attendance Section-Wise
  const dailySectionData = useMemo(() => {
    return accessibleSections.map((sec) => {
      const secWorkers = accessibleWorkers.filter((w) => w.currentSectionId === sec.id);
      const headcount = secWorkers.length;
      const secWorkerIds = new Set(secWorkers.map((w) => w.id));

      const dailyRecords = attendance.filter((a) => {
        if (!secWorkerIds.has(a.workerId)) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        return a.date === selectedDate;
      });

      const presentCount = dailyRecords.filter((a) => a.status === 'present').length;
      const halfDayCount = dailyRecords.filter((a) => a.status === 'halfDay').length;
      const absentCount =
        dailyRecords.filter((a) => a.status === 'absent').length +
        (dateFilterMode === 'standard' ? Math.max(0, headcount - dailyRecords.length) : 0);
      const presentMandays = presentCount + halfDayCount * 0.5;
      const divisor = dateFilterMode === 'custom' ? Math.max(1, dailyRecords.length) : Math.max(1, headcount);
      const attendanceRate = ((presentMandays / divisor) * 100).toFixed(1);

      const otHours = 0;
      const foodMeals = presentMandays;

      return {
        section: sec,
        site: sites.find((s) => s.id === sec.siteId),
        headcount,
        presentCount,
        halfDayCount,
        absentCount,
        presentMandays,
        attendanceRate,
        otHours,
        foodMeals,
        workers: secWorkers.map((w) => {
          const rec = dailyRecords.find((r) => r.workerId === w.id);
          const status = rec?.status || 'absent';
          return {
            worker: w,
            status,
            checkIn: rec?.checkIn || (status === 'absent' ? '—' : '08:00 AM'),
            checkOut: rec?.checkOut || (status === 'absent' ? '—' : status === 'halfDay' ? '01:00 PM' : '05:00 PM'),
            foodEligible: status === 'present' ? '1.0 Meal' : status === 'halfDay' ? '0.5 Meal' : 'None',
          };
        }),
      };
    });
  }, [
    accessibleSections,
    accessibleWorkers,
    attendance,
    selectedDate,
    sites,
    dateFilterMode,
    customStartDate,
    customEndDate,
  ]);

  // REPORT 2: Weekly Attendance Data
  const weeklyReportData = useMemo(() => {
    const { startDate, endDate, dayDates } = activeWeekInfo;

    // Use custom date range if toggled
    const effStartDate = dateFilterMode === 'custom' ? customStartDate : startDate;
    const effEndDate = dateFilterMode === 'custom' ? customEndDate : endDate;

    // Section-Wise Weekly Summary
    const sectionWeekly = accessibleSections.map((sec) => {
      const secWorkers = accessibleWorkers.filter((w) => w.currentSectionId === sec.id);
      const secWorkerIds = new Set(secWorkers.map((w) => w.id));
      const weekRecords = attendance.filter(
        (a) => a.date >= effStartDate && a.date <= effEndDate && secWorkerIds.has(a.workerId)
      );

      const presentCount = weekRecords.filter((a) => a.status === 'present').length;
      const halfDayCount = weekRecords.filter((a) => a.status === 'halfDay').length;
      const absentCount = weekRecords.filter((a) => a.status === 'absent').length;
      const presentMandays = presentCount + halfDayCount * 0.5;
      const maxPossibleMandays = Math.max(1, secWorkers.length * dayDates.length);
      const attendanceRate = ((presentMandays / maxPossibleMandays) * 100).toFixed(1);

      const estimatedWages = secWorkers.reduce((acc, w) => {
        const wRecs = weekRecords.filter((r) => r.workerId === w.id);
        const p = wRecs.filter((r) => r.status === 'present').length;
        const h = wRecs.filter((r) => r.status === 'halfDay').length;
        return acc + (p + h * 0.5) * w.dailyWage;
      }, 0);

      return {
        section: sec,
        site: sites.find((s) => s.id === sec.siteId),
        headcount: secWorkers.length,
        presentMandays,
        halfDayCount,
        absentCount,
        attendanceRate,
        estimatedWages,
      };
    });

    // Employee-Wise Weekly Roll
    const employeeWeekly = accessibleWorkers.map((w) => {
      const sec = sections.find((s) => s.id === w.currentSectionId);
      const wRecords = attendance.filter(
        (a) => a.date >= effStartDate && a.date <= effEndDate && a.workerId === w.id
      );

      const daysMap: Record<string, string> = {};
      dayDates.forEach((d) => {
        const r = wRecords.find((rec) => rec.date === d);
        daysMap[d] = r ? r.status : 'absent';
      });

      const pCount = Object.values(daysMap).filter((s) => s === 'present').length;
      const hCount = Object.values(daysMap).filter((s) => s === 'halfDay').length;
      const aCount = Object.values(daysMap).filter((s) => s === 'absent').length;
      const weeklyWage = (pCount + hCount * 0.5) * w.dailyWage;

      const pDates = dayDates.filter((d) => daysMap[d] === 'present');
      const aDates = dayDates.filter((d) => daysMap[d] === 'absent');

      // Multi-site places breakdown & site disbursements
      const siteDaysMap: Record<string, number> = {};
      let totalSiteDisbursed = 0;
      wRecords.forEach((rec) => {
        if (rec.status === 'present' || rec.status === 'halfDay') {
          const sId = rec.siteId || w.currentSiteId;
          if (sId) {
            const dayVal = rec.status === 'present' ? 1 : 0.5;
            siteDaysMap[sId] = (siteDaysMap[sId] || 0) + dayVal;
          }
        }
        if (rec.siteAmountGiven && rec.siteAmountGiven > 0) {
          totalSiteDisbursed += rec.siteAmountGiven;
        }
      });
      const workingSitesList = Object.entries(siteDaysMap).map(([sId, days]) => {
        const st = sites.find((s) => s.id === sId);
        return {
          siteId: sId,
          siteName: st ? st.name : sId,
          days,
          isOriginal: sId === w.currentSiteId,
        };
      });
      const isMultiSite = workingSitesList.length > 1;

      return {
        worker: w,
        section: sec,
        daysMap,
        pCount,
        hCount,
        aCount,
        pDates,
        aDates,
        weeklyWage,
        workingSitesList,
        isMultiSite,
        totalSiteDisbursed,
      };
    });

    return { sectionWeekly, employeeWeekly };
  }, [
    activeWeekInfo,
    accessibleSections,
    accessibleWorkers,
    attendance,
    sites,
    sections,
    dateFilterMode,
    customStartDate,
    customEndDate,
  ]);

  // REPORT 3: Monthly Attendance Data
  const monthlyReportData = useMemo(() => {
    // Section-Wise Monthly Summary
    const sectionMonthly = accessibleSections.map((sec) => {
      const secWorkers = accessibleWorkers.filter((w) => w.currentSectionId === sec.id);
      const secWorkerIds = new Set(secWorkers.map((w) => w.id));
      const monthRecords = attendance.filter((a) => {
        if (!secWorkerIds.has(a.workerId)) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        return a.date.startsWith(selectedMonth);
      });

      const presentCount = monthRecords.filter((a) => a.status === 'present').length;
      const halfDayCount = monthRecords.filter((a) => a.status === 'halfDay').length;
      const absentCount = monthRecords.filter((a) => a.status === 'absent').length;
      const presentMandays = presentCount + halfDayCount * 0.5;

      const [y, m] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const maxMandays = Math.max(1, secWorkers.length * daysInMonth);
      const musterRate = ((presentMandays / maxMandays) * 100).toFixed(1);

      const grossWages = secWorkers.reduce((acc, w) => {
        const wRecs = monthRecords.filter((r) => r.workerId === w.id);
        const p = wRecs.filter((r) => r.status === 'present').length;
        const h = wRecs.filter((r) => r.status === 'halfDay').length;
        return acc + (p + h * 0.5) * w.dailyWage;
      }, 0);

      return {
        section: sec,
        site: sites.find((s) => s.id === sec.siteId),
        headcount: secWorkers.length,
        daysInMonth,
        presentMandays,
        halfDayCount,
        absentCount,
        musterRate,
        grossWages,
      };
    });

    // Employee-Wise Monthly Roll
    const employeeMonthly = accessibleWorkers.map((w) => {
      const sec = sections.find((s) => s.id === w.currentSectionId);
      const wRecords = attendance.filter((a) => {
        if (a.workerId !== w.id) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        return a.date.startsWith(selectedMonth);
      });

      const pCount = wRecords.filter((a) => a.status === 'present').length;
      const hCount = wRecords.filter((a) => a.status === 'halfDay').length;
      const aCount = wRecords.filter((a) => a.status === 'absent').length;
      const totalMandays = pCount + hCount * 0.5;
      const grossWages = totalMandays * w.dailyWage;

      // Multi-site places breakdown & site disbursements
      const siteDaysMap: Record<string, number> = {};
      let totalSiteDisbursed = 0;
      wRecords.forEach((rec) => {
        if (rec.status === 'present' || rec.status === 'halfDay') {
          const sId = rec.siteId || w.currentSiteId;
          if (sId) {
            const dayVal = rec.status === 'present' ? 1 : 0.5;
            siteDaysMap[sId] = (siteDaysMap[sId] || 0) + dayVal;
          }
        }
        if (rec.siteAmountGiven && rec.siteAmountGiven > 0) {
          totalSiteDisbursed += rec.siteAmountGiven;
        }
      });
      const workingSitesList = Object.entries(siteDaysMap).map(([sId, days]) => {
        const st = sites.find((s) => s.id === sId);
        return {
          siteId: sId,
          siteName: st ? st.name : sId,
          days,
          isOriginal: sId === w.currentSiteId,
        };
      });
      const isMultiSite = workingSitesList.length > 1;

      return {
        worker: w,
        section: sec,
        pCount,
        hCount,
        aCount,
        totalMandays,
        otHours: 0,
        grossWages,
        workingSitesList,
        isMultiSite,
        totalSiteDisbursed,
      };
    });

    return { sectionMonthly, employeeMonthly };
  }, [
    accessibleSections,
    accessibleWorkers,
    attendance,
    selectedMonth,
    sites,
    sections,
    dateFilterMode,
    customStartDate,
    customEndDate,
  ]);

  // REPORT 4: Advance Payment Report Data
  const advanceReportData = useMemo(() => {
    // Filter advances and recoveries based on advancePeriod or custom dates
    const periodAdvances = advances.filter((adv) => {
      if (!accessibleWorkerIds.has(adv.workerId)) return false;
      if (dateFilterMode === 'custom') {
        return adv.date >= customStartDate && adv.date <= customEndDate;
      }
      if (advancePeriod === 'daily') return adv.date === selectedDate;
      if (advancePeriod === 'weekly') return adv.date >= activeWeekInfo.startDate && adv.date <= activeWeekInfo.endDate;
      return adv.date.startsWith(selectedMonth);
    });

    const periodRecoveries = recoveries.filter((rec) => {
      if (!accessibleWorkerIds.has(rec.workerId)) return false;
      if (dateFilterMode === 'custom') {
        return rec.date >= customStartDate && rec.date <= customEndDate;
      }
      if (advancePeriod === 'daily') return rec.date === selectedDate;
      if (advancePeriod === 'weekly') return rec.date >= activeWeekInfo.startDate && rec.date <= activeWeekInfo.endDate;
      return rec.date.startsWith(selectedMonth);
    });

    // 1. Section-Wise Advances
    const sectionAdvances = accessibleSections.map((sec) => {
      const secWorkers = accessibleWorkers.filter((w) => w.currentSectionId === sec.id);
      const secWorkerIds = new Set(secWorkers.map((w) => w.id));

      const secAdv = periodAdvances.filter((a) => secWorkerIds.has(a.workerId));
      const secRec = periodRecoveries.filter((r) => secWorkerIds.has(r.workerId));

      const totalDisbursed = secAdv.reduce((sum, a) => sum + a.amount, 0);
      const totalRecovered = secRec.reduce((sum, r) => sum + r.amount, 0);

      const allWorkerAdv = advances.filter((a) => secWorkerIds.has(a.workerId) && a.status !== 'rejected');
      const allWorkerRec = recoveries.filter((r) => secWorkerIds.has(r.workerId));
      const totalOutstanding =
        allWorkerAdv.reduce((s, a) => s + a.amount, 0) - allWorkerRec.reduce((s, r) => s + r.amount, 0);

      return {
        section: sec,
        site: sites.find((s) => s.id === sec.siteId),
        borrowersCount: new Set(secAdv.map((a) => a.workerId)).size,
        totalDisbursed,
        totalRecovered,
        totalOutstanding: Math.max(0, totalOutstanding),
      };
    });

    // 2. Employee-Wise Advances
    const employeeAdvances = periodAdvances.map((adv) => {
      const w = workers.find((wk) => wk.id === adv.workerId);
      const sec = sections.find((s) => s.id === w?.currentSectionId);
      const workerRecs = recoveries.filter((r) => r.advanceId === adv.id);
      const recoveredForAdv = workerRecs.reduce((sum, r) => sum + r.amount, 0);
      const remainingBalance = Math.max(0, adv.amount - recoveredForAdv);

      return {
        advance: adv,
        worker: w,
        section: sec,
        recoveredForAdv,
        remainingBalance,
      };
    });

    // 3. Referral & Agents-Wise
    const agentAdvances = referrers.map((ref) => {
      const sourcedWorkers = workers.filter((w) => w.referrerId === ref.id && accessibleWorkerIds.has(w.id));
      const sourcedCount = sourcedWorkers.length;

      const commEarned = sourcedWorkers.reduce((acc, w) => {
        const wAtt = attendance.filter((a) => {
          if (a.workerId !== w.id) return false;
          if (dateFilterMode === 'custom') {
            return a.date >= customStartDate && a.date <= customEndDate;
          }
          if (advancePeriod === 'daily') return a.date === selectedDate;
          if (advancePeriod === 'weekly')
            return a.date >= activeWeekInfo.startDate && a.date <= activeWeekInfo.endDate;
          return a.date.startsWith(selectedMonth);
        });
        const pDays = wAtt.filter((a) => a.status === 'present').length;
        const hDays = wAtt.filter((a) => a.status === 'halfDay').length;
        const mandays = pDays + hDays * 0.5;
        const rate = w.commissionRate || 30;
        return acc + mandays * rate;
      }, 0);

      const refAdv = advances.filter((a) => a.remarks?.includes(ref.name) || a.workerId === ref.workerId);
      const advTaken = refAdv.reduce((s, a) => s + a.amount, 0);
      const paid = Math.min(commEarned, 5000);
      const balancePayable = Math.max(0, commEarned - advTaken);

      return {
        referrer: ref,
        sourcedCount,
        commEarned,
        advTaken,
        paid,
        balancePayable,
      };
    });

    return { sectionAdvances, employeeAdvances, agentAdvances };
  }, [
    advances,
    recoveries,
    accessibleWorkerIds,
    dateFilterMode,
    customStartDate,
    customEndDate,
    advancePeriod,
    selectedDate,
    activeWeekInfo,
    selectedMonth,
    accessibleSections,
    accessibleWorkers,
    sites,
    workers,
    sections,
    referrers,
    attendance,
  ]);

  // REPORT 5: Food Report Data
  const foodReportData = useMemo(() => {
    // 1. Section-Wise Food
    const sectionFood = accessibleSections.map((sec) => {
      const secWorkers = accessibleWorkers.filter((w) => w.currentSectionId === sec.id);
      const secWorkerIds = new Set(secWorkers.map((w) => w.id));

      const secAtt = attendance.filter((a) => {
        if (!secWorkerIds.has(a.workerId)) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        if (foodPeriod === 'daily') return a.date === selectedDate;
        if (foodPeriod === 'weekly') return a.date >= activeWeekInfo.startDate && a.date <= activeWeekInfo.endDate;
        return a.date.startsWith(selectedMonth);
      });

      const presentCount = secAtt.filter((a) => a.status === 'present').length;
      const halfDayCount = secAtt.filter((a) => a.status === 'halfDay').length;
      const totalMealUnits = presentCount * 1 + halfDayCount * 0.5;

      const secOrders = foodOrders.filter((o) => {
        if (o.sectionId !== sec.id) return false;
        if (dateFilterMode === 'custom') {
          return o.date >= customStartDate && o.date <= customEndDate;
        }
        if (foodPeriod === 'daily') return o.date === selectedDate;
        if (foodPeriod === 'weekly') return o.date >= activeWeekInfo.startDate && o.date <= activeWeekInfo.endDate;
        return o.date.startsWith(selectedMonth);
      });

      const indented = secOrders.reduce((sum, o) => sum + (o.totalOrderedQty || 0), 0) || totalMealUnits;
      const dispatched = secOrders.reduce((sum, o) => sum + (o.dispatchedQty || o.totalOrderedQty || 0), 0) || totalMealUnits;
      const received = secOrders.reduce((sum, o) => sum + (o.receivedQty || o.totalOrderedQty || 0), 0) || totalMealUnits;
      const shortage = Math.max(0, indented - received);

      return {
        section: sec,
        site: sites.find((s) => s.id === sec.siteId),
        headcount: secWorkers.length,
        indented,
        dispatched,
        received,
        shortage,
        totalMealUnits,
        estimatedFoodCost: totalMealUnits * 65,
      };
    });

    // 2. Employee-Wise Food
    const employeeFood = accessibleWorkers.map((w) => {
      const sec = sections.find((s) => s.id === w.currentSectionId);

      const wAtt = attendance.filter((a) => {
        if (a.workerId !== w.id) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        if (foodPeriod === 'daily') return a.date === selectedDate;
        if (foodPeriod === 'weekly') return a.date >= activeWeekInfo.startDate && a.date <= activeWeekInfo.endDate;
        return a.date.startsWith(selectedMonth);
      });

      const pCount = wAtt.filter((a) => a.status === 'present').length;
      const hCount = wAtt.filter((a) => a.status === 'halfDay').length;
      const mealUnits = pCount * 1 + hCount * 0.5;
      const isEligible = mealUnits > 0;

      return {
        worker: w,
        section: sec,
        pCount,
        hCount,
        mealUnits,
        isEligible,
        estimatedCost: mealUnits * 65,
      };
    });

    return { sectionFood, employeeFood };
  }, [
    accessibleSections,
    accessibleWorkers,
    attendance,
    dateFilterMode,
    customStartDate,
    customEndDate,
    foodPeriod,
    selectedDate,
    activeWeekInfo,
    selectedMonth,
    foodOrders,
    sites,
    sections,
  ]);

  // REPORT 6: Overall 360° Reports Data
  const overallReportData = useMemo(() => {
    return accessibleWorkers.map((w) => {
      const sec = sections.find((s) => s.id === w.currentSectionId);
      const site = sites.find((s) => s.id === w.currentSiteId);

      const wAtt = attendance.filter((a) => {
        if (a.workerId !== w.id) return false;
        if (dateFilterMode === 'custom') {
          return a.date >= customStartDate && a.date <= customEndDate;
        }
        if (overallPeriod === 'daily') return a.date === selectedDate;
        if (overallPeriod === 'weekly') return a.date >= activeWeekInfo.startDate && a.date <= activeWeekInfo.endDate;
        if (overallPeriod === 'monthly') return a.date.startsWith(selectedMonth);
        return true; // Overall / Lifetime
      });

      const pCount = wAtt.filter((a) => a.status === 'present').length;
      const hCount = wAtt.filter((a) => a.status === 'halfDay').length;
      const aCount = wAtt.filter((a) => a.status === 'absent').length;
      const mandays = pCount + hCount * 0.5;

      const mealUnits = mandays;

      const wAdv = advances.filter((adv) => {
        if (adv.workerId !== w.id || adv.status === 'rejected') return false;
        if (dateFilterMode === 'custom') {
          return adv.date >= customStartDate && adv.date <= customEndDate;
        }
        if (overallPeriod === 'daily') return adv.date === selectedDate;
        if (overallPeriod === 'weekly') return adv.date >= activeWeekInfo.startDate && adv.date <= activeWeekInfo.endDate;
        if (overallPeriod === 'monthly') return adv.date.startsWith(selectedMonth);
        return true;
      });

      const wRec = recoveries.filter((rec) => {
        if (rec.workerId !== w.id) return false;
        if (dateFilterMode === 'custom') {
          return rec.date >= customStartDate && rec.date <= customEndDate;
        }
        if (overallPeriod === 'daily') return rec.date === selectedDate;
        if (overallPeriod === 'weekly') return rec.date >= activeWeekInfo.startDate && rec.date <= activeWeekInfo.endDate;
        if (overallPeriod === 'monthly') return rec.date.startsWith(selectedMonth);
        return true;
      });

      const grossWages = mandays * w.dailyWage;
      const advancesTaken = wAdv.reduce((sum, a) => sum + a.amount, 0);
      const advanceDeducted = wRec.reduce((sum, r) => sum + r.amount, 0);
      const netPayout = Math.max(0, grossWages - advanceDeducted);

      const allAdv = advances.filter((a) => a.workerId === w.id && a.status !== 'rejected').reduce((s, a) => s + a.amount, 0);
      const allRec = recoveries.filter((r) => r.workerId === w.id).reduce((s, r) => s + r.amount, 0);
      const totalOutstanding = Math.max(0, allAdv - allRec);

      // Multi-site places breakdown & site disbursements
      const siteDaysMap: Record<string, number> = {};
      let totalSiteDisbursed = 0;
      wAtt.forEach((rec) => {
        if (rec.status === 'present' || rec.status === 'halfDay') {
          const sId = rec.siteId || w.currentSiteId;
          if (sId) {
            const dayVal = rec.status === 'present' ? 1 : 0.5;
            siteDaysMap[sId] = (siteDaysMap[sId] || 0) + dayVal;
          }
        }
        if (rec.siteAmountGiven && rec.siteAmountGiven > 0) {
          totalSiteDisbursed += rec.siteAmountGiven;
        }
      });
      const workingSitesList = Object.entries(siteDaysMap).map(([sId, days]) => {
        const st = sites.find((s) => s.id === sId);
        return {
          siteId: sId,
          siteName: st ? st.name : sId,
          days,
          isOriginal: sId === w.currentSiteId,
        };
      });
      const isMultiSite = workingSitesList.length > 1;

      return {
        worker: w,
        site,
        section: sec,
        pCount,
        hCount,
        aCount,
        mandays,
        mealUnits,
        grossWages,
        advancesTaken,
        advanceDeducted,
        netPayout,
        totalOutstanding,
        workingSitesList,
        isMultiSite,
        totalSiteDisbursed,
      };
    });
  }, [
    accessibleWorkers,
    sections,
    sites,
    attendance,
    dateFilterMode,
    customStartDate,
    customEndDate,
    overallPeriod,
    selectedDate,
    activeWeekInfo,
    selectedMonth,
    advances,
    recoveries,
  ]);

  // -------------------------------------------------------------
  // REPORT 7: EMPLOYEES TRANSFERS & MIGRATIONS AUDIT DATA
  // -------------------------------------------------------------
  const transfersReportData = useMemo(() => {
    // 1. Accessibility Filter
    let list = siteMigrations.filter((m) => accessibleWorkerIds.has(m.workerId));

    // 2. Date Filtering (Standard vs Custom "custmaigestion with date")
    if (dateFilterMode === 'custom') {
      list = list.filter((m) => m.date >= customStartDate && m.date <= customEndDate);
    } else {
      if (transfersPeriod === 'daily') {
        list = list.filter((m) => m.date === selectedDate);
      } else if (transfersPeriod === 'weekly') {
        list = list.filter((m) => m.date >= activeWeekInfo.startDate && m.date <= activeWeekInfo.endDate);
      } else if (transfersPeriod === 'monthly') {
        list = list.filter((m) => m.date.startsWith(selectedMonth));
      }
      // 'all' leaves unfiltered across all time
    }

    // 3. Site Filter (matches origin or destination)
    if (filterSiteId) {
      list = list.filter((m) => m.fromSiteId === filterSiteId || m.toSiteId === filterSiteId);
    }

    // 4. Section Filter (matches origin or destination)
    if (filterSectionId) {
      list = list.filter((m) => m.fromSectionId === filterSectionId || m.toSectionId === filterSectionId);
    }

    // 5. Worker Type Filter (Company vs Outside)
    if (filterWorkerType !== 'all') {
      list = list.filter((m) => {
        const w = workers.find((wk) => wk.id === m.workerId);
        return w?.workerType === filterWorkerType;
      });
    }

    // 6. Transfer Nature / Scope Filter (Permanent vs Temporary)
    if (transfersNature !== 'all') {
      list = list.filter((m) => m.migrationType === transfersNature);
    }

    // 7. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => {
        const w = workers.find((wk) => wk.id === m.workerId);
        const fSite = sites.find((s) => s.id === m.fromSiteId);
        const tSite = sites.find((s) => s.id === m.toSiteId);
        const fSec = sections.find((s) => s.id === m.fromSectionId);
        const tSec = sections.find((s) => s.id === m.toSectionId);

        return (
          m.id.toLowerCase().includes(q) ||
          m.workerId.toLowerCase().includes(q) ||
          w?.name.toLowerCase().includes(q) ||
          w?.designation?.toLowerCase().includes(q) ||
          w?.purpose?.toLowerCase().includes(q) ||
          fSite?.name.toLowerCase().includes(q) ||
          tSite?.name.toLowerCase().includes(q) ||
          fSec?.name.toLowerCase().includes(q) ||
          tSec?.name.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          m.approvedBy.toLowerCase().includes(q)
        );
      });
    }

    // Sort by effective date descending
    list.sort((a, b) => b.date.localeCompare(a.date));

    // Segregate into Site Transfers vs Section Transfers
    const siteTransfers = list.filter((m) => m.fromSiteId !== m.toSiteId);
    const sectionTransfers = list.filter((m) => m.fromSiteId === m.toSiteId);

    const activeList =
      transfersSubView === 'site'
        ? siteTransfers
        : transfersSubView === 'section'
        ? sectionTransfers
        : list;

    const totalTransfers = list.length;
    const totalSiteTransfers = siteTransfers.length;
    const totalSectionTransfers = sectionTransfers.length;
    const permanentTransfers = list.filter((m) => m.migrationType === 'permanent').length;
    const temporaryTransfers = list.filter((m) => m.migrationType === 'temporary').length;
    const uniqueWorkersCount = new Set(list.map((m) => m.workerId)).size;

    return {
      allTransfers: list,
      siteTransfers,
      sectionTransfers,
      activeList,
      totalTransfers,
      totalSiteTransfers,
      totalSectionTransfers,
      permanentTransfers,
      temporaryTransfers,
      uniqueWorkersCount,
    };
  }, [
    siteMigrations,
    accessibleWorkerIds,
    dateFilterMode,
    customStartDate,
    customEndDate,
    transfersPeriod,
    selectedDate,
    activeWeekInfo,
    selectedMonth,
    filterSiteId,
    filterSectionId,
    filterWorkerType,
    transfersNature,
    searchQuery,
    transfersSubView,
    workers,
    sites,
    sections,
  ]);

  // -------------------------------------------------------------
  // UNIVERSAL EXPORT CONFIGURATION BUILDER (with Custom Audit Details)
  // -------------------------------------------------------------
  const exportPayload = useMemo(() => {
    const siteObj = sites.find((s) => s.id === filterSiteId);
    const secObj = sections.find((s) => s.id === filterSectionId);
    const filterSummary = [
      { label: 'Project Site', value: siteObj ? siteObj.name : 'All Project Sites' },
      { label: 'Work Section', value: secObj ? secObj.name : 'All Work Sections' },
      { label: 'Worker Type', value: filterWorkerType.toUpperCase() },
      { label: 'Date Mode', value: dateFilterMode === 'custom' ? `Custom (${customStartDate} to ${customEndDate})` : 'Standard Cycle' },
    ];

    let reportTitle = '';
    let subtitle = '';
    let periodLabel =
      dateFilterMode === 'custom' ? `Custom Range: ${customStartDate} to ${customEndDate}` : '';
    let summaryKpis: ReportKpi[] = [];
    let tableHeaders: string[] = [];
    let tableRows: Array<Array<string | number>> = [];
    let customAuditDetails: CustomAuditSlipDetails | undefined = undefined;

    // Calculate aggregated present/absent dates and advance log across active workers for custom audit export
    const activeAtt = attendance.filter((a) => {
      if (!accessibleWorkerIds.has(a.workerId)) return false;
      if (dateFilterMode === 'custom') {
        return a.date >= customStartDate && a.date <= customEndDate;
      }
      if (activeReport === 'daily-attendance-section') return a.date === selectedDate;
      if (activeReport === 'weekly-attendance') return a.date >= activeWeekInfo.startDate && a.date <= activeWeekInfo.endDate;
      return a.date.startsWith(selectedMonth);
    });

    const presentDatesSet = Array.from(
      new Set(activeAtt.filter((a) => a.status === 'present').map((a) => a.date))
    ).sort();
    const absentDatesSet = Array.from(
      new Set(activeAtt.filter((a) => a.status === 'absent').map((a) => a.date))
    ).sort();

    const activeAdv = advances.filter((adv) => {
      if (!accessibleWorkerIds.has(adv.workerId) || adv.status === 'rejected') return false;
      if (dateFilterMode === 'custom') {
        return adv.date >= customStartDate && adv.date <= customEndDate;
      }
      return adv.date.startsWith(selectedMonth);
    });

    const activeRec = recoveries.filter((rec) => {
      if (!accessibleWorkerIds.has(rec.workerId)) return false;
      if (dateFilterMode === 'custom') {
        return rec.date >= customStartDate && rec.date <= customEndDate;
      }
      return rec.date.startsWith(selectedMonth);
    });

    const advancePaymentsList = [
      ...activeAdv.map((a) => ({ date: a.date, amount: a.amount, reason: a.reason, type: 'advance' as const })),
      ...activeRec.map((r) => ({ date: r.date, amount: r.amount, reason: r.remarks, type: 'recovery' as const })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const lastPresentDateStr =
      presentDatesSet.length > 0 ? presentDatesSet[presentDatesSet.length - 1] : selectedDate;

    // Calculate last present running balance across visible workforce
    const totalGrossUpToLastPresent = activeAtt
      .filter((a) => a.date <= lastPresentDateStr && (a.status === 'present' || a.status === 'halfDay'))
      .reduce((sum, a) => {
        const w = workers.find((wk) => wk.id === a.workerId);
        const rate = w?.dailyWage || 600;
        return sum + (a.status === 'present' ? rate : rate * 0.5);
      }, 0);

    const totalAdvUpToLastPresent = activeRec
      .filter((r) => r.date <= lastPresentDateStr)
      .reduce((sum, r) => sum + r.amount, 0);

    const calculatedLastPresentRunningBalance = Math.max(0, totalGrossUpToLastPresent - totalAdvUpToLastPresent);

    const totalLifetimeGross = attendance
      .filter((a) => accessibleWorkerIds.has(a.workerId) && (a.status === 'present' || a.status === 'halfDay'))
      .reduce((sum, a) => {
        const w = workers.find((wk) => wk.id === a.workerId);
        const rate = w?.dailyWage || 600;
        return sum + (a.status === 'present' ? rate : rate * 0.5);
      }, 0);
    const totalLifetimeRecovered = recoveries
      .filter((r) => accessibleWorkerIds.has(r.workerId))
      .reduce((sum, r) => sum + r.amount, 0);
    const totalLifetimePaid = payments
      .filter((p) => accessibleWorkerIds.has(p.workerId) && p.status === 'paid')
      .reduce((sum, p) => sum + p.netPay, 0);
    const calculatedOverallClosingBalance = Math.max(0, totalLifetimeGross - totalLifetimeRecovered - totalLifetimePaid);

    // Calculate site-wise working place & food distribution (Original Site vs Other Sites)
    const workingPlacesMap: Record<
      string,
      {
        siteId: string;
        siteName: string;
        isOriginalSite: boolean;
        siteType: 'original' | 'other';
        daysCount: number;
        mandays: number;
        foodCount: number;
        dates: string[];
      }
    > = {};

    activeAtt
      .filter((a) => a.status === 'present' || a.status === 'halfDay')
      .forEach((a) => {
        const w = workers.find((wk) => wk.id === a.workerId);
        const origSiteId = w?.currentSiteId;
        const sId = a.siteId || origSiteId || 'default';
        const sName =
          sites.find((s) => s.id === sId)?.name ||
          (sId !== 'default' ? sId : 'Assigned Site');
        const isOrig = origSiteId ? sId === origSiteId : false;
        const dayVal = a.status === 'present' ? 1 : 0.5;

        if (!workingPlacesMap[sId]) {
          workingPlacesMap[sId] = {
            siteId: sId,
            siteName: sName,
            isOriginalSite: isOrig,
            siteType: isOrig ? 'original' : 'other',
            daysCount: 0,
            mandays: 0,
            foodCount: 0,
            dates: [],
          };
        }
        workingPlacesMap[sId].daysCount += 1;
        workingPlacesMap[sId].mandays += dayVal;
        workingPlacesMap[sId].foodCount += dayVal;
        workingPlacesMap[sId].dates.push(a.date);
      });

    const calculatedWorkingPlacesBreakdown = Object.values(workingPlacesMap)
      .filter((wp) => wp.daysCount > 0)
      .sort((a, b) => {
        if (a.isOriginalSite && !b.isOriginalSite) return -1;
        if (!a.isOriginalSite && b.isOriginalSite) return 1;
        return b.daysCount - a.daysCount;
      });

    // Calculate Transfer & Migration History in scope for Custom Audit Export
    const calculatedTransferHistory = siteMigrations
      .filter((m) => {
        if (!accessibleWorkerIds.has(m.workerId)) return false;
        if (dateFilterMode === 'custom') {
          return m.date >= customStartDate && m.date <= customEndDate;
        }
        if (activeReport === 'daily-attendance-section') return m.date === selectedDate;
        if (activeReport === 'weekly-attendance') {
          return m.date >= activeWeekInfo.startDate && m.date <= activeWeekInfo.endDate;
        }
        if (activeReport === 'transfers-report') {
          if (transfersPeriod === 'daily') return m.date === selectedDate;
          if (transfersPeriod === 'weekly')
            return m.date >= activeWeekInfo.startDate && m.date <= activeWeekInfo.endDate;
          if (transfersPeriod === 'monthly') return m.date.startsWith(selectedMonth);
          return true;
        }
        return m.date.startsWith(selectedMonth);
      })
      .map((m) => {
        const w = workers.find((wk) => wk.id === m.workerId);
        const fSite = sites.find((s) => s.id === m.fromSiteId);
        const tSite = sites.find((s) => s.id === m.toSiteId);
        const fSec = sections.find((s) => s.id === m.fromSectionId);
        const tSec = sections.find((s) => s.id === m.toSectionId);
        const isSite = m.fromSiteId !== m.toSiteId;

        return {
          id: m.id,
          date: m.date,
          type: (isSite ? 'site' : 'section') as 'site' | 'section',
          workerId: m.workerId,
          workerName: w?.name,
          fromSiteName: fSite?.name || m.fromSiteId || '—',
          fromSectionName: fSec?.name || m.fromSectionId || '—',
          toSiteName: tSite?.name || m.toSiteId || '—',
          toSectionName: tSec?.name || m.toSectionId || '—',
          scope: m.migrationType,
          reason: m.reason,
          approvedBy: m.approvedBy,
          remarks: m.remarks,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    customAuditDetails = {
      totalPresentCount: presentDatesSet.length,
      presentDates: presentDatesSet,
      totalAbsentCount: absentDatesSet.length,
      absentDates: absentDatesSet,
      workingPlacesBreakdown: calculatedWorkingPlacesBreakdown,
      transferHistory: calculatedTransferHistory,
      advancePayments: advancePaymentsList,
      lastPresentDate: lastPresentDateStr,
      lastPresentRunningBalance: calculatedLastPresentRunningBalance,
      overallClosingBalance: calculatedOverallClosingBalance,
      workerSignature: 'Acknowledged Workforce Rep',
      supervisorSignature: currentUser?.name || 'Site Supervisor (Official Seal)',
    };

    if (activeReport === 'daily-attendance-section') {
      reportTitle = 'Daily Attendance Report (Section-Wise)';
      subtitle = 'Statutory Daily Section Workforce Attendance, Overtime & Food Roll';
      if (!periodLabel) periodLabel = `Date: ${selectedDate}`;

      const totalSections = dailySectionData.length;
      const totalHeadcount = dailySectionData.reduce((s, d) => s + d.headcount, 0);
      const totalPresent = dailySectionData.reduce((s, d) => s + d.presentCount, 0);
      const totalMeals = dailySectionData.reduce((s, d) => s + d.foodMeals, 0);

      summaryKpis = [
        { label: 'Active Sections', value: totalSections, color: '#2563eb' },
        { label: 'Total Workers', value: totalHeadcount, color: '#0f172a' },
        { label: 'Present Today', value: totalPresent, color: '#059669' },
        { label: 'Food Meals', value: `${totalMeals} units`, color: '#d97706' },
      ];

      tableHeaders = ['Section Code', 'Section Name', 'Parent Site', 'Headcount', 'Present', 'Half Day', 'Absent', 'Attendance %', 'Food Units'];
      tableRows = dailySectionData.map((d) => [
        d.section.code,
        d.section.name,
        d.site?.name || '—',
        d.headcount,
        d.presentCount,
        d.halfDayCount,
        d.absentCount,
        `${d.attendanceRate}%`,
        d.foodMeals,
      ]);
    } else if (activeReport === 'weekly-attendance') {
      reportTitle = `Weekly Attendance Report (${weeklyViewMode === 'section' ? 'Section-Wise' : 'Employee-Wise'})`;
      subtitle = '7-Day Statutory Weekly Workforce Muster Roll & Wage Computation';
      if (!periodLabel) periodLabel = activeWeekInfo.label;

      if (weeklyViewMode === 'section') {
        const totalPresent = weeklyReportData.sectionWeekly.reduce((s, d) => s + d.presentMandays, 0);
        const totalWages = weeklyReportData.sectionWeekly.reduce((s, d) => s + d.estimatedWages, 0);

        summaryKpis = [
          { label: 'Sections Audited', value: weeklyReportData.sectionWeekly.length, color: '#2563eb' },
          { label: 'Present Mandays', value: `${totalPresent} days`, color: '#059669' },
          { label: 'Est. Wage Bill', value: `₹${totalWages.toLocaleString()}`, color: '#2563eb' },
        ];

        tableHeaders = ['Section Code', 'Section Name', 'Parent Site', 'Headcount', 'Present Mandays', 'Half Days', 'Absences', 'Weekly Rate %', 'Gross Wages'];
        tableRows = weeklyReportData.sectionWeekly.map((d) => [
          d.section.code,
          d.section.name,
          d.site?.name || '—',
          d.headcount,
          d.presentMandays,
          d.halfDayCount,
          d.absentCount,
          `${d.attendanceRate}%`,
          `₹${d.estimatedWages.toLocaleString()}`,
        ]);
      } else {
        const totalWages = weeklyReportData.employeeWeekly.reduce((s, d) => s + d.weeklyWage, 0);
        summaryKpis = [
          { label: 'Total Workers', value: weeklyReportData.employeeWeekly.length, color: '#2563eb' },
          { label: 'Total Weekly Wages', value: `₹${totalWages.toLocaleString()}`, color: '#059669' },
        ];

        tableHeaders = ['Worker ID', 'Worker Name', 'Purpose', 'Section', 'Working Places (Sites)', 'Present Days', 'Half Days', 'Absent Days', 'Weekly Gross Wages'];
        tableRows = weeklyReportData.employeeWeekly.map((d) => [
          d.worker.id,
          d.worker.name,
          d.worker.designation || d.worker.purpose || '—',
          d.section?.name || '—',
          d.workingSitesList.map((s) => `${s.siteName} (${s.days}d)`).join(', ') || 'None',
          `${d.pCount} days`,
          d.hCount,
          d.aCount,
          `₹${d.weeklyWage.toLocaleString()}`,
        ]);
      }
    } else if (activeReport === 'monthly-attendance') {
      reportTitle = `Monthly Attendance Report (${monthlyViewMode === 'section' ? 'Section-Wise' : 'Employee-Wise'})`;
      subtitle = 'Statutory Monthly Labor Muster Sheet & Gross Payout Audit';
      if (!periodLabel) periodLabel = `Month: ${selectedMonth}`;

      if (monthlyViewMode === 'section') {
        const totalMandays = monthlyReportData.sectionMonthly.reduce((s, d) => s + d.presentMandays, 0);
        const totalWages = monthlyReportData.sectionMonthly.reduce((s, d) => s + d.grossWages, 0);

        summaryKpis = [
          { label: 'Sections', value: monthlyReportData.sectionMonthly.length, color: '#2563eb' },
          { label: 'Monthly Mandays', value: `${totalMandays} days`, color: '#059669' },
          { label: 'Total Gross Wages', value: `₹${totalWages.toLocaleString()}`, color: '#0f172a' },
        ];

        tableHeaders = ['Section Code', 'Section Name', 'Parent Site', 'Workers', 'Present Mandays', 'Half Days', 'Absences', 'Muster Rate %', 'Gross Wage Bill'];
        tableRows = monthlyReportData.sectionMonthly.map((d) => [
          d.section.code,
          d.section.name,
          d.site?.name || '—',
          d.headcount,
          d.presentMandays,
          d.halfDayCount,
          d.absentCount,
          `${d.musterRate}%`,
          `₹${d.grossWages.toLocaleString()}`,
        ]);
      } else {
        const totalWages = monthlyReportData.employeeMonthly.reduce((s, d) => s + d.grossWages, 0);
        summaryKpis = [
          { label: 'Workers Audited', value: monthlyReportData.employeeMonthly.length, color: '#2563eb' },
          { label: 'Total Wages Earned', value: `₹${totalWages.toLocaleString()}`, color: '#059669' },
        ];

        tableHeaders = ['Worker ID', 'Worker Name', 'Purpose', 'Section', 'Working Places (Sites)', 'Daily Wage', 'Full Days', 'Half Days', 'Absences', 'Mandays', 'Monthly Wages'];
        tableRows = monthlyReportData.employeeMonthly.map((d) => [
          d.worker.id,
          d.worker.name,
          d.worker.designation || d.worker.purpose || '—',
          d.section?.name || '—',
          d.workingSitesList.map((s) => `${s.siteName} (${s.days}d)`).join(', ') || 'None',
          `₹${d.worker.dailyWage}`,
          d.pCount,
          d.hCount,
          d.aCount,
          d.totalMandays,
          `₹${d.grossWages.toLocaleString()}`,
        ]);
      }
    } else if (activeReport === 'advance-payments') {
      reportTitle = `Advance Payment Report (${advanceDimension.toUpperCase()} - ${advancePeriod.toUpperCase()})`;
      subtitle = 'Cash Advances, Wage Cuts, Recoveries & Outstanding Balances';
      if (!periodLabel) {
        periodLabel =
          advancePeriod === 'daily'
            ? `Date: ${selectedDate}`
            : advancePeriod === 'weekly'
            ? activeWeekInfo.label
            : `Month: ${selectedMonth}`;
      }

      if (advanceDimension === 'section') {
        const totalDisbursed = advanceReportData.sectionAdvances.reduce((s, d) => s + d.totalDisbursed, 0);
        const totalRecovered = advanceReportData.sectionAdvances.reduce((s, d) => s + d.totalRecovered, 0);
        const totalOutstanding = advanceReportData.sectionAdvances.reduce((s, d) => s + d.totalOutstanding, 0);

        summaryKpis = [
          { label: 'Advances Issued', value: `₹${totalDisbursed.toLocaleString()}`, color: '#2563eb' },
          { label: 'Recovered in Period', value: `₹${totalRecovered.toLocaleString()}`, color: '#059669' },
          { label: 'Current Outstanding', value: `₹${totalOutstanding.toLocaleString()}`, color: '#d97706' },
        ];

        tableHeaders = ['Section Code', 'Section Name', 'Parent Site', 'Active Borrowers', 'Advances Issued', 'Recovered', 'Outstanding Balance'];
        tableRows = advanceReportData.sectionAdvances.map((d) => [
          d.section.code,
          d.section.name,
          d.site?.name || '—',
          d.borrowersCount,
          `₹${d.totalDisbursed.toLocaleString()}`,
          `₹${d.totalRecovered.toLocaleString()}`,
          `₹${d.totalOutstanding.toLocaleString()}`,
        ]);
      } else if (advanceDimension === 'employee') {
        tableHeaders = ['Advance ID', 'Date', 'Worker Name (ID)', 'Purpose', 'Section', 'Principal', 'Recovered', 'Remaining Bal.', 'Status'];
        tableRows = advanceReportData.employeeAdvances.map((d) => [
          d.advance.id,
          d.advance.date,
          `${d.worker?.name || d.advance.workerId} (${d.advance.workerId})`,
          d.worker?.designation || d.worker?.purpose || '—',
          d.section?.name || '—',
          `₹${d.advance.amount.toLocaleString()}`,
          `₹${d.recoveredForAdv.toLocaleString()}`,
          `₹${d.remainingBalance.toLocaleString()}`,
          d.advance.status.toUpperCase(),
        ]);
      } else {
        tableHeaders = ['Agent / Referrer Name', 'Type', 'Workers Sourced', 'Commission Accrued', 'Advances Issued', 'Paid Out', 'Net Balance'];
        tableRows = advanceReportData.agentAdvances.map((d) => [
          d.referrer.name,
          d.referrer.type === 'agency' ? 'External Contractor' : 'Senior Employee',
          d.sourcedCount,
          `₹${d.commEarned.toLocaleString()}`,
          `₹${d.advTaken.toLocaleString()}`,
          `₹${d.paid.toLocaleString()}`,
          `₹${d.balancePayable.toLocaleString()}`,
        ]);
      }
    } else if (activeReport === 'food-report') {
      reportTitle = `Food Consumption Report (${foodDimension.toUpperCase()} - ${foodPeriod.toUpperCase()})`;
      subtitle = 'Canteen Distribution, Meal Units & Subsistence Cost Audit';
      if (!periodLabel) {
        periodLabel =
          foodPeriod === 'daily'
            ? `Date: ${selectedDate}`
            : foodPeriod === 'weekly'
            ? activeWeekInfo.label
            : `Month: ${selectedMonth}`;
      }

      if (foodDimension === 'section') {
        const totalMeals = foodReportData.sectionFood.reduce((s, d) => s + d.totalMealUnits, 0);
        const totalCost = foodReportData.sectionFood.reduce((s, d) => s + d.estimatedFoodCost, 0);

        summaryKpis = [
          { label: 'Total Meal Units', value: `${totalMeals} units`, color: '#d97706' },
          { label: 'Estimated Food Cost', value: `₹${totalCost.toLocaleString()}`, color: '#2563eb' },
        ];

        tableHeaders = ['Section Code', 'Section Name', 'Parent Site', 'Headcount', 'Indented', 'Dispatched', 'Received', 'Consumed Units', 'Food Cost'];
        tableRows = foodReportData.sectionFood.map((d) => [
          d.section.code,
          d.section.name,
          d.site?.name || '—',
          d.headcount,
          d.indented,
          d.dispatched,
          d.received,
          `${d.totalMealUnits} units`,
          `₹${d.estimatedFoodCost.toLocaleString()}`,
        ]);
      } else {
        tableHeaders = ['Worker ID', 'Worker Name', 'Purpose', 'Section', 'Present Days', 'Half Days', 'Meal Units Consumed', 'Food Eligibility', 'Estimated Cost'];
        tableRows = foodReportData.employeeFood.map((d) => [
          d.worker.id,
          d.worker.name,
          d.worker.designation || d.worker.purpose || '—',
          d.section?.name || '—',
          d.pCount,
          d.hCount,
          `${d.mealUnits} meals`,
          d.isEligible ? 'Eligible' : 'Not Eligible',
          `₹${d.estimatedCost.toLocaleString()}`,
        ]);
      }
    } else if (activeReport === 'overall-reports') {
      reportTitle = `Overall 360° Employee Dossier (${overallPeriod.toUpperCase()})`;
      subtitle = 'Unified Audit: Attendance, Food Consumption & Financial Wage/Advance Settlements';
      if (!periodLabel) {
        periodLabel =
          overallPeriod === 'daily'
            ? `Date: ${selectedDate}`
            : overallPeriod === 'weekly'
            ? activeWeekInfo.label
            : overallPeriod === 'monthly'
            ? `Month: ${selectedMonth}`
            : 'Lifetime Cumulative Master';
      }

      const totalWorkers = overallReportData.length;
      const totalGross = overallReportData.reduce((s, d) => s + d.grossWages, 0);
      const totalNet = overallReportData.reduce((s, d) => s + d.netPayout, 0);
      const totalDebt = overallReportData.reduce((s, d) => s + d.totalOutstanding, 0);

      summaryKpis = [
        { label: 'Audited Workers', value: totalWorkers, color: '#2563eb' },
        { label: 'Gross Wages', value: `₹${totalGross.toLocaleString()}`, color: '#0f172a' },
        { label: 'Net Cash Payout', value: `₹${totalNet.toLocaleString()}`, color: '#059669' },
        { label: 'Outstanding Debt', value: `₹${totalDebt.toLocaleString()}`, color: '#d97706' },
      ];

      tableHeaders = ['Worker ID', 'Worker Name', 'Purpose', 'Home Site / Section', 'Working Places (Sites)', 'Mandays', 'Meals', 'Gross Wages', 'Advances Taken', 'Recovered', 'Net Payable', 'Outstanding'];
      tableRows = overallReportData.map((d) => [
        d.worker.id,
        d.worker.name,
        d.worker.designation || d.worker.purpose || '—',
        `${d.site?.name || '—'} / ${d.section?.name || '—'}`,
        d.workingSitesList.map((s) => `${s.siteName} (${s.days}d)`).join(', ') || 'None',
        d.mandays,
        d.mealUnits,
        `₹${d.grossWages.toLocaleString()}`,
        `₹${d.advancesTaken.toLocaleString()}`,
        `₹${d.advanceDeducted.toLocaleString()}`,
        `₹${d.netPayout.toLocaleString()}`,
        `₹${d.totalOutstanding.toLocaleString()}`,
      ]);
    } else if (activeReport === 'transfers-report') {
      const subViewTitle =
        transfersSubView === 'site'
          ? 'Site Transfers List'
          : transfersSubView === 'section'
          ? 'Section Transfers List'
          : 'All Transfers & Custom Migrations';

      reportTitle = `Employees Transfers & Migrations Register (${subViewTitle})`;
      subtitle = 'Statutory Workforce Movement, Cross-Site Deployment & Trade Section Relocation Audit';

      if (!periodLabel) {
        periodLabel =
          dateFilterMode === 'custom'
            ? `Custom: ${customStartDate} to ${customEndDate}`
            : transfersPeriod === 'daily'
            ? `Date: ${selectedDate}`
            : transfersPeriod === 'weekly'
            ? activeWeekInfo.label
            : transfersPeriod === 'monthly'
            ? `Month: ${selectedMonth}`
            : 'All-Time Historical Register';
      }

      summaryKpis = [
        { label: 'Total Transfers', value: transfersReportData.totalTransfers, color: '#4f46e5' },
        { label: 'Site Transfers', value: transfersReportData.totalSiteTransfers, color: '#2563eb' },
        { label: 'Section Transfers', value: transfersReportData.totalSectionTransfers, color: '#7c3aed' },
        { label: 'Workers Involved', value: transfersReportData.uniqueWorkersCount, color: '#059669' },
      ];

      tableHeaders = [
        'Transfer ID',
        'Date',
        'Worker ID',
        'Worker Name',
        'Purpose',
        'Transfer Type',
        'Origin (From)',
        'Destination (To)',
        'Scope',
        'Reason',
        'Authorized By',
      ];

      tableRows = transfersReportData.activeList.map((m) => {
        const w = workers.find((wk) => wk.id === m.workerId);
        const fSite = sites.find((s) => s.id === m.fromSiteId);
        const tSite = sites.find((s) => s.id === m.toSiteId);
        const fSec = sections.find((s) => s.id === m.fromSectionId);
        const tSec = sections.find((s) => s.id === m.toSectionId);
        const isSiteTransfer = m.fromSiteId !== m.toSiteId;

        return [
          m.id,
          m.date,
          m.workerId,
          w?.name || m.workerId,
          w?.designation || w?.purpose || '—',
          isSiteTransfer ? 'Site to Site' : 'Section to Section',
          `${fSite?.name || m.fromSiteId} (${fSec?.name || m.fromSectionId})`,
          `${tSite?.name || m.toSiteId} (${tSec?.name || m.toSectionId})`,
          m.migrationType.toUpperCase(),
          m.reason,
          m.approvedBy,
        ];
      });
    }

    return {
      reportTitle,
      subtitle,
      periodLabel,
      filterSummary,
      summaryKpis,
      tableHeaders,
      tableRows,
      customAuditDetails,
      signatures: {
        supervisorName: currentUser?.name || 'Site Supervisor',
        showDualSignature: true,
      },
    };
  }, [
    activeReport,
    weeklyViewMode,
    monthlyViewMode,
    advanceDimension,
    advancePeriod,
    foodDimension,
    foodPeriod,
    overallPeriod,
    transfersSubView,
    transfersPeriod,
    dateFilterMode,
    selectedDate,
    selectedMonth,
    customStartDate,
    customEndDate,
    activeWeekInfo,
    filterSiteId,
    filterSectionId,
    filterWorkerType,
    sites,
    sections,
    workers,
    attendance,
    advances,
    recoveries,
    accessibleWorkerIds,
    dailySectionData,
    weeklyReportData,
    monthlyReportData,
    advanceReportData,
    foodReportData,
    overallReportData,
    transfersReportData,
    currentUser,
  ]);

  const activeRepDef = reportDefinitions.find((r) => r.id === activeReport) || reportDefinitions[0];

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              OFFICIAL REPORTS & ANALYTICS
            </span>
            <span className="text-xs text-slate-400 font-bold">• 7 Dedicated Reporting Hubs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Reports & Analytics Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Multi-dimensional statutory attendance, weekly/monthly muster rolls, advances, food, employee transfers &amp; migrations, and custom worker audit slips.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center flex-wrap gap-y-2">
          {/* Custom Worker Audit Slip Launcher Button */}
          <button
            type="button"
            onClick={() => setIsCustomSlipPickerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Generate Custom Worker Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Custom Worker Audit Slip</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegistersModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Browse all 7 report hubs"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>Reports Directory (7)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Export Image (PNG) or Save as PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export to Image & PDF</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 7 Primary Report Navigation Cards / Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {reportDefinitions.map((rep, idx) => {
          const isActive = rep.id === activeReport;
          const Icon = rep.icon;
          return (
            <button
              key={rep.id}
              onClick={() => handleSwitchReport(rep.id)}
              type="button"
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isActive
                  ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">0{idx + 1}</span>
              </div>
              <div>
                <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                  {rep.name.replace(/^\d+\.\s*/, '')}
                </h3>
              </div>
            </button>
          );
        })}
      </div>

      {/* Universal Multi-Filter & Custom (Costam Wise) Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        {/* Top row: Date Filter Mode selector (Standard vs Custom Range) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Mode:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDateFilterMode('standard')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  dateFilterMode === 'standard' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Standard Cycle (Daily / Weekly / Monthly)
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('custom')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  dateFilterMode === 'custom' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Custom Date Range (Costam Wise)
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {dateFilterMode === 'custom' ? (
              <span className="text-purple-700 font-bold">
                ✓ Filtering custom date span: {customStartDate} to {customEndDate}
              </span>
            ) : (
              <span>Using active report period standards</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* If Custom Date Mode: show From Date & To Date */}
          {dateFilterMode === 'custom' ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                  From Date (Start)
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-purple-50/60 border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                  To Date (End)
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-purple-50/60 border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <>
              {/* Standard Mode: Dynamic Date / Period Selectors based on Report */}
              {activeReport === 'daily-attendance-section' ||
              (activeReport === 'advance-payments' && advancePeriod === 'daily') ||
              (activeReport === 'food-report' && foodPeriod === 'daily') ||
              (activeReport === 'overall-reports' && overallPeriod === 'daily') ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  />
                </div>
              ) : null}

              {/* Month Selector for Weekly, Monthly, or Monthly period modes */}
              {activeReport === 'weekly-attendance' ||
              activeReport === 'monthly-attendance' ||
              (activeReport === 'advance-payments' && advancePeriod !== 'daily') ||
              (activeReport === 'food-report' && foodPeriod !== 'daily') ||
              (activeReport === 'overall-reports' && overallPeriod === 'monthly') ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Month
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  />
                </div>
              ) : null}

              {/* Week Selector Pills if Weekly Report or Weekly Period */}
              {activeReport === 'weekly-attendance' ||
              (activeReport === 'advance-payments' && advancePeriod === 'weekly') ||
              (activeReport === 'food-report' && foodPeriod === 'weekly') ||
              (activeReport === 'overall-reports' && overallPeriod === 'weekly') ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Week (7-Day Cycle)
                  </label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((wNum) => {
                      const isSelected = selectedWeek === wNum;
                      return (
                        <button
                          key={wNum}
                          type="button"
                          onClick={() => setSelectedWeek(wNum)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          Week {wNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Project Site Filter */}
          {!isSupervisor && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Project Site
              </label>
              <select
                value={filterSiteId}
                onChange={(e) => {
                  setFilterSiteId(e.target.value);
                  setFilterSectionId('');
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Project Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Work Section Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Work Section
            </label>
            <select
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Work Sections</option>
              {accessibleSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Worker Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Worker Type
            </label>
            <select
              value={filterWorkerType}
              onChange={(e) => setFilterWorkerType(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Types</option>
              <option value="company">Company Hand</option>
              <option value="outside">Outside Contractor</option>
            </select>
          </div>

          {/* Search Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search Filter
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search worker or section name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Sub-Dimension View Mode Switcher (Context-sensitive per report) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Report 2: Weekly View Mode Switch */}
          {activeReport === 'weekly-attendance' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-500">View Dimension:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWeeklyViewMode('section')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    weeklyViewMode === 'section' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Section-Wise View
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyViewMode('employee')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    weeklyViewMode === 'employee' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Employee-Wise View
                </button>
              </div>
            </div>
          )}

          {/* Report 3: Monthly View Mode Switch */}
          {activeReport === 'monthly-attendance' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-500">View Dimension:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('section')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    monthlyViewMode === 'section' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Section-Wise View
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('employee')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    monthlyViewMode === 'employee' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Employee-Wise View
                </button>
              </div>
            </div>
          )}

          {/* Report 4: Advance Payments Dimension & Period Switchers */}
          {activeReport === 'advance-payments' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Dimension:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdvanceDimension('section')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      advanceDimension === 'section' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Section-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceDimension('employee')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      advanceDimension === 'employee' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Employee-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceDimension('ref_agents')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      advanceDimension === 'ref_agents' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Ref & Agents-Wise
                  </button>
                </div>
              </div>

              {dateFilterMode === 'standard' && (
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-500">Period:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAdvancePeriod(p)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                          advancePeriod === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report 5: Food Report Dimension & Period Switchers */}
          {activeReport === 'food-report' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Dimension:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFoodDimension('section')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      foodDimension === 'section' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Section-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoodDimension('employee')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      foodDimension === 'employee' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Employee-Wise
                  </button>
                </div>
              </div>

              {dateFilterMode === 'standard' && (
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-500">Period:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFoodPeriod(p)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                          foodPeriod === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report 6: Overall Reports Period Switcher */}
          {activeReport === 'overall-reports' && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-500">Dossier Frequency:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                {(['daily', 'weekly', 'monthly', 'overall'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setOverallPeriod(p)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                      overallPeriod === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    {p === 'overall' ? 'Overall (Lifetime)' : p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Report 7: Transfers & Migrations Sub-Views */}
          {activeReport === 'transfers-report' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Transfers View:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTransfersSubView('all')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      transfersSubView === 'all' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All Transfers &amp; Migrations
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransfersSubView('site')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      transfersSubView === 'site' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Site Transfers List
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransfersSubView('section')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      transfersSubView === 'section' ? 'bg-white text-purple-600 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Section Transfers List
                  </button>
                </div>
              </div>

              {dateFilterMode === 'standard' && (
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-500">Period:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                    {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTransfersPeriod(p)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                          transfersPeriod === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        {p === 'all' ? 'All Time' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfer Nature Filter */}
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Nature:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  {(['all', 'permanent', 'temporary'] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTransfersNature(n)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all cursor-pointer ${
                        transfersNature === n ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {n === 'all' ? 'All Types' : n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Shortcut on right side of toolbar */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="ml-auto inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Table &amp; Custom Audit to Image &amp; PDF &rarr;</span>
          </button>
        </div>
      </div>

      {/* Active Report Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <activeRepDef.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                ACTIVE REPORT
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{activeRepDef.name}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{activeRepDef.desc}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-center">
          {activeReport === 'transfers-report' && (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Execute New Employee Transfer"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>+ New Transfer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCustomSlipPickerOpen(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Open Custom Worker Audit Slip"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Worker Custom Slip</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Image &amp; PDF</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. DAILY ATTENDANCE REPORT (SECTION-WISE) */}
      {/* ============================================================= */}
      {activeReport === 'daily-attendance-section' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Daily Section Attendance &amp; Overtime Roll ({dateFilterMode === 'custom' ? `${customStartDate} to ${customEndDate}` : selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Section headcounts, present mandays, food eligibility, and worker drilldowns with Custom Audit Slips.
                </p>
              </div>
            </div>

            <DataTable
              data={dailySectionData}
              columns={[
                {
                  header: 'Section Code',
                  render: (d) => <span className="font-mono text-xs font-bold text-indigo-700">{d.section.code}</span>,
                },
                {
                  header: 'Section Name',
                  render: (d) => (
                    <div>
                      <Link to={`/sections/${d.section.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.section.name}
                      </Link>
                      <span className="block text-[11px] text-slate-400">Site: {d.site?.name || '—'}</span>
                    </div>
                  ),
                },
                {
                  header: 'Headcount',
                  render: (d) => <span className="font-bold text-xs text-slate-900">{d.headcount} workers</span>,
                },
                {
                  header: 'Present',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">{d.presentCount}</span>,
                },
                {
                  header: 'Half Day',
                  render: (d) => <span className="font-bold text-xs text-amber-600">{d.halfDayCount}</span>,
                },
                {
                  header: 'Absent',
                  render: (d) => <span className="font-bold text-xs text-rose-600">{d.absentCount}</span>,
                },
                {
                  header: 'Present Rate',
                  render: (d) => (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        Number(d.attendanceRate) >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : Number(d.attendanceRate) >= 50
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {d.attendanceRate}%
                    </span>
                  ),
                },
                {
                  header: 'Food Units',
                  render: (d) => <span className="font-bold text-xs text-slate-800">{d.foodMeals} meals</span>,
                },
                {
                  header: 'Worker Roster',
                  render: (d) => (
                    <button
                      type="button"
                      onClick={() => setExpandedSectionId(expandedSectionId === d.section.id ? null : d.section.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{expandedSectionId === d.section.id ? 'Hide Roster' : `View (${d.workers.length})`}</span>
                    </button>
                  ),
                },
              ]}
            />
          </div>

          {/* Drilldown Worker Table if expanded */}
          {expandedSectionId && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
              {(() => {
                const secRow = dailySectionData.find((d) => d.section.id === expandedSectionId);
                if (!secRow) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          Worker Attendance Roster &bull; {secRow.section.name} ({secRow.section.code})
                        </h4>
                        <p className="text-xs text-slate-500">
                          Worker status, check-in, check-out, and Custom Audit Slip generation.
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedSectionId(null)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700"
                      >
                        ✕ Close Roster
                      </button>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-white border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 font-bold text-slate-700">Worker Name &amp; ID</th>
                            <th className="p-2.5 font-bold text-slate-700">Wage Rate</th>
                            <th className="p-2.5 font-bold text-slate-700">Check In</th>
                            <th className="p-2.5 font-bold text-slate-700">Check Out</th>
                            <th className="p-2.5 font-bold text-slate-700">Attendance Status</th>
                            <th className="p-2.5 font-bold text-slate-700">Food Meal</th>
                            <th className="p-2.5 font-bold text-slate-700">Custom Audit Slip</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 bg-white">
                          {secRow.workers.map((wRow) => (
                            <tr key={wRow.worker.id} className="hover:bg-blue-50/30">
                              <td className="p-2.5">
                                <Link to={`/workers/${wRow.worker.id}`} className="font-bold text-slate-900 hover:text-blue-600">
                                  {wRow.worker.name}
                                </Link>
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-slate-400">ID: {wRow.worker.id}</span>
                                  {(wRow.worker.designation || wRow.worker.purpose) && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                                      {wRow.worker.designation || wRow.worker.purpose}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">₹{wRow.worker.dailyWage}/day</td>
                              <td className="p-2.5 font-mono text-slate-600">{wRow.checkIn}</td>
                              <td className="p-2.5 font-mono text-slate-600">{wRow.checkOut}</td>
                              <td className="p-2.5">
                                <StatusBadge status={wRow.status} />
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    wRow.foodEligible.includes('Meal')
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {wRow.foodEligible}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedWorkerForSettlementModal(wRow.worker)}
                                  className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                                  title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Custom Audit Slip</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. WEEKLY ATTENDANCE REPORT (SECTION & EMPLY WISE) */}
      {/* ============================================================= */}
      {activeReport === 'weekly-attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Weekly Attendance &amp; Wage Accrual Roll &bull; {dateFilterMode === 'custom' ? `Custom: ${customStartDate} to ${customEndDate}` : activeWeekInfo.label}
              </h3>
              <p className="text-xs text-slate-500">
                {weeklyViewMode === 'section'
                  ? 'Aggregated section-wise 7-day attendance mandays and total estimated section wage bills.'
                  : 'Individual employee-wise muster roll with day-by-day P/H/A flags, and Custom Audit Slips.'}
              </p>
            </div>
          </div>

          {weeklyViewMode === 'section' ? (
            <DataTable
              data={weeklyReportData.sectionWeekly}
              columns={[
                {
                  header: 'Section Code',
                  render: (d) => <span className="font-mono text-xs font-bold text-indigo-700">{d.section.code}</span>,
                },
                {
                  header: 'Section Name',
                  render: (d) => (
                    <div>
                      <Link to={`/sections/${d.section.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.section.name}
                      </Link>
                      <span className="block text-[11px] text-slate-400">Site: {d.site?.name || '—'}</span>
                    </div>
                  ),
                },
                { header: 'Assigned Workers', render: (d) => `${d.headcount} workers` },
                {
                  header: 'Present Mandays',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">{d.presentMandays} days</span>,
                },
                { header: 'Half Days', accessor: 'halfDayCount' },
                { header: 'Absences', accessor: 'absentCount' },
                {
                  header: 'Weekly Rate',
                  render: (d) => <span className="font-bold text-xs text-blue-700">{d.attendanceRate}%</span>,
                },
                {
                  header: 'Est. Section Wages',
                  render: (d) => <span className="font-black text-xs text-slate-900">₹{d.estimatedWages.toLocaleString()}</span>,
                },
              ]}
            />
          ) : (
            <DataTable
              data={weeklyReportData.employeeWeekly}
              columns={[
                {
                  header: 'Worker Profile',
                  render: (d) => (
                    <div>
                      <Link to={`/workers/${d.worker.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.worker.name}
                      </Link>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-500">ID: {d.worker.id}</span>
                        {(d.worker.designation || d.worker.purpose) && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                            {d.worker.designation || d.worker.purpose}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Section',
                  render: (d) => <span className="text-xs text-slate-700 font-semibold">{d.section?.name || '—'}</span>,
                },
                {
                  header: 'Working Places (Sites)',
                  render: (d) => (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {d.workingSitesList.length > 0 ? (
                          d.workingSitesList.map((st) => (
                            <span
                              key={st.siteId}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              <MapPin className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                              <span>{st.siteName}</span>
                              <span className="text-[10px] font-bold text-blue-700">({st.days}d)</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No duty</span>
                        )}
                        {d.isMultiSite && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            🌐 Multi-Site
                          </span>
                        )}
                      </div>
                      {d.totalSiteDisbursed > 0 && (
                        <div className="text-[10px] font-semibold text-emerald-700">
                          Site Paid: ₹{d.totalSiteDisbursed.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  header: '7-Day Week Muster',
                  render: (d) => (
                    <div className="flex items-center space-x-1">
                      {activeWeekInfo.dayDates.map((dateStr) => {
                        const status = d.daysMap[dateStr] || 'absent';
                        const char = status === 'present' ? 'P' : status === 'halfDay' ? 'H' : 'A';
                        const colorClass =
                          status === 'present'
                            ? 'bg-emerald-500 text-white'
                            : status === 'halfDay'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-500 text-white';
                        return (
                          <span
                            key={dateStr}
                            title={`${dateStr}: ${status}`}
                            className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${colorClass}`}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>
                  ),
                },
                {
                  header: 'Present Days',
                  render: (d) => (
                    <span className="font-bold text-xs text-emerald-600">
                      {d.pCount} days{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({d.pDates.map((dt) => dt.slice(-2)).join(', ') || 'None'})
                      </span>
                    </span>
                  ),
                },
                {
                  header: 'Absent Days',
                  render: (d) => (
                    <span className="font-bold text-xs text-rose-600">
                      {d.aCount} days{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({d.aDates.map((dt) => dt.slice(-2)).join(', ') || 'None'})
                      </span>
                    </span>
                  ),
                },
                {
                  header: 'Weekly Wage',
                  render: (d) => <span className="font-black text-xs text-emerald-700">₹{d.weeklyWage.toLocaleString()}</span>,
                },
                {
                  header: 'Custom Audit Slip',
                  render: (d) => (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForSettlementModal(d.worker)}
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                      title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Custom Audit Slip</span>
                    </button>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. MONTHLY ATTENDANCE REPORT (SECTION & EMPLY WISE) */}
      {/* ============================================================= */}
      {activeReport === 'monthly-attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Monthly Attendance Master Roll &bull; {dateFilterMode === 'custom' ? `Custom: ${customStartDate} to ${customEndDate}` : selectedMonth}
              </h3>
              <p className="text-xs text-slate-500">
                {monthlyViewMode === 'section'
                  ? 'Monthly aggregated headcounts, present mandays, and gross wage totals by section.'
                  : 'Individual employee monthly muster roll with daily wage rates, mandays, and Custom Audit Slips.'}
              </p>
            </div>
          </div>

          {monthlyViewMode === 'section' ? (
            <DataTable
              data={monthlyReportData.sectionMonthly}
              columns={[
                {
                  header: 'Section Code',
                  render: (d) => <span className="font-mono text-xs font-bold text-indigo-700">{d.section.code}</span>,
                },
                {
                  header: 'Section Name',
                  render: (d) => (
                    <div>
                      <Link to={`/sections/${d.section.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.section.name}
                      </Link>
                      <span className="block text-[11px] text-slate-400">Site: {d.site?.name || '—'}</span>
                    </div>
                  ),
                },
                { header: 'Workers', render: (d) => `${d.headcount} labor` },
                {
                  header: 'Present Mandays',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">{d.presentMandays} days</span>,
                },
                { header: 'Half Days', accessor: 'halfDayCount' },
                { header: 'Absences', accessor: 'absentCount' },
                {
                  header: 'Muster Rate',
                  render: (d) => <span className="font-bold text-xs text-blue-700">{d.musterRate}%</span>,
                },
                {
                  header: 'Gross Wage Bill',
                  render: (d) => <span className="font-black text-xs text-slate-900">₹{d.grossWages.toLocaleString()}</span>,
                },
              ]}
            />
          ) : (
            <DataTable
              data={monthlyReportData.employeeMonthly}
              columns={[
                {
                  header: 'Worker Profile',
                  render: (d) => (
                    <div>
                      <Link to={`/workers/${d.worker.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.worker.name}
                      </Link>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-500">ID: {d.worker.id}</span>
                        {(d.worker.designation || d.worker.purpose) && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                            {d.worker.designation || d.worker.purpose}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Section',
                  render: (d) => <span className="text-xs text-slate-700 font-semibold">{d.section?.name || '—'}</span>,
                },
                {
                  header: 'Working Places (Sites)',
                  render: (d) => (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {d.workingSitesList.length > 0 ? (
                          d.workingSitesList.map((st) => (
                            <span
                              key={st.siteId}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              <MapPin className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                              <span>{st.siteName}</span>
                              <span className="text-[10px] font-bold text-blue-700">({st.days}d)</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No duty</span>
                        )}
                        {d.isMultiSite && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            🌐 Multi-Site
                          </span>
                        )}
                      </div>
                      {d.totalSiteDisbursed > 0 && (
                        <div className="text-[10px] font-semibold text-emerald-700">
                          Site Paid: ₹{d.totalSiteDisbursed.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Daily Wage Rate',
                  render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.worker.dailyWage}</span>,
                },
                {
                  header: 'Full Duty Days',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">{d.pCount} days</span>,
                },
                { header: 'Half Days', accessor: 'hCount' },
                { header: 'Absent Days', accessor: 'aCount' },
                {
                  header: 'Total Mandays',
                  render: (d) => <span className="font-black text-xs text-slate-900">{d.totalMandays} days</span>,
                },
                {
                  header: 'Monthly Gross Wages',
                  render: (d) => <span className="font-black text-xs text-emerald-700">₹{d.grossWages.toLocaleString()}</span>,
                },
                {
                  header: 'Custom Audit Slip',
                  render: (d) => (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForSettlementModal(d.worker)}
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                      title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Custom Audit Slip</span>
                    </button>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. ADVANCE PAYMENT REPORT (MULTI-DIMENSION & PERIOD) */}
      {/* ============================================================= */}
      {activeReport === 'advance-payments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Advance Payment, Recovery &amp; Debt Ledger &bull;{' '}
                {dateFilterMode === 'custom' ? `Custom: ${customStartDate} to ${customEndDate}` : advancePeriod.toUpperCase()}{' '}
                ({advanceDimension.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500">
                Audited cash advances, daily wage recovery cuts, running balances, and Custom Audit Slips.
              </p>
            </div>
          </div>

          {advanceDimension === 'section' && (
            <DataTable
              data={advanceReportData.sectionAdvances}
              columns={[
                {
                  header: 'Section Code',
                  render: (d) => <span className="font-mono text-xs font-bold text-indigo-700">{d.section.code}</span>,
                },
                {
                  header: 'Section Name',
                  render: (d) => (
                    <div>
                      <Link to={`/sections/${d.section.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.section.name}
                      </Link>
                      <span className="block text-[11px] text-slate-400">Site: {d.site?.name || '—'}</span>
                    </div>
                  ),
                },
                { header: 'Active Borrowers', render: (d) => `${d.borrowersCount} workers` },
                {
                  header: 'Advances Issued',
                  render: (d) => <span className="font-bold text-xs text-blue-600">₹{d.totalDisbursed.toLocaleString()}</span>,
                },
                {
                  header: 'Recovered via Cuts',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">₹{d.totalRecovered.toLocaleString()}</span>,
                },
                {
                  header: 'Outstanding Balance',
                  render: (d) => <span className="font-black text-xs text-amber-600">₹{d.totalOutstanding.toLocaleString()}</span>,
                },
              ]}
            />
          )}

          {advanceDimension === 'employee' && (
            <DataTable
              data={advanceReportData.employeeAdvances}
              columns={[
                { header: 'Advance ID', render: (d) => <span className="font-mono text-xs font-bold">{d.advance.id}</span> },
                { header: 'Date', render: (d) => <span>{d.advance.date}</span> },
                {
                  header: 'Worker Profile',
                  render: (d) => (
                    <div>
                      <Link to={`/workers/${d.advance.workerId}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.worker?.name || d.advance.workerId}
                      </Link>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400">ID: {d.advance.workerId}</span>
                        {(d.worker?.designation || d.worker?.purpose) && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                            {d.worker.designation || d.worker.purpose}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                { header: 'Section', render: (d) => d.section?.name || '—' },
                {
                  header: 'Principal Issued',
                  render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.advance.amount.toLocaleString()}</span>,
                },
                {
                  header: 'Recovered',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">₹{d.recoveredForAdv.toLocaleString()}</span>,
                },
                {
                  header: 'Remaining Debt',
                  render: (d) => <span className="font-black text-xs text-amber-600">₹{d.remainingBalance.toLocaleString()}</span>,
                },
                { header: 'Status', render: (d) => <StatusBadge status={d.advance.status} /> },
                {
                  header: 'Custom Audit Slip',
                  render: (d) => (
                    <button
                      type="button"
                      onClick={() => d.worker && setSelectedWorkerForSettlementModal(d.worker)}
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                      title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Custom Audit Slip</span>
                    </button>
                  ),
                },
              ]}
            />
          )}

          {advanceDimension === 'ref_agents' && (
            <DataTable
              data={advanceReportData.agentAdvances}
              columns={[
                {
                  header: 'Agent / Referrer Name',
                  render: (d) => (
                    <div>
                      <span className="font-bold text-xs text-slate-900">{d.referrer.name}</span>
                      <span className="block text-[11px] text-slate-400">Phone: {d.referrer.mobile}</span>
                    </div>
                  ),
                },
                {
                  header: 'Agent Category',
                  render: (d) => (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {d.referrer.type === 'agency' ? 'Outside Sourcing Contractor' : 'Senior Employee Lead'}
                    </span>
                  ),
                },
                { header: 'Sourced Workers', render: (d) => `${d.sourcedCount} labor` },
                {
                  header: 'Commission Earned',
                  render: (d) => <span className="font-bold text-xs text-emerald-600">+₹{d.commEarned.toLocaleString()}</span>,
                },
                {
                  header: 'Advances Disbursed',
                  render: (d) => <span className="font-bold text-xs text-rose-600">-₹{d.advTaken.toLocaleString()}</span>,
                },
                {
                  header: 'Commission Paid Out',
                  render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.paid.toLocaleString()}</span>,
                },
                {
                  header: 'Balance Payable',
                  render: (d) => <span className="font-black text-xs text-purple-700">₹{d.balancePayable.toLocaleString()}</span>,
                },
              ]}
            />
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. FOOD REPORT (SECTION-WISE, EMPLY-WISE, MULTI-PERIOD) */}
      {/* ============================================================= */}
      {activeReport === 'food-report' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Food &amp; Canteen Distribution Audit &bull;{' '}
                {dateFilterMode === 'custom' ? `Custom: ${customStartDate} to ${customEndDate}` : foodPeriod.toUpperCase()}{' '}
                ({foodDimension.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500">
                Meal quantities derived strictly from attendance (Present = 1.0 unit, Half Day = 0.5 unit, Absent = 0).
              </p>
            </div>
          </div>

          {foodDimension === 'section' ? (
            <DataTable
              data={foodReportData.sectionFood}
              columns={[
                {
                  header: 'Section Code',
                  render: (d) => <span className="font-mono text-xs font-bold text-indigo-700">{d.section.code}</span>,
                },
                {
                  header: 'Section Name',
                  render: (d) => (
                    <div>
                      <Link to={`/sections/${d.section.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.section.name}
                      </Link>
                      <span className="block text-[11px] text-slate-400">Site: {d.site?.name || '—'}</span>
                    </div>
                  ),
                },
                { header: 'Workers', render: (d) => `${d.headcount} workers` },
                { header: 'Indented', accessor: 'indented' },
                { header: 'Dispatched', accessor: 'dispatched' },
                { header: 'Received', accessor: 'received' },
                {
                  header: 'Shortages',
                  render: (d) => (
                    <span className={`font-bold text-xs ${d.shortage > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {d.shortage > 0 ? `-${d.shortage}` : '0'}
                    </span>
                  ),
                },
                {
                  header: 'Consumption Units',
                  render: (d) => <span className="font-black text-xs text-emerald-700">{d.totalMealUnits} units</span>,
                },
                {
                  header: 'Food Value (₹65/unit)',
                  render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.estimatedFoodCost.toLocaleString()}</span>,
                },
              ]}
            />
          ) : (
            <DataTable
              data={foodReportData.employeeFood}
              columns={[
                {
                  header: 'Worker Profile',
                  render: (d) => (
                    <div>
                      <Link to={`/workers/${d.worker.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                        {d.worker.name}
                      </Link>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-500">ID: {d.worker.id}</span>
                        {(d.worker.designation || d.worker.purpose) && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                            {d.worker.designation || d.worker.purpose}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                { header: 'Section', render: (d) => d.section?.name || '—' },
                { header: 'Present Days', accessor: 'pCount' },
                { header: 'Half Days', accessor: 'hCount' },
                {
                  header: 'Meals Consumed',
                  render: (d) => <span className="font-black text-xs text-emerald-700">{d.mealUnits} meals</span>,
                },
                {
                  header: 'Eligibility',
                  render: (d) => (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        d.isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {d.isEligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  ),
                },
                {
                  header: 'Subsistence Value',
                  render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.estimatedCost.toLocaleString()}</span>,
                },
                {
                  header: 'Custom Audit Slip',
                  render: (d) => (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForSettlementModal(d.worker)}
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                      title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Custom Audit Slip</span>
                    </button>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 6. OVERALL REPORTS (EMPLOYEE-WISE 360° MASTER DOSSIER) */}
      {/* ============================================================= */}
      {activeReport === 'overall-reports' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Master 360° Employee Dossier &bull;{' '}
                {dateFilterMode === 'custom' ? `Custom: ${customStartDate} to ${customEndDate}` : overallPeriod.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500">
                Consolidated worker audit uniting Attendance (P/H/A), Food Meals, Gross Wages, Advance Deductions, and Custom Audit Slips.
              </p>
            </div>
          </div>

          <DataTable
            data={overallReportData}
            columns={[
              {
                header: 'Worker Profile',
                render: (d) => (
                  <div>
                    <Link to={`/workers/${d.worker.id}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
                      {d.worker.name}
                    </Link>
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-500">ID: {d.worker.id}</span>
                      {(d.worker.designation || d.worker.purpose) && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                          {d.worker.designation || d.worker.purpose}
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Home Site / Section',
                render: (d) => (
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">{d.site?.name || '—'}</span>
                    <span className="block text-[11px] text-slate-400">{d.section?.name || '—'}</span>
                  </div>
                ),
              },
              {
                header: 'Working Places (Sites)',
                render: (d) => (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {d.workingSitesList.length > 0 ? (
                        d.workingSitesList.map((st) => (
                          <span
                            key={st.siteId}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                              st.isOriginal
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-blue-50 text-blue-900 border-blue-200'
                            }`}
                          >
                            <MapPin className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                            <span>{st.siteName}</span>
                            <span className="text-[10px] font-bold text-slate-600">
                              ({st.days}d &bull; 🍽️ {st.days}m)
                            </span>
                            {st.isOriginal && (
                              <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1 rounded font-extrabold">
                                Home
                              </span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No duty</span>
                      )}
                      {d.isMultiSite && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full">
                          🌐 Multi-Site
                        </span>
                      )}
                    </div>
                    {d.totalSiteDisbursed > 0 && (
                      <div className="text-[10px] font-semibold text-emerald-700">
                        Site Paid: ₹{d.totalSiteDisbursed.toLocaleString()}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Attendance (Mandays)',
                render: (d) => (
                  <div>
                    <span className="font-black text-xs text-emerald-700">{d.mandays} days</span>
                    <span className="block text-[10px] text-slate-400">
                      ({d.pCount}P / {d.hCount}H / {d.aCount}A)
                    </span>
                  </div>
                ),
              },
              {
                header: 'Food Meals',
                render: (d) => <span className="font-bold text-xs text-slate-800">{d.mealUnits} units</span>,
              },
              {
                header: 'Gross Wages',
                render: (d) => <span className="font-bold text-xs text-slate-900">₹{d.grossWages.toLocaleString()}</span>,
              },
              {
                header: 'Advance Cuts',
                render: (d) => (
                  <span className={`font-bold text-xs ${d.advanceDeducted > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {d.advanceDeducted > 0 ? `-₹${d.advanceDeducted.toLocaleString()}` : '₹0'}
                  </span>
                ),
              },
              {
                header: 'Net Payable',
                render: (d) => <span className="font-black text-xs text-emerald-700">₹{d.netPayout.toLocaleString()}</span>,
              },
              {
                header: 'Outstanding Debt',
                render: (d) => (
                  <span className={`font-bold text-xs ${d.totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    ₹{d.totalOutstanding.toLocaleString()}
                  </span>
                ),
              },
              {
                header: 'Custom Audit Slip',
                render: (d) => (
                  <button
                    type="button"
                    onClick={() => setSelectedWorkerForSettlementModal(d.worker)}
                    className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
                    title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Custom Audit Slip</span>
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* 7. EMPLOYEES TRANSFERS & MIGRATIONS REPORT */}
      {/* ============================================================= */}
      {activeReport === 'transfers-report' && (
        <div className="space-y-4">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Movements
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{transfersReportData.totalTransfers}</span>
                <span className="text-xs text-slate-500 font-semibold">records</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-2xs bg-blue-50/20">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                Site Transfers
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-blue-700">{transfersReportData.totalSiteTransfers}</span>
                <span className="text-xs text-blue-500 font-semibold">cross-site</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 shadow-2xs bg-indigo-50/20">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                Section Transfers
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-indigo-700">{transfersReportData.totalSectionTransfers}</span>
                <span className="text-xs text-indigo-500 font-semibold">craft shift</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                Permanent
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">{transfersReportData.permanentTransfers}</span>
                <span className="text-xs text-emerald-500 font-semibold">reassigned</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs bg-amber-50/20">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                Temporary
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-amber-700">{transfersReportData.temporaryTransfers}</span>
                <span className="text-xs text-amber-500 font-semibold">short term</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-2xs bg-purple-50/20">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                Workers Involved
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-purple-700">{transfersReportData.uniqueWorkersCount}</span>
                <span className="text-xs text-purple-500 font-semibold">people</span>
              </div>
            </div>
          </div>

          {/* Transfers Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  <span>
                    {transfersSubView === 'site'
                      ? 'Cross-Site Transfers Register'
                      : transfersSubView === 'section'
                      ? 'Section Craft Transfers Register'
                      : 'Comprehensive Employees Transfers & Migrations Register'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {transfersReportData.activeList.length} records
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dateFilterMode === 'custom'
                    ? `Showing movement records from custom date range: ${customStartDate} to ${customEndDate}`
                    : `Active scope: ${transfersPeriod.toUpperCase()} cycle • Nature: ${transfersNature.toUpperCase()}`}
                </p>
              </div>
            </div>

            {/* DataTable */}
            <DataTable
              data={transfersReportData.activeList}
              columns={[
                {
                  header: 'Transfer ID & Date',
                  render: (m) => (
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 block">{m.id}</span>
                      <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {m.date}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Worker Profile',
                  render: (m) => {
                    const w = workers.find((wk) => wk.id === m.workerId);
                    return (
                      <div>
                        <Link
                          to={`/workers/${m.workerId}`}
                          className="font-bold text-xs text-slate-900 hover:text-blue-600"
                        >
                          {w?.name || m.workerId}
                        </Link>
                        <div className="flex items-center space-x-1.5 flex-wrap mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500">ID: {m.workerId}</span>
                          {(w?.designation || w?.purpose) && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200/60">
                              {w.designation || w.purpose}
                            </span>
                          )}
                          {w?.workerType && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                                w.workerType === 'company'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                  : 'bg-amber-50 text-amber-700 border-amber-200/60'
                              }`}
                            >
                              {w.workerType === 'company' ? 'Company' : 'Outside'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  header: 'Transfer Type',
                  render: (m) => {
                    const isSiteTransfer = m.fromSiteId !== m.toSiteId;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          isSiteTransfer
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {isSiteTransfer ? (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span>Site Transfer</span>
                          </>
                        ) : (
                          <>
                            <Layers className="h-3 w-3" />
                            <span>Section Shift</span>
                          </>
                        )}
                      </span>
                    );
                  },
                },
                {
                  header: 'Origin (From)',
                  render: (m) => {
                    const fSite = sites.find((s) => s.id === m.fromSiteId);
                    const fSec = sections.find((s) => s.id === m.fromSectionId);
                    return (
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          {fSite?.name || m.fromSiteId || '—'}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Layers className="h-3 w-3 text-slate-400 shrink-0" />
                          {fSec?.name || m.fromSectionId || '—'}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  header: 'Destination (To)',
                  render: (m) => {
                    const tSite = sites.find((s) => s.id === m.toSiteId);
                    const tSec = sections.find((s) => s.id === m.toSectionId);
                    return (
                      <div className="text-xs">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          {tSite?.name || m.toSiteId || '—'}
                        </span>
                        <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                          <Layers className="h-3 w-3 text-emerald-500 shrink-0" />
                          {tSec?.name || m.toSectionId || '—'}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  header: 'Scope',
                  render: (m) => (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        m.migrationType === 'permanent'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {m.migrationType}
                    </span>
                  ),
                },
                {
                  header: 'Reason & Approver',
                  render: (m) => (
                    <div className="text-xs max-w-[220px]">
                      <span className="font-semibold text-slate-800 block truncate" title={m.reason}>
                        {m.reason}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <ShieldCheck className="h-3 w-3 text-indigo-600 shrink-0" />
                        <span className="truncate" title={`Approved By: ${m.approvedBy}`}>
                          {m.approvedBy}
                        </span>
                      </div>
                      {m.remarks && (
                        <span className="text-[10px] text-slate-400 italic block truncate mt-0.5" title={m.remarks}>
                          {m.remarks}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Custom Audit Slip',
                  render: (m) => {
                    const w = workers.find((wk) => wk.id === m.workerId);
                    if (!w) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerForSettlementModal(w)}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 shadow-2xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
                        title="Open Custom Audit Slip with Present/Absent Dates, Advances, Running Balance & Signatures"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Custom Audit Slip</span>
                      </button>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* CUSTOM WORKER AUDIT SLIP PICKER MODAL (TOP HEADER LAUNCHER) */}
      {/* ============================================================= */}
      {isCustomSlipPickerOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCustomSlipPickerOpen(false)}
          title="Custom Worker Audit & Settlement Slip Launcher"
          subtitle="Select any worker to generate their official slip with Total Present/Absent Dates, Advances, Running Balance & Dual Signatures"
          icon={<FileCheck2 className="h-5 w-5 text-purple-600" />}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setIsCustomSlipPickerOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!customSlipWorkerId}
                onClick={() => {
                  const targetWorker = workers.find((w) => w.id === customSlipWorkerId);
                  if (targetWorker) {
                    setSelectedWorkerForSettlementModal(targetWorker);
                    setIsCustomSlipPickerOpen(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Open Official Audit Slip</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Worker / Employee:
              </label>
              <select
                value={customSlipWorkerId}
                onChange={(e) => setCustomSlipWorkerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="">-- Choose an employee ({accessibleWorkers.length} available) --</option>
                {accessibleWorkers.map((w) => {
                  const sec = sections.find((s) => s.id === w.currentSectionId);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} (ID: {w.id}) • {sec?.name || 'No Section'} • ₹{w.dailyWage}/day
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  From Date:
                </label>
                <input
                  type="date"
                  value={customSlipStartDate}
                  onChange={(e) => setCustomSlipStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  To Date:
                </label>
                <input
                  type="date"
                  value={customSlipEndDate}
                  onChange={(e) => setCustomSlipEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Quick Month Range:
              </label>
              <input
                type="month"
                value={customSlipMonth}
                onChange={(e) => {
                  const m = e.target.value;
                  setCustomSlipMonth(m);
                  if (m) {
                    const [y, mn] = m.split('-');
                    const days = new Date(parseInt(y, 10), parseInt(mn, 10), 0).getDate();
                    setCustomSlipStartDate(`${m}-01`);
                    setCustomSlipEndDate(`${m}-${String(days).padStart(2, '0')}`);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
              />
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
                <span>Includes Full Statutory Audit Set:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-purple-800 space-y-0.5">
                <li>Date-to-Date Search &amp; Filter with Exact Between-Dates Muster</li>
                <li>Working Places Deployment &amp; Food Meals Count (Original Site &amp; Other Sites With Days &amp; Food Meals)</li>
                <li>Employee Overall Closing Balance (Lifetime Master Account)</li>
                <li>Total Present Days With Complete Itemized Dates</li>
                <li>Total Absent Days With Complete Itemized Dates</li>
                <li>Advance Payments &amp; Recoveries Using With Dates</li>
                <li>Last Present Day Running Balance</li>
                <li>Supervisor Signature &amp; Employee Signature with Digital Stamps</li>
                <li>Direct Export to PDF &amp; High-DPI PNG Image</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* WORKFORCE WEEKLY & CUSTOM SETTLEMENT AUDIT SLIP MODAL */}
      {/* ============================================================= */}
      {selectedWorkerForSettlementModal && (
        <WorkforceWeeklySettlementModal
          isOpen={true}
          onClose={() => setSelectedWorkerForSettlementModal(null)}
          worker={selectedWorkerForSettlementModal}
          site={sites.find((s) => s.id === selectedWorkerForSettlementModal.currentSiteId)}
          sites={sites}
          section={sections.find((s) => s.id === selectedWorkerForSettlementModal.currentSectionId)}
          settlement={getSettlementForWorker(selectedWorkerForSettlementModal, customSlipMonth || selectedMonth)}
          month={customSlipMonth || selectedMonth}
          initialStartDate={
            dateFilterMode === 'custom'
              ? customStartDate
              : activeReport === 'daily-attendance-section'
              ? selectedDate
              : activeReport === 'weekly-attendance'
              ? activeWeekInfo.startDate
              : customSlipStartDate
          }
          initialEndDate={
            dateFilterMode === 'custom'
              ? customEndDate
              : activeReport === 'daily-attendance-section'
              ? selectedDate
              : activeReport === 'weekly-attendance'
              ? activeWeekInfo.endDate
              : customSlipEndDate
          }
          allAttendance={attendance}
          allAdvances={advances}
          allRecoveries={recoveries}
          allPayments={payments}
          allSiteMigrations={siteMigrations}
          supervisorName={currentUser?.name || 'Site Supervisor'}
          onSuccessToast={(msg) => showToast(msg)}
        />
      )}

      {/* ============================================================= */}
      {/* UNIVERSAL REPORT EXPORT MODAL (IMAGE PNG CANVAS & PDF) */}
      {/* ============================================================= */}
      <UniversalReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportTitle={exportPayload.reportTitle}
        subtitle={exportPayload.subtitle}
        periodLabel={exportPayload.periodLabel}
        filterSummary={exportPayload.filterSummary}
        summaryKpis={exportPayload.summaryKpis}
        tableHeaders={exportPayload.tableHeaders}
        tableRows={exportPayload.tableRows}
        signatures={exportPayload.signatures}
        customAuditDetails={exportPayload.customAuditDetails}
      />

      {/* Reports Directory Modal */}
      <OfficialRegistersModal
        isOpen={isRegistersModalOpen}
        onClose={() => setIsRegistersModalOpen(false)}
        activeReport={activeReport}
        onSelectReport={(id) => handleSwitchReport(id as ReportType)}
        reportDefinitions={reportDefinitions}
      />

      {/* Employees Transfer & Migration Creation Modal */}
      <CustomSiteMigrationModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        allWorkers={workers}
        sites={sites}
        sections={sections}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />}
    </div>
  );
};

export default Reports;
