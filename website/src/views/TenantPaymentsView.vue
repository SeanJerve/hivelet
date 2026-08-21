<!--
  @file views/TenantPaymentsView.vue
  @description Tenant Payment & Billing — outstanding bills with online pay button and year-filtered payment history.
  @systemBibleRef Section 4 (Tenant Role), Section 12 (Billing), BR-016/BR-017 (Online GCash via Adyen)
  @rationale Separates payment actions from overview for cleaner UX. Year filter prevents long scrolling lists.
  @innovations Year-based payment record filtering, Adyen checkout redirect integration, responsive card+table hybrid layout.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import {
  CreditCard,
  FileText,
  ShieldCheck,
  Clock,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  Loader2
} from 'lucide-vue-next';

// Outstanding bills from DB
const outstandingBills = ref<any[]>([]);
const loadingBills = ref(false);
const payingBillId = ref<string | null>(null);

// Feedback notices from checkout redirection
const submissionNotice = ref('');
const cancellationNotice = ref('');

// Payment History Records
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

// Year filter for payment history — BR-015 prevents excessively long lists
const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);
const availableYears = computed(() => {
  const years = new Set<number>();
  paymentHistory.value.forEach(p => {
    const year = new Date(p.datePaidRaw).getFullYear();
    if (!isNaN(year)) years.add(year);
  });
  // Always include current year
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

const filteredPayments = computed(() => {
  return paymentHistory.value.filter(p => {
    const year = new Date(p.datePaidRaw).getFullYear();
    return year === selectedYear.value;
  });
});

const tenantName = computed(() => currentUser.value?.fullName || 'Active Resident');

onMounted(async () => {
  // Check for returning payment status from Adyen/GCash checkout redirect
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success' && refParam) {
    submissionNotice.value = `Online GCash payment (Ref: ${refParam}) has been successfully submitted! It is now pending verification by Landlady Fe Galang Da Silva.`;
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    cancellationNotice.value = 'Online payment session was cancelled. Your outstanding bill remains active.';
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await Promise.all([fetchOutstandingBills(), fetchPaymentHistory()]);
});

async function fetchOutstandingBills() {
  loadingBills.value = true;
  try {
    const data = await api.get<any[]>('/tenant/my-bills');
    outstandingBills.value = (data ?? []).filter(b => b.status !== 'Paid');
  } catch (err: any) {
    console.error('Failed to load bills:', err.message);
  } finally {
    loadingBills.value = false;
  }
}

async function fetchPaymentHistory() {
  try {
    const data = await api.get<any[]>('/tenant/my-payments');
    paymentHistory.value = (data ?? []).map(p => ({
      id: p.id,
      invoiceRef: p.transaction_reference || 'Manual Ledger',
      datePaid: new Date(p.paid_at || p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      datePaidRaw: p.paid_at || p.created_at,
      billingPeriod: 'Monthly Statement',
      amountPaid: p.amount,
      paymentMethod: (p.payment_method || 'Adyen Online').toUpperCase(),
      status: (p.verification_status || 'Pending Verification').toUpperCase()
    }));
  } catch (err: any) {
    console.error('Failed to load payments:', err.message);
  }
}

/** Initiates checkout redirect by calling the backend Adyen checkout session creator */
async function payBillOnline(billId: string) {
  payingBillId.value = billId;
  try {
    const res = await api.post<{ sessionId: string; redirectUrl: string; isLive?: boolean }>('/tenant/payments/checkout', { billId });
    if (res && res.redirectUrl) {
      window.location.href = res.redirectUrl;
    }
  } catch (err: any) {
    alert(`Checkout failed: ${err.message}`);
    payingBillId.value = null;
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto w-full space-y-6">
    <!-- Breadcrumb Header -->
    <div class="border-b border-[#dfe1e6] pb-4">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">{{ tenantName }}</span>
      </div>
      <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Payment & Billing</h1>
      <p class="text-xs text-[#6b778c] mt-0.5">Submit online payments and review your payment record history</p>
    </div>

    <!-- Success Feedback Banner -->
    <div
      v-if="submissionNotice"
      class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-lg flex items-center justify-between shadow-xs animate-in fade-in"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
        <span class="font-medium">{{ submissionNotice }}</span>
      </div>
      <button @click="submissionNotice = ''" class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded cursor-pointer" title="Dismiss">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Cancelled Feedback Banner -->
    <div
      v-if="cancellationNotice"
      class="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm rounded-lg flex items-center justify-between shadow-xs animate-in fade-in"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="w-5 h-5 text-amber-600 shrink-0" />
        <span class="font-medium">{{ cancellationNotice }}</span>
      </div>
      <button @click="cancellationNotice = ''" class="text-amber-700 hover:text-amber-900 ml-3 p-1 rounded cursor-pointer" title="Dismiss">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Outstanding Bills Section -->
    <div class="bg-white border border-[#dfe1e6] rounded-lg p-6 space-y-5">
      <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-3">
        <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
          <CreditCard class="w-4 h-4 text-[#0c66e4]" />
          Outstanding Bills
        </h2>
        <span class="px-2.5 py-1 text-[10px] font-bold bg-[#0c66e4] text-white rounded">
          ACTIVE BILLING
        </span>
      </div>

      <div v-if="loadingBills" class="text-sm text-[#5e6c84] py-6 text-center">Loading outstanding bills...</div>

      <div v-else-if="outstandingBills.length === 0" class="py-8 text-center">
        <ShieldCheck class="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p class="text-sm font-semibold text-[#172b4d]">All Settled</p>
        <p class="text-xs text-[#5e6c84] mt-1">You have no outstanding bills. All accounts are settled.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="bill in outstandingBills"
          :key="bill.id"
          class="p-5 border border-[#dfe1e6] rounded-lg bg-[#f7f8f9] flex flex-col sm:flex-row justify-between sm:items-center gap-4"
        >
          <div class="space-y-1.5">
            <div class="text-sm font-bold text-[#172b4d]">
              Due: {{ new Date(bill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}
            </div>
            <div class="text-xs text-[#5e6c84] space-x-3">
              <span>Base Rent: <strong class="text-[#172b4d]">₱{{ Number(bill.rent_amount).toLocaleString() }}</strong></span>
              <span>Water Fee: <strong class="text-[#172b4d]">₱{{ Number(bill.water_amount).toLocaleString() }}</strong></span>
            </div>
            <div class="text-sm font-bold text-[#0c66e4]">
              Total: ₱{{ Number(bill.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
            </div>
          </div>
          <button
            @click="payBillOnline(bill.id)"
            :disabled="payingBillId === bill.id"
            class="px-5 py-2.5 bg-[#172b4d] hover:bg-[#0c66e4] disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-colors shadow-sm"
          >
            <Loader2 v-if="payingBillId === bill.id" class="w-3.5 h-3.5 animate-spin" />
            <ExternalLink v-else class="w-3.5 h-3.5" />
            <span>{{ payingBillId === bill.id ? 'Initiating Gateway...' : 'Pay Online (GCash via Adyen)' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Record History -->
    <div class="bg-white border border-[#dfe1e6] rounded-lg p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe1e6] pb-3">
        <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
          <FileText class="w-4 h-4 text-[#0c66e4]" />
          My Payment Record History
        </h2>

        <div class="flex items-center gap-3">
          <span class="text-xs text-[#5e6c84]">
            Showing: <strong>{{ filteredPayments.length }}</strong> of {{ paymentHistory.length }} records
          </span>
          <!-- Year Filter Dropdown -->
          <div class="relative">
            <select
              v-model="selectedYear"
              class="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold text-[#172b4d] bg-[#f4f5f7] border border-[#dfe1e6] rounded-md cursor-pointer focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
            >
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-[#6b778c] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="overflow-x-auto hidden sm:block">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] text-xs uppercase tracking-wider">
              <th class="p-3 font-bold">Invoice / Ref #</th>
              <th class="p-3 font-bold">Date Paid</th>
              <th class="p-3 font-bold">Amount Paid</th>
              <th class="p-3 font-bold">Method</th>
              <th class="p-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr
              v-for="record in filteredPayments"
              :key="record.id"
              class="hover:bg-blue-50/40 transition-colors"
            >
              <td class="p-3 font-mono text-[#172b4d] font-semibold text-xs">
                {{ record.invoiceRef }}
              </td>
              <td class="p-3 text-[#172b4d] text-xs">{{ record.datePaid }}</td>
              <td class="p-3 font-bold text-[#172b4d] text-xs">
                ₱{{ Number(record.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="p-3">
                <span
                  class="px-2 py-0.5 font-bold text-[10px] rounded"
                  :class="record.paymentMethod.includes('ONLINE') || record.paymentMethod.includes('ADYEN')
                    ? 'bg-[#172b4d] text-white'
                    : 'bg-gray-100 text-[#172b4d] border border-[#dfe1e6]'"
                >
                  {{ record.paymentMethod }}
                </span>
              </td>
              <td class="p-3">
                <span
                  class="px-2.5 py-1 font-bold text-[10px] rounded flex items-center gap-1 w-fit"
                  :class="record.status.includes('VERIFIED')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : record.status.includes('REJECT')
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'"
                >
                  <ShieldCheck v-if="record.status.includes('VERIFIED')" class="w-3 h-3" />
                  <XCircle v-else-if="record.status.includes('REJECT')" class="w-3 h-3" />
                  <Clock v-else class="w-3 h-3" />
                  {{ record.status }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
              <td colspan="5" class="p-6 text-center text-xs text-[#5e6c84]">
                No payment records found for {{ selectedYear }}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card Layout -->
      <div class="sm:hidden space-y-3">
        <div
          v-for="record in filteredPayments"
          :key="record.id"
          class="p-4 border border-[#dfe1e6] rounded-lg bg-[#f7f8f9] space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold text-[#172b4d]">{{ record.invoiceRef }}</span>
            <span
              class="px-2 py-0.5 font-bold text-[10px] rounded flex items-center gap-1"
              :class="record.status.includes('VERIFIED')
                ? 'bg-emerald-100 text-emerald-800'
                : record.status.includes('REJECT')
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'"
            >
              <ShieldCheck v-if="record.status.includes('VERIFIED')" class="w-3 h-3" />
              <XCircle v-else-if="record.status.includes('REJECT')" class="w-3 h-3" />
              <Clock v-else class="w-3 h-3" />
              {{ record.status }}
            </span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-[#5e6c84]">{{ record.datePaid }}</span>
            <span class="font-bold text-[#172b4d]">₱{{ Number(record.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="text-xs">
            <span
              class="px-2 py-0.5 font-bold text-[10px] rounded"
              :class="record.paymentMethod.includes('ONLINE') || record.paymentMethod.includes('ADYEN')
                ? 'bg-[#172b4d] text-white'
                : 'bg-gray-100 text-[#172b4d] border border-[#dfe1e6]'"
            >
              {{ record.paymentMethod }}
            </span>
          </div>
        </div>
        <div v-if="filteredPayments.length === 0" class="p-6 text-center text-xs text-[#5e6c84]">
          No payment records found for {{ selectedYear }}.
        </div>
      </div>
    </div>
  </div>
</template>
