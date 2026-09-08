import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
} from 'lucide-react';

export interface ReportKpi {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
}

export interface WorkingPlaceSummary {
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
}

export interface TransferAuditRecord {
  id: string;
  date: string;
  type: 'site' | 'section';
  workerId?: string;
  workerName?: string;
  fromSiteName: string;
  fromSectionName: string;
  toSiteName: string;
  toSectionName: string;
  scope: string;
  reason: string;
  approvedBy: string;
  remarks?: string;
}

export interface CustomAuditSlipDetails {
  workerName?: string;
  workerId?: string;
  totalPresentCount: number;
  presentDates: string[];
  totalAbsentCount: number;
  absentDates: string[];
  workingPlacesBreakdown?: WorkingPlaceSummary[];
  transferHistory?: TransferAuditRecord[];
  advancePayments: Array<{
    date: string;
    amount: number;
    reason?: string;
    type?: 'advance' | 'recovery';
  }>;
  lastPresentDate: string;
  lastPresentRunningBalance: number;
  overallClosingBalance?: number;
  workerSignature?: string | null;
  supervisorSignature?: string | null;
}

export interface UniversalReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  subtitle?: string;
  periodLabel: string;
  filterSummary?: Array<{ label: string; value: string }>;
  summaryKpis?: ReportKpi[];
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  signatures?: {
    supervisorName?: string;
    showDualSignature?: boolean;
    workerName?: string;
    supervisorSignature?: string | null;
    workerSignature?: string | null;
  };
  customAuditDetails?: CustomAuditSlipDetails;
}

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

export const UniversalReportExportModal: React.FC<UniversalReportExportModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  subtitle,
  periodLabel,
  filterSummary = [],
  summaryKpis = [],
  tableHeaders,
  tableRows,
  signatures = { supervisorName: 'Site Supervisor', showDualSignature: true },
  customAuditDetails,
}) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  /**
   * Generates a high-definition PNG image of the report using HTML5 Canvas
   */
  const handleExportAsImage = async () => {
    setIsExportingImage(true);
    try {
      const width = 1200;
      const rowHeight = 34;
      const kpiHeight = summaryKpis.length > 0 ? 85 : 0;
      const hasWorkingPlaces = Boolean(
        customAuditDetails?.workingPlacesBreakdown && customAuditDetails.workingPlacesBreakdown.length > 0
      );
      const wpCount = customAuditDetails?.workingPlacesBreakdown?.length || 1;
      const wpHeight = hasWorkingPlaces ? 50 + wpCount * 26 + 30 : 0;
      const hasTransfers = Boolean(
        customAuditDetails?.transferHistory && customAuditDetails.transferHistory.length > 0
      );
      const trCount = Math.min(customAuditDetails?.transferHistory?.length || 0, 4);
      const trHeight = hasTransfers ? 40 + trCount * 22 + 20 : 0;
      const auditHeight = customAuditDetails ? 420 + wpHeight + trHeight : 0;
      const calculatedHeight = Math.max(
        900,
        140 + 80 + kpiHeight + 60 + (tableRows.length + 1) * rowHeight + auditHeight + 170
      );

      const canvas = document.createElement('canvas');
      const dpr = 2; // High-DPI
      canvas.width = width * dpr;
      canvas.height = calculatedHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas 2d context');

      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, calculatedHeight);

      // Outer Border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, width - 4, calculatedHeight - 4);

      // 1. Header Banner
      ctx.fillStyle = '#0f172a'; // Slate-900
      ctx.fillRect(0, 0, width, 95);

      // Company Title
      ctx.fillStyle = '#f59e0b'; // Amber-500
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('UNIVARSAL ATTANDANCE', 40, 40);

      ctx.fillStyle = '#94a3b8'; // Slate-400
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(subtitle || 'STATUTORY WORKFORCE, ATTENDANCE & FINANCIAL AUDIT REPORT', 40, 66);

      // Header Right: Document Badge
      ctx.fillStyle = '#38bdf8'; // Sky-400
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(reportTitle.toUpperCase(), width - 40, 38);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Period: ${periodLabel}`,
        width - 40,
        64
      );
      ctx.textAlign = 'left';

      // 2. Metadata Box
      let currentY = 115;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(40, currentY, width - 80, 60);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(40, currentY, width - 80, 60);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(reportTitle, 60, currentY + 28);

      const filterText = [
        `Period: ${periodLabel}`,
        ...filterSummary.map((f) => `${f.label}: ${f.value}`),
      ].join('   •   ');

      ctx.fillStyle = '#475569';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(filterText, 60, currentY + 48);

      currentY += 75;

      // 3. Summary KPIs (if any)
      if (summaryKpis.length > 0) {
        const kpiCount = summaryKpis.length;
        const spacing = 12;
        const totalGap = spacing * (kpiCount - 1);
        const cardWidth = (width - 80 - totalGap) / kpiCount;

        summaryKpis.forEach((kpi, idx) => {
          const cardX = 40 + idx * (cardWidth + spacing);
          ctx.fillStyle = kpi.bg || '#f1f5f9';
          ctx.strokeStyle = '#cbd5e1';
          ctx.fillRect(cardX, currentY, cardWidth, 68);
          ctx.strokeRect(cardX, currentY, cardWidth, 68);

          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(kpi.label.toUpperCase(), cardX + 14, currentY + 24);

          ctx.fillStyle = kpi.color || '#0f172a';
          ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
          ctx.fillText(String(kpi.value), cardX + 14, currentY + 52);
        });

        currentY += 85;
      }

      // 4. Data Table Header
      const colCount = tableHeaders.length;
      const tableWidth = width - 80;
      const colWidth = tableWidth / Math.max(1, colCount);

      ctx.fillStyle = '#1e293b'; // Slate-800
      ctx.fillRect(40, currentY, tableWidth, 34);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      tableHeaders.forEach((th, cIdx) => {
        const x = 52 + cIdx * colWidth;
        ctx.fillText(th.toUpperCase(), x, currentY + 22);
      });

      currentY += 34;

      // 5. Data Rows
      tableRows.forEach((row, rIdx) => {
        ctx.fillStyle = rIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
        ctx.fillRect(40, currentY, tableWidth, rowHeight);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(40, currentY, tableWidth, rowHeight);

        ctx.fillStyle = '#1e293b';
        ctx.font = '11px system-ui, -apple-system, sans-serif';

        row.forEach((cell, cIdx) => {
          const x = 52 + cIdx * colWidth;
          const strVal = String(cell ?? '—');
          const truncated = strVal.length > 25 ? `${strVal.substring(0, 23)}...` : strVal;
          ctx.fillText(truncated, x, currentY + 21);
        });

        currentY += rowHeight;
      });

      // 6. Custom Audit Details Section (Present Dates, Absent Dates, Advances with Dates, Running Balance)
      if (customAuditDetails) {
        currentY += 24;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('CUSTOM AUDIT: PRESENT & ABSENT DATES AUDIT', 40, currentY);

        currentY += 10;
        const boxW = (tableWidth - 16) / 2;

        // Present Dates Box
        ctx.fillStyle = '#ecfdf5';
        ctx.strokeStyle = '#a7f3d0';
        roundRect(ctx, 40, currentY, boxW, 80, 8, true, true);

        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(
          `TOTAL PRESENT DAYS: ${customAuditDetails.totalPresentCount} DAYS`,
          55,
          currentY + 22
        );

        ctx.fillStyle = '#047857';
        ctx.font = '10px monospace';
        const pStr = customAuditDetails.presentDates.slice(0, 8).join(', ');
        ctx.fillText(pStr || 'None recorded', 55, currentY + 44);
        if (customAuditDetails.presentDates.length > 8) {
          ctx.fillText(`+ ${customAuditDetails.presentDates.length - 8} more dates`, 55, currentY + 62);
        }

        // Absent Dates Box
        ctx.fillStyle = '#fff1f2';
        ctx.strokeStyle = '#fecdd3';
        roundRect(ctx, 40 + boxW + 16, currentY, boxW, 80, 8, true, true);

        ctx.fillStyle = '#9f1239';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(
          `TOTAL ABSENT DAYS: ${customAuditDetails.totalAbsentCount} DAYS`,
          40 + boxW + 30,
          currentY + 22
        );

        ctx.fillStyle = '#be123c';
        ctx.font = '10px monospace';
        const aStr = customAuditDetails.absentDates.slice(0, 8).join(', ');
        ctx.fillText(aStr || 'Zero absences (100% attendance)', 40 + boxW + 30, currentY + 44);

        currentY += 95;

        // Working Places Deployment & Food Meals Breakdown (Original & Other Sites)
        if (customAuditDetails.workingPlacesBreakdown && customAuditDetails.workingPlacesBreakdown.length > 0) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
          ctx.fillText('WORKING PLACES DEPLOYMENT & FOOD MEALS BREAKDOWN (ORIGINAL & OTHER SITES)', 40, currentY);

          currentY += 10;
          const boxHeight = 24 + customAuditDetails.workingPlacesBreakdown.length * 24 + 20;
          ctx.fillStyle = '#f0fdf4';
          ctx.strokeStyle = '#86efac';
          roundRect(ctx, 40, currentY, tableWidth, boxHeight, 8, true, true);

          let siteY = currentY + 22;
          let totalFoodMeals = 0;
          let origFoodMeals = 0;
          let otherFoodMeals = 0;

          customAuditDetails.workingPlacesBreakdown.forEach((wp) => {
            const fCount = wp.foodCount !== undefined ? wp.foodCount : wp.daysCount;
            totalFoodMeals += fCount;
            if (wp.isOriginalSite) origFoodMeals += fCount;
            else otherFoodMeals += fCount;

            const siteTypeTag = wp.isOriginalSite ? '[ORIGINAL HOME SITE]' : '[OTHER SITE / CROSS-SITE]';
            ctx.fillStyle = wp.isOriginalSite ? '#166534' : '#1e3a8a';
            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.fillText(
              `📍 ${wp.siteName} ${siteTypeTag} • Working: ${wp.daysCount} days (${wp.mandays} Mandays) • 🍽️ Food Count: ${fCount} Meals`,
              55,
              siteY
            );
            siteY += 22;
          });

          // Summary bar inside canvas box
          ctx.fillStyle = '#047857';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(
            `📊 TOTAL FOOD: ${totalFoodMeals} MEALS (Original Site: ${origFoodMeals} Meals • Other Sites: ${otherFoodMeals} Meals)`,
            55,
            siteY
          );

          currentY += boxHeight + 16;
        }

        // Transfer & Migration History in Canvas
        if (customAuditDetails.transferHistory && customAuditDetails.transferHistory.length > 0) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
          ctx.fillText('TRANSFER & MIGRATION HISTORY (SITE & SECTION MOVEMENTS)', 40, currentY);

          currentY += 10;
          const trLimit = Math.min(customAuditDetails.transferHistory.length, 4);
          const boxHeight = 20 + trLimit * 22 + 10;
          ctx.fillStyle = '#f0f9ff';
          ctx.strokeStyle = '#7dd3fc';
          roundRect(ctx, 40, currentY, tableWidth, boxHeight, 8, true, true);

          let trY = currentY + 22;
          customAuditDetails.transferHistory.slice(0, 4).forEach((tr) => {
            const isSite = tr.type === 'site';
            ctx.fillStyle = isSite ? '#1d4ed8' : '#6d28d9';
            ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
            ctx.fillText(`[${isSite ? 'SITE TRANSFER' : 'SECTION SHIFT'}]`, 55, trY);

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`${tr.date}:`, 175, trY);

            ctx.fillStyle = '#334155';
            ctx.font = '11px system-ui, -apple-system, sans-serif';
            const workerPrefix = tr.workerName ? `${tr.workerName} • ` : '';
            ctx.fillText(
              `${workerPrefix}${tr.fromSiteName} (${tr.fromSectionName}) ➔ ${tr.toSiteName} (${tr.toSectionName}) • [${tr.scope.toUpperCase()}]`,
              260,
              trY
            );

            ctx.fillStyle = '#64748b';
            ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
            ctx.fillText(`(${tr.reason})`, width - 280, trY);

            trY += 22;
          });

          currentY += boxHeight + 16;
        }

        // Advance Payments using with Dates
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('ADVANCE PAYMENTS & RECOVERIES LOG WITH DATES', 40, currentY);

        currentY += 10;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        roundRect(ctx, 40, currentY, tableWidth, 70, 8, true, true);

        if (customAuditDetails.advancePayments.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '11px system-ui, -apple-system, sans-serif';
          ctx.fillText('No cash advances or recoveries recorded for this period.', 55, currentY + 38);
        } else {
          let advY = currentY + 22;
          customAuditDetails.advancePayments.slice(0, 2).forEach((adv) => {
            ctx.fillStyle = adv.type === 'recovery' ? '#059669' : '#e11d48';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(
              `• ${adv.date}: ${adv.type === 'recovery' ? 'RECOVERY -₹' : 'ADVANCE +₹'}${adv.amount.toLocaleString()} (${adv.reason || 'Cash'})`,
              55,
              advY
            );
            advY += 20;
          });
        }

        currentY += 82;

        // Last Present Running Balance & Overall Closing Balance Banner
        ctx.fillStyle = '#0f172a';
        roundRect(ctx, 40, currentY, tableWidth, 55, 8, true, false);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px uppercase system-ui, -apple-system, sans-serif';
        ctx.fillText(`LAST PRESENT DATE: ${customAuditDetails.lastPresentDate}`, 55, currentY + 24);

        if (customAuditDetails.overallClosingBalance !== undefined) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('RUNNING BAL:', width - 460, currentY + 24);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillText(
            `₹ ${customAuditDetails.lastPresentRunningBalance.toLocaleString()}`,
            width - 460,
            currentY + 46
          );

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 10px uppercase system-ui, -apple-system, sans-serif';
          ctx.fillText('OVERALL CLOSING BAL:', width - 240, currentY + 24);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillText(
            `₹ ${customAuditDetails.overallClosingBalance.toLocaleString()}`,
            width - 240,
            currentY + 46
          );
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('LAST PRESENT RUNNING BALANCE:', width - 360, currentY + 24);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
          ctx.fillText(
            `₹ ${customAuditDetails.lastPresentRunningBalance.toLocaleString()}`,
            width - 360,
            currentY + 46
          );
        }

        currentY += 68;
      }

      // 7. Signatures Section (Supervisor Signature & Employee Signature)
      currentY += 20;
      const sigBoxW = (tableWidth - 40) / 2;

      // Employee Signature Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      roundRect(ctx, 40, currentY, sigBoxW, 90, 8, true, true);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('EMPLOYEE SIGNATURE (EMPLY SIGNACHER)', 55, currentY + 22);

      const workerSignText =
        customAuditDetails?.workerSignature ||
        signatures.workerSignature ||
        signatures.workerName ||
        'Verified Employee';

      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 14px Georgia, serif';
      ctx.fillText(workerSignText, 55, currentY + 54);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('Sign / Digital Stamp: ______________________', 55, currentY + 76);

      // Supervisor Signature Box
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, 40 + sigBoxW + 40, currentY, sigBoxW, 90, 8, true, true);

      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('SUPERVISOR SIGNATURE (SUPERIVOR SINGNACHAR)', 55 + sigBoxW + 40, currentY + 22);

      const superSignText =
        customAuditDetails?.supervisorSignature ||
        signatures.supervisorSignature ||
        signatures.supervisorName ||
        'Authorized Site Supervisor';

      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 14px Georgia, serif';
      ctx.fillText(superSignText, 55 + sigBoxW + 40, currentY + 54);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('Sign / Official Seal: ______________________', 55 + sigBoxW + 40, currentY + 76);

      // Download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const sanitizedName = reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${sanitizedName}_${periodLabel.replace(/[^a-z0-9]/gi, '_')}.png`;

      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`Successfully downloaded "${filename}" as High-DPI PNG!`);
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to generate image. Please use PDF export instead.');
    } finally {
      setIsExportingImage(false);
    }
  };

  /**
   * Generates a printable PDF layout and invokes browser print
   */
  const handleExportAsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print/save as PDF.');
      return;
    }

    const filterString = [
      `Period: ${periodLabel}`,
      ...filterSummary.map((f) => `${f.label}: ${f.value}`),
    ].join(' &bull; ');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle} - Official Audit Slip</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            padding: 12px;
          }
          .print-toolbar {
            background: #f1f5f9;
            padding: 10px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-btn {
            background: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
          }
          .print-btn:hover {
            background: #1d4ed8;
          }
          @media print {
            .print-toolbar { display: none !important; }
            body { padding: 0; }
          }
          .header-banner {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .company-name {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-title {
            font-size: 14px;
            font-weight: 800;
            color: #2563eb;
          }
          .doc-meta {
            font-size: 10px;
            color: #64748b;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 11px;
            color: #334155;
          }
          .kpi-container {
            display: grid;
            grid-template-columns: repeat(${Math.max(1, summaryKpis.length)}, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 10.5px;
          }
          th {
            background: #1e293b;
            color: #ffffff;
            text-align: left;
            padding: 6px 8px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            border: 1px solid #1e293b;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .audit-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .dates-card {
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
          }
          .dates-card.present {
            background: #ecfdf5;
            border-color: #a7f3d0;
            color: #065f46;
          }
          .dates-card.absent {
            background: #fff1f2;
            border-color: #fecdd3;
            color: #9f1239;
          }
          .rb-banner {
            background: #0f172a;
            color: #ffffff;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .sig-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            background: #f8fafc;
          }
          .sig-role {
            font-size: 10px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .sig-line {
            margin-top: 24px;
            font-size: 10px;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <span>Official Printable Audit Report &bull; <strong>${reportTitle}</strong></span>
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header-banner">
          <div>
            <div class="company-name">UNIVARSAL ATTANDANCE</div>
            <div class="company-sub">${subtitle || 'Statutory Workforce & Financial Audit Roll'}</div>
          </div>
          <div class="doc-badge">
            <div class="doc-title">${reportTitle}</div>
            <div class="doc-meta">Period: ${periodLabel} &bull; Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-box">
          ${filterString}
        </div>

        ${
          summaryKpis.length > 0
            ? `
          <div class="kpi-container">
            ${summaryKpis
              .map(
                (k) => `
              <div class="kpi-card">
                <div class="kpi-label">${k.label}</div>
                <div class="kpi-val">${k.value}</div>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <table>
          <thead>
            <tr>
              ${tableHeaders.map((th) => `<th>${th}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell ?? '—'}</td>`).join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        ${
          customAuditDetails
            ? `
          <div class="audit-box">
            <div class="dates-card present">
              <strong>TOTAL PRESENT DAYS WITH DATES: ${customAuditDetails.totalPresentCount} DAYS</strong>
              <p style="font-size: 10px; font-family: monospace; margin-top: 6px;">
                ${customAuditDetails.presentDates.join(', ') || 'No present dates recorded'}
              </p>
            </div>
            <div class="dates-card absent">
              <strong>TOTAL ABSENT DAYS WITH DATES: ${customAuditDetails.totalAbsentCount} DAYS</strong>
              <p style="font-size: 10px; font-family: monospace; margin-top: 6px;">
                ${customAuditDetails.absentDates.join(', ') || 'Zero absences (100% attendance)'}
              </p>
            </div>
          </div>

          ${
            customAuditDetails.workingPlacesBreakdown && customAuditDetails.workingPlacesBreakdown.length > 0
              ? `
            <div class="meta-box" style="margin-bottom: 14px; background: #f0fdf4; border-color: #86efac; color: #14532d;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px; margin-bottom: 8px;">
                <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">📍 Working Places Deployment &amp; Food Meals Breakdown (Original &amp; Other Sites):</strong>
                <span style="font-size: 10px; font-weight: 800; background: #dcfce7; padding: 2px 8px; border-radius: 4px; color: #15803d;">
                  Total Food: ${customAuditDetails.workingPlacesBreakdown.reduce((sum, wp) => sum + (wp.foodCount !== undefined ? wp.foodCount : wp.daysCount), 0)} Meals
                </span>
              </div>
              <div style="font-size: 11px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 8px;">
                ${customAuditDetails.workingPlacesBreakdown
                  .map(
                    (wp) =>
                      `<div style="background: #ffffff; border: 1px solid ${wp.isOriginalSite ? '#86efac' : '#93c5fd'}; padding: 6px 12px; border-radius: 6px; color: #0f172a;">
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
            customAuditDetails.transferHistory && customAuditDetails.transferHistory.length > 0
              ? `
            <div class="meta-box" style="margin-bottom: 14px; background: #f0f9ff; border-color: #7dd3fc; color: #0c4a6e;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bae6fd; padding-bottom: 6px; margin-bottom: 8px;">
                <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">🔄 Transfer &amp; Migration History (Site &amp; Section Movements):</strong>
                <span style="font-size: 10px; font-weight: 800; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; color: #0369a1;">
                  ${customAuditDetails.transferHistory.length} Movement Records
                </span>
              </div>
              <div style="font-size: 11px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 8px;">
                ${customAuditDetails.transferHistory
                  .map(
                    (tr) =>
                      `<div style="background: #ffffff; border: 1px solid ${tr.type === 'site' ? '#93c5fd' : '#c7d2fe'}; padding: 6px 12px; border-radius: 6px; color: #0f172a;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${tr.type === 'site' ? '#dbeafe' : '#e0e7ff'}; color: ${tr.type === 'site' ? '#1d4ed8' : '#4338ca'}; padding: 1px 6px; border-radius: 4px;">
                            ${tr.type === 'site' ? '🏢 Site Transfer' : '🔀 Section Shift'}
                          </span>
                          <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${tr.date}</span>
                          ${tr.workerName ? `<span style="color: #64748b; font-size: 10px;">• ${tr.workerName}</span>` : ''}
                        </div>
                        <div style="margin-top: 4px; font-size: 10px; color: #475569; display: flex; gap: 8px;">
                          <span>From: <strong>${tr.fromSiteName}</strong> (${tr.fromSectionName})</span>
                          <span>➔</span>
                          <span style="color: #15803d;">To: <strong>${tr.toSiteName}</strong> (${tr.toSectionName})</span>
                          <span>•</span>
                          <span style="color: #6d28d9; text-transform: uppercase;">[${tr.scope}]</span>
                        </div>
                      </div>`
                  )
                  .join('')}
              </div>
            </div>`
              : ''
          }

          <div class="meta-box" style="margin-bottom: 16px;">
            <strong>Advance Payments Using With Dates:</strong>
            <div style="font-size: 10px; font-family: monospace; margin-top: 4px;">
              ${
                customAuditDetails.advancePayments.length > 0
                  ? customAuditDetails.advancePayments
                      .map(
                        (a) =>
                          `&bull; ${a.date}: ${a.type === 'recovery' ? 'Recovery -₹' : 'Advance +₹'}${a.amount.toLocaleString()} (${a.reason || 'Cash'})`
                      )
                      .join('<br/>')
                  : 'No advances or recoveries in this period.'
              }
            </div>
          </div>

          <div class="rb-banner">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; color: #94a3b8;">Last Present Shift Date:</span>
              <div style="font-size: 13px; font-weight: 700;">${customAuditDetails.lastPresentDate}</div>
            </div>
            <div style="text-align: center;">
              <span style="font-size: 10px; text-transform: uppercase; color: #38bdf8;">Last Present Running Balance:</span>
              <div style="font-size: 18px; font-weight: 900; color: #34d399;">₹ ${customAuditDetails.lastPresentRunningBalance.toLocaleString()}</div>
            </div>
            ${
              customAuditDetails.overallClosingBalance !== undefined
                ? `
            <div style="text-align: right;">
              <span style="font-size: 10px; text-transform: uppercase; color: #fde047;">Overall Closing Balance:</span>
              <div style="font-size: 20px; font-weight: 900; color: #facc15;">₹ ${customAuditDetails.overallClosingBalance.toLocaleString()}</div>
            </div>`
                : ''
            }
          </div>
        `
            : ''
        }

        <div class="signatures">
          <div class="sig-card">
            <div class="sig-role">Employee Signature (Emply Signacher)</div>
            <div>Signee: <strong>${customAuditDetails?.workerSignature || signatures.workerSignature || signatures.workerName || 'Verified Employee'}</strong></div>
            <div class="sig-line">Signature: ____________________________ &nbsp;&nbsp;&nbsp; Date: ____________</div>
          </div>
          <div class="sig-card">
            <div class="sig-role">Supervisor Signature (Superivor Singnachar)</div>
            <div>Authorized: <strong>${customAuditDetails?.supervisorSignature || signatures.supervisorSignature || signatures.supervisorName || 'Site Supervisor'}</strong></div>
            <div class="sig-line">Signature: ____________________________ &nbsp;&nbsp;&nbsp; Date: ____________</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  /**
   * Generates a CSV file download
   */
  const handleExportAsCSV = () => {
    const csvContent = [
      tableHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...tableRows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${periodLabel.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded CSV data successfully!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export Report: ${reportTitle}`}
      subtitle={`Preview, download high-definition PNG image, or print/save as statutory PDF`}
      icon={<FileText className="h-5 w-5 text-blue-600" />}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-400 font-medium">
            Total Rows: <strong className="text-slate-700">{tableRows.length}</strong> | Total Columns:{' '}
            <strong className="text-slate-700">{tableHeaders.length}</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportAsCSV}
              type="button"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportAsImage}
              disabled={isExportingImage}
              type="button"
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExportingImage ? 'Generating Image...' : 'Download Image (PNG)'}</span>
            </button>

            <button
              onClick={handleExportAsPDF}
              type="button"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {toastMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Live Document Preview Card */}
        <div className="border border-slate-200/80 rounded-2xl bg-white shadow-2xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-amber-400 text-sm sm:text-base font-black tracking-tight">
                UNIVARSAL ATTANDANCE
              </div>
              <div className="text-slate-400 text-[11px] font-semibold">
                {subtitle || 'STATUTORY WORKFORCE & FINANCIAL AUDIT REGISTER'}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-mono font-bold">
                {reportTitle.toUpperCase()}
              </span>
              <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                Period: <span className="text-slate-200 font-bold">{periodLabel}</span>
              </div>
            </div>
          </div>

          {/* Metadata & Filters Bar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-bold text-slate-800">{reportTitle}</span>
            {filterSummary.map((f, idx) => (
              <span key={idx} className="text-slate-500">
                • {f.label}: <strong className="text-slate-700">{f.value}</strong>
              </span>
            ))}
          </div>

          {/* KPIs Bar (if present) */}
          {summaryKpis.length > 0 && (
            <div className="p-4 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {summaryKpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {kpi.label}
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scrollable Data Table Preview */}
          <div className="max-h-[34vh] overflow-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  {tableHeaders.map((th, cIdx) => (
                    <th
                      key={cIdx}
                      className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700"
                    >
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-slate-50/60 hover:bg-blue-50/40'
                    }
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-slate-700 font-medium whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom Audit Slip Details (if supplied) */}
          {customAuditDetails && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-3 text-xs">
              {/* Working Places Deployment Breakdown */}
              {customAuditDetails.workingPlacesBreakdown && customAuditDetails.workingPlacesBreakdown.length > 0 && (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-emerald-950 font-bold">
                      <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>Working Places Deployment &amp; Food Meals Breakdown (Original &amp; Other Sites)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                        {customAuditDetails.workingPlacesBreakdown.length} Working Places
                      </span>
                      <span className="text-[10px] font-mono text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        Total Food: {customAuditDetails.workingPlacesBreakdown.reduce((sum, wp) => sum + (wp.foodCount !== undefined ? wp.foodCount : wp.daysCount), 0)} Meals
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {customAuditDetails.workingPlacesBreakdown.map((wp, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 bg-white border rounded-xl shadow-2xs space-y-1.5 ${
                          wp.isOriginalSite ? 'border-emerald-300 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                              wp.isOriginalSite ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {wp.isOriginalSite ? '🏠 Original Site' : '🌐 Other Site'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-700">
                            {wp.daysCount} Days ({wp.mandays}m)
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs truncate">{wp.siteName}</div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 text-[10px]">Food Count:</span>
                          <span className="font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                            🍽️ {wp.foodCount !== undefined ? wp.foodCount : wp.daysCount} Meals
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Present Dates & Absent Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-emerald-950 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Total Present Days With Dates</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[10px] rounded-full">
                      {customAuditDetails.totalPresentCount} Days
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                    {customAuditDetails.presentDates.map((d) => (
                      <span
                        key={d}
                        className="px-1.5 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded text-[9px] font-mono font-bold"
                      >
                        {d}
                      </span>
                    ))}
                    {customAuditDetails.presentDates.length === 0 && (
                      <span className="text-slate-400 italic text-[11px]">No present dates logged</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-rose-950 font-bold">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Total Absent Days With Dates</span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded-full">
                      {customAuditDetails.totalAbsentCount} Days
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                    {customAuditDetails.absentDates.map((d) => (
                      <span
                        key={d}
                        className="px-1.5 py-0.5 bg-white border border-rose-300 text-rose-900 rounded text-[9px] font-mono font-bold"
                      >
                        {d}
                      </span>
                    ))}
                    {customAuditDetails.absentDates.length === 0 && (
                      <span className="text-emerald-700 font-semibold text-[11px]">
                        ✓ Zero absences logged (100% full attendance)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Advance Payments Using With Dates */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 text-slate-900 font-bold">
                  <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                  <span>Advance Payments & Recoveries Using With Dates</span>
                </div>
                {customAuditDetails.advancePayments.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">No advances taken or recovered in this period.</p>
                ) : (
                  <div className="space-y-1">
                    {customAuditDetails.advancePayments.map((adv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-50 border border-slate-100 font-mono"
                      >
                        <span>
                          {adv.date} • {adv.reason || 'Cash Advance'}
                        </span>
                        <span
                          className={`font-bold ${
                            adv.type === 'recovery' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {adv.type === 'recovery' ? '-' : '+'}₹{adv.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Last Present Running Balance & Overall Closing Balance */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Last Present Shift</span>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {customAuditDetails.lastPresentDate}
                  </div>
                </div>
                <div className="text-left sm:text-center">
                  <span className="text-[10px] text-sky-400 font-mono uppercase">
                    Period Running Balance
                  </span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    ₹ {customAuditDetails.lastPresentRunningBalance.toLocaleString()}
                  </div>
                </div>
                {customAuditDetails.overallClosingBalance !== undefined && (
                  <div className="text-left sm:text-right bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-500/40">
                    <span className="text-[10px] text-amber-300 font-mono uppercase font-bold">
                      Overall Closing Balance
                    </span>
                    <div className="text-lg font-black text-emerald-300 font-mono">
                      ₹ {customAuditDetails.overallClosingBalance.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures Preview: Supervisor & Employee */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Employee Signature (Emply Signacher)
              </div>
              <div className="font-bold text-slate-800 mt-1">
                {customAuditDetails?.workerSignature ||
                  signatures.workerSignature ||
                  signatures.workerName ||
                  'Verified Employee'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-3">
                Sign / Digital Stamp: _________________________
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Supervisor Signature (Superivor Singnachar)
              </div>
              <div className="font-bold text-slate-800 mt-1">
                {customAuditDetails?.supervisorSignature ||
                  signatures.supervisorSignature ||
                  signatures.supervisorName ||
                  'Site Supervisor'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-3">
                Sign / Official Seal: _________________________
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
