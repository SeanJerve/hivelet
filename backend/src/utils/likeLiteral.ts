/**
 * @file utils/likeLiteral.ts
 * @description Makes a value safe to pass as an ILIKE pattern that must match literally.
 *
 * `.ilike('email', value)` is a case-insensitive equality only when the value
 * holds no pattern characters. An email may legally contain `_`, and in ILIKE
 * `_` matches any single character: onboarding `a_b@example.com` found the
 * prospect `axb@example.com` and promoted that row - a different person -
 * into the new resident (2026-09-24 audit, reproduced). `%` is the same hazard
 * with a wider reach.
 *
 * Backslash is PostgreSQL's default LIKE escape, and it survives supabase-js and
 * PostgREST intact - checked read-only against the live profiles table: the
 * escaped pattern for a literal `_` matched 0 of 34 emails, the unescaped one 34.
 */
export function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
