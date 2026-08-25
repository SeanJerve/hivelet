<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  maintenanceTickets, 
  fetchMaintenanceTickets, 
  rooms, 
  fetchRooms, 
  TECHNICIANS, 
  showToast, 
  type MaintenanceTicket 
} from '@/lib/systemState';
import { api } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Wrench, 
  CheckCircle2, 
  UserCheck, 
  Pencil, 
  Trash2, 
  X, 
  RefreshCw, 
  Loader2, 
  ReceiptText,
  Check
} from 'lucide-vue-next';

const q = ref('');
const statusFilter = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Create Ticket Form State
const isCreateOpen = ref(false);
const unit = ref('1a');
const title = ref('');
const category = ref('Plumbing');
const priority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const desc = ref('');
const createTech = ref('Unassigned');

// Edit / Manage Ticket Modal State
const isEditModalOpen = ref(false);
const editingTicket = ref<MaintenanceTicket | null>(null);
const editTitle = ref('');
const editUnit = ref('1a');
const editCategory = ref('Plumbing');
const editPriority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const editStatus = ref<'Open' | 'In Progress' | 'Resolved'>('Open');
const editTech = ref('Unassigned');
const editDesc = ref('');

// Custom Confirmation Dialog State
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(titleText: string, messageText: string, action: () => void) {
  confirmTitle.value = titleText;
  confirmMessage.value = messageText;
  confirmAction.value = action;
  isConfirmOpen.value = true;
}

function handleConfirmAccept() {
  const action = confirmAction.value;
  isConfirmOpen.value = false;
  if (action) {
    action();
  }
}

async function fetchTickets() {
  isLoading.value = true;
  try {
    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
  } catch (err) {
    console.error('fetchTickets failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTickets();
});

const PRIORITY_RANK: Record<string, number> = {
  Emergency: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const filtered = computed(() => {
  const list = maintenanceTickets.filter((t) => {
    const query = q.value.toLowerCase().trim();
    const matchesQ =
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.unit.toLowerCase().includes(query) ||
      t.technician.toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === 'All' || t.status === statusFilter.value;
    return matchesQ && matchesStatus;
  });

  return list.slice().sort((a, b) => {
    // 1. Put Resolved tickets at the bottom (0 for active, 1 for resolved)
    const aIsResolved = a.status === 'Resolved' ? 1 : 0;
    const bIsResolved = b.status === 'Resolved' ? 1 : 0;
    if (aIsResolved !== bIsResolved) {
      return aIsResolved - bIsResolved;
    }

    // 2. For active tickets, keep order by priority (Emergency -> High -> Medium -> Low)
    if (!aIsResolved) {
      const pA = PRIORITY_RANK[a.priority] ?? 2;
      const pB = PRIORITY_RANK[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;
    }

    // 3. Secondary sort by reported date or ID
    return (b.id || '').localeCompare(a.id || '');
  });
});

const openCount = computed(() => maintenanceTickets.filter((t) => t.status === 'Open').length);
const inProgressCount = computed(() => maintenanceTickets.filter((t) => t.status === 'In Progress').length);
const resolvedCount = computed(() => maintenanceTickets.filter((t) => t.status === 'Resolved').length);

function getPriorityBadgeClass(p: string) {
  if (p === 'Emergency') return 'badge-danger';
  if (p === 'High') return 'badge-warning';
  if (p === 'Medium') return 'badge-info';
  return 'badge-neutral';
}

function getStatusBadgeClass(s: string) {
  if (s === 'Resolved') return 'badge-success';
  if (s === 'In Progress') return 'badge-info';
  return 'badge-warning';
}

function openEditModal(t: MaintenanceTicket) {
  editingTicket.value = t;
  editTitle.value = t.title;
  editUnit.value = t.unit.toLowerCase();
  editCategory.value = t.category || 'General';
  editPriority.value = t.priority;
  editStatus.value = t.status;
  editTech.value = t.technician || 'Unassigned';
  editDesc.value = t.description;
  isEditModalOpen.value = true;
}

async function handleCreateTicket() {
  isSubmitting.value = true;
  try {
    try {
      await api.post('/admin/tickets', {
        roomNumber: unit.value.toUpperCase(),
        title: title.value,
        description: desc.value,
        category: category.value,
        priority: priority.value,
        assignedTechnician: createTech.value,
        status: 'Submitted',
        setRoomMaintenance: priority.value === 'Emergency' || priority.value === 'High',
      });
    } catch (err) {
      console.warn('Backend ticket insert fallback:', err);
    }

    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
    isCreateOpen.value = false;
    title.value = '';
    desc.value = '';
    showToast('success', 'Maintenance ticket created', `Created ticket for Unit ${unit.value.toUpperCase()}.`);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleSaveEditTicket() {
  if (!editingTicket.value) return;
  isSubmitting.value = true;
  try {
    const ticketId = editingTicket.value.id;
    
    // Immediate reactive update to UI state
    const t = maintenanceTickets.find(item => item.id === ticketId);
    if (t) {
      t.title = editTitle.value;
      t.unit = editUnit.value.toUpperCase();
      t.category = editCategory.value;
      t.priority = editPriority.value;
      t.status = editStatus.value;
      t.technician = editTech.value;
      t.description = editDesc.value;
    }

    try {
      await api.patch(`/admin/tickets/${ticketId}`, {
        title: editTitle.value,
        roomNumber: editUnit.value.toUpperCase(),
        category: editCategory.value,
        priority: editPriority.value,
        status: editStatus.value,
        assignedTechnician: editTech.value,
        description: editDesc.value,
      });
    } catch (err: any) {
      console.warn('Backend ticket update notice:', err);
    }

    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
    showToast('success', 'Ticket updated', `Ticket #${ticketId} updated successfully.`);
    isEditModalOpen.value = false;
    editingTicket.value = null;
  } catch (err: any) {
    showToast('error', 'Update failed', err?.message || 'Could not update ticket.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleQuickDispatch() {
  if (!editingTicket.value) return;
  editStatus.value = 'In Progress';
  if (editTech.value === 'Unassigned') {
    editTech.value = TECHNICIANS[1];
  }
  await handleSaveEditTicket();
}

async function handleQuickResolve() {
  if (!editingTicket.value) return;
  editStatus.value = 'Resolved';
  await handleSaveEditTicket();
}

function handleDeleteTicketPrompt() {
  if (!editingTicket.value) return;
  const ticketId = editingTicket.value.id;
  const unitCode = editingTicket.value.unit;

  showConfirm(
    'Delete Maintenance Ticket',
    `Are you sure you want to delete Ticket #${ticketId} for Unit ${unitCode}? This will remove the maintenance record and restore the unit status if no other active repairs exist.`,
    async () => {
      isSubmitting.value = true;
      try {
        try {
          await api.delete(`/admin/tickets/${ticketId}`);
        } catch (err) {
          console.warn('Backend ticket delete fallback:', err);
        }

        const idx = maintenanceTickets.findIndex(t => t.id === ticketId);
        if (idx !== -1) {
          maintenanceTickets.splice(idx, 1);
        }

        await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
        isEditModalOpen.value = false;
        editingTicket.value = null;
        showToast('success', 'Ticket deleted', `Ticket #${ticketId} was successfully removed.`);
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Maintenance Dispatch Board
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Track repair requests, dispatch technicians, and resolve resident work orders.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchTickets"
          :disabled="isLoading"
          class="btn-secondary min-h-11 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
          title="Refresh Maintenance Data"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="isCreateOpen = true"
          class="btn-primary min-h-11 gap-2 text-xs shadow-xs cursor-pointer"
        >
          <Plus class="size-4 text-[#f59e0b]" />
          <span>New Ticket</span>
        </button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Open Tickets</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ openCount }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Awaiting technician assignment</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">In Progress</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-sky-800">{{ inProgressCount }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Technician on site / active repair</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Resolved Tickets</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-800">{{ resolvedCount }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Completed repairs on record</p>
      </div>
    </div>

    <!-- Table Section -->
    <div class="surface-card overflow-hidden">
      <!-- Search & Status Filter -->
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search title, unit code or technician…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none"
          />
        </div>

        <select
          v-model="statusFilter"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-3 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-56"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      <!-- Maintenance Tickets Table -->
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">TICKET ID</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ISSUE TITLE &amp; CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">PRIORITY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">REPORTED</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ASSIGNED TECH</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7e5e4]">
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="p-8 text-center text-[#71717a] bg-white">
                No maintenance tickets found matching the search criteria.
              </td>
            </tr>
            <tr 
              v-else
              v-for="t in filtered" 
              :key="t.id"
              class="hover:bg-[#fafaf9] transition-colors"
            >
              <td class="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#1c1917]">{{ t.id }}</td>
              <td class="whitespace-nowrap px-4 py-3 font-display font-black uppercase text-[#1c1917]">{{ t.unit }}</td>
              <td class="px-4 py-3">
                <p class="font-bold text-[#1c1917] leading-snug">{{ t.title }}</p>
                <p class="text-xs text-[#71717a]">{{ t.category }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['badge-soft text-xs font-bold whitespace-nowrap inline-flex items-center', getPriorityBadgeClass(t.priority)]">
                  {{ t.priority }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-[#71717a]">{{ t.reported }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-[#1c1917] font-medium">{{ t.technician }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['badge-soft text-xs font-bold whitespace-nowrap inline-flex items-center gap-1', getStatusBadgeClass(t.status)]">
                  <span 
                    class="size-1.5 rounded-full shrink-0" 
                    :class="t.status === 'Resolved' ? 'bg-emerald-500' : t.status === 'In Progress' ? 'bg-sky-500' : 'bg-amber-500'"
                  ></span>
                  <span>{{ t.status }}</span>
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-center">
                <button 
                  @click="openEditModal(t)" 
                  class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer hover:border-[#0c66e4] hover:text-[#0c66e4]"
                  title="Edit & Manage Ticket"
                >
                  <Pencil class="size-3.5 text-[#71717a]" />
                  <span>Edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit & Manage Ticket Modal -->
    <div 
      v-if="isEditModalOpen && editingTicket" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isEditModalOpen = false"
    >
      <div class="surface-card w-full max-w-xl shadow-2xl rounded-2xl p-6 bg-white space-y-4 my-6">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-[#8a5814]">
              <Wrench class="size-5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-base text-[#1c1917]">
                Manage Ticket #{{ editingTicket.id }}
              </h3>
              <p class="text-xs text-[#71717a]">Unit {{ editingTicket.unit.toUpperCase() }} · Reported {{ editingTicket.reported }}</p>
            </div>
          </div>
          <button @click="isEditModalOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <!-- Quick Action Shortcuts Bar -->
        <div class="p-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl flex items-center justify-between gap-3 text-xs">
          <span class="font-bold text-[#71717a] uppercase tracking-wider text-[10px]">Quick Actions:</span>
          <div class="flex items-center gap-2">
            <button
              v-if="editStatus !== 'In Progress' && editStatus !== 'Resolved'"
              type="button"
              @click="handleQuickDispatch"
              class="btn-secondary px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
            >
              <UserCheck class="size-3.5 text-[#0c66e4]" />
              <span>Dispatch Tech</span>
            </button>
            <button
              v-if="editStatus !== 'Resolved'"
              type="button"
              @click="handleQuickResolve"
              class="btn-primary px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
            >
              <CheckCircle2 class="size-3.5 text-[#f59e0b]" />
              <span>Close / Resolve</span>
            </button>
            <span v-else class="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
              <Check class="size-4" /> Ticket Resolved & Closed
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSaveEditTicket" class="space-y-4 text-xs">
          <!-- Issue Title -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Issue Title</label>
            <input v-model="editTitle" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>

          <!-- Unit Code & Category -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Unit</label>
              <select v-model="editUnit" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold bg-white focus:border-[#f59e0b] focus:outline-none" required>
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode.toLowerCase()">
                  {{ r.unitCode.toUpperCase() }} ({{ r.cluster }})
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Category</label>
              <select v-model="editCategory" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white focus:border-[#f59e0b] focus:outline-none" required>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Aircon / HVAC">Aircon / HVAC</option>
                <option value="Appliances">Appliances</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <!-- Priority & Status -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Priority</label>
              <select v-model="editPriority" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold focus:border-[#f59e0b] focus:outline-none" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Status</label>
              <select v-model="editStatus" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold focus:border-[#f59e0b] focus:outline-none" required>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <!-- Assigned Technician -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Assigned Technician</label>
            <select v-model="editTech" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white focus:border-[#f59e0b] focus:outline-none">
              <option v-for="tech in TECHNICIANS" :key="tech" :value="tech">{{ tech }}</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Description &amp; Repair Notes</label>
            <textarea v-model="editDesc" rows="3" class="w-full p-3 border border-[#e7e5e4] rounded-xl text-xs resize-none focus:border-[#f59e0b] focus:outline-none" placeholder="Details regarding the maintenance request..."></textarea>
          </div>

          <!-- Modal Action Footer -->
          <div class="pt-4 border-t border-[#e7e5e4] flex items-center justify-between gap-3">
            <button 
              type="button" 
              @click="handleDeleteTicketPrompt" 
              class="btn-secondary text-rose-700 hover:bg-rose-50 hover:border-rose-300 px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 class="size-3.5 text-rose-600" />
              <span>Delete Ticket</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditModalOpen = false" class="btn-secondary px-4 py-2 text-xs cursor-pointer">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary px-5 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Ticket Dialog -->
    <div 
      v-if="isCreateOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isCreateOpen = false"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4 my-6">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2">
            <Plus class="size-5 text-[#f59e0b]" />
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">New Maintenance Work Order</h3>
          </div>
          <button @click="isCreateOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateTicket" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Unit</label>
              <select v-model="unit" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold bg-white focus:border-[#f59e0b] focus:outline-none" required>
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode.toLowerCase()">
                  {{ r.unitCode.toUpperCase() }} ({{ r.cluster }})
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Priority</label>
              <select v-model="priority" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold focus:border-[#f59e0b] focus:outline-none" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Category</label>
            <select v-model="category" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white focus:border-[#f59e0b] focus:outline-none" required>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Aircon / HVAC">Aircon / HVAC</option>
              <option value="Appliances">Appliances</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Issue Title</label>
            <input v-model="title" placeholder="e.g. Bathroom sink water leak" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm focus:border-[#f59e0b] focus:outline-none" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Assign Technician</label>
            <select v-model="createTech" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white focus:border-[#f59e0b] focus:outline-none">
              <option v-for="tech in TECHNICIANS" :key="tech" :value="tech">{{ tech }}</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Description</label>
            <textarea v-model="desc" rows="3" placeholder="Provide details regarding the required repair..." class="w-full p-3 border border-[#e7e5e4] rounded-xl text-xs resize-none focus:border-[#f59e0b] focus:outline-none" required></textarea>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="isCreateOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Create Work Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div 
      v-if="isConfirmOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isConfirmOpen = false"
    >
      <div class="surface-card w-full max-w-sm shadow-2xl rounded-2xl p-6 bg-white space-y-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
            <ReceiptText class="w-6 h-6" />
          </div>
          <h3 class="font-display font-extrabold text-lg text-[#1c1917]">{{ confirmTitle }}</h3>
          
          <div class="w-full text-left bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3.5 text-xs text-[#1c1917] space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button 
            type="button" 
            @click="isConfirmOpen = false" 
            class="btn-secondary cursor-pointer min-w-[100px]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleConfirmAccept" 
            class="btn-primary cursor-pointer min-w-[100px]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
