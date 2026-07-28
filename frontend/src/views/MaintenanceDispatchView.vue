<script setup lang="ts">
/**
 * @component MaintenanceDispatchView
 * @description Maintenance Dispatch & Closure Authorization table for the Landlady.
 * @systemBibleRef Section 5.7 & Wireframe Specification Section 2
 * @rationale Manages issue reporting, priority triage, photo attachment modal pop-overs, and ticket closure.
 * @innovations Icon-only details pop-over modal and in-place uniform button replacement with resolved tag.
 */
import { ref } from 'vue';
import { Wrench, Eye, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-vue-next';

interface Ticket {
  id: number;
  room: string;
  issue: string;
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';
  dateReported: string;
  tenantName: string;
  notes: string;
  resolved: boolean;
}

const tickets = ref<Ticket[]>([
  { id: 1, room: 'Room 108', issue: 'Faucet Leaking in bathroom', priority: 'EMERGENCY', dateReported: '2026-07-27', tenantName: 'Elena Toribio', notes: 'Water is steadily dripping into the bathroom drain. Requires urgent plumber visit.', resolved: false },
  { id: 2, room: 'Room 305', issue: 'Electrical outlet non-responsive', priority: 'HIGH', dateReported: '2026-07-26', tenantName: 'Bong Revilla', notes: 'Main desk outlet stopped working after breaker trip.', resolved: false },
  { id: 3, room: 'Room 201', issue: 'Window latch loose', priority: 'MEDIUM', dateReported: '2026-07-20', tenantName: 'Grace Poe', notes: 'Latch comes loose when window is fully opened.', resolved: true },
]);

const activeTicketModal = ref<Ticket | null>(null);

const closeTicketInPlace = (ticket: Ticket) => {
  ticket.resolved = true;
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
          <span class="font-medium text-[#172b4d]">Maintenance Dispatch</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Maintenance Dispatch & Closure Authorization</h1>
      </div>
    </div>

    <!-- Dispatch Data Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Room #</th>
              <th class="py-2.5 px-3">Issue Description</th>
              <th class="py-2.5 px-3">Priority Level</th>
              <th class="py-2.5 px-3">Date Reported</th>
              <th class="py-2.5 px-3 text-center">Details</th>
              <th class="py-2.5 px-3 text-right">Closure Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ t.room }}</td>
              <td class="py-2.5 px-3 font-medium">{{ t.issue }}</td>
              <td class="py-2.5 px-3">
                <span 
                  :class="[
                    'jira-badge',
                    t.priority === 'EMERGENCY' ? 'jira-badge-emergency' : t.priority === 'HIGH' ? 'jira-badge-warning' : 'jira-badge-todo'
                  ]"
                >
                  {{ t.priority }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.dateReported }}</td>
              
              <!-- Details Pop-Over Button -->
              <td class="py-2.5 px-3 text-center">
                <button 
                  @click="activeTicketModal = t" 
                  class="jira-btn-secondary p-1 text-[11px]" 
                  title="View Ticket Details & Photos"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>
              </td>

              <!-- Uniform In-Place Closure Action -->
              <td class="py-2.5 px-3 text-right">
                <span v-if="t.resolved" class="jira-badge jira-badge-done">
                  ✓ RESOLVED
                </span>
                <button 
                  v-else 
                  @click="closeTicketInPlace(t)" 
                  class="jira-btn-secondary text-[11px] py-1 px-2.5"
                >
                  Close Ticket
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ticket Detail Pop-Over Modal -->
    <div v-if="activeTicketModal" class="fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-5 bg-white shadow-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d]">Ticket Specs — {{ activeTicketModal.room }}</h3>
          <button @click="activeTicketModal = null" class="text-[#6b778c] hover:text-[#172b4d]">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-2.5 text-xs text-[#172b4d]">
          <div>
            <span class="font-semibold text-[#5e6c84]">Reported By:</span> {{ activeTicketModal.tenantName }}
          </div>
          <div>
            <span class="font-semibold text-[#5e6c84]">Issue Title:</span> {{ activeTicketModal.issue }}
          </div>
          <div>
            <span class="font-semibold text-[#5e6c84]">Detailed Notes:</span>
            <p class="mt-1 p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]">
              {{ activeTicketModal.notes }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-[#dfe1e6]">
          <button @click="activeTicketModal = null" class="jira-btn-primary">Done Viewing</button>
        </div>
      </div>
    </div>
  </div>
</template>
