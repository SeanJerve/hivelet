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
  showToast,
  roomsFetchFailed,
  asListedUnitCode
} from '@/lib/systemState';
import WsModal from '@/components/ui/WsModal.vue';
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

/**
 * The headcount this form is actually billing for - the same number the water
 * calculation and the payload use, not a second opinion about it.
 *
 * This was `count > 0 ? count : 1`. That is the `|| 1` guess `occupantsFor()`
 * twenty lines below was deliberately written to stop making, still being made
 * for the label. On a unit the system knows nobody in - `PH`, which is the
 * vacant one the rehearsal runs on - the water baseline is 0 and the field
 * holds 0, while the label beside it read "₱200 × 1 occupant". The same shape
 * as the watch-dependency defect recorded further down this file: a stated rule
 * and a stated headcount next to a figure that contradicts both.
 */
const currentOccupantsCount = computed(() => {
  const room = rooms.find(
    (r) => r.unitCode.toLowerCase() === selectedUnit.value.toLowerCase()
  );
  return occupantsFor(unitOccupantsSummary.value, room);
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
/**
 * How many people this unit is billed for, or 0 when that is not known.
 *
 * Both call sites used `summary.count > 0 ? summary.count : (room?.occupants || 1)`.
 * The `|| 1` was a guess: one occupant, asserted about a unit the system had just
 * failed to find anybody in. At the per-head water rate that is a real charge
 * invented out of nothing, and the figure is written to
 * `monthly_income_records.occupants` as the registered headcount.
 *
 * `room.occupants` itself is only worth reading while the room list is live. It
 * is 0 in the seeded initial state - checked, `systemState.ts` sets it to 0
 * rather than carrying `canonicalUnits`' own figure - so a failed `fetchRooms()`
 * leaves 0, and 0 is what this should return anyway. `roomsFetchFailed` is
 * checked regardless, because "the value happens to be harmless today" is not a
 * property worth depending on.
 *
 * Returning 0 makes the water baseline 0, so the form neither pre-fills a figure
 * nor refuses the one the administrator types off the receipt. That is the right
 * behaviour when the system does not know: ask, do not assume.
 */
function occupantsFor(
  summary: { count: number },
  room: { occupants?: number } | undefined
): number {
  if (summary.count > 0) return summary.count;
  if (roomsFetchFailed.value) return 0;
  return Number(room?.occupants ?? 0);
}

function waterBaselineFor(unitCode: string, occupants: number): number {
  const code = unitCode.toUpperCase();
  const fixed = lindaFixedWater.value[code];
  if (fixed != null) return fixed;
  if (code === 'LF') return 400;
  if (code === 'LB') return 200;
  return occupants * (waterRatePerOccupant.value ?? 200);
}

/**
 * `unitOccupantsSummary` is in this list because the calculation READS it.
 *
 * It was not, and the omission cost a money figure. The watch fired once as the
 * modal opened - before the occupancy data had arrived - so `occupantsFor()`
 * saw nothing, water was set to `0 x 200 = 0`, and it never ran again because
 * none of its three dependencies changed afterwards. The label beside the field
 * is a computed and DID update, so the form sat there reading:
 *
 *     Water    ₱200 × 3 occupants          [ 0 ]
 *
 * Stating the rule and the occupant count next to a figure that contradicts
 * both. Touching the unit dropdown re-fired the watch and corrected it to 600,
 * which is why it survived: anyone who changed the unit never saw it.
 *
 * This is the garbage fee again - collected at the counter, printed on the
 * receipt, recorded as ₱0.00 - and it is the third time on this project that a
 * money field has been computed from data that had not loaded yet. **A watch's
 * dependency list has to name everything the body reads, not everything the
 * author was thinking about.**
 */
watch([selectedUnit, monthsCovered, roomsFetchFailed, unitOccupantsSummary], ([newUnit]) => {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === newUnit.toLowerCase());
  const summary = formatUnitOccupantsSummary(newUnit);
  const occCount = occupantsFor(summary, room);

  /**
   * ONE month of water, whatever the rent covers - because that is the only
   * thing the ledger can record.
   *
   * This read `waterBaselineFor(...) * mCovered`, so a receipt covering three
   * months showed three months of water and added it to "Total handed over".
   * The server does not multiply: `POST /admin/income-records` writes
   * `water_payment: calcWater`, and `calcWater` is
   * `computeWaterFee(roomNumber, occupants)`, which takes no month count at
   * all. So the figure she asked the resident for and the figure the books
   * kept differed by (months - 1) x occupants x rate, with nothing to notice.
   *
   * Her own book agrees with the server, in every row: all 837 non-Linda
   * income rows record water as exactly `occupants x rate`, none as a multiple
   * of it - checked against the live ledger rather than reasoned about. Arrears
   * are carried as one row per month (OR#4895 across four), which is how a
   * multi-month collection has always been recorded.
   *
   * `waterBaselineFor` also decides the Linda case itself, from the unit code.
   * The ternary that used to be here (`isLinda ? newUnit : newUnit`) had two
   * identical arms.
   */
  waterAmount.value = waterBaselineFor(newUnit, occCount);

  /**
   * Cleared when the unit has no price, rather than left holding the PREVIOUS
   * unit's figure. Picking unit A at 8,000 and then unit B, which has no price
   * on record, used to keep 8,000 in the field - unit A's rent, about to be
   * recorded against unit B.
   *
   * AND cleared when the room data is not live, which is the more dangerous
   * case. `rooms` is seeded from `canonicalUnits.ts` so the page has something
   * to render before the API answers - and **30 of those 33 hardcoded prices no
   * longer match the database**, by up to PHP 2,000. Unit `2b` is seeded at
   * 6,500 and actually rents at 4,600.
   *
   * If `fetchRooms()` fails, that seed is what stays in `rooms`. Pre-filling
   * from it would put a figure that is wrong by up to two thousand pesos into
   * the on-site cash form - and whatever is in this field is what gets written
   * to the owner's ledger as the rent she collected.
   *
   * So: no live price, no pre-filled rent. The form still works; the
   * administrator types the figure from the receipt in her hand, which is the
   * authority anyway.
   */
  /**
   * ONE month's rent, whatever the receipt covers.
   *
   * This read `room.price * mCovered`. The ledger keeps a multi-month receipt as
   * one row PER MONTH - `OR#4895` across four - each carrying one month of rent
   * and one month of water, and there is no row in the 937 holding several
   * months. So this field is a month's rent and the months are the entries it
   * will create; the total handed over is computed from both below.
   */
  rentAmount.value = !roomsFetchFailed.value && room && room.price ? room.price : 0;
}, { immediate: true });


/**
 * Keep the unit the dropdown SHOWS equal to the unit this form will POST.
 *
 * `rooms` is seeded from `canonicalUnits.ts`, whose unit codes are lowercase
 * (`"1a"`), and is then replaced wholesale by `fetchRooms()`, which uppercases
 * every one of them. That upper-casing was removed on 2026-09-20 - the
 * database holds her own spelling, 22 lowercase and 11 upper, and printing
 * "1A" named a door that does not exist.
 * The `<option>` values below come from that same field. So the literal this
 * ref opened on could not be right in both phases whichever case it was
 * written in, and it was written lowercase:
 *
 *   options are ["1A","1B",...]  ·  select.value = "1a"
 *   -> selectedIndex -1, the field renders BLANK
 *
 * Checked in a browser rather than assumed. `selectedUnit` meanwhile still held
 * `"1a"`, and `triggerRecord()` uppercases it before building the payload - so
 * an administrator who filled in the figures without opening the dropdown saw
 * no unit at all and posted the collection against **1A**, an occupied unit
 * with a real resident in it.
 *
 * Reconciled against the list rather than by correcting the literal, because a
 * literal is exactly what cannot survive the seed being one case and the API
 * the other. `asListedUnitCode` fixes the case and nothing else - it will not
 * substitute a different unit onto a form that writes to the ledger.
 */
watch(
  rooms,
  () => {
    selectedUnit.value = asListedUnitCode(selectedUnit.value);
  },
  { immediate: true }
);

watch(isOnsitePaymentModalOpen, (isOpen) => {
  if (isOpen) {
    loadRates();
    fetchTenants();
    fetchRooms();
  }
});

/**
 * What she is actually handed, which is a month's rent and water MULTIPLIED by
 * the months the receipt covers - plus the garbage fee once.
 *
 * The rent and water fields are per month now, because the ledger keeps one row
 * per month. The garbage fee is not multiplied: BR-037 charges it once per unit,
 * so a three-month receipt collects it once, and the ledger puts it on the first
 * month's row.
 */
const monthsOnThisReceipt = computed(() => Math.max(1, Number(monthsCovered.value) || 1));

const totalAmountReceived = computed(() => {
  const perMonth = (Number(rentAmount.value) || 0) + (Number(waterAmount.value) || 0);
  return perMonth * monthsOnThisReceipt.value + (Number(gbgFee.value) || 0);
});

/**
 * The check before the ledger is written.
 *
 * It used to carry a title and a preformatted block of text, which the dialog
 * stopped rendering when the figures became a proper description list. Both
 * were still being built on every submit and thrown away.
 */
const isConfirmOpen = ref(false);
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(action: () => void) {
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
  const occCount = occupantsFor(summary, room);
  const mCovered = Math.max(1, Number(monthsCovered.value) || 1);

  const monthlyWaterBaseline = waterBaselineFor(unitUpper, occCount);
  const perOccupantRate = waterRatePerOccupant.value ?? 200;

  const waterVal = Number(waterAmount.value) || 0;

  /**
   * BR-036, and the reason this compares against ONE month.
   *
   * The rule is *"Water Payment must equal Occupants × ₱200 … If the
   * administrator enters a mismatched value, the system must warn before saving
   * rather than silently accepting the discrepancy."*
   *
   * Silently accepting is exactly what happened, in the one direction nobody
   * checks. The floor was `monthlyWaterBaseline * mCovered`, so anything at or
   * above it passed - and **this figure is never sent.** The payload below has
   * no water field, `incomeRecordSchema` has no water field, and the server
   * derives `water_payment` from occupants alone. So a typed ₱1,200 sailed
   * through the check, went into "Total handed over", was asked for at the
   * counter, and the ledger recorded ₱400.
   *
   * Warning on any divergence rather than only on a low one, and saying which
   * figure the books will keep, is what the rule asks for. It does not block:
   * BR-036 says warn, and the recorded value is correct either way.
   */
  if (waterVal !== monthlyWaterBaseline) {
    showToast(
      'warning',
      'Water will be recorded as ' + peso(monthlyWaterBaseline),
      `The ledger derives water from the registered occupants (BR-014), so it will record ` +
        `${peso(monthlyWaterBaseline)} for ${unitUpper}, not ${peso(waterVal)}. ` +
        (mCovered > 1
          ? `Water is one month per entry - a receipt covering ${mCovered} months is recorded as one row per month in her book. `
          : '') +
        `Change the figure if that is wrong.`
    );
  }

  if (waterVal !== 0 && waterVal % perOccupantRate !== 0) {
    showToast('error', 'Water Payment Error', `Water payment must be a whole multiple of ₱${perOccupantRate}.`);
    return;
  }

  const formattedStart = new Date(dateCoveredStart.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const formattedEnd = new Date(dateCoveredEnd.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  // Every one of the 937 ledger rows carries an OR number from the landlady's
  // receipt book, and the column is NOT NULL. The API no longer invents one, so
  // ask here rather than failing after she has confirmed the amount.
  if (!orNum.value.trim()) {
    showToast('error', 'OR number required', 'Enter the number from the receipt you issued.');
    return;
  }

  showConfirm(
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
          // This field is `required` on the form, is added to the total the
          // resident is asked for, and is printed on the receipt - and it was
          // not in this payload, so the ledger recorded 0.00 for it every time.
          gbgFee: Number(gbgFee.value) || 0,
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
          // The move-in month (OD-04), not a computed guess. The ledger row the
          // API just returned is the record; this local copy only mirrors the
          // screen until the refetch below replaces it.
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
  <WsModal
    v-if="isOnsitePaymentModalOpen"
    title="Record a payment"
    subtitle="Money handed over in person, or an online payment you are entering yourself."
    size="lg"
    :dismissible="false"
    @close="closeModal"
  >
    <!--
      Every label wraps its own control. They were siblings with no `for` and no
      id, so none of these fields had an accessible name and clicking a label
      focused nothing.
    -->
    <form id="onsite-payment-form" @submit.prevent="triggerRecord" class="flex flex-col gap-5">
        <label class="ws-field">
          Unit
          <select v-model="selectedUnit" class="ws-select w-full">
            <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
              {{ r.unitCode.toUpperCase() }} — {{ formatUnitOccupantsSummary(r.unitCode).text }} ({{ r.cluster }})
            </option>
          </select>
        </label>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="ws-field">
            Rent
            <input v-model.number="rentAmount" type="number" min="0" class="ws-input w-full" required />
            <!--
              Says WHY the field is empty. A blank rent with no explanation reads
              as a broken form; a blank rent with this note reads as a deliberate
              refusal to guess, which is what it is.
            -->
            <span v-if="roomsFetchFailed" class="text-sm font-semibold leading-6 text-verify">
              Live unit rates could not be loaded, so the rent has not been filled in.
              Type the amount from the receipt, not a remembered figure.
            </span>
          </label>

          <label class="ws-field">
            <span class="flex flex-wrap items-baseline justify-between gap-2">
              <span>Water</span>
              <span class="text-xs font-semibold text-brand">
                ₱{{ waterRatePerOccupant ?? 200 }} × {{ currentOccupantsCount }}
                {{ currentOccupantsCount === 1 ? 'occupant' : 'occupants' }}
              </span>
            </span>
            <input v-model.number="waterAmount" type="number" min="0" step="200" class="ws-input w-full" required />
            <span class="ws-hint">
              <!--
                The figure comes from `waterBaselineFor`, which is the function
                the submit path validates against - not from a literal beside
                it. It read `=== 'lf' ? 400 : 200`, so the moment the landlady
                changed a Linda charge in settings this sentence quoted the old
                one while the field below refused anything under the new one.
                One source, so they cannot disagree.
              -->
              <template v-if="selectedUnit.toLowerCase() === 'lf' || selectedUnit.toLowerCase() === 'lb'">
                Linda's units are a fixed {{ peso(waterBaselineFor(selectedUnit, 0)) }} a month.
              </template>
              <template v-else-if="currentOccupantsCount > 0">
                {{ currentOccupantsCount }} in the unit ({{ unitOccupantsSummary.text }}).
              </template>
              <template v-else>
                Nobody is registered in this unit, so no water is charged by default. Type the
                figure from the receipt if you collected any.
              </template>
            </span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="ws-field">
            Garbage fee
            <input v-model.number="gbgFee" type="number" min="0" class="ws-input w-full" required />
          </label>
          <label class="ws-field">
            Number on the receipt you issued
            <input v-model="orNum" type="text" placeholder="OR#4627" class="ws-input w-full font-mono" required />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="ws-field">
            How they paid
            <select v-model="paymentMethod" class="ws-select w-full">
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank transfer</option>
            </select>
          </label>
          <label class="ws-field" :class="{ 'opacity-40': !methodHasReference }">
            Their reference number
            <input
              v-model="transactionReference"
              type="text"
              :placeholder="paymentMethod === 'Bank Transfer' ? 'Bank reference' : 'GCash reference'"
              class="ws-input w-full"
              :disabled="!methodHasReference"
              :required="methodHasReference"
            />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="ws-field">
            Months covered
            <input v-model.number="monthsCovered" type="number" min="1" max="24" class="ws-input w-full" required />
            <!--
              Says what it will actually do. A receipt covering several months is
              kept as one ledger row per month, which is how her book already
              holds them - OR#4895 runs across four rows.
            -->
            <span v-if="monthsOnThisReceipt > 1" class="ws-hint">
              Recorded as {{ monthsOnThisReceipt }} separate ledger entries, one for each month,
              all under receipt {{ orNum.trim() || 'this number' }}.
            </span>
          </label>
          <label class="ws-field">
            Covering from
            <input v-model="dateCoveredStart" type="date" class="ws-input w-full" required />
          </label>
          <label class="ws-field">
            Covering to
            <input :value="dateCoveredEnd" type="date" class="ws-input w-full" disabled />
          </label>
        </div>

        <div class="grid items-end gap-4 sm:grid-cols-2">
          <label class="ws-field">
            Date received
            <input v-model="date" type="date" class="ws-input w-full" required />
          </label>
          <div class="rounded-2xl bg-canvas px-4 py-3">
            <p class="text-xs text-ink-faint">Total handed over</p>
            <p class="tabular mt-0.5 text-2xl font-semibold leading-none text-brand">
              {{ peso(totalAmountReceived) }}
            </p>
            <p v-if="monthsOnThisReceipt > 1" class="mt-1 text-xs text-ink-faint">
              {{ peso((Number(rentAmount) || 0) + (Number(waterAmount) || 0)) }} a month
              × {{ monthsOnThisReceipt }}<template v-if="Number(gbgFee) > 0">, plus the garbage fee once</template>
            </p>
          </div>
        </div>
    </form>

    <template #actions>
      <button type="button" class="pill-btn" @click="closeModal">Cancel</button>
      <button type="submit" form="onsite-payment-form" :disabled="isSubmitting" class="pill-btn-brand">
        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
        <Check v-else class="size-4" aria-hidden="true" />
        {{ isSubmitting ? 'Recording' : 'Record payment' }}
      </button>
    </template>

    <!-- Confirmation, on the same dialog chrome -->
    <WsModal
      v-if="isConfirmOpen"
      title="Record this payment?"
      subtitle="Check the figures against what you were handed. This writes to the ledger."
      size="sm"
      @close="isConfirmOpen = false"
    >
      <dl class="flex flex-col gap-2 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Unit</dt>
          <dd class="font-semibold">{{ selectedUnit.toUpperCase() }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <!--
            Labelled "a month" when the receipt covers several, because the total
            below is multiplied and these two are not. Without it the dialog reads
            ₱4,500 rent above a ₱15,000 total and looks wrong.
          -->
          <dt class="text-ink-soft">Rent<template v-if="monthsOnThisReceipt > 1"> a month</template></dt>
          <dd class="tabular font-semibold">{{ peso(rentAmount) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Water<template v-if="monthsOnThisReceipt > 1"> a month</template></dt>
          <dd class="tabular font-semibold">{{ peso(waterAmount) }}</dd>
        </div>
        <div v-if="monthsOnThisReceipt > 1" class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Ledger entries</dt>
          <dd class="font-semibold">{{ monthsOnThisReceipt }}, one per month</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Garbage fee</dt>
          <dd class="tabular font-semibold">{{ peso(gbgFee) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt class="font-semibold">Total received</dt>
          <dd class="tabular text-lg font-semibold">{{ peso(totalAmountReceived) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt class="text-ink-soft">Covers</dt>
          <dd class="text-right">
            {{ monthsCovered }} {{ monthsCovered === 1 ? 'month' : 'months' }},
            {{ formatDateForDisplay(dateCoveredStart) }} to {{ formatDateForDisplay(dateCoveredEnd) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Method</dt>
          <dd class="text-right">
            {{ paymentMethod }}<template v-if="methodHasReference">, reference {{ transactionReference }}</template>
          </dd>
        </div>
      </dl>

      <template #actions>
        <button type="button" class="pill-btn" @click="isConfirmOpen = false">Go back</button>
        <button type="button" class="pill-btn-brand" @click="handleConfirmAccept">Record it</button>
      </template>
    </WsModal>

  </WsModal>
</template>
