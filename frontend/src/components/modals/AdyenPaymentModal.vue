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
import { ref, computed, onMounted, nextTick } from 'vue';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web';
import type { PaymentCompletedData, PaymentFailedData } from '@adyen/adyen-web';
import '@adyen/adyen-web/styles/adyen.css';
import { api } from '@/lib/api';
import { useToast } from '@/lib/useToast';
import {
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-vue-next';

const props = defineProps<{
  bill: {
    id: string;
    rent_amount: number;
    water_amount: number;
    total_amount: number;
    /** Derived by the API from the payments linked to this bill. BR-013. */
    amount_paid?: number;
    amount_outstanding?: number;
    due_date: string;
    room_number?: string;
  };
}>();

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
  const outstanding = Number(props.bill.amount_outstanding);
  return Number.isFinite(outstanding) ? outstanding : Number(props.bill.total_amount) || 0;
});

const partiallySettled = computed(
  () => Number(props.bill.amount_paid) > 0 && amountDue.value < Number(props.bill.total_amount)
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', reference: string): void;
}>();

const { showToast } = useToast();

const adyenContainerRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const isCompleted = ref(false);
/** True once the webhook's payment row is visible; false while it is in flight. */
const isRecorded = ref(false);

onMounted(async () => {
  await initializeAdyen();
});

async function initializeAdyen() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const res = await api.post<{
      sessionId: string;
      sessionData: string | null;
      clientKey: string;
      environment: string;
      isLive: boolean;
    }>('/tenant/payments/checkout', {
      billId: props.bill.id,
      returnUrl: window.location.origin + '/tenant/payments'
    });

    if (!res?.sessionId || !res.sessionData || !res.clientKey) {
      throw new Error('The payment gateway did not return a usable checkout session.');
    }

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
        errorMessage.value =
          `The payment did not go through${code ? ` (${code})` : ''}. ` +
          'Nothing has been charged and no payment was recorded.';
      },
      onError: (error: { message?: string }) => {
        errorMessage.value = error?.message || 'An error occurred during checkout.';
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
      throw new Error(
        'The payment form could not be placed on the page. Nothing has been charged. ' +
        'Close this and try again, and tell the landlady if it keeps happening.'
      );
    }

    new Dropin(checkout, { showPayButton: true }).mount(adyenContainerRef.value);
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Unable to reach the payment gateway.';
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
      errorMessage.value = `Adyen reports this checkout as "${res?.gatewayStatus ?? 'unknown'}". No payment was recorded.`;
      return;
    }

    isCompleted.value = true;
    isRecorded.value = Boolean(res.recorded);
    showToast(
      'success',
      'Payment confirmed by Adyen',
      "It is now awaiting the landlady's verification."
    );
    emit('success', sessionId);
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Could not confirm the payment with the gateway.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <WsModal
    title="Pay with GCash"
    subtitle="Adyen handles the payment. Your details are entered in their fields and never reach Hivelet."
    size="md"
    :dismissible="false"
    @close="emit('close')"
  >
    <!-- What is being paid -->
    <dl class="rounded-2xl bg-canvas p-4 flex flex-col gap-2 text-sm">
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">This bill</dt>
        <dd class="font-medium">
          {{ props.bill.room_number ? 'Unit ' + String(props.bill.room_number).toUpperCase() : 'Monthly dues' }}
        </dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Rent and water</dt>
        <dd class="tabular">
          {{ peso(props.bill.rent_amount) }} and {{ peso(props.bill.water_amount) }}
        </dd>
      </div>
      <div v-if="partiallySettled" class="flex items-baseline justify-between gap-3">
        <dt class="text-ink-soft">Already paid</dt>
        <dd class="tabular">
          {{ peso(Number(props.bill.amount_paid), 2) }} of {{ peso(Number(props.bill.total_amount), 2) }}
        </dd>
      </div>
      <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
        <dt class="font-semibold">{{ partiallySettled ? 'Left to pay' : 'To pay now' }}</dt>
        <dd class="text-xl font-semibold tabular">{{ peso(amountDue, 2) }}</dd>
      </div>
    </dl>

    <!-- Opening the gateway -->
    <div v-if="isLoading" class="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 class="size-7 animate-spin text-brand" aria-hidden="true" />
      <p class="text-sm font-medium" role="status">Opening the payment page</p>
      <p class="text-sm text-ink-soft">This takes a few seconds.</p>
    </div>

    <!-- Paid -->
    <div v-else-if="isCompleted" class="flex flex-col items-center gap-3 py-8 text-center">
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

    <!-- Could not open -->
    <div v-else-if="errorMessage" class="flex flex-col items-start gap-3 rounded-2xl bg-overdue-soft p-4 text-sm text-overdue">
      <p class="flex items-center gap-2 font-semibold">
        <AlertCircle class="size-4" aria-hidden="true" />
        The payment page could not be opened
      </p>
      <p>{{ errorMessage }}</p>
      <button type="button" class="pill-btn" @click="initializeAdyen">Try again</button>
    </div>

    <!-- Adyen's own fields -->
    <div v-else>
      <div ref="adyenContainerRef" id="adyen-dropin-container" class="min-h-[220px]"></div>
    </div>

    <template #actions>
      <p class="mr-auto flex items-center gap-2 text-xs text-ink-faint">
        <ShieldCheck class="size-4 text-brand" aria-hidden="true" />
        Payment details stay with Adyen
      </p>
      <button type="button" class="pill-btn" @click="emit('close')">
        {{ isCompleted ? 'Done' : 'Cancel' }}
      </button>
    </template>
  </WsModal>
</template>
