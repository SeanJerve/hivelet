<!--
  @file views/MaintenanceDispatchView.vue
  @description Admin maintenance dispatch control table with database integration, details modal, and clean Atlassian spacing.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Tickets
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/lib/api';
import { requestSecondaryConfirm, showToast } from '@/lib/systemState';
import { Maximize2, CheckCircle, PhoneCall, MessageCircle, X } from 'lucide-vue-next';

interface MaintenanceTicket {
  id: string;
  room: string;
  tenant: string;
  phone: string;
  issue: string;
  priority: 'Emergency' | 'Medium' | 'Low';
  date: string;
  status: 'Submitted' | 'In Progress' | 'Resolved' | 'Closed';
  desc: string;
  /** Photo evidence rows joined from `ticket_attachments`; absent on the seeded fallback rows. */
  attachments?: Array<{ file_url: string; file_type?: string | null }>;
}

const apiTickets = ref<MaintenanceTicket[]>([]);
const loading = ref(false);

const contactModalOpen = ref(false);
const activeContactTicket = ref<MaintenanceTicket | null>(null);

const detailsModalOpen = ref(false);
const activeDetailsTicket = ref<MaintenanceTicket | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const list = await api.get<any[]>('/admin/tickets');
    if (list.length > 0) {
      apiTickets.value = list.map(t => ({
        id: t.id,
        room: t.rooms?.room_number || 'N/A',
        tenant: t.profiles?.full_name || 'Prospect/Guest',
        phone: t.profiles?.phone_number || 'N/A',
        issue: t.title || t.description?.substring(0, 40) + '...',
        priority: t.priority || 'Medium',
        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: t.status,
        desc: t.description || 'No description provided.',
        attachments: t.ticket_attachments || []
      }));
    } else {
      // Fallback: Let me see a sample maintenance as well (as requested by user)
      apiTickets.value = [
        {
          id: 'T-101',
          room: '1a',
          tenant: 'Mark Cruz',
          phone: '0918-987-6543',
          issue: 'Water leak in toilet pipe',
          priority: 'Emergency',
          date: 'Aug 18, 2026',
          status: 'In Progress',
          desc: 'Water is dripping steadily from the pipe connector under the sink in Room 1a. Small pooling on floor.'
        },
        {
          id: 'T-102',
          room: '2b',
          tenant: 'Sean Jerve',
          phone: '0919-222-3333',
          issue: 'Broken electrical switch',
          priority: 'Medium',
          date: 'Aug 19, 2026',
          status: 'Submitted',
          desc: 'The wall light switch near the entrance does not click correctly and light flickers.'
        }
      ];
    }
  } catch (err: any) {
    console.error('Failed to load tickets:', err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

function openQuickContact(ticket: MaintenanceTicket) {
  activeContactTicket.value = ticket;
  contactModalOpen.value = true;
}

function openDetails(ticket: MaintenanceTicket) {
  activeDetailsTicket.value = ticket;
  detailsModalOpen.value = true;
}

function handleStartTenantChat() {
  if (activeContactTicket.value) {
    window.open(`https://m.me/hivelet`, '_blank');
    contactModalOpen.value = false;
  }
}

function handleCloseTicket(ticket: MaintenanceTicket) {
  requestSecondaryConfirm({
    title: 'Confirm Ticket Resolution',
    message: `Are you sure you want to mark Maintenance Ticket #${ticket.id} (${ticket.issue} - Unit ${ticket.room}) as RESOLVED?`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Resolve & Close Ticket',
    onConfirm: async () => {
      try {
        await api.patch(`/admin/tickets/${ticket.id}/status`, {
          status: 'Resolved'
        });
        showToast('success', 'Ticket Resolved', `Ticket #${ticket.id} has been resolved.`);
        await loadData();
      } catch (err: any) {
        alert(`Failed to resolve ticket: ${err.message}`);
      }
    }
  });
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Maintenance Dispatch</span>
        </div>
        <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Maintenance Dispatch & Closure</h1>
        <p class="text-xs text-[#5e6c84]">Landlady Authorization Portal & Tenant Quick Contact for Maintenance Issues</p>
      </div>
    </div>

    <!-- Spaced and Mobile-Ready Tickets Table -->
    <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6] rounded-lg shadow-xs">
      <div class="overflow-x-auto w-full">
        <table class="w-full text-left border-collapse text-xs min-w-[900px]">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px]">
              <th class="py-3.5 px-5">Room Unit</th>
              <th class="py-3.5 px-5">Resident & Reported Issue</th>
              <th class="py-3.5 px-5">Priority Level</th>
              <th class="py-3.5 px-5">Date Reported</th>
              <th class="py-3.5 px-5 text-center">Quick Contact</th>
              <th class="py-3.5 px-5 text-center">Details</th>
              <th class="py-3.5 px-5 text-right">Status Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loading">
              <td colspan="7" class="p-8 text-center text-[#5e6c84] bg-[#f7f8f9]">Loading tickets...</td>
            </tr>
            <tr v-for="t in apiTickets" :key="t.id" class="hover:bg-[#f7f8f9] transition-colors border-b border-[#dfe1e6]/60">
              <!-- Room Unit -->
              <td class="py-4 px-5 font-black text-sm text-[#172b4d] font-subtle-num">
                Unit {{ t.room }}
              </td>

              <!-- Resident Name & Issue -->
              <td class="py-4 px-5">
                <div class="font-bold text-[#172b4d] text-sm">{{ t.tenant }}</div>
                <div class="text-[#5e6c84] text-[11px] mt-0.5">{{ t.issue }}</div>
              </td>

              <!-- Priority Badge -->
              <td class="py-4 px-5">
                <span 
                  :class="[
                    'px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider',
                    t.priority === 'Emergency' ? 'bg-[#ffebe6] text-[#bf2600] border border-[#ffbdad]' :
                    t.priority === 'Medium' ? 'bg-[#fff0b3] text-[#172b4d] border border-[#ffe380]' :
                    'bg-[#f4f5f7] text-[#5e6c84] border border-[#dfe1e6]'
                  ]"
                >
                  {{ t.priority }}
                </span>
              </td>

              <!-- Date Reported -->
              <td class="py-4 px-5 font-medium text-[#5e6c84] font-subtle-num">
                {{ t.date }}
              </td>

              <!-- Quick Contact -->
              <td class="py-4 px-5 text-center">
                <button 
                  @click="openQuickContact(t)"
                  class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white text-[11px] py-1.5 px-3 rounded-md font-semibold cursor-pointer inline-flex items-center gap-1 shadow-xs"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                  <span>Contact Tenant</span>
                </button>
              </td>

              <!-- Details Modal Trigger -->
              <td class="py-4 px-5 text-center">
                <button 
                  @click="openDetails(t)" 
                  class="p-2 hover:bg-[#deebff] text-[#0747a6] rounded-md border border-[#dfe1e6] transition-colors cursor-pointer inline-flex items-center justify-center"
                  title="Expand Ticket Details"
                >
                  <Maximize2 class="w-3.5 h-3.5" />
                </button>
              </td>

              <!-- Status Action -->
              <td class="py-4 px-5 text-right">
                <span v-if="t.status === 'Resolved' || t.status === 'Closed'" class="px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  ✓ Resolved
                </span>
                <button 
                  v-else 
                  @click="handleCloseTicket(t)" 
                  class="jira-btn-secondary border border-[#dfe1e6] hover:bg-[#e3fcef] text-[#006644] font-bold px-2.5 py-1.5 rounded-md text-xs cursor-pointer inline-flex items-center gap-1"
                >
                  <CheckCircle class="w-3.5 h-3.5" />
                  <span>Close Ticket</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- QUICK CONTACT MODAL -->
    <div v-if="contactModalOpen && activeContactTicket" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-sm p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d] flex items-center gap-2">
            <PhoneCall class="w-4 h-4 text-[#0c66e4]" />
            <span>Quick Contact — Room {{ activeContactTicket.room }}</span>
          </h3>
          <button @click="contactModalOpen = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="p-3.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md space-y-1.5">
            <p class="text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider">Tenant Name</p>
            <p class="font-bold text-sm text-[#172b4d]">{{ activeContactTicket.tenant }}</p>
            <p class="text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider pt-2">Phone Number</p>
            <p class="font-bold text-sm text-[#0c66e4] font-mono">{{ activeContactTicket.phone }}</p>
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <button 
              @click="handleStartTenantChat"
              class="w-full bg-[#0c66e4] hover:bg-[#0052cc] text-white py-2.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 text-center cursor-pointer shadow-xs"
            >
              <MessageCircle class="w-4 h-4 text-white" />
              <span>Open Chat with Tenant</span>
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-[#dfe1e6] flex justify-end">
          <button @click="contactModalOpen = false" class="jira-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>

    <!-- TICKET DETAILS MODAL -->
    <div v-if="detailsModalOpen && activeDetailsTicket" class="fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-6 bg-white shadow-xl space-y-4 rounded-lg">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-lg text-[#172b4d]">Ticket Details — #{{ activeDetailsTicket.id }}</h3>
          <button @click="detailsModalOpen = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer" title="Close"><X class="w-4 h-4" /></button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider">Room / Unit</span>
              <span class="font-bold text-[#172b4d]">Unit {{ activeDetailsTicket.room }}</span>
            </div>
            <div>
              <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider">Date Reported</span>
              <span class="font-bold text-[#172b4d] font-subtle-num">{{ activeDetailsTicket.date }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider">Reported By</span>
              <span class="font-bold text-[#0c66e4]">{{ activeDetailsTicket.tenant }}</span>
            </div>
            <div>
              <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider">Priority</span>
              <span class="font-bold text-red-600 font-subtle-num">{{ activeDetailsTicket.priority }}</span>
            </div>
          </div>

          <div>
            <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider mb-1">Issue Overview</span>
            <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md font-medium text-[#172b4d] whitespace-pre-wrap leading-relaxed text-xs">
              {{ activeDetailsTicket.desc }}
            </div>
          </div>

          <!-- Photo Attachment -->
          <div v-if="activeDetailsTicket.attachments && activeDetailsTicket.attachments.length">
            <span class="block text-[9px] text-[#5e6c84] uppercase font-bold tracking-wider mb-1">Photo Attachment</span>
            <div class="border border-[#dfe1e6] rounded-md bg-gray-50 p-2 overflow-hidden flex items-center justify-center">
              <img 
                :src="activeDetailsTicket.attachments[0].file_url" 
                alt="Ticket Attachment Preview" 
                class="w-full max-h-60 object-contain rounded border border-[#dfe1e6] hover:scale-105 transition-transform duration-200" 
              />
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[#dfe1e6] flex justify-end">
          <button @click="detailsModalOpen = false" class="jira-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
