<!--
  @file views/RoomDirectoryView.vue
  @description Canonical Directory of all 32 Rentable Units with Add Spec Modal and updated Edit Spec functionality.
  @systemBibleRef Section 5.2 - Room & Occupancy Model & BR-032 (Canonical 32 Unit List) & BR-040 (Linda Exception)
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Plus, Edit, X } from 'lucide-vue-next';
import { rooms, addRoomUnit, updateRoomUnit, type RoomUnit } from '@/lib/systemState';
import { PROPERTY_CLUSTERS } from '@/lib/canonicalUnits';

const search = ref('');
const selectedCluster = ref('all');

// Edit Modal State
const showEditModal = ref(false);
const activeUnit = ref<RoomUnit | null>(null);

// Add Unit Modal State
const showAddModal = ref(false);
const newUnitCode = ref('');
const newCluster = ref<'BH (Main Rooms)' | 'Back Apartment' | 'Penthouse' | 'Front Apartment' | 'Linda'>('BH (Main Rooms)');
const newType = ref('Studio');
const newPrice = ref(4500);
const newTenant = ref('');
const newStatus = ref<'occupied' | 'available' | 'pending' | 'overdue'>('available');
const newWaterRateType = ref<'standard' | 'linda_fixed'>('standard');

const filteredUnits = computed(() => {
  return rooms.filter(unit => {
    const matchesSearch = search.value === '' || 
      unit.unitCode.toLowerCase().includes(search.value.toLowerCase()) ||
      (unit.tenant && unit.tenant.toLowerCase().includes(search.value.toLowerCase())) ||
      unit.type.toLowerCase().includes(search.value.toLowerCase());
    const matchesCluster = selectedCluster.value === 'all' || unit.cluster === selectedCluster.value;
    return matchesSearch && matchesCluster;
  });
});

const openEditModal = (unit: RoomUnit) => {
  activeUnit.value = JSON.parse(JSON.stringify(unit));
  showEditModal.value = true;
};

const saveUnitChanges = () => {
  if (!activeUnit.value) return;
  updateRoomUnit(activeUnit.value.unitCode, {
    price: activeUnit.value.price,
    tenant: activeUnit.value.tenant,
    status: activeUnit.value.status
  });
  showEditModal.value = false;
};

const handleAddUnitSpec = () => {
  if (!newUnitCode.value) return;
  addRoomUnit({
    unitCode: newUnitCode.value,
    cluster: newCluster.value,
    floorLabel: `${newCluster.value} Unit`,
    type: newType.value,
    price: newPrice.value,
    occupants: newTenant.value ? 1 : 0,
    maxOccupants: 3,
    status: newStatus.value,
    tenant: newTenant.value || null,
    paid: true,
    balance: 0,
    waterRateType: newWaterRateType.value,
    photo: 'default_room.jpg',
    desc: `Newly configured unit ${newUnitCode.value} in ${newCluster.value}.`
  });

  // Reset form
  newUnitCode.value = '';
  newPrice.value = 4500;
  newTenant.value = '';
  showAddModal.value = false;
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

      <button 
        @click="showAddModal = true" 
        class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Add Unit Specification</span>
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="jira-card p-4 sm:p-5 bg-white border border-[#dfe1e6] flex flex-col md:flex-row items-center justify-between gap-4">
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
          <option value="all">All Property Clusters ({{ rooms.length }} Units)</option>
          <option v-for="cluster in PROPERTY_CLUSTERS" :key="cluster" :value="cluster">
            {{ cluster }}
          </option>
        </select>
      </div>
    </div>

    <!-- Responsive Data Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6]">
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
                ₱{{ unit.price.toLocaleString() }}/mo
              </td>
              <td class="py-3.5 px-4">
                <span 
                  :class="[
                    'px-2 py-0.5 text-xs font-bold rounded-full',
                    unit.status === 'occupied' ? 'bg-emerald-100 text-emerald-800' : unit.status === 'available' ? 'bg-blue-100 text-blue-800' : unit.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ unit.status }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-semibold text-[#42526e]">
                {{ unit.tenant || 'Vacant Unit' }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <button 
                  @click="openEditModal(unit)" 
                  title="Edit Unit Specs"
                  class="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors cursor-pointer ml-auto flex items-center justify-center border border-[#dfe1e6]"
                >
                  <Edit class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- UPDATE MODAL: Rate, Primary Contact & Operational Status -->
    <div v-if="showEditModal && activeUnit" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Edit Specs — Unit {{ activeUnit.unitCode }}</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1.5">Monthly Base Rent Rate (₱)</label>
            <input 
              v-model.number="activeUnit.price" 
              type="number" 
              class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold text-base focus:bg-white focus:border-[#0c66e4] focus:outline-none" 
            />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5">Assigned Primary Contact / Tenant Name</label>
            <input 
              v-model="activeUnit.tenant" 
              type="text" 
              placeholder="e.g. Juan Dela Cruz (or leave blank for Vacant)"
              class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-medium focus:bg-white focus:border-[#0c66e4] focus:outline-none" 
            />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5">Operational Status</label>
            <select 
              v-model="activeUnit.status"
              class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-semibold focus:bg-white focus:outline-none"
            >
              <option value="occupied">Occupied</option>
              <option value="available">Available (Vacant)</option>
              <option value="pending">Pending Verification</option>
              <option value="overdue">Overdue Payment</option>
            </select>
          </div>

          <div class="p-3 bg-[#deebff] border border-[#b3d4ff] rounded-md text-[#0747a6]">
            <p class="font-bold mb-1">2% Annual Price Cap Guidance:</p>
            <p class="text-xs leading-relaxed">
              Recommended annual cap for Unit {{ activeUnit.unitCode }}: <strong>₱{{ Math.round((activeUnit.price || 0) * 1.02).toLocaleString() }}</strong>. Rate and contact changes are logged in system audit logs.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
          <button @click="showEditModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
          <button @click="saveUnitChanges" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- ADD UNIT SPECIFICATION MODAL -->
    <div v-if="showAddModal" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Add New Unit Specification</h3>
          <button @click="showAddModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <form @submit.prevent="handleAddUnitSpec" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1">Unit Code *</label>
            <input 
              v-model="newUnitCode" 
              type="text" 
              placeholder="e.g. 4a or B4F"
              required
              class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold" 
            />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Property Cluster</label>
            <select v-model="newCluster" class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]">
              <option value="BH (Main Rooms)">BH (Main Rooms)</option>
              <option value="Back Apartment">Back Apartment</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Front Apartment">Front Apartment</option>
              <option value="Linda">Linda</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Unit Type</label>
              <input v-model="newType" type="text" placeholder="Studio / 1-Bedroom" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Monthly Base Price (₱)</label>
              <input v-model.number="newPrice" type="number" required class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Assigned Tenant (Optional)</label>
            <input v-model="newTenant" type="text" placeholder="Leave blank if vacant" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showAddModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Add Unit</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
