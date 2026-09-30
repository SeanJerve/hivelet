/**
 * @file services/inquiryThread.ts
 * @description The visitor's own way back into their enquiry (065, Sean 2026-09-30).
 *
 * An enquiry used to be a one-way message: Michelle could reply on her
 * Inquiries page, the reply was saved in `inquiry_messages`, and the person who
 * asked never saw it. She had to ring or text them from her own phone.
 *
 * Now, when an enquiry is sent, the visitor is given:
 *   - a private link carrying a 256-bit secret. Only its SHA-256 is stored
 *     (`inquiries.access_token_hash`), so the database cannot hand it back and
 *     a copy of the table opens nobody's conversation. The page puts the secret
 *     in the URL's #fragment, which browsers never send to a server, so it does
 *     not land in any request log either;
 *   - a reference code (e.g. K7QM-3XRD) which, with the phone number they gave,
 *     opens the same conversation when the link is lost.
 *
 * There is no account and no password: there is no public sign-up, and a
 * forgotten password could not be reset without email or SMS.
 *
 * ENQUIRIES FROM BEFORE 065, AND BEFORE 065 RUNS
 * ----------------------------------------------
 * The code tolerates the two columns being absent: `issueCredentials` returns
 * null and the enquiry is still saved, as it always was. So pushing this before
 * the migration runs cannot stop the site taking enquiries.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

/** No 0/O, 1/I/L: the code is read off a screen and typed on a phone. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

function newReferenceCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Typed any way ("k7qm3xrd", "K7QM - 3XRD"), read the one way it is stored. */
export function normaliseReferenceCode(raw: string): string | null {
  const bare = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (bare.length !== 8 || [...bare].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return `${bare.slice(0, 4)}-${bare.slice(4)}`;
}

/**
 * The phone number as a comparable key: its last ten digits, so "0917 123 4567",
 * "+63 917 123 4567" and "639171234567" are the same number.
 */
export function phoneKey(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * A column the migration adds is missing. A read that filters on it fails with
 * 42703; an update that writes it fails in PostgREST's own schema check, PGRST204.
 */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return (
    !!error &&
    (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(error.message ?? ''))
  );
}

/**
 * Gives a just-saved enquiry its link secret and reference code. Returns them,
 * or null if the migration has not run (the enquiry itself is already saved).
 */
export async function issueCredentials(inquiryId: string): Promise<{ token: string; referenceCode: string } | null> {
  const token = randomBytes(32).toString('base64url');
  for (let attempt = 0; attempt < 5; attempt++) {
    const referenceCode = newReferenceCode();
    const { error } = await db
      .from('inquiries')
      .update({ access_token_hash: hashToken(token), reference_code: referenceCode })
      .eq('id', inquiryId);
    if (!error) return { token, referenceCode };
    if (isMissingColumn(error)) return null;
    // 23505: another enquiry already has this code; draw again. Anything else is real.
    if (error.code !== '23505') {
      console.error('[inquiryThread] could not issue credentials:', error.message);
      return null;
    }
  }
  console.error('[inquiryThread] five reference-code collisions in a row; giving up for this enquiry');
  return null;
}

export type ThreadCredentials = { token?: string; reference?: string; phone?: string };

export type ThreadInquiry = {
  id: string;
  status: string;
  prospect_name: string;
  prospect_phone: string;
  reference_code: string | null;
  created_at: string;
  room_number: string | null;
};

/**
 * The enquiry these credentials open, or a 404 that says nothing about which
 * part was wrong (a code that exists with the wrong phone looks exactly like a
 * code that does not exist).
 */
export async function findThreadInquiry(creds: ThreadCredentials): Promise<ThreadInquiry> {
  const notFound = () =>
    ApiError.notFound('No inquiry matches that. Check the link, or the reference code and phone number.');

  let query = db
    .from('inquiries')
    .select('id, status, prospect_name, prospect_phone, reference_code, created_at, rooms:room_id (room_number)');

  if (creds.token) {
    if (creds.token.length < 20 || creds.token.length > 100) throw notFound();
    query = query.eq('access_token_hash', hashToken(creds.token));
  } else {
    const code = normaliseReferenceCode(creds.reference ?? '');
    const key = phoneKey(creds.phone);
    if (!code || key.length < 7) throw notFound();
    query = query.eq('reference_code', code);
  }

  const { data, error } = await query.maybeSingle();
  if (isMissingColumn(error)) {
    throw ApiError.notFound('Reading replies here is not switched on yet. Please call instead.');
  }
  if (error) throw ApiError.internal(error.message);
  if (!data) throw notFound();

  const row = data as any;
  if (!creds.token && phoneKey(row.prospect_phone) !== phoneKey(creds.phone)) throw notFound();

  const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
  return {
    id: row.id,
    status: row.status,
    prospect_name: row.prospect_name,
    prospect_phone: row.prospect_phone,
    reference_code: row.reference_code ?? null,
    created_at: row.created_at,
    room_number: room?.room_number ?? null,
  };
}

/**
 * The conversation as the visitor sees it. Who wrote each message is decided
 * by the sender's role, not by the stored name: anything from the administrator
 * is hers, everything else is the visitor's. Profile ids never leave the server.
 */
export async function readThreadMessages(inquiryId: string) {
  const { data, error } = await db
    .from('inquiry_messages')
    .select('id, sender_name, message_body, sent_at, profiles:sender_id (role)')
    .eq('inquiry_id', inquiryId)
    .order('sent_at', { ascending: true });
  if (error) throw ApiError.internal(error.message);
  return (data ?? []).map((m: any) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const fromAdmin = profile?.role === 'admin';
    return {
      id: m.id as string,
      from: fromAdmin ? ('landlady' as const) : ('you' as const),
      name: fromAdmin ? String(m.sender_name ?? '') : 'You',
      body: String(m.message_body ?? ''),
      sentAt: m.sent_at as string,
    };
  });
}
