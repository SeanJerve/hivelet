/**
 * @file services/adyenWebhook.ts
 * @description HMAC verification for Adyen notification webhooks.
 * @businessRules BR-016 (Online Payment), BR-017 (Payment Verification)
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now this system treated the **browser redirect** as the payment event. That
 * is the classic mistake in a gateway integration, and it is wrong for two reasons:
 *
 *   1. It is unreliable. The payer can close the tab, lose signal, or hit back
 *      between paying and being returned. The money moved; your system never heard.
 *   2. It is not authenticated. A redirect is just a request the payer's browser
 *      makes. Anyone can make it.
 *
 * Adyen's authoritative signal is the **notification webhook** - a server-to-server
 * POST, signed with HMAC-SHA256 using a key you both hold. `ADYEN_HMAC_KEY` was
 * already in this project's configuration; nothing ever read it, and `createHmac`
 * appeared nowhere in the codebase.
 *
 * WHAT THE SIGNATURE COVERS
 * -------------------------
 * Adyen builds the signed string from eight fields, colon-separated, in this exact
 * order:
 *
 *   pspReference : originalReference : merchantAccountCode : merchantReference :
 *   amount.value : amount.currency : eventCode : success
 *
 * The values are joined RAW - no escaping. This file used to escape `\` and `:`
 * first, which is Adyen's rule for a different payload (key-value payment data),
 * not for notifications. Adyen's own library, `@adyen/api-library`'s
 * `HmacValidator.getDataToSign`, pushes the eight values and joins them with `:`
 * as they are (read 2026-09-25). So a notification whose merchantReference held a
 * colon was refused every time. `check:adyen` now cross-checks against that
 * library directly, not against a copy of this function.
 *
 * The key is hex, decoded to raw bytes. `Buffer.from(hex, 'hex')` stops SILENTLY
 * at the first non-hex character: a key pasted into a dashboard with a wrapping
 * quote or a leading space decodes to a different key, and every signature then
 * fails exactly as if the key were wrong (B-68, 2026-09-25). `cleanHmacKey`
 * strips those before anything uses the key.
 *
 * The result is compared with `timingSafeEqual`, not `===`. A byte-by-byte string
 * comparison returns early on the first mismatch, and the time it takes therefore
 * leaks how much of a guessed signature was correct.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** One notification item, as Adyen nests it inside `notificationItems[]`. */
export interface AdyenNotificationItem {
  pspReference?: string;
  originalReference?: string;
  merchantAccountCode?: string;
  merchantReference?: string;
  amount?: { value?: number; currency?: string };
  eventCode?: string;
  success?: string | boolean;
  /**
   * When Adyen says the event happened. NOT one of the eight HMAC-signed
   * fields - see `buildSignedPayload` below - so it is corroborating evidence
   * rather than proof, and the handler treats it that way.
   */
  eventDate?: string;
  additionalData?: Record<string, string> & { hmacSignature?: string };
}

/**
 * The key as pasted, minus what a paste adds: surrounding whitespace and one pair
 * of wrapping quotes. Anything else stays, so a key that is genuinely wrong still
 * reads as wrong.
 */
export function cleanHmacKey(raw: string | undefined): string {
  return String(raw ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
}

/**
 * A short, one-way fingerprint of the key, safe to log: the first 10 hex
 * characters of SHA-256 over the decoded key bytes. It reveals nothing usable
 * about a 256-bit key, and lets two people confirm they hold the SAME key without
 * either reading it out - compare it with `node backend/scripts/hmac-fingerprint.mjs`.
 */
export function hmacKeyFingerprint(hexKey: string): string {
  const key = cleanHmacKey(hexKey);
  return createHash('sha256').update(Buffer.from(key, 'hex')).digest('hex').slice(0, 10);
}

/**
 * Rebuilds the exact string Adyen signed for this notification item: the eight
 * values, raw, joined with `:`. `undefined` becomes an empty field, as
 * `Array.prototype.join` does in Adyen's own library.
 */
export function buildSignedPayload(item: AdyenNotificationItem): string {
  return [
    item.pspReference,
    item.originalReference,
    item.merchantAccountCode,
    item.merchantReference,
    item.amount?.value,
    item.amount?.currency,
    item.eventCode,
    typeof item.success === 'boolean' ? String(item.success) : item.success
  ]
    .map((value) => String(value ?? ''))
    .join(':');
}

/** Computes the expected base64 HMAC-SHA256 signature for an item. */
export function computeSignature(item: AdyenNotificationItem, hexKey: string): string {
  const key = Buffer.from(cleanHmacKey(hexKey), 'hex');
  return createHmac('sha256', key).update(buildSignedPayload(item), 'utf8').digest('base64');
}

/**
 * Verifies a notification item's signature in constant time.
 *
 * Returns false - never throws - for a missing signature, a malformed key, or any
 * mismatch. A webhook verifier that throws on bad input is a denial-of-service
 * waiting to happen, because the caller is by definition untrusted.
 */
export function verifyNotificationItem(
  item: AdyenNotificationItem,
  hexKey: string
): boolean {
  const provided = item.additionalData?.hmacSignature;
  if (!provided || typeof provided !== 'string') return false;
  hexKey = cleanHmacKey(hexKey);
  if (!hexKey || !/^[0-9a-fA-F]+$/.test(hexKey) || hexKey.length % 2 !== 0) return false;

  let expected: string;
  try {
    expected = computeSignature(item, hexKey);
  } catch {
    return false;
  }

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Comparing a fixed-size digest of each keeps the comparison constant-time
  // regardless of what the caller sent.
  const da = createHmac('sha256', 'len').update(a).digest();
  const dbb = createHmac('sha256', 'len').update(b).digest();
  return timingSafeEqual(da, dbb);
}

/**
 * True when the HMAC key is a real one rather than the placeholder.
 *
 * The `mock_` test is belt-and-braces and cannot currently fire: `mock_` is not
 * hexadecimal, so the pattern below already rejects anything starting with it.
 * Established by mutation on 2026-09-16 - deleting the test broke no assertion,
 * and no input exists that would make it matter. Kept anyway, because it states
 * the intent plainly and costs nothing if the pattern is ever loosened.
 */
/**
 * WHEN THE MONEY MOVED, given what Adyen told us and what our clock says.
 *
 * `paid_at` used to be `new Date()` - the moment WE handled the notification -
 * and that timestamp dates the owner's ledger row. Delivery here is not prompt
 * and is not meant to be: there is one shared Adyen webhook, Adyen cannot reach
 * a laptop, and the tunnel URL changes on every restart (B-03), so retries are
 * the normal case. A resident paying at 22:00 on 30 September whose
 * notification lands on 2 October had their rent filed into OCTOBER.
 *
 * `eventDate` is Adyen's own timestamp. It is NOT one of the eight HMAC-signed
 * fields, so it is corroborating evidence rather than proof, and it is bounded
 * before it is believed:
 *
 *   - in the future beyond a little clock skew -> not a delay, a wrong clock
 *   - older than 90 days                       -> not a delay, a wrong field
 *
 * In either case the server's own time is the safer answer. Everything in
 * between is a delivery delay, which is exactly the thing this is for.
 *
 * Pure, and exported, so `check:adyen` can hold the boundaries still.
 */
export function resolveEventTime(
  eventDate: string | undefined,
  nowMs: number
): { paidAt: string; fromGateway: boolean; lateByHours: number } {
  const MAX_SKEW_MS = 5 * 60 * 1000;
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

  const claimed = eventDate ? Date.parse(eventDate) : NaN;
  const usable =
    Number.isFinite(claimed) && claimed <= nowMs + MAX_SKEW_MS && claimed >= nowMs - MAX_AGE_MS;

  return {
    paidAt: new Date(usable ? claimed : nowMs).toISOString(),
    fromGateway: usable,
    lateByHours: usable ? Math.round((nowMs - claimed) / 3_600_000) : 0,
  };
}

export function isWebhookConfigured(rawKey: string | undefined): boolean {
  const hexKey = cleanHmacKey(rawKey);
  return Boolean(
    hexKey &&
    !hexKey.startsWith('mock_') &&
    /^[0-9a-fA-F]+$/.test(hexKey) &&
    hexKey.length >= 32
  );
}
