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
import '@adyen/adyen-web/styles/adyen.css';
import { api } from '@/lib/api';
import { useToast } from '@/lib/useToast';
import { 
  ShieldCheck, 
  X, 
  Loader2, 
  ExternalLink, 
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
const paymentRef = ref<string>('');
const redirectUrl = ref<string | null>(null);
const isLiveSession = ref(false);

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
      redirectUrl: string;
      isLive: boolean;
    }>('/tenant/payments/checkout', {
      billId: props.bill.id,
      returnUrl: window.location.origin + '/tenant/payments'
    });

    if (!res || !res.sessionId) {
      throw new Error('Failed to obtain Adyen checkout session.');
    }

    redirectUrl.value = res.redirectUrl;
    isLiveSession.value = res.isLive;

    // If live Adyen session data is available, mount official @adyen/adyen-web SDK
    if (res.sessionData && res.clientKey) {
      await nextTick();
      
      const checkout = await AdyenCheckout({
        environment: (res.environment as any) || 'test',
        clientKey: res.clientKey,
        session: {
          id: res.sessionId,
          sessionData: res.sessionData
        },
        onPaymentCompleted: async (result: any) => {
          console.log('[Adyen Web SDK] Payment completed result:', result);
          await finalizePayment(res.sessionId, result.resultCode, result.pspReference);
        },
        onError: (error: any) => {
          console.error('[Adyen Web SDK] Error:', error);
          errorMessage.value = error?.message || 'An error occurred in Adyen Checkout.';
        }
      });

      if (adyenContainerRef.value) {
        // Create Drop-in component via new Dropin
        const dropin = new Dropin(checkout, {
          showPayButton: true,
          paymentMethodsConfiguration: {
            gcash: {
              name: 'GCash e-Wallet',
              showPayButton: true
            },
            card: {
              hasHolderName: true,
              holderNameRequired: true,
              billingAddressRequired: false
            }
          }
        });
        dropin.mount(adyenContainerRef.value);
      }
    }
  } catch (err: any) {
    console.error('Adyen init error:', err);
    errorMessage.value = err?.message || 'Unable to connect to Adyen test environment.';
  } finally {
    isLoading.value = false;
  }
}

async function finalizePayment(sessionId: string, resultCode?: string, pspReference?: string) {
  isLoading.value = true;
  try {
    const verifyRes = await api.post<{ paymentReference: string; status: string }>(
      '/tenant/payments/adyen/verify-session',
      { sessionId, resultCode, pspReference }
    );
    paymentRef.value = verifyRes?.paymentReference || 'ADYEN-CONFIRMED';
    isCompleted.value = true;
    showToast('success', 'Payment Submitted', `Online payment (Ref: ${paymentRef.value}) is pending landlady verification.`);
    emit('success', paymentRef.value);
  } catch (err: any) {
    showToast('error', 'Verification Failed', err?.message || 'Failed to record payment verification.');
  } finally {
    isLoading.value = false;
  }
}

function openInteractiveSimulator() {
  if (redirectUrl.value) {
    window.location.href = redirectUrl.value;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white border border-[#dfe1e6] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
      
      <!-- Header -->
      <div class="bg-[#f4f5f7] border-b border-[#dfe1e6] p-4 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#0c66e4]/10 text-[#0c66e4] flex items-center justify-center font-bold">
            <Lock class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
              Adyen Online Checkout
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                SANDBOX TEST
              </span>
            </h2>
            <p class="text-xs text-[#5e6c84]">Official Adyen v71 Sessions Integration</p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 text-[#6b778c] hover:text-[#172b4d] hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Bill Summary Card -->
      <div class="p-4 bg-[#091e42]/[0.02] border-b border-[#dfe1e6] space-y-2">
        <div class="flex justify-between items-center text-xs">
          <span class="text-[#5e6c84]">Billing Target:</span>
          <span class="font-bold text-[#172b4d]">Unit {{ props.bill.room_number || '204' }} — Monthly Dues</span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-[#5e6c84]">Base Rent + Water Fee:</span>
          <span class="text-[#172b4d]">₱{{ props.bill.rent_amount.toLocaleString() }} + ₱{{ props.bill.water_amount.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between items-center text-sm font-extrabold text-[#0c66e4] pt-1 border-t border-[#dfe1e6]">
          <span>Total Remittance Due:</span>
          <span>₱{{ props.bill.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
        </div>
      </div>

      <!-- Main Body -->
      <div class="p-5 flex-1 overflow-y-auto space-y-4">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 class="w-8 h-8 text-[#0c66e4] animate-spin" />
          <p class="text-xs font-semibold text-[#172b4d]">Connecting to Adyen Test Gateway...</p>
          <p class="text-[11px] text-[#5e6c84]">Initializing encrypted merchant checkout session</p>
        </div>

        <!-- Success Completed State -->
        <div v-else-if="isCompleted" class="py-8 text-center space-y-3">
          <CheckCircle2 class="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 class="text-base font-bold text-[#172b4d]">Payment Submitted Successfully</h3>
          <p class="text-xs text-[#5e6c84] max-w-sm mx-auto">
            Your payment reference <strong class="font-mono text-[#172b4d]">{{ paymentRef }}</strong> has been recorded. It is now awaiting verification by Landlady Fe Galang Da Silva.
          </p>
          <button
            @click="emit('close')"
            class="mt-4 px-6 py-2 bg-[#0c66e4] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Done &amp; Return to Portal
          </button>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-3">
          <div class="flex items-center gap-2 font-bold">
            <AlertCircle class="w-4 h-4" />
            Adyen Connection Notice
          </div>
          <p>{{ errorMessage }}</p>
          <div class="pt-2">
            <button
              @click="openInteractiveSimulator"
              class="px-4 py-2 bg-[#172b4d] text-white rounded font-bold hover:bg-black transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              Use Interactive GCash Gateway
            </button>
          </div>
        </div>

        <!-- Adyen Web Component Container -->
        <div v-else class="space-y-4">
          <div ref="adyenContainerRef" id="adyen-dropin-container" class="min-h-[220px]"></div>

          <!-- Interactive Gateway Link -->
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg flex items-center justify-between">
            <div class="text-[11px] text-[#5e6c84]">
              <span class="font-bold text-[#172b4d]">Simulator Mode:</span> Want the full GCash mobile screen?
            </div>
            <button
              @click="openInteractiveSimulator"
              class="text-xs font-bold text-[#0c66e4] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Open GCash Simulator
              <ExternalLink class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Security Note -->
      <div class="bg-[#f4f5f7] border-t border-[#dfe1e6] px-4 py-3 flex items-center justify-between text-[10px] text-[#6b778c]">
        <div class="flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
          <span>PCI-DSS Level 1 Encrypted • Merchant: <strong>HiveletECOM</strong></span>
        </div>
        <button
          @click="emit('close')"
          class="text-[#172b4d] font-bold hover:underline cursor-pointer"
        >
          Cancel
        </button>
      </div>

    </div>
  </div>
</template>
