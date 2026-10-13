// Which open bills a set of receipts pays (B-107, 13 October 2026).
//
// Recording a receipt through Monthly Income settles the open bills it covers (allocateReceipt in
// backend/src/routes/admin.ts). A receipt inserted any other way - import-ledger-update.mjs, a
// migration - does not, and the bill stays Due: the tenant's Overview then shows an amount due for
// a month they paid. That happened to 1d and F2B through migration 062 (corrected by 082).
//
// A bill is covered when a receipt for the same unit spans its whole period. Dates are
// 'YYYY-MM-DD' strings, so they compare as text; a receipt with no period fails both comparisons
// (null against a date string is false either way), so it covers nothing.
export function billsCoveredBy(receipts, bills) {
  const found = [];
  for (const b of bills) {
    if (b.status === 'Paid') continue;
    const r = receipts.find((x) =>
      x.room_id === b.room_id &&
      x.rent_period_start <= b.billing_period_start &&
      x.rent_period_end >= b.billing_period_end);
    if (r) found.push({ bill: b, receipt: r });
  }
  return found;
}
