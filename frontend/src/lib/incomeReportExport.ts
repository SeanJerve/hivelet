/**
 * @file incomeReportExport.ts
 * @description Excel export for the Monthly Income Report (FR-044/BR-049), reproducing the
 *              cluster-grouped layout with subtotal rows defined in docs/09_MONTHLY_INCOME_REPORT.md
 *              Section 3. Runs entirely client-side (exceljs) -- no server round-trip needed since the
 *              admin already has the data loaded in BillingPaymentsView.
 */
interface LedgerRowLike {
  rooms: { room_number: string };
  date_paid: string;
  contact_name: string;
  invoice_number: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  fifty_percent_share: number;
  occupants: number;
  water_payment: number;
  gbg_fee: number;
  remitted_amount: number;
  linda_electricity_charge: number;
  linda_water_charge: number;
}

interface ClusterGroup {
  code: string;
  name: string;
  rows: LedgerRowLike[];
  subtotal: { rentAmount: number; occupants: number; waterPayment: number; remittedAmount: number };
}

const HEADER_ROW = ['Rm #', 'Date Paid', 'Contact', 'Invoice #', 'Rent For', 'Rent Amount', '50% Share', 'Occupants', 'Water Payment', 'GBG', 'Remitted Amount'];

export async function exportMonthlyIncomeExcel(params: {
  monthLabel: string;
  clusterGroups: ClusterGroup[];
  grandSubtotal: { rentAmount: number; occupants: number; waterPayment: number; remittedAmount: number };
  lindaLedger: LedgerRowLike[];
  lindaTotals: { rent: number; electricity: number; water: number };
  lindaGrandTotal: number;
}) {
  // Dynamically imported so exceljs (a large dependency) only loads when an export is requested,
  // instead of bloating the main app bundle for every user.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Monthly Income Report');
  sheet.columns = HEADER_ROW.map(() => ({ width: 16 }));

  sheet.addRow([params.monthLabel]).font = { bold: true, size: 13 };
  sheet.addRow([]);

  for (const group of params.clusterGroups) {
    if (group.rows.length === 0) continue;
    sheet.addRow([group.name]).font = { bold: true };
    sheet.addRow(HEADER_ROW).font = { bold: true };

    for (const row of group.rows) {
      sheet.addRow([
        row.rooms.room_number,
        row.date_paid,
        row.contact_name,
        row.invoice_number,
        `${row.rent_period_start} - ${row.rent_period_end}`,
        Number(row.rent_amount),
        Number(row.fifty_percent_share),
        Number(row.occupants),
        Number(row.water_payment),
        Number(row.gbg_fee) || null,
        Number(row.remitted_amount),
      ]);
    }

    const subtotalRow = sheet.addRow([
      `${group.name} Subtotal`, '', '', '', '',
      group.subtotal.rentAmount, '', group.subtotal.occupants, group.subtotal.waterPayment, '', group.subtotal.remittedAmount,
    ]);
    subtotalRow.font = { bold: true };
    sheet.addRow([]);
  }

  const grandRow = sheet.addRow([
    'GRAND SUBTOTAL (BH + Back Apartment + Front Apartment)', '', '', '', '',
    params.grandSubtotal.rentAmount, '', params.grandSubtotal.occupants, params.grandSubtotal.waterPayment, '', params.grandSubtotal.remittedAmount,
  ]);
  grandRow.font = { bold: true };
  sheet.addRow([]);

  if (params.lindaLedger.length > 0) {
    sheet.addRow(['Linda (Fixed-Rate Units)']).font = { bold: true };
    sheet.addRow(['Rm #', 'Date Paid', 'Contact', 'Invoice #', 'Rent Amount', 'Electricity (Fixed)', 'Water (Fixed)']).font = { bold: true };
    for (const row of params.lindaLedger) {
      sheet.addRow([
        row.rooms.room_number,
        row.date_paid,
        row.contact_name,
        row.invoice_number,
        Number(row.rent_amount),
        Number(row.linda_electricity_charge),
        Number(row.linda_water_charge),
      ]);
    }
    const lindaTotalRow = sheet.addRow([
      'Linda Total (remitted directly to Linda)', '', '', '',
      params.lindaTotals.rent, params.lindaTotals.electricity, params.lindaTotals.water,
    ]);
    lindaTotalRow.font = { bold: true };
    sheet.addRow(['', '', '', '', '', '', params.lindaGrandTotal]).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Monthly-Income-Report-${params.monthLabel.replace(' ', '-')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
