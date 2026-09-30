/**
 * @file lib/invoiceNumber.ts
 * @description How an invoice number will be saved, shown before she saves it.
 *
 * The twin of backend/src/utils/invoiceNumber.ts (the server applies the rule;
 * this only previews it). Change one, change both. She issues invoices, not
 * official receipts, and not every payment has one (Sean, 2026-09-30):
 * blank is "no invoice", and "OR#4726", "4726" or "invoice 4726" are INV#4726.
 * For some units she gives only an acknowledgement receipt, which has no number
 * (Sean, 2026-10-01): "ACKNOWL", "ack" and the like are saved as
 * ACKNOWLEDGEMENT_RECEIPT, the one option the invoice field offers in its list.
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
