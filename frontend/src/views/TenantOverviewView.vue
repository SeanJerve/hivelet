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
import { useToast } from '@/lib/useToast';

const { showToast } = useToast();
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
const activeBillId = ref<string | null>(null);
const payingOnline = ref(false);

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
    showToast('success', 'Payment Submitted', `Online GCash payment (Ref: ${refParam}) submitted for verification.`);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    showToast('info', 'Payment Cancelled', 'Online payment checkout was cancelled.');
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
        const roomNum = activeRoom.rooms?.room_number || activeRoom.room_number || '1A';
        tenantData.value.room = `Unit ${roomNum.toUpperCase()}`;
        tenantData.value.roomDetails = activeRoom.rooms?.room_type || '1 Bedroom';
        tenantData.value.roomType = activeRoom.rooms?.cluster_code || 'BH';
        tenantData.value.floor = activeRoom.rooms?.floor || 1;
        tenantData.value.occupants = activeRoom.occupant_count || 1;
        
        const primaryPhoto = activeRoom.rooms?.room_photos?.find((p: any) => p.is_primary)?.file_url 
          || activeRoom.rooms?.room_photos?.[0]?.file_url 
          || activeRoom.rooms?.photo_url;
        if (primaryPhoto) {
          tenantData.value.photoUrl = primaryPhoto;
        }

        if (activeRoom.rooms?.current_price) {
          tenantData.value.baseRent = Number(activeRoom.rooms.current_price);
        }
      }
    }

    // Fetch bills for the monthly statement
    const billsData = await api.get<any[]>('/tenant/my-bills');
    const unpaidBill = billsData?.find(b => b.status === 'Pending' || b.status === 'Due' || b.status === 'Overdue');
    if (unpaidBill) {
      activeBillId.value = unpaidBill.id;
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

async function handlePayOnline() {
  payingOnline.value = true;
  try {
    const res = await api.post<{ sessionId: string; redirectUrl: string }>('/tenant/payments/checkout', {
      billId: activeBillId.value || undefined,
      returnUrl: window.location.origin + '/tenant'
    });
    if (res && res.redirectUrl) {
      window.location.href = res.redirectUrl;
    }
  } catch (err: any) {
    showToast('error', 'Payment Session Error', err?.message || 'Unable to create checkout session.');
  } finally {
    payingOnline.value = false;
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
          <div class="lg:col-span-5 relative bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center min-h-[260px] p-6 border-b lg:border-b-0 lg:border-r border-[#dfe1e6]">
            <img
              v-if="tenantData.photoUrl"
              :src="tenantData.photoUrl"
              :alt="tenantData.room"
              class="w-full h-full max-h-[280px] object-cover rounded-lg shadow-md"
            />
            <div v-else class="text-center text-white/80 space-y-3">
              <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto border border-white/20">
                <Home class="w-8 h-8 text-white" />
              </div>
              <div>
                <p class="font-display font-bold text-lg text-white">{{ tenantData.room }}</p>
                <p class="text-xs text-white/60">{{ tenantData.roomDetails }}</p>
              </div>
            </div>
          </div>

          <!-- Right Column: Room Specifications Grid -->
          <div class="lg:col-span-7 p-6 flex flex-col justify-between space-y-6">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div>
                  <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Unit Specifications</span>
                  <h2 class="font-display text-xl font-bold text-[#172b4d]">{{ tenantData.room }}</h2>
                </div>
                <span class="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Occupied (Active Lease)
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]">
                  <span class="text-[#6b778c] block mb-1">Cluster / Wing</span>
                  <strong class="text-[#172b4d] text-sm">{{ tenantData.roomType }}</strong>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]">
                  <span class="text-[#6b778c] block mb-1">Floor Level</span>
                  <strong class="text-[#172b4d] text-sm">Floor {{ tenantData.floor }}</strong>
                </div>
                <div class="p-3 bg-[#f7f8f9] rounded-lg border border-[#dfe1e6]">
                  <span class="text-[#6b778c] block mb-1">Current Occupants</span>
                  <strong class="text-[#172b4d] text-sm">{{ tenantData.occupants }} Person{{ tenantData.occupants > 1 ? 's' : '' }}</strong>
                </div>
              </div>
            </div>

            <!-- Utilities Bar -->
            <div class="pt-4 border-t border-[#dfe1e6] flex flex-wrap gap-4 text-xs text-[#5e6c84]">
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
        </div>

        <!-- Statement Body -->
        <div class="p-6 space-y-5">
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

          <!-- Total & Pay Online Button -->
          <div class="flex flex-col sm:flex-row justify-between sm:items-center border-t-2 border-[#172b4d] pt-4 gap-4">
            <div>
              <span class="font-bold text-[#172b4d] text-base block">Total Amount Due</span>
              <span class="text-2xl font-bold text-[#0c66e4]">
                ₱{{ tenantData.totalAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </span>
            </div>
            
            <button
              @click="handlePayOnline"
              :disabled="payingOnline"
              class="px-6 py-3 bg-[#0c66e4] hover:bg-[#0052cc] text-white font-bold text-sm rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CreditCard class="w-4 h-4" />
              <span>{{ payingOnline ? 'Opening GCash Gateway...' : 'Pay Online (GCash via Adyen)' }}</span>
            </button>
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
