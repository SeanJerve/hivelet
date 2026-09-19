<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { propertyToday } from '@/lib/propertyDate';
import { ref, computed, onMounted } from 'vue';
import { expenseRecords, expenseRecordsFetchFailed, fetchExpenseRecords, EXPENSE_CATEGORIES, PROPERTY_AREA_OPTIONS, showToast, type ExpenseRecord, type PropertyArea } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { downloadReport } from '@/lib/downloadReport';
import { Plus, Search, X, Loader2, FileSpreadsheet, Pencil, Trash2, ChevronDown } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

interface ApiExpense {
  id: string;
  expense_date: string;
  or_supplier: string;
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
  area: PropertyArea;
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
const filterYear = ref('All');

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
const isExportingExcel = ref(false);

async function exportExpensesExcel() {
  if (isExportingExcel.value) return;
  isExportingExcel.value = true;
  // A per-year report, so "All Years" falls back to this year rather than
  // silently exporting one of them.
  // The property's year, not the viewer's (lib/propertyDate.ts).
  const year = filterYear.value !== 'All' ? filterYear.value : propertyToday().slice(0, 4);
  try {
    await downloadReport('expenses', year);
  } finally {
    isExportingExcel.value = false;
  }
}

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

const yearsList = ['All', '2026', '2025', '2024'];

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

function addAllocation(entryIndex: number) {
  formEntries.value[entryIndex].allocations.push({
    area: 'Boarding House',
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

// Normalize Date into "MMM DD, YYYY" for grouping consistency
function formatDateForDisplay(dateVal: string | Date): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
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
  fetchExpenses();
});

const filtered = computed(() => {
  return expenseRecords.filter((e) => {
    const query = q.value.toLowerCase().trim();
    const matchesQ =
      !query ||
      e.description.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query);
    const matchesCat = selectedCategory.value === 'All' || e.category === selectedCategory.value;

    const dateParts = e.date.split(' ');
    const monthPart = dateParts[0]; 
    const yearPart = dateParts[2];  

    const matchesMonth = filterMonth.value === 'All' || monthPart === filterMonth.value;
    const matchesYear = filterYear.value === 'All' || yearPart === filterYear.value;

    return matchesQ && matchesCat && matchesMonth && matchesYear;
  });
});

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
  }).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
});

const totalJuly = computed(() =>
  filtered.value.reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

const utilitiesTotal = computed(() =>
  filtered.value
    .filter((e) => e.category.toLowerCase().includes('water') || e.category.toLowerCase().includes('light') || e.category.toLowerCase().includes('util'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

/**
 * Where the filtered money actually went. Every entry is allocated across the
 * five property areas (BR-044), and those allocations add up to the entry's
 * face value, so this is a true part-to-whole and can be drawn as one bar.
 */
const areaSplit = computed(() => {
  const totals = new Map<string, number>();
  for (const e of filtered.value) {
    for (const s of e.splits) {
      totals.set(s.area, (totals.get(s.area) ?? 0) + s.amount);
    }
  }
  const tones = ['brand', 'bright', 'night', 'soft', 'hatch'] as const;
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
});

const repairsTotal = computed(() =>
  filtered.value
    .filter((e) => e.category.toLowerCase().includes('repair') || e.category.toLowerCase().includes('janitorial') || e.category.toLowerCase().includes('suppl'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

function getExpenseTotal(e: ExpenseRecord) {
  return e.splits.reduce((s, x) => s + x.amount, 0);
}

function submitAddExpense() {
  const invalid = formEntries.value.some(entry => {
    if (!entry.desc.trim()) return true;
    return entry.allocations.some(a => !a.amount || Number(a.amount) <= 0);
  });
  if (invalid) {
    showToast('error', 'Validation Error', 'Please fill in a description and positive amount for all item allocations.');
    return;
  }

  const confirmMsg = `Are you sure you want to record these ${formEntries.value.length} expense entries for ${formatDateForDisplay(date.value)}?`;
  showConfirm(
    'Confirm Expense Entries',
    confirmMsg,
    async () => {
      isSubmitting.value = true;
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
          formEntries.value.map((entry) =>
            api.post('/admin/expense-entries', {
              expenseDate: date.value,
              orSupplier: entry.desc.trim(),
              categoryCode: getDbCategoryCode(entry.category),
              allocations: entry.allocations.map(a => ({
                propertyArea: a.area,
                amount: Number(a.amount) || 0
              }))
            })
          )
        );

        const failed = results
          .map((r, i) => (r.status === 'rejected' ? formEntries.value[i].desc.trim() || `entry ${i + 1}` : null))
          .filter((x): x is string => x !== null);

        const count = results.length - failed.length;

        if (failed.length > 0) {
          showToast(
            'error',
            count > 0 ? 'Some expenses were not saved' : 'Expenses not saved',
            `${failed.length} of ${results.length} could not be recorded: ${failed.join(', ')}. ` +
            'They are still in the form - please try again.'
          );
        }

        if (count === 0) {
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
        formEntries.value.forEach((entry, idx) => {
          if (results[idx].status !== 'fulfilled') return;
          const newEntry: ExpenseRecord = {
            id: serverId(results[idx], idx),
            date: formatDateForDisplay(date.value),
            description: entry.desc.trim(),
            category: entry.category,
            splits: entry.allocations.map(a => ({
              area: a.area,
              amount: Number(a.amount) || 0
            })),
          };
          expenseRecords.unshift(newEntry);
        });

        if (failed.length > 0) {
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
        showToast('error', 'Submission failed', err.message || 'Server error occurred');
      } finally {
        isSubmitting.value = false;
      }
    }
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
function getAptsOtherAmount(e: ExpenseRecord): number {
  return e.splits
    .filter(s => s.area !== 'Boarding House' && s.area !== 'Main House')
    .reduce((sum, s) => sum + s.amount, 0);
}

// Custom Confirmation State
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(title: string, message: string, action: () => void) {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
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
  area: PropertyArea;
  amount: string;
}[]>([]);

function addEditAllocation() {
  editAllocations.value.push({
    area: 'Boarding House',
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
    'Void Expense Record',
    `Are you sure you want to delete the expense "${description}"? This action is permanent and will adjust financial reports.`,
    async () => {
      try {
        await api.delete(`/admin/expense-entries/${id}`);
        const index = expenseRecords.findIndex(e => e.id === id);
        if (index !== -1) {
          expenseRecords.splice(index, 1);
        }
        showToast('success', 'Expense deleted', `Voided "${description}" successfully.`);
      } catch (err: any) {
        showToast('error', 'Delete failed', err.message || 'Server error occurred');
      }
    }
  );
}

async function handleEditExpense() {
  if (!editingExpense.value) return;
  const invalid = editAllocations.value.some(a => !a.amount || Number(a.amount) <= 0);
  if (!editDesc.value.trim() || invalid) {
    showToast('error', 'Validation Error', 'Please enter a description and positive amount for all allocations.');
    return;
  }

  isSubmitting.value = true;
  try {
    const oldId = editingExpense.value.id;
    const oldDesc = editingExpense.value.description;
    

    const payload = {
      expenseDate: editDate.value,
      orSupplier: editDesc.value.trim(),
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
    showToast('success', 'Expense updated', `Updated "${editDesc.value.trim()}" successfully.`);
  } catch (err: any) {
    showToast('error', 'Update failed', err.message || 'Server error occurred');
  } finally {
    isSubmitting.value = false;
  }
}

</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Money going out
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          What was spent, what kind of thing it was, and which part of the property it belongs to.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <!--
          One export. A CSV button sat beside this one writing a flat dump,
          while this writes her layout: month blocks, Property Area totals, and
          the category summary with its running cumulative. Two buttons meant
          two files that disagreed about what the ledger looks like.
        -->
        <button
          type="button"
          class="pill-btn"
          :disabled="isExportingExcel"
          @click="exportExpensesExcel"
        >
          <FileSpreadsheet
            :class="['size-4', isExportingExcel && 'animate-pulse']"
            aria-hidden="true"
          />
          <span>{{ isExportingExcel ? 'Building the file' : 'Download for Excel' }}</span>
        </button>

        <button type="button" class="pill-btn-brand" @click="isAddOpen = true">
          <Plus class="size-4" aria-hidden="true" />
          <span>Record an expense</span>
        </button>
      </div>
    </div>

    <!-- What was spent, and where it landed -->
    <div class="grid gap-4 xl:grid-cols-12">
      <OverviewTile title="Spent in this view" class="xl:col-span-4">
        <UnavailableNote
          v-if="expenseRecordsFetchFailed"
          message="Expenses could not be loaded. That is not the same as nothing being spent."
          @retry="fetchExpenses"
        />
        <template v-else>
          <p class="text-5xl leading-none font-semibold tabular tracking-tight">{{ peso(totalJuly) }}</p>
          <p class="text-sm text-ink-soft">Across {{ filtered.length }} {{ filtered.length === 1 ? 'entry' : 'entries' }}</p>
          <dl class="mt-auto flex flex-col divide-y divide-line border-t border-line pt-1 text-sm">
            <div class="flex items-baseline justify-between gap-3 py-2">
              <dt class="text-ink-soft">Utilities</dt>
              <dd class="tabular font-semibold">{{ peso(utilitiesTotal) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3 py-2">
              <dt class="text-ink-soft">Repairs and cleaning</dt>
              <dd class="tabular font-semibold">{{ peso(repairsTotal) }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile title="Where it landed" class="xl:col-span-8">
        <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="fetchExpenses" />
        <p v-else-if="areaSplit.length === 0" class="text-sm text-ink-soft">
          No expenses match the filters above.
        </p>
        <template v-else>
          <SegmentBar
            :segments="areaSplit"
            :label="`How ${peso(totalJuly)} divides across the property areas`"
          />
          <ul class="flex flex-col gap-2.5">
            <li v-for="a in areaSplit" :key="a.label" class="flex items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  :class="[
                    'size-3 shrink-0 rounded-full',
                    a.tone === 'brand' && 'bg-brand',
                    a.tone === 'bright' && 'bg-brand-bright',
                    a.tone === 'night' && 'bg-night',
                    a.tone === 'soft' && 'bg-brand-soft',
                    a.tone === 'hatch' && 'hatch border border-line',
                  ]"
                />
                <span class="truncate">{{ a.label }}</span>
              </span>
              <span class="flex shrink-0 items-baseline gap-3">
                <span class="text-xs text-ink-faint tabular">
                  {{ totalJuly > 0 ? Math.round((a.value / totalJuly) * 100) : 0 }}%
                </span>
                <span class="tabular font-semibold">{{ peso(a.value) }}</span>
              </span>
            </li>
          </ul>
          <p class="text-xs leading-5 text-ink-faint">
            Main House and Other are the owner's own costs. They are recorded here but never subtracted from
            rental income.
          </p>
        </template>
      </OverviewTile>
    </div>

    <!-- Narrowing the ledger -->
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="relative xl:max-w-sm xl:flex-1">
        <Search
          class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <label for="expense-search" class="sr-only">Search the ledger</label>
        <input
          id="expense-search"
          v-model="q"
          type="search"
          placeholder="What it was for, receipt number or kind"
          class="ws-input w-full pl-11"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label class="ws-field">
          <span class="sr-only">Kind of expense</span>
          <select v-model="selectedCategory" class="ws-select w-auto">
            <option value="All">Every kind</option>
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label class="ws-field">
          <span class="sr-only">Month</span>
          <select v-model="filterMonth" class="ws-select w-auto">
            <option v-for="m in monthsList" :key="m.val" :value="m.val">{{ m.label }}</option>
          </select>
        </label>

        <label class="ws-field">
          <span class="sr-only">Year</span>
          <select v-model="filterYear" class="ws-select w-auto">
            <option v-for="y in yearsList" :key="y" :value="y">
              {{ y === 'All' ? 'Every year' : y }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <SkeletonTable v-if="isLoading" :columns="6" :rows="6" />

    <div v-else-if="groupedExpenses.length === 0" class="rounded-tile bg-tile px-6 py-16 text-center">
      <p class="text-base font-semibold text-ink">
        <template v-if="expenseRecordsFetchFailed">The ledger could not be loaded</template>
        <template v-else>Nothing here</template>
      </p>
      <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
        <template v-if="expenseRecordsFetchFailed">
          This is not the same as there being no expenses. Reload the page to try again.
        </template>
        <template v-else>No expense matches what you have asked for.</template>
      </p>
    </div>

    <!--
      A day at a time. Every expense on record used to render at once - 1,327
      allocations - so the page scrollbar became a sliver and the way to the
      bottom of this screen was through the whole ledger.

      Three of the six columns are the areas an expense is split across, which
      is what makes this worth being a table: the figures line up down the page
      and can be compared. Below 1024px each day becomes a stack of tiles,
      because three money columns read sideways on a phone is not a table.
    -->
    <RecordTable
      v-else
      :rows="groupedExpenses"
      caption="Expenses by day, each split across the boarding house, the main house and the apartments"
      noun="day"
      :page-size="6"
    >
      <template #head>
        <tr>
          <th scope="col">What it was for</th>
          <th scope="col">Kind</th>
          <th scope="col" class="num">Boarding house</th>
          <th scope="col" class="num">Main house</th>
          <th scope="col" class="num">Apartments and other</th>
          <th scope="col" class="num">All of it</th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: group }">
        <tr>
          <th scope="colgroup" colspan="5" class="bg-canvas text-sm text-ink-soft">
            {{ group.dateStr }}
          </th>
          <td class="num bg-canvas text-sm font-semibold text-ink">{{ peso(group.dayTotal) }}</td>
          <td class="bg-canvas"><span class="sr-only">that day</span></td>
        </tr>
        <tr v-for="e in group.records" :key="e.id">
          <th scope="row" class="font-medium text-ink">{{ e.description }}</th>
          <td>{{ e.category }}</td>
          <td class="num">
            {{ getAreaAmount(e, 'Boarding House') ? peso(getAreaAmount(e, 'Boarding House')) : '—' }}
          </td>
          <td class="num">
            {{ getAreaAmount(e, 'Main House') ? peso(getAreaAmount(e, 'Main House')) : '—' }}
          </td>
          <td class="num">{{ getAptsOtherAmount(e) ? peso(getAptsOtherAmount(e)) : '—' }}</td>
          <td class="num font-semibold text-ink">{{ peso(getExpenseTotal(e)) }}</td>
          <td class="num">
            <button type="button" class="pill-btn" @click="startEditExpense(e)">
              <Pencil class="size-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </td>
        </tr>
      </template>

      <template #card="{ row: group }">
        <div class="flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <p class="text-sm font-semibold text-ink">{{ group.dateStr }}</p>
          <p class="tabular text-sm font-semibold text-ink">{{ peso(group.dayTotal) }}</p>
        </div>

        <ul class="mt-3 space-y-4">
          <li v-for="e in group.records" :key="e.id">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium leading-snug text-ink">{{ e.description }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">{{ e.category }}</p>
              </div>
              <p class="tabular shrink-0 text-sm font-semibold text-ink">
                {{ peso(getExpenseTotal(e)) }}
              </p>
            </div>

            <dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div v-if="getAreaAmount(e, 'Boarding House')" class="flex gap-1.5">
                <dt class="text-ink-faint">Boarding house</dt>
                <dd class="tabular text-ink">{{ peso(getAreaAmount(e, 'Boarding House')) }}</dd>
              </div>
              <div v-if="getAreaAmount(e, 'Main House')" class="flex gap-1.5">
                <dt class="text-ink-faint">Main house</dt>
                <dd class="tabular text-ink">{{ peso(getAreaAmount(e, 'Main House')) }}</dd>
              </div>
              <div v-if="getAptsOtherAmount(e)" class="flex gap-1.5">
                <dt class="text-ink-faint">Apartments and other</dt>
                <dd class="tabular text-ink">{{ peso(getAptsOtherAmount(e)) }}</dd>
              </div>
            </dl>

            <button
              type="button"
              class="pill-btn mt-3 w-full justify-center"
              @click="startEditExpense(e)"
            >
              <Pencil class="size-3.5" aria-hidden="true" />
              <span>Edit this expense</span>
            </button>
          </li>
        </ul>
      </template>
    </RecordTable>

    <!-- Record Expense Modal (Supports Multiple Entries) -->
    <WsModal
      v-if="isAddOpen"
      title="Record an expense"
      subtitle="Several entries at once, each split across the property areas."
      size="lg"
      :dismissible="false"
      @close="isAddOpen = false"
    >

        <form @submit.prevent="submitAddExpense">
          <div class="p-6 space-y-4 text-xs text-ink max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <label class="ws-field w-full sm:w-64">
              Date it was spent
              <input v-model="date" type="date" class="ws-input w-full" required />
            </label>

            <!-- Dynamic Entries List -->
            <div class="space-y-4">
              <div 
                v-for="(entry, index) in formEntries" 
                :key="index" 
                class="relative p-4 bg-canvas border border-line rounded-tile space-y-3"
              >
                <!-- Header with Item Index and Remove Item Button -->
                <div class="flex items-center justify-between pb-2 border-b border-line/70">
                  <span class="font-semibold text-xs text-ink">
                    Expense Item #{{ index + 1 }}
                  </span>
                  <button 
                    v-if="formEntries.length > 1" 
                    type="button" 
                    @click="removeFormEntry(index)" 
                    class="pill-btn text-overdue hover:bg-overdue-soft hover:border-overdue-soft min-h-7 py-0.5 px-2 text-xs gap-1 inline-flex items-center cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 class="size-3 text-overdue" />
                    <span>Remove Item</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label class="ws-field">
                    What it was for
                    <input
                      v-model="entry.desc"
                      placeholder="OR #88240, supplies"
                      class="ws-input w-full"
                      required
                    />
                  </label>

                  <label class="ws-field">
                    Kind of expense
                    <select v-model="entry.category" class="ws-select w-full" required>
                      <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </label>
                </div>

                <!-- Allocations / Splits Section -->
                <div class="border-t border-line/70 pt-3 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-ink-soft">Property Area Allocations (Splits)</span>
                    <span class="text-xs text-ink-soft">Cost distribution</span>
                  </div>
                  
                  <div class="space-y-2">
                    <div 
                      v-for="(alloc, aIdx) in entry.allocations" 
                      :key="aIdx" 
                      class="flex items-center gap-3 bg-tile p-3 border border-line rounded-xl"
                    >
                      <label class="ws-field flex-1">
                        Which part of the property
                        <select v-model="alloc.area" class="ws-select w-full" required>
                          <option
                            v-for="areaOption in PROPERTY_AREA_OPTIONS"
                            :key="areaOption.value"
                            :value="areaOption.value"
                          >{{ areaOption.label }}</option>
                        </select>
                      </label>

                      <label class="ws-field w-36 sm:w-44">
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
                          class="icon-btn size-11 text-overdue hover:bg-overdue-soft"
                          aria-label="Take this part of the property off the split"
                          @click="removeAllocation(index, aIdx)"
                        >
                          <Trash2 class="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Add Split Area button -->
                  <div class="pt-1">
                    <button 
                      type="button" 
                      @click="addAllocation(index)" 
                      class="pill-btn text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                    >
                      <Plus class="size-3.5 text-brand" />
                      <span>Split across another area</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Another Item Button -->
            <div>
              <button 
                type="button" 
                @click="addFormEntry" 
                class="pill-btn min-h-10 text-xs px-3.5 py-2 gap-1.5 inline-flex items-center cursor-pointer"
              >
                <Plus class="size-4 text-brand" />
                <span>Add Another Expense Item</span>
              </button>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="p-4 px-6 border-t border-line flex items-center justify-end gap-2 bg-canvas">
            <button type="button" @click="isAddOpen = false" class="pill-btn cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand cursor-pointer disabled:opacity-50 min-w-[110px]">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Save Entries</span>
            </button>
          </div>
        </form>
    </WsModal>

    <!-- Edit Expense Modal -->
    <WsModal
      v-if="isEditOpen"
      title="Edit this expense"
      subtitle="Change its category and how it splits across the property areas."
      size="lg"
      :dismissible="false"
      @close="isEditOpen = false"
    >

        <form @submit.prevent="handleEditExpense">
          <div class="p-6 space-y-4 text-xs text-ink max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <label class="ws-field w-full sm:w-64">
              Expense Date
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
              Description &amp; Receipt #
                <input 
                  v-model="editDesc" 
                  placeholder="e.g. OR #88240 — supplies" 
                  class="ws-input w-full" 
                  required 
                />
              </label>

              <label class="ws-field">
              Expense Category
                <select 
                  v-model="editCategory" 
                  class="ws-select w-full" 
                  required
                >
                  <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
            </div>

            <!-- Allocations / Splits Section -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <label class="block font-semibold text-xs text-ink-soft">
                  Property Area Allocations (Splits)
                </label>
                <span class="text-xs text-ink-soft">Distribute cost across boarding house &amp; main house</span>
              </div>

              <div class="space-y-2">
                <div 
                  v-for="(alloc, aIdx) in editAllocations" 
                  :key="aIdx" 
                  class="flex items-center gap-3 bg-canvas p-3 border border-line rounded-xl"
                >
                  <label class="ws-field flex-1">
                    Which part of the property
                    <select v-model="alloc.area" class="ws-select w-full" required>
                      <option
                        v-for="areaOption in PROPERTY_AREA_OPTIONS"
                        :key="areaOption.value"
                        :value="areaOption.value"
                      >{{ areaOption.label }}</option>
                    </select>
                  </label>

                  <label class="ws-field w-36 sm:w-44">
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
                      class="icon-btn size-11 text-overdue hover:bg-overdue-soft"
                      aria-label="Take this part of the property off the split"
                      @click="removeEditAllocation(aIdx)"
                    >
                      <Trash2 class="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Add Split Area button -->
              <div class="pt-1">
                <button 
                  type="button" 
                  @click="addEditAllocation" 
                  class="pill-btn text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                >
                  <Plus class="size-3.5 text-brand" />
                  <span>Split across another area</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Actions Footer: Delete on the left, Cancel/Save on the right -->
          <div class="p-4 px-6 border-t border-line flex items-center justify-between gap-3 bg-canvas">
            <button
              v-if="editingExpense"
              type="button"
              @click="handleDeleteFromEditModal"
              class="pill-btn text-overdue hover:bg-overdue-soft hover:border-overdue-soft min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <Trash2 class="size-3.5 text-overdue" />
              <span>Delete Expense</span>
            </button>
            <div v-else />

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditOpen = false" class="pill-btn cursor-pointer">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand cursor-pointer disabled:opacity-50 min-w-[110px]">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
                <span>Update Entry</span>
              </button>
            </div>
          </div>
        </form>
    </WsModal>

    <!-- Confirmation -->
    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Delete entry"
      destructive
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
