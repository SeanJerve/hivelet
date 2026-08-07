<script setup lang="ts">
/**
 * @component BillingPaymentsView
 * @description Guided Monthly Income Report entry per docs/09_MONTHLY_INCOME_REPORT.md Section 7
 *              (BR-031 to BR-040, FR-031 to FR-036). Rent Period, 50% Share, and Remitted Amount are
 *              never typed -- Rent Period is derived here from the tenant's Anniversary Date, and
 *              50% Share / Remitted Amount are PostgreSQL GENERATED columns (never sent by the client).
 */
import { ref, computed, onMounted, watch } from 'vue';
import { Plus, CheckCircle2, Receipt, Download } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';
import { exportMonthlyIncomeExcel } from '../lib/incomeReportExport';

const authStore = useAuthStore();
const { showToast } = useToast();

interface RoomOption {
  id: string;
  room_number: string;
  is_linda_unit: boolean;
  current_price: number;
  cluster_display_order: number;
}

interface ActiveAssignment {
  id: string;
  room_id: string;
  tenant_profile_id: string;
  anniversary_date: string;
  occupant_count: number;
  tenant_name: string;
}

interface LedgerRow {
  id: string;
  room_id: string;
  tenant_profile_id: string | null;
  year: number;
  month: number;
  date_paid: string;
  contact_name: string;
  invoice_number: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  fifty_percent_share: number;
  occupants: number;
  water_payment: number;
  gbg_fee: number;
  remitted_amount: number;
  is_linda_billing: boolean;
  linda_electricity_charge: number;
  linda_water_charge: number;
  payment_method: string;
  verification_status: string;
  receipt_sent_at: string | null;
  rooms: { room_number: string; clusters: { code: string; name: string; display_order: number } | null };
}

// FR-031/BR-032: canonical cluster order, Penthouse removed 2026-08-07 (docs/08_OPEN_DECISIONS.md #10).
const CLUSTER_ORDER = ['BH', 'Back Apartment', 'Front Apartment'];

interface PendingPayment {
  id: string;
  tenant_profile_id: string;
  amount: number;
  payment_method: string;
  transaction_reference: string | null;
  paid_at: string;
  rooms: { room_number: string };
  profiles: { full_name: string };
}

const LINDA_WATER_DEFAULTS: Record<string, number> = { LF: 400, LB: 200 };
const LINDA_ELECTRICITY_DEFAULT = 325;

const loading = ref(true);
const saving = ref(false);
const rooms = ref<RoomOption[]>([]);
const assignments = ref<ActiveAssignment[]>([]);
const ledger = ref<LedgerRow[]>([]);
const pendingPayments = ref<PendingPayment[]>([]);

const now = new Date();

// FR-031/BR-029: report defaults to the current month, admin can browse other months.
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const monthLabel = computed(() =>
  new Date(selectedYear.value, selectedMonth.value - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
);

const form = ref({
  roomId: '',
  datePaid: now.toISOString().slice(0, 10),
  billingYear: now.getFullYear(),
  billingMonth: now.getMonth() + 1,
  contactName: '',
  invoiceNumber: '',
  rentAmount: 0,
  occupants: 1,
  waterPayment: 0,
  gbgFee: 0,
  gbgAlreadyChargedThisYear: false,
  lindaElectricityCharge: LINDA_ELECTRICITY_DEFAULT,
  lindaWaterCharge: 0,
  paymentMethod: 'Cash',
});

const waterConfirmed = ref(false);

const selectedRoom = computed(() => rooms.value.find((r) => r.id === form.value.roomId) ?? null);
const selectedAssignment = computed(() => assignments.value.find((a) => a.room_id === form.value.roomId) ?? null);
const isLinda = computed(() => selectedRoom.value?.is_linda_unit ?? false);

const expectedWater = computed(() => form.value.occupants * 200);
const waterMismatch = computed(() => !isLinda.value && form.value.waterPayment !== expectedWater.value);

const fiftyPercentPreview = computed(() => Math.round((form.value.rentAmount / 2) * 100) / 100);
const remittedPreview = computed(() => Math.round((form.value.rentAmount + form.value.waterPayment) * 100) / 100);

// Rent Period ("Rent For") derived from the tenant's Anniversary Date day-of-month + the chosen
// billing month/year (BR-033) -- never free-typed.
const rentPeriod = computed(() => {
  const assignment = selectedAssignment.value;
  if (!assignment) return null;
  const anniv = new Date(assignment.anniversary_date);
  const day = anniv.getUTCDate();
  const y = form.value.billingYear;
  const m = form.value.billingMonth - 1; // JS month index
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const startDay = Math.min(day, daysInMonth);
  const start = new Date(Date.UTC(y, m, startDay));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return { start, end };
});

const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' });
const rentPeriodLabel = computed(() => {
  if (!selectedRoom.value) return '—';
  if (!rentPeriod.value) return 'No active tenant on this unit';
  return `${formatShort(rentPeriod.value.start)} - ${formatShort(rentPeriod.value.end)}`;
});

const loadLedger = async () => {
  const { data } = await supabase
    .from('monthly_income_records')
    .select('*, rooms(room_number, clusters(code, name, display_order))')
    .eq('year', selectedYear.value)
    .eq('month', selectedMonth.value)
    .order('date_paid', { ascending: true });
  ledger.value = (data as any) ?? [];
};

const loadAll = async () => {
  loading.value = true;

  const [roomsRes, assignmentsRes, pendingRes] = await Promise.all([
    supabase.from('rooms').select('id, room_number, is_linda_unit, current_price, clusters(display_order)').order('room_number'),
    supabase
      .from('room_assignments')
      .select('id, room_id, tenant_profile_id, anniversary_date, occupant_count, profiles(full_name)')
      .eq('is_active', true),
    supabase
      .from('payments')
      .select('id, tenant_profile_id, amount, payment_method, transaction_reference, paid_at, rooms(room_number), profiles:tenant_profile_id(full_name)')
      .eq('verification_status', 'Pending Verification'),
    loadLedger(),
  ]);

  rooms.value = (roomsRes.data ?? []).map((r: any) => ({
    id: r.id,
    room_number: r.room_number,
    is_linda_unit: r.is_linda_unit,
    current_price: r.current_price,
    cluster_display_order: r.clusters?.display_order ?? 999,
  })).sort((a, b) => a.cluster_display_order - b.cluster_display_order || a.room_number.localeCompare(b.room_number));

  assignments.value = (assignmentsRes.data ?? []).map((a: any) => ({
    id: a.id,
    room_id: a.room_id,
    tenant_profile_id: a.tenant_profile_id,
    anniversary_date: a.anniversary_date,
    occupant_count: a.occupant_count,
    tenant_name: a.profiles?.full_name ?? '',
  }));

  pendingPayments.value = (pendingRes.data as any) ?? [];

  loading.value = false;
};

onMounted(loadAll);
watch([selectedYear, selectedMonth], loadLedger);

// ------------------------------------------------------------------
// Cluster-grouped ledger with subtotals (FR-031/BR-032, 09_MONTHLY_INCOME_REPORT.md Section 3)
// ------------------------------------------------------------------
const standardLedger = computed(() => ledger.value.filter((r) => !r.is_linda_billing));
const lindaLedger = computed(() => ledger.value.filter((r) => r.is_linda_billing));

function sumRows(rows: LedgerRow[]) {
  return {
    rentAmount: rows.reduce((s, r) => s + Number(r.rent_amount), 0),
    occupants: rows.reduce((s, r) => s + Number(r.occupants), 0),
    waterPayment: rows.reduce((s, r) => s + Number(r.water_payment), 0),
    remittedAmount: rows.reduce((s, r) => s + Number(r.remitted_amount), 0),
  };
}

const clusterGroups = computed(() => {
  const groups = new Map<string, { code: string; name: string; order: number; rows: LedgerRow[] }>();
  for (const row of standardLedger.value) {
    const c = row.rooms.clusters;
    const code = c?.code ?? 'Unassigned';
    if (!groups.has(code)) groups.set(code, { code, name: c?.name ?? code, order: c?.display_order ?? 999, rows: [] });
    groups.get(code)!.rows.push(row);
  }
  return Array.from(groups.values())
    .sort((a, b) => {
      const ai = CLUSTER_ORDER.indexOf(a.code);
      const bi = CLUSTER_ORDER.indexOf(b.code);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map((g) => ({ ...g, subtotal: sumRows(g.rows) }));
});

const grandSubtotal = computed(() => sumRows(standardLedger.value));
const lindaTotals = computed(() => ({
  rent: lindaLedger.value.reduce((s, r) => s + Number(r.rent_amount), 0),
  electricity: lindaLedger.value.reduce((s, r) => s + Number(r.linda_electricity_charge), 0),
  water: lindaLedger.value.reduce((s, r) => s + Number(r.linda_water_charge), 0),
}));
const lindaGrandTotal = computed(() => lindaTotals.value.rent + lindaTotals.value.electricity + lindaTotals.value.water);

const exporting = ref(false);
async function exportIncomeReport() {
  exporting.value = true;
  try {
    await exportMonthlyIncomeExcel({
      monthLabel: monthLabel.value,
      clusterGroups: clusterGroups.value,
      grandSubtotal: grandSubtotal.value,
      lindaLedger: lindaLedger.value,
      lindaTotals: lindaTotals.value,
      lindaGrandTotal: lindaGrandTotal.value,
    });
  } catch (err: any) {
    showToast('Export Failed', err?.message || 'Could not generate the Excel file.', 'error');
  } finally {
    exporting.value = false;
  }
}

// ------------------------------------------------------------------
// Send Receipt (in-app confirmation, no PDF -- project decision 2026-08-07)
// ------------------------------------------------------------------
const sendingReceiptId = ref<string | null>(null);
async function sendReceipt(row: LedgerRow) {
  if (!row.tenant_profile_id) {
    showToast('Cannot Send Receipt', 'This entry has no linked tenant account.', 'error');
    return;
  }
  sendingReceiptId.value = row.id;
  try {
    const sentAt = new Date().toISOString();
    const { error } = await supabase
      .from('monthly_income_records')
      .update({ receipt_sent_at: sentAt })
      .eq('id', row.id);
    if (error) throw error;

    await supabase.from('notifications').insert({
      recipient_profile_id: row.tenant_profile_id,
      title: 'Payment Receipt',
      message: `Your payment of ₱${Number(row.remitted_amount).toLocaleString()} (Rent ₱${Number(row.rent_amount).toLocaleString()} + Water ₱${Number(row.water_payment).toLocaleString()}) for ${row.rooms.room_number}, received ${row.date_paid} via ${row.payment_method}, has been confirmed. Invoice #${row.invoice_number}.`,
      type: 'Receipt',
      priority: 'Low',
      related_entity_type: 'MONTHLY_INCOME_RECORD',
      related_entity_id: row.id,
    });

    row.receipt_sent_at = sentAt;
    showToast('Receipt Sent', `Payment confirmation sent to ${row.contact_name}.`, 'success');
  } catch (err: any) {
    showToast('Failed to Send Receipt', err?.message || 'Something went wrong.', 'error');
  } finally {
    sendingReceiptId.value = null;
  }
}

// When a unit is picked: pre-fill contact name, rent amount, occupants (from the tenant's
// previous-month entry when one exists -- BR-034), water default, and Linda fixed charges.
watch(
  () => form.value.roomId,
  async () => {
    waterConfirmed.value = false;
    const room = selectedRoom.value;
    const assignment = selectedAssignment.value;
    if (!room) return;

    form.value.contactName = assignment?.tenant_name ?? '';
    form.value.rentAmount = Number(room.current_price);
    form.value.invoiceNumber = `INV-${form.value.billingYear}-${String(form.value.billingMonth).padStart(2, '0')}-${room.room_number}`;

    let occupants = assignment?.occupant_count ?? 1;
    if (assignment) {
      const { data: prevEntry } = await supabase
        .from('monthly_income_records')
        .select('occupants')
        .eq('room_id', room.id)
        .eq('tenant_profile_id', assignment.tenant_profile_id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevEntry) occupants = prevEntry.occupants;
    }
    form.value.occupants = occupants;

    if (room.is_linda_unit) {
      form.value.waterPayment = LINDA_WATER_DEFAULTS[room.room_number] ?? 0;
      form.value.lindaElectricityCharge = LINDA_ELECTRICITY_DEFAULT;
      form.value.lindaWaterCharge = form.value.waterPayment;
    } else {
      form.value.waterPayment = occupants * 200;
    }

    // GBG is charged once per unit per calendar year (BR-037) -- hide the field if already used.
    const { data: gbgRows } = await supabase
      .from('monthly_income_records')
      .select('id')
      .eq('room_id', room.id)
      .eq('year', form.value.billingYear)
      .gt('gbg_fee', 0)
      .limit(1);
    form.value.gbgAlreadyChargedThisYear = (gbgRows?.length ?? 0) > 0;
    form.value.gbgFee = 0;
  }
);

watch(() => form.value.occupants, () => {
  waterConfirmed.value = false;
  if (!isLinda.value) form.value.waterPayment = form.value.occupants * 200;
});

const resetForm = () => {
  form.value.roomId = '';
  form.value.contactName = '';
  form.value.invoiceNumber = '';
  form.value.rentAmount = 0;
  form.value.occupants = 1;
  form.value.waterPayment = 0;
  form.value.gbgFee = 0;
  form.value.paymentMethod = 'Cash';
  waterConfirmed.value = false;
};

const submitPayment = async () => {
  if (!selectedRoom.value) {
    showToast('Missing Information', 'Select a room/unit before recording a payment.', 'error');
    return;
  }
  if (!rentPeriod.value) {
    showToast(
      'No Active Tenant',
      `${selectedRoom.value.room_number} has no active tenant assignment, so a billing period can't be derived. Onboard a tenant for this unit first (Tenant Management).`,
      'error',
      6000
    );
    return;
  }

  if (waterMismatch.value && !waterConfirmed.value) {
    showToast(
      'Water Billing Notice (BR-036)',
      `Water Payment entered is ₱${form.value.waterPayment}. Expected for ${form.value.occupants} occupant(s) is ₱${expectedWater.value} (${form.value.occupants} × ₱200). Click "Confirm & Save" again to save anyway.`,
      'warning',
      7000
    );
    waterConfirmed.value = true; // next click proceeds
    return;
  }

  saving.value = true;
  const payload: Record<string, any> = {
    room_id: selectedRoom.value.id,
    tenant_profile_id: selectedAssignment.value?.tenant_profile_id ?? null,
    assignment_id: selectedAssignment.value?.id ?? null,
    year: form.value.billingYear,
    month: form.value.billingMonth,
    date_paid: form.value.datePaid,
    contact_name: form.value.contactName,
    invoice_number: form.value.invoiceNumber,
    rent_period_start: rentPeriod.value.start.toISOString().slice(0, 10),
    rent_period_end: rentPeriod.value.end.toISOString().slice(0, 10),
    rent_amount: form.value.rentAmount,
    occupants: form.value.occupants,
    water_payment: form.value.waterPayment,
    gbg_fee: form.value.gbgFee || 0,
    is_linda_billing: isLinda.value,
    linda_electricity_charge: isLinda.value ? form.value.lindaElectricityCharge : 0,
    linda_water_charge: isLinda.value ? form.value.lindaWaterCharge : 0,
    payment_method: form.value.paymentMethod,
    verification_status: form.value.paymentMethod === 'Adyen Online' ? 'Pending Verification' : 'Verified',
  };

  const { error } = await supabase.from('monthly_income_records').insert(payload);
  saving.value = false;

  if (error) {
    showToast('Failed to Record Payment', error.message, 'error');
    return;
  }

  showToast('Payment Recorded', `Monthly income entry for ${selectedRoom.value.room_number} saved and added to the ledger.`, 'success');
  selectedYear.value = form.value.billingYear;
  selectedMonth.value = form.value.billingMonth;
  resetForm();
  await loadAll();
};

const verifyPendingPayment = async (payment: PendingPayment) => {
  const verifiedAt = new Date().toISOString();
  const { error } = await supabase
    .from('payments')
    .update({
      verification_status: 'Verified',
      verified_at: verifiedAt,
      verified_by: authStore.profile!.id,
      receipt_sent_at: verifiedAt,
    })
    .eq('id', payment.id);

  if (error) {
    showToast('Verification Failed', error.message, 'error');
    return;
  }

  // Verification is the confirmation moment for online payments -- send the receipt immediately.
  await supabase.from('notifications').insert({
    recipient_profile_id: payment.tenant_profile_id,
    title: 'Payment Receipt',
    message: `Your online payment of ₱${Number(payment.amount).toLocaleString()} for ${payment.rooms.room_number} via ${payment.payment_method} has been verified and confirmed.${payment.transaction_reference ? ` Ref: ${payment.transaction_reference}.` : ''}`,
    type: 'Receipt',
    priority: 'Low',
    related_entity_type: 'PAYMENT',
    related_entity_id: payment.id,
  });

  showToast('Payment Verified', `₱${payment.amount.toLocaleString()} from ${payment.rooms.room_number} confirmed and receipt sent.`, 'success');
  pendingPayments.value = pendingPayments.value.filter((p) => p.id !== payment.id);
};
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Billing &amp; Income</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Monthly Income Report</h1>
      </div>
    </div>

    <div v-if="loading" class="text-xs text-[#6b778c] p-6 text-center">Loading billing data...</div>

    <template v-else>
      <!-- Pending Online Verification (BR-016/017) -->
      <div v-if="pendingPayments.length > 0" class="jira-card p-4 border-l-4 border-l-amber-500 space-y-2">
        <h3 class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Online Payments Awaiting Verification</h3>
        <div v-for="p in pendingPayments" :key="p.id" class="flex items-center justify-between text-xs bg-[#fffae6] border border-[#ffe380] rounded-xs p-2.5">
          <span>
            <strong>{{ p.rooms.room_number }}</strong> &mdash; {{ p.profiles?.full_name }} &mdash;
            &#8369;{{ Number(p.amount).toLocaleString() }} via {{ p.payment_method }}
            <span v-if="p.transaction_reference" class="text-[#6b778c]">(ref: {{ p.transaction_reference }})</span>
          </span>
          <button @click="verifyPendingPayment(p)" class="jira-btn-primary text-[11px] py-1 px-2.5">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Verify
          </button>
        </div>
      </div>

      <!-- Guided Monthly Payment Entry (Spec 09 Section 7) -->
      <div class="jira-card p-4 space-y-3">
        <h3 class="font-bold text-sm text-[#172b4d] pb-2 border-b border-[#dfe1e6]">Record Monthly Payment</h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Unit</label>
            <select v-model="form.roomId" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
              <option value="" disabled>Select a unit...</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.room_number }}{{ r.is_linda_unit ? ' (Linda fixed rate)' : '' }}</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Date Paid</label>
            <input v-model="form.datePaid" type="date" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Billing Month (Rent For)</label>
            <div class="flex gap-1.5">
              <select v-model.number="form.billingMonth" class="w-1/2 p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
                <option v-for="m in 12" :key="m" :value="m">{{ new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' }) }}</option>
              </select>
              <input v-model.number="form.billingYear" type="number" class="w-1/2 p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Contact Name</label>
            <input v-model="form.contactName" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Invoice Number</label>
            <input v-model="form.invoiceNumber" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Rent For (derived)</label>
            <div class="p-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-xs font-mono">{{ rentPeriodLabel }}</div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Rent Amount (&#8369;)</label>
            <input v-model.number="form.rentAmount" type="number" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">50% Share (derived)</label>
            <div class="p-1.5 bg-[#e3fcef] border border-[#abf5d1] rounded-xs font-mono text-[#006644]">&#8369;{{ fiftyPercentPreview.toLocaleString() }}</div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Occupants</label>
            <input v-model.number="form.occupants" type="number" min="0" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" :disabled="isLinda" />
          </div>

          <template v-if="!isLinda">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Water Payment (&#8369;200/head)</label>
              <input v-model.number="form.waterPayment" type="number" :class="['w-full p-1.5 border rounded-xs', waterMismatch ? 'bg-[#fffae6] border-amber-400' : 'bg-white border-[#dfe1e6]']" />
              <p v-if="waterMismatch" class="text-[10px] text-amber-700 mt-0.5">Expected &#8369;{{ expectedWater }} for {{ form.occupants }} occupant(s).</p>
            </div>

            <div v-if="!form.gbgAlreadyChargedThisYear">
              <label class="block font-semibold text-[#5e6c84] mb-1">GBG (Garbage, once/year)</label>
              <input v-model.number="form.gbgFee" type="number" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </template>

          <template v-else>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Linda Water Charge (&#8369;, fixed)</label>
              <input v-model.number="form.lindaWaterCharge" type="number" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Linda Electricity Charge (&#8369;, fixed)</label>
              <input v-model.number="form.lindaElectricityCharge" type="number" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </template>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Payment Method</label>
            <select v-model="form.paymentMethod" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Adyen Online">Adyen Online (GCash checkout)</option>
            </select>
          </div>
        </div>

        <div class="p-2.5 bg-[#deebff] border border-[#b3d4ff] rounded-xs text-[#0747a6] text-xs flex items-center justify-between">
          <span>Remitted Amount (Rent + Water, derived):</span>
          <strong class="text-sm">&#8369;{{ remittedPreview.toLocaleString() }}</strong>
        </div>

        <div class="flex justify-end pt-2">
          <button @click="submitPayment" :disabled="saving || !form.roomId" class="jira-btn-primary disabled:opacity-60">
            <Plus class="w-3.5 h-3.5" />
            {{ waterConfirmed && waterMismatch ? 'Confirm & Save' : saving ? 'Saving...' : 'Record Monthly Payment' }}
          </button>
        </div>
      </div>

      <!-- Cluster-Grouped Monthly Ledger (FR-031/BR-032, 09_MONTHLY_INCOME_REPORT.md Section 3) -->
      <div class="jira-card overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#dfe1e6]">
          <div class="flex items-center gap-2">
            <select v-model.number="selectedMonth" class="p-1.5 bg-white border border-[#dfe1e6] rounded-xs text-xs">
              <option v-for="m in 12" :key="m" :value="m">{{ new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' }) }}</option>
            </select>
            <input v-model.number="selectedYear" type="number" class="w-20 p-1.5 bg-white border border-[#dfe1e6] rounded-xs text-xs" />
          </div>
          <button @click="exportIncomeReport" :disabled="exporting" class="jira-btn-secondary text-xs disabled:opacity-50">
            <Download class="w-3.5 h-3.5" />
            {{ exporting ? 'Exporting…' : 'Export to Excel' }}
          </button>
        </div>

        <div v-if="ledger.length === 0" class="py-8 text-center text-xs text-[#6b778c]">
          No income entries recorded for {{ monthLabel }}.
        </div>

        <div v-else class="overflow-x-auto">
          <template v-for="group in clusterGroups" :key="group.code">
            <table v-if="group.rows.length > 0" class="w-full text-left border-collapse text-xs mb-1">
              <thead>
                <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
                  <th class="py-2 px-3" colspan="11">{{ group.name }}</th>
                </tr>
                <tr class="border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-1.5 px-3">Rm #</th>
                  <th class="py-1.5 px-3">Date Paid</th>
                  <th class="py-1.5 px-3">Contact / Invoice</th>
                  <th class="py-1.5 px-3">Rent For</th>
                  <th class="py-1.5 px-3">Rent</th>
                  <th class="py-1.5 px-3">50%</th>
                  <th class="py-1.5 px-3">Occ</th>
                  <th class="py-1.5 px-3">Water</th>
                  <th class="py-1.5 px-3">Remitted</th>
                  <th class="py-1.5 px-3">Status</th>
                  <th class="py-1.5 px-3">Receipt</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
                <tr v-for="row in group.rows" :key="row.id" class="hover:bg-[#f7f8f9]">
                  <td class="py-2 px-3 font-bold">{{ row.rooms.room_number }}</td>
                  <td class="py-2 px-3">{{ row.date_paid }}</td>
                  <td class="py-2 px-3">{{ row.contact_name }} <span class="text-rose-600 font-mono">{{ row.invoice_number }}</span></td>
                  <td class="py-2 px-3 font-mono text-[11px]">{{ row.rent_period_start }} &ndash; {{ row.rent_period_end }}</td>
                  <td class="py-2 px-3 font-bold">&#8369;{{ Number(row.rent_amount).toLocaleString() }}</td>
                  <td class="py-2 px-3 text-emerald-700">&#8369;{{ Number(row.fifty_percent_share).toLocaleString() }}</td>
                  <td class="py-2 px-3">{{ row.occupants }}</td>
                  <td class="py-2 px-3">&#8369;{{ Number(row.water_payment).toLocaleString() }}</td>
                  <td class="py-2 px-3 font-bold text-[#0c66e4]">&#8369;{{ Number(row.remitted_amount).toLocaleString() }}</td>
                  <td class="py-2 px-3">
                    <span :class="['jira-badge', row.verification_status === 'Verified' ? 'jira-badge-done' : 'jira-badge-warning']">{{ row.verification_status }}</span>
                  </td>
                  <td class="py-2 px-3">
                    <span v-if="row.receipt_sent_at" class="jira-badge jira-badge-done">Sent</span>
                    <button
                      v-else-if="row.verification_status === 'Verified'"
                      @click="sendReceipt(row)"
                      :disabled="sendingReceiptId === row.id"
                      class="jira-btn-secondary text-[10px] py-1 px-2 disabled:opacity-50"
                    >
                      <Receipt class="w-3 h-3" />
                      {{ sendingReceiptId === row.id ? 'Sending…' : 'Send Receipt' }}
                    </button>
                  </td>
                </tr>
                <tr class="bg-[#ebecf0] font-bold">
                  <td class="py-2 px-3" colspan="4">{{ group.name }} Subtotal</td>
                  <td class="py-2 px-3">&#8369;{{ group.subtotal.rentAmount.toLocaleString() }}</td>
                  <td class="py-2 px-3"></td>
                  <td class="py-2 px-3">{{ group.subtotal.occupants }}</td>
                  <td class="py-2 px-3">&#8369;{{ group.subtotal.waterPayment.toLocaleString() }}</td>
                  <td class="py-2 px-3 text-[#0c66e4]">&#8369;{{ group.subtotal.remittedAmount.toLocaleString() }}</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Grand Subtotal (BH + Back Apartment + Front Apartment, excluding Linda) -->
          <table v-if="standardLedger.length > 0" class="w-full text-left border-collapse text-xs">
            <tbody>
              <tr class="bg-[#deebff] font-bold text-[#0747a6]">
                <td class="py-2.5 px-3" colspan="4">Grand Subtotal (BH + Back Apartment + Front Apartment)</td>
                <td class="py-2.5 px-3">&#8369;{{ grandSubtotal.rentAmount.toLocaleString() }}</td>
                <td class="py-2.5 px-3"></td>
                <td class="py-2.5 px-3">{{ grandSubtotal.occupants }}</td>
                <td class="py-2.5 px-3">&#8369;{{ grandSubtotal.waterPayment.toLocaleString() }}</td>
                <td class="py-2.5 px-3">&#8369;{{ grandSubtotal.remittedAmount.toLocaleString() }}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <!-- Linda Section: separate fixed-rate flow, remitted directly to Linda (Section 6) -->
          <table v-if="lindaLedger.length > 0" class="w-full text-left border-collapse text-xs mt-3 border-t-2 border-[#dfe1e6]">
            <thead>
              <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
                <th class="py-2 px-3" colspan="7">Linda (Fixed-Rate Units)</th>
              </tr>
              <tr class="border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
                <th class="py-1.5 px-3">Rm #</th>
                <th class="py-1.5 px-3">Date Paid</th>
                <th class="py-1.5 px-3">Contact / Invoice</th>
                <th class="py-1.5 px-3">Rent</th>
                <th class="py-1.5 px-3">Electricity (Fixed)</th>
                <th class="py-1.5 px-3">Water (Fixed)</th>
                <th class="py-1.5 px-3">Receipt</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
              <tr v-for="row in lindaLedger" :key="row.id" class="hover:bg-[#f7f8f9]">
                <td class="py-2 px-3 font-bold">{{ row.rooms.room_number }}</td>
                <td class="py-2 px-3">{{ row.date_paid }}</td>
                <td class="py-2 px-3">{{ row.contact_name }} <span class="text-rose-600 font-mono">{{ row.invoice_number }}</span></td>
                <td class="py-2 px-3 font-bold">&#8369;{{ Number(row.rent_amount).toLocaleString() }}</td>
                <td class="py-2 px-3">&#8369;{{ Number(row.linda_electricity_charge).toLocaleString() }}</td>
                <td class="py-2 px-3">&#8369;{{ Number(row.linda_water_charge).toLocaleString() }}</td>
                <td class="py-2 px-3">
                  <span v-if="row.receipt_sent_at" class="jira-badge jira-badge-done">Sent</span>
                  <button
                    v-else-if="row.verification_status === 'Verified'"
                    @click="sendReceipt(row)"
                    :disabled="sendingReceiptId === row.id"
                    class="jira-btn-secondary text-[10px] py-1 px-2 disabled:opacity-50"
                  >
                    <Receipt class="w-3 h-3" />
                    {{ sendingReceiptId === row.id ? 'Sending…' : 'Send Receipt' }}
                  </button>
                </td>
              </tr>
              <tr class="bg-[#ebecf0] font-bold">
                <td class="py-2.5 px-3" colspan="3">Linda Total (remitted directly to Linda)</td>
                <td class="py-2.5 px-3">&#8369;{{ lindaTotals.rent.toLocaleString() }}</td>
                <td class="py-2.5 px-3">&#8369;{{ lindaTotals.electricity.toLocaleString() }}</td>
                <td class="py-2.5 px-3">&#8369;{{ lindaTotals.water.toLocaleString() }}</td>
                <td class="py-2.5 px-3 text-[#0c66e4]">&#8369;{{ lindaGrandTotal.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
