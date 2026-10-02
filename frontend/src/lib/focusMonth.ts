/**
 * The one month the headline card on Monthly Income and Monthly Expenses is
 * for (Sean, 2026-10-02: "our feature explicitly said MONTHLY" - the dark card
 * is a month, and the year lives in the card beside it).
 *
 *   - A month picked in Filters: that month (of the picked year, or this year
 *     when "All years" is picked).
 *   - No month picked, this year or all years: this month, as the property
 *     counts it (lib/propertyDate.ts). A month just begun can be P0 so far;
 *     that is what has been entered, and the card says which month it is.
 *   - No month picked, a past year: that year's last month with entries, or
 *     December when it has none.
 *
 * Both screens call this, so they always show the same month.
 */
import { propertyToday } from '@/lib/propertyDate';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface FocusMonth {
  year: string;
  /** 1 to 12. */
  month: number;
  /** "October 2026". */
  label: string;
}

/**
 * @param filterYear  the Year filter: "2026" or "All"
 * @param filterMonth the Month filter: "Oct" or "All"
 * @param monthsWithEntries the months (1-12) that hold entries in a given year
 */
export function focusMonth(
  filterYear: string,
  filterMonth: string,
  monthsWithEntries: (year: string) => number[]
): FocusMonth {
  const today = propertyToday();
  const thisYear = today.slice(0, 4);
  const thisMonth = Number(today.slice(5, 7));

  const year = filterYear === 'All' ? thisYear : filterYear;
  let month: number;
  const picked = MONTH_SHORT.indexOf(filterMonth as (typeof MONTH_SHORT)[number]);
  if (picked >= 0) month = picked + 1;
  else if (year === thisYear) month = thisMonth;
  else {
    const months = monthsWithEntries(year);
    month = months.length ? Math.max(...months) : 12;
  }
  return { year, month, label: `${MONTH_LONG[month - 1]} ${year}` };
}
