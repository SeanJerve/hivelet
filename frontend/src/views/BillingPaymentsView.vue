<!--
  @file views/BillingPaymentsView.vue
  @description Simplified Monthly Payment recorder featuring automatic billing cycle calculation, date coverage fields, and Jira-inspired styling.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
  @rationale Implements a clean, high-fidelity entry screen with larger touch targets and visual styling for operational ease.
  @innovations Automatic calculation of months covered based on entered payment value, date-range coverage bindings, and clean form layout.
-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { rooms, addIncomeRecord } from '@/lib/systemState';
import { CreditCard, ArrowRight, Save } from 'lucide-vue-next';

const selectedUnitNum = ref('1a');
const datePaid = ref(new Date().toISOString().split('T')[0]);
const tenantName = ref('');
const invoiceNum = ref('');
const rentAmount = ref(4500);
const occupantsCount = ref(1);
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const referenceNum = ref('');

// Payment coverage dates
const monthsCovered = ref(1);
const dateCoveredStart = ref(new Date().toISOString().split('T')[0]);
const dateCoveredEnd = ref('');

// Synchronize dates initially and update end date
function updateEndDate() {
  if (!dateCoveredStart.value) return;
  const start = new Date(dateCoveredStart.value);
  start.setMonth(start.getMonth() + monthsCovered.value);
  dateCoveredEnd.value = start.toISOString().split('T')[0];
}

// Watch for datePaid changes to default the start date
watch(datePaid, (newDate) => {
  dateCoveredStart.value = newDate;
  updateEndDate();
}, { immediate: true });

// Watch monthsCovered or dateCoveredStart to update end date
watch([monthsCovered, dateCoveredStart], () => {
  updateEndDate();
});

// Auto-fill tenant details and calculate months covered based on rent entered
function onUnitChange(unitCode: string) {
  const room = rooms.find(r => r.unitCode === unitCode);
  if (room) {
    rentAmount.value = room.price;
    tenantName.value = room.tenant || '';
    occupantsCount.value = room.occupants || 1;
    // Reset date coverage to today
    dateCoveredStart.value = datePaid.value;
    monthsCovered.value = 1;
    updateEndDate();
  }
}

// Watch rentAmount to suggest months covered if double/triple/etc. the unit price
watch(rentAmount, (newAmount) => {
  const room = rooms.find(r => r.unitCode === selectedUnitNum.value);
  if (room && room.price > 0) {
    const suggested = Math.round(newAmount / room.price);
    if (suggested >= 1) {
      monthsCovered.value = suggested;
    }
  }
});

function handleDateChange() {
  if (!dateCoveredStart.value || !dateCoveredEnd.value) return;
  const start = new Date(dateCoveredStart.value);
  const end = new Date(dateCoveredEnd.value);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const suggested = Math.round(diffDays / 30.4);
  if (suggested >= 1) {
    monthsCovered.value = suggested;
  }
}

function handleSubmit() {
  const room = rooms.find(r => r.unitCode === selectedUnitNum.value);
  const basePrice = room ? room.price : 4500;
  const calcShare = rentAmount.value / 2;
  const calcWater = occupantsCount.value * 200;
  const calcRemitted = rentAmount.value + calcWater;

  addIncomeRecord({
    unit: selectedUnitNum.value,
    date: datePaid.value,
    invoiceNum: invoiceNum.value,
    contact: tenantName.value,
    period: 'Current Period',
    rent: rentAmount.value,
    share: calcShare,
    occupants: occupantsCount.value,
    water: calcWater,
    remitted: calcRemitted,
    paymentMethod: paymentMethod.value,
    referenceNum: paymentMethod.value === 'Online' ? referenceNum.value || 'GCASH-9948271' : 'N/A',
    monthsCovered: monthsCovered.value,
    dateCoveredStart: dateCoveredStart.value,
    dateCoveredEnd: dateCoveredEnd.value
  });

  // Clear fields after recording (except date)
  invoiceNum.value = '';
  referenceNum.value = '';
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="pb-3 border-b border-[#dfe1e6]">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Billing & Collections</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">Record Payment</span>
      </div>
      <h1 class="text-xl font-bold text-[#172b4d]">Record Unit Payment</h1>
      <p class="text-xs text-[#5e6c84]">Log monthly tenant room rents, water billings, and payment coverages</p>
    </div>

    <!-- Record Monthly Payment Form -->
    <div class="jira-card p-6 bg-white border border-[#dfe1e6] shadow-sm rounded-lg space-y-6">
      <div class="flex items-center gap-2 border-b border-[#f4f5f7] pb-3">
        <div class="w-8 h-8 rounded bg-[#e9f2ff] text-[#0c66e4] flex items-center justify-center">
          <CreditCard class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-[#172b4d]">Payment Information Entry</h2>
          <p class="text-[10px] text-[#6b778c]">Input the remittance details below to save to ledger</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5 text-xs text-[#172b4d]">
        <!-- Row 1: Select Unit, Date Paid, Tenant Name, Invoice Ref -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Select Rentable Unit</label>
            <select v-model="selectedUnitNum" @change="onUnitChange(($event.target as HTMLSelectElement).value)" class="jira-input text-sm py-2">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
                Unit {{ r.unitCode }} ({{ r.cluster }}) - {{ r.tenant ? 'Tenant: ' + r.tenant : 'Vacant' }}
              </option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Date Logged / Paid</label>
            <input v-model="datePaid" type="date" class="jira-input text-sm py-2" required />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Tenant Name Reference</label>
            <input v-model="tenantName" type="text" placeholder="e.g. Active Resident" class="jira-input text-sm py-2" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Invoice Receipt / Official Reference #</label>
            <input v-model="invoiceNum" type="text" placeholder="e.g. OR-994112" class="jira-input text-sm py-2" required />
          </div>
        </div>

        <hr class="border-t border-[#dfe1e6]/50 my-2" />

        <!-- Row 2: Rent Amount, Occupants Count, Payment Method, GCash Ref -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Base Rent Paid (₱)</label>
            <input v-model.number="rentAmount" type="number" placeholder="4500" class="jira-input text-sm py-2 font-bold" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Active Occupants Count</label>
            <input v-model.number="occupantsCount" type="number" placeholder="1" class="jira-input text-sm py-2" min="1" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Payment Mode</label>
            <select v-model="paymentMethod" class="jira-input text-sm py-2">
              <option value="Cash">Cash Remittance</option>
              <option value="Online">Online Payment (GCash)</option>
            </select>
          </div>
        </div>

        <div v-if="paymentMethod === 'Online'" class="grid grid-cols-1 gap-4">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">GCash Transaction Reference ID</label>
            <input v-model="referenceNum" type="text" placeholder="e.g. GCASH-99182741" class="jira-input text-sm py-2 font-mono" required />
          </div>
        </div>

        <hr class="border-t border-[#dfe1e6]/50 my-2" />

        <!-- Row 3: Months Covered & Date Covered start-end (Side-by-Side range) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Months Covered Selection</label>
            <select v-model.number="monthsCovered" class="jira-input text-sm py-2 font-bold text-slate-700">
              <option :value="1">1 Month Coverage</option>
              <option :value="2">2 Months Coverage</option>
              <option :value="3">3 Months Coverage</option>
              <option :value="6">6 Months Coverage</option>
              <option :value="12">12 Months (1 Year)</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Date Covered Duration</label>
            <div class="flex items-center gap-2">
              <input v-model="dateCoveredStart" type="date" class="jira-input text-sm py-2" required />
              <span class="text-[#6b778c]"><ArrowRight class="w-4 h-4 shrink-0" /></span>
              <input v-model="dateCoveredEnd" type="date" @change="handleDateChange" class="jira-input text-sm py-2" required />
            </div>
          </div>
        </div>

        <!-- Submit Button Row -->
        <div class="pt-4 flex justify-end">
          <button type="submit" class="jira-btn-primary text-sm py-2.5 px-6 flex items-center gap-2 shadow-sm font-semibold">
            <Save class="w-4 h-4" />
            <span>Record Unit Payment</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
