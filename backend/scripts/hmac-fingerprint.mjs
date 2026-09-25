#!/usr/bin/env node
/**
 * Prints the fingerprint of an Adyen HMAC key - the same one the webhook logs on
 * a failed signature - so two people can confirm they hold the SAME key without
 * reading it out to each other (B-68).
 *
 *   node backend/scripts/hmac-fingerprint.mjs <key>        a key you paste
 *   node backend/scripts/hmac-fingerprint.mjs               ADYEN_HMAC_KEY from the root .env
 *
 * Prints the length and a 10-character one-way fingerprint. Never the key.
 * Kept in step with `hmacKeyFingerprint` and `cleanHmacKey` in
 * src/services/adyenWebhook.ts; check:adyen asserts the two agree.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

export function clean(raw) {
  return String(raw ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
}

export function fingerprint(raw) {
  return createHash('sha256').update(Buffer.from(clean(raw), 'hex')).digest('hex').slice(0, 10);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  let raw = process.argv[2];
  let from = 'the argument';
  if (!raw) {
    const env = new URL('../../.env', import.meta.url);
    if (existsSync(env)) {
      const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => /^\s*ADYEN_HMAC_KEY\s*=/.test(l));
      raw = line?.replace(/^\s*ADYEN_HMAC_KEY\s*=/, '');
      from = 'ADYEN_HMAC_KEY in the root .env';
    }
  }
  if (!raw) {
    console.log('No key given and no ADYEN_HMAC_KEY found in the root .env.');
    process.exit(1);
  }
  const key = clean(raw);
  const hexOk = /^[0-9A-Fa-f]+$/.test(key);
  console.log(`${from}: ${key.length} chars${key.length === 64 ? '' : ' (Adyen keys are 64)'}, ` +
    `${hexOk ? 'hexadecimal' : 'NOT hexadecimal - not a valid key'}, fingerprint ${fingerprint(key)}`);
}
