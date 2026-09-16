<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  isOnsitePaymentModalOpen, 
  rooms, 
  incomeRecords, 
  fetchIncomeRecords, 
  fetchRooms, 
  fetchTenants, 
  formatUnitOccupantsSummary, 
  showToast 
} from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Banknote, Loader2, ReceiptText, Users } from 'lucide-vue-next';

const selectedUnit = ref('1a');
/**
 * Starts at zero, not at a plausible peso figure.
 *
 * This was `ref(4500)`. The watcher below only overwrites it when the unit is
 * found AND carries a price, so a lookup that came back empty left 4,500 sitting
 * in the field - and this is the on-site cash form, so that figure is what gets
 * collected and written to the ledger as the rent.
 */
const rentAmount = ref(0);
const waterAmount = ref(400); 
const gbgFee = ref(0);
const orNum = ref('');
// The property's today, not UTC's. Before 08:00 Manila the old expression
// offered YESTERDAY as the default date on a payment form.
import { propertyToday, periodEnd } from '@/lib/propertyDate';
const date = ref(propertyToday());
const isSubmitting = ref(false);

// Payment method & reference
/**
 * `payment_method_type` is (Cash | GCash | Bank Transfer | Adyen Online). This modal offered
 * only Cash and "Online Payment", and the API filed "Online" as GCash - while the reference
 * field beside it invited a "Gcash / Bank Ref #". A bank transfer handed over the counter
 * was therefore recorded in the ledger as GCash.
 *
 * 'Adyen Online' is not offered on purpose: that value is written by the gateway's webhook,
 * and an administrator should not be able to assert by hand that money came through Adyen.
 */
const paymentMethod = ref<'Cash' | 'GCash' | 'Bank Transfer'>('Cash');

/** Cash has no reference to record; the other two do. */
const methodHasReference = computed(() => paymentMethod.value !== 'Cash');
const transactionReference = ref('');

// Validity duration
const monthsCovered = ref(1);
const dateCoveredStart = ref(propertyToday());

// Auto-calculate end date based on start date + monthsCovered
const dateCoveredEnd = computed(() => {
  // Shared with the server's rule. The version here overflowed on month ends -
  // 31 January plus one month became 2 March - and the API prefers a supplied
  // end date over its own, so this preview could overwrite a correct figure.
  return periodEnd(dateCoveredStart.value, monthsCovered.value);
});

// Format Helper
function formatDateForDisplay(dStr: string): string {
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const unitOccupantsSummary = computed(() => {
  return formatUnitOccupantsSummary(selectedUnit.value);
});

const currentOccupantsCount = computed(() => {
  return unitOccupantsSummary.value.count > 0 ? unitOccupantsSummary.value.count : 1;
});

// Auto-calculate water and rent based on dynamic room occupants and rates
/**
 * The configured water rates, from `GET /api/public/rates`.
 *
 * This modal hardcoded 200 in six places, and the Linda fixed charges as 400 and
 * 200. That is the same defect that was fixed in the backend - the rate lives in
 * `system_settings` and is applied by `billingService` - reappearing on the
 * client. The landlady could change her rate and this form would go on validating
 * against the old one, rejecting correct entries and accepting wrong ones.
 *
 * Null until loaded. Every use falls back to the previous literal so the form
 * still works if the call fails; the difference is that it is no longer the only
 * source.
 */
const waterRatePerOccupant = ref<number | null>(null);
const lindaFixedWater = ref<Record<string, number | null>>({});

async function loadRates() {
  try {
    const r = await api.get<{
      waterRatePerOccupant: number;
      lindaFixedWaterCharges: Record<string, number | null>;
    }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
    lindaFixedWater.value = r?.lindaFixedWaterCharges ?? {};
  } catch {
    // Leave both null; the literals below stand in.
  }
}

/** The per-month water baseline for a unit, from the configured rates. */
function waterBaselineFor(unitCode: string, occupants: number): number {
  const code = unitCode.toUpperCase();
  const fixed = lindaFixedWater.value[code];
  if (fixed != null) return fixed;
  if (code === 'LF') return 400;
  if (code === 'LB') return 200;
  return occupants * (waterRatePerOccupant.value ?? 200);
}

watch([selectedUnit, monthsCovered], ([newUnit, newMonths]) => {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === newUnit.toLowerCase());
  const summary = formatUnitOccupantsSummary(newUnit);
  const occCount = summary.count > 0 ? summary.count : (room?.occupants || 1);
  const isLinda = room?.cluster === 'Linda Units' || newUnit.toLowerCase() === 'lf' || newUnit.toLowerCase() === 'lb';
  
  const mCovered = Math.max(1, Number(newMonths) || 1);

  waterAmount.value = waterBaselineFor(isLinda ? newUnit : newUnit, occCount) * mCovered;

  // Cleared when the unit has no price, rather than left holding the PREVIOUS
  // unit's figure. Picking unit A at 8,000 and then unit B, which has no price
  // on record, used to keep 8,000 in the field - unit A's rent, about to be
  // recorded against unit B.
  rentAmount.value = room && room.price ? room.price * mCovered : 0;
}, { immediate: true });


watch(isOnsitePaymentModalOpen, (isOpen) => {
  if (isOpen) {
    loadRates();
    fetchTenants();
    fetchRooms();
  }
});

// Total amount received calculation
const totalAmountReceived = computed(() => {
  return (Number(rentAmount.value) || 0) + (Number(waterAmount.value) || 0) + (Number(gbgFee.value) || 0);
});

// Custom Confirm Modal state
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

function closeModal() {
  isOnsitePaymentModalOpen.value = false;
}

function triggerRecord() {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === selectedUnit.value.toLowerCase());
  const unitUpper = selectedUnit.value.toUpperCase();
  const summary = formatUnitOccupantsSummary(selectedUnit.value);
  const occCount = summary.count > 0 ? summary.count : (room?.occupants || 1);
  const mCovered = Math.max(1, Number(monthsCovered.value) || 1);

  const monthlyWaterBaseline = waterBaselineFor(unitUpper, occCount);
  const totalWaterBaseline = monthlyWaterBaseline * mCovered;
  const perOccupantRate = waterRatePerOccupant.value ?? 200;

  const waterVal = Number(waterAmount.value) || 0;
  
  if (waterVal !== 0) {
    if (waterVal < totalWaterBaseline) {
      showToast('error', 'Water Payment Error', `Water payment for ${unitUpper} cannot be lower than ₱${totalWaterBaseline} for ${occCount} occupant(s) across ${mCovered} month(s) unless it is ₱0.`);
      return;
    }
    if (waterVal % perOccupantRate !== 0) {
      showToast('error', 'Water Payment Error', `Water payment must be a whole multiple of ₱${perOccupantRate}.`);
      return;
    }
  }

  const formattedStart = new Date(dateCoveredStart.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const formattedEnd = new Date(dateCoveredEnd.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const confirmMsg = `
    Unit: ${selectedUnit.value.toUpperCase()} (${summary.text || (room?.tenant || 'Vacant')})
    Occupants: ${occCount} Registered Headcount
    Rent Amount: ₱${rentAmount.value}
    Water Payment: ₱${waterAmount.value} (₱${perOccupantRate} per occupant)
    GBG/Garbage Fee: ₱${gbgFee.value}
    Total Amount: ₱${totalAmountReceived.value}
    Validity Period: ${monthsCovered.value} month(s) (${formattedStart} to ${formattedEnd})
    Payment Method: ${paymentMethod.value} ${methodHasReference.value ? `(Ref: ${transactionReference.value})` : ''}
  `;

  // Every one of the 937 ledger rows carries an OR number from the landlady's
  // receipt book, and the column is NOT NULL. The API no longer invents one, so
  // ask here rather than failing after she has confirmed the amount.
  if (!orNum.value.trim()) {
    showToast('error', 'OR number required', 'Enter the number from the receipt you issued.');
    return;
  }

  showConfirm(
    'Confirm Payment Entry',
    confirmMsg,
    async () => {
      isSubmitting.value = true;
      try {
        /**
         * The ledger write must succeed before anything on screen says it did.
         *
         * This block previously did the opposite, in three compounding ways.
         * If the unit could not be matched to a room the POST was skipped
         * outright with no error; if the POST threw, the failure was swallowed
         * with a console warning and the comment "relying on local sync"; and in
         * both cases an income record was pushed into local state under a made-up
         * id, the unit was marked settled with a zero balance, and a toast
         * announced the amount "posted to the ledger". The landlady would have
         * taken cash, seen the unit go green, and had nothing in the books.
         */
        const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
        const matched = allRooms.find((r) => r.room_number.toLowerCase() === selectedUnit.value.toLowerCase());

        if (!matched) {
          showToast(
            'error',
            'Unit not found',
            `No unit "${selectedUnit.value.toUpperCase()}" exists, so nothing was recorded.`
          );
          return;
        }

        const payload = {
          roomNumber: selectedUnit.value.toUpperCase(),
          datePaid: date.value,
          contactName: summary.residents.length > 0 ? summary.residents.join(', ') : (room?.tenant || ''),
          // An OR number identifies a physical receipt. Generating one from
          // `Math.random()` puts a number on the ledger that matches no receipt
          // in the landlady's book, and two entries could collide.
          invoiceNumber: orNum.value.trim(),
          rentAmount: Number(rentAmount.value) || 0,
          occupants: occCount,
          paymentMethod: paymentMethod.value,
          transactionReference: methodHasReference.value ? transactionReference.value : undefined,
          monthsCovered: Number(monthsCovered.value) || 1,
          dateCoveredStart: dateCoveredStart.value,
          dateCoveredEnd: dateCoveredEnd.value,
        };

        const response = await api.post<any>('/admin/income-records', payload);
        const serverRecordId = response?.data?.id ?? response?.id;

        if (!serverRecordId) {
          showToast('error', 'Not recorded', 'The ledger did not confirm this entry. Nothing was posted.');
          return;
        }

        const inv = orNum.value.trim();

        incomeRecords.unshift({
          id: serverRecordId,
          unit: selectedUnit.value.toUpperCase(),
          cluster: room?.cluster || 'BH',
          datePaid: formatDateForDisplay(date.value),
          contact: summary.residents.length > 0 ? summary.residents.join(', ') : (room?.tenant || 'Walk-in Resident'),
          invoice: inv,
          rentFor: `${formattedStart} – ${formattedEnd}`,
          rent: Number(rentAmount.value) || 0,
          occupants: occCount,
          water: Number(waterAmount.value) || 0,
          garbage: Number(gbgFee.value) || 0,
          anniversary: new Date(date.value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          // Advance rent (OD-04), not a computed guess. The ledger row the API
          // just returned is the record; this local copy only mirrors the screen
          // until the refetch below replaces it.
          deposit: 0,
        });

        if (room) {
          room.status = 'settled';
          room.paid = true;
          room.balance = 0;
        }

        await Promise.allSettled([fetchIncomeRecords(), fetchRooms(), fetchTenants()]);

        showToast('success', 'Payment recorded', `Unit ${selectedUnit.value.toUpperCase()} · ₱${totalAmountReceived.value} posted to the ledger.`);
        closeModal();
      } catch (err: unknown) {
        showToast(
          'error',
          'Payment NOT recorded',
          err instanceof Error
            ? `${err.message} Nothing was written to the ledger - please try again.`
            : 'Nothing was written to the ledger - please try again.'
        );
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}
</script>

<template>
  <div 
    v-if="isOnsitePaymentModalOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <div class="surface-card w-full max-w-2xl shadow-2xl p-6 space-y-4 rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex justify-between items-start border-b border-border pb-3">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-accent-ink">
            <Banknote class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-foreground">Record On-Site Payment</h3>
            <p class="text-xs text-muted-foreground">Logs a cash or online remittance received from a tenant.</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer">
          <X class="size-5" />
        </button>
      </div>

      <form @submit.prevent="triggerRecord" class="space-y-4 text-xs">
        <!-- Room/Unit selector with dynamic occupants info -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Unit</label>
          <select v-model="selectedUnit" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none">
            <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
              {{ r.unitCode.toUpperCase() }} — {{ formatUnitOccupantsSummary(r.unitCode).text }} ({{ r.cluster }})
            </option>
          </select>
        </div>

        <!-- Rent Amount & Water Payment Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Amount for Rent (₱)</label>
            <input v-model.number="rentAmount" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Payment for Water (₱)</label>
              <span class="text-[10px] font-semibold text-primary">
                ₱{{ waterRatePerOccupant ?? 200 }} × {{ currentOccupantsCount }} {{ currentOccupantsCount === 1 ? 'occupant' : 'occupants' }}
              </span>
            </div>
            <input v-model.number="waterAmount" type="number" min="0" step="200" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
            <p class="text-[10px] text-muted-foreground mt-1">
              <span v-if="selectedUnit.toLowerCase() === 'lf' || selectedUnit.toLowerCase() === 'lb'">
                Fixed Linda utility rule (₱{{ selectedUnit.toLowerCase() === 'lf' ? 400 : 200 }}/mo)
              </span>
              <span v-else>
                Dynamic: <strong class="text-foreground">{{ currentOccupantsCount }} Headcount</strong> ({{ unitOccupantsSummary.text }})
              </span>
            </p>
          </div>
        </div>

        <!-- GBG Fee & OR Receipt Number Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">GBG Fee (₱)</label>
            <input v-model.number="gbgFee" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-bold text-foreground focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">OR / Receipt Number</label>
            <input v-model="orNum" type="text" placeholder="OR#4627" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm font-mono text-foreground focus:border-primary focus:outline-none" required />
          </div>
        </div>

        <!-- Payment Method & Online Reference Number Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Payment Method</label>
            <select v-model="paymentMethod" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" :class="{ 'opacity-40': !methodHasReference }">Transaction Reference #</label>
            <input v-model="transactionReference" type="text" :placeholder="paymentMethod === 'Bank Transfer' ? 'Bank reference #' : 'GCash reference #'" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-40 disabled:bg-muted" :disabled="!methodHasReference" :required="methodHasReference" />
          </div>
        </div>

        <!-- Rent Validity / Duration Details Row -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Months Covered</label>
            <input v-model.number="monthsCovered" type="number" min="1" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Covered Period Start</label>
            <input v-model="dateCoveredStart" type="date" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Covered Period End</label>
            <input :value="dateCoveredEnd" type="date" class="min-h-11 w-full px-3.5 bg-background border border-border rounded-xl text-sm text-muted-foreground focus:outline-none" disabled />
          </div>
        </div>

        <!-- Date Received & Read-Only Total Amount calculation -->
        <div class="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Date Received</label>
            <input v-model="date" type="date" class="min-h-11 w-full px-3.5 bg-white border border-border rounded-xl text-sm text-foreground focus:border-primary focus:outline-none" required />
          </div>
          <div class="bg-background border border-border rounded-2xl p-3.5 flex flex-col justify-center">
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount Received (₱)</span>
            <span class="font-display font-black text-lg text-emerald-800 pt-0.5">{{ peso(totalAmountReceived) }}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-border flex justify-end gap-3">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary">
            <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
            <Check v-else class="size-3.5" />
            <span>{{ isSubmitting ? 'Recording…' : 'Record Payment' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Custom Confirmation Modal inside Payment modal -->
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
          <h3 class="font-display font-extrabold text-lg text-foreground">Confirm Payment Collection</h3>
          
          <div class="w-full text-left bg-background border border-border rounded-xl p-3.5 text-xs text-foreground space-y-1.5 leading-relaxed font-semibold">
            <div class="flex justify-between border-b border-border/50 pb-1">
              <span class="text-muted-foreground font-medium">Unit:</span>
              <span class="font-extrabold uppercase">{{ selectedUnit.toUpperCase() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground font-medium">Amount for Rent:</span>
              <span class="font-bold">{{ peso(rentAmount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground font-medium">Payment for Water:</span>
              <span class="font-bold">{{ peso(waterAmount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground font-medium">GBG / Garbage Fee:</span>
              <span class="font-bold">{{ peso(gbgFee) }}</span>
            </div>
            <div class="flex justify-between border-t border-border/50 pt-1 font-extrabold text-emerald-800">
              <span>Total Received:</span>
              <span>{{ peso(totalAmountReceived) }}</span>
            </div>
            <div class="flex justify-between pt-1">
              <span class="text-muted-foreground font-medium">Validity Period:</span>
              <span class="font-semibold text-right">{{ monthsCovered }} month(s)<br/>({{ formatDateForDisplay(dateCoveredStart) }} – {{ formatDateForDisplay(dateCoveredEnd) }})</span>
            </div>
            <div class="flex justify-between border-t border-border/50 pt-1">
              <span class="text-muted-foreground font-medium">Payment Method:</span>
              <span class="font-semibold">{{ paymentMethod }} {{ methodHasReference ? `(Ref: ${transactionReference})` : '' }}</span>
            </div>
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
