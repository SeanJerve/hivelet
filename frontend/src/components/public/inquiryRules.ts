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
 *   prospectEmail  z.string().email()
 *   prospectPhone  min 7,  max 30
 *   message        min 5,  max 2000
 * The server still enforces them. This only means a visitor never has to meet
 * its wording.
 */
import { ApiRequestError } from '@/lib/api';
import { LANDLADY } from '@/lib/systemState';

export type InquiryField = 'name' | 'email' | 'phone' | 'message';
export type InquiryErrors = Partial<Record<InquiryField, string>>;

export interface InquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Zod's own email pattern, not a looser one of ours.
 *
 * The page used `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, which accepts `a@b.c`,
 * `first,last@example.com` and `jose@café.example`. Zod 3.25 rejects all three, so each
 * passed the page and came back from the server as the nameless 422 above.
 * Copied from backend/node_modules/zod/v3/types.js (`emailRegex`, the active
 * one), and checked against `z.string().email()` on 23 addresses on
 * 2026-09-24 with no disagreement. If the backend's zod major version moves,
 * re-run that comparison.
 */
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

export const MESSAGE_MAX = 2000;

/** Every rule, every field, at once: a visitor fixes the lot in one pass. */
export function validateInquiry(input: InquiryInput): InquiryErrors {
  const errors: InquiryErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < 2 || name.length > 120)
    errors.name = 'Please give your full name, between 2 and 120 characters.';

  // `inquiries.prospect_email` is NOT NULL, so the address is asked for rather
  // than invented.
  if (!email) errors.email = 'Please enter an email address she can reply to.';
  else if (!EMAIL_PATTERN.test(email))
    errors.email = 'That does not look like a complete email address, for example name@example.com.';

  if (!phone) errors.phone = 'Please enter a number she can reach you on.';
  else if (phone.length < 7) errors.phone = 'That number looks too short. Please include the whole number.';
  else if (phone.length > 30) errors.phone = 'That number is too long. Please enter one number only.';

  if (message.length < 5)
    errors.message = 'Please write your question. A few words is enough; it is what she reads first.';
  else if (message.length > MESSAGE_MAX)
    errors.message = `Please keep your question under ${MESSAGE_MAX} characters. It is ${message.length} now.`;

  return errors;
}

/** The payload's field names, as the endpoint's 422 `details` spells them. */
const SERVER_FIELD: Record<string, InquiryField> = {
  prospectName: 'name',
  prospectEmail: 'email',
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
    if (err.details[key]?.length) out[field] = 'Please check this. It was not accepted as written.';
  }
  return out;
}

/**
 * What a visitor is told when the message did not go.
 *
 * `api.ts` words a dead connection for a developer - "Check that the API is
 * running" - and the endpoint's own 500 says "Internal server error." Neither
 * tells a prospect whether her message went or what to do now, which is the
 * whole of what she needs. Every branch here says it was NOT sent, because
 * the fields are kept and she should know to press Send again rather than
 * assume it arrived. The server's own sentence is kept where it is already
 * written for her: the rate limit names the wait, and BR-006 names the unit.
 */
export function inquiryFailureMessage(err: unknown): string {
  const ring = `or ring Mrs. ${LANDLADY.name} on ${LANDLADY.phone}.`;
  if (!(err instanceof ApiRequestError)) {
    return `Your message was not sent. Please try again, ${ring}`;
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
