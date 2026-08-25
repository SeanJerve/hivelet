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
  | 'EXPENSE_CREATE'
  | 'EXPENSE_UPDATE'
  | 'EXPENSE_VOID';

export type AuditEntityType =
  | 'PROFILE'
  | 'ROOM'
  | 'ROOM_ASSIGNMENT'
  | 'INQUIRY'
  | 'BILL'
  | 'PAYMENT'
  | 'INCOME_RECORD'
  | 'EXPENSE_ENTRY'
  | 'TICKET';

export interface AuditEntry {
  actorProfileId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/** Extracts the client IP, honouring a proxy header when present. */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
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
    const { error } = await db.from('audit_logs').insert({
      actor_profile_id: entry.actorProfileId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
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

/**
 * Records a rejected authorization attempt.
 *
 * Section 20 makes authorization a backend concern; a denied attempt is
 * exactly the kind of event the administrator should be able to review later.
 */
export async function auditAccessDenied(
  req: Request,
  reason: string
): Promise<void> {
  await recordAudit({
    actorProfileId: req.user?.profileId ?? null,
    action: 'AUTH_ACCESS_DENIED',
    entityType: 'PROFILE',
    entityId: req.user?.profileId ?? '00000000-0000-0000-0000-000000000000',
    newValues: {
      method: req.method,
      path: req.originalUrl,
      role: req.role ?? 'guest',
      reason,
    },
    ipAddress: clientIp(req),
  });
}
