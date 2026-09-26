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
  incomeRecordsFetchFailed,
  asListedUnitCode,
  type IncomeRecord
} from '@/lib/systemState';
import WsModal from '@/components/ui/WsModal.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Banknote, Loader2, ReceiptText, Users, AlertTriangle } from 'lucide-vue-next';

const unitOptions = computed(() =>
  rooms.map((r) => ({
    value: r.unitCode,
    label: `${r.unitCode.toUpperCase()}, ${formatUnitOccupantsSummary(r.unitCode).text} (${r.cluster})`,
  }))
);

const PAYMENT_METHOD_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'GCash', label: 'GCash' },
  { value: 'Bank Transfer', label: 'Bank transfer' },
];

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
// Zero, not the old flat Linda figure this literal used to be. The watch
// below overwrites it unconditionally with `immediate: true`, so this never
// renders - but a "400" sitting beside `rentAmount`'s own zero-not-plausible
// fix reads like a leftover of BR-040, which is exactly what it was.
const waterAmount = ref(0);
const gbgFee = ref(0);
const orNum = ref('');
// The property's today, not UTC's. Before 08:00 Manila the old expression
// offered YESTERDAY as the default date on a payment form.
import { propertyToday, periodEnd, formatDateOnly } from '@/lib/propertyDate';
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

/**
 * `formatDateOnly`, not `new Date(dStr).toLocaleDateString(...)`.
 *
 * `date`, `dateCoveredStart` and `dateCoveredEnd` are all bare `YYYY-MM-DD`
 * (native `<input type="date">` and `propertyToday()`/`periodEnd()`).
 * Parsing that as `Date` gives UTC midnight, and formatting with no
 * `timeZone` reads it back in the browser's own zone - a day early for an
 * admin west of the property (Legazpi is UTC+8). Same defect `2adf017`
 * fixed in `systemState.ts` for income and tenant dates; this form's own
 * live period preview, confirm dialog and optimistic ledger row all had it
 * too, missed on that commit because they live in a different file.
 */
function formatDateForDisplay(dStr: string): string {
  return formatDateOnly(dStr, { month: 'short', day: 'numeric', year: 'numeric' });
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

async function loadRates() {
  try {
    const r = await api.get<{ waterRatePerOccupant: number }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
  } catch {
    // Left null; the literal below stands in.
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

/**
 * Per head for every unit, LF and LB included. They were a flat 400 and 200
 * (BR-040), retired by the owner on 2026-09-20 - `computeWaterFee` in
 * backend/src/services/billingService.ts: a third person in LF bills 600. So
 * with three people in LF this form pre-filled 400 and validated against it,
 * the landlady typing the correct 600 off the receipt against a baseline that
 * was wrong. `lindaFixedWaterCharges` from `/public/rates` is not read here:
 * settingsService's own docblock says that number is a routing flag and "must
 * not be treated as" the charge.
 */
function waterBaselineFor(_unitCode: string, occupants: number): number {
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
    // The overlap warning below (`findOverlappingPayments`) reads this array
    // directly rather than calling an endpoint of its own, on the reasoning
    // that it is already loaded, unfiltered, for the administrator - see the
    // note on that function. That reasoning only holds if the array is
    // actually populated by the time the form is submitted; if this modal is
    // the first admin screen touched this session (nothing else has called
    // `fetchIncomeRecords()` yet), `incomeRecords` would still be empty and
    // the warning would silently never fire. Asking for it here, the same way
    // rooms and tenants already are, closes that gap rather than trusting
    // some other view to have done it first.
    fetchIncomeRecords();
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

/**
 * Every already-recorded, non-voided payment on this unit whose (year, month)
 * falls inside the span this receipt is about to cover. Populated right before
 * `showConfirm` opens the dialog below, and read by the banner in it.
 *
 * WHY THIS EXISTS, AND WHY IT IS A WARNING AND NOT A REFUSAL
 * -----------------------------------------------------------
 * `POST /admin/income-records` already refuses an EXACT duplicate receipt -
 * same room, invoice number, date, amount, year and month
 * (docs/13_AUDIT_JUDGEMENT_LOG.md SS3.6b). That guard is deliberately narrow: it
 * is aimed at a double-click on this same form, not at a second real payment,
 * and the team declined to widen it into a hard constraint because the
 * threat model is "one administrator at a counter," not a retrying webhook.
 *
 * It says nothing when the OR number or the amount differs but the unit and
 * the month being paid for is the same - which is exactly the shape of typing
 * a fresh receipt against a period that was already settled, whether that is
 * a genuine second payment (an arrears top-up, a remaining balance) or the
 * same visit recorded twice under two different receipt numbers by mistake.
 * Nothing before this warned about that gap at all.
 *
 * SS3.1 of the same document states the house posture for exactly this shape
 * of situation: derive or detect, warn, let the human proceed anyway, and
 * record that they did. This follows it - it does not block the submit
 * button and does not touch the exact-duplicate guard above, which stays
 * exactly as narrow as it was. It only makes the confirm dialog say what it
 * found, so a genuine second payment for the same period still goes through
 * once the administrator has seen the warning and clicked through it.
 */
const overlappingPayments = ref<IncomeRecord[]>([]);

/**
 * Snapshot of `incomeRecordsFetchFailed` at the moment the check below ran.
 *
 * `findOverlappingPayments` reads `incomeRecords` as if it is complete. If the
 * ledger failed to load - first admin screen touched this session, a dropped
 * connection, a backend restart - `incomeRecords` can be empty or stale while
 * `overlappingPayments` comes back `[]` for the ordinary reason, and an empty
 * result read as "confirmed clear" is the exact defect class this project has
 * already found and fixed five times (`*FetchFailed` refs throughout
 * systemState.ts; `roomsFetchFailed`'s own hint two fields above this one:
 * "ask, do not assume"). This makes the same distinction here: the confirm
 * dialog needs to say "the check could not run" rather than silently show no
 * warning and let that read as an answer.
 */
const overlapCheckFailed = ref(false);

/**
 * Mirrors `monthlySpansFrom` in backend/src/services/billingService.ts closely
 * enough for a warning: same anchor-day-and-clamp arithmetic, so "the 15th of
 * this month" and "the 15th of next month" agree with what the server would
 * actually write. It is not the source of truth - the server still derives the
 * real spans on its own - this only has to be right enough to ask "does a
 * recorded payment already exist for any of the months this receipt is about
 * to cover."
 */
function monthYearSpansForWarning(
  startIso: string,
  monthsCovered: number
): { year: number; month: number }[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) return [];

  const [baseYear, baseMonthOneBased, anchorDay] = startIso.split('-').map(Number);
  const baseMonth = baseMonthOneBased - 1;
  const clampToMonth = (y: number, m: number, d: number) =>
    Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());

  const count = Math.max(1, Math.floor(Number(monthsCovered) || 1));
  const out: { year: number; month: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const startMonth = baseMonth + i;
    const start = new Date(Date.UTC(baseYear, startMonth, clampToMonth(baseYear, startMonth, anchorDay)));
    out.push({ year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 });
  }

  return out;
}

/**
 * `incomeRecords` is already the full, unfiltered ledger - all rows, no
 * per-year or per-tenant scoping (confirmed in `fetchIncomeRecords`) - and
 * this is the admin-only on-site form, so reading it here costs nothing new
 * and needs no endpoint of its own. Voided rows never reach it in the first
 * place: `GET /admin/income-records` already filters `voided_at IS NULL`, so
 * a corrected entry does not haunt this warning.
 *
 * Matched by room id when the row carries one (it always should - see the
 * note on `IncomeRecord.roomId`), falling back to the unit code itself,
 * compared case-insensitively like every other unit comparison in this file.
 */
function findOverlappingPayments(
  unitCode: string,
  roomId: string | undefined,
  spans: { year: number; month: number }[]
): IncomeRecord[] {
  if (spans.length === 0) return [];
  const wantedUnit = unitCode.toLowerCase();

  return incomeRecords.filter((ir) => {
    const sameUnit = (roomId && ir.roomId && ir.roomId === roomId) || ir.unit.toLowerCase() === wantedUnit;
    if (!sameUnit) return false;
    return spans.some((s) => ir.year === s.year && ir.month === s.month);
  });
}

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
  overlappingPayments.value = [];
  overlapCheckFailed.value = false;
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
    // Addressed to her: this said "in her book" to the owner reading it.
    showToast(
      'warning',
      'Water will be recorded as ' + peso(monthlyWaterBaseline, 2),
      `The ledger counts water from the people registered in the unit, so it will record ` +
        `${peso(monthlyWaterBaseline, 2)} for ${unitUpper}, not ${peso(waterVal, 2)}. ` +
        (mCovered > 1
          ? `Each of the ${mCovered} months is its own entry, with one month of water. `
          : '') +
        `If the number of people is wrong, correct it on the tenant's record.`
    );
  }

  if (waterVal !== 0 && waterVal % perOccupantRate !== 0) {
    showToast('error', 'Check the water', `It must be a multiple of ₱${perOccupantRate}, the charge for one person.`);
    return;
  }

  // Same UTC-safe parsing as `formatDateForDisplay` above - this pair never
  // went through it, so it kept the timezone-dependent shift on the text
  // shown in the confirmation dialog right before real cash is recorded.
  const formattedStart = formatDateOnly(dateCoveredStart.value, { month: 'short', day: '2-digit' });
  const formattedEnd = formatDateOnly(dateCoveredEnd.value, { month: 'short', day: '2-digit', year: 'numeric' });

  // Every one of the 937 ledger rows carries an OR number from the landlady's
  // receipt book, and the column is NOT NULL. The API no longer invents one, so
  // ask here rather than failing after she has confirmed the amount.
  if (!orNum.value.trim()) {
    showToast('error', 'Receipt number needed', 'Enter the number from the receipt you issued.');
    return;
  }

  // See the docblock on `overlappingPayments` above. This does not gate the
  // confirm dialog that follows - it only decides whether that dialog shows
  // the warning banner, so a genuine second payment for the same period is
  // still one click away, same as any other submission.
  const warningSpans = monthYearSpansForWarning(dateCoveredStart.value, mCovered);
  overlappingPayments.value = findOverlappingPayments(unitUpper, room?.id, warningSpans);
  overlapCheckFailed.value = incomeRecordsFetchFailed.value;

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
          anniversary: formatDateOnly(date.value, { day: 'numeric', month: 'short' }),
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

        showToast('success', 'Payment recorded', `Unit ${selectedUnit.value.toUpperCase()}, ${peso(totalAmountReceived.value, 2)}, is in the ledger.`);
        closeModal();
      } catch (err: unknown) {
        showToast(
          'error',
          'Payment not recorded',
          err instanceof Error
            ? `${err.message} Nothing was written to the ledger. Please try again.`
            : 'Nothing was written to the ledger. Please try again.'
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
    title="Record payment"
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
    <!--
      ON A PHONE THE FIELDS SCROLL AND THE BUTTONS DO NOT, and that is the fix
      for what the client saw.

      Measured in the running app at 375x812 before this change: the panel was
      1296px tall, and the footer holding Cancel and "Record payment" began at
      y=1227 in an 812px viewport - 415px below the fold, reached only by
      scrolling the whole dialog. The actions live in `WsModal`'s own footer
      slot, which sits after the body, so the only way to bring them on screen
      is to stop the body being taller than the screen.

      `dvh`, not `vh`: on a phone `vh` is the LARGE viewport, the one measured
      with the browser's own bars hidden, so `60vh` is more than 60% of what is
      actually visible while the address bar is showing - which is exactly the
      state the modal opens in. `dvh` tracks the visible box, so the footer
      stays on screen either way.

      Everything is restored at `sm`: no cap, no scroller, no negative margin,
      so the desktop dialog is the one that was there before.

      `px-1.5 -mx-1.5` is not decoration. A scroll container clips on BOTH
      axes - `overflow-y: auto` computes `overflow-x: auto` - and the workspace
      focus ring is a 3px outline at 2px offset, so without 6px of room a
      keyboard reader's ring would be sliced down the sides of every field in
      this form. The negative margin cancels the padding so nothing moves.
    -->
    <form
      id="onsite-payment-form"
      @submit.prevent="triggerRecord"
      class="flex flex-col gap-5 max-h-[60dvh] overflow-y-auto px-1.5 -mx-1.5 sm:mx-0 sm:max-h-none sm:overflow-visible sm:px-0"
    >
        <label class="ws-field">
          Unit
          <PillSelect v-model="selectedUnit" :options="unitOptions" aria-label="Unit" widthClass="w-full" />
        </label>

        <!--
          Two up on a phone as well, not only from `sm`.

          Eleven full-width controls in one column is what made this form 1296px
          tall. Rent and water are short numbers and read as a pair anyway;
          measured at 375 the pair is 140px against 202px stacked, with the
          columns at 146px each and no overflow in either.
        -->
        <div class="grid grid-cols-2 gap-3 sm:gap-4">
          <label class="ws-field">
            Rent
            <input v-model.number="rentAmount" type="number" min="0" step="any" class="ws-input w-full" required />
            <!--
              Says WHY the field is empty. A blank rent with no explanation reads
              as a broken form; a blank rent with this note reads as a deliberate
              refusal to guess, which is what it is.
            -->
            <span v-if="roomsFetchFailed" class="ws-reveal ws-hint text-verify">
              Unit rates could not be loaded. Type the rent from the receipt.
            </span>
          </label>

          <!--
            Just "Water", like "Rent" beside it. The rate and headcount sat in the
            label and wrapped it to two lines at 375, so this field's box started
            24px lower than Rent's. They are in the hint underneath now.
          -->
          <label class="ws-field">
            Water
            <!--
              `:step` follows the configured rate. It was the literal "200", and
              the browser's own step validation refuses any figure that is not a
              multiple of it before submit runs - so the day the rate changed,
              the correct amount would be blocked with a native tooltip rather
              than accepted.
            -->
            <input v-model.number="waterAmount" type="number" min="0" :step="waterRatePerOccupant ?? 200" class="ws-input w-full" required />
            <span class="ws-hint">
              <!--
                The rate and the headcount are the ones `waterBaselineFor` and the
                submit path use, not a literal. It once read `=== 'lf' ? 400 : 200`
                and quoted an old Linda charge while the field refused anything
                under the new one. The names are on the Unit field above.
              -->
              <template v-if="currentOccupantsCount > 0">
                ₱{{ waterRatePerOccupant ?? 200 }} × {{ currentOccupantsCount }}
                {{ currentOccupantsCount === 1 ? 'person' : 'people' }}
              </template>
              <template v-else>
                Nobody is registered here. Type the water from the receipt, if any.
              </template>
            </span>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:gap-4">
          <label class="ws-field">
            Garbage fee
            <input v-model.number="gbgFee" type="number" min="0" step="any" class="ws-input w-full" required />
          </label>
          <label class="ws-field">
            Receipt (OR) number
            <input v-model="orNum" type="text" placeholder="OR#4627" class="ws-input w-full font-mono" required />
          </label>
        </div>

        <!--
          This pair stays full width on a phone, deliberately, where the two
          above did not. A reference number is a long string somebody TYPES off
          a GCash receipt, and a 146px box shows about nine characters of it.
          The rule is the width the content needs, not two columns everywhere.
        -->
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="ws-field">
            How they paid
            <PillSelect v-model="paymentMethod" :options="PAYMENT_METHOD_OPTIONS" aria-label="How they paid" widthClass="w-full" />
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

        <!--
          Two columns on a phone, three from `sm`. The three date-ish controls
          were 238px stacked and are 144px paired; `input[type=date]` was
          measured at 146px wide in the running app with scrollWidth 144, so
          the native control is not being squeezed.
        -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <label class="ws-field">
            Months covered
            <input v-model.number="monthsCovered" type="number" min="1" max="24" class="ws-input w-full" required />
            <!--
              Says what it will actually do. A receipt covering several months is
              kept as one ledger row per month, which is how her book already
              holds them - OR#4895 runs across four rows.
            -->
            <span v-if="monthsOnThisReceipt > 1" class="ws-reveal ws-hint">
              Saved as {{ monthsOnThisReceipt }} ledger entries, one per month, under
              {{ orNum.trim() || 'this receipt' }}.
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
              {{ peso(totalAmountReceived, 2) }}
            </p>
            <p v-if="monthsOnThisReceipt > 1" class="mt-1 text-xs text-ink-faint">
              {{ peso((Number(rentAmount) || 0) + (Number(waterAmount) || 0), 2) }} a month
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
      <!--
        Not "no warning" - "the check did not run". See `overlapCheckFailed`.
        Same posture as `roomsFetchFailed`'s hint on the rent field: say what
        is not known, rather than let silence be read as "confirmed clear".
      -->
      <div
        v-if="overlapCheckFailed"
        class="ws-reveal mb-3 flex items-start gap-2 rounded-2xl bg-verify-soft p-4 text-sm leading-6 text-ink"
        role="alert"
      >
        <AlertTriangle class="mt-0.5 size-4 shrink-0 text-verify" aria-hidden="true" />
        <span>
          The ledger could not be loaded, so {{ selectedUnit.toUpperCase() }} was not checked for an
          earlier payment this period. Make sure there isn't one before recording.
        </span>
      </div>

      <!--
        A warning, not a refusal - see the docblock on `overlappingPayments`.
        This unit already has a non-voided ledger row for a month this receipt
        is about to cover. That is sometimes exactly right (a remaining balance,
        an arrears top-up) and sometimes the same visit typed in twice under a
        different OR number - the banner names what was found and lets the
        administrator decide, same as she already can for a water mismatch on
        the form itself.
      -->
      <div
        v-if="overlappingPayments.length > 0"
        class="ws-reveal mb-3 flex flex-col items-start gap-2 rounded-2xl bg-verify-soft p-4 text-sm leading-6"
        role="alert"
      >
        <p class="flex items-start gap-2 font-semibold text-ink">
          <AlertTriangle class="mt-0.5 size-4 shrink-0 text-verify" aria-hidden="true" />
          {{ selectedUnit.toUpperCase() }} already has a payment recorded for this period
        </p>
        <ul class="flex flex-col gap-1 text-ink">
          <li v-for="rec in overlappingPayments" :key="rec.id">
            {{ rec.rentFor }}: {{ peso(rec.rent, 2) }} rent<template v-if="rec.invoice">, OR#{{ rec.invoice }}</template>, paid {{ rec.datePaid }}
          </li>
        </ul>
        <p class="text-ink">
          Fine if this settles a remaining balance. If it's the same receipt entered twice, check
          the OR number first.
        </p>
      </div>

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
          <dd class="tabular font-semibold">{{ peso(rentAmount, 2) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Water<template v-if="monthsOnThisReceipt > 1"> a month</template></dt>
          <dd class="tabular font-semibold">{{ peso(waterAmount, 2) }}</dd>
        </div>
        <div v-if="monthsOnThisReceipt > 1" class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Ledger entries</dt>
          <dd class="font-semibold">{{ monthsOnThisReceipt }}, one per month</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Garbage fee</dt>
          <dd class="tabular font-semibold">{{ peso(gbgFee, 2) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt class="font-semibold">Total handed over</dt>
          <dd class="tabular text-lg font-semibold">{{ peso(totalAmountReceived, 2) }}</dd>
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
        <button type="button" class="pill-btn-brand" @click="handleConfirmAccept">
          {{ overlappingPayments.length > 0 || overlapCheckFailed ? 'Record it anyway' : 'Record it' }}
        </button>
      </template>
    </WsModal>

  </WsModal>
</template>
