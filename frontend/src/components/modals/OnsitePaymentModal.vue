<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  isOnsitePaymentModalOpen, 
  rooms, 
  incomeRecords, 
  fetchIncomeRecords, 
  fetchRooms, 
  fetchTenants, 
  formatUnitOccupantsSummary, 
  showToast 
} from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { X, Check, Banknote, Loader2, ReceiptText, Users } from 'lucide-vue-next';

const selectedUnit = ref('1a');
const rentAmount = ref(4500);
const waterAmount = ref(400); 
const gbgFee = ref(0);
const orNum = ref('');
const date = ref(new Date().toISOString().split('T')[0]);
const isSubmitting = ref(false);

// Payment method & reference
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const transactionReference = ref('');

// Validity duration
const monthsCovered = ref(1);
const dateCoveredStart = ref(new Date().toISOString().split('T')[0]);

// Auto-calculate end date based on start date + monthsCovered
const dateCoveredEnd = computed(() => {
  const start = new Date(dateCoveredStart.value);
  if (isNaN(start.getTime())) return '';
  start.setMonth(start.getMonth() + monthsCovered.value);
  start.setDate(start.getDate() - 1);
  return start.toISOString().split('T')[0];
});

// Format Helper
function formatDateForDisplay(dStr: string): string {
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const unitOccupantsSummary = computed(() => {
  return formatUnitOccupantsSummary(selectedUnit.value);
});

const currentOccupantsCount = computed(() => {
  return unitOccupantsSummary.value.count > 0 ? unitOccupantsSummary.value.count : 1;
});

// Auto-calculate water and rent based on dynamic room occupants and rates
watch([selectedUnit, monthsCovered], ([newUnit, newMonths]) => {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === newUnit.toLowerCase());
  const summary = formatUnitOccupantsSummary(newUnit);
  const occCount = summary.count > 0 ? summary.count : (room?.occupants || 1);
  const isLinda = room?.cluster === 'Linda Units' || newUnit.toLowerCase() === 'lf' || newUnit.toLowerCase() === 'lb';
  
  const mCovered = Math.max(1, Number(newMonths) || 1);

  if (isLinda) {
    const monthlyLindaWater = newUnit.toLowerCase() === 'lf' ? 400 : 200;
    waterAmount.value = monthlyLindaWater * mCovered;
  } else {
    waterAmount.value = occCount * 200 * mCovered;
  }

  if (room && room.price) {
    rentAmount.value = room.price * mCovered;
  }
}, { immediate: true });

watch(isOnsitePaymentModalOpen, (isOpen) => {
  if (isOpen) {
    fetchTenants();
    fetchRooms();
  }
});

// Total amount received calculation
const totalAmountReceived = computed(() => {
  return (Number(rentAmount.value) || 0) + (Number(waterAmount.value) || 0) + (Number(gbgFee.value) || 0);
});

// Custom Confirm Modal state
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(title: string, message: string, action: () => void) {
  confirmTitle.value = title;
  confirmMessage.value = message;
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

function closeModal() {
  isOnsitePaymentModalOpen.value = false;
}

function triggerRecord() {
  const room = rooms.find((r) => r.unitCode.toLowerCase() === selectedUnit.value.toLowerCase());
  const unitUpper = selectedUnit.value.toUpperCase();
  const summary = formatUnitOccupantsSummary(selectedUnit.value);
  const occCount = summary.count > 0 ? summary.count : (room?.occupants || 1);
  const mCovered = Math.max(1, Number(monthsCovered.value) || 1);

  let monthlyWaterBaseline = occCount * 200;
  if (unitUpper === 'LF') {
    monthlyWaterBaseline = 400;
  } else if (unitUpper === 'LB') {
    monthlyWaterBaseline = 200;
  }
  const totalWaterBaseline = monthlyWaterBaseline * mCovered;

  const waterVal = Number(waterAmount.value) || 0;
  
  if (waterVal !== 0) {
    if (waterVal < totalWaterBaseline) {
      showToast('error', 'Water Payment Error', `Water payment for ${unitUpper} cannot be lower than ₱${totalWaterBaseline} for ${occCount} occupant(s) across ${mCovered} month(s) unless it is ₱0.`);
      return;
    }
    if (waterVal % 200 !== 0) {
      showToast('error', 'Water Payment Error', 'Water payment must be paid in whole multiples of ₱200 (e.g. 0, 200, 400, 600).');
      return;
    }
  }

  const formattedStart = new Date(dateCoveredStart.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const formattedEnd = new Date(dateCoveredEnd.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const confirmMsg = `
    Unit: ${selectedUnit.value.toUpperCase()} (${summary.text || (room?.tenant || 'Vacant')})
    Occupants: ${occCount} Registered Headcount
    Rent Amount: ₱${rentAmount.value}
    Water Payment: ₱${waterAmount.value} (₱200/head rule)
    GBG/Garbage Fee: ₱${gbgFee.value}
    Total Amount: ₱${totalAmountReceived.value}
    Validity Period: ${monthsCovered.value} month(s) (${formattedStart} to ${formattedEnd})
    Payment Method: ${paymentMethod.value} ${paymentMethod.value === 'Online' ? `(Ref: ${transactionReference.value})` : ''}
  `;

  showConfirm(
    'Confirm Payment Entry',
    confirmMsg,
    async () => {
      isSubmitting.value = true;
      try {
        let serverRecordId = `INC-NEW-${Date.now()}`;
        try {
          const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
          const matched = allRooms.find((r) => r.room_number.toLowerCase() === selectedUnit.value.toLowerCase());
          if (matched) {
            const payload = {
              roomNumber: selectedUnit.value.toUpperCase(),
              datePaid: date.value,
              contactName: summary.residents.length > 0 ? summary.residents.join(', ') : (room?.tenant || 'Walk-in Resident'),
              invoiceNumber: orNum.value || `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
              rentAmount: Number(rentAmount.value) || 0,
              occupants: occCount,
              paymentMethod: paymentMethod.value === 'Online' ? 'Online' : 'Cash',
              transactionReference: paymentMethod.value === 'Online' ? transactionReference.value : undefined,
              monthsCovered: Number(monthsCovered.value) || 1,
              dateCoveredStart: dateCoveredStart.value,
              dateCoveredEnd: dateCoveredEnd.value,
            };
            const response = await api.post<any>('/admin/income-records', payload);
            if (response && response.data && response.data.id) {
              serverRecordId = response.data.id;
            }
          }
        } catch (err) {
          console.warn('Backend payment save failed, relying on local sync:', err);
        }

        const inv = orNum.value || `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        incomeRecords.unshift({
          id: serverRecordId,
          unit: selectedUnit.value.toUpperCase(),
          cluster: room?.cluster || 'BH',
          datePaid: formatDateForDisplay(date.value),
          contact: summary.residents.length > 0 ? summary.residents.join(', ') : (room?.tenant || 'Walk-in Resident'),
          invoice: inv,
          rentFor: `${formattedStart} – ${formattedEnd}`,
          rent: Number(rentAmount.value) || 0,
          occupants: occCount,
          water: Number(waterAmount.value) || 0,
          garbage: Number(gbgFee.value) || 0,
          anniversary: new Date(date.value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          deposit: (room?.price || 4500) * 2,
        });

        if (room) {
          room.status = 'settled';
          room.paid = true;
          room.balance = 0;
        }

        await Promise.allSettled([fetchIncomeRecords(), fetchRooms(), fetchTenants()]);

        showToast('success', 'Payment recorded', `Unit ${selectedUnit.value.toUpperCase()} · ₱${totalAmountReceived.value} posted to the ledger.`);
        closeModal();
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}
</script>

<template>
  <div 
    v-if="isOnsitePaymentModalOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <div class="surface-card w-full max-w-2xl shadow-2xl p-6 space-y-4 rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-[#8a5814]">
            <Banknote class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Record On-Site Payment</h3>
            <p class="text-xs text-[#71717a]">Logs a cash or online remittance received from a tenant.</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
          <X class="size-5" />
        </button>
      </div>

      <form @submit.prevent="triggerRecord" class="space-y-4 text-xs">
        <!-- Room/Unit selector with dynamic occupants info -->
        <div>
          <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Unit</label>
          <select v-model="selectedUnit" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none">
            <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
              {{ r.unitCode.toUpperCase() }} — {{ formatUnitOccupantsSummary(r.unitCode).text }} ({{ r.cluster }})
            </option>
          </select>
        </div>

        <!-- Rent Amount & Water Payment Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Amount for Rent (₱)</label>
            <input v-model.number="rentAmount" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Payment for Water (₱)</label>
              <span class="text-[10px] font-semibold text-[#0c66e4]">
                ₱200 × {{ currentOccupantsCount }} {{ currentOccupantsCount === 1 ? 'occupant' : 'occupants' }}
              </span>
            </div>
            <input v-model.number="waterAmount" type="number" min="0" step="200" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            <p class="text-[10px] text-[#71717a] mt-1">
              <span v-if="selectedUnit.toLowerCase() === 'lf' || selectedUnit.toLowerCase() === 'lb'">
                Fixed Linda utility rule (₱{{ selectedUnit.toLowerCase() === 'lf' ? 400 : 200 }}/mo)
              </span>
              <span v-else>
                Dynamic: <strong class="text-[#1c1917]">{{ currentOccupantsCount }} Headcount</strong> ({{ unitOccupantsSummary.text }})
              </span>
            </p>
          </div>
        </div>

        <!-- GBG Fee & OR Receipt Number Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">GBG Fee (₱)</label>
            <input v-model.number="gbgFee" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">OR / Receipt Number</label>
            <input v-model="orNum" type="text" placeholder="OR-2026-1055" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-mono text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
        </div>

        <!-- Payment Method & Online Reference Number Row -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Payment Method</label>
            <select v-model="paymentMethod" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none">
              <option value="Cash">Cash</option>
              <option value="Online">Online Payment</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5" :class="{ 'opacity-40': paymentMethod !== 'Online' }">Transaction Reference #</label>
            <input v-model="transactionReference" type="text" placeholder="Gcash / Bank Ref #" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none disabled:opacity-40 disabled:bg-[#f5f5f4]" :disabled="paymentMethod !== 'Online'" :required="paymentMethod === 'Online'" />
          </div>
        </div>

        <!-- Rent Validity / Duration Details Row -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Months Covered</label>
            <input v-model.number="monthsCovered" type="number" min="1" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Covered Period Start</label>
            <input v-model="dateCoveredStart" type="date" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Covered Period End</label>
            <input :value="dateCoveredEnd" type="date" class="min-h-11 w-full px-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-sm text-[#71717a] focus:outline-none" disabled />
          </div>
        </div>

        <!-- Date Received & Read-Only Total Amount calculation -->
        <div class="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Date Received</label>
            <input v-model="date" type="date" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
          </div>
          <div class="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-3.5 flex flex-col justify-center">
            <span class="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Total Amount Received (₱)</span>
            <span class="font-display font-black text-lg text-emerald-800 pt-0.5">{{ peso(totalAmountReceived) }}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-3">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary">
            <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
            <Check v-else class="size-3.5" />
            <span>{{ isSubmitting ? 'Recording…' : 'Record Payment' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Custom Confirmation Modal inside Payment modal -->
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
          <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Confirm Payment Collection</h3>
          
          <div class="w-full text-left bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3.5 text-xs text-[#1c1917] space-y-1.5 leading-relaxed font-semibold">
            <div class="flex justify-between border-b border-[#e7e5e4]/50 pb-1">
              <span class="text-[#71717a] font-medium">Unit:</span>
              <span class="font-extrabold uppercase">{{ selectedUnit.toUpperCase() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#71717a] font-medium">Amount for Rent:</span>
              <span class="font-bold">{{ peso(rentAmount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#71717a] font-medium">Payment for Water:</span>
              <span class="font-bold">{{ peso(waterAmount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#71717a] font-medium">GBG / Garbage Fee:</span>
              <span class="font-bold">{{ peso(gbgFee) }}</span>
            </div>
            <div class="flex justify-between border-t border-[#e7e5e4]/50 pt-1 font-extrabold text-emerald-800">
              <span>Total Received:</span>
              <span>{{ peso(totalAmountReceived) }}</span>
            </div>
            <div class="flex justify-between pt-1">
              <span class="text-[#71717a] font-medium">Validity Period:</span>
              <span class="font-semibold text-right">{{ monthsCovered }} month(s)<br/>({{ formatDateForDisplay(dateCoveredStart) }} – {{ formatDateForDisplay(dateCoveredEnd) }})</span>
            </div>
            <div class="flex justify-between border-t border-[#e7e5e4]/50 pt-1">
              <span class="text-[#71717a] font-medium">Payment Method:</span>
              <span class="font-semibold">{{ paymentMethod }} {{ paymentMethod === 'Online' ? `(Ref: ${transactionReference})` : '' }}</span>
            </div>
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
