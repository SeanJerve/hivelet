/**
 * The one month the headline card on Monthly Income and Monthly Expenses is
 * for (Sean, 2026-10-02: "our feature explicitly said MONTHLY" - the dark card
 * is a month, and the year lives in the card beside it).
 *
 *   - A month picked in Filters: that month (of the picked year, or this year
 *     when "All years" is picked).
 *   - No month picked, this year or all years: this month, as the property
 *     counts it (lib/propertyDate.ts), or the latest month before it with
 *     entries when it has none yet (Sean, 2 Nov 2026: a card saying only "Not
 *     entered yet" for most of a month tells the owner nothing). The card's
 *     title names the month, so an earlier month never reads as this one.
 *   - No month picked, a past year: that year's last month with entries, or
 *     December when it has none.
 *
 * Income and expenses are entered separately, so the two screens can show
 * different months.
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
  /** This month, when it has nothing yet and the month above is an earlier one: "November 2026". */
  waitingFor: string | null;
}

/**
 * Names the month shown when it is not this one: the latest month with entries, "Latest recorded,
 * October". It said "From the previous month, October" (review of 4 Nov 2026), which Sean read as
 * money paid in that month (Sean, 7 Nov 2026: say plainly it is the latest month recorded).
 */
export function earlierMonthNote(f: FocusMonth): string {
  if (!f.waitingFor) return f.label;
  const year = f.waitingFor.split(' ')[1];
  // The year only when it is not the one waited for: it is at the top of the page (Sean, 5 Nov 2026).
  const named = Number(f.year) === Number(year) ? MONTH_LONG[f.month - 1] : f.label;
  return `Latest recorded, ${named}`;
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
  else if (year === thisYear) {
    const months = monthsWithEntries(year).filter((m) => m <= thisMonth);
    // All years, in a January with nothing entered yet: last year's last month, as above.
    if (!months.length && filterYear === 'All') {
      const lastYear = String(Number(thisYear) - 1);
      const earlier = monthsWithEntries(lastYear);
      if (earlier.length) {
        const m = Math.max(...earlier);
        return {
          year: lastYear,
          month: m,
          label: `${MONTH_LONG[m - 1]} ${lastYear}`,
          waitingFor: `${MONTH_LONG[thisMonth - 1]} ${thisYear}`,
        };
      }
    }
    month = months.length ? Math.max(...months) : thisMonth;
  } else {
    const months = monthsWithEntries(year);
    month = months.length ? Math.max(...months) : 12;
  }
  const waiting = picked < 0 && year === thisYear && month !== thisMonth;
  return {
    year,
    month,
    label: `${MONTH_LONG[month - 1]} ${year}`,
    waitingFor: waiting ? `${MONTH_LONG[thisMonth - 1]} ${thisYear}` : null,
  };
}
