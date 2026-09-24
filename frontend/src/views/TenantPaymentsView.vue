<!--
  @file views/TenantPaymentsView.vue
  @description Tenant payments and billing. Outstanding bills with the online pay button, and the
    payment record filtered by year.
  @systemBibleRef Section 4 (Tenant Role), Section 12 (Billing), BR-016/BR-017 (GCash via Adyen)
  @designRef docs/DESIGN_GUIDELINE.md
-->
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { api } from '@/lib/api';
import { peso } from '@/lib/canonicalUnits';
import { propertyToday, PROPERTY_TIMEZONE } from '@/lib/propertyDate';
import { RouterLink } from 'vue-router';
import { CreditCard, Search, CheckCircle2, AlertTriangle, X } from 'lucide-vue-next';
import AdyenPaymentModal from '@/components/modals/AdyenPaymentModal.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import PillSelect from '@/components/ui/PillSelect.vue';

const sortOrderOptions = [
  { value: 'latest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

// Selected bill for the Adyen web component checkout modal
const selectedBillForAdyen = ref<any | null>(null);
/**
 * Pay the current cycle before anything has raised a bill for it.
 *
 * `POST /tenant/payments/checkout` has always accepted a request with no
 * `billId` and raised or resolved one itself - nothing on this screen ever
 * sent that request, because the only way to open the modal was to already
 * have a bill row to click on. A resident with nothing outstanding had no
 * path to GCash at all, which is a real gap: collection happens in person by
 * design (no scheduler - see the empty-state copy below), but online payment
 * should not be limited to a bill someone else already raised.
 */
const payingCurrentPeriod = ref(false);

/**
 * CLOSING THE PAYMENT DIALOG DROPPED FOCUS TO THE PAGE BODY.
 *
 * WsModal returns focus to whatever opened it, but `closeAdyenModal` refreshed
 * the bills in the same tick, the refresh swapped the tiles for a skeleton,
 * and the Pay button it was returning to was already gone (B-61, reproduced
 * in the mocked-API harness). The refresh after closing is now quiet, and if
 * the button has still gone - a bill that is now waiting for verification
 * has none - focus lands on the bills section instead of nowhere.
 */
let payTrigger: HTMLElement | null = null;
const billsRegion = ref<HTMLElement | null>(null);

function rememberPayTrigger() {
  const el = document.activeElement;
  payTrigger = el instanceof HTMLElement && el !== document.body ? el : null;
}

function openAdyenModalForCurrentPeriod() {
  rememberPayTrigger();
  payingCurrentPeriod.value = true;
}

async function closeAdyenModal() {
  selectedBillForAdyen.value = null;
  payingCurrentPeriod.value = false;
  // A bill may have just been raised as a side effect of opening the modal,
  // even if nothing was paid - refresh so "Nothing is due" cannot go on
  // being shown once that is no longer true.
  await fetchOutstandingBills({ quiet: true });
  await nextTick();
  // Only if focus was lost; a resident who has moved on keeps their place.
  if (!document.activeElement || document.activeElement === document.body) {
    if (payTrigger?.isConnected) payTrigger.focus();
    else billsRegion.value?.focus();
  }
  payTrigger = null;
}

/**
 * The outcome of a GCash return, kept on the page until it is dismissed.
 *
 * It was a toast, gone in four seconds, and it is the one message a resident
 * coming back from the GCash app most needs to read: whether the money went,
 * and whether to pay again (B-61).
 */
interface GatewayNotice {
  tone: 'success' | 'warning';
  title: string;
  body: string;
}
const gatewayNotice = ref<GatewayNotice | null>(null);

/**
 * Adyen's session status in a resident's words. The raw value used to be
 * quoted to them ("Adyen reports this checkout as "paymentPending"").
 * Everything but `completed` is "not confirmed" on the server
 * (`confirmCheckout` in adyenService.ts). AdyenPaymentModal.vue carries the
 * same wording for the in-page leg; change both together.
 */
function gatewayStatusWords(status: string | undefined): string {
  switch (status) {
    case 'paymentPending':
      return 'GCash has not finished processing this payment yet. Do not pay again; check this page again later.';
    case 'canceled':
      return 'The payment was cancelled before it was completed, so nothing was recorded.';
    case 'expired':
      return 'The payment page timed out before the payment was completed, so nothing was recorded.';
    case 'refused':
      return 'GCash declined the payment, so nothing was recorded.';
    default:
      return 'The payment was not completed, so nothing was recorded.';
  }
}

// Outstanding bills from the database
const outstandingBills = ref<any[]>([]);
/**
 * Set when `/tenant/my-bills` could not be read.
 *
 * Without it an empty list rendered as **"All Rent Accounts Settled - you have
 * no outstanding bills"**, in green, with a tick and a "Paid Up to Date" badge.
 * That is an affirmative financial claim made out of a failed request, shown to
 * the person who owes the money. A resident could read it and not pay.
 */
const billsLoadFailed = ref(false);
/**
 * Starts true, because the page renders before the fetch is even started.
 *
 * `onMounted` awaits `handleGatewayReturn` - a round trip to the server - before
 * it asks for the bills at all, so with this false the tile fell straight through
 * to "Nothing is due / You have no outstanding bills" for the whole of that call.
 * That is the return leg from GCash: the one moment a resident is certain to be
 * looking, told in green that they owe nothing, out of a list that had not been
 * requested yet. Same defect as `billsLoadFailed` above, from a different cause.
 */
const loadingBills = ref(true);
const searchQuery = ref('');

// Payment history records
const paymentHistory = ref<Array<{
  id: string | number;
  invoiceRef: string;
  datePaid: string;
  datePaidRaw: string; // ISO string for year filtering
  billingPeriod: string;
  amountPaid: number;
  paymentMethod: string;
  status: string;
}>>([]);

// Year filter for payment history. BR-015 prevents excessively long lists.
// The property's year, not the viewer's - lib/propertyDate.ts exists so both
// anchor to Legazpi rather than to whoever happens to be looking.
const currentYear = Number(propertyToday().slice(0, 4));
const selectedYear = ref(currentYear);
const sortOrder = ref<'latest' | 'oldest'>('latest');
/**
 * Set when `/tenant/my-payments` could not be read.
 *
 * The empty table said "No payment records found for year N" - to a resident,
 * about a year they did pay. That reads as the house having no record of their
 * money, which is a far worse thing to say by accident than "we could not load
 * this". Same defect as the bills panel above it.
 */
const historyLoadFailed = ref(false);
/**
 * In flight is not the same as empty.
 *
 * `RecordTable` renders its empty state the moment `rows.length === 0`, and it
 * takes no loading prop, so before the fetch returned the table stated "No
 * payments are on record for 2026" - an affirmative claim about the resident's
 * own money, made out of a request that had not answered yet. On a slow phone
 * that sentence is on screen for seconds. Starts true for the same reason
 * `loadingBills` does: nothing is requested until `onMounted` gets that far.
 */
const loadingHistory = ref(true);

const availableYears = computed(() => {
  const years = new Set<number>();
  paymentHistory.value.forEach((p) => {
    const year = new Date(p.datePaidRaw).getFullYear();
    if (!isNaN(year)) years.add(year);
  });
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

const yearOptions = computed(() =>
  availableYears.value.map((y) => ({ value: y, label: String(y) }))
);

const filteredPayments = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const filtered = paymentHistory.value.filter((p) => {
    const year = new Date(p.datePaidRaw).getFullYear();
    if (year !== selectedYear.value) return false;
    if (!q) return true;
    return (
      p.invoiceRef.toLowerCase().includes(q) ||
      p.paymentMethod.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    const timeA = new Date(a.datePaidRaw).getTime();
    const timeB = new Date(b.datePaidRaw).getTime();
    return sortOrder.value === 'latest' ? timeB - timeA : timeA - timeB;
  });
});

const isVerified = (status: string) => status === 'VERIFIED & SETTLED' || status === 'VERIFIED';

/**
 * A REFUSED PAYMENT WAS SHOWN AS ONE STILL BEING CHECKED.
 *
 * `isVerified()` answers one question, and every status that was not VERIFIED
 * fell through to the amber "Waiting for verification" pill - including
 * REJECTED, which is a real value an administrator can set (`admin.ts` accepts
 * 'Verified' | 'Pending Verification' | 'Rejected') and which `/tenant/my-payments`
 * returns unfiltered.
 *
 * So a resident whose GCash transfer was refused read it as still being looked
 * at, indefinitely, and did not pay again. The debt is real: rejecting a payment
 * reopens its bill to 'Due' in `admin.ts`, so the money genuinely is still owed
 * and the words on the screen have to say so rather than imply a wait.
 */
const isRejected = (status: string) => status === 'REJECTED';

const statusTone = (status: string): 'paid' | 'overdue' | 'verify' =>
  isVerified(status) ? 'paid' : isRejected(status) ? 'overdue' : 'verify';

const statusLabel = (status: string): string =>
  isVerified(status) ? 'Verified' : isRejected(status) ? 'Not accepted' : 'Waiting for verification';

const statusLabelShort = (status: string): string =>
  isVerified(status) ? 'Verified' : isRejected(status) ? 'Not accepted' : 'Waiting';

/**
 * THE RETURN LEG FROM GCASH, WHICH NOTHING HANDLED.
 *
 * GCash is a redirect method: the browser LEAVES this page, the resident
 * authorises in the GCash app, and Adyen sends them back to `returnUrl` carrying
 * `sessionId` and `redirectResult`. The modal that would have called
 * `verify-session` was unmounted by that navigation, and nothing here read
 * either parameter - `grep redirectResult frontend/src` returned nothing at all.
 *
 * So a resident authorised the payment, came back to a plain payments page, and
 * was told NOTHING. No confirmation, no reference, and - until the landlady
 * verified it - a bill still showing the full amount with a live Pay button.
 * The money was fine, because the webhook records it independently. They simply
 * had no way to know.
 *
 * The `status=` / `ref=` branch below is the LOCAL CASHIER's shape, built by
 * `public.ts`, and that route is 404-ed whenever a gateway is configured. Adyen
 * never sends `status=`. It is kept for the no-gateway development path and is
 * no longer the only thing handled.
 */
async function handleGatewayReturn(params: URLSearchParams): Promise<boolean> {
  const sessionId = params.get('sessionId');
  const redirectResult = params.get('redirectResult');
  if (!sessionId || !redirectResult) return false;

  // Clear the parameters first. They are single-use, and leaving them in the
  // URL means a refresh re-submits a result that has already been consumed.
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    const res = await api.post<{ confirmed: boolean; recorded: boolean; gatewayStatus: string }>(
      '/tenant/payments/adyen/verify-session',
      { sessionId, sessionResult: redirectResult }
    );

    if (res?.confirmed) {
      /**
       * `recorded` is not decoration on the response type - it is the one field
       * that says whether the webhook's payment row has landed yet
       * (backend/src/routes/tenant.ts's comment on this same endpoint). This used
       * to say "now shows as waiting for the landlady" unconditionally, and the
       * very next line below refetches the outstanding bills - which, on the
       * ordinary few-seconds webhook lag the backend comment describes as normal,
       * would still show the bill as payable at that instant, directly
       * contradicting what the toast had just claimed. AdyenPaymentModal already
       * makes this same distinction for its in-page confirmation panel; this is
       * the matching redirect-return leg for GCash.
       */
      gatewayNotice.value = {
        tone: 'success',
        title: 'Payment received',
        body: res.recorded
          ? 'Adyen has confirmed it. It now shows as waiting for the landlady to check it, and ' +
            'you will not be asked to pay this bill again.'
          : "Adyen has confirmed it, and we're recording it now. It usually appears within a " +
            'few seconds. If this bill still looks unpaid for a moment, do not pay again; check ' +
            'back shortly.',
      };
    } else {
      const stillProcessing = res?.gatewayStatus === 'paymentPending';
      gatewayNotice.value = {
        tone: 'warning',
        title: stillProcessing ? 'Payment still processing' : 'Payment not completed',
        body:
          gatewayStatusWords(res?.gatewayStatus) +
          (stillProcessing ? '' : ' If money did leave your GCash, tell the landlady and do not pay again.'),
      };
    }
  } catch {
    /**
     * The payment itself is NOT in doubt here - the webhook records it
     * independently of this call. What failed is our confirmation of it, and
     * the message has to say so, because the wrong reading is "it did not work,
     * pay again".
     *
     * The server's own text is not shown. It can be Adyen's raw reply or a
     * transport error ("Check that the API is running"), neither of which a
     * resident can act on; this sentence already says everything they can.
     */
    gatewayNotice.value = {
      tone: 'warning',
      title: 'Could not confirm your payment here',
      body:
        'If money left your GCash the payment is safe: it is recorded with Adyen and reaches ' +
        'the landlady separately. Do not pay again; check this page shortly.',
    };
  }
  return true;
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  await handleGatewayReturn(params);

  if (statusParam === 'success') {
    gatewayNotice.value = {
      tone: 'success',
      title: 'Payment submitted',
      body: refParam ? `GCash payment ${refParam} is waiting for verification.` : 'Your payment was submitted.',
    };
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    gatewayNotice.value = {
      tone: 'warning',
      title: 'Payment cancelled',
      body: 'The online payment was cancelled before it was completed.',
    };
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await Promise.all([fetchOutstandingBills(), fetchPaymentHistory()]);

  /**
   * `?pay=<billId>` opens that bill's checkout straight away.
   *
   * The overview screen's Pay button routes here with it - it used to open a
   * checkout session of its own and then silently discard it, so it now hands
   * the job to the one screen that can actually mount the Drop-in. That link
   * was doing nothing on arrival until this read it.
   *
   * Resolved against the bills we just loaded rather than trusted: a bill id
   * that is not outstanding for this resident simply opens nothing, and they
   * see their normal payments page.
   */
  const payBillId = params.get('pay');
  if (payBillId) {
    window.history.replaceState({}, document.title, window.location.pathname);
    const target = outstandingBills.value.find((b: any) => b.id === payBillId);
    // Not while a payment on it waits for verification: the checkout refuses
    // that with a 409, and the bill's own tile already says why (B-61).
    if (target && billPayableNow(target) > 0) openAdyenModal(target);
  }
});

/**
 * What is still owed on a bill, as opposed to what it was issued for.
 *
 * The API derives `amount_outstanding` from the payments actually linked to the
 * bill (BR-013). The fallback is the bill's own total, which is correct for any
 * bill nothing has been paid against.
 */
function billBalance(bill: any): number {
  const outstanding = Number(bill?.amount_outstanding);
  return Number.isFinite(outstanding) ? outstanding : Number(bill?.total_amount) || 0;
}

/**
 * Money already sent for this bill that the landlady has not confirmed yet.
 *
 * `withEffectiveStatus` has returned `amount_pending` on every bill all along and
 * nothing in this frontend ever read it - `grep amount_pending frontend/src`
 * returned nothing. It is deliberately NOT subtracted from `amount_outstanding`
 * server-side, because BR-017 says the gateway does not get to decide a debt is
 * settled, so what is OWED is unchanged until she verifies it.
 *
 * Owed and sent are two different facts and the screen has to show both. Showing
 * only the first is what repainted a bill at its full amount with a live Pay
 * button directly under a toast saying the payment had been received.
 */
function billPending(bill: any): number {
  const pending = Number(bill?.amount_pending);
  return Number.isFinite(pending) && pending > 0 ? pending : 0;
}

/**
 * What can actually be paid here right now, which is not the same as what is owed.
 *
 * BR-013 allows part of a bill to be paid, so the remainder of a partly-sent bill
 * is genuinely still owed - but it cannot be paid on this screen. The checkout
 * route refuses the WHOLE bill while ANY payment on it is awaiting verification:
 * `pendingOnBill()` sums exactly the same rows `amount_pending` is built from, and
 * `if (alreadySent > 0)` throws a 409. Rendering the button anyway guarantees the
 * "The payment page could not be opened" modal, which is the contradiction this
 * is here to remove, so the remainder is stated in words instead and the button
 * comes back the moment she confirms the payment that is already in.
 */
function billPayableNow(bill: any): number {
  return billPending(bill) > 0 ? 0 : billBalance(bill);
}

/** The pending portion is sent, not settled: it stays on the balance until she confirms it. */
function billRemainderAfterPending(bill: any): number {
  return Math.max(0, billBalance(bill) - billPending(bill));
}

function billTileTitle(bill: any): string {
  if (billPending(bill) > 0) return 'Payment sent';
  return billBalance(bill) < Number(bill.total_amount) ? 'Partly paid bill' : 'Bill to pay';
}

/**
 * `quiet` keeps the tiles on screen while it reloads. Used behind the payment
 * dialog, where swapping them for a skeleton removed the button focus was
 * about to return to; see `payTrigger`.
 */
async function fetchOutstandingBills(opts: { quiet?: boolean } = {}) {
  if (!opts.quiet) loadingBills.value = true;
  billsLoadFailed.value = false;
  try {
    const data = await api.get<any[]>('/tenant/my-bills');
    outstandingBills.value = (data ?? []).filter((b) => ((b as any).effective_status ?? b.status) !== 'Paid');
  } catch (err: any) {
    console.error('Failed to load bills:', err?.message || err);
    // "No bills" and "we could not read your bills" are different sentences, and
    // only one of them is safe to say to someone who may owe rent.
    billsLoadFailed.value = true;
  } finally {
    loadingBills.value = false;
  }
}

async function fetchPaymentHistory() {
  loadingHistory.value = true;
  historyLoadFailed.value = false;
  try {
    const data = await api.get<any[]>('/tenant/my-payments');
    paymentHistory.value = (data ?? []).map((p) => ({
      id: p.id,
      // A cash payment recorded by hand genuinely has no gateway reference, so
      // this label describes the absence rather than inventing a number.
      invoiceRef: p.transaction_reference || 'No reference, recorded by hand',
      datePaid: new Date(p.paid_at || p.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: PROPERTY_TIMEZONE }),
      datePaidRaw: p.paid_at || p.created_at,
      billingPeriod: 'Monthly Statement',
      amountPaid: Number(p.amount) || 0,
      // Neither is guessed. `|| 'GCASH'` showed a payment of unknown method as
      // GCash - every one of the 937 historical records is Cash - and
      // `|| 'VERIFIED'` displayed a payment with no verification status as
      // settled, which is the single thing BR-017 exists to prevent.
      paymentMethod: (p.payment_method || 'UNKNOWN').toUpperCase(),
      status: (p.verification_status || 'PENDING VERIFICATION').toUpperCase(),
    }));
  } catch (err: any) {
    console.error('Failed to load payments:', err?.message || err);
    historyLoadFailed.value = true;
  } finally {
    loadingHistory.value = false;
  }
}

function openAdyenModal(bill: any) {
  rememberPayTrigger();
  selectedBillForAdyen.value = bill;
}

/**
 * The dialog stays open on its "Payment sent" panel until the resident closes
 * it. This used to clear `selectedBillForAdyen`, which unmounted the dialog in
 * the same tick the panel was switched on, so nobody ever saw it (B-61).
 */
function handleAdyenSuccess(_refId: string) {
  fetchOutstandingBills({ quiet: true });
  fetchPaymentHistory();
}

function refreshAll() {
  fetchOutstandingBills();
  fetchPaymentHistory();
}
</script>

<template>
  <div class="ws-focus flex flex-col gap-5 text-ink">
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">My account</p>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Payments and billing
        </h1>
        <p class="mt-1 text-sm text-ink-soft">Pay a bill with GCash, and see what has been recorded against your unit.</p>
        <!-- Here, not inside the payment dialog: leaving the page from there
             drops the checkout session. -->
        <RouterLink
          to="/terms#payments"
          class="press inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
        >
          How paying online works
        </RouterLink>
      </div>
    </header>

    <div
      v-if="gatewayNotice"
      :class="[
        'ws-reveal flex items-start justify-between gap-3 rounded-tile p-4 sm:p-5',
        gatewayNotice.tone === 'success' ? 'bg-brand-soft' : 'bg-verify-soft',
      ]"
      role="status"
    >
      <div class="min-w-0">
        <p
          :class="[
            'flex items-center gap-2.5 text-sm font-semibold leading-6',
            gatewayNotice.tone === 'success' ? 'text-brand' : 'text-ink',
          ]"
        >
          <CheckCircle2 v-if="gatewayNotice.tone === 'success'" class="size-5 shrink-0" aria-hidden="true" />
          <AlertTriangle v-else class="size-5 shrink-0" aria-hidden="true" />
          {{ gatewayNotice.title }}
        </p>
        <p class="mt-1 text-sm leading-6 text-ink-soft">{{ gatewayNotice.body }}</p>
      </div>
      <button type="button" class="icon-btn shrink-0" aria-label="Dismiss this message" @click="gatewayNotice = null">
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <!-- `tabindex="-1"`: where focus lands when the dialog closes and its Pay
         button is gone. See `payTrigger`. -->
    <section ref="billsRegion" tabindex="-1" aria-label="Your bills" class="outline-none">

    <!-- Bills -->
    <div v-if="loadingBills" class="rounded-tile bg-tile p-6 flex flex-col gap-4" aria-busy="true">
      <span class="sr-only" role="status">Loading your bills</span>
      <Skeleton class-name="h-4 w-32 rounded-full" />
      <Skeleton class-name="h-10 w-48 rounded-2xl" />
    </div>

    <!-- A failed read is NOT "nothing is owed". This branch comes first so the
         all-clear below can only be reached by a list that actually loaded. -->
    <OverviewTile v-else-if="billsLoadFailed" class="ws-reveal" title="Bills">
      <UnavailableNote
        message="Your bills could not be loaded. This is not the same as having none. Try again, and tell the landlady if it keeps failing."
        @retry="refreshAll"
      />
    </OverviewTile>

    <OverviewTile v-else-if="outstandingBills.length === 0" tone="soft" class="ws-reveal" title="Bills">
      <p class="text-2xl font-semibold tracking-tight">Nothing is due</p>
      <!-- This used to promise "your next monthly statement will be issued on the
           5th". There is no scheduled bill generator and there is deliberately not
           one: collection happens in person, so a nightly run would raise bills
           against residents the owner has already been paid by (judgement log
           section 3.6). The sentence promised a thing the system does not do. -->
      <p class="text-sm leading-6 text-ink-soft">
        You have no outstanding bills. The landlady issues bills as they fall due, not on a fixed date.
      </p>
      <p class="mt-3 text-sm leading-6 text-ink-soft">
        Would rather not wait? You can pay this rental period with GCash now instead.
      </p>
      <button
        type="button"
        class="pill-btn mt-3 self-start"
        @click="openAdyenModalForCurrentPeriod"
      >
        <CreditCard class="size-4" aria-hidden="true" />
        Pay this period with GCash
      </button>
    </OverviewTile>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <OverviewTile
        v-for="(bill, i) in outstandingBills"
        :key="bill.id"
        tone="brand"
        :title="billTileTitle(bill)"
        class="list-reveal-item"
        :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
      >
        <div>
          <!-- The balance, not the debt as issued. BR-013. -->
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(billBalance(bill), 2) }}</p>
          <p class="mt-2 text-sm text-on-brand-soft">
            Due {{ new Date(bill.due_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PROPERTY_TIMEZONE }) }}
          </p>
        </div>

        <dl class="flex flex-col gap-1.5 text-sm text-on-brand-soft">
          <div class="flex items-baseline justify-between gap-3">
            <dt>Rent</dt>
            <dd class="tabular text-on-brand">{{ peso(bill.rent_amount) }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt>Water</dt>
            <dd class="tabular text-on-brand">{{ peso(bill.water_amount) }}</dd>
          </div>
          <div v-if="Number(bill.amount_paid) > 0" class="flex items-baseline justify-between gap-3">
            <dt>Already paid</dt>
            <dd class="tabular text-on-brand">
              {{ peso(Number(bill.amount_paid), 2) }} of {{ peso(Number(bill.total_amount), 2) }}
            </dd>
          </div>
          <!-- Sent, not settled. It stays on the balance above until she confirms
               it (BR-017), and it is stated here so the balance is not read as a
               bill that never arrived. -->
          <div v-if="billPending(bill) > 0" class="flex items-baseline justify-between gap-3">
            <dt>Sent, waiting for her to check it</dt>
            <dd class="tabular text-on-brand">{{ peso(billPending(bill), 2) }}</dd>
          </div>
        </dl>

        <button
          v-if="billPayableNow(bill) > 0"
          type="button"
          class="pill-btn-light mt-auto self-start"
          @click="openAdyenModal(bill)"
        >
          <CreditCard class="size-4" aria-hidden="true" />
          Pay with GCash
        </button>
        <p v-else class="mt-auto text-sm text-on-brand-soft">
          {{ peso(billPending(bill), 2) }} has already been sent for this bill and is waiting for
          the landlady to check it. You have not been charged twice.
          <template v-if="billRemainderAfterPending(bill) > 0">
            The remaining {{ peso(billRemainderAfterPending(bill), 2) }} is still owed, and can be
            paid here once she has confirmed the payment that is already in.
          </template>
          <template v-else>
            There is nothing more to pay here while she is checking it.
          </template>
        </p>
      </OverviewTile>
    </div>
    </section>

    <!-- Payment record -->
    <OverviewTile title="Payment record">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="relative w-full sm:w-80 shrink-0">
          <!-- left-4/pl-11: the one inset every search box in the workspace
               uses. -->
          <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <label for="tenant-payment-search" class="sr-only">Search by reference, method or status</label>
          <input
            id="tenant-payment-search"
            v-model="searchQuery"
            type="search"
            placeholder="Reference, method or status"
            class="ws-input w-full pl-11"
          />
        </div>
        <!--
          No `shrink-0`: it was cancelling the `flex-wrap` beside it. An item
          that cannot shrink is sized at max-content, which for a wrapping row
          is every child on one line - 2 x 13rem plus the gap = 424px - so the
          row never became narrow enough to wrap.

          Measured in the running app at 375px, inside this tile's own padding:
          the row ran to x=472 against a tile ending at 327, so the sort control
          was entirely off screen, and `body`'s `overflow-x: hidden` meant it
          was clipped rather than reachable. A resident on a phone could not
          change the order of their own payment history. Re-measured after: two
          rows at 375, one row on the same right edge at 1280.
        -->
        <div class="flex flex-wrap items-center gap-2">
          <PillSelect
            v-model="selectedYear"
            :options="yearOptions"
            aria-label="Filter by year"
          />
          <PillSelect
            v-model="sortOrder"
            :options="sortOrderOptions"
            aria-label="Sort order"
            align="right"
          />
        </div>
      </div>

      <UnavailableNote
        v-if="historyLoadFailed"
        message="Your payment history could not be loaded. This does not mean no payments were recorded."
        @retry="refreshAll"
      />
      <RecordTable
        v-else
        :rows="filteredPayments"
        flat
        :caption="`Your payments in ${selectedYear}`"
        noun="payment"
        :page-size="8"
        :empty-title="loadingHistory ? 'Loading your payments' : 'Nothing recorded'"
        :empty-note="
          loadingHistory
            ? 'Your payment record is still being read. This is not the same as having none.'
            : searchQuery.trim()
              ? `Nothing matches '${searchQuery.trim()}' in ${selectedYear}.`
              : `No payments are on record for ${selectedYear}.`
        "
      >
        <template #head>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Date paid</th>
            <th scope="col" class="num">Amount</th>
            <th scope="col">How</th>
            <th scope="col">Standing</th>
          </tr>
        </template>

        <template #row="{ row: record, index }">
          <tr class="list-reveal-item" :style="{ animationDelay: `${Math.min(index, 9) * 30}ms` }">
            <th scope="row" class="font-medium">{{ record.invoiceRef }}</th>
            <td class="whitespace-nowrap text-ink-soft">{{ record.datePaid }}</td>
            <td class="num font-semibold">{{ peso(record.amountPaid, 2) }}</td>
            <td class="text-ink-soft">{{ record.paymentMethod }}</td>
            <td>
              <StatusPill :tone="statusTone(record.status)">
                {{ statusLabel(record.status) }}
              </StatusPill>
              <p v-if="isRejected(record.status)" class="mt-1.5 text-sm text-ink-soft">
                This money was not accepted, and the bill it was for is still owed. Pay it again or
                speak to the landlady.
              </p>
            </td>
          </tr>
        </template>

        <template #card="{ row: record, index }">
          <div
            class="list-reveal-item flex items-start justify-between gap-3"
            :style="{ animationDelay: `${Math.min(index, 9) * 30}ms` }"
          >
            <div class="min-w-0">
              <p class="tabular text-lg font-semibold leading-none text-ink">
                {{ peso(record.amountPaid, 2) }}
              </p>
              <p class="mt-1.5 text-sm text-ink-soft">{{ record.datePaid }}</p>
            </div>
            <StatusPill :tone="statusTone(record.status)">
              {{ statusLabelShort(record.status) }}
            </StatusPill>
          </div>
          <p v-if="isRejected(record.status)" class="mt-1.5 text-sm text-ink-soft">
            This money was not accepted, and the bill it was for is still owed. Pay it again or
            speak to the landlady.
          </p>

          <dl class="mt-4 space-y-3 text-sm">
            <div>
              <dt class="text-xs text-ink-faint">How you paid</dt>
              <dd class="text-ink">{{ record.paymentMethod }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-ink-faint">Reference</dt>
              <dd class="break-words text-ink">{{ record.invoiceRef }}</dd>
            </div>
          </dl>
        </template>
      </RecordTable>
    </OverviewTile>

    <AdyenPaymentModal
      v-if="selectedBillForAdyen || payingCurrentPeriod"
      :bill="selectedBillForAdyen"
      @close="closeAdyenModal"
      @success="handleAdyenSuccess"
    />
  </div>
</template>
