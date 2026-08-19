<!--
  @file views/TenantManagementView.vue
  @description Active Tenant Directory and Onboarding Management module with clean visual grouping, sorting, filtering, and database connectivity.
  @systemBibleRef Section 5.3 - tenant_profiles & room_assignments
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, UserPlus, Edit, Trash2, MessageSquare, X, Filter } from 'lucide-vue-next';
import { api } from '@/lib/api';
import { openTenantChat, requestSecondaryConfirm, showToast } from '@/lib/systemState';

interface TenantProfile {
  id: string;
  name: string;
  email: string;
  room: string;
  phone: string;
  emergency: string;
  moveInDate: string;
  status: 'Active' | 'Inactive';
}

const search = ref('');
const loading = ref(false);
const apiTenants = ref<TenantProfile[]>([]);
const apiRooms = ref<any[]>([]);

// Filter and Sort states
const sortOrder = ref<'room-asc' | 'newest' | 'oldest' | 'alpha' | 'alpha-desc'>('room-asc');
const floorFilter = ref<'all' | '1st' | '2nd' | '3rd' | 'other'>('all');

// Onboard Modal State
const showOnboardModal = ref(false);
const newTenantName = ref('');
const newTenantEmail = ref('');
const newTenantRoom = ref('');
const newTenantPhone = ref('');
const newTenantEmergency = ref('');
const newTenantMoveIn = ref(new Date().toISOString().split('T')[0]);

// Edit Modal State
const showEditModal = ref(false);
const activeTenant = ref<TenantProfile | null>(null);

// Delete Modal State
const tenantToDelete = ref<TenantProfile | null>(null);

async function fetchTenants() {
  loading.value = true;
  try {
    const list = await api.get<any[]>('/admin/tenants');
    apiTenants.value = list.map(t => {
      const activeAssign = t.room_assignments?.find((a: any) => a.is_active);
      return {
        id: t.id,
        name: t.full_name,
        email: t.email,
        room: activeAssign?.rooms?.room_number || 'Unassigned',
        phone: t.phone_number || 'N/A',
        emergency: `${t.emergency_contact_name || 'N/A'} (${t.emergency_contact_phone || 'N/A'})`,
        moveInDate: activeAssign?.start_date ? new Date(activeAssign.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
        status: t.account_status === 'active' ? 'Active' : 'Inactive',
      };
    });
  } catch (err: any) {
    console.error('Failed to load tenants:', err.message);
  } finally {
    loading.value = false;
  }
}

async function fetchRooms() {
  try {
    const list = await api.get<any[]>('/admin/rooms');
    apiRooms.value = list.map(r => ({
      id: r.id,
      unitCode: r.room_number,
      cluster: r.clusters?.name || r.cluster_code,
      status: r.operational_status,
    }));
  } catch (err: any) {
    console.error('Failed to load rooms:', err.message);
  }
}

onMounted(async () => {
  await fetchTenants();
  await fetchRooms();
});

// Parse Floor label from Unit Code
function getFloor(roomCode: string): string {
  if (!roomCode || roomCode === 'Unassigned') return 'Unassigned';
  const firstChar = roomCode.charAt(0);
  if (firstChar === '1') return '1st Floor';
  if (firstChar === '2') return '2nd Floor';
  if (firstChar === '3') return '3rd Floor';
  return 'Other Floor';
}

const filteredTenants = computed(() => {
  let list = [...apiTenants.value];

  // 1. Search matching
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.room.toLowerCase().includes(q) || 
      t.phone.includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  }

  // 2. Floor filter
  if (floorFilter.value !== 'all') {
    list = list.filter(t => {
      const parsedFloor = getFloor(t.room);
      if (floorFilter.value === '1st') return parsedFloor === '1st Floor';
      if (floorFilter.value === '2nd') return parsedFloor === '2nd Floor';
      if (floorFilter.value === '3rd') return parsedFloor === '3rd Floor';
      if (floorFilter.value === 'other') return parsedFloor === 'Other Floor' || parsedFloor === 'Unassigned';
      return true;
    });
  }

  // 3. Sorting Logic
  list.sort((a, b) => {
    if (sortOrder.value === 'room-asc') {
      if (a.room === 'Unassigned') return 1;
      if (b.room === 'Unassigned') return -1;
      return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (sortOrder.value === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    if (sortOrder.value === 'alpha-desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortOrder.value === 'newest') {
      if (a.moveInDate === 'N/A') return 1;
      if (b.moveInDate === 'N/A') return -1;
      return new Date(b.moveInDate).getTime() - new Date(a.moveInDate).getTime();
    }
    if (sortOrder.value === 'oldest') {
      if (a.moveInDate === 'N/A') return 1;
      if (b.moveInDate === 'N/A') return -1;
      return new Date(a.moveInDate).getTime() - new Date(b.moveInDate).getTime();
    }
    return 0;
  });

  return list;
});

const handleOnboardSubmit = () => {
  if (!newTenantName.value || !newTenantEmail.value) return;

  requestSecondaryConfirm({
    title: 'Review & Confirm Tenant Onboarding',
    message: `Please review the new tenant onboarding profile before assigning to Unit ${newTenantRoom.value || 'Unassigned'}:`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Confirm & Onboard Tenant',
    summaryFields: [
      { label: 'Tenant Full Name', value: newTenantName.value, highlight: true },
      { label: 'Email Address', value: newTenantEmail.value },
      { label: 'Assigned Unit / Room', value: newTenantRoom.value ? `Unit ${newTenantRoom.value}` : 'Unassigned' },
      { label: 'Contact Phone', value: newTenantPhone.value || 'N/A' },
      { label: 'Emergency Contact', value: newTenantEmergency.value || 'N/A' },
      { label: 'Official Move-In Date', value: newTenantMoveIn.value }
    ],
    onConfirm: async () => {
      try {
        await api.post('/admin/tenants', {
          email: newTenantEmail.value.trim().toLowerCase(),
          fullName: newTenantName.value.trim(),
          phone: newTenantPhone.value.trim() || undefined,
          emergencyContactName: newTenantEmergency.value.trim() || undefined,
          roomNumber: newTenantRoom.value || undefined,
          moveInDate: newTenantMoveIn.value,
        });

        showToast('success', 'Tenant Onboarded', `Tenant ${newTenantName.value} has been assigned to Unit ${newTenantRoom.value || 'Unassigned'}.`);
        
        // Reset fields
        newTenantName.value = '';
        newTenantEmail.value = '';
        newTenantPhone.value = '';
        newTenantEmergency.value = '';
        showOnboardModal.value = false;
        
        // Reload directories
        await fetchTenants();
        await fetchRooms();
      } catch (err: any) {
        alert(`Onboarding failed: ${err.message}`);
      }
    }
  });
};

const openEditModal = (t: TenantProfile) => {
  activeTenant.value = { ...t };
  showEditModal.value = true;
};

const handleEditSubmit = async () => {
  if (!activeTenant.value) return;
  const t = activeTenant.value;

  try {
    await api.patch(`/admin/tenants/${t.id}`, {
      fullName: t.name,
      phone: t.phone,
      emergencyContactName: t.emergency,
      roomNumber: t.room === 'Unassigned' ? '' : t.room,
      accountStatus: t.status === 'Active' ? 'active' : 'inactive'
    });

    showToast('info', 'Tenant Updated', `Profile for ${t.name} updated successfully.`);
    showEditModal.value = false;
    
    await fetchTenants();
    await fetchRooms();
  } catch (err: any) {
    alert(`Failed to save changes: ${err.message}`);
  }
};

const confirmDelete = (t: TenantProfile) => {
  tenantToDelete.value = t;
  requestSecondaryConfirm({
    title: 'Confirm Tenant Eviction / Removal',
    message: `Are you sure you want to remove tenant ${t.name} from Unit ${t.room}? This will mark their profile as Inactive and their Unit as Available.`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Confirm Removal',
    onConfirm: async () => {
      try {
        await api.patch(`/admin/tenants/${t.id}`, {
          accountStatus: 'inactive',
          roomNumber: '' 
        });

        showToast('warning', 'Tenant Offboarded', `Tenant ${t.name} offboarded.`);
        
        await fetchTenants();
        await fetchRooms();
      } catch (err: any) {
        alert(`Failed to offboard tenant: ${err.message}`);
      }
    }
  });
};
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Operations</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Tenant Directory</span>
        </div>
        <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Tenant Management & Onboarding</h1>
        <p class="text-xs text-[#5e6c84]">Direct centralized tracking of 32 unit assignments and contact details</p>
      </div>

      <button 
        @click="showOnboardModal = true" 
        class="jira-btn-primary bg-[#0c66e4] hover:bg-[#0052cc] text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer text-white font-bold"
      >
        <UserPlus class="w-3.5 h-3.5" />
        <span>Onboard Tenant</span>
      </button>
    </div>

    <!-- Filter and Sort Controls -->
    <div class="jira-card p-4 bg-white border border-[#dfe1e6] flex flex-wrap items-center justify-between gap-4 rounded-lg shadow-xs">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Search tenant name, unit, email..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:outline-none"
        />
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <!-- Floor Filter -->
        <div class="flex items-center gap-1.5 text-xs">
          <Filter class="w-3.5 h-3.5 text-[#5e6c84]" />
          <span class="font-bold text-[#5e6c84] uppercase">Floor Filter:</span>
          <select v-model="floorFilter" class="jira-input py-1 px-2.5 text-xs font-bold min-w-[120px]">
            <option value="all">All Floors</option>
            <option value="1st">1st Floor</option>
            <option value="2nd">2nd Floor</option>
            <option value="3rd">3rd Floor</option>
            <option value="other">Other / Unassigned</option>
          </select>
        </div>

        <!-- Sort Filter -->
        <div class="flex items-center gap-1.5 text-xs">
          <span class="font-bold text-[#5e6c84] uppercase">Sort By:</span>
          <select v-model="sortOrder" class="jira-input py-1 px-2.5 text-xs font-bold min-w-[150px]">
            <option value="room-asc">Unit Code (Asc)</option>
            <option value="newest">Newest Resident</option>
            <option value="oldest">Oldest Resident</option>
            <option value="alpha">Alphabetical (A-Z)</option>
            <option value="alpha-desc">Alphabetical (Z-A)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Responsive Mobile-Ready Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6] rounded-lg">
      <div class="overflow-x-auto w-full">
        <table class="w-full text-left border-collapse text-xs min-w-[800px] sm:min-w-0">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
              <th class="py-3 px-4">Resident</th>
              <th class="py-3 px-4">Room Assignment</th>
              <th class="py-3 px-4">Contact Phone</th>
              <th class="py-3 px-4">Move-In Date</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loading">
              <td colspan="6" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">Loading tenant profiles...</td>
            </tr>
            <tr v-else-if="filteredTenants.length === 0">
              <td colspan="6" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">No matching tenant records found.</td>
            </tr>
            <tr v-for="t in filteredTenants" :key="t.id" v-else class="hover:bg-[#f7f8f9] transition-colors border-b border-[#dfe1e6]/60">
              <!-- Combined Resident Name + Email -->
              <td class="py-3.5 px-4">
                <div class="font-bold text-[#172b4d] text-sm">{{ t.name }}</div>
                <div class="text-[#5e6c84] text-[11px] font-mono mt-0.5">{{ t.email }}</div>
              </td>
              
              <!-- Combined Assigned Unit + Floor -->
              <td class="py-3.5 px-4">
                <span class="font-bold text-[#0c66e4] text-sm block">
                  {{ t.room === 'Unassigned' ? 'Unassigned' : 'Unit ' + t.room }}
                </span>
                <span v-if="t.room !== 'Unassigned'" class="text-[10px] font-bold text-[#6b778c] uppercase tracking-wide mt-0.5 block">
                  {{ getFloor(t.room) }}
                </span>
              </td>
              
              <!-- Contact Phone -->
              <td class="py-3.5 px-4 text-[#5e6c84] font-medium font-subtle-num text-sm">
                {{ t.phone }}
              </td>
              
              <!-- Move-in Date -->
              <td class="py-3.5 px-4 text-[#172b4d] font-subtle-num">
                {{ t.moveInDate }}
              </td>
              
              <!-- Status Pill -->
              <td class="py-3.5 px-4">
                <span 
                  :class="[
                    'px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider',
                    t.status === 'Active' ? 'bg-[#e3fcef] text-[#006644]' : 'bg-[#ffebe6] text-[#bf2600]'
                  ]"
                >
                  {{ t.status }}
                </span>
              </td>
              
              <!-- Actions -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openTenantChat(t.name, t.room)" class="p-2 hover:bg-[#e3fcef] text-[#006644] rounded-md border border-emerald-200 transition-colors cursor-pointer" title="Direct Chat">
                    <MessageSquare class="w-4 h-4" />
                  </button>
                  <button @click="openEditModal(t)" class="p-2 hover:bg-[#deebff] text-[#0747a6] rounded-md border border-blue-200 transition-colors cursor-pointer" title="Edit Tenant Profile">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click="confirmDelete(t)" class="p-2 hover:bg-[#ffebe6] text-[#bf2600] rounded-md border border-red-200 transition-colors cursor-pointer" title="Offboard Tenant">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ONBOARD TENANT MODAL -->
    <div v-if="showOnboardModal" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Onboard New Tenant</h3>
          <button @click="showOnboardModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <form @submit.prevent="handleOnboardSubmit" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Full Name *</label>
            <input v-model="newTenantName" type="text" placeholder="e.g. Gabriel Fernandez" required class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold focus:bg-white focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Email Address *</label>
            <input v-model="newTenantEmail" type="email" placeholder="tenant@example.com" required class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Assign Unit</label>
            <select v-model="newTenantRoom" class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none">
              <option value="">Leave Unassigned</option>
              <option v-for="r in apiRooms" :key="r.id" :value="r.unitCode">
                Unit {{ r.unitCode }} ({{ r.cluster }}) - {{ r.status }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Phone Number</label>
              <input v-model="newTenantPhone" type="text" placeholder="0917-123-4567" class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none" />
            </div>
            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Move-In Date</label>
              <input v-model="newTenantMoveIn" type="date" required class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Emergency Contact</label>
            <input v-model="newTenantEmergency" type="text" placeholder="e.g. Maria (Mother - 0918-111-2222)" class="w-full px-3 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showOnboardModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#0c66e4] text-white px-4 py-2 text-xs font-bold rounded-md cursor-pointer">Onboard Tenant</button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT TENANT MODAL -->
    <div v-if="showEditModal && activeTenant" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Edit Tenant Profile</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <form @submit.prevent="handleEditSubmit" class="space-y-4 text-xs sm:text-sm">
          <!-- SECTION 1: EDITABLE FIELDS -->
          <div class="space-y-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Room Assignment</label>
              <select v-model="activeTenant.room" class="w-full px-3.5 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none">
                <option value="Unassigned">Leave Unassigned / Remove</option>
                <option v-for="r in apiRooms" :key="r.id" :value="r.unitCode">
                  Unit {{ r.unitCode }} ({{ r.cluster }})
                </option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#42526e] mb-1.5 uppercase tracking-wider text-[10px]">Status</label>
              <select v-model="activeTenant.status" class="w-full px-3.5 py-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md text-[#172b4d] focus:bg-white focus:outline-none">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <hr class="border-t border-[#dfe1e6]" />

          <!-- SECTION 2: LOCKED/DISABLED FIELDS -->
          <div class="space-y-3 p-3.5 bg-[#f4f5f7] rounded-md border border-[#dfe1e6]/60">
            <div>
              <label class="block font-bold text-[#6b778c] mb-1 uppercase tracking-wider text-[9px]">Resident Full Name</label>
              <input :value="activeTenant.name" type="text" disabled class="w-full px-3.5 py-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-md text-[#7a869a] cursor-not-allowed font-semibold" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-[#6b778c] mb-1 uppercase tracking-wider text-[9px]">Contact Phone</label>
                <input :value="activeTenant.phone" type="text" disabled class="w-full px-3.5 py-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-md text-[#7a869a] cursor-not-allowed font-semibold" />
              </div>
              <div>
                <label class="block font-bold text-[#6b778c] mb-1 uppercase tracking-wider text-[9px]">Move-In Date</label>
                <input :value="activeTenant.moveInDate" type="text" disabled class="w-full px-3.5 py-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-md text-[#7a869a] cursor-not-allowed font-semibold" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-[#6b778c] mb-1 uppercase tracking-wider text-[9px]">Emergency Contact</label>
              <input :value="activeTenant.emergency" type="text" disabled class="w-full px-3.5 py-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-md text-[#7a869a] cursor-not-allowed font-semibold" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showEditModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
