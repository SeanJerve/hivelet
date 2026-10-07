/**
 * @file utils/breachedPassword.ts
 * @description Has this password appeared in a known data breach?
 *
 * Asks Have I Been Pwned's Pwned Passwords range API by k-anonymity: only the first five hex
 * characters of the password's SHA-1 leave this server, the service answers with every breached
 * hash that starts with them, and the match is made here. The password, and its full hash, are
 * never sent. `Add-Padding` makes every answer the same size, so its length says nothing either.
 *
 * Added 2026-10-07 (Sean shared a checklist of sign-in weaknesses; this was the one that applied:
 * the length and character rules were enforced on both sides, but a password from a leaked list,
 * such as "Password123", passed them).
 *
 * Fails OPEN: if the service cannot be reached within the timeout, or answers with an error, the
 * result is `null` and the caller lets the password through. A third-party outage must not stop a
 * tenant changing a password they need to change, and the length and character rules still apply.
 */
import crypto from 'node:crypto';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/**
 * How many times the password appears in Pwned Passwords: 0 when it does not, `null` when the
 * service could not be asked.
 */
export async function timesBreached(password: string, timeoutMs = 3000): Promise<number | null> {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(RANGE_URL + prefix, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Hivelet-password-check' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = await res.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, count] = line.trim().split(':');
      // Padding rows carry a count of 0, so they never match as breached.
      if (hashSuffix === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
