/**
 * @file lib/notRecorded.ts
 * @description The one wording for a value nobody has entered.
 *
 * Sean, 6 Nov 2026: the tenant dialog said "Not given yet", "Not recorded" and
 * "Nobody on file" side by side, and other screens said "Not entered", "Not on
 * file", "None" or a dash. "They look gibberish and not consistent and changing."
 * Every screen, dialog, cell and export now says "Not recorded" for a value that
 * was never entered: the screens show what is recorded, so a gap says it is not.
 * N/A is not right for this system.
 *
 * Words for a real state stay what they are ("Unassigned", "Vacant", "Nobody"
 * for an empty unit, "Not yet verified"): those are recorded facts, not gaps.
 *
 * The placeholder is drawn muted, in `NOT_RECORDED_CLASS`, so it never reads as
 * a value someone typed.
 */
export const NOT_RECORDED = 'Not recorded';

/** The one style for the placeholder, beside the incumbent text colour of a value. */
export const NOT_RECORDED_CLASS = 'text-ink-soft';

/** The data layer's old stand-ins for nothing: blank, a dash, or this wording itself. */
export function isNotRecorded(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim();
  return !v || v === '—' || v === '-' || v === NOT_RECORDED;
}

/** The value if one was entered, otherwise "Not recorded". */
export function recordedOr(value: string | null | undefined): string {
  return isNotRecorded(value) ? NOT_RECORDED : String(value).trim();
}
