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
 * When the tenant's CONTINUOUS stay began: the active tenancy, and every earlier
 * one that ran into it with no gap (ended on or after the day before the next
 * began).
 *
 * `computeStanding` never counts a period before `tenancyStart`, and a room move
 * ends the old tenancy and starts a new one dated the day of the move. Passing
 * the active tenancy's own start therefore wiped whatever was owed before a
 * move from the portal and the checkout (FINAL_REVIEW F11). A tenant who left
 * and came back after a gap still starts fresh, as before.
 */
async function continuousStayStart(tenantProfileId: string, activeStart: string): Promise<string> {
  const { data, error } = await db
    .from('room_assignments')
    .select('start_date, end_date')
    .eq('tenant_profile_id', tenantProfileId)
    .order('start_date', { ascending: false });
  if (error) throw ApiError.internal(error.message);
  return stayStartFrom((data ?? []) as TenancySpan[], activeStart);
}

type TenancySpan = { start_date: string; end_date: string | null };

/** The walk itself, over one tenant's tenancies newest first. Shared with `readActiveStandings`. */
function stayStartFrom(tenancies: TenancySpan[], activeStart: string): string {
  const dayBefore = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  };

  let start = activeStart;
  for (const t of tenancies) {
    const tStart = String(t.start_date).slice(0, 10);
    const tEnd = t.end_date ? String(t.end_date).slice(0, 10) : null;
    if (tStart >= start) continue;                      // the active one, or a later one
    if (tEnd === null || tEnd >= dayBefore(start)) start = tStart;   // ran into the stay
    else break;                                         // a gap: the stay began at `start`
  }
  return start;
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
  return assembleStanding(
    { room_id: assignment.room_id, occupant_count: assignment.occupant_count },
    { room_number: room.room_number, current_price: room.current_price },
    paidThrough,
    await continuousStayStart(tenantProfileId, String(assignment.start_date).slice(0, 10)),
  );
}

/** The figures from what was read. One body for `readStanding` and `readActiveStandings`. */
async function assembleStanding(
  assignment: { room_id: string; occupant_count: unknown },
  room: { room_number: string; current_price?: unknown },
  paidThrough: string | null,
  tenancyStart: string,
): Promise<ResidentStanding> {
  const today = propertyToday();
  const standing = computeStanding({ paidThrough, tenancyStart, today });

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

/**
 * `readStanding` for every tenant with an active tenancy, in three reads instead of three per
 * tenant (final backend audit, 7 Nov 2026). The Overview's Rent due this week called
 * `readStanding` once per tenant: 1 + 3 x 33 = 100 round trips, measured at 2.2 to 2.8 s from
 * Legazpi, on every Overview load. Same reads, same walk, same arithmetic (`stayStartFrom`,
 * `assembleStanding`), so each entry equals what `readStanding` gives that tenant;
 * `check:billing` compares the two against the live data.
 *
 * Receipts are read in pages: there are over 600 verified ones for current tenants, and
 * PostgREST stops at 1,000 rows a request, which would quietly drop a tenant's latest.
 */
export async function readActiveStandings(): Promise<
  { tenantProfileId: string; name: string | null; standing: ResidentStanding | null }[]
> {
  const { data: active, error: activeError } = await db
    .from('room_assignments')
    .select(
      'tenant_profile_id, room_id, start_date, occupant_count, rooms:room_id (room_number, current_price), ' +
        'profiles:tenant_profile_id (full_name)'
    )
    .eq('is_active', true);
  if (activeError) throw ApiError.internal(activeError.message);
  const rows = (active ?? []) as unknown as {
    tenant_profile_id: string | null; room_id: string | null; start_date: string | null;
    occupant_count: unknown; rooms: unknown; profiles: unknown;
  }[];
  const ids = [...new Set(rows.map((r) => r.tenant_profile_id).filter((x): x is string => !!x))];
  if (ids.length === 0) return [];

  // `readStanding`'s maybeSingle() refuses a tenant with two active tenancies; so does this.
  if (ids.length !== rows.filter((r) => r.tenant_profile_id).length) {
    throw ApiError.internal('A tenant holds more than one active tenancy.');
  }

  // The tenancies and the receipts do not depend on each other, so they are read together.
  const readSpans = async () => {
    const { data: spans, error: spansError } = await db
      .from('room_assignments')
      .select('tenant_profile_id, start_date, end_date')
      .in('tenant_profile_id', ids)
      .order('start_date', { ascending: false });
    if (spansError) throw ApiError.internal(spansError.message);
    const spansOf = new Map<string, TenancySpan[]>();
    for (const s of (spans ?? []) as (TenancySpan & { tenant_profile_id: string })[]) {
      const list = spansOf.get(s.tenant_profile_id) ?? [];
      list.push(s);
      spansOf.set(s.tenant_profile_id, list);
    }
    return spansOf;
  };
  const readPaidThrough = async () => {
    const paidThroughOf = new Map<string, string>();
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: pageError } = await db
        .from('monthly_income_records')
        .select('id, tenant_profile_id, rent_period_end')
        .in('tenant_profile_id', ids)
        .eq('verification_status', 'Verified')
        .is('voided_at', null)
        .not('rent_period_end', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (pageError) throw ApiError.internal(pageError.message);
      for (const r of (page ?? []) as { tenant_profile_id: string; rent_period_end: string }[]) {
        const end = String(r.rent_period_end).slice(0, 10);
        const was = paidThroughOf.get(r.tenant_profile_id);
        if (!was || end > was) paidThroughOf.set(r.tenant_profile_id, end);
      }
      if (!page || page.length < PAGE) break;
    }
    return paidThroughOf;
  };
  const [spansOf, paidThroughOf] = await Promise.all([readSpans(), readPaidThrough()]);

  const out: { tenantProfileId: string; name: string | null; standing: ResidentStanding | null }[] = [];
  for (const r of rows) {
    if (!r.tenant_profile_id) continue;
    const room = (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms) as { room_number?: string; current_price?: number } | null;
    const profile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { full_name?: string } | null;
    const standing = !r.room_id || !room?.room_number || !r.start_date
      ? null
      : await assembleStanding(
          { room_id: r.room_id, occupant_count: r.occupant_count },
          { room_number: room.room_number, current_price: room.current_price },
          paidThroughOf.get(r.tenant_profile_id) ?? null,
          stayStartFrom(spansOf.get(r.tenant_profile_id) ?? [], String(r.start_date).slice(0, 10)),
        );
    out.push({ tenantProfileId: r.tenant_profile_id, name: profile?.full_name ?? null, standing });
  }
  return out;
}
