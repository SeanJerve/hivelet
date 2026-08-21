<script setup lang="ts">
import { ref } from 'vue';
import { isOnsitePaymentModalOpen, rooms, incomeRecords, showToast } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Banknote, Loader2 } from 'lucide-vue-next';

const selectedUnit = ref('1a');
const amount = ref(4900);
const orNum = ref('');
const date = ref('2026-08-21');
const isSubmitting = ref(false);

function closeModal() {
  isOnsitePaymentModalOpen.value = false;
}

async function handleRecord() {
  isSubmitting.value = true;
  try {
    const room = rooms.find((r) => r.unitCode.toLowerCase() === selectedUnit.value.toLowerCase());
    const occupants = room ? (room.occupants || 1) : 1;
    const water = occupants * 200;

    try {
      const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
      const matched = allRooms.find((r) => r.room_number.toLowerCase() === selectedUnit.value.toLowerCase());
      if (matched) {
        await api.post('/admin/income', {
          roomId: matched.id,
          datePaid: date.value,
          contactName: room?.tenant || 'Walk-in Resident',
          invoiceNumber: orNum.value || `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          rentAmount: Math.max(0, amount.value - water),
          occupants: occupants,
          paymentMethod: 'Cash',
        });
      }
    } catch {
      // Offline fallback
    }

    incomeRecords.unshift({
      unit: selectedUnit.value.toUpperCase(),
      cluster: room?.cluster || 'BH',
      datePaid: new Date(date.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      contact: room?.tenant || 'Walk-in Resident',
      invoice: orNum.value || `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      rentFor: 'Jun.26 – Jul.25',
      rent: Math.max(0, amount.value - water),
      occupants: occupants,
      water: water,
      garbage: 600,
      anniversary: '21 Aug',
      deposit: (room?.price || 4500) * 2,
    });

    if (room) {
      room.status = 'settled';
      room.paid = true;
      room.balance = 0;
    }

    showToast('success', 'Cash payment recorded', `Unit ${selectedUnit.value.toUpperCase()} · ${peso(amount.value)} posted to the ledger.`);
    closeModal();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div 
    v-if="isOnsitePaymentModalOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <div class="surface-card w-full max-w-md shadow-2xl p-6 space-y-4 rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-[#8a5814]">
            <Banknote class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Record On-Site Cash Payment</h3>
            <p class="text-xs text-[#71717a]">Logs a cash remittance received in person.</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
          <X class="size-5" />
        </button>
      </div>

      <form @submit.prevent="handleRecord" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Unit</label>
          <select v-model="selectedUnit" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none">
            <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
              {{ r.unitCode.toUpperCase() }} — {{ r.tenant || 'Vacant' }} ({{ r.cluster }})
            </option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Amount received (₱)</label>
          <input v-model.number="amount" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
        </div>

        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">OR / Receipt number</label>
          <input v-model="orNum" type="text" placeholder="OR-2026-1055" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-mono text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
        </div>

        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Date received</label>
          <input v-model="date" type="date" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-3">
          <button type="button" @click="closeModal" class="btn-secondary px-5 cursor-pointer">Cancel</button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary px-6 flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
            <Check v-else class="size-3.5" />
            <span>{{ isSubmitting ? 'Recording…' : 'Record Payment' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
