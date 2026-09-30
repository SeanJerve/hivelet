/**
 * @file utils/invoiceNumber.ts
 * @description The one way an invoice number is written (Sean, 2026-09-30).
 *
 * She issues INVOICES, not official receipts ("OR"), and not every payment
 * has one. So:
 *   - blank means "no invoice" and is stored as NULL, never an invented number;
 *   - "OR#4726", "O#4726", "O.R. 4726", "INVOICE#4726", "INV.4726", "inv 4726"
 *     and a bare "4726" are all written INV#4726;
 *   - an ACKNOWLEDGEMENT RECEIPT (Sean, 2026-10-01): for some units she gives
 *     only an acknowledgement receipt, which has no number ("--" in her sheets).
 *     "ACKNOWL", "ack", "Acknowledgment receipt" and the like are all written
 *     ACKNOWLEDGEMENT_RECEIPT. It is a kind of slip, not a number, so the
 *     "one invoice number, one unit, one day" guards do not apply to it
 *     (`isAcknowledgementReceipt`), and migration 072 exempts it from the
 *     one-invoice-per-unit-per-month index;
 *   - anything else she writes is kept as she wrote it.
 *
 * Migration 066 applied the number rule to the ledger that was already there,
 * and the frontend twin (frontend/src/lib/invoiceNumber.ts) shows her what
 * will be saved before she saves it. Change one, change both.
 */
const PREFIX = /^(?:O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*/i;

export const ACKNOWLEDGEMENT_RECEIPT = 'Acknowledgement receipt';

export function isAcknowledgementReceipt(value: string | null | undefined): boolean {
  return /^ack/i.test(String(value ?? '').trim());
}

export function normalizeInvoiceNumber(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (isAcknowledgementReceipt(s)) return ACKNOWLEDGEMENT_RECEIPT;
  const rest = s.replace(PREFIX, '').trim();
  if (/^\d/.test(rest)) return `INV#${rest}`;
  if (/^\d/.test(s)) return `INV#${s}`;
  return s;
}
