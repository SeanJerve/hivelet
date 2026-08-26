<!--
  @file views/TenantOverviewView.vue
  @description Tenant Unit Overview — displays assigned room specifications, high-res unit image, and monthly payment statement.
  @systemBibleRef Section 4 (Tenant Role), Section 5 (Property Model), Section 5.5 (Water Billing ₱200/head)
  @rationale Provides active residents with transparent unit photo preview, specs, and an at-a-glance billing statement.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { useToast } from '@/lib/useToast';

const router = useRouter();
const { showToast } = useToast();
import SkeletonDetail from '@/components/ui/SkeletonDetail.vue';
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
  RefreshCw,
  Wrench,
  Plus
} from 'lucide-vue-next';

const submissionNotice = ref('');
const activeBillId = ref<string | null>(null);
const payingOnline = ref(false);
const isFabOpen = ref(false);

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
  landladyName: 'Fe Galang Da Silva',
  verifiedAt: '',
  nextDueDateDisplay: ''
});

const loading = ref(false);

const tenantFirstName = computed(() => {
  const full = tenantData.value.name || currentUser.value?.fullName || 'Resident';
  return full.split(' ')[0];
});

/**
 * Computed due-date countdown.
 * Returns { daysLeft: number, label: string, severity: 'safe'|'warning'|'danger'|'overdue'|'paid' }
 * Severity drives the color of the badge on the payment card.
 * @businessRule Rent due date is the 5th of every month per boarding house policy.
 */
const dueDateCountdown = computed(() => {
  if (tenantData.value.dueBadgeText === 'PAID') {
    return { daysLeft: 0, label: 'Payment Settled', severity: 'paid' as const };
  }
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
      const activeRoom = data.find((r: any) => r.is_active) || data[0];
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

    // Fetch bills, payments and income records for the monthly statement
    const [billsData, paymentsData, incomeData] = await Promise.all([
      api.get<any[]>('/tenant/my-bills'),
      api.get<any[]>('/tenant/my-payments'),
      api.get<any[]>('/tenant/my-income-records')
    ]);

    // Find the latest covered date from verified payments and income records
    let maxCoveredDate: Date | null = null;

    // 1. Check verified payments
    paymentsData?.forEach((p: any) => {
      if (p.verification_status === 'Verified') {
        const payDate = new Date(p.paid_at || p.created_at);
        // Estimate cover end as the 25th of the payment month
        const estCoverEnd = new Date(payDate.getFullYear(), payDate.getMonth(), 25);
        if (!maxCoveredDate || estCoverEnd > maxCoveredDate) {
          maxCoveredDate = estCoverEnd;
        }
      }
    });

    // 2. Check verified income records coverage (most precise!)
    incomeData?.forEach((inc: any) => {
      if (inc.verification_status === 'Verified' && inc.rent_period_end) {
        const end = new Date(inc.rent_period_end);
        if (!maxCoveredDate || end > maxCoveredDate) {
          maxCoveredDate = end;
        }
      }
    });

    const unpaidBill = billsData?.find((b: any) => {
      if (b.status === 'Paid') return false;
      if (b.status === 'Pending' || b.status === 'Due' || b.status === 'Overdue') {
        // If the bill due date is <= covered date, it is already settled by a payment
        if (maxCoveredDate) {
          const billDue = new Date(b.due_date);
          if (billDue <= maxCoveredDate) {
            return false;
          }
        }
        return true;
      }
      return false;
    });

    if (unpaidBill) {
      activeBillId.value = unpaidBill.id;
      tenantData.value.baseRent = unpaidBill.rent_amount;
      tenantData.value.waterFee = unpaidBill.water_amount;
      tenantData.value.totalAmountDue = unpaidBill.total_amount;
      tenantData.value.dueDate = new Date(unpaidBill.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      tenantData.value.dueBadgeText = unpaidBill.status.toUpperCase();
      tenantData.value.dueDaysRemaining = 'Awaiting payment';
      tenantData.value.dueDateRaw = unpaidBill.due_date;
      tenantData.value.verifiedAt = '';
      tenantData.value.nextDueDateDisplay = '';
    } else {
      const paidBill = billsData && billsData.length > 0 ? billsData[0] : null;
      const validCoveredDate = maxCoveredDate as Date | null;
      if (validCoveredDate) {
        tenantData.value.baseRent = paidBill ? paidBill.rent_amount : tenantData.value.baseRent;
        tenantData.value.waterFee = paidBill ? paidBill.water_amount : tenantData.value.waterFee;
        tenantData.value.totalAmountDue = 0;

        // Represent the paid period by the 5th of that covered month
        const lastPaidDue = new Date(validCoveredDate.getFullYear(), validCoveredDate.getMonth(), 5);
        tenantData.value.dueDate = lastPaidDue.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        tenantData.value.dueBadgeText = 'PAID';
        tenantData.value.dueDaysRemaining = 'Settled';
        tenantData.value.dueDateRaw = lastPaidDue.toISOString().split('T')[0];

        // Next due date is 1 month after
        const nextDate = new Date(lastPaidDue);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(5);
        tenantData.value.nextDueDateDisplay = nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const linkedPayment = paymentsData?.find((p: any) => p.verification_status === 'Verified');
        if (linkedPayment?.verified_at) {
          tenantData.value.verifiedAt = new Date(linkedPayment.verified_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          tenantData.value.verifiedAt = '';
        }
      } else {
        tenantData.value.dueBadgeText = 'PAID';
        tenantData.value.dueDaysRemaining = 'No outstanding bills';
        tenantData.value.totalAmountDue = 0;
        tenantData.value.dueDateRaw = '';
        tenantData.value.verifiedAt = '';
        tenantData.value.nextDueDateDisplay = '';
      }
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
  <div class="space-y-6">
    <!-- Breadcrumb & Welcome Greeting Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#71717a] mb-1">
          <span>Tenant Portal</span>
          <span>/</span>
          <span class="font-bold text-[#1c1917]">Unit Overview</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Welcome back, {{ tenantFirstName }}!
        </h1>
        <p class="text-xs sm:text-sm text-[#71717a] mt-0.5">
          Unit {{ tenantData.room }} · Assigned specifications, photo showcase, and active billing statement.
        </p>
      </div>

      <!-- Quick Action Buttons: Desktop Primary Actions & Compact Refresh -->
      <div class="hidden sm:flex items-center gap-2.5 sm:justify-end">
        <router-link 
          to="/tenant/tickets" 
          class="btn-primary"
        >
          <Wrench class="size-3.5 text-white" />
          <span>Submit Maintenance Ticket</span>
        </router-link>

        <router-link 
          to="/tenant/payments" 
          class="btn-secondary"
        >
          <CreditCard class="size-3.5 text-[#0c66e4]" />
          <span>Payment &amp; Billing History</span>
        </router-link>

        <button
          @click="fetchTenantData"
          :disabled="loading"
          class="btn-secondary"
          title="Refresh Account Data"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', loading ? 'animate-spin text-[#0c66e4]' : '']" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SkeletonDetail />
    </div>

    <div v-else class="space-y-6">
      <!-- Submission Toast Notice -->
      <div
        v-if="submissionNotice"
        class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-xs"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="size-5 text-emerald-600 shrink-0" />
          <span class="font-medium">{{ submissionNotice }}</span>
        </div>
        <button @click="submissionNotice = ''" class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded-lg cursor-pointer" title="Dismiss">
          <X class="size-4" />
        </button>
      </div>

      <!-- 4 Top KPI Stat Cards (Matching Admin Overview Style) -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Assigned Unit</p>
            <span class="rounded-xl p-2 bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200">
              <Home class="size-4" />
            </span>
          </div>
          <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">{{ tenantData.room }}</p>
          <p class="mt-1.5 text-xs text-[#71717a] font-medium">{{ tenantData.roomDetails }} · Floor {{ tenantData.floor }}</p>
        </div>

        <div class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Monthly Base Rent</p>
            <span class="rounded-xl p-2 bg-amber-50 text-[#8a5814] ring-1 ring-amber-200">
              <CreditCard class="size-4" />
            </span>
          </div>
          <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">₱{{ tenantData.baseRent.toLocaleString() }}</p>
          <p class="mt-1.5 text-xs text-amber-800 font-medium">Standard rate · Submetered Power</p>
        </div>

        <div class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Water Allocation</p>
            <span class="rounded-xl p-2 bg-sky-50 text-sky-800 ring-1 ring-sky-200">
              <Droplets class="size-4" />
            </span>
          </div>
          <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">₱{{ tenantData.waterFee.toLocaleString() }}</p>
          <p class="mt-1.5 text-xs text-sky-700 font-medium">₱200 / registered occupant monthly</p>
        </div>

        <div class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Account Status</p>
            <span :class="[
              'rounded-xl p-2 ring-1',
              dueDateCountdown.severity === 'paid' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
            ]">
              <CheckCircle v-if="dueDateCountdown.severity === 'paid'" class="size-4" />
              <AlertTriangle v-else class="size-4" />
            </span>
          </div>
          <p class="tabular mt-3 font-display text-3xl font-black leading-tight" :class="dueDateCountdown.severity === 'paid' ? 'text-emerald-800' : 'text-rose-800'">
            {{ dueDateCountdown.severity === 'paid' ? 'Settled' : '₱' + tenantData.totalAmountDue.toLocaleString() }}
          </p>
          <p class="mt-1.5 text-xs font-medium" :class="dueDateCountdown.severity === 'paid' ? 'text-emerald-700' : 'text-rose-700'">
            {{ dueDateCountdown.severity === 'paid' ? 'Next Due: ' + (tenantData.nextDueDateDisplay || 'Upcoming Period') : tenantData.dueDaysRemaining }}
          </p>
        </div>
      </div>

      <!-- 2-Column Section: Unit Specs & Monthly Payment Statement -->
      <div class="grid gap-6 lg:grid-cols-12">
        
        <!-- Left: Unit Photo & Specifications (7 of 12 cols) -->
        <div class="lg:col-span-7 surface-card rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0c66e4]">Unit Details</span>
                <h2 class="font-display text-lg font-black text-[#1c1917]">{{ tenantData.room }} Specifications</h2>
              </div>
              <span class="badge-soft badge-success text-xs font-bold">
                Active Resident Lease
              </span>
            </div>

            <!-- Unit Photo Frame -->
            <div class="h-52 w-full rounded-xl overflow-hidden border border-[#e7e5e4] bg-slate-900 relative">
              <img
                v-if="tenantData.photoUrl"
                :src="tenantData.photoUrl"
                :alt="tenantData.room"
                class="w-full h-full object-cover"
              />
              <div v-else class="size-full flex items-center justify-center text-white/80 space-y-2 p-6">
                <Home class="size-8 text-white/60" />
              </div>
              <div class="absolute bottom-3 left-3 flex items-center gap-2">
                <span class="badge-soft badge-neutral bg-white/95 font-bold uppercase tracking-wider">
                  {{ tenantData.roomType }}
                </span>
                <span class="badge-soft badge-blue bg-white/95 font-bold">
                  Floor {{ tenantData.floor }}
                </span>
              </div>
            </div>

            <!-- Metadata Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4]">
                <span class="text-[10px] font-extrabold text-[#71717a] uppercase tracking-wider block mb-1">Floor Area</span>
                <span class="text-[#1c1917] font-display font-bold text-xs sm:text-sm">{{ tenantData.specs.floorArea }}</span>
              </div>
              <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4]">
                <span class="text-[10px] font-extrabold text-[#71717a] uppercase tracking-wider block mb-1">Bathroom</span>
                <span class="text-[#1c1917] font-display font-bold text-xs sm:text-sm">{{ tenantData.specs.bathroom }}</span>
              </div>
              <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4]">
                <span class="text-[10px] font-extrabold text-[#71717a] uppercase tracking-wider block mb-1">Occupancy</span>
                <span class="text-[#1c1917] font-display font-bold text-xs sm:text-sm">{{ tenantData.occupants }} Registered</span>
              </div>
            </div>

            <!-- Unit Amenities Chips -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">Standard Amenities &amp; Inclusions</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#57534e]">
                <div class="flex items-center gap-1.5"><CheckCircle2 class="size-3 text-emerald-600" /> Private T&amp;B Shower</div>
                <div class="flex items-center gap-1.5"><CheckCircle2 class="size-3 text-emerald-600" /> Bed &amp; Mattress Base</div>
                <div class="flex items-center gap-1.5"><CheckCircle2 class="size-3 text-emerald-600" /> Submetered Power (₱12.50/kWh)</div>
                <div class="flex items-center gap-1.5"><CheckCircle2 class="size-3 text-emerald-600" /> ₱200/Head Water Rate</div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-[#e7e5e4] flex items-center justify-between text-xs text-[#71717a]">
            <span>Resident: <strong class="text-[#1c1917]">{{ tenantData.name }}</strong></span>
            <span>Move-in: <strong class="text-[#1c1917]">{{ tenantData.moveInDate }}</strong></span>
          </div>
        </div>

        <!-- Right: Monthly Payment Statement (5 of 12 cols) -->
        <div class="lg:col-span-5 surface-card rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0c66e4]">Billing Statement</span>
                <h2 class="font-display text-lg font-black text-[#1c1917]">Monthly Statement</h2>
              </div>
              <span :class="[
                'badge-soft font-bold text-xs',
                dueDateCountdown.severity === 'paid' ? 'badge-success' : 'badge-warning'
              ]">
                {{ tenantData.dueBadgeText }}
              </span>
            </div>

            <!-- Dynamic Countdown Alert Banner -->
            <div
              class="p-3.5 rounded-xl border flex items-center gap-3"
              :class="{
                'bg-emerald-50 border-emerald-200 text-emerald-950': dueDateCountdown.severity === 'paid' || dueDateCountdown.severity === 'safe',
                'bg-amber-50 border-amber-200 text-amber-950': dueDateCountdown.severity === 'warning',
                'bg-rose-50 border-rose-200 text-rose-950': dueDateCountdown.severity === 'danger' || dueDateCountdown.severity === 'overdue'
              }"
            >
              <CheckCircle2 v-if="dueDateCountdown.severity === 'paid' || dueDateCountdown.severity === 'safe'" class="size-5 text-emerald-600 shrink-0" />
              <AlertTriangle v-else class="size-5 text-rose-600 shrink-0" />
              <div>
                <p class="text-xs font-bold">{{ dueDateCountdown.label }}</p>
                <p class="text-[11px] opacity-80 mt-0.5">
                  <span v-if="dueDateCountdown.severity === 'paid'">
                    All dues are cleared. Next rent due on <strong>{{ tenantData.nextDueDateDisplay }}</strong>.
                  </span>
                  <span v-else>
                    Due date on <strong>{{ tenantData.dueDate }}</strong>.
                  </span>
                </p>
              </div>
            </div>

            <!-- Breakdown Matrix -->
            <div class="space-y-2.5 pt-2">
              <div class="flex items-center justify-between text-xs text-[#57534e]">
                <span>Room {{ tenantData.room }} Base Rental</span>
                <span class="font-bold text-[#1c1917] tabular">₱{{ tenantData.baseRent.toLocaleString() }}.00</span>
              </div>
              <div class="flex items-center justify-between text-xs text-[#57534e]">
                <span class="flex items-center gap-1.5">
                  Water Allocation
                  <span class="text-[10px] text-[#71717a]">({{ tenantData.occupants }} × ₱200/head)</span>
                </span>
                <span class="font-bold text-[#1c1917] tabular">₱{{ tenantData.waterFee.toLocaleString() }}.00</span>
              </div>
              <div class="flex items-center justify-between text-xs text-[#57534e]">
                <span>Garbage Collection Fee</span>
                <span class="font-semibold text-emerald-700">Included (₱0)</span>
              </div>
              <div class="flex items-center justify-between text-xs text-[#57534e]">
                <span>Electric Submeter</span>
                <span class="font-semibold text-sky-700">Separate Bill</span>
              </div>
              <div class="border-t border-[#e7e5e4] pt-2.5 flex items-center justify-between">
                <span class="font-bold text-xs text-[#1c1917]">Total Amount Due</span>
                <span class="font-display font-black text-xl tabular text-[#1c1917]">₱{{ tenantData.totalAmountDue.toLocaleString() }}.00</span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-4 border-t border-[#e7e5e4] space-y-3">
            <button
              v-if="dueDateCountdown.severity !== 'paid'"
              @click="handlePayOnline"
              :disabled="payingOnline"
              class="btn-primary w-full justify-center min-h-11"
            >
              <CreditCard class="size-3.5 text-white" />
              <span>{{ payingOnline ? 'Opening Gateway…' : 'Pay Online (GCash via Adyen)' }}</span>
            </button>

            <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] text-[11px] text-[#71717a] space-y-0.5 text-center">
              <p>Landlady GCash: <strong class="text-[#1c1917] font-mono">{{ tenantData.landladyGCash }}</strong></p>
              <p>Account Name: <strong>{{ tenantData.landladyName }}</strong></p>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Mobile Floating Action Speed-Dial Button (FAB) -->
    <div class="sm:hidden">
      <!-- Backdrop overlay when speed dial is open -->
      <div 
        v-if="isFabOpen" 
        class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 animate-in fade-in duration-150" 
        @click="isFabOpen = false" 
      />

      <!-- Speed Dial Actions and FAB Trigger -->
      <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform opacity-0 translate-y-4 scale-90"
          enter-to-class="transform opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform opacity-100 translate-y-0 scale-100"
          leave-to-class="transform opacity-0 translate-y-4 scale-90"
        >
          <div v-if="isFabOpen" class="flex flex-col items-end gap-2.5 mb-1">
            <!-- Action 1: Payment and Billing -->
            <button
              @click="isFabOpen = false; router.push('/tenant/payments');"
              class="px-4 py-2.5 rounded-xl bg-white text-[#1c1917] font-extrabold text-xs shadow-xl border border-[#e7e5e4] hover:bg-[#0c66e4] hover:text-white hover:border-[#0c66e4] active:bg-[#0055cc] active:text-white transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <span>Payment &amp; Billing</span>
            </button>

            <!-- Action 2: Submit Maintenance Ticket -->
            <button
              @click="isFabOpen = false; router.push('/tenant/tickets');"
              class="px-4 py-2.5 rounded-xl bg-white text-[#1c1917] font-extrabold text-xs shadow-xl border border-[#e7e5e4] hover:bg-[#0c66e4] hover:text-white hover:border-[#0c66e4] active:bg-[#0055cc] active:text-white transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <span>Submit Maintenance Ticket</span>
            </button>
          </div>
        </Transition>

        <!-- Main FAB Trigger Button -->
        <button
          @click="isFabOpen = !isFabOpen"
          :class="[
            'size-14 rounded-full shadow-2xl transition-all flex items-center justify-center cursor-pointer border-2 border-white',
            isFabOpen 
              ? 'bg-[#0c66e4] text-white ring-4 ring-blue-200' 
              : 'bg-white text-[#1c1917] ring-4 ring-stone-200 hover:bg-[#0c66e4] hover:text-white hover:ring-blue-200 active:bg-[#0055cc] active:text-white'
          ]"
          title="Quick Actions"
          aria-label="Quick Actions Menu"
        >
          <Plus 
            :class="[
              'size-7 transition-transform duration-200',
              isFabOpen ? 'rotate-45' : ''
            ]" 
          />
        </button>
      </div>
    </div>
  </div>
</template>
