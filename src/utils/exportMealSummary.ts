import type { Section, SectionFoodOrder, MealType } from '../types';

interface ExportMealSummaryParams {
  section: Section;
  siteName: string;
  date: string;
  foodOrders: SectionFoodOrder[];
}

const MEAL_TIMES: Record<MealType, string> = {
  morning: '07:30 AM - 09:30 AM',
  afternoon: '12:30 PM - 02:30 PM',
  night: '07:30 PM - 09:30 PM',
};

const MEAL_LABELS: Record<MealType, string> = {
  morning: '🌅 Morning (Breakfast)',
  afternoon: '☀️ Afternoon (Lunch)',
  night: '🌙 Night (Dinner)',
};

/**
 * Generates a high-definition PNG image of the 3-meal summary for a section using HTML5 Canvas.
 */
export async function exportSectionMealSummaryAsImage({
  section,
  siteName,
  date,
  foodOrders,
}: ExportMealSummaryParams): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 760;
  const dpr = 2; // 2x for sharp retina text

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas 2d context');

  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Card Outer Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Header Banner
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, width, 100);

  // Company Brand
  ctx.fillStyle = '#f59e0b'; // amber-500
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('UNIVARSAL ATTANDANCE', 40, 45);

  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('MULTI-SITE WORKFORCE & CANTEEN FOOD MANAGEMENT SYSTEM', 40, 70);

  // Header Right: Document Type
  ctx.fillStyle = '#38bdf8'; // sky-400
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('OFFICIAL SECTION MEAL SUMMARY REPORT', width - 40, 45);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, width - 40, 70);
  ctx.textAlign = 'left';

  // Section Details Header Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(40, 120, width - 80, 80);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(40, 120, width - 80, 80);

  // Section Title & Code
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`SECTION: ${section.name.toUpperCase()} (${section.code})`, 60, 153);

  ctx.fillStyle = '#475569';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Site: ${siteName}   •   Supervisor In-Charge: ${section.inCharge} (${section.mobile})`, 60, 180);

  // Date Tag on Right of Box
  ctx.fillStyle = '#2563eb';
  roundRect(ctx, width - 210, 138, 150, 44, 8, true, false);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`DATE: ${date}`, width - 135, 165);
  ctx.textAlign = 'left';

  // Calculate Aggregates
  const meals: MealType[] = ['morning', 'afternoon', 'night'];
  const mealRows = meals.map((m) => {
    const ord = foodOrders.find((o) => o.sectionId === section.id && o.date === date && o.mealType === m);
    return {
      meal: m,
      label: MEAL_LABELS[m],
      time: MEAL_TIMES[m],
      order: ord,
      ordered: ord?.totalOrderedQty ?? 0,
      dispatched: ord?.dispatchedQty ?? (ord ? ord.totalOrderedQty : 0),
      received: ord?.receivedQty ?? (ord?.status === 'received' ? ord.totalOrderedQty : 0),
      shortage: ord?.shortageQty ?? 0,
      status: ord?.status ?? 'draft',
      breakdown: ord
        ? `Pres: ${ord.presentCount} | Abs: ${ord.absentCount} | Out: ${ord.outsideWorkersCount} | Ext: ${ord.othersCount}`
        : 'Not Ordered',
    };
  });

  const totalOrdered = mealRows.reduce((sum, r) => sum + r.ordered, 0);
  const totalDispatched = mealRows.reduce((sum, r) => sum + r.dispatched, 0);
  const totalReceived = mealRows.reduce((sum, r) => sum + r.received, 0);
  const totalShortage = mealRows.reduce((sum, r) => sum + r.shortage, 0);

  // 4 KPI Summary Cards (y = 220, h = 65)
  const cardW = 260;
  const gap = (width - 80 - 4 * cardW) / 3;

  // Card 1: Total Ordered
  drawSummaryCard(ctx, 40, 220, cardW, 65, 'TOTAL ORDERED MEALS', `${totalOrdered} Meals`, '#1e293b', '#f1f5f9');
  // Card 2: Dispatched
  drawSummaryCard(ctx, 40 + cardW + gap, 220, cardW, 65, 'CANTEEN DISPATCHED', `${totalDispatched} Sent`, '#1d4ed8', '#eff6ff');
  // Card 3: Received
  drawSummaryCard(ctx, 40 + 2 * (cardW + gap), 220, cardW, 65, 'SECTION RECEIVED', `${totalReceived} Received`, '#047857', '#ecfdf5');
  // Card 4: Shortage Deficit
  drawSummaryCard(
    ctx,
    40 + 3 * (cardW + gap),
    220,
    cardW,
    65,
    'SHORTAGE DEFICIT',
    totalShortage > 0 ? `-${totalShortage} Missing` : '0 None (100% OK)',
    totalShortage > 0 ? '#b45309' : '#047857',
    totalShortage > 0 ? '#fffbeb' : '#f0fdf4'
  );

  // Table Structure
  const tableY = 305;
  const rowHeight = 44;
  const colX = [40, 240, 420, 720, 830, 940, 1050];

  // Table Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, tableY, width - 80, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('MEAL SESSION', colX[0] + 15, tableY + 23);
  ctx.fillText('TIMING', colX[1] + 10, tableY + 23);
  ctx.fillText('BREAKDOWN (P/A/O/X)', colX[2] + 10, tableY + 23);
  ctx.fillText('ORDERED', colX[3] + 10, tableY + 23);
  ctx.fillText('DISPATCHED', colX[4] + 10, tableY + 23);
  ctx.fillText('RECEIVED', colX[5] + 10, tableY + 23);
  ctx.fillText('STATUS', colX[6] + 10, tableY + 23);

  // Table Rows
  mealRows.forEach((row, i) => {
    const y = tableY + 36 + i * rowHeight;

    // Zebra striping
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(40, y, width - 80, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, y, width - 80, rowHeight);

    // Meal Label
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(row.label, colX[0] + 15, y + 27);

    // Time
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText(row.time, colX[1] + 10, y + 27);

    // Breakdown
    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(row.breakdown, colX[2] + 10, y + 27);

    // Ordered
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(row.ordered > 0 ? `${row.ordered}` : '—', colX[3] + 15, y + 27);

    // Dispatched
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(row.ordered > 0 ? `${row.dispatched}` : '—', colX[4] + 15, y + 27);

    // Received
    ctx.fillStyle = '#047857';
    ctx.fillText(row.ordered > 0 ? `${row.received}` : '—', colX[5] + 15, y + 27);

    // Status Badge
    drawStatusBadge(ctx, colX[6] + 5, y + 10, 95, 24, row.status);
  });

  // Totals Row
  const totalsY = tableY + 36 + mealRows.length * rowHeight;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(40, totalsY, width - 80, 42);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, totalsY, width - 80, 42);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('DAILY SUMMARY TOTAL', colX[0] + 15, totalsY + 26);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('3 Meal Sessions', colX[1] + 10, totalsY + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${totalOrdered} meals`, colX[3] + 15, totalsY + 26);

  ctx.fillStyle = '#1d4ed8';
  ctx.fillText(`${totalDispatched}`, colX[4] + 15, totalsY + 26);

  ctx.fillStyle = '#047857';
  ctx.fillText(`${totalReceived}`, colX[5] + 15, totalsY + 26);

  const fulfillmentRate = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 100;
  ctx.fillStyle = fulfillmentRate === 100 ? '#047857' : '#b45309';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${fulfillmentRate}% Full`, colX[6] + 10, totalsY + 26);

  // Verification Signatures Section
  const footerY = totalsY + 70;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, footerY, width - 80, 100);

  ctx.fillStyle = '#334155';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('Verification & Sign-Off:', 60, footerY + 25);

  // Supervisor Signature Line
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(60, footerY + 70);
  ctx.lineTo(340, footerY + 70);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Section Supervisor: ${section.inCharge}`, 60, footerY + 86);

  // Canteen In-charge Signature Line
  ctx.beginPath();
  ctx.moveTo(420, footerY + 70);
  ctx.lineTo(700, footerY + 70);
  ctx.stroke();

  ctx.fillText('Central Canteen Kitchen In-Charge', 420, footerY + 86);

  // System Stamp Text
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('✓ DIGITAL RECORD CERTIFIED', width - 300, footerY + 50);
  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText('Univarsal Attandance Audit Trail', width - 300, footerY + 70);

  // Trigger Download
  const dataUrl = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  const safeSectionName = section.name.replace(/[^a-zA-Z0-9]/g, '_');
  downloadLink.download = `Meal_Summary_${safeSectionName}_${date}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Exports the section meal summary as a clean, printable PDF via browser print dialogue.
 */
export function exportSectionMealSummaryAsPDF({
  section,
  siteName,
  date,
  foodOrders,
}: ExportMealSummaryParams): void {
  const meals: MealType[] = ['morning', 'afternoon', 'night'];
  const mealRows = meals.map((m) => {
    const ord = foodOrders.find((o) => o.sectionId === section.id && o.date === date && o.mealType === m);
    return {
      meal: m,
      label: MEAL_LABELS[m],
      time: MEAL_TIMES[m],
      order: ord,
      ordered: ord?.totalOrderedQty ?? 0,
      dispatched: ord?.dispatchedQty ?? (ord ? ord.totalOrderedQty : 0),
      received: ord?.receivedQty ?? (ord?.status === 'received' ? ord.totalOrderedQty : 0),
      shortage: ord?.shortageQty ?? 0,
      status: ord?.status ?? 'draft',
      breakdown: ord
        ? `Present: ${ord.presentCount} | Absent: ${ord.absentCount} | Outside: ${ord.outsideWorkersCount} | Others: ${ord.othersCount}`
        : 'Not Ordered',
      remarks: ord?.canteenRemarks || ord?.shortageReason || ord?.receivingRemarks || 'None',
    };
  });

  const totalOrdered = mealRows.reduce((sum, r) => sum + r.ordered, 0);
  const totalDispatched = mealRows.reduce((sum, r) => sum + r.dispatched, 0);
  const totalReceived = mealRows.reduce((sum, r) => sum + r.received, 0);
  const totalShortage = mealRows.reduce((sum, r) => sum + r.shortage, 0);
  const fulfillmentRate = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 100;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Meal Summary — Section ${section.name} (${date})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            padding: 10px;
            font-size: 12px;
          }
          .header-banner {
            border-bottom: 3px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 900;
            color: #d97706;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            margin-top: 3px;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h2 {
            font-size: 13px;
            color: #1e293b;
            font-weight: 800;
          }
          .doc-badge p {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 2px;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .meta-info h3 {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .meta-info p {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
          }
          .date-pill {
            background: #2563eb;
            color: #ffffff;
            font-weight: 800;
            padding: 6px 14px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background: #f8fafc;
          }
          .kpi-card.blue { background: #eff6ff; border-color: #bfdbfe; }
          .kpi-card.green { background: #ecfdf5; border-color: #a7f3d0; }
          .kpi-card.amber { background: #fffbeb; border-color: #fde68a; }
          .kpi-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .kpi-val {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 9px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .bold { font-weight: 800; color: #0f172a; }
          .status-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
          }
          .status-received { background: #d1fae5; color: #065f46; }
          .status-sent { background: #dbeafe; color: #1e40af; }
          .status-packing { background: #fef3c7; color: #92400e; }
          .status-draft { background: #f1f5f9; color: #475569; }
          .status-shortage { background: #ffedd5; color: #9a3412; }
          .totals-row td {
            background: #f1f5f9 !important;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            font-weight: 800;
            font-size: 12px;
            color: #0f172a;
          }
          .signatures-box {
            margin-top: 25px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sig-line {
            width: 200px;
            border-top: 1px solid #64748b;
            padding-top: 5px;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          .print-btn-bar {
            margin-bottom: 15px;
            text-align: right;
          }
          .print-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            font-size: 12px;
          }
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
            <div class="brand-subtitle">MULTI-SITE WORKFORCE & CANTEEN FOOD MANAGEMENT SYSTEM</div>
          </div>
          <div class="doc-badge">
            <h2>OFFICIAL MEAL INDENT & DISPATCH VOUCHER</h2>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-info">
            <h3>SECTION: ${section.name.toUpperCase()} (${section.code})</h3>
            <p>Project Site: <strong>${siteName}</strong> &bull; Supervisor: <strong>${section.inCharge}</strong> (${section.mobile})</p>
          </div>
          <div class="date-pill">${date}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Ordered</div>
            <div class="kpi-val">${totalOrdered} Meals</div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-label">Canteen Dispatched</div>
            <div class="kpi-val" style="color: #1d4ed8;">${totalDispatched} Sent</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">Section Received</div>
            <div class="kpi-val" style="color: #047857;">${totalReceived} Received</div>
          </div>
          <div class="kpi-card ${totalShortage > 0 ? 'amber' : 'green'}">
            <div class="kpi-label">Shortage / Deficit</div>
            <div class="kpi-val" style="color: ${totalShortage > 0 ? '#b45309' : '#047857'};">
              ${totalShortage > 0 ? `-${totalShortage} Missing` : '0 None (100%)'}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Meal Session</th>
              <th>Window</th>
              <th>Staff Breakdown (P/A/O/X)</th>
              <th style="text-align: right;">Ordered</th>
              <th style="text-align: right;">Dispatched</th>
              <th style="text-align: right;">Received</th>
              <th>Canteen Status</th>
            </tr>
          </thead>
          <tbody>
            ${mealRows
              .map(
                (r) => `
              <tr>
                <td class="bold">${r.label}</td>
                <td>${r.time}</td>
                <td>${r.breakdown}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 700;">${r.ordered > 0 ? r.ordered : '—'}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1d4ed8;">${r.ordered > 0 ? r.dispatched : '—'}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 700; color: #047857;">${r.ordered > 0 ? r.received : '—'}</td>
                <td>
                  <span class="status-tag status-${r.status.startsWith('shortage') ? 'shortage' : r.status}">
                    ${r.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
            <tr class="totals-row">
              <td colspan="3">DAILY TOTAL SUMMARY (3 SESSIONS)</td>
              <td style="text-align: right; font-family: monospace;">${totalOrdered}</td>
              <td style="text-align: right; font-family: monospace; color: #1d4ed8;">${totalDispatched}</td>
              <td style="text-align: right; font-family: monospace; color: #047857;">${totalReceived}</td>
              <td>${fulfillmentRate}% Full Delivery</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures-box">
          <div>
            <div class="sig-line">
              <strong>${section.inCharge}</strong><br/>
              Section Supervisor Signature
            </div>
          </div>
          <div>
            <div class="sig-line">
              <strong>Central Canteen Dispatcher</strong><br/>
              Kitchen Manager Signature
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #059669; font-weight: bold;">
            ✓ UNIVARSAL ATTANDANCE VERIFIED<br/>
            <span style="font-size: 9px; color: #94a3b8; font-weight: normal;">Tamper-proof field delivery slip</span>
          </div>
        </div>
      </body>
    </html>
  `;

  // Write into hidden iframe and trigger print
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
    // Fallback: open print window
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

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 350);
}

// Canvas Helpers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = true,
  stroke = false
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawSummaryCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  val: string,
  textColor: string,
  bgColor: string
) {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, 6, true, false);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6, false, true);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillText(label, x + 12, y + 20);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(val, x + 12, y + 48);
}

function drawStatusBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  status: string
) {
  let bg = '#f1f5f9';
  let text = '#475569';
  let label = status.toUpperCase();

  if (status === 'received') {
    bg = '#d1fae5';
    text = '#065f46';
    label = 'RECEIVED';
  } else if (status === 'sent_to_section' || status === 'remaining_sent') {
    bg = '#dbeafe';
    text = '#1e40af';
    label = 'DISPATCHED';
  } else if (status === 'packing') {
    bg = '#fef3c7';
    text = '#92400e';
    label = 'PACKING';
  } else if (status.startsWith('shortage')) {
    bg = '#ffedd5';
    text = '#9a3412';
    label = 'SHORTAGE';
  }

  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 4, true, false);

  ctx.fillStyle = text;
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  ctx.textAlign = 'left';
}
