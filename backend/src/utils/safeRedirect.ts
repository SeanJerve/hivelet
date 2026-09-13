/**
 * @file utils/safeRedirect.ts
 * @description Validates caller-supplied return URLs against the CORS allow-list.
 *
 * WHY THIS EXISTS
 * ---------------
 * `POST /api/tenant/payments/checkout` accepted `returnUrl` as an unvalidated
 * `z.string()`. That value was stored in the checkout session, handed to Adyen as
 * the session's returnUrl, and then used directly in `res.redirect()` when the
 * gateway returned. A tenant could therefore post
 *
 *     { "returnUrl": "https://evil.example/harvest" }
 *
 * and the server would bounce the payer to that host from a trusted origin,
 * carrying `?status=success&ref=<payment reference>` in the query string. That is
 * an open redirect, and it leaks the payment reference to whoever crafted it.
 *
 * The fix is not to sanitise the string - it is to refuse any origin the
 * application does not already trust for CORS. There is exactly one list of
 * trusted origins in this system and this reuses it, so the two cannot drift.
 */
import { config } from '../config/env.js';

/**
 * Returns `candidate` when it points somewhere this application already trusts,
 * and `fallback` otherwise.
 *
 * Accepts:
 *   - a relative path (`/tenant/payments`) - same-origin by construction
 *   - an absolute URL whose origin is in `CORS_ORIGINS`
 *   - an absolute URL on localhost, which the CORS policy already allows so that
 *     the dev server on any port keeps working
 *
 * Refuses everything else, including protocol-relative URLs (`//evil.example`),
 * which browsers resolve as absolute and which a naive "starts with /" check
 * would wave straight through.
 */
export function safeReturnUrl(candidate: string | null | undefined, fallback: string): string {
  if (!candidate || typeof candidate !== 'string') return fallback;

  const value = candidate.trim();
  if (!value) return fallback;

  // Protocol-relative: "//evil.example/x" is an ABSOLUTE url to a browser.
  if (value.startsWith('//')) {
    console.warn(`[safeRedirect] refused protocol-relative URL: ${value.slice(0, 80)}`);
    return fallback;
  }

  // A plain relative path cannot leave this origin.
  if (value.startsWith('/')) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    console.warn(`[safeRedirect] refused unparseable URL: ${value.slice(0, 80)}`);
    return fallback;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    console.warn(`[safeRedirect] refused non-http(s) scheme: ${url.protocol}`);
    return fallback;
  }

  // Userinfo. `https://evil.example@localhost/x` really does resolve to localhost,
  // so the destination would be safe - but the string renders as though it belongs
  // to evil.example, which is a display-spoofing trick, and URL parsers disagree
  // about it often enough that it should never appear in a redirect we emit.
  if (url.username || url.password) {
    console.warn(`[safeRedirect] refused URL carrying userinfo: ${url.origin}`);
    return fallback;
  }

  const allowed =
    config.cors.origins.includes(url.origin) ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1';

  if (!allowed) {
    console.warn(
      `[safeRedirect] refused off-origin return URL: ${url.origin} ` +
      `(allowed: ${config.cors.origins.join(', ') || 'none'})`
    );
    return fallback;
  }

  return url.toString();
}

/** The default place to send a payer when no trustworthy return URL was supplied. */
export function defaultReturnUrl(): string {
  const base = config.cors.origins[0] || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/tenant/payments`;
}
