/**
 * @file expensesReportExport.ts
 * @description Excel export for the Monthly Expenses Ledger (FR-044/BR-049), reproducing the
 *              category totals, Property Area totals, and ledger layout defined in
 *              docs/10_MONTHLY_EXPENSES_REPORT.md. Client-side only (exceljs, lazy-loaded).
 */
interface CategoryTotalLike {
  code: string;
  name: string;
  parent_code: string | null;
  thisMonth: number;
  cumulative: number;
}

interface ExpenseEntryLike {
  expense_date: string;
  or_supplier: string;
  fixed_expense_categories: { name: string };
  expense_property_allocations: { property_area: string; amount: number }[];
  total_expenses: number;
}

export async function exportMonthlyExpensesExcel(params: {
  monthLabel: string;
  categoryTotals: CategoryTotalLike[];
  categoryGrandTotal: number;
  areaTotals: Record<string, number>;
  areaGrandTotal: number;
  entries: ExpenseEntryLike[];
}) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Monthly Expenses');
  sheet.columns = [{ width: 22 }, { width: 16 }, { width: 16 }, { width: 40 }, { width: 16 }];

  sheet.addRow([params.monthLabel]).font = { bold: true, size: 13 };
  sheet.addRow([]);

  sheet.addRow(['Category Totals']).font = { bold: true };
  sheet.addRow(['Code', 'Category', 'This Month', 'YTD Cumulative']).font = { bold: true };
  for (const c of params.categoryTotals) {
    sheet.addRow([c.code, c.name, c.thisMonth, c.cumulative]);
  }
  const catTotalRow = sheet.addRow(['', 'Total', params.categoryGrandTotal, '']);
  catTotalRow.font = { bold: true };
  sheet.addRow([]);

  sheet.addRow(['Property Area Totals']).font = { bold: true };
  sheet.addRow(['Area', 'Total']).font = { bold: true };
  for (const [area, total] of Object.entries(params.areaTotals)) {
    sheet.addRow([area, total]);
  }
  const areaTotalRow = sheet.addRow(['Total', params.areaGrandTotal]);
  areaTotalRow.font = { bold: true };
  sheet.addRow([]);

  sheet.addRow(['Ledger Entries']).font = { bold: true };
  sheet.addRow(['Date', 'OR / Supplier', 'Category', 'Area Allocations', 'Total']).font = { bold: true };
  for (const e of params.entries) {
    const allocations = e.expense_property_allocations.map((a) => `${a.property_area}: ₱${Number(a.amount).toLocaleString()}`).join('; ');
    sheet.addRow([e.expense_date, e.or_supplier, e.fixed_expense_categories?.name ?? '', allocations, Number(e.total_expenses)]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Monthly-Expenses-Report-${params.monthLabel.replace(' ', '-')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
