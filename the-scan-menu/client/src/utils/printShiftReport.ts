export interface ShiftReportData {
  reportType: 'X_REPORT' | 'Z_REPORT';
  shiftNumber: number;
  status?: string;
  openedAt: string | Date;
  closedAt?: string | Date;
  reportGeneratedAt?: string | Date;
  staffName?: string;
  openedBy?: string;
  closedBy?: string;
  openingFloat: number; // in paise
  cashIn: number;
  cashOut: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  totalSales: number;
  orderCount: number;
  expectedCashInDrawer: number;
  actualCashCounted?: number;
  discrepancyAmount?: number;
  closingNotes?: string;
  pettyCashBreakdown?: Array<{
    type: 'CASH_IN' | 'CASH_OUT';
    amount: number;
    category: string;
    reason: string;
    createdAt: string | Date;
  }>;
}

export function formatINR(paise: number = 0): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function printShiftReport(
  report: ShiftReportData,
  restaurantInfo?: { name?: string; address?: string; phone?: string }
): void {
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) {
    alert('Please allow popups to print shift reports.');
    return;
  }

  const isZ = report.reportType === 'Z_REPORT';
  const title = isZ ? 'Z-REPORT (DAY/SHIFT CLOSE)' : 'X-REPORT (MID-SHIFT AUDIT)';
  const genDate = report.closedAt || report.reportGeneratedAt || new Date();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 76mm;
            margin: 0 auto;
            padding: 8px;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border: 1px solid #000;
            font-weight: bold;
            font-size: 13px;
            margin: 4px 0;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="font-bold" style="font-size: 15px;">${restaurantInfo?.name || 'PIXORA RESTAURANT'}</div>
          ${restaurantInfo?.address ? `<div>${restaurantInfo.address}</div>` : ''}
          ${restaurantInfo?.phone ? `<div>Tel: ${restaurantInfo.phone}</div>` : ''}
          <div class="badge">${title}</div>
          <div class="divider"></div>
          <div><strong>Shift #${report.shiftNumber}</strong> | <strong>${new Date(genDate).toLocaleDateString('en-IN')}</strong></div>
          <div>Opened: ${new Date(report.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          ${isZ && report.closedAt ? `<div>Closed: ${new Date(report.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          <div>Staff: ${report.staffName || report.openedBy || 'Staff'}</div>
        </div>

        <div class="double-divider"></div>
        <div class="font-bold">SALES SUMMARY</div>
        <div class="divider"></div>
        <div class="row"><span>Total Orders:</span><span class="font-bold">${report.orderCount}</span></div>
        <div class="row"><span>Cash Sales:</span><span>${formatINR(report.cashSales)}</span></div>
        <div class="row"><span>Card Sales:</span><span>${formatINR(report.cardSales)}</span></div>
        <div class="row"><span>UPI / QR Sales:</span><span>${formatINR(report.upiSales)}</span></div>
        <div class="divider"></div>
        <div class="row font-bold" style="font-size: 13px;"><span>TOTAL SALES:</span><span>${formatINR(report.totalSales)}</span></div>

        <div class="double-divider"></div>
        <div class="font-bold">CASH DRAWER RECONCILIATION</div>
        <div class="divider"></div>
        <div class="row"><span>Opening Cash Float:</span><span>${formatINR(report.openingFloat)}</span></div>
        <div class="row"><span>(+) Cash Sales:</span><span>${formatINR(report.cashSales)}</span></div>
        <div class="row"><span>(+) Petty Cash In:</span><span>${formatINR(report.cashIn)}</span></div>
        <div class="row"><span>(-) Petty Cash Out:</span><span>${formatINR(report.cashOut)}</span></div>
        <div class="divider"></div>
        <div class="row font-bold"><span>EXPECTED IN DRAWER:</span><span>${formatINR(report.expectedCashInDrawer)}</span></div>

        ${isZ && report.actualCashCounted !== undefined ? `
          <div class="row font-bold" style="margin-top: 4px;"><span>PHYSICAL COUNTED:</span><span>${formatINR(report.actualCashCounted)}</span></div>
          <div class="row font-bold" style="font-size: 13px; color: ${report.discrepancyAmount === 0 ? '#000' : '#d00'};">
            <span>VARIANCE / DISCREPANCY:</span>
            <span>${(report.discrepancyAmount || 0) >= 0 ? '+' : ''}${formatINR(report.discrepancyAmount || 0)}</span>
          </div>
        ` : ''}

        ${report.pettyCashBreakdown && report.pettyCashBreakdown.length > 0 ? `
          <div class="double-divider"></div>
          <div class="font-bold">PETTY EXPENSES / MOVEMENTS</div>
          <div class="divider"></div>
          ${report.pettyCashBreakdown.map((p) => `
            <div class="row" style="font-size: 11px;">
              <span>${p.type === 'CASH_IN' ? '[+IN]' : '[-OUT]'} ${p.reason || p.category}</span>
              <span>${formatINR(p.amount)}</span>
            </div>
          `).join('')}
        ` : ''}

        ${report.closingNotes ? `
          <div class="divider"></div>
          <div><strong>Notes:</strong> ${report.closingNotes}</div>
        ` : ''}

        <div class="double-divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 10px;">
          *** ${isZ ? 'END OF DAY FINANCIAL REPORT' : 'MID-DAY AUDIT SLIP'} ***
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
}
