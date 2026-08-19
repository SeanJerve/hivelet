<!--
  @file views/RoomDirectoryView.vue
  @description Property Units & Rate Directory listing with direct database synchronization and visual spacing.
  @systemBibleRef Section 5.2 - Room & Occupancy Model & BR-032 (32 Unit List) & BR-040 (Linda Exception)
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Edit, X, ShieldCheck, Trash2 } from 'lucide-vue-next';
import { api } from '@/lib/api';
import { showToast, requestSecondaryConfirm } from '@/lib/systemState';

interface RoomUnit {
  id: string;
  unitCode: string;
  clusterCode: string;
  clusterName: string;
  type: string;
  price: number;
  status: 'Available' | 'Reserved' | 'Occupied' | 'Under Maintenance';
  isLinda: boolean;
  tenant: string;
}

const search = ref('');
const selectedCluster = ref('all');
const loading = ref(false);

const apiRooms = ref<RoomUnit[]>([]);
const apiTenants = ref<any[]>([]);

// Edit Modal State
const showEditModal = ref(false);
const activeUnit = ref<RoomUnit | null>(null);

// Add Unit Modal State
const showAddModal = ref(false);
const newUnitCode = ref('');
const newCluster = ref<'BH' | 'Back Apartment' | 'Penthouse' | 'Front Apartment' | 'Linda'>('BH');
const newType = ref('Studio');
const newPrice = ref(4500);
const newStatus = ref<'Available' | 'Reserved' | 'Occupied' | 'Under Maintenance'>('Available');
const newWaterRateType = ref<'standard' | 'linda_fixed'>('standard');

async function loadData() {
  loading.value = true;
  try {
    const [roomsData, tenantsData] = await Promise.all([
      api.get<any[]>('/admin/rooms'),
      api.get<any[]>('/admin/tenants')
    ]);

    apiTenants.value = tenantsData;

    apiRooms.value = roomsData.map(r => {
      // Find active tenant assignment for this room number
      const matchedTenant = tenantsData.find(t => {
        const activeAssign = t.room_assignments?.find((a: any) => a.is_active);
        return activeAssign?.rooms?.room_number === r.room_number;
      });

      return {
        id: r.id,
        unitCode: r.room_number,
        clusterCode: r.cluster_code,
        clusterName: r.clusters?.name || r.cluster_code,
        type: r.room_type || 'Studio',
        price: Number(r.current_price),
        status: r.operational_status,
        isLinda: r.is_linda_unit,
        tenant: matchedTenant ? matchedTenant.full_name : ''
      };
    });
  } catch (err: any) {
    console.error('Failed to load room directory:', err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const PROPERTY_CLUSTERS = [
  { code: 'BH', name: 'BH (Main Rooms)' },
  { code: 'Back Apartment', name: 'Back Apartment' },
  { code: 'Penthouse', name: 'Penthouse' },
  { code: 'Front Apartment', name: 'Front Apartment' },
  { code: 'Linda', name: 'Linda Special Units' }
];

const filteredUnits = computed(() => {
  return apiRooms.value.filter(unit => {
    const matchesSearch = search.value === '' || 
      unit.unitCode.toLowerCase().includes(search.value.toLowerCase()) ||
      unit.tenant.toLowerCase().includes(search.value.toLowerCase()) ||
      unit.type.toLowerCase().includes(search.value.toLowerCase());
    const matchesCluster = selectedCluster.value === 'all' || unit.clusterCode === selectedCluster.value || unit.clusterName === selectedCluster.value;
    return matchesSearch && matchesCluster;
  });
});

const openEditModal = (unit: RoomUnit) => {
  activeUnit.value = { ...unit };
  showEditModal.value = true;
};

const saveUnitChanges = async () => {
  if (!activeUnit.value) return;
  try {
    await api.patch(`/admin/rooms/${activeUnit.value.id}`, {
      current_price: activeUnit.value.price,
      operational_status: activeUnit.value.status
    });
    
    showToast('success', 'Unit Specs Saved', `Successfully updated Unit ${activeUnit.value.unitCode}.`);
    showEditModal.value = false;
    await loadData();
  } catch (err: any) {
    alert(`Failed to save changes: ${err.message}`);
  }
};

const confirmDeleteRoom = (unit: RoomUnit) => {
  requestSecondaryConfirm({
    title: 'Confirm Room Unit Deletion',
    message: `Are you sure you want to delete Unit ${unit.unitCode} from the property spec? This will permanently remove its pricing history and settings.`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Delete Unit Spec',
    onConfirm: async () => {
      try {
        await api.delete(`/admin/rooms/${unit.id}`);
        showToast('warning', 'Unit Deleted', `Unit ${unit.unitCode} has been deleted successfully.`);
        await loadData();
      } catch (err: any) {
        alert(`Failed to delete unit: ${err.message}`);
      }
    }
  });
};

const handleAddUnitSpec = async () => {
  if (!newUnitCode.value) return;
  try {
    await api.post('/admin/rooms', {
      cluster_code: newCluster.value,
      room_number: newUnitCode.value.trim(),
      room_type: newType.value,
      current_price: newPrice.value,
      operational_status: newStatus.value,
      is_linda_unit: newWaterRateType.value === 'linda_fixed'
    });

    showToast('success', 'Unit Spec Created', `Successfully added Unit ${newUnitCode.value}.`);
    
    // Reset form
    newUnitCode.value = '';
    newPrice.value = 4500;
    showAddModal.value = false;
    
    await loadData();
  } catch (err: any) {
    alert(`Failed to create unit spec: ${err.message}`);
  }
};
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto">
    <!-- Header Title & Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Room Directory</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">32 Units & Rate Directory</h1>
        <p class="text-xs text-[#5e6c84]">View and configure room specifications, occupancy statuses, and monthly pricing</p>
      </div>

      <button 
        @click="showAddModal = true" 
        class="jira-btn-primary bg-[#0c66e4] hover:bg-[#0052cc] text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer text-white font-bold"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Add Unit Specification</span>
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="jira-card p-4 bg-white border border-[#dfe1e6] flex flex-col md:flex-row items-center justify-between gap-4 rounded-lg shadow-xs">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Search by unit code, type, contact name..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:outline-none"
        />
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto text-xs">
        <span class="text-[#5e6c84] font-bold uppercase">Property Cluster:</span>
        <select 
          v-model="selectedCluster" 
          class="jira-input font-bold text-xs py-1.5 px-3 min-w-[200px]"
        >
          <option value="all">All Property Clusters ({{ apiRooms.length }} Units)</option>
          <option v-for="cluster in PROPERTY_CLUSTERS" :key="cluster.code" :value="cluster.code">
            {{ cluster.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Spaced and Mobile-Ready Directory Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6] rounded-lg">
      <div class="overflow-x-auto w-full">
        <!-- min-w-[1100px] ensures columns never squash or overlap, scrollbar takes care of small viewports -->
        <table class="w-full text-left border-collapse text-xs min-w-[1100px]">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
              <th class="py-3.5 px-5">Unit Code</th>
              <th class="py-3.5 px-5">Cluster / Location</th>
              <th class="py-3.5 px-5">Unit Type</th>
              <th class="py-3.5 px-5">Water Billing Rule</th>
              <th class="py-3.5 px-5">Monthly Rate</th>
              <th class="py-3.5 px-5">Status</th>
              <th class="py-3.5 px-5">Assigned Primary Contact</th>
              <th class="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loading">
              <td colspan="8" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">Loading unit directory...</td>
            </tr>
            <tr v-else-if="filteredUnits.length === 0">
              <td colspan="8" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">No unit specifications found matching criteria.</td>
            </tr>
            <tr 
              v-for="unit in filteredUnits" 
              :key="unit.id" 
              class="hover:bg-[#f7f8f9] transition-colors border-b border-[#dfe1e6]/60"
            >
              <!-- Unit Code -->
              <td class="py-4 px-5 font-black text-[#172b4d] text-sm font-subtle-num">
                Unit {{ unit.unitCode }}
              </td>
              
              <!-- Cluster Location -->
              <td class="py-4 px-5 font-medium text-[#42526e]">
                {{ unit.clusterName }}
              </td>
              
              <!-- Room Type -->
              <td class="py-4 px-5 text-[#5e6c84] font-medium">{{ unit.type }}</td>
              
              <!-- Billing Exception Tag -->
              <td class="py-4 px-5">
                <span v-if="unit.isLinda" class="px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#fffae6] text-[#826100] border border-[#ffe380]">
                  BR-040 Fixed
                </span>
                <span v-else class="text-[#6b778c] font-medium">
                  Standard (₱200/head)
                </span>
              </td>
              
              <!-- Monthly Base Rent -->
              <td class="py-4 px-5 font-bold text-[#172b4d] text-sm font-subtle-num">
                ₱{{ unit.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </td>
              
              <!-- Operational Status Pill -->
              <td class="py-4 px-5">
                <span 
                  :class="[
                    'px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider',
                    unit.status.toLowerCase() === 'occupied' ? 'bg-[#e3fcef] text-[#006644]' :
                    unit.status.toLowerCase() === 'available' ? 'bg-[#deebff] text-[#0747a6]' :
                    unit.status.toLowerCase() === 'reserved' ? 'bg-[#fff0b3] text-[#172b4d]' :
                    'bg-[#ffebe6] text-[#bf2600]'
                  ]"
                >
                  {{ unit.status }}
                </span>
              </td>
              
              <!-- Assigned Primary Contact (Directly Linked to Active Assignments) -->
              <td class="py-4 px-5">
                <div v-if="unit.tenant" class="font-bold text-[#0c66e4]">
                  {{ unit.tenant }}
                </div>
                <div v-else class="text-gray-400 italic">
                  Vacant Unit
                </div>
              </td>
              
              <!-- Actions -->
              <td class="py-4 px-5 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button 
                    @click="openEditModal(unit)" 
                    class="p-2 hover:bg-[#deebff] text-[#0747a6] rounded-md border border-[#dfe1e6] transition-colors cursor-pointer inline-flex items-center justify-center"
                    title="Configure Specifications"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button 
                    @click="confirmDeleteRoom(unit)" 
                    class="p-2 hover:bg-[#ffebe6] text-[#bf2600] rounded-md border border-[#dfe1e6] hover:border-red-200 transition-colors cursor-pointer inline-flex items-center justify-center"
                    title="Delete Unit Spec"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- UPDATE MODAL: Rate & Status (Locked Primary Contact) -->
    <div v-if="showEditModal && activeUnit" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Edit Specs — Unit {{ activeUnit.unitCode }}</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <form @submit.prevent="saveUnitChanges" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Monthly Rent Rate (₱)</label>
            <input 
              v-model.number="activeUnit.price" 
              type="number" 
              required
              class="w-full px-3.5 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold text-base focus:bg-white focus:outline-none" 
            />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Operational Status</label>
            <select 
              v-model="activeUnit.status"
              class="w-full px-3.5 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] font-semibold focus:bg-white focus:outline-none"
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#6b778c] mb-1.5 uppercase tracking-wider text-[10px]">Assigned Primary Contact</label>
            <input 
              :value="activeUnit.tenant || 'Vacant'" 
              type="text" 
              disabled
              class="w-full px-3.5 py-2 bg-[#ebecf0] border border-[#dfe1e6] rounded-md text-[#7a869a] cursor-not-allowed font-semibold" 
            />
            <p class="text-[9px] text-[#6b778c] mt-1 italic">
              Tenant assignments are managed via the <a href="/admin/tenants" class="text-[#0c66e4] hover:underline font-bold">Tenant Directory</a>.
            </p>
          </div>

          <!-- Price Increase Capping Guidance (BR-032) -->
          <div class="p-3 bg-[#deebff] border border-[#b3d4ff] rounded-md text-[#0747a6]">
            <p class="font-bold mb-1 flex items-center gap-1 text-[11px]">
              <ShieldCheck class="w-4 h-4 shrink-0" /> 2% Annual Price Cap Guidance
            </p>
            <p class="text-[10px] leading-relaxed">
              Recommended annual price ceiling limit for Unit {{ activeUnit.unitCode }}: <strong>₱{{ Math.round((activeUnit.price || 0) * 1.02).toLocaleString() }}</strong>. Rate logs are registered in the security trail.
            </p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showEditModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Save Changes</button>
          </div>
        </form>
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
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Unit Code *</label>
            <input 
              v-model="newUnitCode" 
              type="text" 
              placeholder="e.g. 4a or B4F"
              required
              class="w-full px-3.5 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold focus:bg-white focus:outline-none" 
            />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Property Cluster</label>
            <select v-model="newCluster" class="w-full px-3.5 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none">
              <option value="BH">BH (Main Rooms)</option>
              <option value="Back Apartment">Back Apartment</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Front Apartment">Front Apartment</option>
              <option value="Linda">Linda Special Units</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Unit Type</label>
              <input v-model="newType" type="text" placeholder="Studio / 1-Bedroom" class="w-full px-3.5 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Monthly Base Price (₱)</label>
              <input v-model.number="newPrice" type="number" required class="w-full px-3.5 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold focus:bg-white focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Water Billing Exception</label>
            <select v-model="newWaterRateType" class="w-full px-3.5 py-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none">
              <option value="standard">Standard (₱200/head)</option>
              <option value="linda_fixed">Linda Special Fixed Rate (BR-040)</option>
            </select>
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
