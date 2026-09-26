<!--
  @file views/TenantOverviewView.vue
  @description The resident's overview. Leads with what they owe and the way to pay, then the bill
    itself, a way to ask for a repair, their payments, and their unit.
  @systemBibleRef Section 4 (Tenant Role), Section 5.5 (Water Billing)
  @designRef docs/DESIGN_GUIDELINE.md (workspace system), docs/OVERVIEW_AUDIT_2026-09-17.md
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { floorLabelFor } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { formatDateOnly, propertyToday, PROPERTY_TIMEZONE } from '@/lib/propertyDate';
import { useToast } from '@/lib/useToast';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import { CreditCard, Wrench, X, CheckCircle2, Home } from 'lucide-vue-next';

const { showToast } = useToast();
const router = useRouter();

const submissionNotice = ref('');
const activeBillId = ref<string | null>(null);

const payingOnline = ref(false);

/**
 * Resident and assigned-unit data. Everything starts empty.
 *
 * This object used to be seeded with a complete fictional tenancy, and the loader
 * only overwrote the fields the API returned, so anything it did not return stayed
 * fictional. The loader's own fallbacks did the same thing on a smaller scale,
 * inventing room 1A, cluster BH and a first floor when a field was missing. A
 * missing fact now shows as not on file.
 *
 * The template also printed a list of amenities, a garbage fee "Included (₱0)" and
 * an electricity rate for every unit. The system holds none of those facts; two
 * are open questions for the owner (CLIENT_MEETING_QUESTIONS.md 2a and 3b). They
 * are gone until there is something true to print.
 */
const tenantData = ref({
  name: currentUser.value?.fullName || '',
  room: '',
  roomDetails: '',
  roomType: '',
  floor: 0,
  occupants: 0,
  photoUrl: '',
  /**
  /**
   * Whether a bill actually exists for this resident.
   *
   * Kept apart from `baseRent` and `waterFee` on purpose. The panel used to ask
   * whether both figures were zero, which is a different question: `baseRent`
   * used to fall back to the unit's own rate, so once that fallback ran the
   * "no bill" branch could never be reached. A resident with no bill was shown
   * `Rent 4,500 / Water 0` under the heading "Latest bill", with the 200-per-head
   * rule printed directly beneath it. A bill nobody issued is not a bill.
   */
  hasBill: false,
  /**
   * From the BILL, and only from the bill. Neither of these may be filled in
   * from anywhere else - see `unitRent` below, and the guard in the template.
   */
  baseRent: 0,
  waterFee: 0,
  /**
   * What the unit lets at, from `rooms.current_price`. This is a rate, not a
   * bill, and the two were being confused: with no bill on file, rent fell back
   * to this value while water kept its initial 0, so a resident with nothing
   * owing was shown "Rent P4,500 - Water, 1 registered occupant - P0" directly
   * above the sentence "Water is charged at P200 for each registered occupant
   * every month". The screen contradicted itself, and the figure it printed was
   * one the rule beside it could not produce.
   */
  unitRent: 0,
  totalAmountDue: 0,
  dueDate: '',
  dueBadgeText: '',
  dueDaysRemaining: '',
  dueDateRaw: '',
  verifiedAt: '',
  nextDueDateDisplay: '',
  /** The last day the recorded payments cover, and the first day they do not. */
  paidThroughDisplay: '',
  unbilledFromDisplay: '',
  /** The dates the open bill is for, shown under its due date. */
  billPeriodDisplay: '',
  /** `amount_pending` on the bill shown: money sent that she has not verified. */
  activeBillPending: 0,
  /** `amount_paid` on the bill shown, so a partly paid bill's balance adds up on screen. */
  activeBillPaid: 0,
});

/**
 * Set when the tenant's own data could not be read.
 *
 * `totalAmountDue` initialises to 0, so a failed load used to show the resident
 * ₱0 due. Every money figure on this page reads this one flag, so the bill and
 * the amount due can no longer disagree about whether anything loaded.
 */
const tenantDataLoadFailed = ref(false);

/** `GET /tenant/my-standing` - see `computeStanding` in backend/src/services/billingService.ts. */
interface ResidentStanding {
  paidThrough: string | null;
  nextPeriodStart: string;
  owedPeriods: { start: string; end: string; dueDate: string }[];
  status: 'settled' | 'due-soon' | 'due' | 'overdue';
  perPeriod: { rentAmount: number; waterAmount: number; totalAmount: number };
  periodsDue: number;
  totalDue: number;
  totalPayable: number;
}
/** One sentence under the amount: how far her records reach, and what paying now covers. */
const owedSummary = ref('');
const loading = ref(true);
/**
 * Whether the unit photo has actually painted, so it can fade in rather than
 * pop in whenever it lands after the network. `false` on every fresh load and
 * reset alongside it, since a retry can hand back a different photo.
 */
const unitPhotoLoaded = ref(false);

interface PaymentRow {
  id: string;
  amount: number;
  date: string;
  method: string;
  /** When it was paid or sent, as stored. Only for ordering the rows below. */
  at: string;
}
interface ReceiptRow extends PaymentRow {
  period: string;
  verified: boolean;
}

const pendingOnlinePayments = ref<PaymentRow[]>([]);
/**
 * A REJECTED PAYMENT USED TO DISAPPEAR OFF THIS SCREEN ENTIRELY.
 *
 * `pendingOnlinePayments` keeps only `'Pending Verification'` and
 * `recordedReceipts` is drawn from the income ledger, so a payment the
 * administrator refused matched neither list and simply was not here. The
 * resident saw the money vanish rather than be declined - and rejecting a
 * payment reopens its bill to 'Due' (`admin.ts`), so the debt came back with
 * nothing on the page to explain why.
 */
const rejectedPayments = ref<PaymentRow[]>([]);
const recordedReceipts = ref<ReceiptRow[]>([]);

/**
 * The Payments tile shows the newest three rows, whatever their kind, so the
 * dashboard fits a desktop screen without scrolling. The full record is one
 * click away on Payments and billing.
 *
 * Newest first across all three kinds: a rejected payment still leads while it
 * is recent, and gives way once newer receipts arrive instead of holding a
 * place for good.
 */
const PAYMENT_ROWS = 3;
const shownPaymentIds = computed(() => {
  const time = (r: PaymentRow) => Date.parse(r.at) || 0;
  return new Set(
    [...rejectedPayments.value, ...pendingOnlinePayments.value, ...recordedReceipts.value]
      .sort((a, b) => time(b) - time(a))
      .slice(0, PAYMENT_ROWS)
      .map((r) => r.id),
  );
});
const shownRejected = computed(() => rejectedPayments.value.filter((p) => shownPaymentIds.value.has(p.id)));
const shownPending = computed(() => pendingOnlinePayments.value.filter((p) => shownPaymentIds.value.has(p.id)));
const shownReceipts = computed(() => recordedReceipts.value.filter((r) => shownPaymentIds.value.has(r.id)));

/** `Adyen Online` is the ledger's name for a GCash payment made through this portal. */
function methodLabel(method: string | null | undefined): string {
  if (!method) return '';
  return method === 'Adyen Online' ? 'GCash (online)' : method;
}

const firstName = computed(() => {
  const full = tenantData.value.name || currentUser.value?.fullName || '';
  return full.split(/\s+/)[0] ?? '';
});

const partOfDay = (() => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
})();

// Anchored to the property (Asia/Manila), not the viewer's own device - the
// same reasoning `lib/propertyDate.ts` gives for `propertyToday()`. Without
// it, a resident whose phone clock is set to another timezone would be told
// the wrong calendar day at the top of their own overview.
const todayLabel = new Date().toLocaleDateString('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: PROPERTY_TIMEZONE,
});

function shortDate(value: string | null | undefined, withYear = false) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: PROPERTY_TIMEZONE,
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Due-date countdown. Severity drives the tone of the status on the amount card.
 * @businessRule BR-033 - the cycle runs from each tenancy's own anniversary date.
 *   The due date shown comes from the bill the backend raised; this only counts
 *   down to it.
 */
const dueDateCountdown = computed(() => {
  if (tenantData.value.dueBadgeText === 'PAID') {
    return { daysLeft: 0, label: 'Payment settled', severity: 'paid' as const };
  }
  const raw = tenantData.value.dueDateRaw;
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return { daysLeft: 0, label: tenantData.value.dueDaysRemaining, severity: 'safe' as const };
  }
  /**
   * Both sides compared as the property's own calendar day, not the viewer's.
   *
   * `new Date(raw)` parses a bare `due_date` column as UTC midnight, and the
   * `.setHours(0, 0, 0, 0)` this used to call reads that back in the BROWSER's
   * own zone - a day earlier than Legazpi for anyone west of Manila - while
   * `today` was the browser's own local "today" rather than the property's.
   * Same defect class `2adf017`/`d78f9ee` already fixed for income, tenant and
   * on-site-payment dates; this countdown, the headline figure on the Amount
   * Due tile, had it too. Building both instants at Manila midnight (UTC+8,
   * no daylight saving) makes the subtraction exact wherever the resident's
   * phone thinks it is.
   */
  const due = new Date(`${raw.slice(0, 10)}T00:00:00+08:00`);
  const today = new Date(`${propertyToday()}T00:00:00+08:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return { daysLeft: diff, label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`, severity: 'overdue' as const };
  }
  if (diff === 0) return { daysLeft: 0, label: 'Due today', severity: 'danger' as const };
  if (diff <= 3) return { daysLeft: diff, label: `Due in ${diff} day${diff === 1 ? '' : 's'}`, severity: 'warning' as const };
  return { daysLeft: diff, label: `Due in ${diff} days`, severity: 'safe' as const };
});

const isSettled = computed(() => dueDateCountdown.value.severity === 'paid');

/**
 * The configured per-occupant water rate (BR-014). The rate is the owner's to set,
 * so it is read, not written into the page.
 */
const waterRatePerOccupant = ref<number | null>(null);

async function loadWaterRate() {
  try {
    const r = await api.get<{ waterRatePerOccupant: number }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
  } catch {
    // Left null; the bill then states the amount without quoting a rate.
  }
}

onMounted(async () => {
  loadWaterRate();
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success' && refParam) {
    submissionNotice.value = `Your GCash payment (reference ${refParam}) was submitted. It counts as paid once the landlady verifies it.`;
    showToast('success', 'Payment submitted', `GCash payment ${refParam} is waiting for verification.`);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    showToast('info', 'Payment cancelled', 'The online payment was cancelled before it was completed.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await fetchTenantData();
});

async function fetchTenantData() {
  loading.value = true;
  unitPhotoLoaded.value = false;
  try {
    const data = await api.get<any[]>('/tenant/my-rooms');
    if (data && data.length > 0) {
      const activeRoom = data.find((r: any) => r.is_active) || data[0];
      if (activeRoom) {
        const roomNum = activeRoom.rooms?.room_number || activeRoom.room_number || '';
        tenantData.value.room = roomNum ? `Unit ${String(roomNum).toUpperCase()}` : '';
        tenantData.value.roomDetails = activeRoom.rooms?.room_type || '';
        tenantData.value.roomType = activeRoom.rooms?.cluster_code || '';
        tenantData.value.floor = activeRoom.rooms?.floor || 0;
        tenantData.value.occupants = activeRoom.occupant_count || 0;

        // `rooms` has no photo of its own; photos live in `room_photos`, with
        // `is_primary` picking the one to lead with.
        const primaryPhoto =
          activeRoom.rooms?.room_photos?.find((p: any) => p.is_primary)?.file_url ||
          activeRoom.rooms?.room_photos?.[0]?.file_url;
        if (primaryPhoto) tenantData.value.photoUrl = primaryPhoto;

        if (activeRoom.rooms?.current_price) {
          tenantData.value.unitRent = Number(activeRoom.rooms.current_price);
        }
      }
    }

    // `my-standing` is in the same all-or-nothing batch on purpose: a failed read
    // of it must land in the "could not be loaded" state, never in "Settled".
    const [billsData, paymentsData, incomeData, standing] = await Promise.all([
      api.get<any[]>('/tenant/my-bills'),
      api.get<any[]>('/tenant/my-payments'),
      api.get<any[]>('/tenant/my-income-records'),
      api.get<ResidentStanding | null>('/tenant/my-standing'),
    ]);

    pendingOnlinePayments.value = (paymentsData ?? [])
      .filter((p: any) => p.verification_status === 'Pending Verification')
      .map((p: any) => ({
        id: String(p.id),
        amount: Number(p.amount) || 0,
        date: shortDate(p.paid_at || p.created_at, true),
        method: methodLabel(p.payment_method) || 'Online payment',
        at: String(p.paid_at || p.created_at || ''),
      }));

    rejectedPayments.value = (paymentsData ?? [])
      .filter((p: any) => p.verification_status === 'Rejected')
      .map((p: any) => ({
        id: String(p.id),
        amount: Number(p.amount) || 0,
        date: shortDate(p.paid_at || p.created_at, true),
        method: methodLabel(p.payment_method) || 'Online payment',
        at: String(p.paid_at || p.created_at || ''),
      }));

    // All of them, not the first four: the tile picks the newest few across
    // every kind of payment (`PAYMENT_ROWS`). Its arrow opens the full record.
    recordedReceipts.value = (incomeData ?? []).map((inc: any) => ({
      id: String(inc.id),
      at: String(inc.date_paid || ''),
      // `remitted_amount` is GENERATED as `rent_amount + water_payment`. Garbage
      // (BR-037) is its own column and is not inside it, so this read short of
      // the paper receipt by exactly the garbage fee. `tenant.ts` now selects
      // `gbg_fee`, so the figure can be the whole sum rather than apologising
      // for not being it.
      amount: (Number(inc.remitted_amount) || 0) + (Number(inc.gbg_fee) || 0),
      date: shortDate(inc.date_paid, true),
      method: methodLabel(inc.payment_method),
      period:
        inc.rent_period_start && inc.rent_period_end
          ? `${shortDate(inc.rent_period_start)} to ${shortDate(inc.rent_period_end, true)}`
          : '',
      verified: inc.verification_status === 'Verified',
    }));

    /**
     * THE 25th OF THE MONTH WAS INVENTED, AND IT HID REAL DEBT.
     *
     * This once read every verified payment, guessed that it covered rent up to
     * the 25th of the month it was paid in, and filtered bills out of the unpaid
     * list on that guess. Nothing in this business bills on the 25th. Bills now
     * use the API's `amount_outstanding` (BR-013), and everything else comes
     * from `/tenant/my-standing`.
     *
     * SETTLED MEANS HER RECORDS COVER TODAY (2026-09-24). This screen used to
     * work out a paid-through date itself and, with no open bill, show
     * "Settled" or "Not billed yet" - with a Pay button either way. Bills are
     * raised on demand, so no open bill never meant paid: that day every
     * resident's records ended in July or August and every one of them was
     * owed at least a period, while none was shown owing. The API now works out
     * which periods her receipts do not cover (`computeStanding`), and the
     * checkout charges the oldest of them.
     */

    // Taken from the response itself, not inferred from the amounts afterwards.
    tenantData.value.hasBill = (billsData?.length ?? 0) > 0;

    const unpaidBill = billsData?.find((b: any) => {
      // `effective_status` is the API's derived value. Anything not settled counts,
      // including 'Partially Paid' (BR-013).
      if (b.status === 'Paid') return false;
      if ((b.effective_status ?? b.status) === 'Paid') return false;
      // BR-013: the balance the API derived from verified payments, not a date
      // guessed from when a payment happened to be made.
      if (Number(b.amount_outstanding ?? b.total_amount ?? 0) <= 0) return false;
      return true;
    });

    const longDate = { month: 'long', day: 'numeric', year: 'numeric' } as const;
    tenantData.value.paidThroughDisplay = standing?.paidThrough
      ? formatDateOnly(standing.paidThrough, longDate)
      : '';
    tenantData.value.unbilledFromDisplay = '';
    tenantData.value.billPeriodDisplay = '';
    tenantData.value.verifiedAt = '';
    tenantData.value.activeBillPaid = 0;
    owedSummary.value = '';

    if (unpaidBill) {
      // A bill that has actually been raised comes first: it is the debt as issued.
      activeBillId.value = unpaidBill.id;
      tenantData.value.baseRent = unpaidBill.rent_amount;
      tenantData.value.waterFee = unpaidBill.water_amount;
      // The balance, not the debt as issued: they differ once a bill is partly
      // paid. `amount_outstanding` is derived by the API (BR-013).
      tenantData.value.totalAmountDue = unpaidBill.amount_outstanding ?? unpaidBill.total_amount;
      tenantData.value.dueDate = new Date(unpaidBill.due_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PROPERTY_TIMEZONE });
      tenantData.value.dueBadgeText = (unpaidBill.effective_status ?? unpaidBill.status).toUpperCase();
      tenantData.value.dueDaysRemaining = 'Awaiting payment';
      tenantData.value.dueDateRaw = unpaidBill.due_date;
      tenantData.value.nextDueDateDisplay = '';
      tenantData.value.activeBillPending = Number(unpaidBill.amount_pending) || 0;
      tenantData.value.activeBillPaid = Number(unpaidBill.amount_paid) || 0;
      if (unpaidBill.billing_period_start && unpaidBill.billing_period_end) {
        tenantData.value.billPeriodDisplay =
          `${shortDate(unpaidBill.billing_period_start)} to ${shortDate(unpaidBill.billing_period_end, true)}`;
      }
    } else if (standing && standing.owedPeriods.length > 0) {
      // Owed, but no bill raised yet. The checkout raises the OLDEST owed period.
      const first = standing.owedPeriods[0]!;
      activeBillId.value = null;
      tenantData.value.activeBillPending = 0;
      tenantData.value.baseRent = standing.perPeriod.rentAmount;
      tenantData.value.waterFee = standing.perPeriod.waterAmount;
      // What is owed today; a period opening within the week is payable, not yet owed.
      tenantData.value.totalAmountDue =
        standing.totalDue > 0 ? standing.totalDue : standing.perPeriod.totalAmount;
      tenantData.value.dueDate = formatDateOnly(first.dueDate, longDate);
      tenantData.value.dueDateRaw = first.dueDate;
      tenantData.value.dueBadgeText = standing.status === 'overdue' ? 'OVERDUE' : 'DUE';
      tenantData.value.dueDaysRemaining = 'Awaiting payment';
      tenantData.value.nextDueDateDisplay = '';
      const periods = standing.periodsDue;
      owedSummary.value =
        (standing.paidThrough
          ? `Your recorded payments cover rent up to ${tenantData.value.paidThroughDisplay}. `
          : 'No payment is on record for this tenancy yet. ') +
        (periods > 1
          ? `${periods} periods are unpaid since then. `
          : '') +
        `Paying now covers ${formatDateOnly(first.start, longDate)} to ` +
        `${formatDateOnly(first.end, longDate)} (${peso(standing.perPeriod.totalAmount, 2)}).`;
    } else if (standing) {
      // Settled: her records reach past today and the next period is more than
      // a week off. Nothing to pay, so no Pay button.
      activeBillId.value = null;
      tenantData.value.activeBillPending = 0;
      const paidBill = billsData && billsData.length > 0 ? billsData[0] : null;
      tenantData.value.baseRent = paidBill ? paidBill.rent_amount : 0;
      tenantData.value.waterFee = paidBill ? paidBill.water_amount : 0;
      tenantData.value.totalAmountDue = 0;
      tenantData.value.dueBadgeText = 'PAID';
      tenantData.value.dueDaysRemaining = 'Settled';
      tenantData.value.dueDate = '';
      tenantData.value.dueDateRaw = '';
      tenantData.value.nextDueDateDisplay = formatDateOnly(standing.nextPeriodStart, longDate);

      const linkedPayment = paymentsData?.find((p: any) => p.verification_status === 'Verified');
      tenantData.value.verifiedAt = linkedPayment?.verified_at
        ? new Date(linkedPayment.verified_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PROPERTY_TIMEZONE })
        : '';
    } else {
      /**
       * No active tenancy, so no standing to compute. `dueBadgeText` stays
       * 'PAID' only because it keeps a confident ₱0.00 off the tile; the words
       * say nothing has been billed, not that nothing is owed.
       */
      activeBillId.value = null;
      tenantData.value.activeBillPending = 0;
      tenantData.value.dueBadgeText = 'PAID';
      tenantData.value.dueDaysRemaining = 'Not billed yet';
      tenantData.value.totalAmountDue = 0;
      tenantData.value.dueDate = '';
      tenantData.value.dueDateRaw = '';
      tenantData.value.nextDueDateDisplay = '';
    }

    tenantDataLoadFailed.value = false;
  } catch (err: any) {
    console.error('Failed to load tenant data:', err?.message || err);
    tenantDataLoadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/**
 * THIS BUTTON DID NOTHING, AND SAID NOTHING.
 *
 * It called `/tenant/payments/checkout` and navigated only `if (res.redirectUrl)`.
 * That field is null whenever a real gateway is configured - the route says so
 * itself: "Only the local development checkout has a page of ours to redirect
 * to. A real Adyen session is paid inside the Drop-in on the tenant's own page."
 * Adyen IS configured, so the branch never ran.
 *
 * The failure was silent because the POST SUCCEEDED. No navigation, no toast,
 * no error - and a real Adyen session created plus a PAYMENT_RECORD audit row
 * written on every press. A resident could press it all day.
 *
 * The working path already exists: TenantPaymentsView mounts the Adyen Drop-in
 * with the sessionId, sessionData and clientKey this response carries. So the
 * honest thing is to take them there rather than open a second checkout session
 * here and abandon it. No session is created until the Drop-in asks for one.
 */
function handlePayOnline() {
  // `payingOnline` drives both the button's `:disabled` and its "Opening the
  // payment page" label below - neither ever fired, because nothing here set
  // it. A resident tapping it twice on a slow connection got two navigations
  // queued instead of one obviously-busy button.
  payingOnline.value = true;
  router.push({ path: '/tenant/payments', query: { pay: activeBillId.value || undefined } });
}

/**
 * A payment is in and she has not checked it yet.
 *
 * The Pay button used to show anyway, and the Payments screen it leads to then
 * got a 409 from `POST /tenant/payments/checkout`: `refuseIfPaymentPending`
 * refuses a bill while any payment on it waits for verification, and the
 * no-bill path resolves the same unpaid bill (B-61, reproduced in the
 * mocked-API harness). `amount_pending` is the exact figure that guard sums;
 * any pending row in `/tenant/my-payments` is the wider net for the no-bill
 * path, which cannot say in advance which bill it will resolve.
 *
 * The wider net applies ONLY when no bill is raised. With a bill, the checkout
 * refuses that bill alone (`refuseIfPaymentPending(bill.id)`), so a payment
 * waiting on some other bill hid a button the server would accept, while the
 * Payments screen, which follows the per-bill rule, showed it.
 */
const paymentAwaitingVerification = computed(() =>
  activeBillId.value
    ? tenantData.value.activeBillPending > 0
    : pendingOnlinePayments.value.length > 0
);

const awaitingVerificationLine =
  'A payment you sent is waiting for the landlady to verify it. You can pay online again once she has checked it.';

const statusTone = computed(() => {
  const s = dueDateCountdown.value.severity;
  if (s === 'overdue' || s === 'danger') return 'overdue' as const;
  if (s === 'warning') return 'verify' as const;
  return 'on-dark' as const;
});
</script>

<template>
  <div class="ws-focus flex flex-col gap-5 text-ink">
    <!-- No quick links here: "Request a repair" and "Payment history" repeated
         the Repairs tile's button and the Payments tile's link below. -->
    <header class="min-w-0">
      <p class="text-sm text-ink-faint">{{ todayLabel }}</p>
      <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight break-words">
        Good {{ partOfDay }}<template v-if="firstName">, {{ firstName }}</template>
      </h1>
      <!-- Held open while loading so the tiles do not drop when the unit arrives. -->
      <p v-if="tenantData.room || loading" class="mt-1 min-h-5 text-sm text-ink-soft">
        {{ tenantData.room }}<template v-if="tenantData.floor">, {{ floorLabelFor(tenantData.floor) }}</template>
      </p>
    </header>

    <div
      v-if="submissionNotice"
      role="status"
      class="ws-reveal flex items-center justify-between gap-3 rounded-tile bg-brand-soft p-4 sm:p-5"
    >
      <p class="flex items-center gap-2.5 text-sm font-semibold leading-6 text-brand">
        <CheckCircle2 class="size-5 shrink-0" aria-hidden="true" />
        {{ submissionNotice }}
      </p>
      <button type="button" class="icon-btn shrink-0" aria-label="Dismiss this message" @click="submissionNotice = ''">
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-12" aria-busy="true">
      <span class="sr-only" role="status">Loading your account</span>
      <div
        v-for="(span, i) in ['md:col-span-2 xl:col-span-5', 'xl:col-span-4', 'xl:col-span-3', 'md:col-span-2 xl:col-span-8', 'md:col-span-2 xl:col-span-4']"
        :key="i"
        :class="['rounded-tile bg-tile p-6 flex flex-col gap-4 min-h-64', span]"
      >
        <Skeleton class-name="h-4 w-28 rounded-full" />
        <Skeleton class-name="h-12 w-40 rounded-2xl" />
        <Skeleton class-name="h-3 w-full rounded-full" />
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <!-- What the resident owes, and the way to pay it. The only brand tile.
           The five tiles below arrive together once per visit, so a short
           cascade - 30ms apart, same rhythm as any other first-load list in
           this file - reads as one dashboard settling in rather than a jump
           cut from skeleton to content. -->
      <OverviewTile tone="brand" title="Amount due" class="list-reveal-item order-1 md:order-none md:col-span-2 xl:col-span-5" style="animation-delay: 0ms">
        <template v-if="!tenantDataLoadFailed && !isSettled" #actions>
          <StatusPill :tone="statusTone">{{ dueDateCountdown.label }}</StatusPill>
        </template>
        <UnavailableNote
          v-if="tenantDataLoadFailed"
          dark
          message="Your bill could not be loaded. This is not the same as owing nothing."
          @retry="fetchTenantData"
        />
        <template v-else-if="!isSettled">
          <div class="min-w-0">
            <!--
              The figure is one unbreakable token - a currency sign and digits,
              nothing to wrap on - and `body { overflow-x: hidden !important }`
              turns any overflow into silent clipping, not a scrollbar. At 200%
              browser text size (WCAG 1.4.4) that clipped the last digits off
              on a phone.

              `text-4xl sm:text-5xl` matches AdminOverviewView's peso headline
              and leaves room for a five-digit balance on a 320px phone.
              `break-all` plus `min-w-0` on this div is the last resort: at 200%
              the figure wraps onto a second line instead of losing digits.
              Measured 2026-09-24 at 320, 375 and 428px, at 100% and 200%:
              0px of overflow in every case, one line at 100%.
            -->
            <p class="text-4xl leading-none font-semibold tabular tracking-tight sm:text-5xl break-all">{{ peso(tenantData.totalAmountDue, 2) }}</p>
            <p v-if="tenantData.dueDate" class="mt-3 text-sm text-on-brand-soft">Due {{ tenantData.dueDate }}</p>
            <!-- Which dates this pays for, in the words the Payments list uses. -->
            <p v-if="tenantData.billPeriodDisplay" class="mt-1 text-sm text-on-brand-soft">Rent for {{ tenantData.billPeriodDisplay }}</p>
            <p v-if="owedSummary" class="mt-3 text-sm leading-6 text-on-brand-soft">{{ owedSummary }}</p>
          </div>
          <!-- `mt-auto`: at the foot of the tile, level with Request a repair
               beside it. The row is as tall as the Current bill tile, and the
               button used to sit under the figure with a band of empty green
               below it. -->
          <div class="mt-auto flex flex-col items-start gap-2">
            <!-- See `paymentAwaitingVerification`: the button is not offered
                 when the checkout would refuse it. -->
            <p v-if="paymentAwaitingVerification" class="text-sm leading-6 text-on-brand">
              {{ awaitingVerificationLine }}
            </p>
            <button v-else type="button" class="pill-btn-light" :disabled="payingOnline" @click="handlePayOnline">
              <CreditCard class="size-4" aria-hidden="true" />
              {{ payingOnline ? 'Opening the payment page' : 'Pay with GCash' }}
            </button>
          </div>
        </template>
        <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <!--
              "Settled" is claimed ONLY when a payment is actually on record.
              The other case is a resident with no bills at all, and the two are
              not the same thing: bills are raised on demand, so no bill means
              nobody has worked out what this period costs yet - not that it
              costs nothing. Saying "Nothing due" there asserted a financial
              fact the system does not hold, and said it to every resident at
              once whenever her records ran out, which is what August and
              September look like while her book stops at July.

              Same sizing as the peso figure above, for the same reason:
              "Settled" is one word with nothing to wrap on. `text-4xl` alone
              still clipped 26px of it on a 320px phone at 200% text size, so
              `break-words` lets it break as a last resort, never at 100%.
            -->
            <p class="text-4xl leading-none font-semibold tracking-tight break-words sm:text-5xl">
              {{ tenantData.dueDaysRemaining === 'Settled' ? 'Settled' : 'Not billed yet' }}
            </p>
            <p class="mt-3 text-sm text-on-brand-soft">
              <template v-if="tenantData.nextDueDateDisplay">Next rent is due {{ tenantData.nextDueDateDisplay }}.</template>
              <template v-else-if="tenantData.dueDaysRemaining === 'Settled' && tenantData.paidThroughDisplay">
                Your recorded payments cover rent up to {{ tenantData.paidThroughDisplay }}.
              </template>
              <template v-else-if="tenantData.paidThroughDisplay">
                Your recorded payments cover rent up to {{ tenantData.paidThroughDisplay }}.
                <template v-if="tenantData.unbilledFromDisplay">Rent from {{ tenantData.unbilledFromDisplay }} has not been billed yet,</template>
                <template v-else>Nothing after that has been billed yet,</template>
                which is not the same as owing nothing.
              </template>
              <template v-else>No bill has been raised for this period yet, which is not the same as owing nothing.</template>
            </p>
          </div>
          <!--
            No Pay button here (2026-09-24). This branch is reached only when her
            records cover today and the next period is more than a week off, so
            there is nothing to pay - and the checkout now refuses a settled
            account. Payment opens a week before the next period starts, and
            this tile turns into the amount-due tile by itself when it does.
          -->
          <p v-if="paymentAwaitingVerification" class="text-sm leading-6 text-on-brand sm:max-w-64">
            {{ awaitingVerificationLine }}
          </p>
        </div>
      </OverviewTile>

      <OverviewTile
        :title="isSettled ? 'Latest bill' : 'Current bill'"
        to="/tenant/payments"
        to-label="Open payments and billing"
        class="list-reveal-item order-3 md:order-none xl:col-span-4"
        style="animation-delay: 30ms"
      >
        <UnavailableNote
          v-if="tenantDataLoadFailed"
          message="Your bill could not be loaded. Try again in a moment."
          @retry="fetchTenantData"
        />
        <div v-else-if="!tenantData.hasBill" class="flex flex-col gap-2">
          <p class="text-sm leading-6 text-ink-soft">No bill is on file yet.</p>
          <!-- The unit's rate is a fact worth having. It is labelled as the
               rate, not printed in the shape of a bill. -->
          <p v-if="tenantData.unitRent" class="text-sm leading-6 text-ink-soft">
            Your unit lets at
            <strong class="tabular font-semibold text-ink">{{ peso(tenantData.unitRent, 2) }}</strong>
            a month. A bill appears here once one is raised.
          </p>
        </div>
        <template v-else>
          <SegmentBar
            :segments="[
              { label: 'Rent', value: tenantData.baseRent, tone: 'brand' },
              { label: 'Water', value: tenantData.waterFee, tone: 'bright' },
            ]"
            :label="`Rent ${peso(tenantData.baseRent, 2)} and water ${peso(tenantData.waterFee, 2)}`"
          />
          <dl class="flex flex-col divide-y divide-line text-sm">
            <div class="flex items-baseline justify-between gap-3 py-2.5">
              <dt class="flex items-center gap-2">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-brand" />
                Rent
              </dt>
              <dd class="font-semibold tabular">{{ peso(tenantData.baseRent, 2) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3 py-2.5">
              <dt>
                <span class="flex items-center gap-2">
                  <span aria-hidden="true" class="size-2.5 rounded-full bg-brand-bright" />
                  Water
                </span>
                <!-- The rate rides on this line rather than in a two-line note
                     under the list, so the dashboard fits a desktop screen. -->
                <span v-if="tenantData.occupants" class="block pl-4.5 text-xs text-ink-faint">
                  <template v-if="waterRatePerOccupant !== null">{{ tenantData.occupants }} {{ tenantData.occupants === 1 ? 'occupant' : 'occupants' }} at {{ peso(waterRatePerOccupant) }} each</template>
                  <template v-else>{{ tenantData.occupants }} registered {{ tenantData.occupants === 1 ? 'occupant' : 'occupants' }}</template>
                </span>
              </dt>
              <dd class="font-semibold tabular">{{ peso(tenantData.waterFee, 2) }}</dd>
            </div>
            <div v-if="!isSettled && tenantData.activeBillPaid > 0" class="flex items-baseline justify-between gap-3 py-2.5">
              <dt>Already paid</dt>
              <dd class="font-semibold tabular">{{ peso(tenantData.activeBillPaid, 2) }}</dd>
            </div>
            <div v-if="!isSettled" class="flex items-baseline justify-between gap-3 py-2.5">
              <dt class="font-semibold">Still to pay</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(tenantData.totalAmountDue, 2) }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile tone="night" title="Repairs" class="list-reveal-item order-2 md:order-none xl:col-span-3" style="animation-delay: 60ms">
        <p class="text-sm leading-6 text-on-night-soft">
          Tell the landlady what needs fixing in your unit, then follow the request until it is done.
        </p>
        <router-link to="/tenant/tickets" class="pill-btn-light mt-auto self-start">
          <Wrench class="size-4" aria-hidden="true" />
          Request a repair
        </router-link>
      </OverviewTile>

      <OverviewTile
        title="Payments"
        to="/tenant/payments"
        to-label="Open payments and billing"
        class="list-reveal-item order-4 md:order-none md:col-span-2 xl:col-span-8"
        style="animation-delay: 90ms"
      >
        <UnavailableNote
          v-if="tenantDataLoadFailed"
          message="Your payments could not be loaded. That does not mean none are recorded."
          @retry="fetchTenantData"
        />
        <p
          v-else-if="pendingOnlinePayments.length === 0 && rejectedPayments.length === 0 && recordedReceipts.length === 0"
          class="text-sm text-ink-soft"
        >
          No payments are on file yet.
        </p>
        <!-- One divided list, so the sections read as rows of the same list. -->
        <div v-else class="flex flex-col divide-y divide-line">
          <!-- First, because it is the only one that needs the resident to do
               something. Rejecting a payment reopens its bill to 'Due'. -->
          <!-- The first two headings are for screen readers only: each row's
               pill already says "Not accepted" or "Waiting for verification". -->
          <section v-if="shownRejected.length" aria-labelledby="rejected-payments-heading">
            <h3 id="rejected-payments-heading" class="sr-only">Not accepted</h3>
            <ul class="divide-y divide-line">
              <li
                v-for="(p, i) in shownRejected"
                :key="p.id"
                class="list-reveal-item flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
              >
                <span class="min-w-0 flex-1 basis-48">
                  <span class="block text-sm font-medium">{{ p.method }}</span>
                  <span class="block text-xs leading-5 text-ink-faint">
                    Sent {{ p.date }}. The bill it was for is still owed.
                  </span>
                </span>
                <span class="flex items-center gap-3">
                  <StatusPill tone="overdue">Not accepted</StatusPill>
                  <span class="text-sm font-semibold tabular">{{ peso(p.amount, 2) }}</span>
                </span>
              </li>
            </ul>
          </section>
          <section v-if="shownPending.length" aria-labelledby="pending-payments-heading">
            <h3 id="pending-payments-heading" class="sr-only">Waiting for verification</h3>
            <ul class="divide-y divide-line">
              <li
                v-for="(p, i) in shownPending"
                :key="p.id"
                class="list-reveal-item flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
              >
                <span class="min-w-0 flex-1 basis-48">
                  <span class="block text-sm font-medium">{{ p.method }}</span>
                  <span class="block text-xs text-ink-faint">Sent {{ p.date }}</span>
                </span>
                <span class="flex items-center gap-3">
                  <StatusPill tone="verify">Waiting for verification</StatusPill>
                  <span class="text-sm font-semibold tabular">{{ peso(p.amount, 2) }}</span>
                </span>
              </li>
            </ul>
          </section>
          <section v-if="shownReceipts.length" aria-labelledby="recorded-receipts-heading" class="pt-4 first:pt-0">
            <h3 id="recorded-receipts-heading" class="pb-1 text-xs font-medium text-ink-faint">Recorded by the landlady</h3>
            <ul class="divide-y divide-line">
              <li
                v-for="(r, i) in shownReceipts"
                :key="r.id"
                class="list-reveal-item flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
              >
                <span class="min-w-0 flex-1 basis-48">
                  <span class="block text-sm font-medium">
                    {{ r.period ? `Rent for ${r.period}` : 'Rent payment' }}
                  </span>
                  <span class="block text-xs text-ink-faint">
                    Paid {{ r.date }}<template v-if="r.method">, {{ r.method }}</template>
                  </span>
                </span>
                <span class="flex items-center gap-3">
                  <StatusPill :tone="r.verified ? 'paid' : 'neutral'">{{ r.verified ? 'Verified' : 'Not yet verified' }}</StatusPill>
                  <span class="text-sm font-semibold tabular">{{ peso(r.amount, 2) }}</span>
                </span>
              </li>
            </ul>
            <!-- The figure is rent, water and garbage - the whole receipt. It
                 used to be `remitted_amount` alone, which is GENERATED as
                 `rent_amount + water_payment` and leaves garbage (BR-037) out,
                 so the portal read short of the paper in the resident's hand and
                 a note here had to apologise for it. `tenant.ts` selects
                 `gbg_fee` now and the sum is taken above. -->
            <p class="pt-1 text-xs leading-5 text-ink-faint">
              Amounts include rent, water and the garbage fee.
            </p>
          </section>
        </div>
      </OverviewTile>

      <OverviewTile
        :title="tenantData.room || 'Your unit'"
        class="list-reveal-item order-5 md:order-none md:col-span-2 xl:col-span-4"
        style="animation-delay: 120ms"
      >
        <UnavailableNote
          v-if="tenantDataLoadFailed && !tenantData.room"
          message="Your unit details could not be loaded."
          @retry="fetchTenantData"
        />
        <template v-else>
          <!-- A photo earns the height. Without one the box only repeats the
               unit number already in the title, so it is kept short. -->
          <div :class="['relative overflow-hidden rounded-2xl', tenantData.photoUrl ? 'h-40' : 'h-24']">
            <!-- Fades in on load rather than popping in once the network answers.
                 The box already holds its full height, so nothing shifts while
                 the image is still transparent - it just sits on the tile's own
                 background until the photo is ready. -->
            <img
              v-if="tenantData.photoUrl"
              :src="tenantData.photoUrl"
              :alt="`Photo of ${tenantData.room}`"
              :class="[
                'size-full object-cover transition-opacity duration-300 ease-[var(--ease-out)]',
                unitPhotoLoaded ? 'opacity-100' : 'opacity-0',
              ]"
              @load="unitPhotoLoaded = true"
            />
            <div v-else class="flex size-full items-end justify-between bg-brand-soft p-4">
              <span class="text-5xl font-semibold tracking-tight text-brand">
                {{ tenantData.room.replace('Unit ', '') || '' }}
              </span>
              <Home class="size-6 text-brand" aria-hidden="true" />
            </div>
          </div>
          <!-- No "Building" row: it showed the cluster code ("BH"), which means
               nothing to a resident, about a place they already live in. -->
          <dl class="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-xs text-ink-faint">Type</dt>
              <dd class="font-medium">{{ tenantData.roomDetails || 'Not on file' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Floor</dt>
              <dd class="font-medium">{{ tenantData.floor ? floorLabelFor(tenantData.floor) : 'Not on file' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Occupants</dt>
              <dd class="font-medium">{{ tenantData.occupants || 'Not on file' }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>
    </div>
  </div>
</template>
