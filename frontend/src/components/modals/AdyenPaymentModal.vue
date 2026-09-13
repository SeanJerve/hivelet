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
import { ref, onMounted, nextTick } from 'vue';
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
    due_date: string;
    room_number?: string;
  };
}>();

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

    if (adyenContainerRef.value) {
      new Dropin(checkout, { showPayButton: true }).mount(adyenContainerRef.value);
    }
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Unable to reach the payment gateway.';
  } finally {
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
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="surface-card w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl bg-white flex flex-col max-h-[92vh] border border-border">
      
      <!-- Header -->
      <div class="bg-background border-b border-border p-4 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="size-8 rounded-xl bg-blue-50 text-primary ring-1 ring-blue-200 flex items-center justify-center font-bold">
            <Lock class="size-4" />
          </div>
          <div>
            <h2 class="text-sm font-extrabold text-foreground flex items-center gap-2">
              Adyen Online Checkout
              <span class="badge-soft badge-success text-[10px] font-extrabold">
                SANDBOX TEST
              </span>
            </h2>
            <p class="text-xs text-muted-foreground">Official Adyen v71 Sessions Integration</p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Bill Summary Card -->
      <div class="p-4 bg-background border-b border-border space-y-2">
        <div class="flex justify-between items-center text-xs">
          <span class="text-muted-foreground">Billing Target:</span>
          <span class="font-bold text-foreground">
            {{ props.bill.room_number ? 'Unit ' + props.bill.room_number + ' — ' : '' }}Monthly Dues
          </span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-muted-foreground">Base Rent + Water Fee:</span>
          <span class="text-foreground">₱{{ props.bill.rent_amount.toLocaleString() }} + ₱{{ props.bill.water_amount.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-extrabold text-primary pt-1.5 border-t border-border">
          <span>Total Remittance Due:</span>
          <span class="tabular font-display text-base font-black">₱{{ props.bill.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
        </div>
      </div>

      <!-- Main Body -->
      <div class="p-5 flex-1 overflow-y-auto space-y-4">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 class="size-8 text-primary animate-spin" />
          <p class="text-xs font-bold text-foreground">Connecting to Adyen Test Gateway...</p>
          <p class="text-[11px] text-muted-foreground">Initializing encrypted merchant checkout session</p>
        </div>

        <!-- Success Completed State -->
        <div v-else-if="isCompleted" class="py-8 text-center space-y-3">
          <CheckCircle2 class="size-12 text-emerald-600 mx-auto" />
          <h3 class="text-base font-bold text-foreground">Adyen confirmed your payment</h3>
          <p v-if="isRecorded" class="text-xs text-muted-foreground max-w-sm mx-auto">
            It has been recorded and is now awaiting verification by Landlady Fe Galang Da Silva.
            It will appear in your payment history once she has verified it.
          </p>
          <p v-else class="text-xs text-muted-foreground max-w-sm mx-auto">
            The gateway is sending us the signed confirmation now, and the record usually
            appears within a few seconds. It will then await verification by Landlady
            Fe Galang Da Silva. Nothing further is needed from you.
          </p>
          <button
            @click="emit('close')"
            class="btn-primary mt-4"
          >
            Done &amp; Return to Portal
          </button>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-3">
          <div class="flex items-center gap-2 font-bold text-rose-900">
            <AlertCircle class="size-4" />
            Adyen Connection Notice
          </div>
          <p>{{ errorMessage }}</p>
          <div class="pt-2">
            <button @click="initializeAdyen" class="btn-dark gap-1.5">
              <span>Try again</span>
            </button>
          </div>
        </div>

        <!-- Adyen Web Component Container -->
        <div v-else class="space-y-4">
          <div ref="adyenContainerRef" id="adyen-dropin-container" class="min-h-[220px]"></div>
        </div>
      </div>

      <!-- Footer Security Note -->
      <div class="bg-background border-t border-border px-4 py-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <ShieldCheck class="size-3.5 text-emerald-600" />
          <span>Card and wallet details are entered in Adyen's fields and never reach Hivelet's servers</span>
        </div>
        <button
          @click="emit('close')"
          class="btn-secondary min-h-8 h-8 px-3 text-xs"
        >
          Cancel
        </button>
      </div>

    </div>
  </div>
</template>
