/**
 * The one way a suite signs in as the administrator, so a stale password cannot lock her out.
 *
 * The administrator account is the owner's own. It locks for 15 minutes after five consecutive
 * failures (backend/src/config/env.ts). On 5 Oct 2026 `credentials/creds.txt` still held the
 * password from before the B-98 rotation, and one `check:all` plus one re-run spent three of her
 * five attempts (B-101). Nothing stopped the next run spending the other two.
 *
 * So: when a password is refused, its SHA-256 is written to `credentials/.admin-signin-refused`
 * (gitignored with the rest of the folder; the hash, never the password). Before any attempt, a
 * password whose hash is in that file is not sent at all. Changing `creds.txt` changes the hash,
 * so the next run tries again; a successful sign-in deletes the file.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function refusedMarkerPath(root) {
  return path.join(root, 'credentials', '.admin-signin-refused');
}

/**
 * Returns `{ token }` on success, or `{ token: null, reason }`. Never retries.
 * `reason` is written for a person reading the suite's output.
 */
export async function signInAsAdmin({ root, base, email, password }) {
  const marker = refusedMarkerPath(root);
  const hash = sha(`${email}\n${password}`);
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').includes(hash)) {
    return {
      token: null,
      reason: `NOT attempted: the password in credentials/creds.txt for ${email} was already refused ` +
        `(${marker}). Sending it again spends one of the owner's five attempts. Put the current ` +
        'password in creds.txt and run again (B-101).',
    };
  }
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!r) return { token: null, reason: 'the backend did not answer. Is it running (npm run dev:backend)?' };
  if (r.status === 429) {
    return { token: null, reason: `${email} is locked for a few minutes (429). Nothing else was sent.` };
  }
  if (r.status === 401) {
    fs.appendFileSync(marker, `${hash} ${new Date().toISOString()} ${r.status}\n`);
    return {
      token: null,
      reason: `sign-in refused (${r.status}) for ${email}. creds.txt is out of date; this password will ` +
        'not be sent again until creds.txt changes (B-101).',
    };
  }
  if (!r.ok) return { token: null, reason: `sign-in answered ${r.status}` };
  const j = await r.json().catch(() => null);
  const token = j?.data?.token ?? j?.token ?? null;
  if (token && fs.existsSync(marker)) fs.rmSync(marker);
  return token ? { token } : { token: null, reason: 'sign-in answered with no token' };
}
