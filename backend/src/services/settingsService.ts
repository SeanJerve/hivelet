/**
 * @file services/settingsService.ts
 * @description Typed, cached access to `public.system_settings`.
 * @businessRules  BR-012 (grace period), BR-014 (water fee), BR-035 (share divisor), BR-040 (Linda fixed billing)
 *
 * WHY THIS EXISTS
 * ---------------
 * `system_settings` holds six correctly seeded keys and was, until this file, read by
 * **zero lines of backend code** (defect 1). Every value it is supposed to supply was
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

/** Keys seeded in `system_settings`. Adding one here does not create it in the database. */
export const SETTING_KEYS = {
  WATER_RATE_PER_OCCUPANT: 'water_rate_per_occupant',
  GRACE_PERIOD_DAYS: 'grace_period_days',
  REVENUE_SHARE_PERCENT: 'revenue_share_percent',
  LINDA_LF_WATER: 'linda_lf_water_charge',
  LINDA_LB_WATER: 'linda_lb_water_charge',
  LINDA_LB_ELECTRICITY: 'linda_lb_electricity_charge'
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
 * Fixed monthly water charge for a Linda unit, by room number. BR-040.
 *
 * Both values are corroborated by the ledger: across 31 months `LF` is charged exactly
 * P400/month and `LB` exactly P200/month. Returns `null` for any other room, which means
 * "this unit is not on fixed water billing - use the per-occupant rate".
 *
 * There is deliberately **no electricity accessor**. `linda_lb_electricity_charge` names LB,
 * but the ledger charges electricity to `LF` in 31 of 31 months and to `LB` in none, and the
 * owner's own spreadsheet agrees with the ledger. Until the client resolves that (OD-18),
 * wiring it into billing would move money on a value known to be disputed.
 */
export async function getLindaFixedWaterCharge(roomNumber: string): Promise<number | null> {
  const code = (roomNumber || '').trim().toUpperCase();
  if (code === 'LF') return getNumericSetting(SETTING_KEYS.LINDA_LF_WATER, 400);
  if (code === 'LB') return getNumericSetting(SETTING_KEYS.LINDA_LB_WATER, 200);
  return null;
}
