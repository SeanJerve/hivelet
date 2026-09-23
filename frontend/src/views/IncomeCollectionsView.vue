<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { periodEnd, propertyToday } from '@/lib/propertyDate';
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  incomeRecords, 
  fetchIncomeRecords, 
  isOnsitePaymentModalOpen, 
  rooms, 
  roomsFetchFailed,
  showToast, 
  fetchTenants, 
  formatUnitOccupantsSummary,
  incomeRecordsFetchFailed,
  type IncomeRecord
} from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { downloadReport } from '@/lib/downloadReport';
import { Plus, Search, Pencil, Trash2, X, Loader2, Check, FileSpreadsheet, Table as TableIcon, ChevronDown } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import MonthCapsules from '@/components/overview/MonthCapsules.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import type { CapsuleMonth } from '@/components/overview/types';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import PillSelect from '@/components/ui/PillSelect.vue';

const route = useRoute();
const activeTab = ref<'ledger' | 'verify'>('ledger');

interface ApiIncome {
  id: string;
  room_id: string;
  date_paid: string;
  contact_name: string;
  invoice_number: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  occupants: number;
  fifty_percent_share: number;
  water_payment: number;
  gbg_fee: number;
  remitted_amount: number;
  payment_method: string;
  rooms?: { room_number: string; cluster_code: string };
}

interface ApiPendingPayment {
  id: string;
  amount: number;
  payment_method: string;
  verification_status: string;
  transaction_reference: string;
  paid_at: string;
  profiles?: { full_name: string; phone_number: string };
  rooms?: { room_number: string; cluster_code: string };
  bills?: { rent_amount: number; water_amount: number; total_amount: number };
}

const q = ref('');
const selectedCluster = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Month and Year Filters
const filterMonth = ref('All');
const filterYear = ref('All');
const viewMode = ref<'grouped' | 'flat'>('grouped');

/**
 * Which cluster sections are open.
 *
 * All five used to render at once, which made this screen six viewports tall
 * before anyone had asked to read a single entry. The header of a closed
 * section still carries its subtotals, so the page reads as a summary of the
 * five and you open the one you actually want.
 *
 * The first opens by default, because a screen that starts entirely closed
 * looks broken.
 */
const openClusters = ref<Record<string, boolean>>({});

function isClusterOpen(key: string, index: number) {
  return openClusters.value[key] ?? index === 0;
}

function toggleCluster(key: string, index: number) {
  openClusters.value[key] = !isClusterOpen(key, index);
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

// Derived from the ledger, not a literal list. It was `['All','2026','2025','2024']`,
// which would have stopped offering the current year the moment 2027 began.
const yearsList = computed(() => {
  const years = new Set<string>();
  for (const r of incomeRecords) if (r.year) years.add(String(r.year));
  // The property's year, not the viewer's - `lib/propertyDate.ts` exists so both
  // anchor to Legazpi rather than to whoever is looking. A browser behind UTC+8
  // is still in the old year for its first eight hours of January.
  years.add(propertyToday().slice(0, 4));
  return ['All', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
});

const yearOptions = computed(() =>
  yearsList.value.map((y) => ({
    value: y,
    label: y === 'All' ? 'Every year' : y,
  }))
);

function formatDateForDisplay(dStr: string): string {
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const pendingPayments = ref<ApiPendingPayment[]>([]);

/**
 * Whether the last attempt to load the verification queue failed.
 *
 * Without this, a failed fetch left the list empty and the panel below rendered
 * its empty state: a green shield reading "All Remittances Verified". That is an
 * affirmative false statement - the system had not verified anything, it had
 * failed to ask. An administrator reading it would reasonably stop looking.
 *
 * Empty and unknown are different things, and the screen has to say which.
 */
const pendingPaymentsError = ref<string | null>(null);

async function fetchPayments() {
  try {
    const data = await api.get<ApiPendingPayment[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
    pendingPaymentsError.value = null;
  } catch (err: any) {
    // Do NOT leave the list empty and silent - see the note on
    // `pendingPaymentsError`. The previous rows are kept on screen rather than
    // cleared, so a transient failure does not make payments appear to vanish.
    pendingPaymentsError.value = err?.message || 'The verification queue could not be loaded.';
  }
}

async function fetchIncome() {
  isLoading.value = true;
  try {
    await Promise.allSettled([
      fetchPayments(),
      fetchIncomeRecords()
    ]);
  } catch (err) {
    console.warn('Fetch income failed, using local state:', err);
  } finally {
    isLoading.value = false;
  }
}

async function verifyPayment(paymentId: string, status: 'Verified' | 'Rejected') {
  isLoading.value = true;
  try {
    await api.patch(`/admin/payments/${paymentId}/verify`, {
      verification_status: status
    });
    if (status === 'Verified') {
      // BR-035: the 50% column is described only as what it arithmetically is.
      // This said "50% revenue share calculated", which names a purpose for it -
      // forbidden as squarely as naming a party, and read by the owner every time
      // she verified a payment.
      showToast('success', 'Payment Verified & Settled', 'Income record written to the ledger. The 50% column is computed as half the rent amount.');
    } else {
      showToast('warning', 'Payment Rejected', 'Bill remains marked as Due.');
    }
    await fetchIncome();
  } catch (err: any) {
    showToast('error', 'Verification Error', err.message || 'Action failed.');
  } finally {
    isLoading.value = false;
  }
}

/**
 * The configured water rates, from `GET /api/public/rates`. BR-014 / BR-036.
 *
 * This view validated water against a hardcoded `occupants * 200`, with `LF` and
 * `LB` pinned at 400 and 200, and required the figure to be a whole multiple of
 * 200. `OnsitePaymentModal` was moved onto the configured rate; this form - the
 * one the owner uses to correct the ledger - was not, so the moment she changes
 * the rate in settings the two disagree and this one rejects a correct entry.
 *
 * The seeded values remain as the fallback, so a failed fetch degrades to
 * today's behaviour rather than to no validation at all.
 */
const waterRatePerOccupant = ref<number | null>(null);
const lindaFixedWaterCharges = ref<Record<string, number> | null>(null);

async function loadWaterRates() {
  try {
    const r = await api.get<{
      waterRatePerOccupant: number;
      lindaFixedWaterCharges: Record<string, number>;
    }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
    lindaFixedWaterCharges.value = r?.lindaFixedWaterCharges ?? null;
  } catch {
    // Left null; the seeded defaults below apply.
  }
}

/**
 * The two water rates as text, for the places this screen states them.
 *
 * It already fetches both, to validate what the owner types. It then printed
 * them again as literals - "₱200 a head, each month" on the Water tile and
 * "₱400.00 / month" and "₱200.00 / month" on the Linda card - so the
 * screen could tell her one rate while the field beside it enforced another.
 * The moment she changes a rate in settings, the copy she reads and the rule
 * she is held to disagree, on the same page.
 *
 * Neither names a figure it does not have. A rate is the kind of thing that is
 * either known or worth saying is not.
 */
function perOccupantWaterText(): string {
  return waterRatePerOccupant.value !== null
    ? `${peso(waterRatePerOccupant.value)} a head, each month`
    : 'Per registered occupant, each month';
}

function lindaWaterText(code: 'LF' | 'LB'): string {
  const fixed = lindaFixedWaterCharges.value?.[code];
  return typeof fixed === 'number' ? `${peso(fixed, 2)} / month` : 'the rate set in settings';
}

onMounted(() => {
  if (route.query.tab === 'verify') {
    activeTab.value = 'verify';
  }
  fetchIncome();
  loadWaterRates();
});

/**
 * Every narrowing EXCEPT the cluster.
 *
 * Split out so the cluster chips below can count what each one would actually
 * give you, from the same predicate the list itself uses. A count and a list
 * computed separately are two things that can disagree, and the number is the
 * one nobody checks.
 *
 * The date handling is the original's, unchanged: a row whose `datePaid` will
 * not parse is left in rather than silently dropped, and a row with no date at
 * all is excluded only once a month or year has actually been asked for.
 */
function matchesExceptCluster(r: IncomeRecord): boolean {
  const query = q.value.toLowerCase().trim();
  if (
    query &&
    !r.unit.toLowerCase().includes(query) &&
    !r.contact.toLowerCase().includes(query) &&
    !r.invoice.toLowerCase().includes(query)
  ) {
    return false;
  }

  if (r.datePaid && r.datePaid !== '—') {
    const d = new Date(r.datePaid);
    if (!isNaN(d.getTime())) {
      if (filterYear.value !== 'All' && String(d.getFullYear()) !== filterYear.value) return false;
      if (
        filterMonth.value !== 'All' &&
        d.toLocaleString('en-US', { month: 'short' }) !== filterMonth.value
      ) {
        return false;
      }
    }
  } else if (filterYear.value !== 'All' || filterMonth.value !== 'All') {
    return false;
  }

  return true;
}

const rows = computed(() =>
  incomeRecords.filter(
    (r) =>
      matchesExceptCluster(r) &&
      (selectedCluster.value === 'All' || r.cluster === selectedCluster.value)
  )
);

/**
 * The counts, which are also the filter.
 *
 * The same control the room and rate directory uses, for the same reason: the
 * figures and the way of narrowing the list are one thing rather than two that
 * can drift. This was a dropdown, which said nothing about how much was in
 * each cluster until you picked one and looked.
 *
 * Counted over everything the OTHER filters already allow, so a chip reading
 * 12 gives twelve rows when pressed. Counting the whole ledger instead would
 * promise rows that the month and year in force would then withhold.
 */
const clusterChips = computed(() => {
  const inScope = incomeRecords.filter(matchesExceptCluster);
  return [
    { key: 'All', label: 'Every cluster', count: inScope.length },
    ...CLUSTERS.map((c) => ({
      key: c as string,
      label: c as string,
      count: inScope.filter((r) => r.cluster === c).length,
    })),
  ];
});

const totalRent = computed(() => rows.value.reduce((s, r) => s + r.rent, 0));
/**
 * Half of Rent Amount, summed over BH rows only. BR-035.
 *
 * The scope matters and was not stated anywhere on screen: this is not half of
 * the whole ledger. Half of every row's rent is P3,886,125; this figure is
 * P2,343,375 because only the Boarding House cluster carries the column in the
 * landlady's spreadsheet. The card now says so.
 *
 * Described only as a system-computed figure equal to half the row's Rent
 * Amount, retained so the ledger reconciles with the historical spreadsheet.
 */
const totalShare = computed(() => rows.value.reduce((s, r) => s + (r.cluster === 'BH' ? (r.rent / 2) : 0), 0));
const totalWater = computed(() => rows.value.reduce((s, r) => s + r.water, 0));
const totalGarbage = computed(() => rows.value.reduce((s, r) => s + r.garbage, 0));
/**
 * The spreadsheet's own bottom line: BH rows at half their rent, every other
 * cluster at full rent, plus water throughout.
 *
 * CAREFUL - this is NOT `monthly_income_records.remitted_amount`. That column is
 * `GENERATED ALWAYS AS (rent_amount + water_payment)` per BR-038 and sums to
 * P8,086,250; this figure is P5,742,875. Two different quantities were both
 * being called "Total Remitted", one on screen and one in the database, and a
 * panelist comparing the two would have found a P2.3M discrepancy with no
 * explanation. Both are now shown, each labelled with the arithmetic it performs.
 */
const totalSpreadsheetLine = computed(() =>
  rows.value.reduce((s, r) => s + (r.cluster === 'BH' ? (r.rent / 2) : r.rent) + r.water, 0)
);

/** BR-038, matching the generated column exactly: Rent Amount + Water Payment. */
const totalRemitted = computed(() => rows.value.reduce((s, r) => s + r.rent + r.water, 0));

/**
 * Collections by month, for the same capsule chart the overview uses.
 *
 * Built from the rows already on screen, so it answers to the filters above it.
 * A month with no row is `unentered` rather than zero: this ledger is entered by
 * hand and a blank month means nobody has typed it in yet, which is a different
 * fact from having collected nothing. The overview makes the same distinction.
 *
 * When a single month is being filtered for, the chart would be one capsule and
 * eleven blanks, so it is not drawn at all.
 */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;

const collectionsByMonth = computed<CapsuleMonth[]>(() => {
  const totals = new Array(12).fill(0);
  const seen = new Array(12).fill(false);

  for (const r of rows.value) {
    if (!r.datePaid || r.datePaid === '—') continue;
    const d = new Date(r.datePaid);
    if (isNaN(d.getTime())) continue;
    const m = d.getMonth();
    seen[m] = true;
    totals[m] += r.rent + r.water + r.garbage;
  }

  return MONTH_SHORT.map((short, i) => ({
    short,
    long: MONTH_FULL[i],
    kind: seen[i] ? ('recorded' as const) : ('unentered' as const),
    value: seen[i] ? totals[i] : null,
  }));
});

const showMonthChart = computed(() => filterMonth.value === 'All' && rows.value.length > 0);

/**
 * What the money on screen is made of. A true part-to-whole: rent, water and
 * the garbage fee add up to what was collected, so a bar is honest here.
 */
const collectionParts = computed(() => [
  { label: 'Rent', value: totalRent.value, tone: 'brand' as const },
  { label: 'Water', value: totalWater.value, tone: 'bright' as const },
  { label: 'Garbage', value: totalGarbage.value, tone: 'soft' as const },
]);

const collectedAltogether = computed(() => totalRent.value + totalWater.value + totalGarbage.value);

// Grouped rows matching Excel's 5 physical sub-sections
const clusterGroups = computed(() => {
  const definitions = [
    { 
      key: 'BH', 
      label: 'Boarding House ("BH")', 
      desc: '22 Rentable Rooms · Column 6 retained for spreadsheet parity', 
      hasShareColumn: true, 
      units: ['1A', '1B', '1C', '1D', '1E', '1F', '1G', '1H', '2A', '2B', '2C', '2D', '2E', '2F', '2G', '3A', '3B', '3C', '3D', '3E', '3F', '3G'] 
    },
    { 
      key: 'Back Apartment', 
      label: 'Back Apartment', 
      desc: '5 Self-Contained Units · 100% Single Owner Revenue', 
      hasShareColumn: false, 
      units: ['B1F', 'B2F', 'B2B', 'B3F', 'B3B'] 
    },
    { 
      key: 'Penthouse', 
      label: 'Penthouse', 
      desc: '1 Top-Floor Suite (PH)', 
      hasShareColumn: false, 
      units: ['PH'] 
    },
    { 
      key: 'Front Apartment', 
      label: 'Front Apartment', 
      desc: '3 Multi-Room Apartments · High-Capacity Units', 
      hasShareColumn: false, 
      units: ['F1', 'F2F', 'F2B'] 
    },
    { 
      key: 'Linda', 
      label: 'Linda Commercial & Annex', 
      desc: '2 Commercial Spaces (*LF, *LB) · Submeter Electric Reimbursement', 
      hasShareColumn: false, 
      units: ['LF', 'LB', '*LF', '*LB'] 
    }
  ];

  return definitions.map(def => {
    const groupRecords = rows.value.filter(r => {
      const u = r.unit.toUpperCase();
      return def.units.includes(u) || r.cluster === def.key;
    });

    const gRent = groupRecords.reduce((sum, r) => sum + r.rent, 0);
    const gShare = def.hasShareColumn ? gRent / 2 : 0;
    const gOccupants = groupRecords.reduce((sum, r) => sum + r.occupants, 0);
    const gWater = groupRecords.reduce((sum, r) => sum + r.water, 0);
    const gGarbage = groupRecords.reduce((sum, r) => sum + r.garbage, 0);
    const gRemitted = groupRecords.reduce((sum, r) => sum + (def.hasShareColumn ? (r.rent / 2) : r.rent) + r.water, 0);

    return {
      ...def,
      records: groupRecords,
      totalRent: gRent,
      totalShare: gShare,
      totalOccupants: gOccupants,
      totalWater: gWater,
      totalGarbage: gGarbage,
      totalRemitted: gRemitted
    };
  }).filter(g => g.records.length > 0);
});

// Custom Confirmation Modal state
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

// Edit Income State
const isEditOpen = ref(false);
const editingIncome = ref<IncomeRecord | null>(null);

const editUnit = ref('1a');
// Zero rather than a plausible figure: an unset field should read as empty,
// not as a rent someone might not notice is wrong.
const editRent = ref(0);
const editWater = ref(400);
const editGarbage = ref(0);
const editInvoice = ref('');
const editDate = ref('');
/**
 * `payment_method_type` is (Cash | GCash | Bank Transfer | Adyen Online).
 *
 * This form is the ledger's twin of the on-site payment modal fixed in 4170dfd, and it had
 * the same two-option dropdown - "Cash" and "Online Payment", filed as GCash - beside a box
 * asking for a "Gcash / Bank Ref #".
 *
 * 'Adyen Online' is never OFFERED, because only the gateway's webhook may assert that money
 * came through Adyen. It is accepted as a loaded value and shown disabled, so opening a
 * gateway-created receipt to correct a typo puts the method back unchanged instead of
 * quietly restating how the money arrived.
 */
const editMethod = ref<'Cash' | 'GCash' | 'Bank Transfer' | 'Adyen Online'>('Cash');

const editUnitOptions = computed(() =>
  rooms.map((r) => ({
    value: r.unitCode,
    label: `${r.unitCode.toUpperCase()} — ${r.tenant || 'Vacant'} (${r.cluster})`,
  }))
);

const editMethodOptions = computed(() => {
  const base = [
    { value: 'Cash', label: 'Cash' },
    { value: 'GCash', label: 'GCash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
  ];
  if (editMethod.value === 'Adyen Online') {
    base.push({ value: 'Adyen Online', label: 'Adyen Online (gateway)' });
  }
  return base;
});

/** Cash has no reference to record; every other method does. */
const methodHasReference = computed(() => editMethod.value !== 'Cash');
const editReference = ref('');
const editMonthsCovered = ref(1);
const editDateCoveredStart = ref('');

/**
 * BR-034 - the occupant count on this receipt.
 *
 * It was derived from the live tenancy and never shown, so the rule's
 * "and is editable" half had nowhere to happen. Water is occupants x rate
 * (BR-014), so when a roommate had moved out and the tenancy had not been
 * updated yet, the receipt was written at the stale headcount and the
 * administrator had no way to correct it without leaving the form.
 *
 * Defaults to the tenancy's count, which is the carry-forward the rule asks for.
 * A different figure is accepted and the divergence is recorded in the audit log.
 */
const editOccupants = ref(1);

const editDateCoveredEnd = computed(() => {
  // Same rule as the server, and as the on-site payment form. See lib/propertyDate.
  return periodEnd(editDateCoveredStart.value, editMonthsCovered.value);
});

const editTotal = computed(() => {
  return (Number(editRent.value) || 0) + (Number(editWater.value) || 0) + (Number(editGarbage.value) || 0);
});

function startEditIncome(r: IncomeRecord) {
  editingIncome.value = r;
  editUnit.value = r.unit.toUpperCase();
  editRent.value = r.rent;
  editWater.value = r.water;
  editGarbage.value = r.garbage;
  editInvoice.value = r.invoice;
  
  /**
   * `r.rawDate`, not a re-parse of `r.datePaid`.
   *
   * `datePaid` is already a formatted display string ("Jan 31, 2026"), built by
   * `formatDateOnly` for a viewer in any timezone. `new Date(r.datePaid)` parses
   * that human-readable string as LOCAL midnight (it is not ISO 8601), and
   * `propertyDate(d)` then reads that instant back at the property's zone - two
   * more zone conversions stacked on a value that was already timezone-safe.
   * For an admin working from a browser west of the property, this silently
   * wrote a day earlier than the record actually held on every edit, whatever
   * field was being corrected. `rawDate` is the untouched `YYYY-MM-DD` the
   * column holds; slicing it needs no `Date` and no zone at all.
   */
  if (r.rawDate) {
    editDate.value = r.rawDate;
  } else {
    editDate.value = propertyToday();
  }

  editMonthsCovered.value = 1;
  // BR-033 - left blank so the server derives the period from the tenant's own
  // anniversary cycle. This used to default to the DATE PAID, so a tenant on a
  // 13th-of-the-month cycle paying on the 20th had the period recorded as
  // starting on the 20th, and the ledger's "Rent For" drifted off the cycle one
  // receipt at a time. Typing a date still overrides, which back-dated
  // corrections need - the divergence is recorded in the audit log.
  editDateCoveredStart.value = '';

  // BR-034 - carried forward from the tenancy, and editable from here.
  const occSummary = formatUnitOccupantsSummary(editUnit.value);
  const occRoom = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
  // `rooms` is SEEDED, and the seed carries invented occupant counts. When the
  // fetch failed, `occRoom.occupants` is one of those - and occupants set the
  // water line on the receipt about to be saved, so a seeded 3 overcharges a
  // resident by ₱400. Fall through to 1 rather than to a made-up figure; the
  // banner below tells the administrator to enter it herself.
  editOccupants.value = occSummary.count > 0
    ? occSummary.count
    : (roomsFetchFailed.value ? 1 : (occRoom?.occupants || 1));
  /**
   * Put back what the row actually held.
   *
   * These two lines read `editMethod.value = 'Cash'` and `editReference.value = ''`,
   * discarding the record's own values - and the payload below then PATCHed 'Cash' over the
   * top. Correcting a typo in the rent amount therefore rewrote how the money was received
   * and dropped its reference number. Every one of the 937 live rows is Cash with no
   * reference, so nothing has been lost; it became reachable the moment 4170dfd made GCash
   * and Bank Transfer recordable.
   */
  const loadedMethod = r.paymentMethod === 'GCash' || r.paymentMethod === 'Bank Transfer' || r.paymentMethod === 'Adyen Online'
    ? r.paymentMethod
    : 'Cash';
  editMethod.value = loadedMethod;
  editReference.value = r.transactionReference || '';

  isEditOpen.value = true;
}

function handleDeleteIncome(id: string, invoice: string, unit: string) {
  showConfirm(
    'Void Payment Record',
    `Are you sure you want to void the payment of unit ${unit.toUpperCase()} with Invoice/OR #${invoice}? This action cannot be undone.`,
    async () => {
      try {
        await api.delete(`/admin/income-records/${id}`);
        const idx = incomeRecords.findIndex(r => r.id === id);
        if (idx !== -1) {
          incomeRecords.splice(idx, 1);
        }
        showToast('success', 'Payment deleted', `Voided invoice #${invoice} successfully.`);
      } catch (err: any) {
        showToast('error', 'Delete failed', err.message || 'Server error occurred');
      }
    }
  );
}

function handleDeleteFromModal() {
  if (!editingIncome.value) return;
  const id = editingIncome.value.id || '';
  const inv = editingIncome.value.invoice;
  const u = editingIncome.value.unit;
  isEditOpen.value = false;
  handleDeleteIncome(id, inv, u);
}

async function handleEditIncome() {
  if (!editingIncome.value) return;
  const invalid = Number(editRent.value) < 0 || Number(editWater.value) < 0 || Number(editGarbage.value) < 0;
  if (invalid) {
    showToast('error', 'Validation Error', 'Amounts cannot be negative.');
    return;
  }

  const unitUpper = editUnit.value.toUpperCase();
  const room = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
  const summary = formatUnitOccupantsSummary(editUnit.value);
  // What the administrator confirmed on the form, falling back to the tenancy.
  const carriedForward = summary.count > 0
    ? summary.count
    : (roomsFetchFailed.value ? 1 : (room?.occupants || 1));
  const occupants = Number(editOccupants.value) > 0 ? Number(editOccupants.value) : carriedForward;
  // BR-014 / BR-040 - the configured rate, with the seeded value as the fallback.
  const perOccupantRate = waterRatePerOccupant.value ?? 200;
  const lindaFixed = lindaFixedWaterCharges.value?.[unitUpper];

  let waterBaseline = occupants * perOccupantRate;
  let isLindaUnit = false;
  if (lindaFixed !== undefined) {
    waterBaseline = lindaFixed;
    isLindaUnit = true;
  } else if (unitUpper === 'LF' || unitUpper === 'LB') {
    // Only reached if the rates fetch failed; these are the seeded charges.
    waterBaseline = unitUpper === 'LF' ? 400 : 200;
    isLindaUnit = true;
  }

  const waterVal = Number(editWater.value) || 0;
  if (waterVal !== 0) {
    if (waterVal < waterBaseline) {
      showToast('error', 'Water Payment Error', `Water payment for ${unitUpper} cannot be lower than the limit of ₱${waterBaseline} for ${occupants} occupant(s) unless it is ₱0.`);
      return;
    }
    // The multiple only applies to per-occupant units. LF and LB are on a fixed
    // charge (BR-040), so a figure that is not a multiple of the per-occupant
    // rate is correct for them and must not be refused.
    if (!isLindaUnit && waterVal % perOccupantRate !== 0) {
      showToast('error', 'Water Payment Error', `Water payment must be paid in whole multiples of ₱${perOccupantRate} (e.g. 0, ${perOccupantRate}, ${perOccupantRate * 2}, ${perOccupantRate * 3}).`);
      return;
    }
  }

  const oldId = editingIncome.value.id;

  isSubmitting.value = true;
  try {
    const payload = {
      roomNumber: editUnit.value.toUpperCase(),
      datePaid: editDate.value,
      /**
       * BR-037. This dialog has always SHOWN a required GBG Fee, pre-filled it
       * from the row and counted it in the total on screen - and never sent it.
       * The correction was accepted, the toast said "Record Updated", and the
       * refetch put the old figure straight back.
       *
       * The backend schema is `.strict()`, so adding it here alone would have
       * been a 422; `gbgFee` was added there in the same change.
       */
      gbgFee: Number(editGarbage.value) || 0,
      /**
       * `contactName` is deliberately NOT sent.
       *
       * It used to be, recomputed from the unit's CURRENT occupancy:
       * `summary.residents.join(', ')`, falling back to `room?.tenant`, falling
       * back to the literal `'Walk-in Resident'`. This form has no contact
       * field - `startEditIncome` never reads `r.contact` - so correcting a
       * typo in a rent figure rewrote **who paid** as a side effect.
       *
       * `contact_name` is the record of who handed the money over. On a unit
       * that has since changed hands it would be replaced by today's resident,
       * and on a vacant one by a literal. Measured against the live ledger
       * rather than supposed: **396 of 937 rows carry a contact that differs
       * from their unit's current tenant**, and 6 sit on units with no active
       * tenant at all. Editing any of those 402 would have destroyed the payer.
       *
       * `PATCH /admin/income-records` applies this field only `if
       * (contactName)`, so omitting it leaves the stored value untouched -
       * which is the correct behaviour for a field the form does not offer. If
       * the payer ever needs correcting, that wants a field of its own and an
       * audit entry, not a silent recomputation.
       */
      invoiceNumber: editInvoice.value,
      rentAmount: Number(editRent.value) || 0,
      occupants: occupants,
      paymentMethod: editMethod.value,
      transactionReference: methodHasReference.value ? editReference.value : undefined,
      monthsCovered: Number(editMonthsCovered.value) || 1,
      // Omitted when blank, so the server derives both from the anniversary. BR-033.
      ...(editDateCoveredStart.value
        ? { dateCoveredStart: editDateCoveredStart.value, dateCoveredEnd: editDateCoveredEnd.value }
        : {}),
    };

    if (oldId && !oldId.startsWith('INC-MOCK-') && !oldId.startsWith('INC-NEW-')) {
      await api.patch(`/admin/income-records/${oldId}`, payload);
    } else {
      /**
       * Creation is the one case where the contact IS derived from occupancy,
       * and it has to be: `incomeRecordSchema` requires `contactName`, and a
       * brand-new row has no previous payer to preserve. Only the edit above
       * leaves it alone.
       */
      await api.post('/admin/income-records', {
        ...payload,
        contactName:
          summary.residents.length > 0
            ? summary.residents.join(', ')
            : (room?.tenant || 'Walk-in Resident'),
      });
    }

    await fetchIncomeRecords();

    showToast('success', 'Record Updated', `Ledger entry for Unit ${editUnit.value.toUpperCase()} updated.`);
    isEditOpen.value = false;
    editingIncome.value = null;
  } catch (err: any) {
    showToast('error', 'Update Failed', err?.message || 'Could not update income record.');
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * The Monthly Income Report as a real spreadsheet. BR-049.
 *
 * This is the one export on this screen, and it satisfies both BR-030 - the rows
 * leave the system in a format Excel opens - and the stricter BR-049: the
 * documented layout, with the month blocks, the per-cluster subtotals, and Linda
 * kept in her own section rather than folded into the grand total.
 *
 * A CSV button used to sit beside it writing a flat dump of the same rows. CSV
 * cannot express any of that structure, so the two files disagreed about what
 * the ledger looks like, and the flat one was the easier button to reach.
 */
const isExportingExcel = ref(false);

async function exportExcel() {
  if (isExportingExcel.value) return;
  isExportingExcel.value = true;
  // The workbook is a per-year report, so "All Years" falls back to this year
  // rather than silently exporting one of them.
  // The property's year, not the viewer's (lib/propertyDate.ts).
  const year = filterYear.value !== 'All' ? filterYear.value : propertyToday().slice(0, 4);
  try {
    await downloadReport('income', year);
  } finally {
    isExportingExcel.value = false;
  }
}

</script>

<template>
  <!-- `ws-focus` carries the workspace focus ring. See the note on the same
       class in ExpensesLedgerView: the rule is scoped to an ancestor, nothing
       above a view provides one, and without it this screen's controls had
       only the browser's default ring and its search box had none. -->
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Money coming in
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Every payment recorded against a unit, reconciled line for line with the spreadsheet.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!--
          One export, not two. A CSV button sat beside this one writing a flat
          dump, while this writes her actual layout: month blocks, cluster
          subtotals, Linda kept separate. Two buttons meant two files that
          disagreed about what the ledger looks like.
        -->
        <button
          type="button"
          class="pill-btn"
          :disabled="isExportingExcel"
          @click="exportExcel"
        >
          <FileSpreadsheet
            :class="['size-4', isExportingExcel && 'animate-pulse']"
            aria-hidden="true"
          />
          <span>{{ isExportingExcel ? 'Building the file' : 'Download for Excel' }}</span>
        </button>

        <button type="button" class="pill-btn-brand" @click="isOnsitePaymentModalOpen = true">
          <Plus class="size-4" aria-hidden="true" />
          <span>Record a payment</span>
        </button>
      </div>
    </div>

    <!--
      The four figures.

      EVERY ONE OF THEM READS `incomeRecordsFetchFailed` FIRST, and that is not
      decoration. They are sums over `rows`, which derives from
      `incomeRecords`, which stays EMPTY when the fetch fails - so without this
      a refused or broken request rendered "₱0" four times over, on the screen
      the owner opens to see money coming in, against a table holding 937 real
      income rows. A failure presented as a financial fact.

      The flag already existed and was already set by `fetchIncomeRecords`.
      AdminOverviewView reads it in six places. This screen - the one that owns
      the data - read it in none, which is the same shape as the dispatch board
      that claimed zero repairs.
    -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewTile title="Collected altogether" tone="night">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          dark
          message="The collections could not be loaded, so no total is shown. That is not the same as nothing having been collected."
          @retry="fetchIncome"
        />
        <template v-else>
          <p class="tabular text-4xl font-semibold leading-none tracking-tight">{{ peso(totalRemitted) }}</p>
          <p class="mt-2 text-sm leading-6 text-on-night-soft">
            Rent plus water, across {{ rows.length }}
            {{ rows.length === 1 ? 'entry' : 'entries' }} (BR-038)
          </p>
        </template>
      </OverviewTile>

      <OverviewTile title="Rent">
        <UnavailableNote v-if="incomeRecordsFetchFailed" :retry="false" message="Not loaded." />
        <template v-else>
          <p class="tabular text-3xl font-semibold leading-none text-ink">{{ peso(totalRent) }}</p>
          <p class="mt-2 text-sm leading-6 text-ink-soft">Before the 50% column is derived</p>
        </template>
      </OverviewTile>

      <OverviewTile title="Water">
        <UnavailableNote v-if="incomeRecordsFetchFailed" :retry="false" message="Not loaded." />
        <template v-else>
          <p class="tabular text-3xl font-semibold leading-none text-ink">{{ peso(totalWater) }}</p>
          <p class="mt-2 text-sm leading-6 text-ink-soft">{{ perOccupantWaterText() }}</p>
        </template>
      </OverviewTile>

      <!-- BR-035 wording is fixed: this is a system-computed figure equal to half
           the row's Rent Amount, retained for parity with the historical
           spreadsheet. It names no recipient and describes no destination.

           This card used to name a party and assert a purpose for the figure,
           both of which the locked wording forbids. The earlier text is not
           quoted here - repeating it would put the banned phrasing back into
           the repository, which is what the rule is for. See BR-035 in
           docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md. -->
      <OverviewTile title="50% Share, on BH rows">
        <UnavailableNote v-if="incomeRecordsFetchFailed" :retry="false" message="Not loaded." />
        <template v-else>
          <p class="tabular text-3xl font-semibold leading-none text-verify">{{ peso(totalShare) }}</p>
          <p class="mt-2 text-sm leading-6 text-ink-soft">
            Half of each row's Rent Amount, computed by the system
          </p>
        </template>
      </OverviewTile>
    </div>

    <!--
      What came in, month by month, and what it was made of. The same two
      components the overview and the expenses ledger draw with, because a
      second chart language on a third screen is how a system stops being one.
    -->
    <div v-if="rows.length > 0" class="grid gap-4 xl:grid-cols-5">
      <OverviewTile
        v-if="showMonthChart"
        :title="`Collected each month${filterYear !== 'All' ? ` in ${filterYear}` : ''}`"
        class="xl:col-span-3"
      >
        <MonthCapsules :months="collectionsByMonth" label="Collections by month" />
      </OverviewTile>

      <!--
        The month chart beside this one hides itself when there are no rows
        (`showMonthChart` requires `rows.length > 0`), so a failed load never
        draws an empty capsule strip. This tile had no such guard and drew the
        whole breakdown at zero: a part-to-whole bar with no parts, "Rent ₱0,
        Water ₱0, Garbage ₱0", and the spreadsheet's own line at ₱0 under it.
      -->
      <OverviewTile title="What it was made of" :class="showMonthChart ? 'xl:col-span-2' : 'xl:col-span-5'">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="The collections could not be loaded, so there is nothing to break down."
          @retry="fetchIncome"
        />
        <template v-else>
        <p class="tabular text-3xl font-semibold leading-none text-ink">
          {{ peso(collectedAltogether) }}
        </p>
        <SegmentBar
          class="mt-4"
          :segments="collectionParts"
          label="Rent, water and the garbage fee as parts of what was collected"
        />
        <dl class="mt-4 space-y-2 text-sm">
          <div
            v-for="part in collectionParts"
            :key="part.label"
            class="flex items-baseline justify-between gap-3"
          >
            <dt class="text-ink-soft">{{ part.label }}</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(part.value) }}</dd>
          </div>
        </dl>
        <!-- Her spreadsheet's own bottom line is a different sum from BR-038's
             remitted_amount, and both were once shown under the same heading. -->
        <p class="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-soft">
          The spreadsheet's own line reads
          <strong class="tabular font-semibold text-ink">{{ peso(totalSpreadsheetLine) }}</strong
          >: BH at half rent, every other cluster at full rent, plus water.
        </p>
        </template>
      </OverviewTile>
    </div>

    <!-- Unified Toolbar: Tabs (Ledger / To verify) + Integrated Search with Switcher Inside + Filters -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-center gap-4 flex-1 min-w-0">
        <!-- Tabs: Ledger or To verify -->
        <div role="tablist" aria-label="Income view" class="flex items-center gap-5 shrink-0">
          <button
            id="income-tab-ledger"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'ledger'"
            aria-controls="income-panel"
            :tabindex="activeTab === 'ledger' ? 0 : -1"
            :class="[
              'press text-sm cursor-pointer py-1 whitespace-nowrap',
              activeTab === 'ledger' ? 'font-bold text-brand' : 'font-normal text-ink-soft hover:text-brand',
            ]"
            @click="activeTab = 'ledger'"
            @keydown.right.prevent="activeTab = 'verify'"
          >
            Ledger
          </button>
          <button
            id="income-tab-verify"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'verify'"
            aria-controls="income-panel"
            :tabindex="activeTab === 'verify' ? 0 : -1"
            :class="[
              'press flex items-center gap-2 text-sm cursor-pointer py-1 whitespace-nowrap',
              activeTab === 'verify' ? 'font-bold text-brand' : 'font-normal text-ink-soft hover:text-brand',
            ]"
            @click="activeTab = 'verify'"
            @keydown.left.prevent="activeTab = 'ledger'"
          >
            <span>To verify</span>
            <span
              v-if="pendingPayments.length > 0"
              class="rounded-full bg-brand-soft text-brand px-2 py-0.5 text-xs tabular font-semibold"
            >
              {{ pendingPayments.length }}
            </span>
          </button>
        </div>

        <template v-if="activeTab === 'ledger'">
          <!-- By cluster / All together switcher -->
          <div
            class="min-h-[2.75rem] h-11 inline-flex items-center rounded-full bg-tile border border-line p-1 shadow-xs shrink-0"
            role="group"
            aria-label="How to show the ledger"
          >
            <button
              type="button"
              :class="[
                'press h-full flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap',
                viewMode === 'grouped' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
              ]"
              :aria-pressed="viewMode === 'grouped'"
              @click="viewMode = 'grouped'"
            >
              <FileSpreadsheet class="size-4" aria-hidden="true" />
              <span>By cluster</span>
            </button>
            <button
              type="button"
              :class="[
                'press h-full flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap',
                viewMode === 'flat' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
              ]"
              :aria-pressed="viewMode === 'flat'"
              @click="viewMode = 'flat'"
            >
              <TableIcon class="size-4" aria-hidden="true" />
              <span>As a list</span>
            </button>
          </div>

          <!-- Standalone Pill Search Bar -->
          <div class="relative w-full sm:w-80 shrink-0">
            <Search
              class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <label for="income-search" class="sr-only">Search the ledger</label>
            <input
              id="income-search"
              v-model="q"
              type="search"
              placeholder="Unit, resident or receipt number"
              class="ws-input w-full pl-11"
            />
          </div>
        </template>
      </div>

      <!--
        Filters: Cluster, Month, Year.

        `shrink-0` is gone, and it was defeating the `flex-wrap` beside it.
        A flex item that cannot shrink is sized at its max-content width, and
        for a wrapping row that is every child on ONE line: 3 x 13rem plus the
        gaps = 640px. So the wrapper never got narrow enough to wrap, and it
        did not shrink either.

        Measured in the running app at a 375px viewport: this row ran to
        x=664 against a content column ending at 351, putting the Month and
        Year filters completely off screen - and `body` carries
        `overflow-x: hidden`, so they were clipped rather than reachable by
        scrolling. Two of the three ways of narrowing this ledger could not be
        used on a phone.

        Fixed once already by stacking all three - functionally correct, and
        the client called three full-width pills in a column messy. Three
        filters do not divide evenly the way the room directory's two do, so
        this keeps the same even pairing that already worked there rather
        than inventing a new ratio: Month and Year are both narrowing WHEN,
        which makes them one decision in two parts, and they share a row.
        Cluster changes WHAT the reader is looking at, a different kind of
        question, and sits alone above them at full width rather than being
        paired with either.
      -->
      <div v-if="activeTab === 'ledger'" class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <PillSelect
          v-model="selectedCluster"
          :options="clusterChips"
          aria-label="Cluster"
          widthClass="w-full sm:w-52"
        />

        <div class="flex items-center gap-2">
          <PillSelect
            v-model="filterMonth"
            :options="monthsList"
            aria-label="Month"
            widthClass="min-w-0 flex-1 sm:w-52 sm:flex-none"
          />

          <PillSelect
            v-model="filterYear"
            :options="yearOptions"
            aria-label="Year"
            align="right"
            widthClass="min-w-0 flex-1 sm:w-52 sm:flex-none"
          />
        </div>
      </div>
    </div>

    <!--
      Verification queue. Each payment is a decision, so it reads as one.

      Switching between "Ledger" and "To verify" used to be a plain DOM swap -
      an entirely different panel replacing the last one on the same frame as
      the click. `ws-reveal` gives the newly-shown panel a fade-in, which is
      a deliberate click a person makes a handful of times, not a keystroke
      that would make the motion feel like it is in the way.
    -->
    <div v-if="activeTab === 'verify'" id="income-panel" role="tabpanel" aria-labelledby="income-tab-verify" class="ws-reveal flex flex-col gap-4">
      <div v-if="isLoading" class="rounded-tile bg-tile p-6 flex flex-col gap-3" aria-busy="true">
        <span class="sr-only" role="status">Loading the verification queue</span>
        <Skeleton class-name="h-4 w-40 rounded-full" />
        <Skeleton class-name="h-20 w-full rounded-2xl" />
      </div>

      <OverviewTile v-else-if="pendingPaymentsError" class="ws-reveal" title="Payments to verify">
        <UnavailableNote
          message="The verification queue could not be loaded. This does not mean there is nothing to verify, it means we could not ask."
          @retry="fetchPayments()"
        />
      </OverviewTile>

      <OverviewTile v-else-if="pendingPayments.length === 0" tone="soft" class="ws-reveal" title="Payments to verify">
        <p class="text-2xl font-semibold tracking-tight">Nothing is waiting</p>
        <p class="text-sm text-ink-soft">
          No online payment is waiting for your decision. GCash payments arrive here through Adyen and count as
          paid once you verify them.
        </p>
      </OverviewTile>

      <template v-else>
        <p class="ws-reveal text-sm leading-6 text-ink-soft">
          Each payment below was sent through Adyen with GCash and is waiting for you. Verifying one marks the
          resident's bill as paid and writes the entry into the ledger, including the 50% Share.
        </p>
        <ul class="grid gap-4 md:grid-cols-2">
          <li
            v-for="(p, i) in pendingPayments"
            :key="p.id"
            class="list-reveal-item rounded-tile bg-tile p-5 sm:p-6 flex flex-col gap-4"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium">{{ p.profiles?.full_name || 'Name not on file' }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">
                  Unit {{ (p.rooms?.room_number || '').toString() || 'not on file' }}<template v-if="p.profiles?.phone_number">, {{ p.profiles.phone_number }}</template>
                </p>
              </div>
              <StatusPill tone="verify">Waiting for you</StatusPill>
            </div>

            <p class="text-3xl leading-none font-semibold tabular tracking-tight">{{ peso(p.amount) }}</p>

            <dl class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
              <div class="flex gap-1.5">
                <dt class="text-ink-faint">Method</dt>
                <dd>{{ p.payment_method }}</dd>
              </div>
              <div class="flex gap-1.5 min-w-0">
                <dt class="text-ink-faint">Reference</dt>
                <dd class="truncate">{{ p.transaction_reference || 'None recorded' }}</dd>
              </div>
              <div v-if="p.paid_at" class="flex gap-1.5">
                <dt class="text-ink-faint">Sent</dt>
                <dd>{{ new Date(p.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }}</dd>
              </div>
            </dl>

            <div class="mt-auto flex flex-wrap gap-2">
              <button type="button" class="pill-btn-brand" @click="verifyPayment(p.id, 'Verified')">
                <Check class="size-4" aria-hidden="true" />
                Verify payment
              </button>
              <button type="button" class="pill-btn-danger-quiet" @click="verifyPayment(p.id, 'Rejected')">
                <X class="size-4" aria-hidden="true" />
                Reject
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>

    <!-- Ledger -->
    <div v-else id="income-panel" role="tabpanel" aria-labelledby="income-tab-ledger" class="ws-reveal space-y-6">



    <!-- `SkeletonTable` is `aria-hidden="true"` throughout, so without an
         announced region a screen reader had nothing to say while the ledger
         table loaded. The "To verify" tab beside this one already pairs its
         own skeleton with a `role="status"` announcement; this tab's table
         skeleton had none. -->
    <span v-if="isLoading" class="sr-only" role="status">Loading the income ledger</span>
    <SkeletonTable v-if="isLoading" :columns="7" :rows="8" />

    <!--
      By cluster: her spreadsheet's own five sections, each with its subtotal.

      "By cluster" and "As a list" are the same rows in two different shapes,
      switched by the pill group above - a deliberate click, so the branch
      that appears gets a fade-in rather than snapping into place the way it
      did before.
    -->
    <div v-else-if="viewMode === 'grouped'" class="ws-reveal space-y-6">
      <!--
        The same empty state the "As a list" half of this screen renders, in
        the same shape - a title and a sentence under it, not one grey line.
        Two ways of reading the same ledger should not disagree about what
        "nothing found" looks like.
      -->
      <div
        v-if="clusterGroups.length === 0"
        class="ws-reveal rounded-tile bg-tile px-6 py-16 text-center"
      >
        <p class="text-base font-semibold text-ink">Nothing matches</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
          No collection answers to what you have asked for.
        </p>
      </div>

      <section
        v-for="(group, groupIndex) in clusterGroups"
        :key="group.key"
        class="overflow-hidden rounded-tile bg-tile"
      >
        <h2>
          <button
            type="button"
            class="press-plate flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left hover:bg-canvas sm:p-6"
            :aria-expanded="isClusterOpen(group.key, groupIndex)"
            :aria-controls="`cluster-${group.key}`"
            @click="toggleCluster(group.key, groupIndex)"
          >
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <ChevronDown
                  :class="[
                    'size-4 shrink-0 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)]',
                    isClusterOpen(group.key, groupIndex) ? '' : '-rotate-90',
                  ]"
                  aria-hidden="true"
                />
                <!-- 0.9375rem, the size every other collapsible section title in
                     the workspace uses - the cluster headers on the room
                     directory and the residents register, and OverviewTile's own
                     heading. This one was a step larger for no reason the screen
                     could give. -->
                <span class="text-[0.9375rem] font-semibold text-ink">{{ group.label }}</span>
              </span>
              <span class="mt-1 block text-sm leading-6 text-ink-soft">{{ group.desc }}</span>
            </span>

            <!-- A closed section still says what it holds. -->
            <span class="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span class="text-right">
                <span class="block text-xs text-ink-faint">Remitted</span>
                <span class="tabular block font-semibold text-brand">{{
                  peso(group.totalRemitted)
                }}</span>
              </span>
              <StatusPill tone="neutral">
                {{ group.records.length }} {{ group.records.length === 1 ? 'entry' : 'entries' }}
              </StatusPill>
              <StatusPill
                v-if="group.hasShareColumn"
                tone="verify"
                title="A system-computed figure equal to half the row's Rent Amount, retained so this ledger reconciles line-for-line with Column 6 of the historical spreadsheet (BR-035)."
              >
                Carries the 50% column
              </StatusPill>
            </span>
          </button>
        </h2>

        <div
          v-if="isClusterOpen(group.key, groupIndex)"
          :id="`cluster-${group.key}`"
          class="ws-reveal border-t border-line p-5 sm:p-6"
        >
          <RecordTable
            flat
            :rows="group.records"
            :caption="`${group.label}, by unit`"
            noun="entry"
            :page-size="8"
            empty-title="Nothing in this cluster"
          >
            <template #head>
              <tr>
                <th scope="col">Unit</th>
                <th scope="col">Paid</th>
                <th scope="col">Who</th>
                <th scope="col" class="num">Rent</th>
                <th v-if="group.hasShareColumn" scope="col" class="num">50% Share</th>
                <th v-if="group.key === 'Linda'" scope="col" class="num">Electricity</th>
                <th scope="col" class="num">Heads</th>
                <th scope="col" class="num">Water</th>
                <th scope="col" class="num">Garbage</th>
                <th scope="col" class="num">Remitted</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </template>

            <template #row="{ row: r }">
              <tr class="group">
                <th scope="row" class="font-semibold uppercase text-ink">{{ r.unit }}</th>
                <td>
                  <span class="block">{{ r.datePaid }}</span>
                  <span class="block text-xs text-ink-faint">{{ r.rentFor }}</span>
                </td>
                <td>
                  <span class="block text-ink">{{ r.contact }}</span>
                  <span v-if="r.invoice" class="block font-mono text-xs text-ink-faint">{{
                    r.invoice
                  }}</span>
                </td>
                <td class="num font-semibold text-ink">{{ peso(r.rent) }}</td>
                <td v-if="group.hasShareColumn" class="num font-semibold text-verify">
                  {{ peso(r.rent / 2) }}
                </td>
                <td v-if="group.key === 'Linda'" class="num font-semibold text-brand">
                  {{ peso(r.linda?.electricity || 0) }}
                </td>
                <td class="num">{{ r.occupants }}</td>
                <td class="num font-semibold text-ink">{{ peso(r.water) }}</td>
                <td class="num">{{ peso(r.garbage) }}</td>
                <td class="num font-semibold text-brand">
                  {{ peso(group.hasShareColumn ? r.rent / 2 + r.water : r.rent + r.water) }}
                </td>
                <td class="num">
                  <button
                    type="button"
                    class="press-plate flex size-9 items-center justify-center rounded-full row-action hover:bg-canvas cursor-pointer"
                    :aria-label="`Edit ${r.contact}'s record`"
                    @click="startEditIncome(r)"
                  >
                    <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </template>

            <template #foot>
              <tr>
                <th scope="row" colspan="3">{{ group.label }}, all {{ group.records.length }}</th>
                <td class="num">{{ peso(group.totalRent) }}</td>
                <td v-if="group.hasShareColumn" class="num text-verify">
                  {{ peso(group.totalShare) }}
                </td>
                <td v-if="group.key === 'Linda'" class="num text-brand">
                  {{ peso(group.records.reduce((sum, r) => sum + (r.linda?.electricity || 0), 0)) }}
                </td>
                <td class="num">{{ group.totalOccupants }}</td>
                <td class="num">{{ peso(group.totalWater) }}</td>
                <td class="num">{{ peso(group.totalGarbage) }}</td>
                <td class="num text-brand">{{ peso(group.totalRemitted) }}</td>
                <td></td>
              </tr>
            </template>

            <!--
              The same subtotal as the `foot` row above it, in the card shape
              this register already uses on a phone. Without it, below `lg`
              every one of these figures disappeared and the cluster header's
              "Remitted" was the only total left on the screen - so a month
              checked on a phone had no breakdown at all.

              Same arithmetic, same fields, same order as the table foot; the
              headcount rides on the Water label the way it does on a row card
              rather than becoming a column of its own.
            -->
            <template #foot-card>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink">
                    {{ group.label }}, all {{ group.records.length }}
                  </p>
                  <p class="mt-0.5 text-xs text-ink-faint">
                    Every entry in this cluster, not only the ones shown
                  </p>
                </div>
                <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
                  {{ peso(group.totalRemitted) }}
                </p>
              </div>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt class="text-xs text-ink-faint">Rent</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(group.totalRent) }}</dd>
                </div>
                <div v-if="group.hasShareColumn">
                  <dt class="text-xs text-ink-faint">50% Share</dt>
                  <dd class="tabular font-semibold text-verify">{{ peso(group.totalShare) }}</dd>
                </div>
                <div v-if="group.key === 'Linda'">
                  <dt class="text-xs text-ink-faint">Electricity</dt>
                  <dd class="tabular font-semibold text-brand">
                    {{ peso(group.records.reduce((sum, r) => sum + (r.linda?.electricity || 0), 0)) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Water, {{ group.totalOccupants }} heads</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(group.totalWater) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Garbage</dt>
                  <dd class="tabular text-ink">{{ peso(group.totalGarbage) }}</dd>
                </div>
              </dl>
            </template>

            <template #card="{ row: r }">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-base font-semibold uppercase leading-none text-ink">{{ r.unit }}</p>
                  <p class="mt-1.5 truncate text-sm text-ink-soft">{{ r.contact }}</p>
                </div>
                <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
                  {{ peso(group.hasShareColumn ? r.rent / 2 + r.water : r.rent + r.water) }}
                </p>
              </div>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt class="text-xs text-ink-faint">Paid</dt>
                  <dd class="text-ink">{{ r.datePaid }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Covering</dt>
                  <dd class="text-ink">{{ r.rentFor }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Rent</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(r.rent) }}</dd>
                </div>
                <div v-if="group.hasShareColumn">
                  <dt class="text-xs text-ink-faint">50% Share</dt>
                  <dd class="tabular font-semibold text-verify">{{ peso(r.rent / 2) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Water, {{ r.occupants }} heads</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(r.water) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Garbage</dt>
                  <dd class="tabular text-ink">{{ peso(r.garbage) }}</dd>
                </div>
              </dl>

              <button
                type="button"
                class="pill-btn mt-4 w-full justify-center"
                @click="startEditIncome(r)"
              >
                <Pencil class="size-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
            </template>
          </RecordTable>
        </div>
      </section>
    </div>

    <!-- All together: every cluster in one register -->
    <RecordTable
      v-else
      class="ws-reveal"
      :rows="rows"
      caption="Every collection on screen, with unit, date, who paid, rent, water, garbage and what was remitted"
      noun="entry"
      :page-size="12"
      empty-title="Nothing matches"
      empty-note="No collection answers to what you have asked for."
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Paid</th>
          <th scope="col">Who</th>
          <th scope="col" class="num">Rent</th>
          <th scope="col" class="num">Heads</th>
          <th scope="col" class="num">Water</th>
          <th scope="col" class="num">Garbage</th>
          <th scope="col" class="num">Remitted</th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: r }">
        <tr class="group">
          <th scope="row">
            <span class="block font-semibold uppercase text-ink">{{ r.unit }}</span>
            <span class="block text-xs font-normal text-ink-faint">{{ r.cluster }}</span>
          </th>
          <td>
            <span class="block">{{ r.datePaid }}</span>
            <span class="block text-xs text-ink-faint">{{ r.rentFor }}</span>
          </td>
          <td>
            <span class="block text-ink">{{ r.contact }}</span>
            <span v-if="r.invoice" class="block font-mono text-xs text-ink-faint">{{
              r.invoice
            }}</span>
          </td>
          <td class="num">
            <span class="block font-semibold text-ink">{{ peso(r.rent) }}</span>
            <span v-if="r.cluster === 'BH'" class="block text-xs font-semibold text-verify">
              50%: {{ peso(r.rent / 2) }}
            </span>
          </td>
          <td class="num">{{ r.occupants }}</td>
          <td class="num font-semibold text-ink">{{ peso(r.water) }}</td>
          <td class="num">{{ peso(r.garbage) }}</td>
          <td class="num font-semibold text-brand">
            {{ peso((r.cluster === 'BH' ? r.rent / 2 : r.rent) + r.water) }}
          </td>
          <td class="num">
            <button
              type="button"
              class="press-plate flex size-9 items-center justify-center rounded-full row-action hover:bg-canvas cursor-pointer"
              :aria-label="`Edit ${r.contact}'s record`"
              @click="startEditIncome(r)"
            >
              <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </template>

      <template #foot>
        <tr>
          <th scope="row" colspan="3">All {{ rows.length }} on screen</th>
          <td class="num">
            <span class="block">{{ peso(totalRent) }}</span>
            <span class="block text-xs text-verify">50% on BH: {{ peso(totalShare) }}</span>
          </td>
          <td class="num">{{ rows.reduce((sum, r) => sum + r.occupants, 0) }}</td>
          <td class="num">{{ peso(totalWater) }}</td>
          <td class="num">{{ peso(totalGarbage) }}</td>
          <!--
            THE COLUMN ABOVE NOW ADDS UP TO THIS.

            It did not. Each Remitted cell puts a BH row at half its rent, so
            the column sums to `totalSpreadsheetLine`; this foot printed
            `totalRemitted`, which is BR-038's rent-plus-water over every row.
            Both figures are correct and they are not the same quantity - one
            is the owner's own spreadsheet bottom line, the other is what the
            generated column in the database holds - but one sat at the foot of
            a column of the other, about ₱2.3M apart on the full ledger, with
            nothing saying why. Anybody adding the column by eye got a different
            answer from the total beneath it.

            Shown the way the Rent cell three columns left already does it: the
            column's own sum first, the other figure named underneath. Nothing
            is re-derived and no stored value changes - both computeds already
            existed.
          -->
          <td class="num text-brand">
            <span class="block">{{ peso(totalSpreadsheetLine) }}</span>
            <span class="block text-xs font-normal text-verify">
              Rent + water: {{ peso(totalRemitted) }}
            </span>
          </td>
          <td></td>
        </tr>
      </template>

      <!--
        The phone half of the `foot` row above. Every figure in it was missing
        below `lg`, on the one screen a landlady is most likely to check away
        from a desk.

        Each figure is the same computed total the table foot prints, taken
        from the same names - nothing is re-derived here.

        The headline is `totalSpreadsheetLine`, matching what the foot now
        leads with, so the phone and the desk agree. `totalRemitted` - BR-038's
        rent-plus-water - is named underneath it rather than dropped, for the
        same reason it is named in the foot: both figures are real, they are
        about ₱2.3M apart on the full ledger, and the one thing that must not
        happen is either appearing without saying which it is.
      -->
      <template #foot-card>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink">All {{ rows.length }} on screen</p>
            <p class="mt-0.5 text-xs text-ink-faint">
              Every entry the filters allow, not only the ones shown
            </p>
          </div>
          <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
            {{ peso(totalSpreadsheetLine) }}
            <span class="block text-xs font-normal text-verify">
              Rent + water: {{ peso(totalRemitted) }}
            </span>
          </p>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-faint">Rent</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(totalRent) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">50% Share, on BH rows</dt>
            <dd class="tabular font-semibold text-verify">{{ peso(totalShare) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">
              Water, {{ rows.reduce((sum, r) => sum + r.occupants, 0) }} heads
            </dt>
            <dd class="tabular font-semibold text-ink">{{ peso(totalWater) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Garbage</dt>
            <dd class="tabular text-ink">{{ peso(totalGarbage) }}</dd>
          </div>
        </dl>
      </template>

      <template #card="{ row: r }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-base font-semibold uppercase leading-none text-ink">{{ r.unit }}</p>
            <p class="mt-1.5 truncate text-sm text-ink-soft">{{ r.cluster }}, {{ r.contact }}</p>
          </div>
          <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
            {{ peso((r.cluster === 'BH' ? r.rent / 2 : r.rent) + r.water) }}
          </p>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-faint">Paid</dt>
            <dd class="text-ink">{{ r.datePaid }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Covering</dt>
            <dd class="text-ink">{{ r.rentFor }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Rent</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(r.rent) }}</dd>
          </div>
          <div v-if="r.cluster === 'BH'">
            <dt class="text-xs text-ink-faint">50% Share</dt>
            <dd class="tabular font-semibold text-verify">{{ peso(r.rent / 2) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Water, {{ r.occupants }} heads</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(r.water) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">Garbage</dt>
            <dd class="tabular text-ink">{{ peso(r.garbage) }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="pill-btn mt-4 w-full justify-center"
          @click="startEditIncome(r)"
        >
          <Pencil class="size-3.5" aria-hidden="true" />
          <span>Edit</span>
        </button>
      </template>
    </RecordTable>

    <!-- Linda Units Separate Reference Card (BR-040) -->
    <div class="rounded-tile bg-tile p-6 space-y-3">
      <div class="flex items-center gap-2">
        <FileSpreadsheet class="size-5 text-accent" />
        <h3 class="font-semibold text-base text-ink">Linda Units Fixed Charge Schedule</h3>
      </div>
      <p class="text-xs text-ink-soft leading-relaxed">
        The two Linda units sit in the separate structure beside the red gate and are billed a
        fixed monthly water charge instead of the per-occupant rate. They are not part of the
        Front Apartment, whose income is never remitted to Linda. The flat electricity charge
        that once applied to unmetered units was retired in September 2026 and is not recorded
        for new periods; historical figures remain visible on past entries.
      </p>

      <div class="grid gap-4 sm:grid-cols-2 pt-2">
        <div class="space-y-1 rounded-2xl bg-canvas p-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-sm text-ink">Linda (LF)</span>
            <StatusPill tone="neutral">A fixed charge</StatusPill>
          </div>
          <p class="text-xs text-ink-soft">Water: <strong>{{ lindaWaterText('LF') }}</strong></p>
        </div>

        <div class="space-y-1 rounded-2xl bg-canvas p-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-sm text-ink">Linda (LB)</span>
            <StatusPill tone="neutral">A fixed charge</StatusPill>
          </div>
          <p class="text-xs text-ink-soft">Water: <strong>{{ lindaWaterText('LB') }}</strong></p>
        </div>
      </div>
    </div>
  </div>

    <!-- Edit Payment Modal -->
    <WsModal
      v-if="isEditOpen"
      title="Edit this collection"
      subtitle="Change what was recorded against this entry."
      size="lg"
      :dismissible="false"
      @close="isEditOpen = false"
    >

        <!--
          The fields scroll; the buttons underneath them do not.

          This dialog builds its own footer inside the form rather than using
          `WsModal`'s actions slot, which is what makes that possible here -
          capping the FIELDS leaves the footer pinned to the bottom of the
          panel where it can always be reached. Measured at 375x812 before
          this change, the form ran past the fold and "Update Collection" was
          both below it and clipped sideways (see the footer's own note).

          `dvh` rather than `vh` for the reason the payment modal states: `vh`
          is the large viewport, measured with the phone's browser bars hidden,
          and this dialog opens while they are showing. `px-1.5 -mx-1.5` keeps
          the 3px focus ring from being clipped by the scroll container, which
          clips on both axes. All of it is off again at `sm`.
        -->
        <form @submit.prevent="handleEditIncome" class="text-xs">
          <div class="space-y-4 max-h-[55dvh] overflow-y-auto px-1.5 -mx-1.5 sm:mx-0 sm:max-h-none sm:overflow-visible sm:px-0">
          <!-- Room/Unit selector -->
          <div>
            <p
              v-if="roomsFetchFailed"
              class="mb-1.5 text-xs leading-snug text-verify"
            >
              The unit list could not be refreshed, so the occupant count has <strong>not</strong>
              been carried forward. Enter it yourself &mdash; it sets the water line on this receipt.
            </p>
            <!-- The warning above belongs to this field, so the label wraps the
                 select rather than sitting beside it unassociated. -->
            <label class="ws-field">
              Unit
              <PillSelect v-model="editUnit" :options="editUnitOptions" aria-label="Unit" widthClass="w-full" />
            </label>
          </div>

          <!-- Rent Amount & Water Payment Row -->
          <!-- Two up on a phone as well: short money fields that read as a
               pair, 146px each at 375 with no overflow. -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <label class="ws-field">
              Rent
              <!--
                `step="any"`: without it, `type="number"` defaults to a whole-number
                step, and the browser's native constraint validation silently blocks
                the submit event on any centavo value - no error, no app code runs,
                just a tooltip the user may not see. `money` (backend/src/utils/
                validators.ts) explicitly allows two decimal places and the columns
                are `numeric(10,2)`, so a real centavo correction on this ledger was
                unsubmittable from this dialog. ExpensesLedgerView's equivalent
                amount field already carries this.
              -->
              <input v-model.number="editRent" type="number" min="0" step="any" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
              Payment for Water (₱)
              <input v-model.number="editWater" type="number" min="0" step="any" class="ws-input w-full" required />
            </label>
          </div>

          <!-- GBG Fee & OR Receipt Number Row -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <label class="ws-field">
              GBG Fee (₱)
              <input v-model.number="editGarbage" type="number" min="0" step="any" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
              OR / Receipt Number
              <input v-model="editInvoice" type="text" placeholder="OR-2026-1055" class="ws-input w-full font-mono" required />
            </label>
          </div>

          <!-- Payment Method & Online Reference Number Row -->
          <!-- Full width on a phone on purpose, unlike the money pairs above:
               a reference is a long string typed off a receipt. -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="ws-field">
              Payment Method
              <PillSelect v-model="editMethod" :options="editMethodOptions" aria-label="Payment method" widthClass="w-full" />
            </label>
            <label class="ws-field" :class="{ 'opacity-40': !methodHasReference }">
              Their reference number
              <input v-model="editReference" type="text" :placeholder="editMethod === 'Bank Transfer' ? 'Bank reference' : 'GCash reference'" class="ws-input w-full" :disabled="!methodHasReference" :required="methodHasReference" />
            </label>
          </div>

          <!-- Rent Validity / Duration Details Row -->
          <!-- FOUR labels in a three-column grid, so on a phone they were four
               full-width controls one under the other. Two up costs nothing:
               `input[type=date]` measures 144px of content in a 146px box. -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <label class="ws-field">
              Months covered
              <input v-model.number="editMonthsCovered" type="number" min="1" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
              How many people
              <input v-model.number="editOccupants" type="number" min="1" max="50" class="ws-input w-full" required />
              <span class="ws-hint">Carried from the tenancy. Water is charged for each of them.</span>
            </label>
            <label class="ws-field">
              Covering from
              <input v-model="editDateCoveredStart" type="date" class="ws-input w-full" />
              <span class="ws-hint">Leave it blank to use the tenant's own billing cycle.</span>
            </label>
            <label class="ws-field">
              Covering to
              <input :value="editDateCoveredEnd" type="date" class="ws-input w-full" disabled />
            </label>
          </div>

          <!-- Date Received & Read-Only Total Amount calculation -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
            <label class="ws-field">
              Date Received
              <input v-model="editDate" type="date" class="ws-input w-full" required />
            </label>
            <div class="bg-canvas border border-line rounded-tile p-3.5 flex flex-col justify-center">
              <span class="text-xs font-semibold text-ink-soft">Total Amount (₱)</span>
              <span class="font-semibold text-lg text-brand pt-0.5">{{ peso(editTotal) }}</span>
            </div>
          </div>

          </div>

          <!--
            THIS IS THE FOOTER THE CLIENT PHOTOGRAPHED WITH "Update Collection"
            CUT OFF AT THE RIGHT EDGE.

            It was `flex items-center justify-between` with no wrapping, so the
            three buttons were laid out on one line whatever the room. Measured
            in the running app at a 375px viewport: the row's content came to
            446px inside a 303px box - 143px of overflow - and the submit
            button's right edge landed at x=482 against a content column that
            ends at 339. `body` carries `overflow-x: hidden`, so it was clipped
            rather than reachable by scrolling sideways: the button that saves
            a correction to the ledger could not be fully seen and its right
            half could not be pressed.

            `flex-wrap-reverse` rather than plain `flex-wrap`, so that when the
            row does break, the line that wraps is drawn ABOVE the other one.
            Cancel and "Update Collection" stay together on top and "Delete
            Record" drops beneath them - the destructive control ends up
            furthest from the thumb rather than first under it.

            At `sm` it is one line again with `justify-between`, which is a
            single flex line, and a single line renders identically under
            `wrap-reverse` - so the desktop footer is untouched.
          -->
          <div class="pt-4 border-t border-line flex flex-wrap-reverse items-center justify-end gap-2 sm:justify-between sm:gap-3">
            <button
              type="button"
              @click="handleDeleteFromModal"
              class="pill-btn-danger-quiet"
            >
              <Trash2 class="size-3.5" />
              <span>Delete Record</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditOpen = false" class="pill-btn">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Update Collection</span>
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
      confirm-label="Delete record"
      destructive
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
