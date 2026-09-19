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
import { LANDLADY } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { propertyDate } from '@/lib/propertyDate';
import { useToast } from '@/lib/useToast';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import { CreditCard, Wrench, X, CheckCircle2, ChevronDown, Home } from 'lucide-vue-next';

const { showToast } = useToast();
const router = useRouter();

const submissionNotice = ref('');
const activeBillId = ref<string | null>(null);

const payingOnline = ref(false);
const showOtherWaysToPay = ref(false);

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
  landladyGCash: LANDLADY.gcash,
  landladyName: LANDLADY.name,
  verifiedAt: '',
  nextDueDateDisplay: '',
});

/**
 * Set when the tenant's own data could not be read.
 *
 * `totalAmountDue` initialises to 0, so a failed load used to show the resident
 * ₱0 due. Every money figure on this page reads this one flag, so the bill and
 * the amount due can no longer disagree about whether anything loaded.
 */
const tenantDataLoadFailed = ref(false);
/**
 * The day of the month this tenancy's cycle is anchored to (BR-033), from
 * `room_assignments.anniversary_date`. Null when there is no tenancy on file,
 * in which case no due date is shown rather than a guessed one.
 */
const anniversaryDay = ref<number | null>(null);
const loading = ref(true);

interface PaymentRow {
  id: string;
  amount: number;
  date: string;
  method: string;
}
interface ReceiptRow extends PaymentRow {
  period: string;
  verified: boolean;
}

const pendingOnlinePayments = ref<PaymentRow[]>([]);
const recordedReceipts = ref<ReceiptRow[]>([]);

const firstName = computed(() => {
  const full = tenantData.value.name || currentUser.value?.fullName || '';
  return full.split(/\s+/)[0] ?? '';
});

const partOfDay = (() => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
})();

const todayLabel = new Date().toLocaleDateString('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function shortDate(value: string | null | undefined, withYear = false) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
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
  if (!raw) return { daysLeft: 0, label: tenantData.value.dueDaysRemaining, severity: 'safe' as const };
  const due = new Date(raw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
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

        /**
         * BR-033's anchor, read from the tenancy rather than assumed.
         *
         * `/tenant/my-rooms` has always returned `anniversary_date` and this view
         * never looked at it, which is why the block below could only guess.
         * Kept as a day-of-month because that is all the cycle needs.
         */
        const anniv = activeRoom.anniversary_date;
        anniversaryDay.value =
          typeof anniv === 'string' && /^\d{4}-\d{2}-\d{2}/.test(anniv)
            ? Number(anniv.slice(8, 10))
            : null;
      }
    }

    const [billsData, paymentsData, incomeData] = await Promise.all([
      api.get<any[]>('/tenant/my-bills'),
      api.get<any[]>('/tenant/my-payments'),
      api.get<any[]>('/tenant/my-income-records'),
    ]);

    pendingOnlinePayments.value = (paymentsData ?? [])
      .filter((p: any) => p.verification_status === 'Pending Verification')
      .map((p: any) => ({
        id: String(p.id),
        amount: Number(p.amount) || 0,
        date: shortDate(p.paid_at || p.created_at, true),
        method: p.payment_method || 'Online payment',
      }));

    recordedReceipts.value = (incomeData ?? []).slice(0, 4).map((inc: any) => ({
      id: String(inc.id),
      amount: Number(inc.remitted_amount) || 0,
      date: shortDate(inc.date_paid, true),
      method: inc.payment_method || '',
      period:
        inc.rent_period_start && inc.rent_period_end
          ? `${shortDate(inc.rent_period_start)} to ${shortDate(inc.rent_period_end, true)}`
          : '',
      verified: inc.verification_status === 'Verified',
    }));

    // Find the latest covered date from verified payments and income records.
    let maxCoveredDate: Date | null = null;

    /**
     * THE 25th OF THE MONTH WAS INVENTED, AND IT HID REAL DEBT.
     *
     * This read every verified payment, guessed that it covered rent up to the
     * 25th of the month it was paid in, and then used that guess to filter bills
     * out of the unpaid list. A resident with any verified payment in a month
     * had every bill due on or before the 25th suppressed - and was then shown
     * the settled branch: total due 0, badge PAID.
     *
     * Nothing in this business bills on the 25th. BR-033 runs each tenancy from
     * its own anniversary day, and per B-32 those days are spread across the
     * month, so the guess was wrong for nearly everyone and wrong in the
     * dangerous direction.
     *
     * It is also unnecessary. The API already answers this question properly:
     * `withEffectiveStatus` derives `amount_outstanding` on every bill from the
     * payments actually linked to it (BR-013), which is the real relationship
     * between a payment and a bill rather than a guess from its date. The two
     * lines above already use `effective_status`; this now uses the balance
     * beside it.
     *
     * The income-record branch below is kept: `rent_period_end` is a recorded
     * fact, not an estimate, and it is what drives the next-due-date display.
     */

    incomeData?.forEach((inc: any) => {
      if (inc.verification_status === 'Verified' && inc.rent_period_end) {
        const end = new Date(inc.rent_period_end);
        if (!maxCoveredDate || end > maxCoveredDate) maxCoveredDate = end;
      }
    });

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

    if (unpaidBill) {
      activeBillId.value = unpaidBill.id;
      tenantData.value.baseRent = unpaidBill.rent_amount;
      tenantData.value.waterFee = unpaidBill.water_amount;
      // The balance, not the debt as issued: they differ once a bill is partly
      // paid. `amount_outstanding` is derived by the API (BR-013).
      tenantData.value.totalAmountDue = unpaidBill.amount_outstanding ?? unpaidBill.total_amount;
      tenantData.value.dueDate = new Date(unpaidBill.due_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
      tenantData.value.dueBadgeText = (unpaidBill.effective_status ?? unpaidBill.status).toUpperCase();
      tenantData.value.dueDaysRemaining = 'Awaiting payment';
      tenantData.value.dueDateRaw = unpaidBill.due_date;
      tenantData.value.verifiedAt = '';
      tenantData.value.nextDueDateDisplay = '';
    } else {
      activeBillId.value = null;
      const paidBill = billsData && billsData.length > 0 ? billsData[0] : null;
      const validCoveredDate = maxCoveredDate as Date | null;
      if (validCoveredDate) {
        // Only from the bill. There is deliberately no fallback: a resident with
        // no bill is told there is none, rather than shown a made-up one.
        tenantData.value.baseRent = paidBill ? paidBill.rent_amount : 0;
        tenantData.value.waterFee = paidBill ? paidBill.water_amount : 0;
        tenantData.value.totalAmountDue = 0;

        /**
         * BR-033: the cycle runs from THIS tenancy's anniversary day, not the 5th.
         *
         * This carried `TODO(Sean, audit F9)` and hardcoded `5` in two places, so
         * a resident whose tenancy is anchored on the 13th was told their next
         * payment falls on the 5th - a date that is simply not theirs. The
         * anniversary was in the response the whole time; nothing read it.
         *
         * Clamped to the length of the month, the same way the server clamps:
         * `setMonth(+1)` then `setDate(31)` overflows into the month after, which
         * is the bug `periodEnd` was already rewritten to avoid.
         *
         * When there is no anniversary on file, no date is shown rather than a
         * guessed one. A resident reading a wrong date acts on it.
         */
        tenantData.value.dueBadgeText = 'PAID';
        tenantData.value.dueDaysRemaining = 'Settled';

        const day = anniversaryDay.value;
        if (day) {
          const clamp = (y: number, m: number, d: number) =>
            Math.min(d, new Date(y, m + 1, 0).getDate());

          const y = validCoveredDate.getFullYear();
          const m = validCoveredDate.getMonth();
          const lastPaidDue = new Date(y, m, clamp(y, m, day));
          tenantData.value.dueDate = lastPaidDue.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
          tenantData.value.dueDateRaw = propertyDate(lastPaidDue);

          const nextY = m + 1 > 11 ? y + 1 : y;
          const nextM = (m + 1) % 12;
          const nextDate = new Date(nextY, nextM, clamp(nextY, nextM, day));
          tenantData.value.nextDueDateDisplay = nextDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          tenantData.value.dueDate = '';
          tenantData.value.dueDateRaw = '';
          tenantData.value.nextDueDateDisplay = '';
        }

        const linkedPayment = paymentsData?.find((p: any) => p.verification_status === 'Verified');
        tenantData.value.verifiedAt = linkedPayment?.verified_at
          ? new Date(linkedPayment.verified_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
          : '';
      } else {
        tenantData.value.dueBadgeText = 'PAID';
        tenantData.value.dueDaysRemaining = 'No outstanding bills';
        tenantData.value.totalAmountDue = 0;
        tenantData.value.dueDateRaw = '';
        tenantData.value.verifiedAt = '';
        tenantData.value.nextDueDateDisplay = '';
      }
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
  router.push({ path: '/tenant/payments', query: { pay: activeBillId.value || undefined } });
}

const statusTone = computed(() => {
  const s = dueDateCountdown.value.severity;
  if (s === 'overdue' || s === 'danger') return 'overdue' as const;
  if (s === 'warning') return 'verify' as const;
  return 'on-dark' as const;
});
</script>

<template>
  <div class="ws-focus flex flex-col gap-5 text-ink">
    <header class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm text-ink-faint">{{ todayLabel }}</p>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Good {{ partOfDay }}<template v-if="firstName">, {{ firstName }}</template>
        </h1>
        <p v-if="tenantData.room" class="mt-1 text-sm text-ink-soft">
          {{ tenantData.room }}<template v-if="tenantData.floor">, floor {{ tenantData.floor }}</template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <router-link to="/tenant/tickets" class="pill-btn">
          <Wrench class="size-4 text-ink-soft" aria-hidden="true" />
          Request a repair
        </router-link>
        <router-link to="/tenant/payments" class="pill-btn">
          <CreditCard class="size-4 text-ink-soft" aria-hidden="true" />
          Payment history
        </router-link>
      </div>
    </header>

    <div
      v-if="submissionNotice"
      role="status"
      class="flex items-start justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm"
    >
      <span class="flex items-start gap-2.5">
        <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        {{ submissionNotice }}
      </span>
      <button type="button" class="icon-btn" aria-label="Dismiss this message" @click="submissionNotice = ''">
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-12" aria-busy="true">
      <span class="sr-only" role="status">Loading your account</span>
      <div
        v-for="(span, i) in ['md:col-span-2 xl:col-span-5', 'xl:col-span-4', 'xl:col-span-3', 'md:col-span-2 xl:col-span-8']"
        :key="i"
        :class="['rounded-tile bg-tile p-6 flex flex-col gap-4', span]"
      >
        <Skeleton class-name="h-4 w-28 rounded-full" />
        <Skeleton class-name="h-12 w-40 rounded-2xl" />
        <Skeleton class-name="h-3 w-full rounded-full" />
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <!-- What the resident owes, and the way to pay it. The only brand tile. -->
      <OverviewTile tone="brand" title="Amount due" class="md:col-span-2 xl:col-span-5">
        <UnavailableNote
          v-if="tenantDataLoadFailed"
          dark
          message="Your bill could not be loaded. This is not the same as owing nothing."
          @retry="fetchTenantData"
        />
        <template v-else-if="!isSettled">
          <div>
            <p class="text-5xl leading-none font-semibold tabular tracking-tight">{{ peso(tenantData.totalAmountDue) }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-on-brand-soft">
              <StatusPill :tone="statusTone">{{ dueDateCountdown.label }}</StatusPill>
              <span v-if="tenantData.dueDate">Due {{ tenantData.dueDate }}</span>
            </div>
          </div>
          <div class="flex flex-col items-start gap-2">
            <button type="button" class="pill-btn-light" :disabled="payingOnline" @click="handlePayOnline">
              <CreditCard class="size-4" aria-hidden="true" />
              {{ payingOnline ? 'Opening the payment page' : 'Pay with GCash' }}
            </button>
            <p class="text-xs leading-5 text-on-brand-soft">
              Online payments go through Adyen. Each one counts as paid once the landlady verifies it.
            </p>
          </div>
        </template>
        <div v-else>
          <p class="text-5xl leading-none font-semibold tracking-tight">
            {{ tenantData.dueDaysRemaining === 'Settled' ? 'Settled' : 'Nothing due' }}
          </p>
          <p class="mt-3 text-sm text-on-brand-soft">
            <template v-if="tenantData.nextDueDateDisplay">Next rent is due {{ tenantData.nextDueDateDisplay }}.</template>
            <template v-else>No bill is waiting for payment.</template>
          </p>
        </div>

        <div class="mt-auto border-t border-white/20 pt-3">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-xl py-1 text-sm font-semibold cursor-pointer"
            :aria-expanded="showOtherWaysToPay"
            aria-controls="other-ways-to-pay"
            @click="showOtherWaysToPay = !showOtherWaysToPay"
          >
            Other ways to pay
            <ChevronDown :class="['size-4 transition-transform', showOtherWaysToPay && 'rotate-180']" aria-hidden="true" />
          </button>
          <div v-show="showOtherWaysToPay" id="other-ways-to-pay" class="pt-2 text-sm leading-6 text-on-brand-soft">
            <p>
              Send a GCash transfer to <span class="font-semibold text-on-brand tabular">{{ tenantData.landladyGCash }}</span>,
              account name {{ tenantData.landladyName }}, or pay the landlady in person.
            </p>
          </div>
        </div>
      </OverviewTile>

      <OverviewTile
        :title="isSettled ? 'Latest bill' : 'Current bill'"
        to="/tenant/payments"
        to-label="Open payments and billing"
        class="xl:col-span-4"
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
            <strong class="tabular font-semibold text-ink">{{ peso(tenantData.unitRent) }}</strong>
            a month. A bill appears here once the landlady raises one.
          </p>
        </div>
        <template v-else>
          <SegmentBar
            :segments="[
              { label: 'Rent', value: tenantData.baseRent, tone: 'brand' },
              { label: 'Water', value: tenantData.waterFee, tone: 'bright' },
            ]"
            :label="`Rent ${peso(tenantData.baseRent)} and water ${peso(tenantData.waterFee)}`"
          />
          <dl class="flex flex-col divide-y divide-line text-sm">
            <div class="flex items-baseline justify-between gap-3 py-2.5">
              <dt class="flex items-center gap-2">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-brand" />
                Rent
              </dt>
              <dd class="font-semibold tabular">{{ peso(tenantData.baseRent) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3 py-2.5">
              <dt>
                <span class="flex items-center gap-2">
                  <span aria-hidden="true" class="size-2.5 rounded-full bg-brand-bright" />
                  Water
                </span>
                <span v-if="tenantData.occupants" class="block pl-4.5 text-xs text-ink-faint">
                  {{ tenantData.occupants }} registered {{ tenantData.occupants === 1 ? 'occupant' : 'occupants' }}
                </span>
              </dt>
              <dd class="font-semibold tabular">{{ peso(tenantData.waterFee) }}</dd>
            </div>
            <div v-if="!isSettled" class="flex items-baseline justify-between gap-3 py-2.5">
              <dt class="font-semibold">Still to pay</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(tenantData.totalAmountDue) }}</dd>
            </div>
          </dl>
          <p v-if="waterRatePerOccupant !== null" class="text-xs leading-5 text-ink-faint">
            Water is charged at {{ peso(waterRatePerOccupant) }} for each registered occupant every month.
          </p>
        </template>
      </OverviewTile>

      <OverviewTile tone="night" title="Repairs" class="xl:col-span-3">
        <p class="text-sm leading-6 text-on-night-soft">
          Tell the landlady what needs fixing in your unit, then follow the request until it is done.
        </p>
        <router-link to="/tenant/tickets" class="pill-btn-light mt-auto self-start">
          <Wrench class="size-4" aria-hidden="true" />
          Request a repair
        </router-link>
      </OverviewTile>

      <OverviewTile title="Payments" to="/tenant/payments" to-label="Open payments and billing" class="md:col-span-2 xl:col-span-8">
        <UnavailableNote
          v-if="tenantDataLoadFailed"
          message="Your payments could not be loaded. That does not mean none are recorded."
          @retry="fetchTenantData"
        />
        <p
          v-else-if="pendingOnlinePayments.length === 0 && recordedReceipts.length === 0"
          class="text-sm text-ink-soft"
        >
          No payments are on file yet.
        </p>
        <template v-else>
          <section v-if="pendingOnlinePayments.length" aria-labelledby="pending-payments-heading">
            <h3 id="pending-payments-heading" class="text-xs font-medium text-ink-faint">Waiting for verification</h3>
            <ul class="divide-y divide-line">
              <li v-for="p in pendingOnlinePayments" :key="p.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
                <span class="min-w-0">
                  <span class="block text-sm font-medium">{{ p.method }}</span>
                  <span class="block text-xs text-ink-faint">Sent {{ p.date }}</span>
                </span>
                <span class="flex items-center gap-3">
                  <StatusPill tone="verify">Waiting for verification</StatusPill>
                  <span class="text-sm font-semibold tabular">{{ peso(p.amount) }}</span>
                </span>
              </li>
            </ul>
          </section>
          <section v-if="recordedReceipts.length" aria-labelledby="recorded-receipts-heading">
            <h3 id="recorded-receipts-heading" class="text-xs font-medium text-ink-faint">Recorded by the landlady</h3>
            <ul class="divide-y divide-line">
              <li v-for="r in recordedReceipts" :key="r.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
                <span class="min-w-0">
                  <span class="block text-sm font-medium">
                    {{ r.period ? `Rent for ${r.period}` : 'Rent payment' }}
                  </span>
                  <span class="block text-xs text-ink-faint">
                    Paid {{ r.date }}<template v-if="r.method">, {{ r.method }}</template>
                  </span>
                </span>
                <span class="flex items-center gap-3">
                  <StatusPill :tone="r.verified ? 'paid' : 'neutral'">{{ r.verified ? 'Verified' : 'Not yet verified' }}</StatusPill>
                  <span class="text-sm font-semibold tabular">{{ peso(r.amount) }}</span>
                </span>
              </li>
            </ul>
          </section>
        </template>
      </OverviewTile>

      <OverviewTile :title="tenantData.room || 'Your unit'" class="md:col-span-2 xl:col-span-4">
        <UnavailableNote
          v-if="tenantDataLoadFailed && !tenantData.room"
          message="Your unit details could not be loaded."
          @retry="fetchTenantData"
        />
        <template v-else>
          <div class="relative h-40 overflow-hidden rounded-2xl">
            <img
              v-if="tenantData.photoUrl"
              :src="tenantData.photoUrl"
              :alt="`Photo of ${tenantData.room}`"
              class="size-full object-cover"
            />
            <div v-else class="flex size-full items-end justify-between bg-brand-soft p-4">
              <span class="text-5xl font-semibold tracking-tight text-brand">
                {{ tenantData.room.replace('Unit ', '') || '' }}
              </span>
              <Home class="size-6 text-brand" aria-hidden="true" />
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-xs text-ink-faint">Room type</dt>
              <dd class="font-medium">{{ tenantData.roomDetails || 'Not on file' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Cluster</dt>
              <dd class="font-medium">{{ tenantData.roomType || 'Not on file' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Floor</dt>
              <dd class="font-medium">{{ tenantData.floor || 'Not on file' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Registered occupants</dt>
              <dd class="font-medium">{{ tenantData.occupants || 'Not on file' }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>
    </div>
  </div>
</template>
