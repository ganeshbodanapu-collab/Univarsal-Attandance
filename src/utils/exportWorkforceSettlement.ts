import type {
  Worker,
  Site,
  Section,
  MonthlySettlementRecord,
  Advance,
  Recovery,
  Attendance,
  WorkerPayment,
} from '../types';

export interface WeeklyDataRow {
  weekNumber: number;
  weekLabel: string;
  dateRange: string;
  presentDaysCount: number;
  presentDates: string[];
  halfDaysCount: number;
  halfDaysDates: string[];
  absentDaysCount: number;
  absentDates: string[];
  weeklyGrossWage: number;
  weeklyAdvancesTaken: number;
  weeklyAdvancesDeducted: number;
  weeklyRunningBalance: number;
}

export interface TransferHistoryItem {
  id: string;
  date: string;
  type: 'site' | 'section';
  fromSiteName: string;
  fromSectionName: string;
  toSiteName: string;
  toSectionName: string;
  scope: string;
  reason: string;
  approvedBy: string;
  remarks?: string;
  isInPeriod?: boolean;
}

export interface WorkforceSettlementExportParams {
  worker: Worker;
  site?: Site;
  section?: Section;
  settlement: MonthlySettlementRecord;
  month: string; // e.g. "2026-08"
  weeklyData: WeeklyDataRow[];
  allPresentDates: string[];
  allHalfDayDates: string[];
  allAbsentDates: string[];
  workingPlacesBreakdown?: Array<{
    siteId?: string;
    siteName: string;
    isOriginalSite?: boolean;
    siteType?: 'original' | 'other';
    daysCount: number;
    mandays: number;
    foodCount?: number;
    allTimeDays?: number;
    allTimeFoodCount?: number;
    dates?: string[];
  }>;
  transfersHistory?: TransferHistoryItem[];
  monthAdvances: Advance[];
  monthRecoveries: Recovery[];
  lastPresentDate: string;
  lastPresentRunningBalance: number;
  dateRangeLabel?: string;
  overallClosingBalance?: number;
  overallOutstandingDebt?: number;
  overallGrossEarnings?: number;
  overallPaidAmount?: number;
  workerSignature?: string | null;
  supervisorSignature?: string | null;
  supervisorName?: string;
}

/**
 * Helper to draw rounded rectangle in Canvas 2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = true
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y + radius, x, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Generates a high-definition PNG image of the Workforce Weekly Summary & Settlement Slip using HTML5 Canvas.
 */
export async function exportWorkforceSettlementAsImage({
  worker,
  site,
  section,
  settlement,
  month,
  weeklyData,
  allPresentDates,
  allAbsentDates,
  workingPlacesBreakdown,
  transfersHistory,
  monthAdvances,
  monthRecoveries,
  lastPresentDate,
  lastPresentRunningBalance,
  dateRangeLabel,
  overallClosingBalance,
  overallOutstandingDebt,
  workerSignature,
  supervisorSignature,
  supervisorName = 'Site Supervisor',
}: WorkforceSettlementExportParams): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const hasWp = Boolean(workingPlacesBreakdown && workingPlacesBreakdown.length > 0);
  const wpCount = workingPlacesBreakdown?.length || 1;
  const hasTr = Boolean(transfersHistory && transfersHistory.length > 0);
  const trCount = Math.min(transfersHistory?.length || 0, 5);
  const height =
    (hasWp ? 1440 + wpCount * 26 + 40 : 1400) +
    (hasTr ? 40 + trCount * 26 + 20 : 0);
  const dpr = 2; // 2x for sharp high-DPI output

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas 2d context');

  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Header Banner (Slate-900)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 100);

  // Company Brand Title
  ctx.fillStyle = '#f59e0b'; // Amber-500
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('UNIVARSAL ATTANDANCE', 40, 42);

  ctx.fillStyle = '#94a3b8'; // Slate-400
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('WORKFORCE BILLING, WEEKLY MUSTER & SETTLEMENT SLIP', 40, 68);

  // Header Right: Document Badge
  ctx.fillStyle = '#38bdf8'; // Sky-400
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  const displayPeriod = dateRangeLabel ? `PERIOD: ${dateRangeLabel}` : `BILLING MONTH: ${month}`;
  ctx.fillText(displayPeriod, width - 40, 42);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, width - 40, 68);
  ctx.textAlign = 'left';

  // Worker Profile Header Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(40, 118, width - 80, 85);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(40, 118, width - 80, 85);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${worker.name.toUpperCase()} (ID: ${worker.id})`, 60, 150);

  ctx.fillStyle = '#475569';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `Site: ${site?.name || settlement.siteId}   •   Section: ${section?.name || settlement.sectionId}   •   Daily Wage: ₹${worker.dailyWage}/day`,
    60,
    178
  );

  // Status Tag on Right of Profile Box
  ctx.fillStyle = settlement.status === 'paid' ? '#059669' : settlement.status === 'approved' ? '#2563eb' : '#7c3aed';
  roundRect(ctx, width - 210, 136, 150, 44, 8, true, false);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`STATUS: ${settlement.status.toUpperCase()}`, width - 135, 163);
  ctx.textAlign = 'left';

  // Financial Summary KPI Cards (4 or 5 cards including Overall Closing Balance)
  const kpis = [
    { label: 'PERIOD GROSS', val: `₹${settlement.grossWage.toLocaleString()}`, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'ADV RECOVERY', val: `-₹${settlement.advanceRecovery.toLocaleString()}`, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
    { label: 'PERIOD NET PAY', val: `₹${settlement.netPay.toLocaleString()}`, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'LOAN DEBT', val: `₹${(overallOutstandingDebt ?? settlement.outstandingAdvance).toLocaleString()}`, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    ...(overallClosingBalance !== undefined
      ? [{ label: 'OVERALL CLOSING BAL', val: `₹${overallClosingBalance.toLocaleString()}`, color: '#047857', bg: '#d1fae5', border: '#10b981' }]
      : []),
  ];

  const spacing = 12;
  const cardW = (width - 80 - spacing * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, idx) => {
    const cardX = 40 + idx * (cardW + spacing);
    ctx.fillStyle = k.bg;
    ctx.strokeStyle = k.border;
    roundRect(ctx, cardX, 220, cardW, 68, 8, true, true);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
    ctx.fillText(k.label, cardX + 10, 242);

    ctx.fillStyle = k.color;
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(k.val, cardX + 10, 270);
  });

  // Section Title: WEEKLY SUMMARY BREAKDOWN
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('1. WEEKLY MUSTER & SUMMARY BREAKDOWN', 40, 316);

  // Weekly Table Header
  const tableY = 328;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, tableY, width - 80, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('WEEK PERIOD', 55, tableY + 22);
  ctx.fillText('DATES WINDOW', 160, tableY + 22);
  ctx.fillText('PRESENT DAYS', 310, tableY + 22);
  ctx.fillText('ABSENT DAYS', 490, tableY + 22);
  ctx.fillText('WEEKLY WAGE', 660, tableY + 22);
  ctx.fillText('ADVANCE ADJ.', 820, tableY + 22);
  ctx.fillText('RUNNING BAL.', 980, tableY + 22);

  // Table Rows
  let currentY = tableY + 34;
  weeklyData.forEach((row, rIdx) => {
    ctx.fillStyle = rIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
    ctx.fillRect(40, currentY, width - 80, 32);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(40, currentY, width - 80, 32);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Week ${row.weekNumber}`, 55, currentY + 20);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(row.dateRange, 160, currentY + 20);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${row.presentDaysCount} Days (${row.presentDates.length > 0 ? row.presentDates.slice(0, 3).map(d => d.slice(-2)).join(',') + (row.presentDates.length > 3 ? '...' : '') : 'None'})`, 310, currentY + 20);

    ctx.fillStyle = row.absentDaysCount > 0 ? '#e11d48' : '#64748b';
    ctx.fillText(`${row.absentDaysCount} Days (${row.absentDates.length > 0 ? row.absentDates.map(d => d.slice(-2)).join(',') : 'None'})`, 490, currentY + 20);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`₹${row.weeklyGrossWage.toLocaleString()}`, 660, currentY + 20);

    ctx.fillStyle = row.weeklyAdvancesDeducted > 0 ? '#e11d48' : '#64748b';
    ctx.fillText(row.weeklyAdvancesDeducted > 0 ? `-₹${row.weeklyAdvancesDeducted.toLocaleString()}` : '₹0', 820, currentY + 20);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`₹${row.weeklyRunningBalance.toLocaleString()}`, 980, currentY + 20);

    currentY += 32;
  });

  // Section 2: Total Present Days & Absent Days with Dates
  currentY += 24;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('2. ATTENDANCE DATES AUDIT (PRESENT & ABSENT DATES)', 40, currentY);

  currentY += 12;
  // Present Box
  const halfBoxW = (width - 80 - 15) / 2;
  ctx.fillStyle = '#ecfdf5';
  ctx.strokeStyle = '#a7f3d0';
  roundRect(ctx, 40, currentY, halfBoxW, 110, 8, true, true);

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`TOTAL PRESENT DAYS: ${allPresentDates.length} DAYS`, 55, currentY + 24);

  ctx.fillStyle = '#047857';
  ctx.font = '11px monospace';
  const presentDatesChunks: string[] = [];
  for (let i = 0; i < allPresentDates.length; i += 6) {
    presentDatesChunks.push(allPresentDates.slice(i, i + 6).join(', '));
  }
  presentDatesChunks.slice(0, 3).forEach((chunk, cIdx) => {
    ctx.fillText(chunk, 55, currentY + 48 + cIdx * 18);
  });

  // Absent Box
  ctx.fillStyle = '#fff1f2';
  ctx.strokeStyle = '#fecdd3';
  roundRect(ctx, 40 + halfBoxW + 15, currentY, halfBoxW, 110, 8, true, true);

  ctx.fillStyle = '#9f1239';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`TOTAL ABSENT DAYS: ${allAbsentDates.length} DAYS`, 40 + halfBoxW + 30, currentY + 24);

  ctx.fillStyle = '#be123c';
  ctx.font = '11px monospace';
  if (allAbsentDates.length === 0) {
    ctx.fillText('Zero Absences • 100% Full Attendance Record', 40 + halfBoxW + 30, currentY + 50);
  } else {
    const absentChunks: string[] = [];
    for (let i = 0; i < allAbsentDates.length; i += 6) {
      absentChunks.push(allAbsentDates.slice(i, i + 6).join(', '));
    }
    absentChunks.slice(0, 3).forEach((chunk, cIdx) => {
      ctx.fillText(chunk, 40 + halfBoxW + 30, currentY + 48 + cIdx * 18);
    });
  }

  // Section 3: Working Places Deployment & Food Meals Breakdown (Original & Other Sites)
  let sectionCounter = 3;
  if (workingPlacesBreakdown && workingPlacesBreakdown.length > 0) {
    currentY += 130;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${sectionCounter}. WORKING PLACES DEPLOYMENT & FOOD MEALS BREAKDOWN (ORIGINAL & OTHER SITES)`,
      40,
      currentY
    );

    currentY += 12;
    const boxHeight = 22 + workingPlacesBreakdown.length * 24 + 20;
    ctx.fillStyle = '#f0fdf4';
    ctx.strokeStyle = '#86efac';
    roundRect(ctx, 40, currentY, width - 80, boxHeight, 8, true, true);

    let siteY = currentY + 22;
    let totalFoodMeals = 0;
    let origFoodMeals = 0;
    let otherFoodMeals = 0;

    workingPlacesBreakdown.forEach((wp) => {
      const fCount = wp.foodCount !== undefined ? wp.foodCount : wp.daysCount;
      totalFoodMeals += fCount;
      if (wp.isOriginalSite) origFoodMeals += fCount;
      else otherFoodMeals += fCount;

      const tag = wp.isOriginalSite ? '[ORIGINAL HOME SITE]' : '[OTHER SITE / CROSS-SITE]';
      ctx.fillStyle = wp.isOriginalSite ? '#166534' : '#1e3a8a';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `📍 ${wp.siteName} ${tag} • Working: ${wp.daysCount} days (${wp.mandays} Mandays) • 🍽️ Food Count: ${fCount} Meals`,
        55,
        siteY
      );
      siteY += 22;
    });

    // Summary line
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(
      `📊 TOTAL FOOD: ${totalFoodMeals} MEALS (Original Site: ${origFoodMeals} Meals • Other Sites: ${otherFoodMeals} Meals)`,
      55,
      siteY
    );

    sectionCounter++;
    currentY += boxHeight + 16;
  } else {
    currentY += 130;
  }

  // Transfer & Migration History Section (Site & Section Movements)
  if (transfersHistory && transfersHistory.length > 0) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${sectionCounter}. TRANSFER & MIGRATION HISTORY (SITE & SECTION MOVEMENTS)`,
      40,
      currentY
    );

    currentY += 12;
    const trLimit = Math.min(transfersHistory.length, 5);
    const boxHeight = 22 + trLimit * 26 + 10;
    ctx.fillStyle = '#f0f9ff';
    ctx.strokeStyle = '#7dd3fc';
    roundRect(ctx, 40, currentY, width - 80, boxHeight, 8, true, true);

    let trY = currentY + 24;
    transfersHistory.slice(0, 5).forEach((tr) => {
      const isSite = tr.type === 'site';
      ctx.fillStyle = isSite ? '#1d4ed8' : '#6d28d9';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText(`[${isSite ? 'SITE TRANSFER' : 'SECTION SHIFT'}]`, 55, trY);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${tr.date}:`, 175, trY);

      ctx.fillStyle = '#334155';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `${tr.fromSiteName} (${tr.fromSectionName})  ➔  ${tr.toSiteName} (${tr.toSectionName}) • Scope: ${tr.scope.toUpperCase()}`,
        260,
        trY
      );

      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
      ctx.fillText(`(Reason: ${tr.reason} • Appr: ${tr.approvedBy})`, width - 380, trY);

      trY += 26;
    });

    sectionCounter++;
    currentY += boxHeight + 16;
  }

  // Advance Payments with Dates
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${sectionCounter}. ADVANCE PAYMENTS & RECOVERIES LOG WITH DATES`, 40, currentY);

  currentY += 12;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  roundRect(ctx, 40, currentY, width - 80, 100, 8, true, true);

  if (monthAdvances.length === 0 && monthRecoveries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText('No advance payouts or cash recoveries recorded for this worker in the billing period.', 55, currentY + 52);
  } else {
    let advY = currentY + 26;
    monthAdvances.forEach((adv) => {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`• ${adv.date}:`, 55, advY);
      ctx.fillStyle = '#e11d48';
      ctx.fillText(`ADVANCE TAKEN ₹${adv.amount.toLocaleString()}`, 155, advY);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`(${adv.reason || 'Cash Loan'} • Payout: ${adv.payoutMode || 'UPI'})`, 360, advY);
      advY += 22;
    });

    monthRecoveries.forEach((rec) => {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`• ${rec.date}:`, 55, advY);
      ctx.fillStyle = '#059669';
      ctx.fillText(`RECOVERY DEDUCTION ₹${rec.amount.toLocaleString()}`, 155, advY);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`(Method: ${rec.method} • ${rec.remarks || 'Payroll Adjustment'})`, 360, advY);
      advY += 22;
    });
  }

  // Section 4: Last Present Running Balance (Prominent Card)
  currentY += 120;
  ctx.fillStyle = '#0f172a'; // Deep slate banner
  roundRect(ctx, 40, currentY, width - 80, 84, 10, true, false);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px uppercase system-ui, -apple-system, sans-serif';
  ctx.fillText('LAST PRESENT DAY RECORDED', 60, currentY + 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(lastPresentDate || 'Month End', 60, currentY + 60);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px uppercase system-ui, -apple-system, sans-serif';
  ctx.fillText('LAST PRESENT RUNNING BALANCE', width - 380, currentY + 32);
  ctx.fillStyle = '#34d399'; // Emerald-400
  ctx.font = 'black 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(`₹ ${lastPresentRunningBalance.toLocaleString()}`, width - 380, currentY + 64);

  // Section 5: Signatures (Supervisor & Employee)
  currentY += 105;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('4. AUTHORIZATION SIGNATURES', 40, currentY);

  currentY += 12;
  const sigBoxW = (width - 80 - 20) / 2;

  // Employee Signature Box
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  roundRect(ctx, 40, currentY, sigBoxW, 110, 8, true, true);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px uppercase system-ui, -apple-system, sans-serif';
  ctx.fillText('EMPLOYEE SIGNATURE (EMPLY SIGNACHER)', 55, currentY + 22);

  // Employee Signature display
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(55, currentY + 80);
  ctx.lineTo(40 + sigBoxW - 20, currentY + 80);
  ctx.stroke();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'italic bold 16px Georgia, serif';
  ctx.fillText(workerSignature?.startsWith('data:image') ? '✓ Digitally Signed & Acknowledged' : (workerSignature || worker.name), 60, currentY + 65);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${worker.name} • Verified Applicant`, 55, currentY + 98);

  // Supervisor Signature Box
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  roundRect(ctx, 40 + sigBoxW + 20, currentY, sigBoxW, 110, 8, true, true);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px uppercase system-ui, -apple-system, sans-serif';
  ctx.fillText('SUPERVISOR SIGNATURE (SUPERIVOR SINGNACHAR)', 40 + sigBoxW + 35, currentY + 22);

  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(40 + sigBoxW + 35, currentY + 80);
  ctx.lineTo(width - 55, currentY + 80);
  ctx.stroke();

  ctx.fillStyle = '#065f46';
  ctx.font = 'italic bold 16px Georgia, serif';
  ctx.fillText(supervisorSignature?.startsWith('data:image') ? '✓ Official Authorization Seal' : (supervisorSignature || supervisorName), 40 + sigBoxW + 40, currentY + 65);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${supervisorName} • Site Authorization Seal`, 40 + sigBoxW + 35, currentY + 98);

  // Footer Verification Note
  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('UNIVARSAL ATTANDANCE & PAYROLL VERIFIED • OFFICIAL MONTHLY AUDIT SLIP', width / 2, height - 16);
  ctx.textAlign = 'left';

  // Trigger Instant Image Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Univarsal_Settlement_${worker.id}_${month}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Generates an official, printable HTML document for the Workforce Settlement & Weekly Summary and opens the browser's print / Save to PDF dialog.
 */
export async function exportWorkforceSettlementAsPDF({
  worker,
  site,
  section,
  settlement,
  month,
  weeklyData,
  allPresentDates,
  allAbsentDates,
  workingPlacesBreakdown,
  transfersHistory,
  monthAdvances,
  monthRecoveries,
  lastPresentDate,
  lastPresentRunningBalance,
  dateRangeLabel,
  overallClosingBalance,
  overallOutstandingDebt,
  workerSignature,
  supervisorSignature,
  supervisorName = 'Site Supervisor',
}: WorkforceSettlementExportParams): Promise<void> {
  const displayPeriod = dateRangeLabel ? `Search Dates: ${dateRangeLabel}` : `Billing Period: ${month}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Workforce Settlement Slip - ${worker.name} (${dateRangeLabel || month})</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
          body { padding: 24px; color: #0f172a; background: #fff; max-width: 960px; margin: 0 auto; font-size: 13px; line-height: 1.4; }
          .header-banner { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
          .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .brand-subtitle { font-size: 11px; font-weight: 700; color: #f59e0b; text-transform: uppercase; margin-top: 2px; }
          .doc-badge { text-align: right; }
          .doc-badge h2 { font-size: 14px; font-weight: 800; color: #2563eb; }
          .doc-badge p { font-size: 11px; color: #64748b; font-family: monospace; }
          
          .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .worker-title { font-size: 16px; font-weight: 800; color: #0f172a; }
          .worker-sub { font-size: 12px; color: #475569; margin-top: 3px; }
          .status-pill { background: #0f172a; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }

          .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
          .kpi-card { border-radius: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; }
          .kpi-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 18px; font-weight: 900; margin-top: 4px; font-family: monospace; }

          h3.sec-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin: 16px 0 8px 0; border-left: 3px solid #2563eb; padding-left: 8px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
          th { background: #1e293b; color: #fff; text-align: left; padding: 7px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }

          .dates-grid { display: flex; gap: 12px; margin-bottom: 16px; }
          .dates-box { flex: 1; border-radius: 8px; padding: 10px 12px; border: 1px solid #cbd5e1; }
          .dates-box.present { background: #ecfdf5; border-color: #a7f3d0; }
          .dates-box.absent { background: #fff1f2; border-color: #fecdd3; }
          .dates-header { font-size: 11px; font-weight: 800; margin-bottom: 6px; }
          .dates-list { font-size: 10px; font-family: monospace; line-height: 1.5; word-break: break-all; }

          .running-balance-box { background: #0f172a; color: #fff; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .rb-label { font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; }
          .rb-date { font-size: 14px; font-family: monospace; font-weight: 700; color: #fff; margin-top: 2px; }
          .rb-amount { font-size: 24px; font-weight: 900; color: #34d399; text-align: right; font-family: monospace; }
          .rb-sub { font-size: 10px; color: #38bdf8; text-align: right; margin-top: 2px; }

          .signatures-box { display: flex; justify-content: space-between; gap: 20px; margin-top: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sig-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
          .sig-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
          .sig-line { height: 45px; display: flex; align-items: center; justify-content: center; font-family: Georgia, serif; font-style: italic; font-size: 15px; font-weight: bold; border-bottom: 1px dashed #cbd5e1; margin-bottom: 6px; }

          .print-btn-bar { margin-bottom: 14px; text-align: right; }
          .print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
          @media print {
            .print-btn-bar { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header-banner">
          <div>
            <div class="brand-title">UNIVARSAL ATTANDANCE</div>
            <div class="brand-subtitle">Workforce Billing, Weekly Muster & Settlement Slip</div>
          </div>
          <div class="doc-badge">
            <h2>WORKFORCE AUDIT &amp; SETTLEMENT SLIP</h2>
            <p>${displayPeriod}</p>
          </div>
        </div>

        <div class="meta-box">
          <div>
            <div class="worker-title">${worker.name.toUpperCase()} (ID: ${worker.id})</div>
            <div class="worker-sub">
              Project Site: <strong>${site?.name || settlement.siteId}</strong> &bull; 
              Section: <strong>${section?.name || settlement.sectionId}</strong> &bull; 
              Daily Wage: <strong>₹${worker.dailyWage}/day</strong>
            </div>
          </div>
          <div class="status-pill">${settlement.status.toUpperCase()}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="background: #eff6ff;">
            <div class="kpi-label">Period Gross Wages</div>
            <div class="kpi-val" style="color: #2563eb;">₹${settlement.grossWage.toLocaleString()}</div>
          </div>
          <div class="kpi-card" style="background: #fff1f2;">
            <div class="kpi-label">Advance Recovery</div>
            <div class="kpi-val" style="color: #e11d48;">-₹${settlement.advanceRecovery.toLocaleString()}</div>
          </div>
          <div class="kpi-card" style="background: #ecfdf5;">
            <div class="kpi-label">Period Net Payable</div>
            <div class="kpi-val" style="color: #059669;">₹${settlement.netPay.toLocaleString()}</div>
          </div>
          <div class="kpi-card" style="background: #fffbeb;">
            <div class="kpi-label">Outstanding Debt</div>
            <div class="kpi-val" style="color: #d97706;">₹${(overallOutstandingDebt ?? settlement.outstandingAdvance).toLocaleString()}</div>
          </div>
          ${
            overallClosingBalance !== undefined
              ? `
          <div class="kpi-card" style="background: #d1fae5; border: 2px solid #059669;">
            <div class="kpi-label" style="color: #065f46; font-weight: 800;">OVERALL CLOSING BALANCE</div>
            <div class="kpi-val" style="color: #047857; font-size: 20px;">₹${overallClosingBalance.toLocaleString()}</div>
            <div style="font-size: 9px; color: #047857; font-weight: 700; margin-top: 2px;">★ Lifetime Account Balance</div>
          </div>`
              : ''
          }
        </div>

        <h3 class="sec-title">1. Weekly Muster & Summary Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Dates Window</th>
              <th>Present Days & Dates</th>
              <th>Absent Days & Dates</th>
              <th style="text-align: right;">Weekly Wage</th>
              <th style="text-align: right;">Advance Adj.</th>
              <th style="text-align: right;">Running Bal.</th>
            </tr>
          </thead>
          <tbody>
            ${weeklyData
              .map(
                (w) => `
              <tr>
                <td><strong>Week ${w.weekNumber}</strong></td>
                <td style="font-family: monospace;">${w.dateRange}</td>
                <td style="color: #059669;"><strong>${w.presentDaysCount} Days</strong> <span style="color: #64748b; font-size: 10px;">(${w.presentDates.length > 0 ? w.presentDates.map(d => d.slice(-2)).join(',') : '—'})</span></td>
                <td style="color: ${w.absentDaysCount > 0 ? '#e11d48' : '#64748b'};"><strong>${w.absentDaysCount} Days</strong> <span style="font-size: 10px;">(${w.absentDates.length > 0 ? w.absentDates.map(d => d.slice(-2)).join(',') : '—'})</span></td>
                <td style="text-align: right; font-family: monospace; font-weight: 700;">₹${w.weeklyGrossWage.toLocaleString()}</td>
                <td style="text-align: right; font-family: monospace; color: ${w.weeklyAdvancesDeducted > 0 ? '#e11d48' : '#64748b'}; font-weight: 700;">${w.weeklyAdvancesDeducted > 0 ? `-₹${w.weeklyAdvancesDeducted.toLocaleString()}` : '₹0'}</td>
                <td style="text-align: right; font-family: monospace; color: #059669; font-weight: 800;">₹${w.weeklyRunningBalance.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h3 class="sec-title">2. Attendance Dates Audit (Present & Absent Dates)</h3>
        <div class="dates-grid">
          <div class="dates-box present">
            <div class="dates-header" style="color: #065f46;">✓ TOTAL PRESENT DAYS: ${allPresentDates.length} DAYS</div>
            <div class="dates-list" style="color: #047857;">${allPresentDates.join(', ') || 'No present days recorded'}</div>
          </div>
          <div class="dates-box absent">
            <div class="dates-header" style="color: #9f1239;">✗ TOTAL ABSENT DAYS: ${allAbsentDates.length} DAYS</div>
            <div class="dates-list" style="color: #be123c;">${allAbsentDates.length > 0 ? allAbsentDates.join(', ') : 'Zero Absences (100% Attendance)'}</div>
          </div>
        </div>

        ${
          workingPlacesBreakdown && workingPlacesBreakdown.length > 0
            ? `
          <h3 class="sec-title">3. Working Places Deployment &amp; Food Meals Breakdown (Original &amp; Other Sites)</h3>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-weight: 800; font-size: 11px; color: #166534; text-transform: uppercase;">📍 Duty Deployment &amp; Food Meals Allocation:</span>
              <span style="font-size: 10px; font-weight: 800; background: #dcfce7; padding: 2px 8px; border-radius: 4px; color: #15803d;">
                Total Food: ${workingPlacesBreakdown.reduce((sum, wp) => sum + (wp.foodCount !== undefined ? wp.foodCount : wp.daysCount), 0)} Meals
              </span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${workingPlacesBreakdown
                .map(
                  (wp) =>
                    `<div style="background: #ffffff; border: 1px solid ${wp.isOriginalSite ? '#86efac' : '#93c5fd'}; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${wp.isOriginalSite ? '#dcfce7' : '#dbeafe'}; color: ${wp.isOriginalSite ? '#15803d' : '#1d4ed8'}; padding: 1px 6px; border-radius: 4px;">
                          ${wp.isOriginalSite ? '🏠 Original Site' : '🌐 Other Site'}
                        </span>
                        <strong style="color: #0f172a;">${wp.siteName}</strong>
                      </div>
                      <div style="margin-top: 4px; font-size: 10px; color: #475569; display: flex; gap: 8px;">
                        <span>Working: <strong style="color: #166534;">${wp.daysCount} days</strong> (${wp.mandays}m)</span>
                        <span>•</span>
                        <span style="color: #b45309; font-weight: 800;">🍽️ Food Count: ${wp.foodCount !== undefined ? wp.foodCount : wp.daysCount} Meals</span>
                      </div>
                    </div>`
                )
                .join('')}
            </div>
          </div>`
            : ''
        }

        ${
          transfersHistory && transfersHistory.length > 0
            ? `
          <h3 class="sec-title">Transfer &amp; Migration History (Site &amp; Section Movements)</h3>
          <table style="margin-bottom: 16px;">
            <thead>
              <tr style="background: #eff6ff;">
                <th style="width: 85px;">Date</th>
                <th style="width: 120px;">Movement Mode</th>
                <th>Origin (From)</th>
                <th>Destination (To)</th>
                <th style="width: 85px;">Scope</th>
                <th>Reason &amp; Approver</th>
              </tr>
            </thead>
            <tbody>
              ${transfersHistory
                .map(
                  (tr) => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${tr.date}</td>
                  <td>
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; background: ${
                      tr.type === 'site' ? '#dbeafe' : '#e0e7ff'
                    }; color: ${tr.type === 'site' ? '#1d4ed8' : '#4338ca'};">
                      ${tr.type === 'site' ? '🏢 Site Transfer' : '🔀 Section Shift'}
                    </span>
                  </td>
                  <td>${tr.fromSiteName} <small style="color: #64748b;">(${tr.fromSectionName})</small></td>
                  <td style="font-weight: 700; color: #15803d;">${tr.toSiteName} <small style="color: #15803d;">(${tr.toSectionName})</small></td>
                  <td style="font-weight: 700; text-transform: uppercase; font-size: 10px;">${tr.scope}</td>
                  <td>${tr.reason} <small style="color: #64748b;">(Approved By: ${tr.approvedBy}${tr.remarks ? ` • ${tr.remarks}` : ''})</small></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
            : ''
        }

        <h3 class="sec-title">Advance Payments &amp; Recoveries Log With Dates</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Type</th>
              <th>Payout / Repay Mode</th>
              <th style="text-align: right;">Amount (₹)</th>
              <th>Remarks / Purpose</th>
            </tr>
          </thead>
          <tbody>
            ${
              monthAdvances.length === 0 && monthRecoveries.length === 0
                ? '<tr><td colspan="5" style="text-align: center; color: #64748b;">No advance or recovery transactions recorded this month.</td></tr>'
                : `
                ${monthAdvances
                  .map(
                    (a) => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">${a.date}</td>
                    <td style="color: #e11d48; font-weight: 700;">Advance Issued</td>
                    <td style="text-transform: uppercase;">${a.payoutMode || 'UPI'}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 800; color: #e11d48;">₹${a.amount.toLocaleString()}</td>
                    <td>${a.reason || 'Salary advance'}</td>
                  </tr>
                `
                  )
                  .join('')}
                ${monthRecoveries
                  .map(
                    (r) => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">${r.date}</td>
                    <td style="color: #059669; font-weight: 700;">Advance Deduction</td>
                    <td>${r.method}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 800; color: #059669;">-₹${r.amount.toLocaleString()}</td>
                    <td>${r.remarks || 'Salary recovery'}</td>
                  </tr>
                `
                  )
                  .join('')}
              `
            }
          </tbody>
        </table>

        <div class="running-balance-box">
          <div>
            <div class="rb-label">Last Present Day Recorded</div>
            <div class="rb-date">${lastPresentDate || 'Month End'}</div>
          </div>
          <div>
            <div class="rb-amount">₹${lastPresentRunningBalance.toLocaleString()}</div>
            <div class="rb-sub">Running Balance as of Last Present Day</div>
          </div>
        </div>

        <div class="signatures-box">
          <div class="sig-card">
            <div class="sig-label">Employee Signature (Emply Signacher)</div>
            <div class="sig-line" style="color: #1e3a8a;">
              ${workerSignature?.startsWith('data:image') ? '✓ Digitally Signed & Acknowledged' : (workerSignature || worker.name)}
            </div>
            <p style="font-size: 10px; color: #64748b;">Applicant Acknowledgment &bull; ${worker.name}</p>
          </div>

          <div class="sig-card">
            <div class="sig-label">Supervisor Signature (Superivor Singnachar)</div>
            <div class="sig-line" style="color: #065f46;">
              ${supervisorSignature?.startsWith('data:image') ? '✓ Official Authorization Seal' : (supervisorSignature || supervisorName)}
            </div>
            <p style="font-size: 10px; color: #64748b;">Authorized Project Seal &bull; ${supervisorName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Use hidden iframe to trigger print
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}

/**
 * Calculates complete weekly summary, present/absent dates, advances, and last present running balance for a worker.
 */
export function computeWorkerMonthlyAudit({
  worker,
  settlement,
  month,
  attendance,
  advances,
  recoveries,
  payments,
  sites,
}: {
  worker: Worker;
  settlement: MonthlySettlementRecord;
  month: string;
  attendance: Attendance[];
  advances: Advance[];
  recoveries: Recovery[];
  payments: WorkerPayment[];
  sites?: Site[];
}) {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const monthAttendance = attendance.filter(
    (a) => a.workerId === worker.id && a.date.startsWith(month)
  );

  const monthAdvances = advances.filter(
    (a) => a.workerId === worker.id && a.date.startsWith(month)
  );
  const monthRecoveries = recoveries.filter(
    (r) => r.workerId === worker.id && r.date.startsWith(month)
  );

  const allPresentDates = monthAttendance
    .filter((a) => a.status === 'present')
    .map((a) => a.date)
    .sort();

  const allHalfDayDates = monthAttendance
    .filter((a) => a.status === 'halfDay')
    .map((a) => a.date)
    .sort();

  const allAbsentDates = monthAttendance
    .filter((a) => a.status === 'absent')
    .map((a) => a.date)
    .sort();

  const weekWindows = [
    { num: 1, start: 1, end: 7 },
    { num: 2, start: 8, end: 14 },
    { num: 3, start: 15, end: 21 },
    { num: 4, start: 22, end: 28 },
    { num: 5, start: 29, end: daysInMonth },
  ];

  let cumulativeRunningBal = 0;
  const weeklyData: WeeklyDataRow[] = weekWindows.map((win) => {
    const startStr = `${month}-${String(win.start).padStart(2, '0')}`;
    const endStr = `${month}-${String(win.end).padStart(2, '0')}`;

    const weekAttendance = monthAttendance.filter(
      (a) => a.date >= startStr && a.date <= endStr
    );

    const pRecords = weekAttendance.filter((a) => a.status === 'present');
    const hRecords = weekAttendance.filter((a) => a.status === 'halfDay');
    const aRecords = weekAttendance.filter((a) => a.status === 'absent');

    const weeklyGrossWage =
      pRecords.length * worker.dailyWage + hRecords.length * (worker.dailyWage * 0.5);

    const weekAdv = monthAdvances.filter(
      (adv) => adv.date >= startStr && adv.date <= endStr
    );
    const weekAdvancesTaken = weekAdv.reduce((sum, a) => sum + a.amount, 0);

    const weekRec = monthRecoveries.filter(
      (rec) => rec.date >= startStr && rec.date <= endStr
    );
    const weeklyAdvancesDeducted = weekRec.reduce((sum, r) => sum + r.amount, 0);

    cumulativeRunningBal += weeklyGrossWage - weeklyAdvancesDeducted;

    return {
      weekNumber: win.num,
      weekLabel: `Week ${win.num}`,
      dateRange: `${monthStr}/${String(win.start).padStart(2, '0')} - ${monthStr}/${String(win.end).padStart(2, '0')}`,
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

  const workedAttendanceDates = monthAttendance
    .filter((a) => a.status === 'present' || a.status === 'halfDay')
    .map((a) => a.date)
    .sort();

  const lastPresentDate =
    workedAttendanceDates.length > 0
      ? workedAttendanceDates[workedAttendanceDates.length - 1]
      : `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const earnedUpToLastPresent = monthAttendance
    .filter((a) => a.date <= lastPresentDate && (a.status === 'present' || a.status === 'halfDay'))
    .reduce(
      (sum, a) => sum + (a.status === 'present' ? worker.dailyWage : worker.dailyWage * 0.5),
      0
    );

  const deductionsUpToLastPresent = monthRecoveries
    .filter((r) => r.date <= lastPresentDate)
    .reduce((sum, r) => sum + r.amount, 0);

  const paidUpToLastPresent = payments
    .filter(
      (p) =>
        p.workerId === worker.id &&
        p.date.startsWith(month) &&
        p.date <= lastPresentDate &&
        p.status === 'paid'
    )
    .reduce((sum, p) => sum + p.netPay, 0);

  const lastPresentRunningBalance = Math.max(
    0,
    (earnedUpToLastPresent || settlement.grossWage) -
      (deductionsUpToLastPresent || settlement.advanceRecovery) -
      paidUpToLastPresent
  );

  const originalSiteId = worker.currentSiteId || 'default';
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

  monthAttendance
    .filter((a) => a.status === 'present' || a.status === 'halfDay')
    .forEach((a) => {
      const sId = a.siteId || originalSiteId;
      const sName = (sites || []).find((s) => s.id === sId)?.name || (sId !== 'default' ? sId : 'Assigned Site');
      const isOriginal = sId === originalSiteId;
      const dayManday = a.status === 'present' ? 1 : 0.5;

      if (!workingPlacesMap[sId]) {
        workingPlacesMap[sId] = {
          siteId: sId,
          siteName: sName,
          isOriginalSite: isOriginal,
          siteType: isOriginal ? 'original' : 'other',
          daysCount: 0,
          mandays: 0,
          foodCount: 0,
          dates: [],
        };
      }
      workingPlacesMap[sId].daysCount += 1;
      workingPlacesMap[sId].mandays += dayManday;
      workingPlacesMap[sId].foodCount += dayManday;
      workingPlacesMap[sId].dates.push(a.date);
    });

  const workingPlacesBreakdown = Object.values(workingPlacesMap)
    .filter((wp) => wp.daysCount > 0)
    .sort((a, b) => {
      if (a.isOriginalSite && !b.isOriginalSite) return -1;
      if (!a.isOriginalSite && b.isOriginalSite) return 1;
      return b.daysCount - a.daysCount;
    });

  return {
    weeklyData,
    allPresentDates,
    allHalfDayDates,
    allAbsentDates,
    workingPlacesBreakdown,
    monthAdvances,
    monthRecoveries,
    lastPresentDate,
    lastPresentRunningBalance,
  };
}

