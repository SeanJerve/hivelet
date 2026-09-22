/**
 * @file services/settingsService.ts
 * @description Typed, cached access to `public.system_settings`.
 * @businessRules  BR-012 (grace period), BR-014 (water fee), BR-035 (share divisor), BR-040 (Linda fixed billing)
 *
 * WHY THIS EXISTS
 * ---------------
 * `system_settings` was, until this file, read by **zero lines of backend code** (defect 1).
 * It holds five keys today - a sixth, `linda_lb_electricity_charge`, was retired by migration
 * `017`. Every value it is supposed to supply was
 * hardcoded somewhere else instead:
 *
 *   - the water rate as `occupants * 200`  (`admin.ts:910, 1103, 1243`, `tenant.ts:440`)
 *   - the share divisor as `rentAmount / 2` (`admin.ts:911, 1102`)
 *   - the grace period as 10 days          (`tenant.ts:453`)
 *
 * That last one disagreed with the seeded value of 7 AND with the business, which has no
 * grace period at all. A setting nobody reads is not configuration; it is documentation
 * that happens to live in a table. This service makes the table authoritative.
 *
 * CACHING
 * -------
 * Settings change rarely and are read on every billing calculation, so the whole table is
 * cached for a short TTL. The cache is intentionally small and dumb: one map, one expiry.
 * Call `invalidateSettingsCache()` after any write so an administrator's change takes
 * effect immediately rather than up to a TTL later.
 *
 * FALLBACKS
 * ---------
 * Every accessor takes a documented fallback used only when the key is missing or
 * unparseable. A fallback is a last resort, not a default: if one is ever used it means
 * the row was deleted, and the caller logs loudly rather than silently billing a guess.
 */
import { db } from '../config/db.js';

/**
 * Keys present in `system_settings`. Adding one here does not create it in the database.
 *
 * `linda_lb_electricity_charge` was removed by migration `017`. The flat charge it held was a
 * workaround for units with no electricity meter, not a rate belonging to a unit, and the client
 * confirmed on 2026-09-13 that unmetered electricity is out of scope for this system (OD-18).
 */
export const SETTING_KEYS = {
  WATER_RATE_PER_OCCUPANT: 'water_rate_per_occupant',
  GRACE_PERIOD_DAYS: 'grace_period_days',
  REVENUE_SHARE_PERCENT: 'revenue_share_percent',
  LINDA_LF_WATER: 'linda_lf_water_charge',
  LINDA_LB_WATER: 'linda_lb_water_charge'
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const CACHE_TTL_MS = 60_000;

let cache: Map<string, string> | null = null;
let cacheExpiresAt = 0;

/** Drops the cache. Call after any write to `system_settings`. */
export function invalidateSettingsCache(): void {
  cache = null;
  cacheExpiresAt = 0;
}

async function loadSettings(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now < cacheExpiresAt) return cache;

  const { data, error } = await db.from('system_settings').select('key, value');

  if (error) {
    // A settings read failing is not a reason to fail the request outright - the caller
    // has a documented fallback for every key - but it must not be silent either.
    console.error('[settingsService] failed to read system_settings:', error.message);
    return cache ?? new Map();
  }

  const next = new Map<string, string>();
  for (const row of data ?? []) {
    if (row?.key != null) next.set(String(row.key), String(row.value ?? ''));
  }

  cache = next;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return next;
}

/**
 * Reads a numeric setting. Returns `fallback` only if the key is absent or does not parse,
 * and says so on stderr when that happens - a silently-defaulted money value is exactly the
 * class of bug this service exists to remove.
 */
export async function getNumericSetting(key: SettingKey, fallback: number): Promise<number> {
  const settings = await loadSettings();
  const raw = settings.get(key);

  if (raw === undefined) {
    console.warn(`[settingsService] key "${key}" is missing; falling back to ${fallback}`);
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    console.warn(`[settingsService] key "${key}" is "${raw}", which is not a number; falling back to ${fallback}`);
    return fallback;
  }

  return parsed;
}

/**
 * Water charged per occupant per month. BR-014.
 * Seeded at 200. **Never hardcode this** - it is the single most duplicated magic number
 * in the codebase and the reason the rate cannot currently be changed without a deploy.
 */
export function getWaterRatePerOccupant(): Promise<number> {
  return getNumericSetting(SETTING_KEYS.WATER_RATE_PER_OCCUPANT, 200);
}

/**
 * Days of grace after `due_date` before a bill is overdue. BR-012.
 *
 * **This is 0.** The business does not accept late payment (OD-03, OD-16, confirmed
 * 2026-09-13); the 7 that was seeded here was introduced during the original build and was
 * never a rule. The accessor is kept rather than the value being inlined as zero, so that
 * if the owner ever does grant a grace window it is one settings row away, not a code change.
 */
export function getGracePeriodDays(): Promise<number> {
  return getNumericSetting(SETTING_KEYS.GRACE_PERIOD_DAYS, 0);
}

/**
 * The percentage used to compute `monthly_income_records.fifty_percent_share`. BR-035.
 *
 * Note that the column itself is `GENERATED ALWAYS AS (rent_amount / 2.0) STORED` in the
 * database, so this setting does **not** drive the stored figure and changing it will not
 * change any row. It is read only where a projection needs the same arithmetic before a row
 * exists. Describe the result only as a system-computed figure equal to half the row's Rent
 * Amount, retained for ledger parity with the historical spreadsheet.
 */
export function getRevenueSharePercent(): Promise<number> {
  return getNumericSetting(SETTING_KEYS.REVENUE_SHARE_PERCENT, 50);
}

/**
 * Identifies a Linda unit by room number. BR-040.
 *
 * ⚠ **READ THE NAME AS HISTORY, NOT AS BEHAVIOUR. The fixed water charge is RETIRED**, and
 * the only thing this function is still used for is the `!== null` test - see
 * `computeWaterFee` in `billingService.ts`, which discards the amount entirely and bills
 * `heads x rate` for every unit on the property, Linda units included.
 *
 * This docblock used to say the two values were "corroborated by the ledger: across 31
 * months LF is charged exactly P400/month and LB exactly P200/month", and that a `null`
 * meant "use the per-occupant rate" - implying a non-null meant do not. Both halves are now
 * wrong, and the second one inverts the actual behaviour. The ledger did agree, but it agreed
 * by **coincidence**: occupancy never changed across all 62 Linda rows, LB holding 1 person
 * and LF 2, so 1 x 200 and 2 x 200 reproduce the "fixed" figures exactly and no row in her
 * book could tell the two readings apart. The owner settled it on 2026-09-20 - a third person
 * in LF makes the water P600. `computeWaterFee` carries her words.
 *
 * Left in place rather than deleted because the *separation* of Linda's money is NOT retired:
 * `linda_water_charge` and migration 041's routing trigger still stand, and this is what tells
 * the caller which rows they apply to. The return value is a flag; the number it happens to
 * carry is not the charge and must not be treated as one.
 *
 * There is deliberately **no electricity accessor, and there will not be one.** The flat
 * electricity charge was retired by migration `017` (OD-18): it existed for units without
 * their own meter, and the client confirmed on 2026-09-13 that unmetered electricity will not
 * be recorded in this system. Historical figures remain in
 * `monthly_income_records.linda_electricity_charge` and are read-only - BR-040's fixed *water*
 * rule is the half that survives.
 */
export async function getLindaFixedWaterCharge(roomNumber: string): Promise<number | null> {
  const code = (roomNumber || '').trim().toUpperCase();
  if (code === 'LF') return getNumericSetting(SETTING_KEYS.LINDA_LF_WATER, 400);
  if (code === 'LB') return getNumericSetting(SETTING_KEYS.LINDA_LB_WATER, 200);
  return null;
}
