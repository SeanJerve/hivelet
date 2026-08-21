<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { 
  rooms, 
  isOnsitePaymentModalOpen, 
  isAdminEditUnitModalOpen, 
  activeAdminEditUnit, 
  isRoomDetailModalOpen, 
  activeRoomDetail,
  type RoomItem 
} from '@/lib/systemState';
import { CLUSTERS, peso, type UnitStatus } from '@/lib/canonicalUnits';
import { 
  Banknote, 
  TrendingUp, 
  Home, 
  ShieldAlert, 
  Wrench, 
  Eye, 
  Pencil,
  Clock 
} from 'lucide-vue-next';

const router = useRouter();
const pendingPayments = ref<any[]>([]);

async function loadPayments() {
  try {
    const data = await api.get<any[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
  } catch {
    // Offline fallback
  }
}

onMounted(() => {
  loadPayments();
});

const pendingCount = computed(() => pendingPayments.value.length);
const pendingTotal = computed(() => pendingPayments.value.reduce((s, p) => s + (Number(p.amount) || 0), 0));

const STATUS_STYLE: Record<UnitStatus, string> = {
  settled: 'border-emerald-200 bg-emerald-50/50',
  pending: 'border-amber-200 bg-amber-50/50',
  overdue: 'border-rose-200 bg-rose-50/50',
  vacant: 'border-[#e7e5e4] bg-[#fafaf9]',
  maintenance: 'border-[#e7e5e4] bg-[#fafaf9]',
};

function getUnitsForCluster(clusterName: string) {
  return rooms.filter((r) => r.cluster === clusterName);
}

function openSpecs(room: RoomItem) {
  activeRoomDetail.value = room;
  isRoomDetailModalOpen.value = true;
}

function openEdit(room: RoomItem) {
  activeAdminEditUnit.value = room;
  isAdminEditUnitModalOpen.value = true;
}

function getStatusLabel(status: UnitStatus) {
  if (status === 'vacant') return 'Vacant';
  if (status === 'settled') return 'Settled';
  if (status === 'pending') return 'Pending';
  if (status === 'overdue') return 'Overdue';
  return status;
}

function getStatusBadgeClass(status: UnitStatus) {
  if (status === 'settled') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  if (status === 'overdue') return 'badge-danger';
  return 'badge-neutral';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Executive Overview
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Live operating snapshot for Fe Galang Da Silva Boarding House — July to August 2026 cycle.
        </p>
      </div>

      <button 
        @click="isOnsitePaymentModalOpen = true"
        class="btn-primary min-h-11 gap-2 text-xs self-start sm:self-auto shadow-xs"
      >
        <Banknote class="size-4 text-[#f59e0b]" />
        <span>Record On-Site Cash Payment</span>
      </button>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="surface-card group relative overflow-hidden p-5 transition-shadow hover:shadow-lg">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Monthly Revenue</p>
          <span class="rounded-xl p-2 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <TrendingUp class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">{{ peso(178500) }}</p>
        <p class="mt-1.5 text-xs text-emerald-700 font-semibold">+₱12,000 vs last month</p>
      </div>

      <div class="surface-card group relative overflow-hidden p-5 transition-shadow hover:shadow-lg">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Occupancy Rate</p>
          <span class="rounded-xl p-2 bg-sky-50 text-sky-800 ring-1 ring-sky-200">
            <Home class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">28 / 32 Units</p>
        <p class="mt-1.5 text-xs text-[#71717a]">87.5% occupied • 4 vacant</p>
      </div>

      <div 
        @click="router.push('/admin/income?tab=verify')"
        class="surface-card group relative overflow-hidden p-5 transition-shadow hover:shadow-lg cursor-pointer hover:border-amber-400"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a] group-hover:text-amber-800">Pending GCash</p>
          <span class="rounded-xl p-2 bg-amber-50 text-amber-800 ring-1 ring-amber-200">
            <ShieldAlert class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">
          {{ pendingTotal > 0 ? peso(pendingTotal) : '₱0.00' }}
        </p>
        <p class="mt-1.5 text-xs text-amber-800 font-medium">
          {{ pendingCount }} remittance{{ pendingCount === 1 ? '' : 's' }} awaiting review &rarr;
        </p>
      </div>

      <div class="surface-card group relative overflow-hidden p-5 transition-shadow hover:shadow-lg">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Maintenance Alerts</p>
          <span class="rounded-xl p-2 bg-rose-50 text-rose-800 ring-1 ring-rose-200">
            <Wrench class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">2 Open</p>
        <p class="mt-1.5 text-xs text-rose-700 font-medium">1 emergency needs dispatch</p>
      </div>
    </div>

    <!-- 32-Unit Visual Matrix -->
    <div class="surface-card overflow-hidden">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e5e4] px-5 py-4">
        <div>
          <h2 class="font-display text-base font-extrabold text-[#1c1917]">32-Unit Visual Matrix</h2>
          <p class="text-xs text-[#71717a]">Grouped by property cluster. Colors reflect the current billing cycle.</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="badge-soft badge-success">Settled</span>
          <span class="badge-soft badge-warning">Pending</span>
          <span class="badge-soft badge-danger">Overdue</span>
          <span class="badge-soft badge-neutral">Vacant</span>
        </div>
      </header>

      <div class="space-y-6 p-5">
        <div v-for="cluster in CLUSTERS" :key="cluster">
          <div class="mb-3 flex items-baseline gap-2">
            <h3 class="font-display text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#1c1917]">{{ cluster }}</h3>
            <span class="text-xs text-[#71717a]">{{ getUnitsForCluster(cluster).length }} units</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <article
              v-for="u in getUnitsForCluster(cluster)"
              :key="u.unitCode"
              :class="[
                'rounded-2xl border p-4 transition-all hover:shadow-md bg-white',
                STATUS_STYLE[u.status]
              ]"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-display text-lg font-black uppercase leading-none text-[#1c1917]">{{ u.unitCode }}</p>
                  <p class="mt-1 text-xs text-[#71717a]">{{ u.type }}</p>
                </div>
                <span :class="['badge-soft text-[10px] capitalize', getStatusBadgeClass(u.status)]">
                  {{ getStatusLabel(u.status) }}
                </span>
              </div>

              <p class="mt-3 truncate text-sm font-bold text-[#1c1917]">{{ u.tenant || 'No occupant' }}</p>
              <p class="tabular text-xs text-[#71717a]">{{ peso(u.price) }} / month</p>

              <div class="mt-3 flex gap-2">
                <button
                  @click="openSpecs(u)"
                  class="btn-secondary min-h-9 flex-1 py-1 px-2 text-xs gap-1 shadow-xs"
                >
                  <Eye class="size-3.5 text-[#71717a]" />
                  <span>Specs</span>
                </button>
                <button
                  @click="openEdit(u)"
                  class="btn-secondary min-h-9 flex-1 py-1 px-2 text-xs gap-1 shadow-xs"
                >
                  <Pencil class="size-3.5 text-[#71717a]" />
                  <span>Edit</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
