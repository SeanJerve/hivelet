/**
 * @file services/standingService.ts
 * @description Reads what `computeStanding()` needs for one resident, and the figures to show with it.
 *
 * Separate from billingService because that file stays free of database access
 * (its header says why). The dates are worked out there; this only fetches.
 */
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { propertyToday } from '../utils/propertyClock.js';
import { computeBillAmounts, computeStanding, type BillAmounts, type Standing } from './billingService.js';

export interface ResidentStanding extends Standing {
  roomId: string;
  roomNumber: string;
  /** One period at today's rate and headcount - what the checkout would charge for it. */
  perPeriod: BillAmounts;
  /** Periods whose due date has arrived. What the resident owes today. */
  periodsDue: number;
  totalDue: number;
  /** `totalDue` plus a period opening within the payable week - payable, not yet owed. */
  totalPayable: number;
}

/**
 * The resident's standing, or null when they hold no active tenancy.
 *
 * Paid-through is the latest `rent_period_end` on a VERIFIED, UNVOIDED receipt.
 * A pending GCash payment does not count until she verifies it (BR-017), and a
 * voided receipt never did.
 */
export async function readStanding(tenantProfileId: string): Promise<ResidentStanding | null> {
  const { data: assignment, error: assignmentError } = await db
    .from('room_assignments')
    .select('room_id, start_date, occupant_count, rooms:room_id (room_number, current_price)')
    .eq('tenant_profile_id', tenantProfileId)
    .eq('is_active', true)
    .maybeSingle();
  if (assignmentError) throw ApiError.internal(assignmentError.message);

  const room = assignment?.rooms as { room_number?: string; current_price?: number } | null;
  if (!assignment?.room_id || !room?.room_number || !assignment.start_date) return null;

  // A failed read here is not "nothing on record" - that would put every period
  // since the tenancy began on the resident's screen as owed.
  const { data: latest, error: latestError } = await db
    .from('monthly_income_records')
    .select('rent_period_end')
    .eq('tenant_profile_id', tenantProfileId)
    .eq('verification_status', 'Verified')
    .is('voided_at', null)
    .not('rent_period_end', 'is', null)
    .order('rent_period_end', { ascending: false })
    .limit(1);
  if (latestError) throw ApiError.internal(latestError.message);

  const paidThrough = latest?.[0]?.rent_period_end ? String(latest[0].rent_period_end).slice(0, 10) : null;
  const today = propertyToday();
  const standing = computeStanding({
    paidThrough,
    tenancyStart: String(assignment.start_date).slice(0, 10),
    today,
  });

  const perPeriod = await computeBillAmounts({
    roomNumber: room.room_number,
    currentPrice: Number(room.current_price) || 0,
    occupants: Number(assignment.occupant_count) || 1,
  });

  const periodsDue = standing.owedPeriods.filter((p) => p.dueDate <= today).length;
  const times = (n: number) => Math.round(perPeriod.totalAmount * 100 * n) / 100;
  return {
    ...standing,
    roomId: assignment.room_id,
    roomNumber: room.room_number,
    perPeriod,
    periodsDue,
    totalDue: times(periodsDue),
    totalPayable: times(standing.owedPeriods.length),
  };
}
