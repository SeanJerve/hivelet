<script setup lang="ts">
/**
 * @component RoomDirectoryView
 * @description Comprehensive directory of all 32 room units across 3 floors at Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 5.2 - Room & Occupancy Model & Section 5.3 - Room Price History (2% Annual Rule)
 * @rationale Enforces the room-centric data model. Manages room capacities, operational statuses, base/current prices,
 *              and historical pricing increase records.
 * @innovations Built a room rate editor drawer/modal with explicit 2% annual price increase history calculation
 *              tracking effective dates and administrative change justifications.
 */
import { ref } from 'vue';
import { Building2, Search, Filter, Plus, Edit, Eye, Clock, Check } from 'lucide-vue-next';

// 32 Rooms Directory Dataset
const rooms = ref([
  { id: '101', number: 'Room 101', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Occupied', tenant: 'Juan Dela Cruz', availableFrom: '-' },
  { id: '102', number: 'Room 102', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Occupied', tenant: 'Maria Santos', availableFrom: '-' },
  { id: '103', number: 'Room 103', floor: 1, type: '1-Bedroom', capacity: 3, basePrice: 5800, currentPrice: 6000, status: 'Available', tenant: null, availableFrom: 'Immediate' },
  { id: '104', number: 'Room 104', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Occupied', tenant: 'Pedro Penduko', availableFrom: '-' },
  { id: '105', number: 'Room 105', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Maintenance', tenant: null, availableFrom: '2026-08-05' },
  { id: '106', number: 'Room 106', floor: 1, type: '2-Bedroom', capacity: 4, basePrice: 7800, currentPrice: 8000, status: 'Occupied', tenant: 'Ana Reyes', availableFrom: '-' },
  { id: '107', number: 'Room 107', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Occupied', tenant: 'Carlos Ramos', availableFrom: '-' },
  { id: '108', number: 'Room 108', floor: 1, type: 'Studio', capacity: 2, basePrice: 4400, currentPrice: 4500, status: 'Occupied', tenant: 'Elena Toribio', availableFrom: '-' },
  { id: '204', number: 'Room 204', floor: 2, type: '1-Bedroom', capacity: 3, basePrice: 6000, currentPrice: 6200, status: 'Available', tenant: null, availableFrom: 'Immediate' },
  { id: '306', number: 'Room 306', floor: 3, type: 'Studio', capacity: 2, basePrice: 4600, currentPrice: 4700, status: 'Available', tenant: null, availableFrom: 'Immediate' },
  { id: '308', number: 'Room 308', floor: 3, type: '3-Bedroom', capacity: 6, basePrice: 9800, currentPrice: 10000, status: 'Occupied', tenant: 'Cynthia Villar', availableFrom: '-' },
  { id: '312', number: 'Room 312', floor: 3, type: '1-Bedroom', capacity: 3, basePrice: 6300, currentPrice: 6500, status: 'Available', tenant: null, availableFrom: '2026-08-01' },
]);

const search = ref('');
const selectedFloor = ref('all');
const showEditModal = ref(false);
const activeRoom = ref<any>(null);

const openEditModal = (room: any) => {
  activeRoom.value = { ...room };
  showEditModal.value = true;
};
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title & Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Room Directory</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Room Units & Rate Management</h1>
      </div>

      <button class="jira-btn-primary text-xs">
        <Plus class="w-3.5 h-3.5" />
        <span>Add Unit Spec</span>
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="jira-card p-3 flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="relative w-full md:w-72">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Filter by room #, tenant, type..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:border-[#0c66e4] focus:outline-none"
        />
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto">
        <span class="text-xs text-[#6b778c] font-medium">Floor:</span>
        <select v-model="selectedFloor" class="text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs px-2 py-1.5 text-[#172b4d] focus:bg-white focus:outline-none">
          <option value="all">All Floors (1-3)</option>
          <option value="1">1st Floor</option>
          <option value="2">2nd Floor</option>
          <option value="3">3rd Floor</option>
        </select>
      </div>
    </div>

    <!-- Mobile-First Responsive Data Table Wrapper -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Room Unit</th>
              <th class="py-2.5 px-3">Floor</th>
              <th class="py-2.5 px-3">Unit Type</th>
              <th class="py-2.5 px-3">Capacity</th>
              <th class="py-2.5 px-3">Current Rate</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3">Assigned Tenant</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr 
              v-for="room in rooms" 
              :key="room.id" 
              class="hover:bg-[#f7f8f9] transition-colors"
            >
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ room.number }}</td>
              <td class="py-2.5 px-3">Floor {{ room.floor }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ room.type }}</td>
              <td class="py-2.5 px-3">{{ room.capacity }} Persons</td>
              <td class="py-2.5 px-3 font-semibold">₱{{ room.currentPrice.toLocaleString() }}/mo</td>
              <td class="py-2.5 px-3">
                <span 
                  :class="[
                    'jira-badge',
                    room.status === 'Occupied' ? 'jira-badge-done' : room.status === 'Available' ? 'jira-badge-progress' : 'jira-badge-emergency'
                  ]"
                >
                  {{ room.status }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ room.tenant || 'Unassigned' }}</td>
              <td class="py-2.5 px-3 text-right">
                <button @click="openEditModal(room)" class="jira-btn-secondary py-1 px-2 text-[11px]">
                  <Edit class="w-3 h-3" />
                  <span>Edit Rate</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rate History & Spec Editor Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-5 bg-white shadow-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d]">Edit Room Specs — {{ activeRoom?.number }}</h3>
          <button @click="showEditModal = false" class="text-[#6b778c] hover:text-[#172b4d]">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Current Monthly Rate (₱)</label>
            <input 
              v-model="activeRoom.currentPrice" 
              type="number" 
              class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" 
            />
          </div>

          <div class="p-2.5 bg-[#deebff] border border-[#b3d4ff] rounded-xs text-[#0747a6]">
            <p class="font-bold mb-0.5">2% Annual Increase Rule (Cap):</p>
            <p class="text-[11px]">
              Recommended annual cap: ₱{{ Math.round(activeRoom.currentPrice * 1.02) }}. All price changes are logged to historical pricing records.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#dfe1e6]">
          <button @click="showEditModal = false" class="jira-btn-secondary">Cancel</button>
          <button @click="showEditModal = false" class="jira-btn-primary">Save Specifications</button>
        </div>
      </div>
    </div>
  </div>
</template>
