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
import { useToast } from '@/lib/useToast';
import {
  CreditCard,
  FileText,
  ShieldCheck,
  Clock,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Search,
  RefreshCw,
  AlertTriangle
} from 'lucide-vue-next';
import AdyenPaymentModal from '@/components/modals/AdyenPaymentModal.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

const { showToast } = useToast();

// Selected bill for Adyen Web Component Checkout Modal
const selectedBillForAdyen = ref<any | null>(null);

// Outstanding bills from DB
const outstandingBills = ref<any[]>([]);
const loadingBills = ref(false);
const searchQuery = ref('');

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
const sortOrder = ref<'latest' | 'oldest'>('latest');

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
  const q = searchQuery.value.trim().toLowerCase();
  const filtered = paymentHistory.value.filter(p => {
    const year = new Date(p.datePaidRaw).getFullYear();
    const matchesYear = year === selectedYear.value;
    if (!matchesYear) return false;
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

const tenantName = computed(() => currentUser.value?.fullName || 'Active Resident');

const isInitiatingPayment = ref(false);

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success') {
    showToast('success', 'Payment Submitted', refParam ? `GCash payment ${refParam} submitted and is pending verification.` : 'Payment submitted successfully.');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    showToast('warning', 'Payment Cancelled', 'Online payment checkout was cancelled.');
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
    console.error('Failed to load bills:', err?.message || err);
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
      amountPaid: Number(p.amount) || 0,
      paymentMethod: (p.payment_method || 'GCASH').toUpperCase(),
      status: (p.verification_status || 'VERIFIED').toUpperCase()
    }));
  } catch (err: any) {
    console.error('Failed to load payments:', err?.message || err);
  }
}

function openAdyenModal(bill: any) {
  selectedBillForAdyen.value = bill;
}

function handleAdyenSuccess(refId: string) {
  selectedBillForAdyen.value = null;
  fetchOutstandingBills();
  fetchPaymentHistory();
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#71717a] mb-1">
          <span>Tenant</span>
          <span>/</span>
          <span class="font-bold text-[#1c1917]">Payment &amp; Billing</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">Payment &amp; Billing</h1>
        <p class="text-xs sm:text-sm text-[#71717a] mt-0.5">Submit online GCash payments and inspect verified rental receipt records.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchOutstandingBills(); fetchPaymentHistory();"
          :disabled="loadingBills"
          class="btn-secondary"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', loadingBills ? 'animate-spin text-[#0c66e4]' : '']" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Outstanding Bills Status Section -->
    <div v-if="loadingBills" class="py-2">
      <SkeletonCard variant="room" :count="1" />
    </div>

    <div v-else-if="outstandingBills.length === 0" class="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
      <div class="flex items-center gap-3">
        <ShieldCheck class="size-5 text-emerald-600 shrink-0" />
        <div>
          <p class="text-xs font-bold text-emerald-950">All Rent Accounts Settled</p>
          <p class="text-[11px] text-emerald-800">You have no outstanding bills. Your next monthly statement will be issued on the 5th.</p>
        </div>
      </div>
      <span class="badge-soft badge-success text-xs font-bold shrink-0">
        Paid Up to Date
      </span>
    </div>

    <!-- Active Outstanding Bill Action Card -->
    <div v-else class="space-y-3">
      <div
        v-for="bill in outstandingBills"
        :key="bill.id"
        class="surface-card p-6 border-amber-300 bg-amber-50/20 flex flex-col sm:flex-row justify-between sm:items-center gap-5 shadow-xs"
      >
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="badge-soft badge-warning font-bold text-xs">
              OUTSTANDING INVOICE
            </span>
            <span class="text-xs text-[#71717a]">
              Due: <strong class="text-[#1c1917]">{{ new Date(bill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}</strong>
            </span>
          </div>
          <p class="text-2xl font-black tabular font-display text-[#1c1917]">
            ₱{{ bill.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </p>
          <p class="text-xs text-[#71717a] space-x-3">
            <span>Base Rent: <strong class="text-[#1c1917] tabular">₱{{ bill.rent_amount.toLocaleString() }}</strong></span>
            <span>·</span>
            <span>Water Fee: <strong class="text-[#1c1917] tabular">₱{{ bill.water_amount.toLocaleString() }}</strong></span>
          </p>
        </div>

        <button
          @click="openAdyenModal(bill)"
          class="btn-primary"
        >
          <CreditCard class="size-4 text-white" />
          <span>Pay Online (GCash via Adyen)</span>
        </button>
      </div>
    </div>

    <!-- Payment Record History (Matching Admin Table Register Style) -->
    <div class="surface-card overflow-hidden">
      <!-- Filter Bar (Identical to Admin Income & Expenses) -->
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search invoice ref #, payment method, or status…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
          />
        </div>

        <select
          v-model="selectedYear"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#0c66e4] focus:outline-none sm:w-44 cursor-pointer"
        >
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }} Records</option>
        </select>

        <select
          v-model="sortOrder"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#0c66e4] focus:outline-none sm:w-44 cursor-pointer"
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <!-- Single-Tier Atlassian Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-[#f5f5f4] border-b border-[#e7e5e4] text-[#71717a] uppercase tracking-wide font-bold text-[11px]">
              <th class="px-4 py-3">Invoice / Ref #</th>
              <th class="px-4 py-3">Date Paid</th>
              <th class="px-4 py-3">Amount Paid</th>
              <th class="px-4 py-3">Payment Method</th>
              <th class="px-4 py-3">Verification Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7e5e4]">
            <tr
              v-for="record in filteredPayments"
              :key="record.id"
              class="hover:bg-[#fafaf9] transition-colors"
            >
              <td class="px-4 py-3.5 font-mono text-[#1c1917] font-bold">
                {{ record.invoiceRef }}
              </td>
              <td class="px-4 py-3.5 text-[#71717a]">{{ record.datePaid }}</td>
              <td class="px-4 py-3.5 font-black tabular font-display text-[#1c1917] text-sm">
                ₱{{ record.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="px-4 py-3.5">
                <span class="badge-soft badge-blue font-bold text-xs">
                  {{ record.paymentMethod }}
                </span>
              </td>
              <td class="px-4 py-3.5">
                <span
                  class="badge-soft text-xs font-bold"
                  :class="record.status === 'VERIFIED & SETTLED' || record.status === 'VERIFIED'
                    ? 'badge-success'
                    : 'badge-warning'"
                >
                  {{ record.status }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
              <td colspan="5" class="p-8 text-center text-xs text-[#71717a]">
                No payment records found for year {{ selectedYear }}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Official Adyen Web Checkout Modal -->
    <AdyenPaymentModal
      v-if="selectedBillForAdyen"
      :bill="selectedBillForAdyen"
      @close="selectedBillForAdyen = null"
      @success="handleAdyenSuccess"
    />
  </div>
</template>
