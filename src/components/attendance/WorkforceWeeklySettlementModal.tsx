import React, { useState, useMemo } from 'react';
import type {
  Worker,
  Site,
  Section,
  MonthlySettlementRecord,
  Attendance,
  Advance,
  Recovery,
  WorkerPayment,
  SiteMigrationRecord,
} from '../../types';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Modal } from '../common/Modal';
import { SignaturePad } from '../common/SignaturePad';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  CreditCard,
  User,
  CalendarRange,
  Search,
  Wallet,
  Building2,
  MapPin,
  Utensils,
  ArrowRightLeft,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  exportWorkforceSettlementAsImage,
  exportWorkforceSettlementAsPDF,
  type WeeklyDataRow,
} from '../../utils/exportWorkforceSettlement';

interface WorkforceWeeklySettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  site?: Site;
  sites?: Site[];
  section?: Section;
  settlement: MonthlySettlementRecord;
  month?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  allAttendance: Attendance[];
  allAdvances: Advance[];
  allRecoveries: Recovery[];
  allPayments: WorkerPayment[];
  allSiteMigrations?: SiteMigrationRecord[];
  supervisorName?: string;
  onSuccessToast?: (msg: string) => void;
}

export const WorkforceWeeklySettlementModal: React.FC<WorkforceWeeklySettlementModalProps> = ({
  isOpen,
  onClose,
  worker,
  site,
  sites,
  section,
  settlement,
  month = new Date().toISOString().slice(0, 7),
  initialStartDate,
  initialEndDate,
  allAttendance,
  allAdvances,
  allRecoveries,
  allPayments,
  allSiteMigrations,
  supervisorName = 'Site Supervisor',
  onSuccessToast,
}) => {
  const { siteMigrations: contextMigrations, sites: contextSites, sections: contextSections } =
    useAttendanceContext();

  const [workerSignature, setWorkerSignature] = useState<string | null>(null);
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Month days setup
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Date-to-Date Search Range States
  const defaultStart = initialStartDate || `${month}-01`;
  const defaultEnd = initialEndDate || `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const [searchStartDate, setSearchStartDate] = useState(defaultStart);
  const [searchEndDate, setSearchEndDate] = useState(defaultEnd);

  const effectiveStart = searchStartDate <= searchEndDate ? searchStartDate : searchEndDate;
  const effectiveEnd = searchStartDate <= searchEndDate ? searchEndDate : searchStartDate;
  const dateRangeLabel = `${effectiveStart} to ${effectiveEnd}`;

  // =========================================================================
  // 0. EMPLOYEES TRANSFER & MIGRATION HISTORY (SITE & SECTION MOVEMENTS)
  // =========================================================================
  const availableMigrations = (allSiteMigrations && allSiteMigrations.length > 0 ? allSiteMigrations : contextMigrations) || [];
  const availableSites = sites || contextSites || [];
  const availableSections = contextSections || [];

  const workerTransfers = useMemo(() => {
    return availableMigrations
      .filter((m) => m.workerId === worker.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [availableMigrations, worker.id]);

  const transfersHistoryFormatted = useMemo(() => {
    return workerTransfers.map((m) => {
      const isSite = m.fromSiteId !== m.toSiteId;
      const fSite = availableSites.find((s) => s.id === m.fromSiteId);
      const tSite = availableSites.find((s) => s.id === m.toSiteId);
      const fSec = availableSections.find((s) => s.id === m.fromSectionId);
      const tSec = availableSections.find((s) => s.id === m.toSectionId);

      const isInPeriod = m.date >= effectiveStart && m.date <= effectiveEnd;

      return {
        id: m.id,
        date: m.date,
        type: (isSite ? 'site' : 'section') as 'site' | 'section',
        fromSiteName: fSite?.name || m.fromSiteId || '—',
        fromSectionName: fSec?.name || m.fromSectionId || '—',
        toSiteName: tSite?.name || m.toSiteId || '—',
        toSectionName: tSec?.name || m.toSectionId || '—',
        scope: m.migrationType,
        reason: m.reason,
        approvedBy: m.approvedBy,
        remarks: m.remarks,
        isInPeriod,
      };
    });
  }, [workerTransfers, availableSites, availableSections, effectiveStart, effectiveEnd]);

  // =========================================================================
  // 1. OVERALL LIFETIME CLOSING BALANCE CALCULATIONS (ACROSS ALL TIME)
  // =========================================================================
  const openingRec = worker.openingRecord;
  const openingPresentDays = openingRec?.priorWorkingDays || 0;
  const openingHalfDays = openingRec?.priorHalfDays || 0;
  const openingGrossEarnings = openingRec?.priorEarnedWages || 0;
  const openingOldAdvance = openingRec?.openingAdvanceBalance || 0;
  const openingPendingWages = openingRec?.openingPendingWages || 0;

  const workerAllAttendance = allAttendance.filter((a) => a.workerId === worker.id);
  const recordedPresentDays = workerAllAttendance.filter((a) => a.status === 'present').length;
  const recordedHalfDays = workerAllAttendance.filter((a) => a.status === 'halfDay').length;
  const overallPresentDays = openingPresentDays + recordedPresentDays;
  const overallHalfDays = openingHalfDays + recordedHalfDays;
  const overallAbsentDays = workerAllAttendance.filter((a) => a.status === 'absent').length;

  const recordedGrossEarnings =
    recordedPresentDays * worker.dailyWage + recordedHalfDays * (worker.dailyWage * 0.5);
  const overallGrossEarnings =
    (openingPendingWages > 0 ? openingPendingWages : openingGrossEarnings) + recordedGrossEarnings;

  const workerAllAdvances = allAdvances.filter((a) => a.workerId === worker.id);
  const overallAdvanceTaken =
    openingOldAdvance + workerAllAdvances.reduce((sum, a) => sum + a.amount, 0);

  const workerAllRecoveries = allRecoveries.filter((r) => r.workerId === worker.id);
  const overallAdvanceRecovered = workerAllRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const overallOutstandingDebt = Math.max(0, overallAdvanceTaken - overallAdvanceRecovered);

  const workerAllPayments = allPayments.filter(
    (p) => p.workerId === worker.id && p.status === 'paid'
  );
  const overallPaidAmount = workerAllPayments.reduce((sum, p) => sum + p.netPay, 0);

  // Employee Overall Closing Balance: Gross Earned - Total Deductions Recovered - Total Payouts
  const overallClosingBalance = Math.max(
    0,
    overallGrossEarnings - overallAdvanceRecovered - overallPaidAmount
  );

  // =========================================================================
  // 2. FILTER DATA STRICTLY BETWEEN SELECTED DATES (DATE-TO-DATE SEARCH)
  // =========================================================================
  const filteredAttendance = allAttendance.filter(
    (a) => a.workerId === worker.id && a.date >= effectiveStart && a.date <= effectiveEnd
  );
  const filteredAdvances = allAdvances.filter(
    (adv) => adv.workerId === worker.id && adv.date >= effectiveStart && adv.date <= effectiveEnd
  );
  const filteredRecoveries = allRecoveries.filter(
    (rec) => rec.workerId === worker.id && rec.date >= effectiveStart && rec.date <= effectiveEnd
  );
  const filteredPayments = allPayments.filter(
    (p) => p.workerId === worker.id && p.date >= effectiveStart && p.date <= effectiveEnd && p.status === 'paid'
  );

  // Filtered Present Dates, Half Days & Absent Dates
  const allPresentDates = filteredAttendance
    .filter((a) => a.status === 'present')
    .map((a) => a.date)
    .sort();

  const allHalfDayDates = filteredAttendance
    .filter((a) => a.status === 'halfDay')
    .map((a) => a.date)
    .sort();

  const allAbsentDates = filteredAttendance
    .filter((a) => a.status === 'absent')
    .map((a) => a.date)
    .sort();

  const periodGrossWage =
    allPresentDates.length * worker.dailyWage + allHalfDayDates.length * (worker.dailyWage * 0.5);

  const periodAdvancesTaken = filteredAdvances.reduce((sum, a) => sum + a.amount, 0);
  const periodAdvanceRecovery = filteredRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const periodPaidAmount = filteredPayments.reduce((sum, p) => sum + p.netPay, 0);
  const periodNetPay = Math.max(0, periodGrossWage - periodAdvanceRecovery - periodPaidAmount);

  // Working Places Breakdown (Original Site and Other Sites with Duty Days & Food Count)
  const originalSiteId = worker.currentSiteId || site?.id || 'default';
  const originalSiteObj = (sites || []).find((s) => s.id === originalSiteId) || site;
  const originalSiteName = originalSiteObj
    ? originalSiteObj.name
    : originalSiteId !== 'default'
    ? originalSiteId
    : 'Original Home Site';

  // Tally all-time duty & food count per site across complete workforce history
  const allTimeSiteMap: Record<string, { days: number; mandays: number; foodCount: number }> = {};
  workerAllAttendance
    .filter((a) => a.status === 'present' || a.status === 'halfDay')
    .forEach((a) => {
      const sId = a.siteId || originalSiteId;
      if (!allTimeSiteMap[sId]) {
        allTimeSiteMap[sId] = { days: 0, mandays: 0, foodCount: 0 };
      }
      allTimeSiteMap[sId].days += 1;
      const m = a.status === 'present' ? 1 : 0.5;
      allTimeSiteMap[sId].mandays += m;
      allTimeSiteMap[sId].foodCount += m;
    });

  const siteDutyMap: Record<
    string,
    {
      siteId: string;
      siteName: string;
      isOriginalSite: boolean;
      siteType: 'original' | 'other';
      daysCount: number;
      mandays: number;
      foodCount: number;
      allTimeDays: number;
      allTimeFoodCount: number;
      dates: string[];
    }
  > = {};

  // Tally only sites where employee ACTUALLY worked in this selected period (daysCount > 0)
  filteredAttendance
    .filter((a) => a.status === 'present' || a.status === 'halfDay')
    .forEach((a) => {
      const sId = a.siteId || originalSiteId;
      const sName =
        (sites || []).find((s) => s.id === sId)?.name ||
        (site && site.id === sId ? site.name : sId !== 'default' ? sId : 'Assigned Work Site');
      const isOrig = sId === originalSiteId;
      const dayManday = a.status === 'present' ? 1 : 0.5;

      if (!siteDutyMap[sId]) {
        siteDutyMap[sId] = {
          siteId: sId,
          siteName: sName,
          isOriginalSite: isOrig,
          siteType: isOrig ? 'original' : 'other',
          daysCount: 0,
          mandays: 0,
          foodCount: 0,
          allTimeDays: allTimeSiteMap[sId]?.days || 0,
          allTimeFoodCount: allTimeSiteMap[sId]?.foodCount || 0,
          dates: [],
        };
      }
      siteDutyMap[sId].daysCount += 1;
      siteDutyMap[sId].mandays += dayManday;
      siteDutyMap[sId].foodCount += dayManday;
      siteDutyMap[sId].dates.push(a.date);
    });

  // Only include WORKING sites (don't show not-working sites with 0 days)
  const workingPlacesBreakdown = Object.values(siteDutyMap)
    .filter((wp) => wp.daysCount > 0)
    .sort((a, b) => {
      if (a.isOriginalSite && !b.isOriginalSite) return -1;
      if (!a.isOriginalSite && b.isOriginalSite) return 1;
      return b.daysCount - a.daysCount;
    });

  const originalWorkingSite = workingPlacesBreakdown.find((wp) => wp.isOriginalSite);
  const otherWorkingSites = workingPlacesBreakdown.filter((wp) => !wp.isOriginalSite);

  const totalPeriodFoodCount = workingPlacesBreakdown.reduce((sum, wp) => sum + wp.foodCount, 0);
  const origPeriodFoodCount = originalWorkingSite ? originalWorkingSite.foodCount : 0;
  const otherPeriodFoodCount = otherWorkingSites.reduce((sum, wp) => sum + wp.foodCount, 0);
  const totalPeriodDutyDays = workingPlacesBreakdown.reduce((sum, wp) => sum + wp.daysCount, 0);
  const origPeriodDutyDays = originalWorkingSite ? originalWorkingSite.daysCount : 0;
  const otherPeriodDutyDays = otherWorkingSites.reduce((sum, wp) => sum + wp.daysCount, 0);

  const otherSiteNamesSummary =
    otherWorkingSites.length > 0
      ? otherWorkingSites.map((wp) => `${wp.siteName} (${wp.daysCount}d)`).join(', ')
      : 'None (100% at Home Site)';

  const workingPlacesSummaryText =
    workingPlacesBreakdown.length > 0
      ? workingPlacesBreakdown
          .map(
            (wp) =>
              `${wp.siteName} (${wp.isOriginalSite ? 'Original Site' : 'Other Site'}) Working ${wp.daysCount} days • Food: ${wp.foodCount} meals`
          )
          .join('  •  ')
      : 'No working attendance shifts in selected period';

  // Quick Preset Filter Handler
  const handleApplyPreset = (preset: 'month' | '7days' | '15days' | 'lifetime') => {
    if (preset === 'month') {
      setSearchStartDate(`${month}-01`);
      setSearchEndDate(`${month}-${String(daysInMonth).padStart(2, '0')}`);
    } else if (preset === '7days') {
      const endD = new Date(searchEndDate || `${month}-${String(daysInMonth).padStart(2, '0')}`);
      const startD = new Date(endD);
      startD.setDate(startD.getDate() - 6);
      setSearchStartDate(startD.toISOString().split('T')[0]);
    } else if (preset === '15days') {
      const endD = new Date(searchEndDate || `${month}-${String(daysInMonth).padStart(2, '0')}`);
      const startD = new Date(endD);
      startD.setDate(startD.getDate() - 14);
      setSearchStartDate(startD.toISOString().split('T')[0]);
    } else if (preset === 'lifetime') {
      const allDates = [
        ...workerAllAttendance.map((a) => a.date),
        ...workerAllAdvances.map((a) => a.date),
        ...workerAllRecoveries.map((r) => r.date),
      ].sort();
      if (allDates.length > 0) {
        setSearchStartDate(allDates[0]);
        setSearchEndDate(allDates[allDates.length - 1]);
      }
    }
  };

  // =========================================================================
  // 3. DYNAMIC INTERVAL CHUNKING (7-DAY PERIODS / WEEKS COVERING DATES)
  // =========================================================================
  const intervals: { num: number; label: string; start: string; end: string }[] = [];
  const sDate = new Date(effectiveStart);
  const eDate = new Date(effectiveEnd);

  if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && sDate <= eDate) {
    let curr = new Date(sDate);
    let idx = 1;
    while (curr <= eDate) {
      const chunkStart = new Date(curr);
      const chunkEnd = new Date(curr);
      chunkEnd.setDate(chunkEnd.getDate() + 6);
      if (chunkEnd > eDate) {
        chunkEnd.setTime(eDate.getTime());
      }
      intervals.push({
        num: idx,
        label: `Period / Week ${idx}`,
        start: chunkStart.toISOString().split('T')[0],
        end: chunkEnd.toISOString().split('T')[0],
      });
      curr.setDate(curr.getDate() + 7);
      idx++;
    }
  } else {
    intervals.push({
      num: 1,
      label: 'Period 1',
      start: effectiveStart,
      end: effectiveEnd,
    });
  }

  let cumulativeRunningBal = 0;
  const weeklyData: WeeklyDataRow[] = intervals.map((win) => {
    const weekAttendance = filteredAttendance.filter(
      (a) => a.date >= win.start && a.date <= win.end
    );

    const pRecords = weekAttendance.filter((a) => a.status === 'present');
    const hRecords = weekAttendance.filter((a) => a.status === 'halfDay');
    const aRecords = weekAttendance.filter((a) => a.status === 'absent');

    const weeklyGrossWage =
      pRecords.length * worker.dailyWage + hRecords.length * (worker.dailyWage * 0.5);

    const weekAdv = filteredAdvances.filter(
      (adv) => adv.date >= win.start && adv.date <= win.end
    );
    const weekAdvancesTaken = weekAdv.reduce((sum, a) => sum + a.amount, 0);

    const weekRec = filteredRecoveries.filter(
      (rec) => rec.date >= win.start && rec.date <= win.end
    );
    const weeklyAdvancesDeducted = weekRec.reduce((sum, r) => sum + r.amount, 0);

    cumulativeRunningBal += weeklyGrossWage - weeklyAdvancesDeducted;

    return {
      weekNumber: win.num,
      weekLabel: win.label,
      dateRange: `${win.start} to ${win.end}`,
      presentDaysCount: pRecords.length,
      presentDates: pRecords.map((a) => a.date).sort(),
      halfDaysCount: hRecords.length,
      halfDaysDates: hRecords.map((a) => a.date).sort(),
      absentDaysCount: aRecords.length,
      absentDates: aRecords.map((a) => a.date).sort(),
      weeklyGrossWage,
      weeklyAdvancesTaken: weekAdvancesTaken,
      weeklyAdvancesDeducted,
      weeklyRunningBalance: Math.max(0, cumulativeRunningBal),
    };
  });

  // Calculate Last Present Day & Running Balance as of Last Present Day in Period
  const workedAttendanceDates = filteredAttendance
    .filter((a) => a.status === 'present' || a.status === 'halfDay')
    .map((a) => a.date)
    .sort();

  const lastPresentDate =
    workedAttendanceDates.length > 0
      ? workedAttendanceDates[workedAttendanceDates.length - 1]
      : effectiveEnd;

  const earnedUpToLastPresent = filteredAttendance
    .filter((a) => a.date <= lastPresentDate && (a.status === 'present' || a.status === 'halfDay'))
    .reduce(
      (sum, a) => sum + (a.status === 'present' ? worker.dailyWage : worker.dailyWage * 0.5),
      0
    );

  const deductionsUpToLastPresent = filteredRecoveries
    .filter((r) => r.date <= lastPresentDate)
    .reduce((sum, r) => sum + r.amount, 0);

  const paidUpToLastPresent = filteredPayments
    .filter((p) => p.date <= lastPresentDate)
    .reduce((sum, p) => sum + p.netPay, 0);

  const lastPresentRunningBalance = Math.max(
    0,
    (earnedUpToLastPresent || periodGrossWage) -
      deductionsUpToLastPresent -
      paidUpToLastPresent
  );

  // Quick 1-Click Signature Helpers
  const handleStampWorkerSignature = () => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setWorkerSignature(`Digitally Signed by ${worker.name} on ${new Date().toISOString().split('T')[0]} at ${timestamp}`);
    if (onSuccessToast) {
      onSuccessToast(`✓ Employee digital signature stamped for ${worker.name}`);
    }
  };

  const handleStampSupervisorSignature = () => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setSupervisorSignature(`Authorized & Verified by ${supervisorName} on ${new Date().toISOString().split('T')[0]} at ${timestamp} (Site Seal)`);
    if (onSuccessToast) {
      onSuccessToast(`✓ Supervisor authorization seal applied by ${supervisorName}`);
    }
  };

  // Export to Image Handler
  const handleExportImage = async () => {
    try {
      setIsExportingImage(true);
      await exportWorkforceSettlementAsImage({
        worker,
        site,
        section,
        settlement: {
          ...settlement,
          grossWage: periodGrossWage,
          advanceRecovery: periodAdvanceRecovery,
          netPay: periodNetPay,
          advanceTaken: periodAdvancesTaken,
          outstandingAdvance: overallOutstandingDebt,
        },
        month,
        dateRangeLabel,
        overallClosingBalance,
        overallOutstandingDebt,
        overallGrossEarnings,
        overallPaidAmount,
        weeklyData,
        allPresentDates,
        allHalfDayDates,
        allAbsentDates,
        workingPlacesBreakdown,
        transfersHistory: transfersHistoryFormatted,
        monthAdvances: filteredAdvances,
        monthRecoveries: filteredRecoveries,
        lastPresentDate,
        lastPresentRunningBalance,
        workerSignature,
        supervisorSignature,
        supervisorName,
      });
      if (onSuccessToast) {
        onSuccessToast(`🖼️ High-resolution Settlement Slip image downloaded for ${worker.name}!`);
      }
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Failed to export settlement slip image.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Export to PDF Handler
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportWorkforceSettlementAsPDF({
        worker,
        site,
        section,
        settlement: {
          ...settlement,
          grossWage: periodGrossWage,
          advanceRecovery: periodAdvanceRecovery,
          netPay: periodNetPay,
          advanceTaken: periodAdvancesTaken,
          outstandingAdvance: overallOutstandingDebt,
        },
        month,
        dateRangeLabel,
        overallClosingBalance,
        overallOutstandingDebt,
        overallGrossEarnings,
        overallPaidAmount,
        weeklyData,
        allPresentDates,
        allHalfDayDates,
        allAbsentDates,
        workingPlacesBreakdown,
        transfersHistory: transfersHistoryFormatted,
        monthAdvances: filteredAdvances,
        monthRecoveries: filteredRecoveries,
        lastPresentDate,
        lastPresentRunningBalance,
        workerSignature,
        supervisorSignature,
        supervisorName,
      });
      if (onSuccessToast) {
        onSuccessToast(`📄 Printable PDF voucher ready for ${worker.name}!`);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to generate printable PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workforce Weekly Summary & Settlement Slip"
      subtitle={`Official monthly labor muster & settlement audit for ${worker.name} (${month})`}
      icon={<FileText className="h-5 w-5 text-blue-600" />}
      size="2xl"
    >
      <div className="space-y-6 max-h-[78vh] overflow-y-auto px-1 pr-2">
        {/* Top Action Buttons (Export PDF, Export Image, Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              <CalendarRange className="h-3.5 w-3.5 mr-1" />
              <span>Period: {dateRangeLabel}</span>
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                settlement.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : settlement.status === 'approved'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {settlement.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Print or Save official PDF voucher"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>{isExportingPDF ? 'Preparing PDF...' : 'Export to PDF'}</span>
            </button>

            <button
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Download high-definition PNG image slip"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExportingImage ? 'Generating Image...' : 'Export to Image (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* DATE-TO-DATE SEARCH & FILTER BAR (FROM DATE TO TO DATE) */}
        {/* ============================================================= */}
        <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Date to Date Search &amp; Filter
              </span>
              <span className="text-[10px] text-blue-700 bg-blue-100/90 font-bold px-2 py-0.5 rounded-full">
                Custom Range
              </span>
            </div>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('month')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('7days')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('15days')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Last 15 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('lifetime')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Full History
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center space-x-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  From Date:
                </label>
                <input
                  type="date"
                  value={searchStartDate}
                  onChange={(e) => setSearchStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                />
              </div>

              <div className="pt-4 text-slate-400 font-bold text-xs">➔</div>

              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  To Date:
                </label>
                <input
                  type="date"
                  value={searchEndDate}
                  onChange={(e) => setSearchEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto pt-0 sm:pt-4">
              <span className="text-xs font-mono font-bold text-blue-900 bg-white px-3 py-2 rounded-xl border border-blue-200 shadow-2xs inline-flex items-center space-x-1.5">
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span>Showing: {effectiveStart} to {effectiveEnd}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600 pt-1.5 border-t border-blue-100">
            <span>
              Filtered Records: <strong>{filteredAttendance.length}</strong> attendance days &bull;{' '}
              <strong className="text-emerald-700">{allPresentDates.length} Present</strong> &bull;{' '}
              <strong className="text-rose-700">{allAbsentDates.length} Absent</strong> &bull;{' '}
              <strong>{filteredAdvances.length}</strong> advances &bull;{' '}
              <strong>{filteredRecoveries.length}</strong> recoveries
            </span>
            <span className="font-semibold text-blue-700">
              ✓ Showing only data strictly between selected dates in exact same format
            </span>
          </div>
        </div>

        {/* Worker Master Profile Box */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {worker.photoUrl ? (
                <img src={worker.photoUrl} alt={worker.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">{worker.name}</h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-mono border border-blue-500/30">
                  {worker.id}
                </span>
                {(worker.designation || worker.purpose) && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 text-[11px] font-bold border border-indigo-400/40">
                    {worker.designation || worker.purpose}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                <span>Site: {site?.name || settlement.siteId}</span>
                <span>•</span>
                <span>Section: {section?.name || settlement.sectionId}</span>
                {(worker.designation || worker.purpose) && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-300 font-semibold">Purpose: {worker.designation || worker.purpose}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-amber-300 font-bold">₹{worker.dailyWage}/day</span>
              </p>
              {workingPlacesBreakdown.length > 0 && (
                <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 w-fit">
                  <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Deployment: <strong className="text-white">{workingPlacesSummaryText}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right bg-slate-800/80 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Selected Period Net Payable ({effectiveStart} to {effectiveEnd})
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              ₹ {periodNetPay.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-300 block font-medium">
              Gross: ₹{periodGrossWage.toLocaleString()} | Rec: -₹{periodAdvanceRecovery.toLocaleString()}
            </span>
          </div>
        </div>

        {/* =========================================================================
            EMPLOYEE OVERALL CLOSING BALANCE HERO CARD (ACROSS ALL TIME)
           ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-600/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-200 font-black text-[10px] rounded-full uppercase tracking-wider border border-emerald-400/40 inline-flex items-center space-x-1">
                <Wallet className="h-3 w-3 mr-1" />
                <span>Worker Master Account</span>
              </span>
              <span className="text-xs text-slate-300 font-mono">Permanent ID: {worker.id}</span>
              {openingRec && (
                <span className="px-2 py-0.5 bg-amber-400/90 text-amber-950 font-black text-[10px] rounded-full border border-amber-300 inline-flex items-center">
                  Opening Record Carried (As of {openingRec.asOfDate})
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Employee Overall Closing Balance
            </h3>
            <p className="text-xs text-emerald-100/90 font-medium max-w-xl">
              Consolidated lifetime account closing balance across all sites, muster shifts, and settlement cycles (Total Wages Earned - Total Advance Deductions - Total Payouts Settled).
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-200/80 pt-1">
              <span>Lifetime Shifts: <strong>{overallPresentDays}P {overallHalfDays > 0 ? `+ ${overallHalfDays}H` : ''} / {overallAbsentDays}A</strong>{openingPresentDays > 0 ? ` (incl. ${openingPresentDays}P Opening)` : ''}</span>
              <span>•</span>
              <span>Lifetime Gross: <strong>₹{overallGrossEarnings.toLocaleString()}</strong></span>
              <span>•</span>
              <span>Total Adv Taken: <strong>₹{overallAdvanceTaken.toLocaleString()}</strong>{openingOldAdvance > 0 ? ` (incl. ₹${openingOldAdvance.toLocaleString()} Old)` : ''}</span>
              <span>•</span>
              <span>Loan Debt Left: <strong className="text-amber-300">₹{overallOutstandingDebt.toLocaleString()}</strong></span>
              <span>•</span>
              <span>Paid Out: <strong>₹{overallPaidAmount.toLocaleString()}</strong></span>
            </div>
          </div>

          <div className="text-left md:text-right bg-emerald-950/80 p-3.5 sm:p-4 rounded-xl border border-emerald-500/40 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
              Overall Closing Balance
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              ₹ {overallClosingBalance.toLocaleString()}
            </span>
            <span className="text-[10px] text-teal-200 block font-semibold mt-0.5">
              ★ Available Worker Closing Balance
            </span>
          </div>
        </div>

        {/* 4 Financial KPIs Grid for Selected Period */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Period Gross Wages</span>
            <span className="text-lg font-black text-blue-950 font-mono mt-0.5 block">
              ₹ {periodGrossWage.toLocaleString()}
            </span>
            <span className="text-[10px] text-blue-700">
              {allPresentDates.length}P + {allHalfDayDates.length}H days
            </span>
          </div>

          <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Advance Recovery</span>
            <span className="text-lg font-black text-rose-950 font-mono mt-0.5 block">
              -₹ {periodAdvanceRecovery.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-700">Deducted in period</span>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Period Net Payable</span>
            <span className="text-lg font-black text-emerald-950 font-mono mt-0.5 block">
              ₹ {periodNetPay.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700">Net in selected dates</span>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Outstanding Loan Debt</span>
            <span className="text-lg font-black text-amber-950 font-mono mt-0.5 block">
              ₹ {overallOutstandingDebt.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-700">Pending recovery</span>
          </div>
        </div>

        {/* =========================================================================
            1. WEEKLY SUMMARY BREAKDOWN TABLE (PERIOD-BY-PERIOD)
           ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                1. Weekly / Period Muster Breakdown ({dateRangeLabel})
              </h4>
            </div>
            <span className="text-[11px] text-slate-300 font-mono">
              {intervals.length} Periodic Billing Windows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Week</th>
                  <th className="py-2.5 px-3">Dates Window</th>
                  <th className="py-2.5 px-3">Present Days & Dates</th>
                  <th className="py-2.5 px-3">Absent Days & Dates</th>
                  <th className="py-2.5 px-3 text-right">Weekly Wage</th>
                  <th className="py-2.5 px-3 text-right">Advance Adj.</th>
                  <th className="py-2.5 px-3 text-right">Running Bal.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {weeklyData.map((w) => (
                  <tr key={w.weekNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{w.weekLabel}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{w.dateRange}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {w.presentDaysCount} Present
                        </span>
                        {w.presentDates.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({w.presentDates.map((d) => d.slice(-2)).join(', ')})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span
                          className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                            w.absentDaysCount > 0
                              ? 'text-rose-700 bg-rose-50 border-rose-200'
                              : 'text-slate-500 bg-slate-50 border-slate-200'
                          }`}
                        >
                          {w.absentDaysCount} Absent
                        </span>
                        {w.absentDates.length > 0 && (
                          <span className="text-[10px] text-rose-500 font-mono font-bold">
                            ({w.absentDates.map((d) => d.slice(-2)).join(', ')})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{w.weeklyGrossWage.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {w.weeklyAdvancesDeducted > 0 ? (
                        <span className="text-rose-600">-₹{w.weeklyAdvancesDeducted.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600">
                      ₹{w.weeklyRunningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            2. TOTAL PRESENT DAYS WITH DATES & ABSENT DAYS WITH DATES
           ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Present Days Box */}
          <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Total Present Days With Dates
                </h4>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-2xs font-mono">
                {allPresentDates.length} Days Present
              </span>
            </div>

            <p className="text-[11px] text-emerald-800">
              Verified physical check-in and muster biometric confirmation for {dateRangeLabel}:
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
              {allPresentDates.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-[10px] font-mono font-bold shadow-2xs"
                >
                  {d}
                </span>
              ))}
              {allHalfDayDates.length > 0 && (
                <>
                  <span className="w-full text-[10px] font-bold text-amber-800 pt-1">Half Days:</span>
                  {allHalfDayDates.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-mono font-bold shadow-2xs"
                    >
                      {d} (0.5)
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Total Absent Days Box */}
          <div className="bg-rose-50/60 border border-rose-200/90 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Total Absent Days With Dates
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 font-bold text-xs rounded-full shadow-2xs font-mono ${
                  allAbsentDates.length > 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {allAbsentDates.length} Days Absent
              </span>
            </div>

            <p className="text-[11px] text-rose-800">
              Dates where employee did not report to section or had leave of absence:
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
              {allAbsentDates.length === 0 ? (
                <div className="p-2 bg-white/80 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold w-full text-center">
                  ✓ 100% Perfect Attendance! Zero absences logged in period.
                </div>
              ) : (
                allAbsentDates.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-0.5 bg-white border border-rose-300 text-rose-800 rounded-lg text-[10px] font-mono font-bold shadow-2xs"
                  >
                    {d} (Absent)
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORKING PLACES DEPLOYMENT (PROJECT-WISE DUTY BREAKDOWN & FOOD ALLOCATION)
           ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                3. Working Places Deployment &amp; Food Allocation (All Sites Breakdown)
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                {workingPlacesBreakdown.length} Working {workingPlacesBreakdown.length === 1 ? 'Site' : 'Sites'}
              </span>
              <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center space-x-1">
                <Utensils className="h-3 w-3 text-amber-400" />
                <span>Total Food: {totalPeriodFoodCount} Meals</span>
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/40 space-y-3">
            {/* Top 3 KPI Summary Cards: Original Site vs Other Sites vs Total */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Original Site */}
              <div className="p-3 bg-white border-2 border-emerald-300 rounded-xl shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    🏠 Original Home Site
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{origPeriodDutyDays} Days</span>
                </div>
                <div className="text-xs font-black text-slate-900 truncate" title={originalSiteName}>
                  {originalSiteName}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Food Count:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    🍽️ {origPeriodFoodCount} Meals
                  </span>
                </div>
              </div>

              {/* 2. Other Sites with Exact Site Names */}
              <div className="p-3 bg-white border-2 border-blue-300 rounded-xl shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    🌐 Other Working Sites
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{otherPeriodDutyDays} Days</span>
                </div>
                <div className="text-xs font-black text-blue-950 truncate" title={otherSiteNamesSummary}>
                  {otherWorkingSites.length > 0 ? (
                    otherWorkingSites.map((wp) => wp.siteName).join(', ')
                  ) : (
                    <span className="text-slate-400 font-normal italic">None (100% at Base Site)</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Food Count:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    🍽️ {otherPeriodFoodCount} Meals
                  </span>
                </div>
              </div>

              {/* 3. Total Combined */}
              <div className="p-3 bg-white border-2 border-purple-300 rounded-xl shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    📊 Total All Sites
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-900">{totalPeriodDutyDays} Days</span>
                </div>
                <div className="text-xs font-black text-purple-950">Combined Active Muster</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Total Food Count:</span>
                  <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    🍽️ {totalPeriodFoodCount} Meals
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Text Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-emerald-200 rounded-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-950 flex-wrap gap-y-1">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Working Place Summary:</span>
                <span className="font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-bold">
                  {workingPlacesSummaryText}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Period: {effectiveStart} to {effectiveEnd}
              </span>
            </div>

            {/* Individual Site Breakdown Cards (Only Working Sites with Days > 0) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workingPlacesBreakdown.length === 0 ? (
                <div className="col-span-full p-6 text-center bg-white border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 font-medium">
                  No working duty shifts logged during this selected period.
                </div>
              ) : (
                workingPlacesBreakdown.map((wp) => (
                <div
                  key={wp.siteId}
                  className={`p-3.5 bg-white border rounded-xl shadow-2xs space-y-2.5 transition-colors ${
                    wp.isOriginalSite ? 'border-emerald-300 hover:border-emerald-500' : 'border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase tracking-wider ${
                        wp.isOriginalSite
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {wp.isOriginalSite ? '🏠 Original Home Site' : '🌐 Other Site (Cross-Site)'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-[10px] rounded-full">
                      {wp.daysCount} Days
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm truncate">
                    {wp.siteName}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>Working Duty:</span>
                    <strong className="text-emerald-700 font-mono">{wp.siteName} Working {wp.daysCount} days</strong>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Mandays Credit:</span>
                    <strong className="text-slate-800 font-mono">{wp.mandays} mandays</strong>
                  </div>

                  {/* Prominent Food Count Pill */}
                  <div className="p-2 bg-amber-50/90 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                      <Utensils className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Food Meals Count:</span>
                    </span>
                    <span className="font-mono font-black text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300 text-xs">
                      {wp.foodCount} Meals
                    </span>
                  </div>

                  {wp.allTimeDays > 0 && wp.allTimeDays !== wp.daysCount && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      All-Time Duty: {wp.allTimeDays} days &bull; Food: {wp.allTimeFoodCount} meals
                    </div>
                  )}

                  {wp.dates && wp.dates.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Duty Dates in Period ({wp.dates.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {wp.dates.map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[9px] rounded font-semibold"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. EMPLOYEES TRANSFER & MIGRATION HISTORY (SITE & SECTION MOVEMENTS)
           ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                4. Transfer &amp; Migration History (Site &amp; Section Movements)
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-blue-300 font-mono font-bold bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                {workerTransfers.length} Total Movements
              </span>
              <span className="text-[11px] text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                {transfersHistoryFormatted.filter((t) => t.isInPeriod).length} In This Period
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {transfersHistoryFormatted.length === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs font-medium text-slate-500">
                No site transfer or trade section shifts recorded for {worker.name}. Employee operates steadily at base assignment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {transfersHistoryFormatted.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition-all ${
                      t.isInPeriod
                        ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                            t.type === 'site'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {t.type === 'site' ? (
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

                        <span className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-blue-600" />
                          {t.date}
                        </span>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            t.scope === 'permanent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.scope}
                        </span>

                        {t.isInPeriod && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-600 text-white rounded">
                            Active In Period
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono">
                        Ref: #{t.id}
                      </div>
                    </div>

                    {/* Route Visualizer */}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                          From:
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-800">{t.fromSiteName}</span>
                          <span className="text-slate-400 ml-1 text-[11px]">({t.fromSectionName})</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 shrink-0">
                          To:
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-emerald-800">{t.toSiteName}</span>
                          <span className="text-emerald-600 ml-1 text-[11px]">({t.toSectionName})</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason & Approver */}
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 gap-1 pt-1 border-t border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-700">Reason: </span>
                        <span>{t.reason}</span>
                        {t.remarks && <span className="text-slate-400 italic ml-1">({t.remarks})</span>}
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 text-slate-500">
                        <ShieldCheck className="h-3 w-3 text-indigo-600" />
                        <span>Approved By: <strong className="text-slate-700">{t.approvedBy}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            5. ADVANCE PAYMENTS USING WITH DATES
           ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                5. Advance Payments &amp; Deductions Log With Dates
              </h4>
            </div>
            <span className="text-[11px] text-slate-300 font-mono">
              Taken: ₹{periodAdvancesTaken.toLocaleString()} | Rec: ₹{periodAdvanceRecovery.toLocaleString()}
            </span>
          </div>

          <div className="p-3">
            {filteredAdvances.length === 0 && filteredRecoveries.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs font-semibold text-slate-500">
                No advance loans taken or recoveries deducted during {dateRangeLabel}. Zero debt impact.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAdvances.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2.5 bg-rose-50/60 border border-rose-200/70 rounded-xl text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded">
                        ADVANCE
                      </span>
                      <span className="font-mono font-bold text-slate-800">{a.date}</span>
                      <span className="text-slate-600 text-[11px]">
                        ({a.reason || 'Emergency cash advance'} • Payout: {a.payoutMode || 'UPI'})
                      </span>
                    </div>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      +₹{a.amount.toLocaleString()}
                    </span>
                  </div>
                ))}

                {filteredRecoveries.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[10px] rounded">
                        RECOVERY
                      </span>
                      <span className="font-mono font-bold text-slate-800">{r.date}</span>
                      <span className="text-slate-600 text-[11px]">
                        (Method: {r.method} • {r.remarks || 'Salary wage cut deduction'})
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      -₹{r.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            5. LAST PRESENT RUNNING BALANCE CARD
           ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold text-[10px] rounded uppercase tracking-wider border border-blue-500/30">
                  Attendance Audit Highlight
                </span>
                <span className="text-xs text-slate-300 font-mono">Date: {lastPresentDate}</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                Last Present Day Running Balance
              </h4>
              <p className="text-[11px] text-slate-300 font-medium">
                Accrued wage credit balance calculated up to employee&apos;s last recorded present shift ({lastPresentDate}).
              </p>
            </div>

            <div className="text-left sm:text-right bg-slate-800/90 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Payable Running Balance
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ₹ {lastPresentRunningBalance.toLocaleString()}
              </span>
              <span className="text-[10px] text-teal-300 block font-semibold">
                ✓ Reconciled & Ready for Payout
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. SUPERVISOR SIGNATURE & EMPLOYEE SIGNATURE
           ========================================================================= */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              6. Authorization Signatures (Supervisor & Employee)
            </h4>
            <span className="text-[11px] text-slate-400">Draw signature or use 1-click digital stamp</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee Signature */}
            <div className="space-y-2">
              <SignaturePad
                label="Employee Signature (Emply Signacher)"
                signeeName={worker.name}
                roleDescription="Applicant Acknowledgment"
                value={workerSignature}
                onChange={setWorkerSignature}
              />
              <button
                type="button"
                onClick={handleStampWorkerSignature}
                className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
              >
                ✓ Apply 1-Click Employee Digital Stamp
              </button>
            </div>

            {/* Supervisor Signature */}
            <div className="space-y-2">
              <SignaturePad
                label="Supervisor Signature (Superivor Singnachar)"
                signeeName={supervisorName}
                roleDescription="Site Project In-Charge Authorization"
                value={supervisorSignature}
                onChange={setSupervisorSignature}
              />
              <button
                type="button"
                onClick={handleStampSupervisorSignature}
                className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
              >
                ✓ Apply 1-Click Supervisor Official Seal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Footer with Export & Close Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-4">
        <div className="text-xs text-slate-500 font-medium">
          Official Universal Attendance monthly voucher slip with weekly audit breakdown.
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            <span>Export to PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export to Image (PNG)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
