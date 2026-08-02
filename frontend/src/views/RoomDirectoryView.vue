<script setup lang="ts">
/**
 * @component RoomDirectoryView
 * @description Comprehensive directory of all canonical room units across 3 floors at Fe Galang Da Silva Boarding House.
 * @systemBibleRef Section 5.2 - Room & Occupancy Model & Section 5.3 - Room Price History (2% Annual Rule)
 * @rationale Enforces the room-centric data model. Manages room capacities, operational statuses, base/current prices,
 *              and historical pricing increase records.
 * @innovations Built a room rate editor drawer/modal with explicit 2% annual price increase history calculation
 *              tracking effective dates and administrative change justifications.
 */
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Edit } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';

interface RoomRow {
  id: string;
  room_number: string;
  floor: number;
  cluster_code: string;
  room_type: string;
  description: string | null;
  capacity: number;
  base_price: number;
  current_price: number;
  operational_status: 'Available' | 'Reserved' | 'Occupied' | 'Under Maintenance';
  visibility_status: 'Published' | 'Hidden';
  available_from: string | null;
  is_linda_unit: boolean;
  clusters?: { name: string } | null;
}

interface TenantInfo {
  name: string;
  occupantCount: number;
}

const authStore = useAuthStore();
const { showToast } = useToast();

const rooms = ref<RoomRow[]>([]);
const tenantByRoom = ref<Record<string, TenantInfo>>({});
const loading = ref(false);

const search = ref('');
const selectedFloor = ref('all');
const showEditModal = ref(false);
const activeRoom = ref<any>(null);
const editReason = ref('');
const saving = ref(false);

const fetchRooms = async () => {
  loading.value = true;

  const { data: roomsData, error: roomsError } = await supabase
    .from('rooms')
    .select('*, clusters(name)')
    .order('room_number');

  if (roomsError) {
    showToast('Failed to Load Rooms', roomsError.message, 'error');
    loading.value = false;
    return;
  }
  rooms.value = (roomsData as RoomRow[]) || [];

  const { data: assignData, error: assignError } = await supabase
    .from('room_assignments')
    .select('room_id, occupant_count, profiles(full_name)')
    .eq('is_active', true);

  if (assignError) {
    showToast('Failed to Load Tenant Assignments', assignError.message, 'error');
  } else {
    const map: Record<string, TenantInfo> = {};
    (assignData || []).forEach((a: any) => {
      map[a.room_id] = {
        name: a.profiles?.full_name || 'Unassigned',
        occupantCount: a.occupant_count,
      };
    });
    tenantByRoom.value = map;
  }

  loading.value = false;
};

onMounted(fetchRooms);

const filteredRooms = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rooms.value.filter((room) => {
    const floorMatch = selectedFloor.value === 'all' || String(room.floor) === selectedFloor.value;
    if (!floorMatch) return false;

    if (!q) return true;
    const tenantName = tenantByRoom.value[room.id]?.name?.toLowerCase() || '';
    return (
      room.room_number.toLowerCase().includes(q) ||
      room.room_type.toLowerCase().includes(q) ||
      tenantName.includes(q)
    );
  });
});

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Occupied':
      return 'jira-badge-done';
    case 'Available':
      return 'jira-badge-progress';
    case 'Reserved':
      return 'jira-badge-warning';
    case 'Under Maintenance':
      return 'jira-badge-emergency';
    default:
      return 'jira-badge-todo';
  }
};

const openEditModal = (room: RoomRow) => {
  activeRoom.value = { ...room };
  editReason.value = '';
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  activeRoom.value = null;
  editReason.value = '';
};

const saveRoomEdits = async () => {
  if (!activeRoom.value) return;

  const original = rooms.value.find((r) => r.id === activeRoom.value.id);
  if (!original) {
    closeEditModal();
    return;
  }

  const newPrice = Number(activeRoom.value.current_price);
  if (Number.isNaN(newPrice) || newPrice < 0) {
    showToast('Invalid Rate', 'Please enter a valid non-negative monthly rate.', 'warning');
    return;
  }
  const priceChanged = newPrice !== Number(original.current_price);

  saving.value = true;
  try {
    if (priceChanged) {
      const { error: historyError } = await supabase.from('room_price_history').insert({
        room_id: activeRoom.value.id,
        previous_price: original.current_price,
        new_price: newPrice,
        effective_date: new Date().toISOString().slice(0, 10),
        reason: editReason.value.trim() || 'Manual admin adjustment',
        created_by: authStore.profile!.id,
      });

      if (historyError) {
        showToast('Failed to Log Price History', historyError.message, 'error');
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        current_price: newPrice,
        operational_status: activeRoom.value.operational_status,
        visibility_status: activeRoom.value.visibility_status,
        available_from: activeRoom.value.available_from || null,
      })
      .eq('id', activeRoom.value.id);

    if (updateError) {
      showToast('Failed to Update Room', updateError.message, 'error');
      return;
    }

    const idx = rooms.value.findIndex((r) => r.id === activeRoom.value.id);
    if (idx !== -1) {
      rooms.value[idx] = {
        ...rooms.value[idx],
        current_price: newPrice,
        operational_status: activeRoom.value.operational_status,
        visibility_status: activeRoom.value.visibility_status,
        available_from: activeRoom.value.available_from || null,
      };
    }

    showToast(
      'Room Updated',
      `${activeRoom.value.room_number} specifications saved successfully.`,
      'success'
    );
    closeEditModal();
  } finally {
    saving.value = false;
  }
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
            <tr v-if="loading">
              <td colspan="8" class="py-6 px-3 text-center text-[#6b778c]">Loading room directory...</td>
            </tr>
            <tr v-else-if="filteredRooms.length === 0">
              <td colspan="8" class="py-6 px-3 text-center text-[#6b778c]">No rooms match your filters.</td>
            </tr>
            <tr
              v-for="room in filteredRooms"
              :key="room.id"
              class="hover:bg-[#f7f8f9] transition-colors"
            >
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">Room {{ room.room_number }}</td>
              <td class="py-2.5 px-3">Floor {{ room.floor }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ room.room_type }}</td>
              <td class="py-2.5 px-3">{{ room.capacity }} Persons</td>
              <td class="py-2.5 px-3 font-semibold">₱{{ Number(room.current_price).toLocaleString() }}/mo</td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', statusBadgeClass(room.operational_status)]">
                  {{ room.operational_status }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">
                <template v-if="tenantByRoom[room.id]">
                  {{ tenantByRoom[room.id].name }}
                  <span class="text-[10px] text-[#6b778c]">({{ tenantByRoom[room.id].occupantCount }} occ)</span>
                </template>
                <template v-else>Unassigned</template>
              </td>
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
          <h3 class="font-bold text-base text-[#172b4d]">Edit Room Specs — Room {{ activeRoom?.room_number }}</h3>
          <button @click="closeEditModal" class="text-[#6b778c] hover:text-[#172b4d]">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Current Monthly Rate (₱)</label>
            <input
              v-model="activeRoom.current_price"
              type="number"
              min="0"
              class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"
            />
          </div>

          <div class="p-2.5 bg-[#deebff] border border-[#b3d4ff] rounded-xs text-[#0747a6]">
            <p class="font-bold mb-0.5">2% Annual Increase Rule (Cap):</p>
            <p class="text-[11px]">
              Recommended annual cap: ₱{{ Math.round(Number(activeRoom.current_price) * 1.02).toLocaleString() }}. All price changes are logged to historical pricing records.
            </p>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Reason for Rate Change (optional)</label>
            <input
              v-model="editReason"
              type="text"
              placeholder="e.g. Annual 2% increase adjustment"
              class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Operational Status</label>
              <select v-model="activeRoom.operational_status" class="w-full px-2 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]">
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Occupied">Occupied</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Visibility</label>
              <select v-model="activeRoom.visibility_status" class="w-full px-2 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]">
                <option value="Published">Published</option>
                <option value="Hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Available From</label>
            <input
              v-model="activeRoom.available_from"
              type="date"
              class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#dfe1e6]">
          <button @click="closeEditModal" class="jira-btn-secondary" :disabled="saving">Cancel</button>
          <button @click="saveRoomEdits" class="jira-btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Specifications' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
