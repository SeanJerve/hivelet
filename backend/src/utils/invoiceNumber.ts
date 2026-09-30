/**
 * @file utils/invoiceNumber.ts
 * @description The one way an invoice number is written (Sean, 2026-09-30).
 *
 * She issues INVOICES, not official receipts ("OR"), and not every payment
 * has one. So:
 *   - blank means "no invoice" and is stored as NULL, never an invented number;
 *   - "OR#4726", "O#4726", "O.R. 4726", "INVOICE#4726", "INV.4726", "inv 4726"
 *     and a bare "4726" are all written INV#4726;
 *   - anything else she writes (an "ACKNOWL" slip) is kept as she wrote it.
 *
 * Migration 066 applied the same rule to the ledger that was already there,
 * and the frontend twin (frontend/src/lib/invoiceNumber.ts) shows her what
 * will be saved before she saves it. Change one, change both.
 */
const PREFIX = /^(?:O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*/i;

export function normalizeInvoiceNumber(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const rest = s.replace(PREFIX, '').trim();
  if (/^\d/.test(rest)) return `INV#${rest}`;
  if (/^\d/.test(s)) return `INV#${s}`;
  return s;
}
