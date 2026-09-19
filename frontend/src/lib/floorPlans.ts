/**
 * The floor plans, one picture per floor area, and where each unit sits on it.
 *
 * WHAT ARRIVED AND WHY IT IS NOT WHAT IS SERVED
 * ---------------------------------------------
 * Sean exported 33 SVGs, one per unit. Each one embedded the SAME floor plan
 * bitmap TWICE as base64 - once as a luminance mask, once as the drawn image -
 * with the unit code over it as outlined glyphs. Thirty-three files, ten
 * distinct pictures between them: 11.3 MB of file carrying 1.27 MB of artwork.
 *
 * Serving those as-is would have put 11.3 MB on the public site and, because
 * the precache glob sweeps every .svg in the build, all of it into the service
 * worker precache -
 * on a property whose visitors are on Philippine mobile data, and four days
 * after 471 KB of dead precache was removed for the same reason.
 *
 * So the artwork is written once per area and the label is real text placed
 * from the SVG's own translate(). A browser caches one plan across every unit
 * on that floor, so opening a second unit costs nothing, and the label scales,
 * can be read aloud, and is drawn in the brand colour rather than baked into a
 * bitmap.
 *
 * THE BITMAPS ARE INVERTED ON PURPOSE. They are RGB with a BLACK ground and
 * WHITE lines, which is why the SVG needed a filter chain to be legible at all.
 * `invert(1)` in CSS does the same job. Remove it and every plan goes black.
 *
 * `x` and `y` are percentages of the original 375x375 viewBox; `y` is the text
 * BASELINE, so the label is anchored bottom-left there. `null` means the area
 * holds one unit and needs no label - the caption already names it.
 */
export interface FloorPlan {
  /** File in /floorplans, without the extension. */
  plan: string;
  /** Percent across the plan, or null when the area holds a single unit. */
  x: number | null;
  /** Percent down the plan, at the label baseline. */
  y: number | null;
}

/** Intrinsic size of each plan, so the box is reserved before the bytes land. */
export const PLAN_SIZE: Record<string, { w: number; h: number }> = {
  '2ndfloor': { w: 1009, h: 1024 },
  '3rdfloor': { w: 1024, h: 1000 },
  'back1stfloor': { w: 1024, h: 842 },
  'back2ndfloor': { w: 1024, h: 855 },
  'back3rdfloor': { w: 1024, h: 858 },
  'front1stfloor': { w: 1024, h: 457 },
  'front2ndfloor': { w: 1024, h: 719 },
  'ground': { w: 1024, h: 994 },
  'linda': { w: 1024, h: 592 },
  'penthouse': { w: 1024, h: 767 },
};

/** Keyed by the unit code exactly as `rooms.room_number` holds it, upper-cased. */
export const FLOOR_PLANS: Record<string, FloorPlan> = {
  '1A': { plan: 'ground', x: 76.346, y: 86.616 },
  '1B': { plan: 'ground', x: 55.177, y: 63.661 },
  '1C': { plan: 'ground', x: 59.276, y: 41.343 },
  '1D': { plan: 'ground', x: 62.615, y: 17.369 },
  '1E': { plan: 'ground', x: 34.744, y: 13.686 },
  '1F': { plan: 'ground', x: 10.0, y: 15.067 },
  '1G': { plan: 'ground', x: 7.878, y: 37.563 },
  '1H': { plan: 'ground', x: 10.0, y: 62.82 },
  '2A': { plan: '2ndfloor', x: 74.932, y: 85.971 },
  '2B': { plan: '2ndfloor', x: 56.939, y: 63.774 },
  '2C': { plan: '2ndfloor', x: 60.651, y: 41.474 },
  '2D': { plan: '2ndfloor', x: 62.227, y: 17.863 },
  '2E': { plan: '2ndfloor', x: 33.324, y: 17.985 },
  '2F': { plan: '2ndfloor', x: 21.725, y: 34.79 },
  '2G': { plan: '2ndfloor', x: 15.849, y: 59.194 },
  '3A': { plan: '3rdfloor', x: 75.416, y: 86.274 },
  '3B': { plan: '3rdfloor', x: 54.725, y: 62.744 },
  '3C': { plan: '3rdfloor', x: 61.778, y: 42.435 },
  '3D': { plan: '3rdfloor', x: 62.488, y: 18.159 },
  '3E': { plan: '3rdfloor', x: 31.275, y: 18.051 },
  '3F': { plan: '3rdfloor', x: 19.43, y: 34.594 },
  '3G': { plan: '3rdfloor', x: 13.615, y: 58.684 },
  'B1F': { plan: 'back1stfloor', x: 60.795, y: 64.006 },
  'B2B': { plan: 'back2ndfloor', x: 27.29, y: 32.037 },
  'B2F': { plan: 'back2ndfloor', x: 53.76, y: 76.838 },
  'B3B': { plan: 'back3rdfloor', x: 31.392, y: 34.1 },
  'B3F': { plan: 'back3rdfloor', x: 63.215, y: 75.456 },
  'F1': { plan: 'front1stfloor', x: 35.212, y: 60.017 },
  'F2B': { plan: 'front2ndfloor', x: 73.718, y: 38.191 },
  'F2F': { plan: 'front2ndfloor', x: 29.897, y: 56.234 },
  'LB': { plan: 'linda', x: 24.438, y: 55.067 },
  'LF': { plan: 'linda', x: 73.537, y: 55.067 },
  'PH': { plan: 'penthouse', x: null, y: null },
};

/** The plan for a unit code, or null when there is none. */
export function planFor(unitCode: string): FloorPlan | null {
  return FLOOR_PLANS[(unitCode || '').toUpperCase()] ?? null;
}
