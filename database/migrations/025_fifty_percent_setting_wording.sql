-- =============================================================================
-- Migration 025 — The Fifty Percent Setting Says What It Is
-- =============================================================================
-- @businessRules  BR-035 (50% Share Is Derived)
-- @supersedes     004_form_schema_gaps.sql §2 (the seeded label and description)
--
-- Two things wrong with one dormant row, found 17 Sep 2026.
--
-- WORDING. `system_settings.revenue_share_percent` carried the label
-- 'Revenue share percentage' and the description 'Share of gross rent recorded
-- on each monthly income entry.' Both name a PURPOSE for `fifty_percent_share`,
-- which BR-035 forbids as squarely as naming a party. Seeded by migration 004
-- and live in the database ever since.
--
-- `check:canon` was green over it. Its citation rule excuses a banned phrase
-- inside quotes, because in prose that is how you forbid one. In a `.sql` file
-- the quotes are string delimiters and the phrase is the value itself, so the
-- rule was excusing the live wording rather than catching it. Fixed in the same
-- commit: the citation rule is now code-aware.
--
-- ACCURACY. The row implies a configurable rate. There is no such thing.
-- `monthly_income_records.fifty_percent_share` is
-- `GENERATED ALWAYS AS (rent_amount / 2.0) STORED` — read from
-- `information_schema.columns`, not from a document. The divisor is in the
-- column definition and PostgreSQL applies it on write, so setting this row to
-- 60 would change nothing whatsoever.
--
-- Checked before writing this: no code path reads the key. Only the constant
-- NAME appears, in `settingsService.ts`; the value is never fetched, and there
-- is no settings endpoint or screen to edit it from.
--
-- The row is KEPT rather than deleted. It is live data, and a dormant row that
-- tells the truth is worth more than a gap somebody re-adds later with the old
-- wording. The key itself is left alone: `revenue_share_percent` is an
-- identifier rather than anything a person reads, and it is the primary key —
-- renaming it is a delete-and-reinsert on live data to no user-visible benefit.
--
-- Idempotent; safe to re-run. One row, no schema change, no data destroyed.
-- =============================================================================

UPDATE system_settings
   SET label = 'Fifty percent column (fixed — not configurable here)',
       description = 'A system-computed figure equal to half that row''s Rent Amount, kept for ledger parity with the owner''s historical spreadsheet. The divisor lives in the generated column monthly_income_records.fifty_percent_share and is never read from this row.'
 WHERE key = 'revenue_share_percent';

-- Verification (expect one row, with the new wording):
--   SELECT key, value, label, description FROM system_settings
--    WHERE key = 'revenue_share_percent';
