<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { propertyToday } from '@/lib/propertyDate';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { expenseRecords, expenseRecordsFetchFailed, fetchExpenseRecords, EXPENSE_CATEGORIES, PROPERTY_AREA_OPTIONS, showToast, type ExpenseRecord, type PropertyArea } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api, failureTitle, isUnconfirmed } from '@/lib/api';
import { writesUnavailable } from '@/lib/offlineCache';
import { afterArrival } from '@/lib/afterArrival';
import DownloadDialog from '@/components/ui/DownloadDialog.vue';
import { pickedYear } from '@/lib/yearScope';
import { Plus, X, Loader2, FileSpreadsheet, Pencil, Trash2, ChevronDown } from 'lucide-vue-next';
import { orderOptions, type RowOrder } from '@/lib/rowOrder';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import { focusMonth, MONTH_SHORT } from '@/lib/focusMonth';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import ListToolbar from '@/components/ui/ListToolbar.vue';
import type { FilterDraft, ToolbarFilter } from '@/components/ui/listToolbar';

interface ApiExpense {
  id: string;
  expense_date: string;
  invoice_supplier: string;
  category_code: string;
  total_expenses: number;
  expense_property_allocations?: { property_area: string; amount: number }[];
}

interface ApiCat {
  code: string;
  name: string;
  display_order: number;
}

interface FormExpenseAllocation {
  area: PropertyArea | '';
  amount: string;
}

interface FormExpenseEntry {
  desc: string;
  category: string;
  allocations: FormExpenseAllocation[];
}

const q = ref('');
const selectedCategory = ref('All');
const isAddOpen = ref(false);
const route = useRoute();
const router = useRouter();
const isLoading = ref(false);
const isSubmitting = ref(false);
const dbCategories = ref<ApiCat[]>([]);

/**
 * The categories the LEDGER actually uses, from `/admin/expense-categories`.
 *
 * `EXPENSE_CATEGORIES` is a hardcoded list of ten and the database holds
 * thirteen, spelled differently: "Taxes and Licenses" against "Taxes &
 * Licenses", "Communication, Light, and Water" against "Utilities",
 * "Janitorial and Messengerial Services" against "Janitorial" - and `6a`
 * PhilHealth, `6b` SSS and `6c` Allowances are not in it at all.
 *
 * That matters because `e.category` is built from the DATABASE name
 * (`systemState.ts`, `${code} — ${fixed_expense_categories.name}`) and the
 * filter compares it by strict equality. So picking "8 — Repairs &
 * Maintenance" matched **0 of 623 rows** and the screen said "Nothing here",
 * and the edit dialog's `required` select had no option equal to the row it was
 * editing, so native validation refused to save until the entry was
 * re-categorised into something else.
 *
 * Counted against the live ledger: **927 of 1,262 entries, ₱3,732,563**, could
 * not be filtered or edited without being moved.
 *
 * `dbCategories` was already being fetched and never read. Building the options
 * from it makes the picker's values identical to the rows' values by
 * construction, which is the only way these two stay in step.
 */
const categoryOptions = computed<string[]>(() => {
  if (dbCategories.value.length > 0) {
    return [...dbCategories.value]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((c) => `${c.code} — ${c.name}`);
  }

  /**
   * The categories the rows on screen actually carry, when the lookup could not
   * be read.
   *
   * `/admin/expense-categories` is fetched with `.catch(() => [])`, so a refused
   * or broken call left `dbCategories` empty and this fell back to
   * `EXPENSE_CATEGORIES` - the hardcoded list of ten that does not match the
   * database's thirteen. That is precisely the mismatch this computed was added
   * to remove: the filter compares `e.category` by strict equality, so the
   * fallback silently reinstates the defect where **927 of 1,262 entries could
   * not be filtered or edited without being re-categorised**.
   *
   * The rows are built from the database's own names, so deriving the options
   * from them gives a picker that can always represent what is on screen, which
   * is the property that matters. The hardcoded list is now only reached when
   * there are no rows either, where nothing can be wrong about it.
   */
  const fromRows = [...new Set(expenseRecords.map((e) => e.category).filter(Boolean))];
  if (fromRows.length === 0) return [...EXPENSE_CATEGORIES];

  // '1', '2', ... '6a', '6b', '6c', ... '10' - numeric part first, then the suffix.
  const key = (c: string): [number, string] => {
    const code = c.split(' —')[0]?.trim() ?? '';
    const digits = code.match(/^\d+/)?.[0] ?? '';
    return [digits ? Number(digits) : Number.MAX_SAFE_INTEGER, code.slice(digits.length)];
  };
  return fromRows.sort((a, b) => {
    const [an, as_] = key(a);
    const [bn, bs] = key(b);
    return an - bn || as_.localeCompare(bs);
  });
});

/** The first option, whichever list is in force. */
const defaultCategory = () => categoryOptions.value[0] ?? EXPENSE_CATEGORIES[0];

// Filter selectors
const filterMonth = ref('All');
/**
 * This year by default, as on Monthly Income (Sean, 2026-10-02): opened on
 * "All years", "Spent" added every expense since 2024 - ₱6,057,831 against the
 * anonymised copy of her ledger - which is not the figure she opens this page
 * for. "All years" stays one choice away in Filters, and the period is named
 * in each tile's title. The property's year (lib/propertyDate.ts).
 */
const THIS_YEAR = propertyToday().slice(0, 4);
const filterYear = ref(THIS_YEAR);

/**
 * The Monthly Expenses Report as a real spreadsheet. BR-049.
 *
 * The CSV beside this one is a flat dump. This is her layout: a month block per
 * month, the Property Area columns totalled at the bottom, the category summary
 * down the right with a running cumulative, and a line stating whether the two
 * sides reconcile - which is BR-047, and the check she does by eye today.
 *
 * Fetched rather than linked, because the endpoint needs the bearer token.
 */
//
// The button opens the Download dialog (Sean, 2026-10-02): one month, one
// year, or everything, opening on the month and year the filters show - this
// year when they show every year, the file one press always gave.
// The property's year, not the viewer's (lib/propertyDate.ts).
const exportYear = computed(() => (filterYear.value !== 'All' ? filterYear.value : propertyToday().slice(0, 4)));
const exportMonth = computed(() => {
  const i = monthsList.findIndex((m) => m.val === filterMonth.value);
  return i > 0 ? i : null;
});
const exportYears = computed(() => yearsList.value.filter((y) => y !== 'All').map(Number));
const isDownloadOpen = ref(false);

const monthsList = [
  { val: 'All', label: 'All Months' },
  { val: 'Jan', label: 'January' },
  { val: 'Feb', label: 'February' },
  { val: 'Mar', label: 'March' },
  { val: 'Apr', label: 'April' },
  { val: 'May', label: 'May' },
  { val: 'Jun', label: 'June' },
  { val: 'Jul', label: 'July' },
  { val: 'Aug', label: 'August' },
  { val: 'Sep', label: 'September' },
  { val: 'Oct', label: 'October' },
  { val: 'Nov', label: 'November' },
  { val: 'Dec', label: 'December' },
];

// From the ledger, like the income screen: a fixed list would stop offering
// the new year every January. `e.date` is the display string, "Sep 19, 2026".
const yearsList = computed(() => {
  const years = new Set<string>();
  for (const e of expenseRecords) {
    const y = e.date.split(' ')[2];
    if (y) years.add(y);
  }
  years.add(propertyToday().slice(0, 4));
  return ['All', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
});

const expenseCategoryOptions = computed(() => [
  { value: 'All', label: 'All kinds' },
  ...categoryOptions.value.map((c) => ({ value: c, label: c })),
]);

const yearOptions = computed(() =>
  yearsList.value.map((y) => ({
    value: y,
    label: y === 'All' ? 'All years' : y,
  }))
);

// The year picked on another money page, as on the income screen (`followPickedYear` there).
function followPickedYear() {
  const year = pickedYear.value;
  if (year && yearsList.value.includes(year)) filterYear.value = year;
}
followPickedYear();
watch(isLoading, (loading) => {
  if (!loading) followPickedYear();
});
watch(filterYear, (year) => {
  pickedYear.value = year;
}, { flush: 'sync' });

/** The toolbar's filters (components/ui/ListToolbar.vue); the refs above stay the state. */
const expenseFilters = computed<ToolbarFilter[]>(() => [
  { key: 'kind', label: 'Kind of expense', value: selectedCategory.value, defaultValue: 'All', options: expenseCategoryOptions.value },
  { key: 'month', label: 'Month', value: filterMonth.value, defaultValue: 'All', options: monthsList },
  // Default this year (above): Reset and Clear come back to it.
  { key: 'year', label: 'Year', value: filterYear.value, defaultValue: THIS_YEAR, options: yearOptions.value },
  { key: 'order', label: 'Order', value: expenseOrder.value, defaultValue: 'newest', options: orderOptions(['newest', 'oldest']) },
]);
function applyExpenseFilters(v: FilterDraft) {
  selectedCategory.value = String(v.kind);
  filterMonth.value = String(v.month);
  filterYear.value = String(v.year);
  expenseOrder.value = v.order as RowOrder;
}

// New Expense Form Entries (At least one default entry)
// The property's today, not UTC's - see lib/propertyDate.
const date = ref(propertyToday());
const formEntries = ref<FormExpenseEntry[]>([
  {
    desc: '',
    category: defaultCategory(),
    allocations: [
      { area: 'Boarding House', amount: '' }
    ]
  }
]);

function addFormEntry() {
  formEntries.value.push({
    desc: '',
    category: defaultCategory(),
    allocations: [
      { area: 'Boarding House', amount: '' }
    ]
  });
}

function removeFormEntry(index: number) {
  if (formEntries.value.length > 1) {
    formEntries.value.splice(index, 1);
  }
}

/**
 * One amount per area per expense: `expense_property_allocations` is UNIQUE on
 * (expense_entry_id, property_area) in the live database. "Split across another
 * area" added its row on Boarding House, the same area as the first, so a split
 * typed without changing the area failed on save - on create as "could not be
 * recorded" with no reason, on edit as a server error naming the constraint.
 * Found running test case A-28 in the harness, 2026-09-30.
 *
 * The new part now starts with no area, so she chooses one. Defaulting it to
 * the next unused area was tried first and rejected: that is Main House
 * (personal), and an amount she did not look at would be filed as personal
 * spending, off the operating costs, with nothing failing.
 */
function areaProblem(allocs: { area: PropertyArea | '' }[]): string | null {
  if (allocs.some((a) => !a.area)) return 'Choose which part of the property each amount is for.';
  const areas = allocs.map((a) => a.area);
  const repeated = areas.find((a, i) => areas.indexOf(a) !== i);
  if (!repeated) return null;
  const label = PROPERTY_AREA_OPTIONS.find((o) => o.value === repeated)?.label ?? repeated;
  return `${label} is given twice. Each area takes one amount: add the two parts together, or choose another area.`;
}

function addAllocation(entryIndex: number) {
  formEntries.value[entryIndex].allocations.push({
    area: '',
    amount: ''
  });
}

function removeAllocation(entryIndex: number, allocIndex: number) {
  const entry = formEntries.value[entryIndex];
  if (entry.allocations.length > 1) {
    entry.allocations.splice(allocIndex, 1);
  }
}


// Convert DB code to frontend category string
function getFrontendCategory(code: string): string {
  // `6a`, `6b` and `6c` are their own categories - PhilHealth, SSS and
  // Allowances, 46 entries between them. This collapsed every code beginning
  // with 6 into plain `6`, so re-saving one of those rows moved its money into
  // Salaries.
  const match = categoryOptions.value.find((c) => c.startsWith(`${code} —`));
  return match || categoryOptions.value.find((c) => c.startsWith('10 —')) || '10 — Others';
}

// Convert frontend category string to DB code
function getDbCategoryCode(catStr: string): string {
  const code = catStr.split(' —')[0]?.trim();
  return code || '10';
}

// "MMM D, YYYY", the string the fetched rows carry, so a just-saved entry joins its day
function formatDateForDisplay(dateVal: string | Date): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate());
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

async function fetchExpenses() {
  isLoading.value = true;
  try {
    const [, catData] = await Promise.all([
      fetchExpenseRecords(),
      api.get<ApiCat[]>('/admin/expense-categories').catch(() => [])
    ]);

    if (catData && catData.length) {
      dbCategories.value = catData;
    }
  } catch (err) {
    console.error('fetchExpenses failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  const loading = fetchExpenses();
  if (route.query.openExpense === '1') {
    const nextQuery = { ...route.query };
    delete nextQuery.openExpense;
    router.replace({ query: nextQuery });
    // The ledger arrives first, then the dialog (lib/afterArrival.ts).
    afterArrival(loading).then(() => {
      isAddOpen.value = true;
    });
  }
});

/** Search and Kind, without the period: shared by the ledger and the month card. */
function matchesSearchAndKind(e: ExpenseRecord): boolean {
  const query = q.value.toLowerCase().trim();
  const matchesQ =
    !query ||
    e.description.toLowerCase().includes(query) ||
    e.category.toLowerCase().includes(query);
  return matchesQ && (selectedCategory.value === 'All' || e.category === selectedCategory.value);
}

const filtered = computed(() => {
  return expenseRecords.filter((e) => {
    const matchesQAndCat = matchesSearchAndKind(e);

    const dateParts = e.date.split(' ');
    const monthPart = dateParts[0]; 
    const yearPart = dateParts[2];  

    const matchesMonth = filterMonth.value === 'All' || monthPart === filterMonth.value;
    const matchesYear = filterYear.value === 'All' || yearPart === filterYear.value;

    return matchesQAndCat && matchesMonth && matchesYear;
  });
});

const expenseOrder = ref<RowOrder>('newest');
// Group filtered expenses by Date
const groupedExpenses = computed(() => {
  const groups: Record<string, ExpenseRecord[]> = {};
  
  filtered.value.forEach((e) => {
    const key = e.date;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(e);
  });
  
  return Object.entries(groups).map(([dateStr, records]) => {
    const dayTotal = records.reduce((sum, r) => sum + getExpenseTotal(r), 0);
    const dateObj = new Date(dateStr);
    return {
      dateStr,
      dateObj,
      records,
      dayTotal
    };
  }).sort((a, b) =>
    // Filters > Order (Sean, 2026-10-02, every list). Expenses have no unit or tenant, so by date.
    expenseOrder.value === 'oldest' ? a.dateObj.getTime() - b.dateObj.getTime() : b.dateObj.getTime() - a.dateObj.getTime()
  );
});

const totalJuly = computed(() =>
  filtered.value.reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

/** The period in the year card's title, "2026" / "September 2026" / "all years" - Monthly Income's `periodWord`. */
const periodWord = computed(() => {
  const m = filterMonth.value === 'All' ? '' : (monthsList.find((x) => x.val === filterMonth.value)?.label ?? '');
  if (filterYear.value === 'All') return m ? `${m}, every year` : 'all years';
  return m ? `${m} ${filterYear.value}` : filterYear.value;
});

/**
 * The headline card is one month (Sean, 2026-10-02: the screen is MONTHLY
 * Expenses; the year is the card beside it). Which month: lib/focusMonth.ts.
 * The sentence that used to sit above the cards ("These figures are for all of
 * 2026: every area, personal spending included") is gone: each card's title
 * names its period, and nobody reads a sentence about the figures.
 */
const focus = computed(() =>
  focusMonth(filterYear.value, filterMonth.value, (year) => [
    ...new Set(
      expenseRecords
        .filter((e) => e.date.split(' ')[2] === year)
        .map((e) => MONTH_SHORT.indexOf(e.date.split(' ')[0] as (typeof MONTH_SHORT)[number]) + 1)
        .filter((m) => m > 0)
    ),
  ])
);
const monthEntries = computed(() =>
  expenseRecords.filter((e) => {
    const [mon, , yr] = e.date.split(' ');
    return matchesSearchAndKind(e) && yr === focus.value.year && mon === MONTH_SHORT[focus.value.month - 1];
  })
);
const sumOf = (list: ExpenseRecord[]) => list.reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0);
const isUtility = (e: ExpenseRecord) => /water|light|util/i.test(e.category);
const isRepairOrCleaning = (e: ExpenseRecord) => /repair|janitorial|suppl/i.test(e.category);
const monthTotal = computed(() => sumOf(monthEntries.value));
const monthUtilities = computed(() => sumOf(monthEntries.value.filter(isUtility)));
const monthRepairs = computed(() => sumOf(monthEntries.value.filter(isRepairOrCleaning)));

/**
 * Where the filtered money actually went. Every entry is allocated across the
 * SIX property areas (BR-044), and those allocations add up to the entry's
 * face value, so this is a true part-to-whole and can be drawn as one bar.
 *
 * Five until migration 012 added the Penthouse - OD-15, because it is a single
 * large unit whose costs were previously folded in elsewhere or lost. Six in
 * `property_area_type` and six in `backend/src/config/propertyAreas.ts`, checked
 * against the live enum rather than the schema file.
 */
const areaSplit = computed(() => {
  const totals = new Map<string, number>();
  for (const e of filtered.value) {
    for (const s of e.splits) {
      totals.set(s.area, (totals.get(s.area) ?? 0) + s.amount);
    }
  }
  const tones = ['brand', 'bright', 'night', 'soft', 'hatch', 'faint'] as const;
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
});

function getExpenseTotal(e: ExpenseRecord) {
  return e.splits.reduce((s, x) => s + x.amount, 0);
}

function submitAddExpense() {
  const invalid = formEntries.value.some(entry => {
    if (!entry.desc.trim()) return true;
    return entry.allocations.some(a => !a.amount || Number(a.amount) <= 0);
  });
  if (invalid) {
    showToast('error', 'Missing details', 'Each expense needs what it was for and an amount above zero.');
    return;
  }
  for (const entry of formEntries.value) {
    const problem = areaProblem(entry.allocations);
    if (problem) {
      showToast('error', 'Check the areas', `"${entry.desc.trim()}": ${problem}`);
      return;
    }
  }

  const n = formEntries.value.length;
  const confirmMsg = n === 1
    ? `Record this expense entry for ${formatDateForDisplay(date.value)}?`
    : `Record these ${n} expense entries for ${formatDateForDisplay(date.value)}?`;
  showConfirm(
    n === 1 ? 'Record expense entry' : 'Record expense entries',
    confirmMsg,
    async () => {
      isSubmitting.value = true;
      // The rows as they were sent. `results[i]` pairs with `submitted[i]`,
      // not with whatever the form holds by the time the POSTs come back.
      const submitted = formEntries.value.slice();
      try {

        /**
         * Every entry must reach the ledger, and the ones that did not must be
         * named.
         *
         * Each POST used to be wrapped in its own catch that logged "API save
         * failed, relying on local sync" and carried on. All the entries were
         * then pushed into local state under fabricated ids
         * (`EXP-NEW-<timestamp>-<n>`) and a toast reported "Successfully saved N
         * entries" - N being the number typed, not the number saved. Expenses
         * that never reached the database sat on screen looking recorded until
         * the next refresh silently removed them.
         */
        const results = await Promise.allSettled(
          submitted.map((entry) =>
            api.post('/admin/expense-entries', {
              expenseDate: date.value,
              invoiceSupplier: entry.desc.trim(),
              categoryCode: getDbCategoryCode(entry.category),
              allocations: entry.allocations.map(a => ({
                propertyArea: a.area,
                amount: Number(a.amount) || 0
              }))
            })
          )
        );

        const failed = results
          .map((r, i) => (r.status === 'rejected' ? submitted[i].desc.trim() || `entry ${i + 1}` : null))
          .filter((x): x is string => x !== null);

        const count = results.length - failed.length;

        // A timed-out entry may already be in the ledger (`isUnconfirmed`), so
        // "Save again sends just these" would write it twice.
        const unconfirmed = results.filter((r) => r.status === 'rejected' && isUnconfirmed(r.reason)).length;

        if (failed.length > 0) {
          showToast(
            'error',
            unconfirmed > 0 ? 'Not confirmed' : count > 0 ? 'Some expenses were not saved' : 'Expenses not saved',
            unconfirmed > 0
              ? `${failed.length} of ${results.length} could not be confirmed: ${failed.join(', ')}. ` +
                'The server took too long to answer, so ' +
                (failed.length === 1
                  ? 'it may already be saved. It is still in the form: check the ledger before saving it again.'
                  : 'they may already be saved. They are still in the form: check the ledger before saving them again.')
              : `${failed.length} of ${results.length} could not be recorded: ${failed.join(', ')}. ` +
                (count > 0
                  ? 'Only those are left in the form. The others are saved, so Save again sends just these.'
                  : 'They are still in the form. Please try again.')
          );
        }

        if (count === 0) {
          // Fetched again so the ledger she is told to check shows anything that did land.
          if (unconfirmed > 0) await fetchExpenseRecords();
          return;
        }

        /**
         * The id the LEDGER gave this row, not one made up here.
         *
         * This wrote `EXP-NEW-<timestamp>-<n>` and the comment beneath it said
         * "the refetch below replaces these rows with the server's own, ids
         * included". **There was no refetch below** - a precondition asserted
         * in a comment and never true, which is the shape the judgement log
         * keeps recording.
         *
         * The consequence was a second entry in the owner's book. The edit
         * dialog routes anything whose id starts `EXP-` to POST rather than
         * PATCH, so: add an expense, notice a typo, edit it, save - and the
         * ledger holds it twice, under a toast reading "Expense updated".
         *
         * Both halves fixed: the real id is taken from the response, and the
         * refetch the comment promised now happens.
         */
        const serverId = (r: PromiseSettledResult<any>, fallbackIdx: number): string => {
          const v = r.status === 'fulfilled' ? (r.value as any) : null;
          return v?.data?.id ?? v?.id ?? `EXP-NEW-${Date.now()}-${fallbackIdx}`;
        };

        // Only what the ledger accepted.
        submitted.forEach((entry, idx) => {
          if (results[idx].status !== 'fulfilled') return;
          const newEntry: ExpenseRecord = {
            id: serverId(results[idx], idx),
            date: formatDateForDisplay(date.value),
            description: entry.desc.trim(),
            category: entry.category,
            splits: entry.allocations.map(a => ({
              area: a.area as PropertyArea,
              amount: Number(a.amount) || 0
            })),
          };
          expenseRecords.unshift(newEntry);
        });

        /**
         * Keep only the rows the ledger refused. Every row used to stay in the
         * form after a partial failure, so pressing Save again re-POSTed the
         * ones already recorded and the ledger held them twice (reproduced
         * 2026-09-24, B-61). A retry now sends exactly what failed.
         */
        if (failed.length > 0) {
          formEntries.value = submitted.filter((_, i) => results[i].status === 'rejected');
          isSubmitting.value = false;
          return;
        }

        isAddOpen.value = false;

        // Reset entries form list
        formEntries.value = [
          {
            desc: '',
            category: defaultCategory(),
            allocations: [
              { area: 'Boarding House', amount: '' }
            ]
          }
        ];

        // The refetch the comment above always claimed. It replaces the rows
        // just pushed with the server's own, so what is on screen is what the
        // ledger holds - and an edit straight afterwards PATCHes rather than
        // writing a second entry.
        await fetchExpenseRecords();

        showToast('success', 'Expenses recorded', `${count} ${count === 1 ? 'entry' : 'entries'} saved to the ledger.`);
      } catch (err: any) {
        showToast('error', failureTitle(err, 'Not saved'), err.message || 'The expenses could not be saved. Please try again.');
      } finally {
        isSubmitting.value = false;
      }
    },
    n === 1 ? 'Record entry' : `Record ${n} entries`,
    false
  );
}

// Helper to get split amount for a specific area
function getAreaAmount(e: ExpenseRecord, areaName: 'Boarding House' | 'Main House'): number {
  const match = e.splits.find(s => s.area === areaName);
  return match ? match.amount : 0;
}

/**
 * Everything the other two columns do not show.
 *
 * This used to name its three areas - Front Apartment, Back Apartment, Other
 * Expenses / Personal - and `property_area_type` has six. **Penthouse** was in
 * neither this filter nor the Boarding House and Main House columns, so a
 * penthouse allocation appeared in no column at all and the row stopped adding
 * up to its own total. Silently: nothing warns, the figures just disagree.
 *
 * There are no penthouse allocations today (1,327 rows, none of them PH -
 * checked against `expense_property_allocations`), because PH is the one unit
 * still vacant. The first expense allocated to it after it is let would have
 * gone missing from this table.
 *
 * Written as the complement rather than a list, so a seventh area cannot fall
 * out of the row the same way. The three columns now partition the splits by
 * construction.
 */
/**
 * APARTMENTS AND PERSONAL COSTS SHARED ONE COLUMN (found 2026-09-26).
 *
 * "Apartments and other" summed everything that was neither the boarding house
 * nor the main house, so a Back Apartment repair and an Other (personal) cost
 * read identically on a row - on a page that tells her personal costs are NOT
 * taken out of rental income. Her workbook gives every area its own column
 * (docs/10_MONTHLY_EXPENSES_REPORT.md, columns 3-7). Split along the line that
 * matters: the rental apartments, and her own "Other".
 */
function getApartmentsAmount(e: ExpenseRecord): number {
  return e.splits
    .filter(s => s.area === 'Front Apartment' || s.area === 'Back Apartment' || s.area === 'Penthouse')
    .reduce((sum, s) => sum + s.amount, 0);
}

function getPersonalOtherAmount(e: ExpenseRecord): number {
  return e.splits
    .filter(s => s.area === 'Other Expenses / Personal')
    .reduce((sum, s) => sum + s.amount, 0);
}

// Custom Confirmation State
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);
/**
 * One dialog serves both recording and deleting. It used to be hard-wired to a
 * red "Delete entry" button, so confirming a NEW expense looked like deleting
 * one (B-61). Each caller now says what its button does.
 */
const confirmLabel = ref('Delete expense');
const confirmDestructive = ref(true);

function showConfirm(title: string, message: string, action: () => void, label = 'Delete expense', destructive = true) {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  confirmLabel.value = label;
  confirmDestructive.value = destructive;
  isConfirmOpen.value = true;
}

function handleConfirmAccept() {
  const action = confirmAction.value;
  isConfirmOpen.value = false;
  if (action) {
    action();
  }
}

// Edit Expense State
const isEditOpen = ref(false);
const editingExpense = ref<ExpenseRecord | null>(null);
const editDate = ref('');
const editDesc = ref('');
const editCategory = ref('');
const editAllocations = ref<{
  area: PropertyArea | '';
  amount: string;
}[]>([]);

function addEditAllocation() {
  editAllocations.value.push({
    area: '',
    amount: ''
  });
}

function removeEditAllocation(allocIndex: number) {
  if (editAllocations.value.length > 1) {
    editAllocations.value.splice(allocIndex, 1);
  }
}

function startEditExpense(e: ExpenseRecord) {
  editingExpense.value = e;

  /**
   * The stored date, not the one on screen.
   *
   * This did `new Date(e.date)`, and `e.date` is the *display* string - "Sep 19,
   * 2026", built for the table by `toLocaleDateString`. Reconstructing a date by
   * re-parsing its own presentation is lossy in both directions: the format is
   * locale-dependent, and the parse lands on midnight in the **viewer's** zone
   * rather than the property's, so opening an entry and saving it could move its
   * date by a day for anyone not in the Philippines.
   *
   * `rawDate` is the `expense_date` column verbatim - a bare `date`, already
   * `YYYY-MM-DD`, which is exactly what the input wants. No parsing needed.
   *
   * The old fallback was worse than the parse. An entry with no date rendered as
   * '—', `new Date('—')` is NaN, and the else branch filled the field with
   * `propertyToday()` - so opening such an entry and pressing Save stamped it
   * with today's date. An unknown date became a confident wrong one. It is now
   * left empty, and the form can ask for it.
   */
  const stored = e.rawDate ?? '';
  editDate.value = /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : '';
  editDesc.value = e.description;
  editCategory.value = e.category;
  editAllocations.value = e.splits.map(s => ({
    area: s.area,
    amount: String(s.amount)
  }));
  isEditOpen.value = true;
}

function handleDeleteFromEditModal() {
  if (!editingExpense.value) return;
  const id = editingExpense.value.id;
  const desc = editingExpense.value.description;
  isEditOpen.value = false;
  handleDeleteExpense(id, desc);
}

function handleDeleteExpense(id: string, description: string) {
  showConfirm(
    'Delete this expense?',
    `"${description}" is removed from the ledger and the reports, and cannot be brought back.`,
    async () => {
      try {
        await api.delete(`/admin/expense-entries/${id}`);
        const index = expenseRecords.findIndex(e => e.id === id);
        if (index !== -1) {
          expenseRecords.splice(index, 1);
        }
        showToast('success', 'Expense deleted', `"${description}" is no longer in the ledger.`);
      } catch (err: any) {
        showToast('error', failureTitle(err, 'Not deleted'), err.message || 'The expense is still in the ledger. Please try again.');
      }
    }
  );
}

async function handleEditExpense() {
  if (!editingExpense.value) return;
  const invalid = editAllocations.value.some(a => !a.amount || Number(a.amount) <= 0);
  if (!editDesc.value.trim() || invalid) {
    showToast('error', 'Missing details', 'Enter what it was for and an amount above zero for each part.');
    return;
  }
  const problem = areaProblem(editAllocations.value);
  if (problem) {
    showToast('error', 'Check the areas', problem);
    return;
  }

  isSubmitting.value = true;
  try {
    const oldId = editingExpense.value.id;
    const oldDesc = editingExpense.value.description;
    

    const payload = {
      expenseDate: editDate.value,
      invoiceSupplier: editDesc.value.trim(),
      categoryCode: getDbCategoryCode(editCategory.value),
      allocations: editAllocations.value.map(a => ({
        propertyArea: a.area,
        amount: Number(a.amount) || 0
      }))
    };

    if (oldId && !oldId.startsWith('EXP-') && !oldId.startsWith('EXP-NEW-')) {
      await api.patch(`/admin/expense-entries/${oldId}`, payload);
    } else {
      await api.post('/admin/expense-entries', payload);
    }

    await fetchExpenseRecords();

    isEditOpen.value = false;
    editingExpense.value = null;
    showToast('success', 'Expense updated', `"${editDesc.value.trim()}" is saved.`);
  } catch (err: any) {
    showToast('error', failureTitle(err, 'Not saved'), err.message || 'The expense could not be updated. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}

</script>

<template>
  <!--
    `ws-focus` is what puts the workspace's 3px focus ring on this screen.
    Verified in the running app's compiled stylesheet rather than assumed:
    `.ws-focus :focus-visible { outline: 3px solid var(--ink) }` is scoped to
    a `.ws-focus` ANCESTOR, and nothing above a view supplies one - App.vue's
    wrapper does not. Without it every control here fell back to the browser's
    own ring, and the search box fell back to nothing at all, because
    `.ws-input:focus` sets `outline: none` and this was the rule that was
    meant to replace it. Four of the seven admin registers were missing it.
  -->
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <!-- No subtitle: it described the columns below (Sean, 2026-10-01, fewer words). -->
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Monthly Expenses
        </h1>
      </div>

      <div class="ws-page-actions">
        <!--
          One export. A CSV button sat beside this one writing a flat dump,
          while this writes her layout: month blocks, Property Area totals, and
          the category summary with its running cumulative. Two buttons meant
          two files that disagreed about what the ledger looks like.

          "Download" with the year and format in its name and tooltip, the
          same pair as Monthly Income's (Sean, 2026-10-01).
        -->
        <button
          type="button"
          class="pill-btn"
          aria-haspopup="dialog"
          :aria-label="`Download ${exportYear} for Excel`"
          :title="`Download ${exportYear} for Excel`"
          @click="isDownloadOpen = true"
        >
          <FileSpreadsheet class="size-4" aria-hidden="true" />
          <span>Download</span>
        </button>

        <!-- Not offline or from the saved copy: recording needs the server (Sean, 2026-10-02). -->
        <button
          type="button"
          class="pill-btn-brand"
          :disabled="writesUnavailable"
          :title="writesUnavailable ? 'Needs a connection' : undefined"
          @click="isAddOpen = true"
        >
          <Plus class="size-4" aria-hidden="true" />
          <span>Record expense</span>
        </button>
      </div>

      <!-- Month, year, or everything; the busy state and any failure live in it. -->
      <DownloadDialog
        v-if="isDownloadOpen"
        kind="expenses"
        title="Monthly Expenses"
        :years="exportYears"
        :year="Number(exportYear)"
        :month="exportMonth"
        @close="isDownloadOpen = false"
      />
    </div>

    <!-- What was spent, and where it landed -->
    <div class="grid gap-4 xl:grid-cols-12">
      <!--
        The one dark tile on this screen, and the one figure the screen exists
        to state.

        This was `text-5xl` on a plain tile sitting beside another plain tile of
        the same weight, so the screen opened on two equal surfaces and the eye
        had nowhere to land. OverviewTile's own note reserves `night` for what
        "asks for action", and a total spent does not - but the two registers
        this one is read beside already use the tone the other way and neither
        of their dark figures asks for anything: "Collected altogether" on the
        income ledger is a sum, "Everything on record" on the audit trail is a
        count. Both are the headline of the screen that owns them. Read as a
        claim with a date on it, the tile's note describes the overview, where
        the dark tile really is a queue of work; across the three admin
        registers the rank the tone carries is "this is the figure the screen
        is about". "Monthly Expenses" was the only one of the four without one.

        The figure steps DOWN, 5xl to 4xl, to the same line "Collected
        altogether" uses - the tone now does the work the size was being asked
        to do on its own, and the pair reads as one product. It also stops a
        seven-figure peso amount from running out of a third-width tile.

        The rules inside are `white/10` and the quiet text `on-night-soft`,
        which is the dark-tile idiom already in AdminOverviewView, not a new
        colour.
      -->
      <OverviewTile :title="`Spent, ${focus.label}`" tone="night" class="max-md:gap-3 max-md:p-4 xl:col-span-4">
        <UnavailableNote
          v-if="expenseRecordsFetchFailed"
          dark
          message="Expenses could not be loaded. That is not the same as nothing being spent."
          @retry="fetchExpenses"
        />
        <template v-else>
          <p class="tabular text-3xl md:text-4xl leading-none font-semibold tracking-tight">{{ peso(monthTotal) }}</p>
          <p class="text-sm leading-6 text-on-night-soft">
            {{ monthEntries.length === 0 ? 'Nothing entered yet' : `Across ${monthEntries.length} ${monthEntries.length === 1 ? 'entry' : 'entries'}` }}
          </p>
          <!-- Side by side on a phone, rows from 768px (Loyd, 2026-10-03: smaller
               cards there, so the graphs below are on the first screen). -->
          <dl class="mt-auto grid auto-cols-fr grid-flow-col gap-3 border-t border-white/10 pt-3 md:flex md:flex-col md:gap-0 md:divide-y md:divide-white/10 md:pt-1">
            <div class="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:py-2.5">
              <dt class="text-sm text-on-night-soft">Utilities</dt>
              <dd class="tabular text-base font-semibold md:text-lg">{{ peso(monthUtilities) }}</dd>
            </div>
            <div class="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:py-2.5">
              <dt class="text-sm text-on-night-soft">Repairs and cleaning</dt>
              <dd class="tabular text-base font-semibold md:text-lg">{{ peso(monthRepairs) }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile :title="`Where it landed, ${periodWord}`" class="max-md:gap-3 max-md:p-4 xl:col-span-8">
        <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="fetchExpenses" />
        <p v-else-if="areaSplit.length === 0" class="text-sm text-ink-soft">
          No expenses match the filters above.
        </p>
        <template v-else>
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="tabular text-xl md:text-2xl font-semibold leading-none text-ink">{{ peso(totalJuly) }}</span>
            <span class="text-sm text-ink-soft">spent across {{ filtered.length }} {{ filtered.length === 1 ? 'entry' : 'entries' }}</span>
          </p>
          <SegmentBar
            :segments="areaSplit"
            :label="`How ${peso(totalJuly)} divides across the property areas`"
          />
          <!-- The legend in two columns on a phone, name and share; the amounts
               from 768px (Loyd, 2026-10-03). -->
          <ul class="grid grid-cols-2 gap-x-3 gap-y-2 max-md:text-xs md:flex md:flex-col md:gap-2.5">
            <li v-for="a in areaSplit" :key="a.label" class="flex min-w-0 items-center justify-between gap-2 md:gap-3 md:text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  :class="[
                    'size-3 shrink-0 rounded-full',
                    a.tone === 'brand' && 'bg-brand',
                    a.tone === 'bright' && 'bg-brand-bright',
                    a.tone === 'night' && 'bg-series-night',
                    a.tone === 'soft' && 'bg-series-soft',
                    a.tone === 'hatch' && 'hatch border border-line',
                    a.tone === 'faint' && 'bg-ink-faint',
                  ]"
                />
                <span class="truncate">{{ a.label }}</span>
              </span>
              <span class="flex shrink-0 items-baseline gap-3">
                <span class="text-xs text-ink-faint tabular">
                  {{ totalJuly > 0 ? Math.round((a.value / totalJuly) * 100) : 0 }}%
                </span>
                <span class="tabular font-semibold max-md:hidden">{{ peso(a.value) }}</span>
              </span>
            </li>
          </ul>
          <p class="text-xs leading-5 text-ink-faint max-md:hidden">
            Main House and Other are personal spending.
          </p>
        </template>
      </OverviewTile>
    </div>

    <!-- Narrowing the ledger: the list toolbar every screen shares
         (components/ui/ListToolbar.vue, Sean, 2026-10-01). No switch - the
         ledger has one way of being drawn - so search, with the filter button
         beside it holding Kind, Month and Year. -->
    <ListToolbar
      v-model:search="q"
      search-label="Search the ledger"
      :filters="expenseFilters"
      @apply="applyExpenseFilters"
    />

    <!-- `SkeletonTable` is `aria-hidden="true"` throughout (it is a purely visual
         placeholder), so without this a screen reader was told nothing while the
         ledger loaded - not even that a load was in progress. The overview and
         income ledger already pair their loading state with an announced
         `role="status"`; this register's table skeleton had none. -->
    <span v-if="isLoading" class="sr-only" role="status">Loading the expense ledger</span>
    <SkeletonTable v-if="isLoading" :columns="6" :rows="6" />

    <div v-else-if="groupedExpenses.length === 0" class="ws-reveal rounded-tile bg-tile px-6 py-16 text-center">
      <p class="text-base font-semibold text-ink">
        <template v-if="expenseRecordsFetchFailed">The ledger could not be loaded</template>
        <template v-else>Nothing matches</template>
      </p>
      <!-- The heading says it when nothing matches; the failure keeps its line. -->
      <p v-if="expenseRecordsFetchFailed" class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
        This is not the same as there being no expenses. Reload the page to try again.
      </p>
    </div>

    <!--
      A day at a time. Every expense on record used to render at once - 1,327
      allocations - so the page scrollbar became a sliver and the way to the
      bottom of this screen was through the whole ledger.

      Three of the six columns are the areas an expense is split across, which
      is what makes this worth being a table: the figures line up down the page
      and can be compared. Below 1280px (at 1024 the sidebar leaves ~660px) each day becomes a stack of tiles,
      because three money columns read sideways on a phone is not a table.
    -->
    <RecordTable
      v-else
      class="ws-reveal"
      :rows="groupedExpenses"
      caption="Expenses by day, each split across the boarding house, the main house, the apartments and other personal costs"
      noun="day"
      :page-size="6"
      table-from="xl"
    >
      <template #head>
        <tr>
          <th scope="col">What it was for</th>
          <th scope="col">Kind</th>
          <th scope="col" class="num">Boarding house</th>
          <th scope="col" class="num">Main house</th>
          <th scope="col" class="num">Apartments</th>
          <th scope="col" class="num">Other (personal)</th>
          <th scope="col" class="num">All of it</th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: group }">
        <tr>
          <th scope="colgroup" colspan="6" class="bg-canvas text-sm text-ink-soft">
            {{ group.dateStr }}
          </th>
          <td class="num bg-canvas text-sm font-semibold text-ink">{{ peso(group.dayTotal, 2) }}</td>
          <td class="bg-canvas"><span class="sr-only">that day</span></td>
        </tr>
        <tr v-for="e in group.records" :key="e.id" class="group">
          <th scope="row" class="font-medium wrap-anywhere text-ink">{{ e.description }}</th>
          <td>{{ e.category }}</td>
          <td class="num">
            {{ getAreaAmount(e, 'Boarding House') ? peso(getAreaAmount(e, 'Boarding House'), 2) : '—' }}
          </td>
          <td class="num">
            {{ getAreaAmount(e, 'Main House') ? peso(getAreaAmount(e, 'Main House'), 2) : '—' }}
          </td>
          <td class="num">{{ getApartmentsAmount(e) ? peso(getApartmentsAmount(e), 2) : '—' }}</td>
          <td class="num">{{ getPersonalOtherAmount(e) ? peso(getPersonalOtherAmount(e), 2) : '—' }}</td>
          <td class="num font-semibold text-ink">{{ peso(getExpenseTotal(e), 2) }}</td>
          <td class="num">
            <button
              type="button"
              class="press-plate icon-btn-plain row-action"
              :aria-label="`Edit ${e.description}`"
              title="Edit"
              @click="startEditExpense(e)"
            >
              <Pencil class="size-4" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </template>

      <template #card="{ row: group }">
        <div class="flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <p class="text-sm font-semibold text-ink">{{ group.dateStr }}</p>
          <p class="tabular text-sm font-semibold text-ink">{{ peso(group.dayTotal, 2) }}</p>
        </div>

        <ul class="mt-3 space-y-4">
          <li v-for="e in group.records" :key="e.id">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <!--
                  break-words: this is the phone card layout below lg, where
                  the desktop `<th>` above has ws-table-wrap's own contained
                  horizontal scroll to fall back on and this card does not.
                  The description is typed freely (an invoice or supplier
                  name), so an unbroken run - a run-together vendor name, a
                  reference number - would otherwise run past the card.
                -->
                <p class="text-sm font-medium leading-snug break-words text-ink">{{ e.description }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">{{ e.category }}</p>
              </div>
              <p class="tabular shrink-0 text-sm font-semibold text-ink">
                {{ peso(getExpenseTotal(e), 2) }}
              </p>
            </div>

            <!-- The compact pencil the directory cards use: hover/focus-reveal,
                 no border, not a full-width button. -->
            <dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div v-if="getAreaAmount(e, 'Boarding House')" class="flex gap-1.5">
                <dt class="text-ink-faint">Boarding house</dt>
                <dd class="tabular text-ink">{{ peso(getAreaAmount(e, 'Boarding House'), 2) }}</dd>
              </div>
              <div v-if="getAreaAmount(e, 'Main House')" class="flex gap-1.5">
                <dt class="text-ink-faint">Main house</dt>
                <dd class="tabular text-ink">{{ peso(getAreaAmount(e, 'Main House'), 2) }}</dd>
              </div>
              <div v-if="getApartmentsAmount(e)" class="flex gap-1.5">
                <dt class="text-ink-faint">Apartments</dt>
                <dd class="tabular text-ink">{{ peso(getApartmentsAmount(e), 2) }}</dd>
              </div>
              <div v-if="getPersonalOtherAmount(e)" class="flex gap-1.5">
                <dt class="text-ink-faint">Other (personal)</dt>
                <dd class="tabular text-ink">{{ peso(getPersonalOtherAmount(e), 2) }}</dd>
              </div>
            </dl>
            <div class="mt-2 flex justify-end">
            <button
              type="button"
              class="press-plate icon-btn-plain row-action"
              :aria-label="`Edit ${e.description}`"
              title="Edit"
              @click="startEditExpense(e)"
            >
              <Pencil class="size-4" aria-hidden="true" />
            </button>
            </div>
          </li>
        </ul>
      </template>
    </RecordTable>

    <!-- Record Expense Modal (Supports Multiple Entries) -->
    <WsModal
      v-if="isAddOpen"
      title="Record expense"
      subtitle="You can add several from one day at once."
      size="lg"
      :dismissible="false"
      @close="isAddOpen = false"
    >

        <form @submit.prevent="submitAddExpense">
          <!-- No gutter of its own: WsModal's body has one, and a second left 255px of a
               375px screen for the fields. The body scrolls and keeps the buttons on
               screen itself now (2026-10-03), so this no longer caps its height. -->
          <div class="space-y-4 text-xs text-ink">
            <!-- Date Field -->
            <label class="ws-field w-full sm:w-64">
              Date it was spent
              <input v-model="date" type="date" class="ws-input w-full" required />
            </label>

            <!--
              Dynamic Entries List. A new item used to appear on the same frame
              as the click that added it, indistinguishable from the ones that
              were already there. `TransitionGroup` gives the newly-pushed item
              an entrance without touching the ones already on screen; leaving
              is unanimated on purpose, since animating an item's removal here
              would mean animating the height its neighbours reflow into, which
              is the one thing this file does not animate.
            -->
            <TransitionGroup
              tag="div"
              class="space-y-4"
              enter-active-class="transition duration-150 ease-[var(--ease-out)]"
              enter-from-class="opacity-0 motion-safe:scale-[0.97]"
              enter-to-class="opacity-100 motion-safe:scale-100"
            >
              <div
                v-for="(entry, index) in formEntries"
                :key="index"
                class="relative p-4 bg-canvas border border-line rounded-tile space-y-3"
              >
                <!-- Header with Item Index and Remove Item Button -->
                <div class="flex items-center justify-between pb-2 border-b border-line/70">
                  <span class="font-semibold text-sm text-ink">
                    Expense {{ index + 1 }}
                  </span>
                  <!-- The quiet danger button the other dialogs use; this was a 28px
                       one-off, under the size a finger needs. -->
                  <button
                    v-if="formEntries.length > 1"
                    type="button"
                    @click="removeFormEntry(index)"
                    class="pill-btn-danger-quiet pill-btn-compact"
                  >
                    <Trash2 class="size-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label class="ws-field">
                    What it was for
                    <input
                      v-model="entry.desc"
                      placeholder="INV#88240, supplies"
                      class="ws-input w-full"
                      required
                    />
                  </label>

                  <label class="ws-field">
                    Kind of expense
                    <PillSelect v-model="entry.category" :options="categoryOptions" aria-label="Kind of expense" widthClass="w-full" />
                  </label>
                </div>

                <!-- Allocations / Splits Section -->
                <div class="border-t border-line/70 pt-3 space-y-2.5">
                  
                  <TransitionGroup
                    tag="div"
                    class="space-y-2"
                    enter-active-class="transition duration-150 ease-[var(--ease-out)]"
                    enter-from-class="opacity-0 motion-safe:scale-[0.97]"
                    enter-to-class="opacity-100 motion-safe:scale-100"
                  >
                    <!--
                      THE PROPERTY-AREA SELECT WAS RENDERING 0px WIDE ON A PHONE.

                      Three items on one unwrapped flex line: this select at
                      `flex-1`, a fixed `w-36` amount box and a 44px delete
                      button. Measured at 375 before this change, the row had
                      221px to give, the amount and the button and the gaps took
                      all of it, and `.ws-field` carries `min-width: 0` - so the
                      select was squeezed to a computed width of 0 with 50px
                      overflowing. Which part of the property an expense belongs
                      to is the whole point of this row, and on a phone it was
                      not visible and could not be pressed.

                      Wrapping is the fix rather than a narrower amount box: the
                      select takes the line to itself below `sm`, and the amount
                      and the delete button share the next one. `items-end`
                      lines the controls up on their bottom edge, which is what
                      the delete button's own `self-end` was already asking for;
                      with equal-height fields at `sm` it renders exactly as
                      `items-center` did.
                    -->
                    <div
                      v-for="(alloc, aIdx) in entry.allocations"
                      :key="aIdx"
                      class="flex flex-wrap items-end gap-3 bg-tile p-3 border border-line rounded-xl"
                    >
                      <label class="ws-field w-full sm:w-auto sm:flex-1">
                        Which part of the property
                        <PillSelect v-model="alloc.area" :options="PROPERTY_AREA_OPTIONS" aria-label="Which part of the property" placeholder="Choose an area" widthClass="w-full" />
                      </label>

                      <label class="ws-field flex-1 sm:flex-none sm:w-44">
                        How much
                        <input
                          v-model="alloc.amount"
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="any"
                          class="ws-input tabular w-full"
                          required
                        />
                      </label>

                      <div class="self-end pb-0.5">
                        <button
                          v-if="entry.allocations.length > 1"
                          type="button"
                          class="icon-btn-plain text-overdue"
                          aria-label="Take this part of the property off the split"
                          @click="removeAllocation(index, aIdx)"
                        >
                          <Trash2 class="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </TransitionGroup>

                  <!-- Add Split Area button -->
                  <div class="pt-1">
                    <button
                      type="button"
                      @click="addAllocation(index)"
                      class="pill-btn pill-btn-compact"
                    >
                      <Plus class="size-3.5 text-brand" />
                      <span>Split across another area</span>
                    </button>
                  </div>
                </div>
              </div>
            </TransitionGroup>

            <!-- Add Another Item Button -->
            <div>
              <button 
                type="button" 
                @click="addFormEntry" 
                class="pill-btn pill-btn-compact"
              >
                <Plus class="size-4 text-brand" aria-hidden="true" />
                <span>Add another expense</span>
              </button>
            </div>
          </div>

          <!-- Modal Actions Footer. `flex-wrap` so a longer label can never do
               here what it did on the edit dialog's footer below, where the
               row ran 111px past its box at 375. -->
          <!-- `.ws-actions` (index.css; Sean, 2026-10-01): equal halves on a
               phone, right-aligned from 640px, one height. -->
          <div class="ws-actions mt-4 pt-4 border-t border-line">
            <button type="button" @click="isAddOpen = false" class="pill-btn">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
              <span>{{ formEntries.length === 1 ? 'Save expense' : `Save ${formEntries.length} expenses` }}</span>
            </button>
          </div>
        </form>
    </WsModal>

    <!-- Edit Expense Modal -->
    <WsModal
      v-if="isEditOpen"
      title="Edit this expense"
      size="lg"
      :dismissible="false"
      @close="isEditOpen = false"
    >

        <form @submit.prevent="handleEditExpense">
          <!-- Same as the add dialog above. -->
          <div class="space-y-4 text-xs text-ink">
            <!-- Date Field -->
            <label class="ws-field w-full sm:w-64">
              Date it was spent
              <input 
                v-model="editDate" 
                type="date" 
                class="ws-input w-full" 
                required 
              />
            </label>

            <!-- Description & Category Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="ws-field">
                What it was for
                <input
                  v-model="editDesc"
                  placeholder="INV#88240, supplies"
                  class="ws-input w-full" 
                  required 
                />
              </label>

              <label class="ws-field">
                Kind of expense
                <PillSelect v-model="editCategory" :options="categoryOptions" aria-label="Kind of expense" widthClass="w-full" />
              </label>
            </div>

            <!-- Allocations / Splits Section -->
            <div class="space-y-3 pt-2">

              <TransitionGroup
                tag="div"
                class="space-y-2"
                enter-active-class="transition duration-150 ease-[var(--ease-out)]"
                enter-from-class="opacity-0 motion-safe:scale-[0.97]"
                enter-to-class="opacity-100 motion-safe:scale-100"
              >
                <!-- The same crushed row as the add dialog's - it was written
                     twice. The reasoning is written out there. -->
                <div
                  v-for="(alloc, aIdx) in editAllocations"
                  :key="aIdx"
                  class="flex flex-wrap items-end gap-3 bg-canvas p-3 border border-line rounded-xl"
                >
                  <label class="ws-field w-full sm:w-auto sm:flex-1">
                    Which part of the property
                    <PillSelect v-model="alloc.area" :options="PROPERTY_AREA_OPTIONS" aria-label="Which part of the property" placeholder="Choose an area" widthClass="w-full" />
                  </label>

                  <label class="ws-field flex-1 sm:flex-none sm:w-44">
                    How much
                    <input
                      v-model="alloc.amount"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      class="ws-input tabular w-full"
                      required
                    />
                  </label>

                  <div class="self-end pb-0.5">
                    <button
                      v-if="editAllocations.length > 1"
                      type="button"
                      class="icon-btn-plain text-overdue"
                      aria-label="Take this part of the property off the split"
                      @click="removeEditAllocation(aIdx)"
                    >
                      <Trash2 class="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </TransitionGroup>

              <!-- Add Split Area button -->
              <div class="pt-1">
                <button 
                  type="button" 
                  @click="addEditAllocation" 
                  class="pill-btn pill-btn-compact"
                >
                  <Plus class="size-3.5 text-brand" />
                  <span>Split across another area</span>
                </button>
              </div>
            </div>
          </div>

          <!--
            Modal Actions Footer: Delete on the left, Cancel/Save on the right.

            The same unwrapped three-button row that was clipping "Update
            Collection" on the income ledger. Measured here at 375 before this
            change: 414px of content in a 303px box, 111px of overflow, with
            "Update Entry"'s right edge at x=450 against a column ending at 339
            and `overflow-x: hidden` on `body` cutting it off.

            Wrapping fixed that and left three widths in two rows (Sean,
            2026-10-01). `.ws-actions` (index.css) now: Cancel and Save changes
            equal halves, Delete expense its own row beneath at the same
            height; from 640px one line with Delete at the far left.
          -->
          <div class="ws-actions mt-4 pt-4 border-t border-line">
            <button
              v-if="editingExpense"
              type="button"
              @click="handleDeleteFromEditModal"
              class="pill-btn-danger-quiet ws-action-apart"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              <span>Delete expense</span>
            </button>
            <button type="button" @click="isEditOpen = false" class="pill-btn">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
              <span>Save changes</span>
            </button>
          </div>
        </form>
    </WsModal>

    <!-- Confirmation -->
    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      :destructive="confirmDestructive"
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
