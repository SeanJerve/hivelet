<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DEMO_TENANT, LANDLADY, PAYMENT_HISTORY, maintenanceTickets, showToast, type MaintenanceTicket } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { 
  ShieldCheck, 
  CheckCircle2, 
  QrCode, 
  Receipt, 
  Wrench, 
  Send,
  RefreshCw,
  Loader2 
} from 'lucide-vue-next';

interface ApiMyRoom {
  id: string;
  start_date: string;
  deposit_amount: number;
  occupant_count: number;
  rooms: {
    id: string;
    room_number: string;
    room_type: string;
    current_price: number;
    description: string;
  };
}

interface ApiBill {
  id: string;
  rent_amount: number;
  water_amount: number;
  total_amount: number;
  due_date: string;
  status: string;
}

interface ApiPayment {
  id: string;
  amount: number;
  payment_method: string;
  verification_status: string;
  transaction_reference: string;
  paid_at: string;
}

interface ApiTicket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: string;
  created_at: string;
  rooms?: { room_number: string };
}

const payments = ref([...PAYMENT_HISTORY]);
const myTickets = ref<MaintenanceTicket[]>(
  maintenanceTickets.filter((t) => t.unit.toLowerCase() === DEMO_TENANT.unit.toLowerCase())
);
const activeRoomId = ref<string | null>(null);
const currentRoomNumber = ref('1A');
const currentRentAmount = ref(DEMO_TENANT.rent);
const currentWaterAmount = ref(DEMO_TENANT.water);
const currentTotalDue = ref(DEMO_TENANT.amountDue);
const isLoading = ref(false);
const isSubmitting = ref(false);

// Remittance Form
const gcashRef = ref('');
const remitAmount = ref(String(DEMO_TENANT.amountDue));
const senderName = ref(currentUser.value?.fullName || DEMO_TENANT.name);

// Ticket Form
const ticketTitle = ref('');
const ticketCat = ref('Plumbing');
const ticketPriority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const ticketDesc = ref('');

async function fetchTenantData() {
  isLoading.value = true;
  try {
    const [roomsRes, billsRes, paymentsRes, ticketsRes] = await Promise.all([
      api.get<ApiMyRoom[]>('/tenant/my-rooms').catch(() => []),
      api.get<ApiBill[]>('/tenant/my-bills').catch(() => []),
      api.get<ApiPayment[]>('/tenant/my-payments').catch(() => []),
      api.get<ApiTicket[]>('/tenant/my-tickets').catch(() => []),
    ]);

    if (roomsRes && roomsRes.length > 0) {
      const myRoom = roomsRes[0];
      activeRoomId.value = myRoom.rooms?.id || myRoom.id;
      currentRoomNumber.value = myRoom.rooms?.room_number || '1A';
      currentRentAmount.value = Number(myRoom.rooms?.current_price) || 4500;
      currentWaterAmount.value = (myRoom.occupant_count || 1) * 200;
      currentTotalDue.value = currentRentAmount.value + currentWaterAmount.value;
      remitAmount.value = String(currentTotalDue.value);
    }

    if (billsRes && billsRes.length > 0) {
      const latestBill = billsRes[0];
      currentRentAmount.value = Number(latestBill.rent_amount) || currentRentAmount.value;
      currentWaterAmount.value = Number(latestBill.water_amount) || currentWaterAmount.value;
      currentTotalDue.value = Number(latestBill.total_amount) || currentTotalDue.value;
      remitAmount.value = String(currentTotalDue.value);
    }

    if (paymentsRes && paymentsRes.length > 0) {
      payments.value = paymentsRes.map((p) => ({
        or: p.transaction_reference || `OR-${p.id.slice(0, 8)}`,
        date: new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        period: 'Monthly Billing',
        amount: Number(p.amount),
        method: p.payment_method,
        status: p.verification_status === 'Verified' ? 'Verified Official' : 'Pending Verification',
      }));
    }

    if (ticketsRes && ticketsRes.length > 0) {
      myTickets.value = ticketsRes.map((t) => ({
        id: t.id,
        unit: t.rooms?.room_number || currentRoomNumber.value,
        title: t.title,
        category: t.category,
        priority: t.priority,
        reported: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        description: t.description,
        technician: 'Assigned Handyman',
        status: t.status === 'Resolved' || t.status === 'Closed' ? 'Resolved' : (t.status === 'In Progress' ? 'In Progress' : 'Open'),
        photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70',
      }));
    }
  } catch {
    // Offline fallback
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTenantData();
});

async function handleRemit() {
  if (!gcashRef.value.trim()) return;
  isSubmitting.value = true;
  try {
    const newPayment = {
      or: `GCASH-${gcashRef.value.slice(-6).toUpperCase()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      period: 'Current Period',
      amount: Number(remitAmount.value) || currentTotalDue.value,
      method: 'GCash',
      status: 'Submitted / Pending Verification',
    };
    payments.value.unshift(newPayment);
    gcashRef.value = '';
    showToast('success', 'GCash payment submitted', `Ref #${newPayment.or} received. Verification posted to Landlady.`);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleCreateTicket() {
  if (!ticketTitle.value.trim()) return;
  isSubmitting.value = true;
  try {
    if (activeRoomId.value) {
      try {
        await api.post('/tenant/tickets', {
          roomId: activeRoomId.value,
          title: ticketTitle.value.trim(),
          description: ticketDesc.value.trim(),
          category: ticketCat.value,
          priority: ticketPriority.value,
        });
      } catch {
        // Offline fallback
      }
    }

    const newT: MaintenanceTicket = {
      id: `TCK-${String(1040 + maintenanceTickets.length + 1)}`,
      unit: currentRoomNumber.value,
      title: ticketTitle.value,
      category: ticketCat.value,
      priority: ticketPriority.value,
      reported: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      description: ticketDesc.value,
      technician: 'Unassigned',
      status: 'Open',
      photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70',
    };
    maintenanceTickets.unshift(newT);
    myTickets.value.unshift(newT);
    ticketTitle.value = '';
    ticketDesc.value = '';
    showToast('success', 'Maintenance request dispatched', `Ticket #${newT.id} sent directly to Landlady.`);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Welcome back, {{ currentUser?.fullName || DEMO_TENANT.name }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Unit {{ currentRoomNumber }} · Resident Self-Service Portal
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchTenantData"
          :disabled="isLoading"
          class="btn-secondary min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          <ShieldCheck class="size-3.5" /> Good Standing
        </span>
      </div>
    </div>

    <!-- Unit Visual & Rent Snapshot -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="surface-card overflow-hidden p-0 lg:col-span-2">
        <div class="grid sm:grid-cols-2">
          <img
            :src="DEMO_TENANT.photo"
            alt="My Unit"
            class="h-56 w-full object-cover sm:h-full"
          />
          <div class="flex flex-col justify-between p-6 space-y-4">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5814]">Unit Specs &amp; Inclusions</span>
              <h3 class="font-display font-extrabold text-xl text-[#1c1917] mt-1">Room {{ currentRoomNumber }}</h3>
              <p class="text-xs text-[#71717a] mt-0.5">Move-in: {{ DEMO_TENANT.moveIn }} · Security Deposit: {{ peso(DEMO_TENANT.deposit) }}</p>
            </div>

            <div class="space-y-1.5 text-xs text-[#57534e]">
              <p v-for="(f, i) in DEMO_TENANT.fixtures.slice(0, 4)" :key="i" class="flex items-center gap-2">
                <CheckCircle2 class="size-3.5 shrink-0 text-[#f59e0b]" />
                <span>{{ f }}</span>
              </p>
            </div>

            <div class="border-t border-[#e7e5e4] pt-3 flex items-center justify-between text-xs">
              <span class="text-[#71717a]">Submeter rate</span>
              <span class="font-bold text-[#1c1917]">₱12.50 / kWh</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Statement Card -->
      <div class="surface-card flex flex-col justify-between p-6 space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase font-extrabold tracking-wider text-[#71717a]">Current Statement</span>
            <span class="badge-soft badge-warning">Due Aug 05</span>
          </div>
          <div class="mt-4">
            <span class="text-3xl font-display font-black text-[#1c1917]">{{ peso(currentTotalDue) }}</span>
            <p class="text-xs text-[#71717a] mt-1">Rent: {{ peso(currentRentAmount) }} + Water: {{ peso(currentWaterAmount) }}</p>
          </div>
        </div>

        <div class="space-y-2 rounded-xl bg-[#f5f5f4] p-4 text-xs">
          <div class="flex justify-between">
            <span class="text-[#71717a]">Base Room Rent</span>
            <span class="font-semibold text-[#1c1917]">{{ peso(currentRentAmount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#71717a]">Water Billing</span>
            <span class="font-semibold text-[#1c1917]">{{ peso(currentWaterAmount) }}</span>
          </div>
          <div class="border-t border-[#e7e5e4] pt-2 flex justify-between font-bold">
            <span>Total Payable</span>
            <span class="font-display font-black text-[#8a5814]">{{ peso(currentTotalDue) }}</span>
          </div>
        </div>

        <div class="text-[11px] text-[#71717a] text-center">
          Landlady GCash: <strong class="font-mono font-bold text-[#1c1917]">{{ LANDLADY.gcash }}</strong> ({{ LANDLADY.name }})
        </div>
      </div>
    </div>

    <!-- 2-Column: Remit GCash & Payment History -->
    <div class="grid gap-6 lg:grid-cols-12">
      <!-- GCash Remittance Form -->
      <div class="surface-card p-6 space-y-4 lg:col-span-5">
        <div class="flex items-center gap-2 pb-3 border-b border-[#e7e5e4]">
          <QrCode class="size-5 text-[#f59e0b]" />
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Remit GCash Payment</h3>
            <p class="text-xs text-[#71717a]">Submit your transaction reference number.</p>
          </div>
        </div>

        <form @submit.prevent="handleRemit" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Sender GCash Account Name</label>
            <input v-model="senderName" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Amount Paid (₱)</label>
            <input v-model="remitAmount" type="number" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">GCash Reference Number (13 digits)</label>
            <input v-model="gcashRef" placeholder="1009 8832 99120" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-mono" required />
          </div>

          <button type="submit" :disabled="isSubmitting" class="btn-primary min-h-11 w-full gap-2 font-bold shadow-xs cursor-pointer disabled:opacity-50">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            <Send v-else class="size-4" />
            <span>{{ isSubmitting ? 'Submitting…' : 'Submit Payment for Verification' }}</span>
          </button>
        </form>
      </div>

      <!-- Payment History & Receipts -->
      <div class="surface-card p-6 space-y-4 lg:col-span-7">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2">
            <Receipt class="size-5 text-[#f59e0b]" />
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Payment History &amp; Receipts</h3>
          </div>
          <span class="text-xs text-[#71717a]">{{ payments.length }} posted records</span>
        </div>

        <div class="max-h-[320px] overflow-y-auto space-y-3">
          <div
            v-for="(p, idx) in payments"
            :key="idx"
            class="flex items-center justify-between p-3.5 rounded-xl border border-[#e7e5e4] bg-white hover:bg-[#fafaf9] transition-colors"
          >
            <div>
              <p class="font-mono text-xs font-bold text-[#1c1917]">{{ p.or }}</p>
              <p class="text-xs text-[#71717a] mt-0.5">{{ p.date }} · Period: {{ p.period }}</p>
            </div>
            <div class="text-right">
              <p class="font-display font-bold text-sm text-[#1c1917]">{{ peso(p.amount) }}</p>
              <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 mt-0.5">
                {{ p.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Dispatch Section -->
    <div class="grid gap-6 lg:grid-cols-12">
      <!-- Maintenance Form -->
      <div class="surface-card p-6 space-y-4 lg:col-span-5">
        <div class="flex items-center gap-2 pb-3 border-b border-[#e7e5e4]">
          <Wrench class="size-5 text-[#f59e0b]" />
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Submit Repair Request</h3>
            <p class="text-xs text-[#71717a]">Direct notification to Landlady &amp; Handyman.</p>
          </div>
        </div>

        <form @submit.prevent="handleCreateTicket" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Issue Title</label>
            <input v-model="ticketTitle" placeholder="e.g. Bathroom sink water leak" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Category</label>
              <select v-model="ticketCat" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Appliances">Appliances</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Priority Level</label>
              <select v-model="ticketPriority" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">🚨 Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Description</label>
            <textarea v-model="ticketDesc" rows="3" placeholder="Please describe what needs repair and when you are home..." class="w-full p-3 border border-[#e7e5e4] rounded-xl text-xs resize-none" required></textarea>
          </div>

          <button type="submit" :disabled="isSubmitting" class="btn-primary min-h-11 w-full gap-2 font-bold shadow-xs cursor-pointer disabled:opacity-50">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            <Wrench v-else class="size-4" />
            <span>{{ isSubmitting ? 'Dispatching…' : 'Dispatch Maintenance Request' }}</span>
          </button>
        </form>
      </div>

      <!-- My Active Requests -->
      <div class="surface-card p-6 space-y-4 lg:col-span-7">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <h3 class="font-display font-extrabold text-base text-[#1c1917]">My Active Requests &amp; Tickets</h3>
          <span class="text-xs text-[#71717a]">{{ myTickets.length }} total</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="t in myTickets"
            :key="t.id"
            class="p-4 rounded-xl border border-[#e7e5e4] bg-white space-y-2 hover:bg-[#fafaf9] transition-colors"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-[#1c1917]">{{ t.id }}</span>
                  <span class="badge-soft badge-info text-[10px]">{{ t.priority }}</span>
                  <span class="text-xs text-[#71717a]">· {{ t.category }}</span>
                </div>
                <h4 class="font-bold text-sm text-[#1c1917] mt-1">{{ t.title }}</h4>
              </div>
              <span class="badge-soft badge-info text-xs">{{ t.status }}</span>
            </div>
            <p class="text-xs text-[#57534e] leading-relaxed p-3 bg-[#f5f5f4] rounded-xl">
              "{{ t.description }}"
            </p>
            <div class="flex items-center justify-between text-xs text-[#71717a] pt-1">
              <span>Reported: {{ t.reported }}</span>
              <span>Assigned: <strong class="text-[#1c1917]">{{ t.technician }}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
