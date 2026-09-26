<!--
  @file components/modals/AdyenPaymentModal.vue
  @description Official Adyen Web Checkout Component & Modal for Hivelet Resident Portal.
  @systemBibleRef Section 12 (Payment Types), Section 22 (Financial Sync)
  @businessRules  BR-016 (Online GCash via Adyen), BR-017 (Pending Verification)
  @architectureRationale
  Integrates @adyen/adyen-web v6 SDK directly into the Vue 3 application, 
  allowing residents to interact with live Adyen sandbox checkout components, 
  test payment methods, and submit verified transactions.
-->
<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import { peso } from '@/lib/canonicalUnits';
import { formatDateOnly } from '@/lib/propertyDate';
import { ref, computed, onMounted, nextTick } from 'vue';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web';
import type { PaymentCompletedData, PaymentFailedData } from '@adyen/adyen-web';
import '@adyen/adyen-web/styles/adyen.css';
import { api, ApiRequestError } from '@/lib/api';
import {
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-vue-next';

interface BillInfo {
  id: string;
  rent_amount: number;
  water_amount: number;
  total_amount: number;
  /** Derived by the API from the payments linked to this bill. BR-013. */
  amount_paid?: number;
  amount_outstanding?: number;
  due_date: string;
  /**
   * `/tenant/my-bills` nests the unit under `rooms:room_id (id, room_number)` -
   * there is no flat `room_number` on the bill row. This prop used to read
   * `bill.room_number` directly, which is always `undefined` on the real
   * response, so the tile silently fell back to "Monthly dues" on every
   * checkout regardless of which unit the bill was for.
   */
  rooms?: { room_number?: string | null } | null;
}

const props = defineProps<{
  /**
   * Omitted when there is nothing to hand over yet - a resident with no
   * outstanding row can still pay for the current cycle, and until 2026-09-22
   * nothing in the portal ever let them try: this component always required a
   * bill it did not have. `billId` is undefined on that first checkout call,
   * which `POST /tenant/payments/checkout` already raises or resolves one
   * from (it always has; nothing on the frontend ever sent that request).
   * The real figures - what the tenant is actually being charged - come back
   * on the checkout response itself and fill `billInfo` from there instead.
   */
  bill?: BillInfo | null;
}>();

/**
 * What this modal shows and pays against. Starts from the prop when the
 * caller already has a bill (the normal "pay this outstanding balance" case)
 * and is filled in from the checkout response otherwise - see the note on
 * `bill` above. Never invented client-side: until one of those two sources
 * answers, the summary panel below stays hidden rather than showing a zero
 * that could be read as "nothing is owed".
 */
const billInfo = ref<BillInfo | null>(props.bill ?? null);

/**
 * The figure Adyen will actually charge.
 *
 * The server derives the charge from the bill's outstanding balance, not its
 * total - a partially paid bill would otherwise be taken in full a second time.
 * This mirrors that calculation so the amount shown here is the amount charged.
 * Falls back to the total, which is correct for a bill nothing has been paid
 * against.
 */
const amountDue = computed(() => {
  if (!billInfo.value) return 0;
  const outstanding = Number(billInfo.value.amount_outstanding);
  return Number.isFinite(outstanding) ? outstanding : Number(billInfo.value.total_amount) || 0;
});

const dueLabel = computed(() =>
  formatDateOnly(billInfo.value?.due_date, { month: 'long', day: 'numeric', year: 'numeric' })
);

const partiallySettled = computed(
  () =>
    billInfo.value !== null &&
    Number(billInfo.value.amount_paid) > 0 &&
    amountDue.value < Number(billInfo.value.total_amount)
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', reference: string): void;
}>();

/**
 * RAW GATEWAY TEXT REACHED RESIDENTS.
 *
 * `onError` printed the Drop-in's own `error.message`, `onPaymentFailed`
 * appended Adyen's result code in brackets, a declined confirmation quoted the
 * session status ("paymentPending"), and a failed request showed whatever the
 * server said, including Adyen's raw replies and "Check that the API is
 * running" (B-61). Each is now a sentence a resident can act on. The one kind
 * of server text still passed through is a 404 or 409: both are written for
 * residents in `tenant.ts` and `adyenService.ts` and say what to do next.
 *
 * Same wording as `gatewayStatusWords` in TenantPaymentsView.vue, which handles
 * the GCash return leg; change both together.
 */
function gatewayStatusWords(status: string | undefined): string {
  switch (status) {
    case 'paymentPending':
      return 'GCash has not finished processing this payment yet. Do not pay again; check your payments page later.';
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

/**
 * An error this component throws with a sentence written for residents.
 *
 * `initializeAdyen` showed ANY `Error`'s message, meant for its own two
 * throws below. `AdyenCheckout()` throws Errors too: with the session setup
 * call failing, a resident read "Service at https://checkoutshopper-test.adyen.com/
 * checkoutshopper/v1/sessions/.../setup?clientKey=... is not available", the
 * client key included (B-61 re-check, mocked-API harness, 2026-09-24). Only
 * this class's text is shown now; anything else gets the plain sentence.
 */
class ResidentFacingError extends Error {}

/** A server refusal written for residents, or null when it is not one. */
function residentFacingServerText(err: unknown): string | null {
  return err instanceof ApiRequestError && (err.status === 404 || err.status === 409) ? err.message : null;
}

const adyenContainerRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
/**
 * True once the Drop-in is on screen, i.e. once the resident could have paid.
 *
 * The error panel headed EVERY failure "The payment page could not be opened",
 * including the ones that happen after it opened - a declined card, a lost
 * session on the way back. And it offered "Try again", which after a payment
 * has actually been authorised is the single worst thing to suggest.
 */
const hasAttemptedPayment = ref(false);
/**
 * False after a 409. The server refused because a payment is already waiting
 * for verification or the bill is paid, and "Try again" would only ask again.
 */
const canRetry = ref(true);
/**
 * A 409 is a deliberate refusal written for residents (the 15-minute hold, a
 * payment already waiting, a paid bill), not a fault, so it is not drawn as one.
 */
const isRefusal = computed(() => !hasAttemptedPayment.value && !canRetry.value);
const isCompleted = ref(false);
/** True once the webhook's payment row is visible; false while it is in flight. */
const isRecorded = ref(false);

onMounted(async () => {
  await initializeAdyen();
});

async function initializeAdyen() {
  isLoading.value = true;
  errorMessage.value = null;
  canRetry.value = true;

  try {
    const res = await api.post<{
      sessionId: string;
      sessionData: string | null;
      clientKey: string;
      environment: string;
      isLive: boolean;
      bill: BillInfo | null;
    }>('/tenant/payments/checkout', {
      billId: props.bill?.id,
      returnUrl: window.location.origin + '/tenant/payments'
    });

    if (!res?.sessionId || !res.sessionData || !res.clientKey) {
      throw new ResidentFacingError(
        'The payment page did not load properly. Nothing has been charged. Try again, and tell ' +
        'the landlady if it keeps happening.'
      );
    }

    // Authoritative either way: even a caller that already passed a `bill`
    // prop gets refreshed from what the server actually resolved and is
    // about to charge, rather than trusting a value that may be a request
    // old by now.
    if (res.bill) billInfo.value = res.bill;

    await nextTick();

    const checkout = await AdyenCheckout({
      environment: (res.environment as 'test' | 'live') || 'test',
      clientKey: res.clientKey,
      session: {
        id: res.sessionId,
        sessionData: res.sessionData
      },
      /**
       * Adyen hands this callback only the keys it whitelists - `action`,
       * `resultCode`, `sessionData`, `order`, `sessionResult`, `donationToken`,
       * `error`. There is no `pspReference` here, which is exactly why this page
       * does not record the payment: it has nothing the server could reconcile
       * against the webhook. `sessionResult` goes to our backend, which asks
       * Adyen directly what happened.
       */
      onPaymentCompleted: async (data: PaymentCompletedData) => {
        // The union is `SessionsResponse | { resultCode, donationToken? }`. Only
        // the sessions arm carries `sessionResult`, so narrow rather than cast -
        // an advanced-flow payload here would otherwise silently send undefined.
        const sessionResult = 'sessionResult' in data ? data.sessionResult : undefined;
        await confirmWithServer(res.sessionId, sessionResult);
      },
      onPaymentFailed: (data?: PaymentFailedData) => {
        const code = data && 'resultCode' in data ? data.resultCode : undefined;
        const what =
          code === 'Refused'
            ? 'GCash declined the payment.'
            : code === 'Cancelled'
              ? 'The payment was cancelled before it was completed.'
              : 'The payment did not go through.';
        errorMessage.value =
          `${what} You should not have been charged, but if money did leave your GCash, tell ` +
          'the landlady rather than paying again.';
      },
      onError: (error: { name?: string }) => {
        // The Drop-in reports a resident backing out as an error named CANCEL.
        errorMessage.value =
          error?.name === 'CANCEL'
            ? 'The payment was cancelled before it was completed. You should not have been charged.'
            : 'The payment form stopped with an error before it finished. If money did leave ' +
              'your GCash, tell the landlady rather than paying again.';
      }
    });

    /**
     * THE CONTAINER HAS TO EXIST BEFORE THE DROP-IN CAN MOUNT INTO IT.
     *
     * This read `if (adyenContainerRef.value) { ... mount(...) }` while
     * `isLoading` was still true - and the container only renders in the `v-else`
     * arm that `isLoading` suppresses. So the ref was ALWAYS null, the guard was
     * ALWAYS false, and the Drop-in was never mounted. The `finally` then set
     * `isLoading = false`, the arm appeared, and the resident was left looking at
     * an empty 220-pixel box: no pay button, no GCash logo, no error, nothing to
     * retry.
     *
     * The gateway is fully configured and was completely unusable. Every attempt
     * created a real Adyen session and wrote a PAYMENT_RECORD audit row on the
     * way to doing nothing.
     *
     * So: reveal the container, let Vue paint it, THEN mount. And if the ref is
     * somehow still missing, SAY SO. The silent `if` is what let this sit here -
     * a guard that skips the only thing the function exists to do should never
     * be quiet about it.
     */
    isLoading.value = false;
    await nextTick();

    if (!adyenContainerRef.value) {
      throw new ResidentFacingError(
        'The payment form could not be placed on the page. Nothing has been charged. ' +
        'Close this and try again, and tell the landlady if it keeps happening.'
      );
    }

    new Dropin(checkout, { showPayButton: true }).mount(adyenContainerRef.value);
    hasAttemptedPayment.value = true;
  } catch (err: unknown) {
    if (err instanceof ApiRequestError && err.status === 409) canRetry.value = false;
    errorMessage.value =
      residentFacingServerText(err) ??
      (err instanceof ResidentFacingError
        ? err.message
        : 'The payment page could not be reached just now. Nothing has been charged. Try again ' +
          'in a moment, and tell the landlady if it keeps happening.');
  } finally {
    // Already false on the happy path above; this covers every throw before it.
    isLoading.value = false;
  }
}

/**
 * Confirms the outcome with our server, which confirms it with Adyen.
 *
 * This does not create the payment. The signed webhook does that, usually within
 * seconds. `recorded` tells us whether it has landed yet, so the tenant is told
 * the truth either way rather than being shown a reference that was invented here.
 */
async function confirmWithServer(sessionId: string, sessionResult?: string) {
  if (!sessionResult) {
    errorMessage.value =
      'The gateway did not return a result token, so this payment could not be confirmed. ' +
      'If money left your account, contact the landlady - the payment is still recorded on Adyen.';
    return;
  }

  isLoading.value = true;
  try {
    const res = await api.post<{ confirmed: boolean; recorded: boolean; gatewayStatus: string }>(
      '/tenant/payments/adyen/verify-session',
      { sessionId, sessionResult }
    );

    if (!res?.confirmed) {
      errorMessage.value = gatewayStatusWords(res?.gatewayStatus);
      return;
    }

    // No toast as well: the "Payment sent" panel below stays until the
    // resident closes the dialog, and it is the one that tells recorded
    // from still being recorded.
    isCompleted.value = true;
    isRecorded.value = Boolean(res.recorded);
    emit('success', sessionId);
  } catch (err: unknown) {
    errorMessage.value =
      residentFacingServerText(err) ??
      'We could not confirm this payment from here. If money left your GCash it is safe: Adyen ' +
        'has it, and it reaches the landlady separately. Do not pay again; check your payments ' +
        'page shortly.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <WsModal
    title="Pay with GCash"
    size="md"
    :dismissible="false"
    @close="emit('close')"
  >
    <!--
      Capped and scrollable on a phone, same reasoning as AdminEditUnitModal's
      form and RoomDetailModal's body: "Cancel"/"Done" live in `WsModal`'s
      footer slot, drawn after the body, so the only way to keep it reachable
      is to stop the body being taller than the screen. The summary below is
      short, but the Drop-in Adyen mounts beneath it is not under this
      component's control - a GCash checkout with more than one method
      offered routinely runs past `min-h-[220px]`, and measured with a
      similarly-sized mocked Drop-in at 375 the footer's bottom 28px sat past
      the fold with nothing to say there was more below.

      This wraps ONLY the scroll container, not the Drop-in's own mount
      sequence: `adyenContainerRef` stays the same DOM node either way, so
      `initializeAdyen`'s `nextTick`-then-`.mount()` sequence (see the comment
      on that function) is unaffected - an `overflow`/`max-height` ancestor
      clips paint, it does not defer mounting the way the `Transition` that
      comment rules out would have. `dvh` rather than `vh` for the same
      reason as those two: the phone's bars are showing when this opens.
    -->
    <div class="flex flex-col gap-5 max-h-[60dvh] overflow-y-auto px-1.5 -mx-1.5 sm:mx-0 sm:max-h-none sm:overflow-visible sm:px-0">
    <!--
      What is being paid. Hidden rather than zeroed until `billInfo` answers -
      when nothing was passed in, that is exactly the span from mount until
      the checkout call resolves, and a "₱0.00 to pay now" flash in that gap
      reads as a claim that nothing is owed.
    -->
    <dl v-if="billInfo" class="rounded-2xl bg-canvas p-4 flex flex-col gap-2 text-sm">
      <div v-if="dueLabel" class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Due</dt>
        <dd class="font-medium">{{ dueLabel }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Rent</dt>
        <dd class="tabular">{{ peso(billInfo.rent_amount, 2) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Water</dt>
        <dd class="tabular">{{ peso(billInfo.water_amount, 2) }}</dd>
      </div>
      <div v-if="partiallySettled" class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Already paid</dt>
        <dd class="tabular">
          {{ peso(Number(billInfo.amount_paid), 2) }} of {{ peso(Number(billInfo.total_amount), 2) }}
        </dd>
      </div>
      <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
        <dt class="font-semibold">{{ partiallySettled ? 'Left to pay' : 'To pay now' }}</dt>
        <dd class="text-xl font-semibold tabular tracking-tight">{{ peso(amountDue, 2) }}</dd>
      </div>
    </dl>

    <!--
      This same panel covers two different waits: opening the Drop-in, and
      afterwards confirming what Adyen just did with `confirmWithServer`. Both
      set `isLoading`, and this used to say "Opening the payment page" for
      both - which is wrong, and worse, wrong in the direction of suggesting
      nothing has happened yet to someone who has already authorised a charge
      in their GCash app and is now watching this screen for confirmation.

      Each of the three states below that swap on a v-if now settles in with
      `.ws-reveal` rather than snapping straight to full opacity - the same
      technique WsModal's own panel uses, so it needs no wrapper and cannot
      touch the branch it is attached to.

      The fourth branch, the Drop-in container, deliberately carries NONE of
      this. `initializeAdyen` sets `isLoading = false`, awaits one `nextTick`,
      and then requires `adyenContainerRef.value` to already exist - a
      sequence the surrounding comment there says used to fail silently for
      exactly this reason. A Vue `<Transition>` wrapping all four branches
      would have been the obvious way to crossfade between them, and it is
      exactly what would have broken that: `mode="out-in"` defers mounting the
      entering branch until the leaving one's transition finishes, which is
      longer than one `nextTick` and would have made the container null again
      at the moment `.mount()` is called. So no shared Transition here, and no
      entrance animation on the Drop-in branch itself - Adyen's own SDK owns
      what renders inside it.
    -->
    <div v-if="isLoading" class="ws-reveal flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 class="size-7 animate-spin text-brand" aria-hidden="true" />
      <p class="text-sm font-medium" role="status">
        {{ hasAttemptedPayment ? 'Confirming your payment' : 'Opening the payment page' }}
      </p>
      <p class="text-sm text-ink-soft">
        {{ hasAttemptedPayment ? 'Checking the result with Adyen. This takes a few seconds.' : 'This takes a few seconds.' }}
      </p>
    </div>

    <!-- Paid -->
    <div v-else-if="isCompleted" class="ws-reveal flex flex-col items-center gap-3 py-8 text-center" role="status">
      <CheckCircle2 class="size-10 text-brand" aria-hidden="true" />
      <h3 class="text-lg font-semibold tracking-tight">Payment sent</h3>
      <p v-if="isRecorded" class="max-w-sm text-sm leading-6 text-ink-soft">
        It is recorded and waiting for the landlady to verify it. It appears in your payment
        history once she has.
      </p>
      <p v-else class="max-w-sm text-sm leading-6 text-ink-soft">
        The gateway is sending us the signed confirmation now, and the record usually appears
        within a few seconds. It then waits for the landlady to verify it. Nothing further is
        needed from you.
      </p>
    </div>

    <!-- Could not open, refused, or did not complete. The body is ink, not
         red: a paragraph of red text is hard to read on the pink. -->
    <div
      v-else-if="errorMessage"
      :class="[
        'ws-reveal flex flex-col items-start gap-2 rounded-2xl p-4 text-sm leading-6',
        isRefusal ? 'bg-verify-soft' : 'bg-overdue-soft',
      ]"
    >
      <p :class="['flex items-start gap-2 font-semibold', isRefusal ? 'text-ink' : 'text-overdue']">
        <AlertCircle
          :class="['mt-1 size-4 shrink-0', isRefusal ? 'text-verify' : 'text-overdue']"
          aria-hidden="true"
        />
        {{
          hasAttemptedPayment
            ? 'This payment did not complete'
            : isRefusal
              ? 'Payment not opened'
              : 'The payment page could not be opened'
        }}
      </p>
      <p class="text-ink">{{ errorMessage }}</p>
      <!--
        No retry once the form has been on screen. Past that point the resident
        may already have authorised in GCash, and "Try again" would open a second
        session for the same bill. Checkout now refuses that while a payment is
        awaiting verification, but the button should not be asking for it.
      -->
      <button v-if="!hasAttemptedPayment && canRetry" type="button" class="pill-btn mt-1" @click="initializeAdyen">
        Try again
      </button>
      <p v-else-if="hasAttemptedPayment" class="text-xs leading-5 text-ink-soft">
        Close this and check your payments page. Do not pay again unless the landlady asks you to.
      </p>
    </div>

    <!-- Adyen's own fields - no entrance animation, see the comment above. -->
    <div v-else>
      <div ref="adyenContainerRef" id="adyen-dropin-container" class="min-h-[220px]"></div>
    </div>
    </div>

    <template #actions>
      <p class="mr-auto flex items-center gap-2 text-xs text-ink-faint">
        <ShieldCheck class="size-4 text-brand" aria-hidden="true" />
        Payment details stay with Adyen
      </p>
      <button type="button" class="pill-btn" @click="emit('close')">
        {{ isCompleted ? 'Done' : errorMessage ? 'Close' : 'Cancel' }}
      </button>
    </template>
  </WsModal>
</template>
