<!--
  @file views/TenantManagementView.vue
  @description Active Tenant Directory and Onboarding Management module with Onboard, Edit, and Delete features.
  @systemBibleRef Section 5.3 - tenant_profiles & room_assignments
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, UserPlus, Edit, Trash2, MessageSquare } from 'lucide-vue-next';
import { tenants, rooms, addTenant, updateTenant, deleteTenant, openTenantChat, requestSecondaryConfirm, type TenantProfile } from '@/lib/systemState';


const search = ref('');

// Onboard Modal State
const showOnboardModal = ref(false);
const newTenantName = ref('');
const newTenantRoom = ref('1c');
const newTenantPhone = ref('');
const newTenantEmergency = ref('');
const newTenantMoveIn = ref(new Date().toISOString().split('T')[0]);

// Edit Modal State
const showEditModal = ref(false);
const activeTenant = ref<TenantProfile | null>(null);

// Delete Modal State
const showDeleteModal = ref(false);
const tenantToDelete = ref<TenantProfile | null>(null);

const filteredTenants = computed(() => {
  if (!search.value) return tenants;
  const q = search.value.toLowerCase();
  return tenants.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.room.toLowerCase().includes(q) || 
    t.phone.includes(q)
  );
});

const handleOnboardSubmit = () => {
  if (!newTenantName.value) return;
  addTenant({
    name: newTenantName.value,
    room: newTenantRoom.value,
    phone: newTenantPhone.value || '0917-000-0000',
    emergency: newTenantEmergency.value || 'N/A',
    moveInDate: newTenantMoveIn.value,
    status: 'Active'
  });

  // Reset form
  newTenantName.value = '';
  newTenantPhone.value = '';
  newTenantEmergency.value = '';
  showOnboardModal.value = false;
};

const openEditModal = (t: TenantProfile) => {
  activeTenant.value = JSON.parse(JSON.stringify(t));
  showEditModal.value = true;
};

const handleEditSubmit = () => {
  if (!activeTenant.value) return;
  updateTenant(activeTenant.value.id, {
    name: activeTenant.value.name,
    room: activeTenant.value.room,
    phone: activeTenant.value.phone,
    emergency: activeTenant.value.emergency,
    status: activeTenant.value.status
  });
  showEditModal.value = false;
};

const confirmDelete = (t: TenantProfile) => {
  tenantToDelete.value = t;
  requestSecondaryConfirm({
    title: 'Confirm Tenant Eviction / Removal',
    message: `Are you sure you want to remove tenant ${t.name} from Unit ${t.room}? This will mark Unit ${t.room} as Available.`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Confirm Removal',
    onConfirm: () => {
      deleteTenant(t.id);
    }
  });
};

const handleDeleteExecute = () => {
  if (tenantToDelete.value) {
    confirmDelete(tenantToDelete.value);
  }
};
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Tenant Management</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Active Tenant Directory</h1>
      </div>

      <button 
        @click="showOnboardModal = true" 
        class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer"
      >
        <UserPlus class="w-3.5 h-3.5" />
        <span>Onboard Tenant</span>
      </button>
    </div>

    <!-- Search Bar -->
    <div class="jira-card p-3 bg-white border border-[#dfe1e6]">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Search tenant name, unit code, phone..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:outline-none"
        />
      </div>
    </div>

    <!-- Responsive Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6]">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Tenant Profile</th>
              <th class="py-2.5 px-3">Assigned Canonical Unit</th>
              <th class="py-2.5 px-3">Contact Details</th>
              <th class="py-2.5 px-3">Emergency Contact</th>
              <th class="py-2.5 px-3">Move-In Date</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="t in filteredTenants" :key="t.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ t.name }}</td>
              <td class="py-2.5 px-3 font-semibold text-[#0c66e4]">Unit {{ t.room }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.phone }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.emergency }}</td>
              <td class="py-2.5 px-3">{{ t.moveInDate }}</td>
              <td class="py-2.5 px-3">
                <span 
                  :class="[
                    'px-2 py-0.5 text-xs font-bold rounded-full',
                    t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ t.status }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button @click="openTenantChat(t.name, t.room)" class="px-2 py-1 bg-[#e3fcef] hover:bg-[#abf5d1] text-[#006644] font-bold rounded-md flex items-center gap-1 cursor-pointer text-[11px]" title="Chat with Tenant in Messenger">
                    <MessageSquare class="w-3.5 h-3.5 text-[#006644]" />
                    <span>Chat</span>
                  </button>
                  <button @click="openEditModal(t)" class="p-1 hover:bg-[#ebecf0] rounded-2xs text-[#0c66e4] cursor-pointer" title="Edit Tenant Profile">
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                  <button @click="confirmDelete(t)" class="p-1 hover:bg-[#ffebe6] rounded-2xs text-red-600 cursor-pointer" title="Delete / Offboard Tenant">
                    <Trash2 class="w-3.5 h-3.5" />
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
          <button @click="showOnboardModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer">✕</button>
        </div>

        <form @submit.prevent="handleOnboardSubmit" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1">Full Name *</label>
            <input v-model="newTenantName" type="text" placeholder="e.g. Gabriel Fernandez" required class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold" />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Assign Unit</label>
            <select v-model="newTenantRoom" class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">Unit {{ r.unitCode }} ({{ r.cluster }})</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Phone Number</label>
              <input v-model="newTenantPhone" type="text" placeholder="0917-123-4567" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Move-In Date</label>
              <input v-model="newTenantMoveIn" type="date" required class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Emergency Contact</label>
            <input v-model="newTenantEmergency" type="text" placeholder="e.g. Maria Fernandez (Mother - 0918-111-2222)" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showOnboardModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Onboard Tenant</button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT TENANT MODAL -->
    <div v-if="showEditModal && activeTenant" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Edit Tenant Profile</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer">✕</button>
        </div>

        <form @submit.prevent="handleEditSubmit" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-[#42526e] mb-1">Full Name</label>
            <input v-model="activeTenant.name" type="text" required class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] font-bold" />
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Assigned Unit</label>
            <select v-model="activeTenant.room" class="w-full px-3.5 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">Unit {{ r.unitCode }} ({{ r.cluster }})</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Phone</label>
              <input v-model="activeTenant.phone" type="text" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-bold text-[#42526e] mb-1">Status</label>
              <select v-model="activeTenant.status" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]">
                <option value="Active">Active</option>
                <option value="Overdue">Overdue</option>
                <option value="Vacated">Vacated</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#42526e] mb-1">Emergency Contact</label>
            <input v-model="activeTenant.emergency" type="text" class="w-full px-3.5 py-2 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d]" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="showEditModal = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Cancel</button>
            <button type="submit" class="jira-btn-primary bg-[#054e38] text-white px-4 py-2 text-xs font-semibold cursor-pointer">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- DELETE CONFIRMATION MODAL -->
    <div v-if="showDeleteModal && tenantToDelete" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-sm p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <h3 class="font-bold text-base text-[#172b4d]">Confirm Offboard / Delete</h3>
        <p class="text-xs text-[#5e6c84]">
          Are you sure you want to remove <strong>{{ tenantToDelete.name }}</strong> (Unit {{ tenantToDelete.room }})? This will mark Unit {{ tenantToDelete.room }} as available.
        </p>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#dfe1e6]">
          <button @click="showDeleteModal = false" class="jira-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
          <button @click="handleDeleteExecute" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer">Delete Profile</button>
        </div>
      </div>
    </div>
  </div>
</template>
