<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { periodEnd, propertyToday, propertyDate } from '@/lib/propertyDate';
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
  type IncomeRecord 
} from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { downloadReport } from '@/lib/downloadReport';
import { Plus, Search, Pencil, Trash2, X, Loader2, Check, FileSpreadsheet, Banknote, ChevronDown } from 'lucide-vue-next';
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
  years.add(String(new Date().getFullYear()));
  return ['All', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
});

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

onMounted(() => {
  if (route.query.tab === 'verify') {
    activeTab.value = 'verify';
  }
  fetchIncome();
  loadWaterRates();
});

const rows = computed(() => {
  return incomeRecords.filter((r) => {
    const matchesCluster = selectedCluster.value === 'All' || r.cluster === selectedCluster.value;
    const query = q.value.toLowerCase().trim();
    const matchesQuery =
      !query ||
      r.unit.toLowerCase().includes(query) ||
      r.contact.toLowerCase().includes(query) ||
      r.invoice.toLowerCase().includes(query);

    let matchesMonth = true;
    let matchesYear = true;
    if (r.datePaid && r.datePaid !== '—') {
      const d = new Date(r.datePaid);
      if (!isNaN(d.getTime())) {
        const itemYear = String(d.getFullYear());
        const itemMonthName = d.toLocaleString('en-US', { month: 'short' }); 
        
        if (filterYear.value !== 'All') {
          matchesYear = itemYear === filterYear.value;
        }
        if (filterMonth.value !== 'All') {
          matchesMonth = itemMonthName === filterMonth.value;
        }
      }
    } else {
      if (filterYear.value !== 'All' || filterMonth.value !== 'All') {
        return false;
      }
    }
    
    return matchesCluster && matchesQuery && matchesMonth && matchesYear;
  });
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
  
  const d = new Date(r.datePaid);
  if (!isNaN(d.getTime())) {
    editDate.value = propertyDate(d);
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
      contactName: summary.residents.length > 0 ? summary.residents.join(', ') : (room?.tenant || 'Walk-in Resident'),
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
      await api.post('/admin/income-records', payload);
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
  const year = filterYear.value !== 'All' ? filterYear.value : String(new Date().getFullYear());
  try {
    await downloadReport('income', year);
  } finally {
    isExportingExcel.value = false;
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

    <!-- The four figures -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewTile title="Collected altogether" tone="night">
        <p class="tabular text-4xl font-semibold leading-none">{{ peso(totalRemitted) }}</p>
        <p class="mt-2 text-sm leading-6 text-on-night-soft">
          Rent plus water, across {{ rows.length }}
          {{ rows.length === 1 ? 'entry' : 'entries' }} (BR-038)
        </p>
      </OverviewTile>

      <OverviewTile title="Rent">
        <p class="tabular text-3xl font-semibold leading-none text-ink">{{ peso(totalRent) }}</p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">Before the 50% column is derived</p>
      </OverviewTile>

      <OverviewTile title="Water">
        <p class="tabular text-3xl font-semibold leading-none text-ink">{{ peso(totalWater) }}</p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">₱200 a head, each month</p>
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
        <p class="tabular text-3xl font-semibold leading-none text-verify">{{ peso(totalShare) }}</p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">
          Half of each row's Rent Amount, computed by the system
        </p>
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

      <OverviewTile title="What it was made of" :class="showMonthChart ? 'xl:col-span-2' : 'xl:col-span-5'">
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
      </OverviewTile>
    </div>

    <!-- Ledger or the verification queue -->
    <div role="tablist" aria-label="Income view" class="inline-flex self-start rounded-full bg-canvas p-1">
      <button
        id="income-tab-ledger"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'ledger'"
        aria-controls="income-panel"
        :tabindex="activeTab === 'ledger' ? 0 : -1"
        :class="[
          'rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
          activeTab === 'ledger' ? 'bg-night text-on-night' : 'text-ink-soft',
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
          'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
          activeTab === 'verify' ? 'bg-night text-on-night' : 'text-ink-soft',
        ]"
        @click="activeTab = 'verify'"
        @keydown.left.prevent="activeTab = 'ledger'"
      >
        To verify
        <span
          v-if="pendingPayments.length > 0"
          :class="[
            'min-w-6 rounded-full px-2 py-0.5 text-xs tabular',
            activeTab === 'verify' ? 'bg-white/15' : 'bg-verify-soft text-verify',
          ]"
        >
          {{ pendingPayments.length }}
        </span>
      </button>
    </div>

    <!-- Verification queue. Each payment is a decision, so it reads as one. -->
    <div v-if="activeTab === 'verify'" id="income-panel" role="tabpanel" aria-labelledby="income-tab-verify" class="flex flex-col gap-4">
      <div v-if="isLoading" class="rounded-tile bg-tile p-6 flex flex-col gap-3" aria-busy="true">
        <span class="sr-only" role="status">Loading the verification queue</span>
        <Skeleton class-name="h-4 w-40 rounded-full" />
        <Skeleton class-name="h-20 w-full rounded-2xl" />
      </div>

      <OverviewTile v-else-if="pendingPaymentsError" title="Payments to verify">
        <UnavailableNote
          message="The verification queue could not be loaded. This does not mean there is nothing to verify, it means we could not ask."
          @retry="fetchPayments()"
        />
      </OverviewTile>

      <OverviewTile v-else-if="pendingPayments.length === 0" tone="soft" title="Payments to verify">
        <p class="text-2xl font-semibold tracking-tight">Nothing is waiting</p>
        <p class="text-sm text-ink-soft">
          No online payment is waiting for your decision. GCash payments arrive here through Adyen and count as
          paid once you verify them.
        </p>
      </OverviewTile>

      <template v-else>
        <p class="text-sm leading-6 text-ink-soft">
          Each payment below was sent through Adyen with GCash and is waiting for you. Verifying one marks the
          resident's bill as paid and writes the entry into the ledger, including the 50% Share.
        </p>
        <ul class="grid gap-4 md:grid-cols-2">
          <li v-for="p in pendingPayments" :key="p.id" class="rounded-tile bg-tile p-5 sm:p-6 flex flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium">{{ p.profiles?.full_name || 'Name not on file' }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">
                  Unit {{ (p.rooms?.room_number || '').toString().toUpperCase() || 'not on file' }}<template v-if="p.profiles?.phone_number">, {{ p.profiles.phone_number }}</template>
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
    <div v-else id="income-panel" role="tabpanel" aria-labelledby="income-tab-ledger" class="space-y-6">

    <!-- Narrowing the ledger -->
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="relative xl:max-w-xs xl:flex-1">
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

      <div class="flex flex-wrap items-center gap-2">
        <label class="ws-field">
          <span class="sr-only">Cluster</span>
          <select v-model="selectedCluster" class="ws-select w-auto">
            <option value="All">Every cluster</option>
            <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
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
            <!--
              `yearsList` already begins with `All`, so a hardcoded "Every year"
              option here produced two entries with the same value — the select
              listed "Every year" twice, above 2026.
            -->
            <option v-for="y in yearsList" :key="y" :value="y">
              {{ y === 'All' ? 'Every year' : y }}
            </option>
          </select>
        </label>

        <!-- Two ways of reading the same ledger, on the one chip style -->
        <div class="flex items-center gap-2" role="group" aria-label="How to show the ledger">
          <button
            type="button"
            class="chip"
            :aria-pressed="viewMode === 'grouped'"
            @click="viewMode = 'grouped'"
          >
            <FileSpreadsheet class="size-4" aria-hidden="true" />
            <span>By cluster</span>
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="viewMode === 'flat'"
            @click="viewMode = 'flat'"
          >
            <Banknote class="size-4" aria-hidden="true" />
            <span>All together</span>
          </button>
        </div>
      </div>
    </div>

    <SkeletonTable v-if="isLoading" :columns="7" :rows="8" />

    <!-- By cluster: her spreadsheet's own five sections, each with its subtotal -->
    <div v-else-if="viewMode === 'grouped'" class="space-y-6">
      <p
        v-if="clusterGroups.length === 0"
        class="rounded-tile bg-tile px-6 py-16 text-center text-sm text-ink-soft"
      >
        No collection matches what you have asked for.
      </p>

      <section
        v-for="(group, groupIndex) in clusterGroups"
        :key="group.key"
        class="overflow-hidden rounded-tile bg-tile"
      >
        <h2>
          <button
            type="button"
            class="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-canvas sm:p-6"
            :aria-expanded="isClusterOpen(group.key, groupIndex)"
            :aria-controls="`cluster-${group.key}`"
            @click="toggleCluster(group.key, groupIndex)"
          >
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <ChevronDown
                  :class="[
                    'size-4 shrink-0 text-ink-soft transition-transform',
                    isClusterOpen(group.key, groupIndex) ? '' : '-rotate-90',
                  ]"
                  aria-hidden="true"
                />
                <span class="text-base font-semibold text-ink">{{ group.label }}</span>
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
          class="border-t border-line p-5 sm:p-6"
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
              <tr>
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
                  <button type="button" class="pill-btn" @click="startEditIncome(r)">
                    <Pencil class="size-3.5" aria-hidden="true" />
                    <span>Edit</span>
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
                <span>Edit this entry</span>
              </button>
            </template>
          </RecordTable>
        </div>
      </section>
    </div>

    <!-- All together: every cluster in one register -->
    <RecordTable
      v-else
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
        <tr>
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
            <button type="button" class="pill-btn" @click="startEditIncome(r)">
              <Pencil class="size-3.5" aria-hidden="true" />
              <span>Edit</span>
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
          <td class="num text-brand">{{ peso(totalRemitted) }}</td>
          <td></td>
        </tr>
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
          <span>Edit this entry</span>
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
          <p class="text-xs text-ink-soft">Water: <strong>₱400.00 / month</strong></p>
        </div>

        <div class="space-y-1 rounded-2xl bg-canvas p-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-sm text-ink">Linda (LB)</span>
            <StatusPill tone="neutral">A fixed charge</StatusPill>
          </div>
          <p class="text-xs text-ink-soft">Water: <strong>₱200.00 / month</strong></p>
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

        <form @submit.prevent="handleEditIncome" class="space-y-4 text-xs">
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
              <select v-model="editUnit" class="ws-select w-full">
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
                  {{ r.unitCode.toUpperCase() }} — {{ r.tenant || 'Vacant' }} ({{ r.cluster }})
                </option>
              </select>
            </label>
          </div>

          <!-- Rent Amount & Water Payment Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="ws-field">
            Amount for Rent (₱)
              <input v-model.number="editRent" type="number" min="0" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
            Payment for Water (₱)
              <input v-model.number="editWater" type="number" min="0" class="ws-input w-full" required />
            </label>
          </div>

          <!-- GBG Fee & OR Receipt Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="ws-field">
            GBG Fee (₱)
              <input v-model.number="editGarbage" type="number" min="0" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
            OR / Receipt Number
              <input v-model="editInvoice" type="text" placeholder="OR-2026-1055" class="ws-input w-full font-mono" required />
            </label>
          </div>

          <!-- Payment Method & Online Reference Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="ws-field">
            Payment Method
              <select v-model="editMethod" class="ws-select w-full">
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <!-- Shown only when the row already carries it, and never selectable by hand. -->
                <option v-if="editMethod === 'Adyen Online'" value="Adyen Online" disabled>Adyen Online (gateway)</option>
              </select>
            </label>
            <label class="ws-field" :class="{ 'opacity-40': !methodHasReference }">
              Their reference number
              <input v-model="editReference" type="text" :placeholder="editMethod === 'Bank Transfer' ? 'Bank reference' : 'GCash reference'" class="ws-input w-full" :disabled="!methodHasReference" :required="methodHasReference" />
            </label>
          </div>

          <!-- Rent Validity / Duration Details Row -->
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="ws-field">
            Months Covered
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
            Covered Period End
              <input :value="editDateCoveredEnd" type="date" class="ws-input w-full" disabled />
            </label>
          </div>

          <!-- Date Received & Read-Only Total Amount calculation -->
          <div class="grid gap-4 sm:grid-cols-2 pt-2">
            <label class="ws-field">
            Date Received
              <input v-model="editDate" type="date" class="ws-input w-full" required />
            </label>
            <div class="bg-canvas border border-line rounded-tile p-3.5 flex flex-col justify-center">
              <span class="text-xs font-semibold text-ink-soft">Total Amount (₱)</span>
              <span class="font-semibold text-lg text-brand pt-0.5">{{ peso(editTotal) }}</span>
            </div>
          </div>

          <div class="pt-4 border-t border-line flex items-center justify-between gap-3">
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
