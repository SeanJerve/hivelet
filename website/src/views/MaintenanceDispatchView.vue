<!--
  @file views/MaintenanceDispatchView.vue
  @description Admin maintenance dispatch control table with Quick Contact Chat button for Hivelet website.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Tickets
-->
<script setup lang="ts">
import { ref } from 'vue';
import { tickets, openTicketHover, resolveTicket, openTenantChat, type MaintenanceTicket } from '@/lib/systemState';
import { Maximize2, CheckCircle, PhoneCall, MessageCircle } from 'lucide-vue-next';

const contactModalOpen = ref(false);
const activeContactTicket = ref<MaintenanceTicket | null>(null);

function openQuickContact(ticket: MaintenanceTicket) {
  activeContactTicket.value = ticket;
  contactModalOpen.value = true;
}

function handleStartTenantChat() {
  if (activeContactTicket.value) {
    openTenantChat(activeContactTicket.value.tenant, activeContactTicket.value.room);
    contactModalOpen.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#172b4d]">Maintenance Dispatch & Closure</h1>
      <p class="text-xs text-[#5e6c84]">Landlady Authorization Portal & Tenant Quick Contact for Maintenance Issues</p>
    </div>

    <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2">Rm #</th>
              <th class="p-2">Tenant & Issue</th>
              <th class="p-2">Priority</th>
              <th class="p-2">Date Reported</th>
              <th class="p-2 text-center">Quick Contact</th>
              <th class="p-2 text-center">Details</th>
              <th class="p-2">Status Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-[#f4f5f7]">
              <td class="p-2 font-bold">Room {{ t.room }}</td>
              <td class="p-2">
                <p class="font-bold text-[#172b4d]">{{ t.tenant }}</p>
                <p class="text-[#5e6c84] text-[11px]">{{ t.issue }}</p>
              </td>
              <td class="p-2">
                <span :class="['px-2 py-0.5 text-[10px] font-bold uppercase rounded-full', t.priority === 'Emergency' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800']">
                  {{ t.priority }}
                </span>
              </td>
              <td class="p-2 font-mono text-[11px]">{{ t.date }}</td>
              
              <!-- Quick Contact Button -->
              <td class="p-2 text-center">
                <button 
                  @click="openQuickContact(t)"
                  class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 mx-auto cursor-pointer"
                  title="Contact Tenant Directly"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                  <span>Contact Tenant</span>
                </button>
              </td>

              <td class="p-2 text-center">
                <button @click="openTicketHover(t)" class="jira-btn-secondary p-1.5 hover:bg-[#ebecf0] cursor-pointer" title="Expand Ticket Details">
                  <Maximize2 class="w-3.5 h-3.5 text-[#0c66e4]" />
                </button>
              </td>
              <td class="p-2">
                <span v-if="t.status === 'RESOLVED'" class="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                  ✓ RESOLVED
                </span>
                <button v-else @click="resolveTicket(t.id)" class="jira-btn-secondary border border-[#dfe1e6] hover:bg-emerald-50 text-emerald-700 font-bold px-2 py-1 text-xs flex items-center gap-1 cursor-pointer">
                  <CheckCircle class="w-3.5 h-3.5" /> Close Ticket
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
            <PhoneCall class="w-4 h-4 text-[#054e38]" />
            <span>Quick Contact — Room {{ activeContactTicket.room }}</span>
          </h3>
          <button @click="contactModalOpen = false" class="text-[#6b778c] hover:text-[#172b4d] p-1 cursor-pointer">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-md space-y-1">
            <p class="text-[10px] text-[#5e6c84] uppercase font-bold">Tenant Name</p>
            <p class="font-bold text-sm text-[#172b4d]">{{ activeContactTicket.tenant }}</p>
            <p class="text-[10px] text-[#5e6c84] uppercase font-bold pt-2">Phone Number</p>
            <p class="font-bold text-sm text-[#0c66e4] font-mono">{{ activeContactTicket.phone }}</p>
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <button 
              @click="handleStartTenantChat"
              class="w-full bg-[#054e38] hover:bg-[#003626] text-white py-2.5 text-xs font-bold rounded-md flex items-center justify-center gap-2 text-center cursor-pointer shadow-md"
            >
              <MessageCircle class="w-4 h-4 text-white" />
              <span>Chat with {{ activeContactTicket.tenant }} in Messenger</span>
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-[#dfe1e6] flex justify-end">
          <button @click="contactModalOpen = false" class="jira-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
