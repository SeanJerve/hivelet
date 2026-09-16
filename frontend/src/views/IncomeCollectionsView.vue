<script setup lang="ts">
import { periodEnd, propertyToday, propertyDate } from '@/lib/propertyDate';
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  incomeRecords, 
  fetchIncomeRecords, 
  isOnsitePaymentModalOpen, 
  rooms, 
  showToast, 
  fetchTenants, 
  formatUnitOccupantsSummary, 
  type IncomeRecord 
} from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api, API_BASE, getStoredToken } from '@/lib/api';
import { 
  Download, 
  Plus, 
  Search, 
  RefreshCw,
  Pencil,
  Trash2,
  ReceiptText,
  X,
  Loader2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Check,
  CreditCard,
  FileSpreadsheet,
  Banknote,
  ChevronDown
} from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
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
      showToast('success', 'Payment Verified & Settled', 'Income record generated with 50% revenue share calculated.');
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
  editOccupants.value = occSummary.count > 0 ? occSummary.count : (occRoom?.occupants || 1);
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
  const carriedForward = summary.count > 0 ? summary.count : (room?.occupants || 1);
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
 * The CSV button beside this one satisfies BR-030 - the rows leave the system in
 * a format Excel opens. This is the stricter rule: the documented layout, with
 * the month blocks, the per-cluster subtotals, and Linda kept in her own section
 * rather than folded into the grand total. CSV cannot express any of that, so
 * the file is built server-side and streamed back.
 *
 * Fetched rather than linked, because the endpoint needs the bearer token and an
 * `<a href>` cannot carry one.
 */
const isExportingExcel = ref(false);

async function exportExcel() {
  if (isExportingExcel.value) return;
  isExportingExcel.value = true;
  // The workbook is a per-year report, so "All Years" falls back to this year
  // rather than silently exporting one of them.
  const year = filterYear.value !== 'All'
    ? filterYear.value
    : String(new Date().getFullYear());
  try {
    const res = await fetch(`${API_BASE}/admin/reports/income.xlsx?year=${year}`, {
      headers: { Authorization: `Bearer ${getStoredToken() ?? ''}` },
    });
    if (!res.ok) {
      throw new Error(`The report could not be generated (HTTP ${res.status}).`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivelet-income-${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Report downloaded', `Monthly Income Report for ${year}.`);
  } catch (err: any) {
    showToast('error', 'Export failed', err?.message || 'The report could not be generated.');
  } finally {
    isExportingExcel.value = false;
  }
}

function exportCSV() {
  const headers = ['Unit', 'Cluster', 'Date Paid', 'Contact', 'Invoice', 'Rent For', 'Rent (PHP)', '50% Share (PHP)', 'Occupants', 'Water (PHP)', 'Garbage (PHP)', 'Remitted (PHP)'];
  const csvRows = [headers.join(',')];

  // Sort chronologically ascending
  const sortedRecords = [...rows.value].sort((a, b) => {
    const da = new Date(a.datePaid).getTime();
    const db = new Date(b.datePaid).getTime();
    return da - db;
  });

  // Group rows by month
  const groups: { monthKey: string; records: typeof rows.value }[] = [];
  
  sortedRecords.forEach(r => {
    let monthKey = 'Unknown Month';
    if (r.datePaid && r.datePaid !== '—') {
      const d = new Date(r.datePaid);
      if (!isNaN(d.getTime())) {
        monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    let group = groups.find(g => g.monthKey === monthKey);
    if (!group) {
      group = { monthKey, records: [] };
      groups.push(group);
    }
    group.records.push(r);
  });

  groups.forEach((g, gIdx) => {
    // 3 blank rows before subsequent months
    if (gIdx > 0) {
      csvRows.push(',,,,,,,,,,,');
      csvRows.push(',,,,,,,,,,,');
      csvRows.push(',,,,,,,,,,,');
    }

    // Month header row
    csvRows.push([`"** ${g.monthKey.toUpperCase()} **"`, '', '', '', '', '', '', '', '', '', '', ''].join(','));

    // Records
    g.records.forEach((r) => {
      const row = [
        r.unit,
        r.cluster,
        `"${r.datePaid}"`,
        `"${r.contact}"`,
        `"${r.invoice}"`,
        `"${r.rentFor}"`,
        r.rent,
        r.rent / 2,
        r.occupants,
        r.water,
        r.garbage,
        (r.rent / 2) + r.water
      ];
      csvRows.push(row.join(','));
    });

    // Monthly Subtotals row
    const rentSubtotal = g.records.reduce((sum, r) => sum + r.rent, 0);
    const shareSubtotal = rentSubtotal / 2;
    const occupantsSubtotal = g.records.reduce((sum, r) => sum + r.occupants, 0);
    const waterSubtotal = g.records.reduce((sum, r) => sum + r.water, 0);
    const garbageSubtotal = g.records.reduce((sum, r) => sum + r.garbage, 0);
    const remittedSubtotal = shareSubtotal + waterSubtotal;

    csvRows.push([
      `"SUBTOTAL (${g.monthKey.toUpperCase()})"`,
      '',
      '',
      '',
      '',
      '',
      rentSubtotal,
      shareSubtotal,
      occupantsSubtotal,
      waterSubtotal,
      garbageSubtotal,
      remittedSubtotal
    ].join(','));
  });

  // Yearly Grand Totals
  const rentGrand = rows.value.reduce((sum, r) => sum + r.rent, 0);
  const shareGrand = rentGrand / 2;
  const occupantsGrand = rows.value.reduce((sum, r) => sum + r.occupants, 0);
  const waterGrand = rows.value.reduce((sum, r) => sum + r.water, 0);
  const garbageGrand = rows.value.reduce((sum, r) => sum + r.garbage, 0);
  const remittedGrand = shareGrand + waterGrand;

  csvRows.push(',,,,,,,,,,,');
  csvRows.push([
    '"GRAND YEARLY TOTALS"',
    '',
    '',
    '',
    '',
    '',
    rentGrand,
    shareGrand,
    occupantsGrand,
    waterGrand,
    garbageGrand,
    remittedGrand
  ].join(','));

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const monthName = filterMonth.value !== 'All' ? filterMonth.value : 'AllMonths';
  const yearName = filterYear.value !== 'All' ? filterYear.value : 'AllYears';
  link.setAttribute('download', `hivelet_income_${monthName}_${yearName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('success', 'Excel CSV Exported', 'Income collections ledger successfully downloaded.');
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Breadcrumbs -->
    <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-foreground">Income &amp; Collections</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Monthly Income &amp; Collections Ledger
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          The canonical revenue ledger, reconciled line-for-line with the historical spreadsheet. The 50% column is computed by the system as half of each row's Rent Amount.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="fetchIncome"
          :disabled="isLoading"
          class="btn-secondary"
        >
          <RefreshCw :class="['size-3.5 text-muted-foreground', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="exportCSV"
          class="btn-secondary"
        >
          <Download class="size-3.5 text-muted-foreground" />
          <span>Export CSV</span>
        </button>

        <button
          @click="exportExcel"
          :disabled="isExportingExcel"
          class="btn-secondary"
          title="The full Monthly Income Report layout — month blocks, cluster subtotals, Linda kept separate"
        >
          <FileSpreadsheet :class="['size-3.5 text-muted-foreground', isExportingExcel ? 'animate-pulse' : '']" />
          <span>{{ isExportingExcel ? 'Building…' : 'Export Excel (.xlsx)' }}</span>
        </button>

        <button 
          @click="isOnsitePaymentModalOpen = true"
          class="btn-primary"
        >
          <Plus class="size-3.5 text-white" />
          <span>Record On-Site Payment</span>
        </button>
      </div>
    </div>

    <!-- 4 Summary KPI StatCards (Always Visible at Top) -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Total Gross Rent</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-foreground">{{ peso(totalRent) }}</p>
        <p class="mt-1 text-xs text-muted-foreground">Before 50% share derivation</p>
      </div>

      <!-- BR-035 wording is fixed: this is a system-computed figure equal to half
           the row's Rent Amount, retained for parity with the historical
           spreadsheet. It names no recipient and describes no destination.

           This card used to name a party and assert a purpose for the figure,
           both of which the locked wording forbids. The earlier text is not
           quoted here - repeating it would put the banned phrasing back into
           the repository, which is what the rule is for. See BR-035 in
           docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md. -->
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">50% Share · BH rows</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-accent-ink">{{ peso(totalShare) }}</p>
        <p class="mt-1 text-xs text-amber-800 font-medium">Half of Rent Amount, computed by the system</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Water Collections</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-foreground">{{ peso(totalWater) }}</p>
        <p class="mt-1 text-xs text-muted-foreground">₱200 / head monthly rule</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Total Remitted</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-800">{{ peso(totalRemitted) }}</p>
        <p class="mt-1 text-xs text-emerald-700 font-medium">Rent + Water (BR-038)</p>
        <!-- The spreadsheet's own bottom line is a different sum and used to be
             displayed under the "Total Remitted" heading, which is the name of a
             database column holding the other figure. -->
        <p class="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
          Spreadsheet line: <strong class="text-foreground">{{ peso(totalSpreadsheetLine) }}</strong>
          <span class="block text-[11px] text-muted-foreground-soft">BH at half rent, other clusters at full rent, plus water</span>
        </p>
      </div>
    </div>

    <!-- Tab Navigation (Positioned below KPI cards per user requirement) -->
    <div class="flex items-center gap-2 border-b border-border pb-px">
      <button
        @click="activeTab = 'ledger'"
        :class="[
          'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2',
          activeTab === 'ledger'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        <CreditCard class="size-4" />
        <span>Collection Ledger</span>
      </button>

      <button
        @click="activeTab = 'verify'"
        :class="[
          'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2',
          activeTab === 'verify'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        <Clock class="size-4" />
        <span>Online Verification (Adyen)</span>
        <span
          v-if="pendingPayments.length > 0"
          class="badge-soft badge-warning text-[10px] font-extrabold ml-1.5"
        >
          {{ pendingPayments.length }}
        </span>
      </button>
    </div>

    <!-- TAB 2: Online Verification Queue -->
    <div v-if="activeTab === 'verify'" class="space-y-4">
      <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <Clock class="size-4 mt-0.5 text-amber-600 shrink-0" />
        <div>
          <strong class="font-bold">Online Payment Verification Queue (BR-016 &amp; BR-017)</strong>
          <p class="text-amber-800 mt-0.5">
            Adyen GCash remittances require administrator validation. Approving an entry marks the resident's bill as Paid and automatically calculates the 50% revenue cut into the Monthly Income Ledger.
          </p>
        </div>
      </div>

      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="6" :rows="4" />
      </div>

      <div v-else class="surface-card overflow-hidden">
        <div v-if="pendingPaymentsError" class="p-12 text-center text-xs text-muted-foreground">
          <ShieldAlert class="size-8 mx-auto text-amber-500 mb-2 opacity-90" />
          <p class="font-bold text-sm text-foreground">The verification queue could not be loaded</p>
          <p class="mt-1">
            This does <strong class="text-foreground">not</strong> mean there is nothing to verify — it means we could not ask.
          </p>
          <p class="mt-1 text-muted-foreground-soft">{{ pendingPaymentsError }}</p>
          <button @click="fetchPayments()" class="btn-secondary mt-4 text-xs">Try again</button>
        </div>

        <div v-else-if="pendingPayments.length === 0" class="p-12 text-center text-xs text-muted-foreground">
          <ShieldCheck class="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
          <p class="font-bold text-sm text-foreground">All Remittances Verified</p>
          <p class="mt-1">No online transactions currently awaiting administrative approval.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <tr>
                <th class="px-4 py-3 font-bold">Resident</th>
                <th class="px-4 py-3 font-bold">Target Unit</th>
                <th class="px-4 py-3 font-bold">Amount</th>
                <th class="px-4 py-3 font-bold">Gateway &amp; Ref #</th>
                <th class="px-4 py-3 font-bold">Date &amp; Status</th>
                <th class="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in pendingPayments" :key="p.id" class="hover:bg-background">
                <td class="px-4 py-3 font-bold text-foreground">
                  {{ p.profiles?.full_name || 'Resident' }}
                  <span class="block text-[11px] font-normal text-muted-foreground">{{ p.profiles?.phone_number || 'No contact' }}</span>
                </td>
                <td class="px-4 py-3 font-extrabold uppercase text-foreground">
                  Room {{ p.rooms?.room_number || '—' }}
                </td>
                <td class="px-4 py-3 font-display font-black text-foreground">
                  {{ peso(p.amount) }}
                </td>
                <td class="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  <span class="font-bold text-primary">{{ p.payment_method }}</span>
                  <div class="mt-0.5 text-[10px] text-foreground-soft">{{ p.transaction_reference || 'REF-PENDING' }}</div>
                </td>
                <td class="px-4 py-3">
                  <span class="badge-soft badge-warning text-xs font-bold">
                    Pending Verification
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="verifyPayment(p.id, 'Verified')"
                      class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check class="size-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      @click="verifyPayment(p.id, 'Rejected')"
                      class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X class="size-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 1: Collection Ledger -->
    <div v-else class="space-y-6">

    <!-- Ledger Table Container -->
    <div class="surface-card overflow-hidden">
      <!-- Filter Bar -->
      <div class="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="q"
            type="text"
            placeholder="Search unit, resident or OR #…"
            class="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs sm:text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <select
          v-model="selectedCluster"
          class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-44 cursor-pointer"
        >
          <option value="All">All Clusters</option>
          <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
        </select>

        <select
          v-model="filterMonth"
          class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-44 cursor-pointer"
        >
          <option v-for="m in monthsList" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>

        <select
          v-model="filterYear"
          class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-36 cursor-pointer"
        >
          <option value="All">All Years</option>
          <option v-for="y in yearsList" :key="y" :value="y">{{ y === 'All' ? 'All Years' : y }}</option>
        </select>

        <!-- View Mode Segmented Switcher -->
        <div class="inline-flex rounded-xl bg-muted p-1 border border-border shrink-0 self-center">
          <button
            @click="viewMode = 'grouped'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              viewMode === 'grouped'
                ? 'bg-white text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            ]"
            title="Spreadsheet Cluster Sections"
          >
            <FileSpreadsheet class="size-3.5" />
            <span class="hidden md:inline">Spreadsheet View</span>
          </button>
          <button
            @click="viewMode = 'flat'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              viewMode === 'flat'
                ? 'bg-white text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            ]"
            title="Unified Single Ledger Table"
          >
            <Banknote class="size-3.5" />
            <span class="hidden md:inline">Flat Ledger</span>
          </button>
        </div>
      </div>

      <!-- SKELETON LOADING STATE -->
      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="10" :rows="8" />
      </div>

      <!-- VIEW MODE 1: SPREADSHEET CLUSTER-GROUPED TABLES -->
      <div v-else-if="viewMode === 'grouped'" class="p-4 space-y-6 max-h-[75vh] overflow-y-auto">
        <div v-if="clusterGroups.length === 0" class="p-12 text-center text-xs text-muted-foreground bg-white rounded-2xl border border-border">
          No income collections recorded matching the active filters.
        </div>

        <div 
          v-else
          v-for="group in clusterGroups" 
          :key="group.key"
          class="rounded-2xl border border-border bg-white overflow-hidden shadow-xs space-y-0"
        >
          <!-- Cluster Section Header -->
          <div class="px-4 py-3 bg-[#f8fafc] border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="size-2.5 rounded-full" :class="group.hasShareColumn ? 'bg-amber-500' : 'bg-primary'"></span>
              <div>
                <h4 class="font-display font-extrabold text-sm text-foreground">{{ group.label }}</h4>
                <p class="text-[11px] text-muted-foreground">{{ group.desc }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="badge-soft badge-blue font-bold">{{ group.records.length }} records</span>
              <span v-if="group.hasShareColumn" class="badge-soft badge-warning font-bold" title="A system-computed figure equal to half the row's Rent Amount, retained so this ledger reconciles line-for-line with Column 6 of the historical spreadsheet (BR-035).">Column 6 &mdash; spreadsheet parity</span>
            </div>
          </div>

          <!-- Cluster Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <thead class="bg-background text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold">RM #</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold">DATE PAID</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold">TENANT &amp; OR #</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold">RENT PERIOD</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-right">RENT (₱)</th>
                  <th v-if="group.hasShareColumn" class="whitespace-nowrap px-3 py-2.5 font-bold text-right text-amber-800">50% SHARE (₱)</th>
                  <th v-if="group.key === 'Linda'" class="whitespace-nowrap px-3 py-2.5 font-bold text-right text-sky-800">ELECTRIC (₱)</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-center">HEADS</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-right">WATER (₱)</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-right">GBG (₱)</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-right">REMITTED (₱)</th>
                  <th class="whitespace-nowrap px-3 py-2.5 font-bold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr 
                  v-for="r in group.records" 
                  :key="r.id || (r.unit + r.invoice)"
                  class="hover:bg-[#fcfbf9] transition-colors"
                >
                  <td class="whitespace-nowrap px-3 py-2 font-display font-extrabold uppercase text-foreground">
                    {{ r.unit }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {{ r.datePaid }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-bold text-foreground">
                    {{ r.contact }}
                    <span v-if="r.invoice" class="block font-mono text-[10px] font-normal text-muted-foreground">{{ r.invoice }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {{ r.rentFor }}
                  </td>
                  <td class="tabular whitespace-nowrap px-3 py-2 text-right font-display font-bold text-foreground">
                    {{ peso(r.rent) }}
                  </td>
                  <td v-if="group.hasShareColumn" class="tabular whitespace-nowrap px-3 py-2 text-right font-bold text-amber-800 bg-amber-50/40">
                    {{ peso(r.rent / 2) }}
                  </td>
                  <td v-if="group.key === 'Linda'" class="tabular whitespace-nowrap px-3 py-2 text-right font-bold text-sky-800 bg-sky-50/40">
                    {{ peso(r.linda?.electricity || 0) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-center font-bold text-foreground">
                    {{ r.occupants }}
                  </td>
                  <td class="tabular whitespace-nowrap px-3 py-2 text-right font-semibold text-foreground">
                    {{ peso(r.water) }}
                  </td>
                  <td class="tabular whitespace-nowrap px-3 py-2 text-right text-muted-foreground">
                    {{ peso(r.garbage) }}
                  </td>
                  <td class="tabular whitespace-nowrap px-3 py-2 text-right font-display font-extrabold text-emerald-800">
                    {{ peso(group.hasShareColumn ? (r.rent / 2) + r.water : r.rent + r.water) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-center">
                    <button 
                      @click="startEditIncome(r)" 
                      class="btn-secondary min-h-7 px-2.5 py-0.5 text-xs gap-1 inline-flex items-center shadow-xs cursor-pointer hover:border-primary hover:text-primary"
                      title="Edit Collection"
                    >
                      <Pencil class="size-3 text-muted-foreground" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              </tbody>

              <!-- Cluster Subtotal Row -->
              <tfoot class="bg-[#f8fafc] border-t-2 border-[#e2e8f0] font-display font-bold text-xs text-foreground">
                <tr>
                  <td colspan="4" class="px-3 py-2.5 uppercase tracking-wider text-[#64748b]">
                    {{ group.label }} SUB-TOTAL ({{ group.records.length }} UNITS)
                  </td>
                  <td class="tabular px-3 py-2.5 text-right font-black text-foreground">{{ peso(group.totalRent) }}</td>
                  <td v-if="group.hasShareColumn" class="tabular px-3 py-2.5 text-right font-black text-amber-800">{{ peso(group.totalShare) }}</td>
                  <td v-if="group.key === 'Linda'" class="tabular px-3 py-2.5 text-right font-black text-sky-800">
                    {{ peso(group.records.reduce((s, r) => s + (r.linda?.electricity || 0), 0)) }}
                  </td>
                  <td class="px-3 py-2.5 text-center font-bold">{{ group.totalOccupants }}</td>
                  <td class="tabular px-3 py-2.5 text-right font-black">{{ peso(group.totalWater) }}</td>
                  <td class="tabular px-3 py-2.5 text-right font-black text-muted-foreground">{{ peso(group.totalGarbage) }}</td>
                  <td class="tabular px-3 py-2.5 text-right font-black text-emerald-800">{{ peso(group.totalRemitted) }}</td>
                  <td class="px-3 py-2.5 text-center">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW MODE 2: UNIFIED FLAT LEDGER TABLE -->
      <div v-else class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-muted">
            <tr class="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <th class="whitespace-nowrap px-3 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold">CLUSTER</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold">DATE PAID</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold">CONTACT / RESIDENT</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold">INVOICE #</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold">RENT FOR</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-right">RENT (₱)</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-center">OCC.</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-right">WATER (₱)</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-right">GBG (₱)</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-right">TOTAL REMITTED (₱)</th>
              <th class="whitespace-nowrap px-3 py-3 font-bold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-if="rows.length === 0">
              <td colspan="12" class="p-8 text-center text-muted-foreground bg-white">
                No income collections recorded matching the filters.
              </td>
            </tr>
            <tr 
              v-else
              v-for="r in rows" 
              :key="r.unit + r.invoice"
              class="hover:bg-background transition-colors"
            >
              <td class="whitespace-nowrap px-3 py-2.5 font-display font-extrabold uppercase text-foreground">
                {{ r.unit }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-muted-foreground font-medium">
                {{ r.cluster }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                {{ r.datePaid }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 font-bold text-foreground">
                {{ r.contact }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">
                {{ r.invoice }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                {{ r.rentFor }}
              </td>
              <td class="tabular whitespace-nowrap px-3 py-2.5 text-right">
                <span class="font-display font-bold text-foreground block leading-tight">{{ peso(r.rent) }}</span>
                <span v-if="r.cluster === 'BH'" class="text-[11px] font-bold text-accent-ink block leading-tight mt-0.5">50%: {{ peso(r.rent / 2) }}</span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-center font-bold text-foreground">
                {{ r.occupants }}
              </td>
              <td class="tabular whitespace-nowrap px-3 py-2.5 text-right font-semibold text-foreground">
                {{ peso(r.water) }}
              </td>
              <td class="tabular whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                {{ peso(r.garbage) }}
              </td>
              <td class="tabular whitespace-nowrap px-3 py-2.5 text-right font-display font-extrabold text-emerald-800">
                {{ peso((r.cluster === 'BH' ? (r.rent / 2) : r.rent) + r.water) }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-center">
                <button 
                  @click="startEditIncome(r)" 
                  class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer hover:border-primary hover:text-primary"
                  title="Edit Collection"
                >
                  <Pencil class="size-3.5 text-muted-foreground" />
                  <span>Edit</span>
                </button>
              </td>
            </tr>
          </tbody>

          <!-- Table Footer Subtotals -->
          <tfoot class="sticky bottom-0 bg-muted border-t-2 border-[#d6d3d1] font-display font-bold text-xs text-foreground">
            <tr>
              <td colspan="6" class="px-3 py-3 uppercase tracking-wider text-muted-foreground">
                GRAND TOTALS ({{ rows.length }} ROWS)
              </td>
              <td class="tabular px-3 py-3 text-right">
                <span class="font-black text-foreground block leading-tight">{{ peso(totalRent) }}</span>
                <span class="text-[11px] font-bold text-accent-ink block leading-tight mt-0.5">50% BH Share: {{ peso(totalShare) }}</span>
              </td>
              <td class="px-3 py-3 text-center font-black">{{ rows.reduce((s, r) => s + r.occupants, 0) }}</td>
              <td class="tabular px-3 py-3 text-right font-black">{{ peso(totalWater) }}</td>
              <td class="tabular px-3 py-3 text-right font-black">{{ peso(totalGarbage) }}</td>
              <td class="tabular px-3 py-3 text-right font-black text-emerald-800">{{ peso(totalRemitted) }}</td>
              <td class="px-3 py-3 text-center">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Linda Units Separate Reference Card (BR-040) -->
    <div class="surface-card p-6 space-y-3">
      <div class="flex items-center gap-2">
        <FileSpreadsheet class="size-5 text-accent" />
        <h3 class="font-display font-extrabold text-base text-foreground">Linda Units Fixed Charge Schedule</h3>
      </div>
      <p class="text-xs text-muted-foreground leading-relaxed">
        The two Linda units sit in the separate structure beside the red gate and are billed a
        fixed monthly water charge instead of the per-occupant rate. They are not part of the
        Front Apartment, whose income is never remitted to Linda. The flat electricity charge
        that once applied to unmetered units was retired in September 2026 and is not recorded
        for new periods; historical figures remain visible on past entries.
      </p>

      <div class="grid gap-4 sm:grid-cols-2 pt-2">
        <div class="p-4 rounded-xl bg-background border border-border space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-display font-bold text-sm text-foreground">Linda (LF)</span>
            <span class="badge-soft badge-blue text-xs font-bold">
              Fixed Billing
            </span>
          </div>
          <p class="text-xs text-muted-foreground">Water: <strong>₱400.00 / month</strong></p>
        </div>

        <div class="p-4 rounded-xl bg-background border border-border space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-display font-bold text-sm text-foreground">Linda (LB)</span>
            <span class="badge-soft badge-blue text-xs font-bold">
              Fixed Billing
            </span>
          </div>
          <p class="text-xs text-muted-foreground">Water: <strong>₱200.00 / month</strong></p>
        </div>
      </div>
    </div>
  </div>

    <!-- Edit Payment Modal -->
    <div 
      v-if="isEditOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isEditOpen = false"
    >
      <div class="surface-card w-full max-w-2xl shadow-2xl p-6 space-y-4 rounded-2xl bg-white my-6">
        
        <div class="flex justify-between items-start border-b border-border pb-3">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-blue-50 text-primary ring-1 ring-blue-200">
              <Banknote class="size-5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-base text-foreground">Edit Payment Collection</h3>
              <p class="text-xs text-muted-foreground">Modify the rent and utility allocations for this collection record.</p>
            </div>
          </div>
          <button @click="isEditOpen = false" class="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleEditIncome" class="space-y-4 text-xs">
          <!-- Room/Unit selector -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Unit</label>
            <select v-model="editUnit" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
                {{ r.unitCode.toUpperCase() }} — {{ r.tenant || 'Vacant' }} ({{ r.cluster }})
              </option>
            </select>
          </div>

          <!-- Rent Amount & Water Payment Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Amount for Rent (₱)</label>
              <input v-model.number="editRent" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Payment for Water (₱)</label>
              <input v-model.number="editWater" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
            </div>
          </div>

          <!-- GBG Fee & OR Receipt Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">GBG Fee (₱)</label>
              <input v-model.number="editGarbage" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">OR / Receipt Number</label>
              <input v-model="editInvoice" type="text" placeholder="OR-2026-1055" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-mono text-foreground focus:border-primary focus:outline-none" required />
            </div>
          </div>

          <!-- Payment Method & Online Reference Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Payment Method</label>
              <select v-model="editMethod" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <!-- Shown only when the row already carries it, and never selectable by hand. -->
                <option v-if="editMethod === 'Adyen Online'" value="Adyen Online" disabled>Adyen Online (gateway)</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" :class="{ 'opacity-40': !methodHasReference }">Transaction Reference #</label>
              <input v-model="editReference" type="text" :placeholder="editMethod === 'Bank Transfer' ? 'Bank reference #' : 'GCash reference #'" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-40 disabled:bg-muted" :disabled="!methodHasReference" :required="methodHasReference" />
            </div>
          </div>

          <!-- Rent Validity / Duration Details Row -->
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Months Covered</label>
              <input v-model.number="editMonthsCovered" type="number" min="1" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Occupants
                <span class="normal-case tracking-normal font-medium text-muted-foreground-soft">— carried from the tenancy; water is per occupant</span>
              </label>
              <input v-model.number="editOccupants" type="number" min="1" max="50" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Covered Period Start
                <span class="normal-case tracking-normal font-medium text-muted-foreground-soft">— blank uses the tenant's billing cycle</span>
              </label>
              <input v-model="editDateCoveredStart" type="date" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Covered Period End</label>
              <input :value="editDateCoveredEnd" type="date" class="min-h-11 w-full px-3.5 bg-background border border-border rounded-xl text-sm text-muted-foreground focus:outline-none" disabled />
            </div>
          </div>

          <!-- Date Received & Read-Only Total Amount calculation -->
          <div class="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Date Received</label>
              <input v-model="editDate" type="date" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
            </div>
            <div class="bg-background border border-border rounded-2xl p-3.5 flex flex-col justify-center">
              <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount (₱)</span>
              <span class="font-display font-black text-lg text-emerald-800 pt-0.5">{{ peso(editTotal) }}</span>
            </div>
          </div>

          <div class="pt-4 border-t border-border flex items-center justify-between gap-3">
            <button 
              type="button" 
              @click="handleDeleteFromModal" 
              class="btn-danger"
            >
              <Trash2 class="size-3.5" />
              <span>Delete Record</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditOpen = false" class="btn-secondary">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Update Collection</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div 
      v-if="isConfirmOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isConfirmOpen = false"
    >
      <div class="surface-card w-full max-w-sm shadow-2xl rounded-2xl p-6 bg-white space-y-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
            <ReceiptText class="w-6 h-6" />
          </div>
          <h3 class="font-display font-extrabold text-lg text-foreground">{{ confirmTitle }}</h3>
          
          <div class="w-full text-left bg-background border border-border rounded-xl p-3.5 text-xs text-foreground space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button 
            type="button" 
            @click="isConfirmOpen = false" 
            class="btn-secondary cursor-pointer min-w-[100px]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleConfirmAccept" 
            class="btn-primary cursor-pointer min-w-[100px]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
