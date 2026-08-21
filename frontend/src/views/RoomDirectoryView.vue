<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { rooms, isAdminEditUnitModalOpen, activeAdminEditUnit, type RoomItem } from '@/lib/systemState';
import { CLUSTERS, peso, type UnitStatus } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Search, Pencil, RefreshCw } from 'lucide-vue-next';

interface ApiRoom {
  id: string;
  cluster_code: string;
  room_number: string;
  floor: number;
  room_type: string;
  capacity: number;
  current_price: number;
  operational_status: string;
  description: string;
  is_linda_unit: boolean;
}

const q = ref('');
const cluster = ref('All');
const isLoading = ref(false);

async function fetchRooms() {
  isLoading.value = true;
  try {
    const data = await api.get<ApiRoom[]>('/admin/rooms');
    if (data && data.length) {
      data.forEach((r) => {
        const existing = rooms.find((u) => u.unitCode.toLowerCase() === r.room_number.toLowerCase());
        if (existing) {
          existing.price = Number(r.current_price);
          existing.maxOccupants = r.capacity;
          existing.desc = r.description || existing.desc;
          if (r.operational_status === 'Available') existing.status = 'vacant';
        }
      });
    }
  } catch {
    // Graceful fallback to reactive store
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchRooms();
});

const rows = computed(() => {
  return rooms.filter((u) => {
    const matchesCluster = cluster.value === 'All' || u.cluster === cluster.value;
    const query = q.value.toLowerCase().trim();
    const matchesQuery =
      !query ||
      u.unitCode.toLowerCase().includes(query) ||
      (u.tenant || '').toLowerCase().includes(query) ||
      u.type.toLowerCase().includes(query);
    return matchesCluster && matchesQuery;
  });
});

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

function editUnit(u: RoomItem) {
  activeAdminEditUnit.value = u;
  isAdminEditUnitModalOpen.value = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Room &amp; Rate Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          The canonical unit register across the 5 property clusters.
        </p>
      </div>

      <button
        @click="fetchRooms"
        :disabled="isLoading"
        class="btn-secondary min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs self-start sm:self-auto cursor-pointer"
      >
        <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Section Card with Search & Filter and Table -->
    <div class="surface-card overflow-hidden">
      
      <!-- Search & Filter Controls -->
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search unit code or tenant…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
          />
        </div>

        <select
          v-model="cluster"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-56"
        >
          <option value="All">All Clusters</option>
          <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <!-- Directory Table -->
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[900px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">CLUSTER</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">TYPE</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">BILLING RULE</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">RATE (₱/MO)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">PRIMARY TENANT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="u in rows" 
              :key="u.unitCode"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <td class="px-4 py-3.5 font-display font-extrabold uppercase text-[#1c1917]">
                {{ u.unitCode.toUpperCase() }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-[#71717a] font-medium">
                {{ u.cluster }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-[#1c1917]">
                {{ u.type }}
              </td>

              <td class="px-4 py-3.5 text-xs text-[#71717a]">
                {{ u.billingRule }}
              </td>

              <td class="tabular whitespace-nowrap px-4 py-3.5 font-display font-bold text-[#1c1917]">
                {{ peso(u.price) }}
              </td>

              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs capitalize', getStatusBadgeClass(u.status)]">
                  {{ getStatusLabel(u.status) }}
                </span>
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-[#1c1917]">
                {{ u.tenant || '—' }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <button 
                  @click="editUnit(u)"
                  class="btn-secondary min-h-9 px-3.5 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                >
                  <Pencil class="size-3.5 text-[#71717a]" />
                  <span>Edit Rate</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
