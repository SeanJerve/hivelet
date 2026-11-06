import { ref } from 'vue';
import { api } from '@/lib/api';
import { propertyToday } from '@/lib/propertyDate';

/**
 * The years that still take records, as the server decides them (GET /admin/open-years): this year,
 * and last year while any of its December rent is unpaid (Sean, 6 Nov 2026: "keep the old year
 * open until all payments for December are done"). Until the answer arrives only this year is
 * open, so a closed year never shows an edit button it would then refuse.
 */
const THIS_YEAR = Number(propertyToday().slice(0, 4));
export const openYears = ref<number[]>([THIS_YEAR]);

let asked: Promise<void> | null = null;
export function fetchOpenYears(force = false): Promise<void> {
  if (asked && !force) return asked;
  asked = api
    .get<{ years: number[] }>('/admin/open-years')
    .then((r) => {
      if (Array.isArray(r?.years) && r.years.length) openYears.value = r.years.map(Number);
    })
    .catch(() => {
      // Keep this year only: the server refuses the rest anyway.
      asked = null;
    });
  return asked;
}

/** True when a record filed under this year can no longer be recorded, changed or voided. */
export function isClosedYear(year: number | string | null | undefined): boolean {
  const y = Number(year);
  return y > 0 && y < THIS_YEAR && !openYears.value.includes(y);
}
