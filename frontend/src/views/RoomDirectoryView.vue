<script setup lang="ts">
/**
 * @component RoomDirectoryView
 * @description Canonical Directory of all 32 Rentable Units across 5 Property Clusters (BH, Back Apt, Penthouse, Front Apt, Linda).
 * @systemBibleRef Section 5.2 - Room & Occupancy Model & BR-032 (Canonical 32 Unit List) & BR-040 (Linda Exception)
 * @rationale Enforces the room-centric data model. Manages room capacities, operational statuses, base/current prices,
 *              and 32 canonical unit specifications with soft Jira styling and larger typography.
 * @innovations Integrated canonical unit catalog from canonicalUnits.ts, 2% annual price cap helper,
 *              and touch-friendly mobile data table controls.
 */
import { ref, computed } from 'vue';
import { Building2, Search, Filter, Plus, Edit, Eye, Clock, Check, Layers } from 'lucide-vue-next';
import { CANONICAL_32_UNITS, PROPERTY_CLUSTERS, type RentableUnit } from '../lib/canonicalUnits';

const units = ref<RentableUnit[]>([...CANONICAL_32_UNITS]);
const search = ref('');
const selectedCluster = ref('all');
const showEditModal = ref(false);
const activeUnit = ref<RentableUnit | null>(null);

const filteredUnits = computed(() => {
  return units.value.filter(unit => {
    const matchesSearch = search.value === '' || 
      unit.unitCode.toLowerCase().includes(search.value.toLowerCase()) ||
      (unit.tenantName && unit.tenantName.toLowerCase().includes(search.value.toLowerCase())) ||
      unit.type.toLowerCase().includes(search.value.toLowerCase());
    const matchesCluster = selectedCluster.value === 'all' || unit.cluster === selectedCluster.value;
    return matchesSearch && matchesCluster;
  });
});

const openEditModal = (unit: RentableUnit) => {
  activeUnit.value = { ...unit };
  showEditModal.value = true;
};
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Header Title & Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs sm:text-sm text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-bold text-[#172b4d]">Room Directory</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] tracking-tight">Canonical 32 Units & Rate Directory</h1>
      </div>

      <button class="jira-btn-primary text-xs sm:text-sm">
        <Plus class="w-4 h-4" />
        <span>Add Unit Specification</span>
      </button>
    </div>

    <!-- Filters & Search Bar (Soft Jira Styling) -->
    <div class="jira-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Filter by unit code (1a, B1F, PH), tenant..." 
          class="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
        />
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto">
        <span class="text-xs sm:text-sm text-[#6b778c] font-bold">Property Cluster:</span>
        <select 
          v-model="selectedCluster" 
          class="text-xs sm:text-sm bg-[#f7f8f9] border border-[#dfe1e6] rounded-md px-3 py-2 text-[#172b4d] font-semibold focus:bg-white focus:outline-none"
        >
          <option value="all">All 5 Property Clusters (32 Units)</option>
          <option v-for="cluster in PROPERTY_CLUSTERS" :key="cluster" :value="cluster">
            {{ cluster }}
          </option>
        </select>
      </div>
    </div>

    <!-- Mobile-First Responsive Data Table Wrapper -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr class="bg-[#f7f8f9] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-bold text-xs">
              <th class="py-3.5 px-4">Unit Code</th>
              <th class="py-3.5 px-4">Cluster / Location</th>
              <th class="py-3.5 px-4">Unit Type</th>
              <th class="py-3.5 px-4">Billing Rule</th>
              <th class="py-3.5 px-4">Current Monthly Rate</th>
              <th class="py-3.5 px-4">Operational Status</th>
              <th class="py-3.5 px-4">Assigned Primary Contact</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr 
              v-for="unit in filteredUnits" 
              :key="unit.id" 
              class="hover:bg-[#f7f8f9]/80 transition-colors"
            >
              <td class="py-3.5 px-4 font-extrabold text-[#172b4d] text-sm sm:text-base">
                Unit {{ unit.unitCode }}
              </td>
              <td class="py-3.5 px-4">
                <span class="font-semibold text-[#42526e] bg-[#f7f8f9] px-2 py-0.5 rounded-md border border-[#dfe1e6]">
                  {{ unit.cluster }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-[#5e6c84]">{{ unit.type }}</td>
              <td class="py-3.5 px-4">
                <span v-if="unit.waterRateType === 'linda_fixed'" class="text-xs font-bold text-[#826100] bg-[#fffae6] px-2 py-0.5 rounded-md border border-[#ffe380]">
                  BR-040 Fixed Rates
                </span>
                <span v-else class="text-xs text-[#5e6c84]">
                  Standard (₱200/head water)
                </span>
              </td>
              <td class="py-3.5 px-4 font-bold text-[#172b4d]">
                ₱{{ unit.basePrice.toLocaleString() }}/mo
              </td>
              <td class="py-3.5 px-4">
                <span 
                  :class="[
                    'jira-badge',
                    unit.status === 'occupied' ? 'jira-badge-done' : unit.status === 'available' ? 'jira-badge-progress' : 'jira-badge-emergency'
                  ]"
                >
                  {{ unit.status }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-semibold text-[#42526e]">
                {{ unit.tenantName || 'Vacant Unit' }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <button 
                  @click="openEditModal(unit)" 
                  class="jira-btn-secondary py-1.5 px-3 text-xs font-semibold"
                >
                  <Edit class="w-3.5 h-3.5" />
                  <span>Edit Rate</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rate Spec Editor Modal -->
    <div v-if="showEditModal && activeUnit" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Edit Specs — Unit {{ activeUnit.unitCode }}</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1">✕</button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1.5">Current Monthly Base Rent Rate (₱)</label>
            <input 
              v-model="activeUnit.basePrice" 
              type="number" 
              class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold text-base focus:bg-white focus:border-[#0c66e4] focus:outline-none" 
            />
          </div>

          <div class="p-3 bg-[#deebff] border border-[#b3d4ff] rounded-md text-[#0747a6]">
            <p class="font-bold mb-1">2% Annual Price Cap Guidance:</p>
            <p class="text-xs leading-relaxed">
              Recommended annual cap for Unit {{ activeUnit.unitCode }}: <strong>₱{{ Math.round(activeUnit.basePrice * 1.02).toLocaleString() }}</strong>. Rate changes are logged in system audit logs.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
          <button @click="showEditModal = false" class="jira-btn-secondary">Cancel</button>
          <button @click="showEditModal = false" class="jira-btn-primary">Save Specifications</button>
        </div>
      </div>
    </div>
  </div>
</template>
