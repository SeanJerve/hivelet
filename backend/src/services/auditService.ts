/**
 * @file services/auditService.ts
 * @description Immutable activity/audit trail writer.
 * @systemBibleRef Section 14 (Financial Corrections and Auditability)
 * @businessRules  BR-018 Payment Correction, BR-028 Auditability
 * @requirements   FR-029 Audit Logs
 *
 * System Bible Section 14 requires that a correction "identify the actor,
 * record the previous value, record the new value, record the timestamp".
 * Migration 002 revokes UPDATE/DELETE on `audit_logs` from every role, so rows
 * written here are append-only at the storage layer, not merely by convention.
 */
import type { Request } from 'express';
import { db } from '../config/db.js';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_ACCESS_DENIED'
  | 'PROFILE_UPDATE'
  | 'ROOM_UPDATE'
  // A room deletion was logged as ROOM_UPDATE, so the one record that survives
  // the row said the room had been edited rather than destroyed. BR-003.
  | 'ROOM_DELETE'
  | 'ROOM_STATUS_CHANGE'
  | 'TENANT_CREATE'
  | 'TENANT_UPDATE'
  | 'TENANT_DEACTIVATE'
  | 'INQUIRY_CREATE'
  | 'INQUIRY_STATUS_CHANGE'
  | 'BILL_CREATE'
  | 'BILL_UPDATE'
  | 'PAYMENT_RECORD'
  | 'PAYMENT_VERIFY'
  | 'PAYMENT_CORRECT'
  | 'TICKET_CREATE'
  | 'TICKET_STATUS_CHANGE'
  | 'TICKET_CLOSE'
  | 'TICKET_DELETE'
  | 'TICKET_MESSAGE_SEND'
  | 'INQUIRY_MESSAGE_SEND'
  | 'ROOM_PHOTO_UPLOAD'
  | 'EXPENSE_CREATE'
  | 'EXPENSE_UPDATE'
  | 'EXPENSE_VOID'
  // Exporting the ledger is a read, but it removes a full year of the owner's
  // financial records from the system in one file. BR-048 makes authorship of
  // these ledgers admin-only; knowing when a copy left is part of the same
  // accountability.
  | 'LEDGER_EXPORT';

export type AuditEntityType =
  | 'PROFILE'
  | 'ROOM'
  | 'ROOM_ASSIGNMENT'
  | 'INQUIRY'
  | 'BILL'
  | 'PAYMENT'
  | 'INCOME_RECORD'
  | 'EXPENSE_ENTRY'
  | 'TICKET'
  /**
   * The trail itself, for an export of it. `audit_logs.entity_type` is a
   * varchar, not an enum, so this union is a convention this code keeps rather
   * than a constraint the database enforces - checked against
   * `information_schema.columns`, not the schema file.
   */
  | 'AUDIT_LOG';

export interface AuditEntry {
  actorProfileId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * The client's address, as far as it can be trusted.
 *
 * This read `X-Forwarded-For` itself and took the LEFTMOST entry - which is
 * whatever the caller typed. On the two unauthenticated payment routes, the
 * Adyen webhook and the local cashier, that made the only identity in the audit
 * trail a value the sender chose. Anyone could POST with
 * `X-Forwarded-For: 203.0.113.9` and have it persisted, and the audit row is the
 * SOLE durable record for an unmatched payment.
 *
 * `server.ts` already does this properly: `app.set('trust proxy', 1)` tells
 * Express how many hops to believe, and `req.ip` is the result. The manual
 * parse bypassed that configuration entirely and always won, because it ran
 * first.
 *
 * So: ask Express, and let `trust proxy` be the single place that decides.
 *
 * WHAT THIS DOES AND DOES NOT BUY, measured against the running server rather
 * than assumed:
 *
 *     no proxy header          -> ::ffff:127.0.0.1   (the real socket)
 *     one spoofed XFF entry    -> 203.0.113.9
 *     a chain of three         -> 192.0.2.1          (the rightmost, not the first)
 *
 * The old code returned the attacker's chosen value in ALL THREE cases. Hop
 * counting now defeats the chain - prepending addresses no longer lets a caller
 * pick what is recorded.
 *
 * It does NOT make the value proof. With `trust proxy` set to 1, Express
 * believes exactly one proxy is in front, so a DIRECT request carrying a single
 * XFF header still has that header believed. That is a deployment fact, not a
 * code one: the setting is only as true as the topology. Treat this field as
 * "what the chain reported", never as "where the request came from" - see B-42.
 *
 * `req.socket.remoteAddress` remains the last resort for a request that arrived
 * with no proxy handling at all.
 */
export function clientIp(req: Request): string | null {
  return req.ip ?? req.socket.remoteAddress ?? null;
}

/**
 * Writes one audit row.
 *
 * Failures are logged but never thrown: an audit outage must not roll back a
 * legitimate financial action the administrator already confirmed. The console
 * error is the signal to investigate.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeEntityId = entry.entityId && uuidRegex.test(entry.entityId)
      ? entry.entityId
      : '00000000-0000-0000-0000-000000000000';

    const { error } = await db.from('audit_logs').insert({
      actor_profile_id: entry.actorProfileId && uuidRegex.test(entry.actorProfileId) ? entry.actorProfileId : null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: safeEntityId,
      previous_values: entry.previousValues ?? null,
      new_values: entry.newValues ?? null,
      ip_address: entry.ipAddress ?? null,
    });

    if (error) {
      console.error('[audit] Failed to write audit row:', error.message, entry.action);
    }
  } catch (error: unknown) {
    console.error('[audit] Unexpected audit failure:', error);
  }
}

/** Convenience wrapper that pulls actor and IP straight off the request. */
export async function auditFromRequest(
  req: Request,
  entry: Omit<AuditEntry, 'actorProfileId' | 'ipAddress'>
): Promise<void> {
  await recordAudit({
    ...entry,
    actorProfileId: req.user?.profileId ?? null,
    ipAddress: clientIp(req),
  });
}

/*
 * THE REFUSAL BUDGET - decided 2026-09-24
 * ---------------------------------------
 * Every 401 and 403 used to write a permanent row, and `audit_logs` cannot be
 * pruned (migration 002 revokes DELETE). Measured that day, read-only: 10,673
 * of the table's 16,422 rows were AUTH_ACCESS_DENIED, 8,719 of them with no
 * actor, and that was before the site was public - nearly all from the check
 * suites and dev machines. Once deployed, anyone can send `GET /api/admin/x` in
 * a loop, and each request buried the owner's business history one row deeper
 * with nothing to clean it up.
 *
 * What was kept: the SIGNAL. The first refusals from any caller are recorded
 * exactly as before, so "this address probed the admin routes" or "this
 * resident tried an admin screen" is still in the trail.
 * What was bounded: the VOLUME.
 *
 *   - 20 rows per caller per 15 minutes. The caller is the signed-in profile,
 *     else the address `clientIp` reports.
 *   - 120 rows per hour from all anonymous callers together, so a thousand
 *     addresses cannot each spend their own 20.
 *   - Beyond either, the refusal is counted in memory, not written. The row
 *     that reaches the limit says so, and the caller's next recorded row after
 *     the window carries `suppressedInPreviousWindow: N`.
 *   - Failed sign-ins are exempt. `failureLimit` on /auth/login and the
 *     per-account lockout already bound them, and they are the rows a spraying
 *     attempt shows up in.
 *
 * The request is still refused either way. Only whether it is written down
 * changes. Per process and in memory, like `rateLimit.ts`: a restart forgets the
 * counts, which at worst records a few more rows.
 */
const DENIAL_WINDOW_MS = 15 * 60 * 1000;
const DENIALS_PER_CALLER = 20;
const ANON_WINDOW_MS = 60 * 60 * 1000;
const ANON_DENIALS_PER_WINDOW = 120;
const MAX_TRACKED_CALLERS = 5000;
const EXEMPT_REASONS = /^(INVALID_CREDENTIALS|ACCOUNT_LOCKED):/;

interface DenialWindow { since: number; recorded: number; suppressed: number }
const denialWindows = new Map<string, DenialWindow>();
let anonWindow: DenialWindow = { since: 0, recorded: 0, suppressed: 0 };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Records a rejected authorization attempt, within the budget above.
 *
 * Section 20 makes authorization a backend concern; a denied attempt is
 * exactly the kind of event the administrator should be able to review later.
 */
export async function auditAccessDenied(
  req: Request,
  reason: string
): Promise<void> {
  const now = Date.now();
  const actor = req.user?.profileId ?? null;
  const ip = clientIp(req);
  const extra: Record<string, unknown> = {};

  if (!EXEMPT_REASONS.test(reason)) {
    const key = actor ? `actor:${actor}` : `ip:${ip ?? 'unknown'}`;
    let w = denialWindows.get(key);
    if (!w || now - w.since >= DENIAL_WINDOW_MS) {
      if (w?.suppressed) extra.suppressedInPreviousWindow = w.suppressed;
      if (!w && denialWindows.size >= MAX_TRACKED_CALLERS) {
        for (const [k, v] of denialWindows) if (now - v.since >= DENIAL_WINDOW_MS) denialWindows.delete(k);
      }
      w = { since: now, recorded: 0, suppressed: 0 };
      if (denialWindows.size < MAX_TRACKED_CALLERS) denialWindows.set(key, w);
    }
    if (!actor && now - anonWindow.since >= ANON_WINDOW_MS) {
      if (anonWindow.suppressed) {
        console.warn(`[audit] ${anonWindow.suppressed} anonymous refusals counted but not recorded in the last hour`);
      }
      anonWindow = { since: now, recorded: 0, suppressed: 0 };
    }

    if (w.recorded >= DENIALS_PER_CALLER || (!actor && anonWindow.recorded >= ANON_DENIALS_PER_WINDOW)) {
      w.suppressed += 1;
      if (!actor) anonWindow.suppressed += 1;
      return;
    }
    w.recorded += 1;
    if (!actor) anonWindow.recorded += 1;
    if (w.recorded === DENIALS_PER_CALLER) {
      extra.note =
        `Refusal budget reached for this caller. Further refusals are counted, not recorded, ` +
        `until ${new Date(w.since + DENIAL_WINDOW_MS).toISOString()}.`;
    }
  }

  await recordAudit({
    actorProfileId: actor,
    action: 'AUTH_ACCESS_DENIED',
    entityType: 'PROFILE',
    entityId: actor ?? '00000000-0000-0000-0000-000000000000',
    newValues: {
      method: req.method,
      path: clip(req.originalUrl, 300),
      role: req.role ?? 'guest',
      reason: clip(reason, 300),
      ...extra,
    },
    ipAddress: ip,
  });
}
