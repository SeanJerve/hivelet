<!--
  @file views/MaintenanceDispatchView.vue
  @description Admin maintenance dispatch control table with diagonal expand modal trigger and ticket status updates.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Tickets
  @rationale Allows landlady to inspect ticket details in hover modal and mark resolved in-place.
-->
<script setup lang="ts">
import { tickets, openTicketHover, resolveTicket } from '@/lib/systemState';
import { Maximize2, CheckCircle } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#172b4d]">Maintenance Dispatch & Closure</h1>
      <p class="text-xs text-[#5e6c84]">Landlady Authorization Portal for Maintenance Issues</p>
    </div>

    <div class="jira-card p-6 space-y-4">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2">Rm #</th>
              <th class="p-2">Issue Description</th>
              <th class="p-2">Priority</th>
              <th class="p-2">Date Reported</th>
              <th class="p-2 text-center">Details</th>
              <th class="p-2">Status Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-[#f4f5f7]">
              <td class="p-2 font-bold">Room {{ t.room }}</td>
              <td class="p-2">{{ t.issue }}</td>
              <td class="p-2">
                <span :class="['jira-badge text-[10px] font-bold uppercase', t.priority === 'Emergency' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800']">
                  {{ t.priority }}
                </span>
              </td>
              <td class="p-2 font-mono text-[11px]">{{ t.date }}</td>
              <td class="p-2 text-center">
                <button @click="openTicketHover(t)" class="jira-btn-secondary p-1.5 hover:bg-[#ebecf0]" title="Expand Ticket Details">
                  <Maximize2 class="w-3.5 h-3.5 text-[#0c66e4]" />
                </button>
              </td>
              <td class="p-2">
                <span v-if="t.status === 'RESOLVED'" class="jira-badge bg-emerald-100 text-emerald-800 font-bold">
                  ✓ RESOLVED
                </span>
                <button v-else @click="resolveTicket(t.id)" class="jira-btn-secondary hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle class="w-3.5 h-3.5" /> Close Ticket
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
