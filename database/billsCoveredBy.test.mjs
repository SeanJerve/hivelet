// node database/billsCoveredBy.test.mjs - the rule import-ledger-update.mjs uses to warn about open
// bills (B-107). Mutation-tested 13 Oct 2026: removing or loosening each condition fails this.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
const { billsCoveredBy } = await import(pathToFileURL(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'billsCoveredBy.mjs')).href);
// Live shapes, 13 Oct 2026: receipts and the open bills they were compared with.
const receipts = [
  { room_id: '1d', rent_period_start: '2026-08-09', rent_period_end: '2026-09-08' },
  { room_id: 'F2B', rent_period_start: '2026-08-15', rent_period_end: '2026-09-14' },
  { room_id: '1a', rent_period_start: '2026-07-07', rent_period_end: '2026-08-06' },
  { room_id: 'X', rent_period_start: null, rent_period_end: null },
  { room_id: 'X', rent_period_start: null, rent_period_end: '2026-12-31' }, // half a period: covers nothing
  { room_id: 'W', rent_period_start: '2026-08-01', rent_period_end: '2026-10-31' }, // three months at once
];
const bills = [
  { id: 'b1d', room_id: '1d', billing_period_start: '2026-08-09', billing_period_end: '2026-09-08', status: 'Due' },
  { id: 'bF2B', room_id: 'F2B', billing_period_start: '2026-08-15', billing_period_end: '2026-09-14', status: 'Due' },
  { id: 'b1a', room_id: '1a', billing_period_start: '2026-08-07', billing_period_end: '2026-09-06', status: 'Due' }, // the next month: owed
  { id: 'bOther', room_id: '1c', billing_period_start: '2026-08-09', billing_period_end: '2026-09-08', status: 'Due' }, // same dates, other unit
  { id: 'bPaid', room_id: '1d', billing_period_start: '2026-08-09', billing_period_end: '2026-09-08', status: 'Paid' },
  { id: 'bX', room_id: 'X', billing_period_start: '2026-08-01', billing_period_end: '2026-08-31', status: 'Due' },
  { id: 'bWin', room_id: 'W', billing_period_start: '2026-09-01', billing_period_end: '2026-09-30', status: 'Overdue' },
  { id: 'bWbefore', room_id: 'W', billing_period_start: '2026-07-15', billing_period_end: '2026-08-14', status: 'Due' }, // starts before the receipt
  { id: 'bWout', room_id: 'W', billing_period_start: '2026-10-15', billing_period_end: '2026-11-14', status: 'Due' }, // runs past the receipt
];
const got = billsCoveredBy(receipts, bills).map((f) => f.bill.id).sort().join(',');
const want = 'b1d,bF2B,bWin';
if (got !== want) { console.log(`FAIL got ${got} want ${want}`); process.exit(1); }
console.log('pass ' + got);
