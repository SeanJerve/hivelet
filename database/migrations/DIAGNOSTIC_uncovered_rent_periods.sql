-- DIAGNOSTIC ONLY. READ-ONLY. NOTHING HERE WRITES.
--
-- Month-sized holes in a CURRENT tenant's paid rent periods: a stretch of 28
-- days or more, inside the last 12 months, that no verified, unvoided receipt of
-- theirs covers, with receipts of THEIRS on both sides of it.
--
-- WHY THIS EXISTS (BLOCKED_FOR_SEAN.md B-72, docs/FINAL_REVIEW.md F7)
-- ---------------------------------------------------------------------------
-- A tenant's standing (`readStanding`) starts counting from the day after their
-- LATEST recorded period. A month skipped before that - July paid, August not,
-- September paid - never shows as owed, on the portal or at checkout.
--
-- Standing was deliberately NOT changed to find the earliest hole instead.
-- Measured against her source spreadsheet on 2026-09-26: once year-boundary
-- formatting is accounted for, her own book still holds holes like this with the
-- same tenant on both sides (in 2026, unit 3d mid-May to mid-June, and unit 2f
-- November to February), alongside holes that are formatting noise. Whether each
-- one is an unpaid month or a payment written down elsewhere is a fact only the
-- owner has. Turning them into debts on tenants' screens the week of the defense
-- would state as fact something the data cannot prove.
--
-- So the holes go to HER, as a list, and she decides each one. If a month is
-- owed, recording its receipt when paid closes the hole; if it was paid and
-- written elsewhere, a corrected receipt closes it.
--
-- Run with:  psql "$DATABASE_URL" -f database/migrations/DIAGNOSTIC_uncovered_rent_periods.sql
-- or paste the SELECT into the Supabase SQL editor.

WITH receipts AS (
  SELECT
    mir.tenant_profile_id,
    mir.room_id,
    mir.rent_period_start,
    mir.rent_period_end,
    -- The furthest any EARLIER receipt of this tenant's reached. A running max,
    -- not the previous row, so overlapping and out-of-order periods do not
    -- invent holes.
    max(mir.rent_period_end) OVER (
      PARTITION BY mir.tenant_profile_id
      ORDER BY mir.rent_period_start, mir.rent_period_end
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS covered_through
  FROM monthly_income_records mir
  WHERE mir.voided_at IS NULL
    AND mir.verification_status = 'Verified'
    AND mir.tenant_profile_id IS NOT NULL
)
SELECT
  p.full_name                                  AS tenant,
  rm.room_number                               AS unit_now,
  r.covered_through + 1                        AS uncovered_from,
  r.rent_period_start - 1                      AS uncovered_to,
  r.rent_period_start - r.covered_through - 1  AS days_uncovered
FROM receipts r
JOIN room_assignments ra
  ON ra.tenant_profile_id = r.tenant_profile_id AND ra.is_active
JOIN profiles p  ON p.id  = r.tenant_profile_id
JOIN rooms    rm ON rm.id = ra.room_id
WHERE r.covered_through IS NOT NULL
  AND r.rent_period_start - r.covered_through - 1 >= 28
  AND r.rent_period_start >= current_date - 365
  -- No filter on the tenancy's start_date. A hole is only ever found BETWEEN two
  -- receipts credited to the same tenant, which already shows they lived there
  -- on both sides. And start dates are not reliable: in 1a the current tenancy
  -- is dated 2026-07-01 though she has paid since 2024 (B-73). The first version
  -- filtered on it and returned nothing on the live data, 2026-09-26, hiding the
  -- holes her spreadsheet shows.
ORDER BY rm.room_number, uncovered_from;
