<!--
  @file views/TenantOverviewView.vue
  @description Tenant Unit Overview — displays assigned room specifications and monthly payment/due date statement.
  @systemBibleRef Section 4 (Tenant Role), Section 5 (Property Model), Section 5.5 (Water Billing ₱200/head)
  @rationale Provides active residents with transparent unit specs and an at-a-glance billing statement.
  @innovations Spacious card layout with clear visual hierarchy for the monthly statement; mobile-first responsive grid.
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import {
  Home,
  CreditCard,
  CheckCircle2,
  User,
  Droplets,
  Zap,
  Wifi,
  Sparkles,
  X,
  Calendar
} from 'lucide-vue-next';

const submissionNotice = ref('');

// Resident & Assigned Unit Data
const tenantData = ref({
  name: currentUser.value?.fullName || 'Active Resident',
  room: 'Unassigned',
  roomDetails: 'Standard Unit',
  roomType: 'BH Main Rooms',
  floor: 1,
  occupants: 1,
  specs: {
    floorArea: '18 sq.m',
    bathroom: 'Private En-suite',
    aircon: 'Included (Split-type)',
    wifi: 'High-Speed Fiber WiFi',
    electricMeter: 'Individual Sub-meter',
    waterRatePerHead: 200 // BR-014 Standard Water Rate ₱200/head
  },
  baseRent: 0,
  waterFee: 0,
  totalAmountDue: 0,
  dueDate: 'N/A',
  dueBadgeText: 'NO DUE BILL',
  dueDaysRemaining: 'Settled',
  landladyGCash: '0917-123-4567',
  landladyName: 'Fe Galang Da Silva'
});

const loading = ref(false);

onMounted(async () => {
  // Check for returning payment status from Adyen checkout redirect
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success' && refParam) {
    submissionNotice.value = `Online GCash payment (Ref: ${refParam}) has been successfully submitted! It is now pending verification by Landlady Fe Galang Da Silva.`;
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    alert('Online payment was cancelled.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await fetchTenantData();
});

async function fetchTenantData() {
  loading.value = true;
  try {
    // Fetch assigned room info
    const data = await api.get<any[]>('/tenant/my-rooms');
    if (data && data.length > 0) {
      const activeRoom = data.find(r => r.is_active);
      if (activeRoom) {
        tenantData.value.room = `Unit ${activeRoom.rooms.room_number}`;
        tenantData.value.roomDetails = activeRoom.rooms.room_type;
        tenantData.value.roomType = activeRoom.rooms.cluster_code;
        tenantData.value.floor = activeRoom.rooms.floor;
        tenantData.value.occupants = activeRoom.occupant_count;
        tenantData.value.specs.waterRatePerHead = 200; // BR-014
      }
    }

    // Fetch bills for the monthly statement
    const billsData = await api.get<any[]>('/tenant/my-bills');
    const unpaidBill = billsData?.find(b => b.status === 'Pending' || b.status === 'Due' || b.status === 'Overdue');
    if (unpaidBill) {
      tenantData.value.baseRent = unpaidBill.rent_amount;
      tenantData.value.waterFee = unpaidBill.water_amount;
      tenantData.value.totalAmountDue = unpaidBill.total_amount;
      tenantData.value.dueDate = new Date(unpaidBill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      tenantData.value.dueBadgeText = unpaidBill.status.toUpperCase();
      tenantData.value.dueDaysRemaining = 'Awaiting payment';
    } else {
      tenantData.value.baseRent = 0;
      tenantData.value.waterFee = 0;
      tenantData.value.totalAmountDue = 0;
      tenantData.value.dueDate = 'N/A';
      tenantData.value.dueBadgeText = 'NO DUE BILL';
      tenantData.value.dueDaysRemaining = 'Settled';
    }
  } catch (err: any) {
    console.error('Failed to load tenant data:', err.message);
  } finally {
    loading.value = false;
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
        <span class="font-medium text-[#172b4d]">{{ tenantData.name }}</span>
        <span>/</span>
        <span class="font-semibold text-[#0c66e4]">{{ tenantData.room }}</span>
      </div>
      <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Unit Overview</h1>
      <p class="text-xs text-[#6b778c] mt-0.5">{{ tenantData.room }} specifications, amenities & current billing statement</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-12 text-center bg-white border border-[#dfe1e6] text-[#5e6c84] rounded-lg text-sm">
      Loading unit overview...
    </div>

    <div v-else class="space-y-6">
      <!-- Submission Toast Notice -->
      <div
        v-if="submissionNotice"
        class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg flex items-center justify-between shadow-sm"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <span class="font-medium">{{ submissionNotice }}</span>
        </div>
        <button @click="submissionNotice = ''" class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded cursor-pointer" title="Dismiss">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Assigned Unit Specifications Card -->
      <div class="bg-white border border-[#dfe1e6] rounded-lg p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-3">
          <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Home class="w-4 h-4 text-[#0c66e4]" />
            Assigned Unit Specifications
          </h2>
          <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">Active Occupant</span>
        </div>

        <!-- Unit Info Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block text-xs font-medium mb-1">Unit</span>
            <strong class="text-[#0c66e4] font-bold text-sm">{{ tenantData.room }}</strong>
            <span class="text-xs text-[#5e6c84] block mt-0.5">{{ tenantData.roomDetails }}</span>
          </div>
          <div class="p-4 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block text-xs font-medium mb-1">Classification</span>
            <span class="font-semibold text-sm text-[#172b4d]">{{ tenantData.roomType }}</span>
            <span class="text-xs text-[#5e6c84] block mt-0.5">Floor {{ tenantData.floor }}</span>
          </div>
          <div class="p-4 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block text-xs font-medium mb-1">Registered Occupants</span>
            <span class="font-semibold text-sm text-[#172b4d] flex items-center gap-1.5">
              <User class="w-4 h-4 text-[#0c66e4]" />
              {{ tenantData.occupants }} {{ tenantData.occupants === 1 ? 'Person' : 'Persons' }}
            </span>
          </div>
          <div class="p-4 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block text-xs font-medium mb-1">Floor Area & Bath</span>
            <span class="font-semibold text-sm text-[#172b4d]">{{ tenantData.specs.floorArea }}</span>
            <span class="text-xs text-[#5e6c84] block mt-0.5">{{ tenantData.specs.bathroom }}</span>
          </div>
        </div>

        <!-- Amenities Row -->
        <div class="flex flex-wrap items-center gap-5 text-xs text-[#5e6c84] pt-3 border-t border-dashed border-[#dfe1e6]">
          <span class="flex items-center gap-1.5">
            <Zap class="w-4 h-4 text-amber-500" />
            <span>Electric:</span>
            <strong class="text-[#172b4d]">{{ tenantData.specs.electricMeter }}</strong>
          </span>
          <span class="flex items-center gap-1.5">
            <Droplets class="w-4 h-4 text-blue-500" />
            <span>Water:</span>
            <strong class="text-[#172b4d]">₱{{ tenantData.specs.waterRatePerHead }}/head</strong>
          </span>
          <span class="flex items-center gap-1.5">
            <Wifi class="w-4 h-4 text-indigo-500" />
            <span>WiFi:</span>
            <strong class="text-[#172b4d]">{{ tenantData.specs.wifi }}</strong>
          </span>
          <span class="flex items-center gap-1.5">
            <Sparkles class="w-4 h-4 text-emerald-500" />
            <span>Climate:</span>
            <strong class="text-[#172b4d]">{{ tenantData.specs.aircon }}</strong>
          </span>
        </div>
      </div>

      <!-- Monthly Payment & Due Date Statement -->
      <div class="bg-white border-2 border-[#172b4d] rounded-lg overflow-hidden">
        <!-- Header -->
        <div class="bg-[#172b4d] px-6 py-4 flex items-center justify-between">
          <h2 class="font-bold text-sm text-white flex items-center gap-2">
            <CreditCard class="w-4 h-4 text-white/80" />
            Monthly Payment Statement
          </h2>
          <span class="px-3 py-1 text-xs font-bold rounded bg-white/20 text-white">
            {{ tenantData.dueBadgeText }}
          </span>
        </div>

        <!-- Statement Body -->
        <div class="p-6 space-y-5">
          <!-- Resident & Unit Info -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Resident Name</span>
              <strong class="text-[#172b4d]">{{ tenantData.name }}</strong>
            </div>
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Assigned Unit</span>
              <strong class="text-[#172b4d]">{{ tenantData.room }} ({{ tenantData.roomDetails }})</strong>
            </div>
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Payment Due Date</span>
              <strong class="text-[#172b4d] flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-[#0c66e4]" />
                {{ tenantData.dueDate }}
              </strong>
            </div>
          </div>

          <div class="border-t border-[#dfe1e6]"></div>

          <!-- Line Items -->
          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-[#5e6c84]">Monthly Base Rent</span>
              <span class="font-semibold text-[#172b4d]">₱{{ tenantData.baseRent.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-[#5e6c84]">
                Water Fee (₱{{ tenantData.specs.waterRatePerHead }}/head × {{ tenantData.occupants }})
              </span>
              <span class="font-semibold text-[#172b4d]">₱{{ tenantData.waterFee.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <!-- Total -->
          <div class="flex justify-between items-center border-t-2 border-[#172b4d] pt-4">
            <span class="font-bold text-[#172b4d] text-base">Total Amount Due</span>
            <span class="text-2xl font-bold text-[#0c66e4]">
              ₱{{ tenantData.totalAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
            </span>
          </div>

          <!-- Status Note -->
          <p class="text-xs text-[#6b778c] pt-1">
            Status: <strong>{{ tenantData.dueDaysRemaining }}</strong> — Pay via GCash to Landlady {{ tenantData.landladyName }} ({{ tenantData.landladyGCash }})
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
