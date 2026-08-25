/**
 * @file services/scopeService.ts
 * @description Resolves which rows a tenant is permitted to see.
 * @systemBibleRef Section 8 (One Room, One Primary Account), Section 20 (Security)
 * @businessRules  BR-024 Tenant Privacy, BR-003 Historical Preservation
 *
 * Holding `bill:read:own` is only half of the control — the query must also be
 * narrowed to the caller's rows. Every tenant-facing controller derives its
 * filter from here rather than from a client-supplied room or tenant id.
 */
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import type { TenantScope } from '../types/auth.js';

interface AssignmentRow {
  id: string;
  room_id: string;
  is_active: boolean;
}

/**
 * Builds the set of rooms a tenant may read.
 *
 * Active assignments drive current billing and ticket access. Historical
 * assignments are kept separately so a tenant can still see their own past
 * records (BR-003) without gaining access to the room's current occupant.
 */
export async function resolveTenantScope(profileId: string): Promise<TenantScope> {
  const { data, error } = await db
    .from('room_assignments')
    .select('id, room_id, is_active')
    .eq('tenant_profile_id', profileId);

  if (error) {
    throw ApiError.internal(`Failed to resolve tenant scope: ${error.message}`);
  }

  const rows = (data ?? []) as AssignmentRow[];

  return {
    profileId,
    roomIds: rows.filter((r) => r.is_active).map((r) => r.room_id),
    historicalRoomIds: [...new Set(rows.map((r) => r.room_id))],
    assignmentIds: rows.map((r) => r.id),
  };
}

/**
 * Confirms a tenant may touch a specific room, throwing 404 rather than 403.
 *
 * A 403 would confirm the room exists and simply belongs to someone else,
 * which is itself a small disclosure. From an unauthorized tenant's
 * perspective the room should be indistinguishable from nonexistent.
 */
export function assertRoomInScope(scope: TenantScope, roomId: string): void {
  if (!scope.historicalRoomIds.includes(roomId)) {
    throw ApiError.notFound('Room not found.');
  }
}

/** Empty scope short-circuit — a tenant with no assignment sees nothing. */
export function isEmptyScope(scope: TenantScope): boolean {
  return scope.historicalRoomIds.length === 0;
}
