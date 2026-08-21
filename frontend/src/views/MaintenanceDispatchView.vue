<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { maintenanceTickets, TECHNICIANS, showToast, type MaintenanceTicket } from '@/lib/systemState';
import { api } from '@/lib/api';
import { Plus, Search, Wrench, CheckCircle2, UserCheck, Eye, X, RefreshCw, Loader2 } from 'lucide-vue-next';

interface ApiTicket {
  id: string;
  room_id: string;
  tenant_profile_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: string;
  created_at: string;
  rooms?: { room_number: string };
  assigned_technician?: string;
}

const q = ref('');
const statusFilter = ref('All');
const viewingTicket = ref<MaintenanceTicket | null>(null);
const dispatchingTicket = ref<MaintenanceTicket | null>(null);
const selectedTech = ref(TECHNICIANS[1]);
const isCreateOpen = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);

// New Ticket Form
const unit = ref('1a');
const title = ref('');
const category = ref('Plumbing');
const priority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const desc = ref('');

async function fetchTickets() {
  isLoading.value = true;
  try {
    const data = await api.get<ApiTicket[]>('/admin/tickets');
    if (data && data.length) {
      data.forEach((item) => {
        const existing = maintenanceTickets.find((t) => t.id === item.id);
        const unitNumber = item.rooms?.room_number || '1A';
        const formattedStatus = item.status === 'Resolved' || item.status === 'Closed' ? 'Resolved' : (item.status === 'In Progress' ? 'In Progress' : 'Open');
        if (existing) {
          existing.status = formattedStatus;
          existing.priority = item.priority;
          existing.technician = item.assigned_technician || existing.technician;
        } else {
          maintenanceTickets.unshift({
            id: item.id,
            unit: unitNumber.toUpperCase(),
            title: item.title,
            category: item.category,
            priority: item.priority,
            reported: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            description: item.description,
            technician: item.assigned_technician || 'Unassigned',
            status: formattedStatus,
            photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70',
          });
        }
      });
    }
  } catch {
    // Offline fallback
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTickets();
});

const filtered = computed(() => {
  return maintenanceTickets.filter((t) => {
    const query = q.value.toLowerCase().trim();
    const matchesQ =
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.unit.toLowerCase().includes(query) ||
      t.technician.toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === 'All' || t.status === statusFilter.value;
    return matchesQ && matchesStatus;
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

async function handleCreateTicket() {
  isSubmitting.value = true;
  try {
    const newT: MaintenanceTicket = {
      id: `TCK-${String(1040 + maintenanceTickets.length + 1)}`,
      unit: unit.value.toUpperCase(),
      title: title.value,
      category: category.value,
      priority: priority.value,
      reported: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      description: desc.value,
      technician: 'Unassigned',
      status: 'Open',
      photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70',
    };
    maintenanceTickets.unshift(newT);
    isCreateOpen.value = false;
    title.value = '';
    desc.value = '';
    showToast('success', 'Maintenance ticket created', `Dispatched #${newT.id} for Unit ${newT.unit}.`);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleAssignTech() {
  if (!dispatchingTicket.value) return;
  isSubmitting.value = true;
  try {
    try {
      await api.patch(`/admin/tickets/${dispatchingTicket.value.id}`, {
        status: 'In Progress',
      });
    } catch {
      // Offline fallback
    }

    dispatchingTicket.value.technician = selectedTech.value;
    dispatchingTicket.value.status = 'In Progress';
    showToast('success', 'Technician assigned', `${selectedTech.value} dispatched for ticket #${dispatchingTicket.value.id}.`);
    dispatchingTicket.value = null;
  } finally {
    isSubmitting.value = false;
  }
}

async function handleResolveTicket(ticketId: string) {
  try {
    try {
      await api.patch(`/admin/tickets/${ticketId}/close`, {});
    } catch {
      // Offline fallback
    }

    const t = maintenanceTickets.find((item) => item.id === ticketId);
    if (t) {
      t.status = 'Resolved';
    }
    if (viewingTicket.value?.id === ticketId) {
      viewingTicket.value = null;
    }
    showToast('success', 'Ticket marked as resolved', `Ticket #${ticketId} has been closed.`);
  } catch {
    //
  }
}
</script>

<template>
  <div class="space-y-6">
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
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ inProgressCount }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Technician on site / active repair</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Resolved Tickets</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ resolvedCount }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Completed repairs on record</p>
      </div>
    </div>

    <!-- Table Section -->
    <div class="surface-card overflow-hidden">
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

      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[950px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">TICKET ID</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ISSUE TITLE &amp; CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">PRIORITY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">REPORTED</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ASSIGNED TECH</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="t in filtered" 
              :key="t.id"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <td class="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-[#1c1917]">{{ t.id }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 font-display font-black uppercase text-[#1c1917]">{{ t.unit }}</td>
              <td class="px-4 py-3.5">
                <p class="font-bold text-[#1c1917]">{{ t.title }}</p>
                <p class="text-xs text-[#71717a]">{{ t.category }}</p>
              </td>
              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs font-bold', getPriorityBadgeClass(t.priority)]">
                  {{ t.priority }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3.5 text-xs text-[#71717a]">{{ t.reported }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 text-[#1c1917] font-medium">{{ t.technician }}</td>
              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs', getStatusBadgeClass(t.status)]">
                  {{ t.status }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3.5">
                <div class="flex items-center gap-1.5">
                  <button 
                    @click="viewingTicket = t"
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                  >
                    <Eye class="size-3.5 text-[#71717a]" />
                    <span>Details</span>
                  </button>
                  <template v-if="t.status !== 'Resolved'">
                    <button 
                      @click="dispatchingTicket = t; selectedTech = t.technician !== 'Unassigned' ? t.technician : TECHNICIANS[1]"
                      class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                    >
                      <UserCheck class="size-3.5 text-[#71717a]" />
                      <span>Dispatch</span>
                    </button>
                    <button 
                      @click="handleResolveTicket(t.id)"
                      class="btn-primary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 class="size-3.5 text-[#f59e0b]" />
                      <span>Close</span>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ticket Details Dialog -->
    <div 
      v-if="viewingTicket" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="viewingTicket = null"
    >
      <div class="surface-card w-full max-w-lg shadow-2xl rounded-2xl p-6 bg-white space-y-4 max-h-[90dvh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2">
            <Wrench class="size-5 text-[#f59e0b]" />
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Ticket #{{ viewingTicket.id }} — Unit {{ viewingTicket.unit }}</h3>
          </div>
          <button @click="viewingTicket = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <img :src="viewingTicket.photo" :alt="viewingTicket.title" class="h-44 w-full rounded-xl object-cover" />

        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Issue Title</p>
            <p class="font-bold text-sm text-[#1c1917] mt-0.5">{{ viewingTicket.title }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Priority</p>
            <p class="font-bold text-sm text-[#1c1917] mt-0.5">{{ viewingTicket.priority }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Assigned Technician</p>
            <p class="text-sm font-medium mt-0.5">{{ viewingTicket.technician }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Status</p>
            <p class="text-sm font-semibold mt-0.5">{{ viewingTicket.status }}</p>
          </div>
        </div>

        <div>
          <p class="text-xs uppercase text-[#71717a] font-bold mb-1">Issue Description</p>
          <p class="p-3.5 bg-[#f5f5f4] rounded-xl text-xs leading-relaxed text-[#1c1917]">
            "{{ viewingTicket.description }}"
          </p>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button 
            v-if="viewingTicket.status !== 'Resolved'"
            @click="handleResolveTicket(viewingTicket.id)" 
            class="btn-primary cursor-pointer"
          >
            <CheckCircle2 class="size-4 mr-1.5" /> Mark Resolved
          </button>
          <button type="button" @click="viewingTicket = null" class="btn-secondary cursor-pointer">Close</button>
        </div>
      </div>
    </div>

    <!-- Dispatch Technician Dialog -->
    <div 
      v-if="dispatchingTicket" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="dispatchingTicket = null"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Dispatch Technician</h3>
          <button @click="dispatchingTicket = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleAssignTech" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Select Handyman / Technician</label>
            <select v-model="selectedTech" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
              <option v-for="t in TECHNICIANS.filter((tech) => tech !== 'Unassigned')" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="dispatchingTicket = null" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Confirm Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Ticket Dialog -->
    <div 
      v-if="isCreateOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isCreateOpen = false"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
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
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Unit Code</label>
              <input v-model="unit" placeholder="1a" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm uppercase font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Priority</label>
              <select v-model="priority" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">🚨 Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Category</label>
            <select v-model="category" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Appliances">Appliances</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Issue Title</label>
            <input v-model="title" placeholder="e.g. Bathroom sink water leak" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Description</label>
            <textarea v-model="desc" rows="3" placeholder="Provide details regarding the required repair..." class="w-full p-3 border border-[#e7e5e4] rounded-xl text-xs resize-none" required></textarea>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="isCreateOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Dispatch Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
