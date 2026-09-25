/**
 * @file lib/unitCategories.ts
 * @description The four kinds of unit the property has, the slug each one
 *              answers to, and the mark that stands for it on the landing page.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model
 *
 * THESE ARE THE UNIT'S OWN `room_type`, AND THEY USED NOT TO BE
 * -------------------------------------------------------------
 * The list, the slugs and the copy below are `CategoryRoomsView`'s, corrected
 * on 2026-09-18 by `e1d6e68` and moved here unchanged. That commit is worth
 * reading; the short version is that the site offered three categories -
 * 1-Bedroom, 2-Bedroom, 3-Bedroom / Penthouse - and sorted units into them by
 * THE FIRST CHARACTER OF THE UNIT CODE, which is the floor. `2A` is room A on
 * floor two, and the page called it a two-bedroom. What the live database
 * holds, checked rather than inferred:
 *
 *     Studio          x20   1a-1h, 2b-2g, 3b-3g
 *     One-bedroom      x8   2a, 3a, B1F, B2B, B2F, F1, LB, LF
 *     Two-bedroom      x4   B3B, B3F, F2B, F2F
 *     Three-bedroom    x1   PH
 *
 * Twenty of the thirty-three are studios and the site had no studio category at
 * all.
 *
 * WHY IT IS A MODULE RATHER THAN A CONST INSIDE ONE VIEW
 * ------------------------------------------------------
 * Because the correction reached one of the two screens that categorise units.
 * `CategoryRoomsView` was fixed; `PublicGuestView`'s plates kept their own copy
 * of the old three, so from 2026-09-18 the landing page advertised a plate
 * headed "1-Bedroom Unit" with a count of ten beside it, over a link to a page
 * listing the eight real one-bedrooms - and not one of that ten was among them.
 * The plate promised a set the page behind it did not show.
 *
 * One copy, read by both. Same reason `publicStatusLabel` lives in
 * `canonicalUnits.ts`: it was found wrong in two copies of one switch.
 *
 * `key` is the exact `room_type` string, so a caller groups by it directly -
 * `rooms.filter(r => r.type === c.key)` - with no mapping table in between.
 * That is also the trap: change a `key` here and it must change in the
 * database, not just in this file.
 */
import type { Component } from 'vue';
import { BedSingle, BedDouble, Building2, Hotel } from 'lucide-vue-next';

/** The `room_type` values `rooms.room_type` actually holds. */
export type CategoryKey = 'Studio' | 'One-bedroom' | 'Two-bedroom' | 'Three-bedroom';

export interface UnitCategory {
  /** The unit's own `room_type`. Group on this. */
  key: CategoryKey;
  /** What appears in the address bar. */
  slug: string;
  title: string;
  blurb: string;
  /**
   * The mark drawn in the landing plate's frame. No room photography exists in
   * this repository, so the plates are tonal frames with a mark in them; the
   * category page shows units rather than categories and does not use this.
   */
  icon: Component;
}

/**
 * In the order someone shopping would meet them: smallest first.
 *
 * The copy is the owner's plain register, not estate-agent wording, and it
 * says only what the system knows: the submetering is real, and no amenity
 * is promised because the system stores no amenity list per unit.
 *
 * The one-bedroom blurb used to add "The two Linda units are here too, and
 * they are billed a fixed charge for water" (asked to trim, 2026-09-24). It
 * was not only more than a prospect needs; it was no longer true. BR-040's
 * fixed charge was retired by the owner on 2026-09-20 (`computeWaterFee`,
 * backend/src/services/billingService.ts): Linda's units are 200 a head like
 * every other, and only where that money is remitted differs. An earlier
 * version of this comment said the unit card showed the "true" fixed figure
 * instead; that card was repeating the same retired rule, and now quotes the
 * one per-person rate for every unit.
 */
export const CATEGORIES: UnitCategory[] = [
  {
    key: 'Studio',
    slug: 'studio',
    title: 'Studio',
    // Not "1st Floor": the studios are on floors 1 to 3 (see the table above).
    blurb: 'One room with its own bathroom and cabinets.',
    icon: BedSingle,
  },
  {
    key: 'One-bedroom',
    slug: 'one-bedroom',
    title: 'One-bedroom',
    blurb:
      'A separate bedroom, in the boarding house and in the apartments beside it.',
    icon: BedDouble,
  },
  {
    key: 'Two-bedroom',
    slug: 'two-bedroom',
    title: 'Two-bedroom',
    blurb: 'The larger apartments at the back and front, with a kitchenette and room to park.',
    icon: Building2,
  },
  {
    key: 'Three-bedroom',
    slug: 'three-bedroom',
    title: 'Three-bedroom',
    blurb: 'The penthouse on the top floor, with the roof deck and the view over Legazpi.',
    icon: Hotel,
  },
];

/**
 * Accepts the old addresses as well as the new ones.
 *
 * `1-bedroom`, `2-bedroom` and `3-bedroom` were the category page's slugs until
 * the categories were corrected. They were linked from the landing page and may
 * sit in somebody's history, so they resolve to the category of that name
 * rather than 404 - which also means the old link now lands on units that
 * really are that kind, which it did not before.
 */
export function resolveSlug(slugOrKey: string | null | undefined): CategoryKey {
  const s = (slugOrKey ?? '').toLowerCase();
  const direct = CATEGORIES.find((c) => c.slug === s || c.key.toLowerCase() === s);
  if (direct) return direct.key;

  if (s === '1-bedroom' || s === '1br' || s === '1') return 'One-bedroom';
  if (s === '2-bedroom' || s === '2br' || s === '2') return 'Two-bedroom';
  if (s === '3-bedroom' || s === '3br' || s === '3' || s === 'ph' || s === 'penthouse') {
    return 'Three-bedroom';
  }
  return 'Studio';
}
