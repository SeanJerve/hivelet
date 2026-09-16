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
 * Any `\` or `:` inside a value is escaped first, so a colon in a merchant
 * reference cannot be used to shift the field boundaries - which is the attack the
 * escaping exists to stop. The key is hex; it is decoded to raw bytes before use.
 *
 * The result is compared with `timingSafeEqual`, not `===`. A byte-by-byte string
 * comparison returns early on the first mismatch, and the time it takes therefore
 * leaks how much of a guessed signature was correct.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** One notification item, as Adyen nests it inside `notificationItems[]`. */
export interface AdyenNotificationItem {
  pspReference?: string;
  originalReference?: string;
  merchantAccountCode?: string;
  merchantReference?: string;
  amount?: { value?: number; currency?: string };
  eventCode?: string;
  success?: string | boolean;
  additionalData?: Record<string, string> & { hmacSignature?: string };
}

/** Escapes a field for the signed payload: backslash first, then colon. */
function escapeField(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:');
}

/**
 * Rebuilds the exact string Adyen signed for this notification item.
 * Exported so it can be tested directly against Adyen's published example.
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
    .map(escapeField)
    .join(':');
}

/** Computes the expected base64 HMAC-SHA256 signature for an item. */
export function computeSignature(item: AdyenNotificationItem, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
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
export function isWebhookConfigured(hexKey: string | undefined): boolean {
  return Boolean(
    hexKey &&
    !hexKey.startsWith('mock_') &&
    /^[0-9a-fA-F]+$/.test(hexKey) &&
    hexKey.length >= 32
  );
}
