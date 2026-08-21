<!--
  @file views/TenantOverviewView.vue
  @description Tenant Unit Overview — displays assigned room specifications, high-res unit image, and monthly payment statement.
  @systemBibleRef Section 4 (Tenant Role), Section 5 (Property Model), Section 5.5 (Water Billing ₱200/head)
  @rationale Provides active residents with transparent unit photo preview, specs, and an at-a-glance billing statement.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
  Calendar,
  Camera,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-vue-next';

const submissionNotice = ref('');

// Resident & Assigned Unit Data
const tenantData = ref({
  name: currentUser.value?.fullName || 'Active Resident',
  room: 'Unit 1A',
  roomDetails: 'BH Main Rooms (Ground Floor)',
  roomType: 'Main Cluster',
  floor: 1,
  occupants: 1,
  photoUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  specs: {
    floorArea: '18 sq.m',
    bathroom: 'Private En-suite',
    aircon: 'Included (Split-type)',
    wifi: 'High-Speed Fiber WiFi',
    electricMeter: 'Individual Sub-meter',
    waterRatePerHead: 200 // BR-014 Standard Water Rate ₱200/head
  },
  baseRent: 4500,
  waterFee: 200,
  gbgFee: 0,
  depositAmount: 9000,
  moveInDate: 'Jan 05, 2023',
  totalAmountDue: 4700,
  dueDate: 'Aug 05, 2026',
  dueBadgeText: 'DUE AUG 05',
  dueDaysRemaining: 'Current Period',
  dueDateRaw: '2026-08-05', // ISO date for countdown calculation
  landladyGCash: '0917-123-4567',
  landladyName: 'Fe Galang Da Silva'
});

const loading = ref(false);

/**
 * Computed due-date countdown.
 * Returns { daysLeft: number, label: string, severity: 'safe'|'warning'|'danger'|'overdue' }
 * Severity drives the color of the badge on the payment card.
 * @businessRule Rent due date is the 5th of every month per boarding house policy.
 */
const dueDateCountdown = computed(() => {
  const raw = tenantData.value.dueDateRaw;
  if (!raw) return { daysLeft: 0, label: tenantData.value.dueDaysRemaining, severity: 'safe' as const };
  const due = new Date(raw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return { daysLeft: diff, label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`, severity: 'overdue' as const };
  }
  if (diff === 0) {
    return { daysLeft: 0, label: 'Due Today!', severity: 'danger' as const };
  }
  if (diff <= 3) {
    return { daysLeft: diff, label: `Due in ${diff} day${diff === 1 ? '' : 's'}`, severity: 'warning' as const };
  }
  return { daysLeft: diff, label: `Due in ${diff} days`, severity: 'safe' as const };
});

onMounted(async () => {
  // Check for returning payment status from checkout redirect
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
      const activeRoom = data.find(r => r.is_active) || data[0];
      if (activeRoom) {
        tenantData.value.room = `Unit ${activeRoom.rooms?.room_number || activeRoom.room_number || '1A'}`;
        tenantData.value.roomDetails = activeRoom.rooms?.room_type || 'Standard Room';
        tenantData.value.roomType = activeRoom.rooms?.cluster_code || 'Main Cluster';
        tenantData.value.floor = activeRoom.rooms?.floor || 1;
        tenantData.value.occupants = activeRoom.occupant_count || 1;
        if (activeRoom.rooms?.photo_url) {
          tenantData.value.photoUrl = activeRoom.rooms.photo_url;
        }
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
    }
  } catch (err: any) {
    console.error('Failed to load tenant data:', err?.message || err);
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
      <p class="text-xs text-[#6b778c] mt-0.5">{{ tenantData.room }} unit photo, specifications &amp; billing statement</p>
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

      <!-- Hero Unit Card: Photo + Specifications Grid -->
      <div class="bg-white border border-[#dfe1e6] rounded-lg overflow-hidden shadow-xs">
        <div class="grid grid-cols-1 lg:grid-cols-12">
          
          <!-- Left Column: Unit Photo Feature Banner -->
          <div class="lg:col-span-5 relative bg-slate-900 min-h-[240px] lg:min-h-[340px] overflow-hidden group">
            <img
              :src="tenantData.photoUrl"
              :alt="tenantData.room"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>
            
            <div class="absolute top-3 left-3 flex items-center gap-2">
              <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                <CheckCircle2 class="w-3.5 h-3.5" /> Active Occupant
              </span>
            </div>

            <div class="absolute bottom-4 left-4 right-4 text-white">
              <div class="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-0.5">
                <Camera class="w-3.5 h-3.5" /> Assigned Unit Photo
              </div>
              <h3 class="text-xl font-display font-black text-white">{{ tenantData.room }}</h3>
              <p class="text-xs text-slate-200">{{ tenantData.roomDetails }}</p>
            </div>
          </div>

          <!-- Right Column: Specifications & Inclusions -->
          <div class="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-3 mb-4">
                <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
                  <Home class="w-4 h-4 text-[#0c66e4]" />
                  Assigned Unit Inclusions &amp; Specs
                </h2>
                <span class="text-xs font-semibold text-[#6b778c]">Floor {{ tenantData.floor }}</span>
              </div>

              <!-- Unit Info Cards Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Unit Name</span>
                  <strong class="text-[#0c66e4] font-bold text-xs">{{ tenantData.room }}</strong>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Cluster</span>
                  <span class="font-semibold text-xs text-[#172b4d] truncate block">{{ tenantData.roomType }}</span>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Registered Occupants</span>
                  <span class="font-semibold text-xs text-[#172b4d] flex items-center gap-1">
                    <User class="w-3.5 h-3.5 text-[#0c66e4]" />
                    {{ tenantData.occupants }} {{ tenantData.occupants === 1 ? 'Person' : 'Persons' }}
                  </span>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Floor Area</span>
                  <span class="font-semibold text-xs text-[#172b4d]">{{ tenantData.specs.floorArea }}</span>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Bathroom</span>
                  <span class="font-semibold text-xs text-[#172b4d] truncate block">{{ tenantData.specs.bathroom }}</span>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]/70">
                  <span class="text-[#6b778c] block text-[11px] font-medium">Water Billing</span>
                  <span class="font-semibold text-xs text-[#172b4d]">₱{{ tenantData.specs.waterRatePerHead }}/head</span>
                </div>
              </div>
            </div>

            <!-- Amenities Badges Row -->
            <div class="flex flex-wrap items-center gap-4 text-xs text-[#5e6c84] pt-3 border-t border-dashed border-[#dfe1e6]">
              <span class="flex items-center gap-1.5">
                <Zap class="w-3.5 h-3.5 text-amber-500" />
                <span>Electric: <strong class="text-[#172b4d]">{{ tenantData.specs.electricMeter }}</strong></span>
              </span>
              <span class="flex items-center gap-1.5">
                <Droplets class="w-3.5 h-3.5 text-blue-500" />
                <span>Water: <strong class="text-[#172b4d]">₱{{ tenantData.specs.waterRatePerHead }}/head</strong></span>
              </span>
              <span class="flex items-center gap-1.5">
                <Wifi class="w-3.5 h-3.5 text-indigo-500" />
                <span>WiFi: <strong class="text-[#172b4d]">{{ tenantData.specs.wifi }}</strong></span>
              </span>
              <span class="flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-emerald-500" />
                <span>Climate: <strong class="text-[#172b4d]">{{ tenantData.specs.aircon }}</strong></span>
              </span>
            </div>
          </div>

        </div>
      </div>

      <!-- Monthly Payment & Due Date Statement -->
      <div class="bg-white border-2 rounded-lg overflow-hidden shadow-xs"
        :class="{
          'border-[#172b4d]': dueDateCountdown.severity === 'safe',
          'border-amber-400': dueDateCountdown.severity === 'warning',
          'border-red-500': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
        }"
      >
        <!-- Header -->
        <div class="px-6 py-4 flex items-center justify-between"
          :class="{
            'bg-[#172b4d]': dueDateCountdown.severity === 'safe',
            'bg-amber-500': dueDateCountdown.severity === 'warning',
            'bg-red-600': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
          }"
        >
          <h2 class="font-bold text-sm text-white flex items-center gap-2">
            <CreditCard class="w-4 h-4 text-white/80" />
            Monthly Payment Statement
          </h2>
          <span class="px-3 py-1 text-xs font-bold rounded bg-white/20 text-white">
            {{ tenantData.dueBadgeText }}
          </span>
        </div>

        <!-- ✨ Dynamic Due-Date Countdown Banner -->
        <div
          class="px-6 py-3 flex items-center gap-3 border-b"
          :class="{
            'bg-emerald-50 border-emerald-200': dueDateCountdown.severity === 'safe',
            'bg-amber-50 border-amber-200': dueDateCountdown.severity === 'warning',
            'bg-red-50 border-red-200': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
          }"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            :class="{
              'bg-emerald-100': dueDateCountdown.severity === 'safe',
              'bg-amber-100': dueDateCountdown.severity === 'warning',
              'bg-red-100': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
            }"
          >
            <CheckCircle v-if="dueDateCountdown.severity === 'safe'" class="w-5 h-5 text-emerald-600" />
            <Clock v-else-if="dueDateCountdown.severity === 'warning'" class="w-5 h-5 text-amber-600" />
            <AlertTriangle v-else class="w-5 h-5 text-red-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold"
              :class="{
                'text-emerald-800': dueDateCountdown.severity === 'safe',
                'text-amber-900': dueDateCountdown.severity === 'warning',
                'text-red-900': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
              }"
            >
              {{ dueDateCountdown.label }}
            </p>
            <p class="text-[11px]"
              :class="{
                'text-emerald-700': dueDateCountdown.severity === 'safe',
                'text-amber-700': dueDateCountdown.severity === 'warning',
                'text-red-700': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
              }"
            >
              Monthly rent due on <strong>{{ tenantData.dueDate }}</strong> via GCash or on-site cash payment.
            </p>
          </div>
          <span
            class="text-lg font-black shrink-0"
            :class="{
              'text-emerald-600': dueDateCountdown.severity === 'safe',
              'text-amber-600': dueDateCountdown.severity === 'warning',
              'text-red-600': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue',
            }"
          >
            <template v-if="dueDateCountdown.severity === 'overdue'">-{{ Math.abs(dueDateCountdown.daysLeft) }}d</template>
            <template v-else-if="dueDateCountdown.severity === 'danger'">TODAY</template>
            <template v-else>{{ dueDateCountdown.daysLeft }}d</template>
          </span>
        </div>

        <!-- Statement Body -->
        <div class="p-6 space-y-5">
          <!-- Resident & Unit Info -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Resident Name</span>
              <strong class="text-[#172b4d]">{{ tenantData.name }}</strong>
            </div>
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Assigned Unit</span>
              <strong class="text-[#172b4d]">{{ tenantData.room }} ({{ tenantData.roomDetails }})</strong>
            </div>
            <div>
              <span class="text-[#6b778c] text-xs block mb-0.5">Move-in Date</span>
              <strong class="text-[#172b4d]">{{ tenantData.moveInDate }}</strong>
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
                Water Fee (₱{{ tenantData.specs.waterRatePerHead }}/head × {{ tenantData.occupants }} occupant<template v-if="tenantData.occupants > 1">s</template>)
              </span>
              <span class="font-semibold text-[#172b4d]">₱{{ tenantData.waterFee.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-[#5e6c84]">Garbage Collection Fee (GBG)</span>
              <span class="font-semibold text-[#172b4d]">₱{{ tenantData.gbgFee.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100 text-xs text-slate-500">
              <span>Security Deposit (Held on record)</span>
              <span class="font-medium text-slate-700">₱{{ tenantData.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <!-- Total Amount Due & Action -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-t-2 border-[#172b4d] pt-4 gap-3">
            <div>
              <span class="font-bold text-[#172b4d] text-base block">Total Amount Due</span>
              <span class="text-xs text-[#6b778c]">Status: <strong>{{ tenantData.dueDaysRemaining }}</strong></span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-2xl font-black text-[#0c66e4]">
                ₱{{ tenantData.totalAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </span>
              <router-link to="/tenant/payments" class="px-4 py-2 bg-[#0c66e4] hover:bg-[#0052cc] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors">
                <CreditCard class="w-4 h-4" />
                Pay via GCash / Online
              </router-link>
            </div>
          </div>

          <!-- Status & Remittance Account Note -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5e6c84]">
            <span class="flex items-center gap-1.5">
              <Zap class="w-3.5 h-3.5 text-amber-500" />
              <span>Electricity Submeter: <strong class="text-[#172b4d]">₱12.50 / kWh</strong> (Billed separately on 25th)</span>
            </span>
            <span>
              Landlady GCash: <strong class="font-mono font-bold text-[#172b4d]">{{ tenantData.landladyGCash }}</strong> ({{ tenantData.landladyName }})
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
