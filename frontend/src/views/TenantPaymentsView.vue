<!--
  @file views/TenantPaymentsView.vue
  @description Tenant payments and billing. Outstanding bills with the online pay button, and the
    payment record filtered by year.
  @systemBibleRef Section 4 (Tenant Role), Section 12 (Billing), BR-016/BR-017 (GCash via Adyen)
  @designRef docs/DESIGN_GUIDELINE.md
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/lib/api';
import { peso } from '@/lib/canonicalUnits';
import { useToast } from '@/lib/useToast';
import { CreditCard, Search } from 'lucide-vue-next';
import AdyenPaymentModal from '@/components/modals/AdyenPaymentModal.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';

const { showToast } = useToast();

// Selected bill for the Adyen web component checkout modal
const selectedBillForAdyen = ref<any | null>(null);

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
const loadingBills = ref(false);
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
const currentYear = new Date().getFullYear();
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

const availableYears = computed(() => {
  const years = new Set<number>();
  paymentHistory.value.forEach((p) => {
    const year = new Date(p.datePaidRaw).getFullYear();
    if (!isNaN(year)) years.add(year);
  });
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

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

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success') {
    showToast(
      'success',
      'Payment submitted',
      refParam ? `GCash payment ${refParam} is waiting for verification.` : 'Your payment was submitted.'
    );
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    showToast('warning', 'Payment cancelled', 'The online payment was cancelled before it was completed.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await Promise.all([fetchOutstandingBills(), fetchPaymentHistory()]);
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

async function fetchOutstandingBills() {
  loadingBills.value = true;
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
  historyLoadFailed.value = false;
  try {
    const data = await api.get<any[]>('/tenant/my-payments');
    paymentHistory.value = (data ?? []).map((p) => ({
      id: p.id,
      // A cash payment recorded by hand genuinely has no gateway reference, so
      // this label describes the absence rather than inventing a number.
      invoiceRef: p.transaction_reference || 'No reference, recorded by hand',
      datePaid: new Date(p.paid_at || p.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
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
  }
}

function openAdyenModal(bill: any) {
  selectedBillForAdyen.value = bill;
}

function handleAdyenSuccess(_refId: string) {
  selectedBillForAdyen.value = null;
  fetchOutstandingBills();
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
        <p class="text-sm text-ink-faint">Tenant portal</p>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Payments and billing
        </h1>
        <p class="mt-1 text-sm text-ink-soft">Pay a bill with GCash, and see what has been recorded against your unit.</p>
      </div>
    </header>

    <!-- Bills -->
    <div v-if="loadingBills" class="rounded-tile bg-tile p-6 flex flex-col gap-4" aria-busy="true">
      <span class="sr-only" role="status">Loading your bills</span>
      <Skeleton class-name="h-4 w-32 rounded-full" />
      <Skeleton class-name="h-10 w-48 rounded-2xl" />
    </div>

    <!-- A failed read is NOT "nothing is owed". This branch comes first so the
         all-clear below can only be reached by a list that actually loaded. -->
    <OverviewTile v-else-if="billsLoadFailed" title="Bills">
      <UnavailableNote
        message="Your bills could not be loaded. This is not the same as having none. Try again, and tell the landlady if it keeps failing."
        @retry="refreshAll"
      />
    </OverviewTile>

    <OverviewTile v-else-if="outstandingBills.length === 0" tone="soft" title="Bills">
      <p class="text-2xl font-semibold tracking-tight">Nothing is due</p>
      <!-- This used to promise "your next monthly statement will be issued on the
           5th". There is no scheduled bill generator and there is deliberately not
           one: collection happens in person, so a nightly run would raise bills
           against residents the owner has already been paid by (judgement log
           section 3.6). The sentence promised a thing the system does not do. -->
      <p class="text-sm leading-6 text-ink-soft">
        You have no outstanding bills. The landlady issues bills as they fall due, not on a fixed date.
      </p>
    </OverviewTile>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <OverviewTile
        v-for="bill in outstandingBills"
        :key="bill.id"
        tone="brand"
        :title="billBalance(bill) < Number(bill.total_amount) ? 'Partly paid bill' : 'Bill to pay'"
      >
        <div>
          <!-- The balance, not the debt as issued. BR-013. -->
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(billBalance(bill), 2) }}</p>
          <p class="mt-2 text-sm text-on-brand-soft">
            Due {{ new Date(bill.due_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) }}
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
        </dl>

        <button type="button" class="pill-btn-light mt-auto self-start" @click="openAdyenModal(bill)">
          <CreditCard class="size-4" aria-hidden="true" />
          Pay with GCash
        </button>
      </OverviewTile>
    </div>

    <!-- Payment record -->
    <OverviewTile title="Payment record">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="ws-field flex-1">
          Search by reference, method or status
          <span class="relative">
            <Search class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input v-model="searchQuery" type="search" class="ws-input pl-10" />
          </span>
        </label>
        <label class="ws-field sm:w-40">
          Year
          <select v-model="selectedYear" class="ws-select">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
        <label class="ws-field sm:w-40">
          Order
          <select v-model="sortOrder" class="ws-select">
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
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
        empty-title="Nothing recorded"
        :empty-note="`No payments are on record for ${selectedYear}.`"
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

        <template #row="{ row: record }">
          <tr>
            <th scope="row" class="font-medium">{{ record.invoiceRef }}</th>
            <td class="whitespace-nowrap text-ink-soft">{{ record.datePaid }}</td>
            <td class="num font-semibold">{{ peso(record.amountPaid, 2) }}</td>
            <td class="text-ink-soft">{{ record.paymentMethod }}</td>
            <td>
              <StatusPill :tone="isVerified(record.status) ? 'paid' : 'verify'">
                {{ isVerified(record.status) ? 'Verified' : 'Waiting for verification' }}
              </StatusPill>
            </td>
          </tr>
        </template>

        <template #card="{ row: record }">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="tabular text-lg font-semibold leading-none text-ink">
                {{ peso(record.amountPaid, 2) }}
              </p>
              <p class="mt-1.5 text-sm text-ink-soft">{{ record.datePaid }}</p>
            </div>
            <StatusPill :tone="isVerified(record.status) ? 'paid' : 'verify'">
              {{ isVerified(record.status) ? 'Verified' : 'Waiting' }}
            </StatusPill>
          </div>

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
      v-if="selectedBillForAdyen"
      :bill="selectedBillForAdyen"
      @close="selectedBillForAdyen = null"
      @success="handleAdyenSuccess"
    />
  </div>
</template>
