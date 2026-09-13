-- =============================================================================
-- Migration 009 — Advance Rent Semantics and Whole-Month Billing
-- =============================================================================
-- @phase          Phase 2 (Database Architecture / semantics)
-- @decisionRef    OD-04 and OD-03, both closed 2026-09-13 by Group 4
-- @businessRules  BR-025 (deactivation), BR-035, BR-038
--
-- Two long-standing open questions were answered together, and both turned out
-- to be about the same thing: this business does not refund.
--
-- OD-04 - THERE IS NO SECURITY DEPOSIT.
-- The register assumed `room_assignments.deposit_amount` held a refundable
-- security deposit and asked how it is reconciled on move-out. It does not.
-- Confirmed 2026-09-13: no separate damage/security sum is ever collected. The
-- column holds ADVANCE RENT - rent paid ahead of the period it covers. If the
-- tenant leaves without consuming it, it is not returned.
--
-- The consequence is that OD-04 needs no schema at all. Adding
-- `deposit_refunded_amount` / `deposit_forfeited_amount` columns, as the Phase 1
-- register anticipated, would have created machinery for a workflow that does
-- not exist. The right fix is to correct the column's MEANING so nobody builds
-- a refund screen against it later.
--
-- The column is NOT renamed. `deposit_amount` is read by
-- `backend/src/routes/admin.ts:314, :416, :512, :571, :581`,
-- `backend/src/routes/tenant.ts:52`, and by the frontend at
-- `frontend/src/lib/systemState.ts:57, :388` and
-- `frontend/src/views/TenantManagementView.vue:227, :415`. The frontend is
-- read-only for this work stream, so a rename would break it. A COMMENT carries
-- the correction into the data dictionary without touching a line of code.
--
-- OD-03 - RENT IS CHARGED WHOLE, NEVER PRORATED.
-- A tenant leaving on the 10th still owes the full month. Rent is not reduced to
-- the days occupied and nothing is handed back. Payment is collected in the last
-- days of the month for the month ahead, and late payment is not accepted.
--
-- DEFECT SURFACED BY THIS DECISION, recorded for Phase 3, NOT fixed here:
-- `backend/src/routes/admin.ts:571` defaults a missing deposit to
-- `current_price * 2` - the familiar "one month advance plus one month deposit"
-- arrangement. With no security deposit in this business, doubling the rent as a
-- default is not right. Correcting it changes money, so it belongs with the
-- billingService extraction and a look at the live rows, not in a comment.
--
-- Apply AFTER 001-008. Idempotent; safe to re-run. Comments only - no data or
-- structure is modified by this migration.
-- =============================================================================

BEGIN;

COMMENT ON COLUMN public.room_assignments.deposit_amount IS
  'ADVANCE RENT, not a refundable security deposit. Rent paid ahead of the '
  'period it covers. No separate damage or security deposit is collected by '
  'this business. Non-refundable: an unconsumed balance is not returned when '
  'the tenant leaves. Confirmed 2026-09-13 (OD-04). Do not build a refund or '
  'forfeiture workflow against this column. Historical note: the name is kept '
  'because backend and frontend both read it; only the meaning is corrected.';

COMMENT ON COLUMN public.bills.rent_amount IS
  'The WHOLE month rent. Never prorated. A tenant who vacates mid-period still '
  'owes the full amount and receives nothing back. Confirmed 2026-09-13 (OD-03).';

COMMENT ON COLUMN public.bills.billing_period_start IS
  'Start of the period billed. The period is always a whole month; a partial '
  'occupancy does not shorten it or reduce rent_amount (OD-03).';

COMMENT ON COLUMN public.bills.water_amount IS
  'Registered occupants x system_settings.water_rate_per_occupant (BR-002, '
  'BR-014). Linda units LF and LB are excluded from the per-occupant model and '
  'use their own fixed per-unit charges (BR-040). Currently hardcoded to '
  'occupants * 200 at backend/src/routes/admin.ts:910, :1103, :1243 - a known '
  'Phase 3 defect, not the intended design.';

COMMENT ON TABLE public.room_assignments IS
  'Tenancy of a room by a tenant. A tenant may hold an assignment without any '
  'portal login: profiles.email is nullable and credentials are optional '
  '(OD-09, migration 006).';

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 OK: advance-rent and whole-month-billing '
               'semantics recorded. No data or structure changed.';
END $$;

COMMIT;
