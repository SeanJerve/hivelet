<script setup lang="ts">
/**
 * @component TenantGCashPaymentModal
 * @description Optional online GCash payment via Adyen Drop-in (FR-015). Requests a Checkout
 *              Session from the backend (backend/src/routes/payments.ts -- the amount is read
 *              server-side from the `bills` row, never trusted from the client) and mounts the
 *              Adyen Drop-in restricted to GCash. A completed payment is always surfaced as
 *              "pending administrator verification" -- the webhook inserts it that way regardless
 *              of the gateway result (System Bible Section 12).
 * @rationale Degrades gracefully: if the backend reports Adyen isn't configured (still-placeholder
 *            sandbox key), this shows a clear message instead of a broken payment form, keeping the
 *            manual cash/bank-transfer path primary and Adyen genuinely optional.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web';
import '@adyen/adyen-web/styles/adyen.css';
import { supabase } from '../../lib/supabase';

const props = defineProps<{ billId: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const status = ref<'loading' | 'ready' | 'unavailable' | 'error' | 'submitted'>('loading');
const errorMessage = ref('');
let dropinInstance: InstanceType<typeof Dropin> | null = null;

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/adyen/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ billId: props.billId }),
    });
    const json = await res.json();

    if (res.status === 503) {
      status.value = 'unavailable';
      errorMessage.value = json.error?.message || 'Online payment is temporarily unavailable.';
      return;
    }
    if (!json.success) {
      status.value = 'error';
      errorMessage.value = json.error?.message || 'Could not start the online payment session.';
      return;
    }

    const { sessionId, sessionData, clientKey, environment } = json.data;
    const checkout = await AdyenCheckout({
      clientKey,
      environment,
      session: { id: sessionId, sessionData },
      onPaymentCompleted: () => {
        status.value = 'submitted';
      },
      onError: () => {
        status.value = 'error';
        errorMessage.value = 'The payment could not be completed. Please try again or pay via cash/bank transfer.';
      },
    } as any);

    status.value = 'ready';
    await import('vue').then(({ nextTick }) => nextTick());
    dropinInstance = new Dropin(checkout, {
      paymentMethodsConfiguration: { gcash: {} },
    } as any).mount('#adyen-dropin-container');
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err?.message || 'Could not start the online payment session.';
  }
}

onMounted(init);
onBeforeUnmount(() => {
  dropinInstance?.unmount?.();
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div class="lux-card bg-[var(--lux-surface)] w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
        <div>
          <span class="lux-eyebrow">Optional Online Payment</span>
          <h2 class="lux-serif text-lg text-[var(--lux-text)] mt-0.5">Pay with GCash</h2>
        </div>
        <button @click="emit('close')" class="text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"><X class="w-4 h-4" /></button>
      </div>

      <div v-if="status === 'loading'" class="flex items-center justify-center gap-2 py-10 text-sm text-[var(--lux-text-muted)]">
        <Loader2 class="w-4 h-4 animate-spin" />
        <span>Starting secure payment session…</span>
      </div>

      <div v-else-if="status === 'unavailable'" class="p-4 bg-[#f5ede0] border border-[#e3d3ae] rounded text-[#8a6a2e] text-sm flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong class="font-semibold">Online payment temporarily unavailable.</strong>
          <p class="mt-1">{{ errorMessage }} You can still pay via cash or bank transfer directly with the administrator.</p>
        </div>
      </div>

      <div v-else-if="status === 'error'" class="p-4 bg-[#f7e6e2] border border-[#e3b7ac] rounded text-[#8a3a26] text-sm flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <p>{{ errorMessage }}</p>
      </div>

      <div v-else-if="status === 'submitted'" class="p-4 bg-[#e7efe6] border border-[#c3d9c0] rounded text-[#3f6b3f] text-sm flex items-start gap-2.5">
        <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong class="font-semibold">Payment submitted.</strong>
          <p class="mt-1">Your GCash payment is pending administrator verification. You'll be notified once it's confirmed.</p>
        </div>
      </div>

      <div v-show="status === 'ready'" id="adyen-dropin-container"></div>
    </div>
  </div>
</template>
