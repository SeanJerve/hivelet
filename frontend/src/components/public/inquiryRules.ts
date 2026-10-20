/**
 * @file components/public/inquiryRules.ts
 * @description The rules `POST /public/inquiries` enforces, asked on the page
 *   first, and what a visitor is told when the send itself fails.
 *
 * ONE COPY, READ BY BOTH FORMS
 * ----------------------------
 * Two screens post the same payload: the general form at `/inquire` and the
 * "Ask about unit X" dialog on a category page. The first mirrored the schema;
 * the dialog checked only that three fields were not blank. So the same
 * visitor typing the same "hi" was told what to fix on one screen and handed
 * "Invalid inquiry payload." on the other - the server's words, naming no
 * field. Same shape as `lib/unitCategories.ts`: one list, read by both, so the
 * two cannot drift apart again.
 *
 * Mirrored from `inquirySchema` in backend/src/routes/public.ts:
 *   prospectName   min 2,  max 120
 *   (no email since 20 Oct 2026, migration 085: the inquiry is answered on its own page and by phone)
 *   prospectPhone  a Philippine mobile number, 09XX XXX XXXX or +63 (since 5 Oct 2026)
 *   message        min 5,  max 2000
 * The server still enforces them. This only means a visitor never has to meet
 * its wording.
 */
import { ApiRequestError } from '@/lib/api';
import { LANDLADY } from '@/lib/systemState';

export type InquiryField = 'name' | 'phone' | 'message';
export type InquiryErrors = Partial<Record<InquiryField, string>>;

export interface InquiryInput {
  name: string;
  phone: string;
  message: string;
}

export const MESSAGE_MAX = 2000;

/** The digits of a number with a leading 63 folded to 0, as the server reads it. */
function phMobileDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return /^63\d{10}$/.test(digits) ? `0${digits.slice(2)}` : digits;
}

/**
 * One field's note, for when the visitor LEAVES it (technical evaluators,
 * 3 Oct 2026: check the field when you leave it, not only on Send).
 * An empty field says nothing yet: "required" waits for Send, so tabbing
 * through the form does not paint every field red.
 */
export function problemOnLeave(field: InquiryField, input: InquiryInput): string | undefined {
  if (!input[field].trim()) return undefined;
  return validateInquiry(input)[field];
}

/** Every rule, every field, at once: a visitor fixes the lot in one pass. */
export function validateInquiry(input: InquiryInput): InquiryErrors {
  const errors: InquiryErrors = {};
  const name = input.name.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < 2 || name.length > 120)
    errors.name = 'Please give your full name, between 2 and 120 characters.';

  // A Philippine mobile (technical evaluators, 3 Oct 2026: number validation).
  // The same rule as `phoneDigits` in lib/contactDetails.ts: 63 folds to 0.
  if (!phone) errors.phone = 'Please enter a number the landlady can call.';
  else if (!/^09\d{9}$/.test(phMobileDigits(phone)))
    errors.phone = 'Enter a Philippine mobile number, for example 0917 123 4567.';

  if (message.length < 5)
    errors.message = 'Please write your question. A few words is enough.';
  else if (message.length > MESSAGE_MAX)
    errors.message = `Please keep your question under ${MESSAGE_MAX} characters. It is ${message.length} now.`;

  return errors;
}

/** The payload's field names, as the endpoint's 422 `details` spells them. */
const SERVER_FIELD: Record<string, InquiryField> = {
  prospectName: 'name',
  prospectPhone: 'phone',
  message: 'message',
};

/**
 * A 422 the page did not predict, put back on the field it is about.
 *
 * Should be empty while the rules above match the schema. It exists so that if
 * they ever drift, the visitor is still shown WHICH field, in plain words,
 * rather than "Invalid inquiry payload."
 */
export function serverFieldErrors(err: unknown): InquiryErrors {
  if (!(err instanceof ApiRequestError) || err.status !== 422 || !err.details) return {};
  const out: InquiryErrors = {};
  for (const [key, field] of Object.entries(SERVER_FIELD)) {
    if (err.details[key]?.length) out[field] = 'Please check this and try again.';
  }
  return out;
}

/**
 * What a visitor is told when the message did not go.
 *
 * `api.ts` words a dead connection generically ("We could not reach the
 * server") and the endpoint's own 500 says "Internal server error." Neither
 * tells a prospect whether her message went or what to do now, which is the
 * whole of what she needs. Every branch here says it was NOT sent, because
 * the fields are kept and she should know to press Send again rather than
 * assume it arrived. The server's own sentence is kept where it is already
 * written for her: the rate limit names the wait, and BR-006 names the unit.
 */
export function inquiryFailureMessage(err: unknown): string {
  // No-break spaces in the number (audit 2026-10-09): in the 375px dialog this sentence
  // broke as "call us on 0927 465 / 3938", half a number at the end of a line.
  const phone = LANDLADY.phoneShown.replace(/ /g, '\u00a0');
  const ring = `or call us on ${phone}.`;
  if (!(err instanceof ApiRequestError)) {
    return `Your message was not sent. Please try again, ${ring}`;
  }
  // The one branch that must NOT say "not sent": the request left and no answer
  // came back, so it may well have arrived (see `lib/api.ts`, the deadline).
  if (err.code === 'TIMEOUT') {
    return `We could not confirm your message arrived: the connection stopped answering. Please do not send it again yet. Call us on ${phone} to check.`;
  }
  if (err.code === 'NETWORK_ERROR') {
    return `Your message was not sent because this page could not reach the boarding house. Check your connection and try again, ${ring}`;
  }
  if (err.status === 429 || err.status === 409) {
    return `Your message was not sent. ${err.message}`;
  }
  if (err.status === 404) {
    return 'Your message was not sent because that unit is no longer listed. Reload the page and choose another.';
  }
  if (err.status === 422) {
    return 'Your message was not sent. Please check the fields that have a note under them.';
  }
  return `Your message was not sent because of a problem on our side. Please try again in a moment, ${ring}`;
}
