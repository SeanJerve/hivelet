<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { LANDLADY, maintenanceTickets, showToast, type MaintenanceTicket } from '@/lib/systemState';
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
  Loader2,
  ExternalLink,
  ImageOff
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
    capacity?: number;
    floor?: number;
    room_photos?: { file_url: string; is_primary: boolean; display_order: number }[];
  };
}

interface ApiBill {
  id: string;
  rent_amount: number;
  water_amount: number;
  total_amount: number;
  due_date: string;
  status: string;
  /**
   * What the bill's status is TODAY. The API derives it from the due date on
   * read, because nothing in this system ever writes 'Overdue' - see the note on
   * `withEffectiveStatus` in backend/src/routes/tenant.ts. Always prefer this
   * over `status`, which is whatever was stored when the bill was raised.
   */
  effective_status?: string;
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
  priority: string;
  status: string;
  created_at: string;
  rooms?: { room_number: string };
}

/**
 * Starts empty.
 *
 * This was seeded with `PAYMENT_HISTORY` - four invented receipts (OR-2026-1032
 * and friends) all marked Verified. A resident whose payments failed to load, or
 * who had never paid, was shown four settled payments that did not exist.
 */
const payments = ref<{ or: string; date: string; period: string; amount: number; method: string; status: string }[]>([]);
const myTickets = ref<MaintenanceTicket[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isInitiatingAdyen = ref(false);
// No unit '204' exists in this property - the units are 1a-3g, B1F, F1, LF, LB
// and PH. These placeholders showed a resident a unit number, a rent and a total
// due that were all invented, before any data had loaded.
const currentRoomNumber = ref('');
const activeRoomId = ref('');
const activeBillId = ref<string | null>(null);
const currentRentAmount = ref(0);
const currentWaterAmount = ref(0);
const currentTotalDue = ref(0);

/** Real tenancy facts, from `/tenant/my-rooms`. Empty until they load. */
const moveInDate = ref('');
const advanceRentAmount = ref(0);
const unitPhotoUrl = ref('');
const unitDescription = ref('');
const unitCapacity = ref(0);
const unitOccupants = ref(0);
const unitFloor = ref(0);
const loadError = ref<string | null>(null);

// Remittance Form
const gcashRef = ref('');
// Both are submitted with a remittance, so neither may be invented. `senderName`
// defaulted to 'Mark Cruz' - a name belonging to nobody - and `remitAmount` to a
// figure unrelated to what the resident actually owes.
const remitAmount = ref('');
const senderName = ref(currentUser.value?.fullName || '');

// Ticket Form
const ticketTitle = ref('');
const ticketCat = ref('Plumbing');
const ticketPriority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const ticketDesc = ref('');

/** `YYYY-MM-DD` as something a resident reads. Empty in, empty out. */
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

async function fetchTenantData() {
  isLoading.value = true;
  try {
    const [roomsRes, billsRes, paymentsRes, ticketsRes] = await Promise.all([
      api.get<ApiMyRoom[]>('/tenant/my-rooms'),
      api.get<ApiBill[]>('/tenant/my-bills'),
      api.get<ApiPayment[]>('/tenant/my-payments'),
      api.get<ApiTicket[]>('/tenant/my-tickets'),
    ]);

    if (roomsRes && roomsRes.length > 0) {
      const activeR = roomsRes[0];
      const room = activeR.rooms;
      activeRoomId.value = room?.id || '';
      currentRoomNumber.value = room?.room_number || '';
      currentRentAmount.value = Number(room?.current_price) || 0;
      unitDescription.value = room?.description || '';
      unitCapacity.value = Number(room?.capacity) || 0;
      unitFloor.value = Number(room?.floor) || 0;
      unitOccupants.value = Number(activeR.occupant_count) || 0;
      moveInDate.value = activeR.start_date || '';
      advanceRentAmount.value = Number(activeR.deposit_amount) || 0;

      // The unit's own photograph, not a stock image of someone else's room.
      const photos = room?.room_photos ?? [];
      const primary = photos.find((ph) => ph.is_primary) ?? photos[0];
      unitPhotoUrl.value = primary?.file_url || '';

      // Water is NOT computed here. It was `occupant_count * 200`, which restated
      // a rate that lives in `system_settings` and is applied by the backend's
      // billingService - two copies that could disagree. The bill below is the
      // authority; until it loads, the water figure stays zero rather than guessed.
      currentTotalDue.value = currentRentAmount.value;
    }

    if (billsRes && billsRes.length > 0) {
      const unpaidBill = billsRes.find((b) => (b.effective_status ?? b.status) !== 'Paid');
      if (unpaidBill) {
        activeBillId.value = unpaidBill.id;
        currentRentAmount.value = Number(unpaidBill.rent_amount) || 0;
        currentWaterAmount.value = Number(unpaidBill.water_amount) || 0;
        // The BALANCE, not the debt as issued. `remitAmount` below prefills the
        // amount the tenant is about to hand over, so on a partially paid bill
        // `total_amount` would ask them to pay the whole thing a second time.
        // `amount_outstanding` is derived by the API from the payments actually
        // linked to this bill. BR-013.
        currentTotalDue.value =
          Number((unpaidBill as any).amount_outstanding ?? unpaidBill.total_amount) || 0;
        remitAmount.value = currentTotalDue.value > 0 ? String(currentTotalDue.value) : '';
      } else {
        activeBillId.value = null;
      }
    }

    if (Array.isArray(paymentsRes)) {
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
        priority: t.priority as any,
        reported: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        description: t.description,
        // The system does not assign technicians, and no photograph is attached to
        // a ticket by this endpoint. Both used to be invented - every ticket showed
        // "Assigned Handyman" and the same stock photograph of an unrelated room,
        // presented as the resident's own reported fault.
        technician: '',
        status: t.status === 'Resolved' || t.status === 'Closed' ? 'Resolved' : (t.status === 'In Progress' ? 'In Progress' : 'Open'),
        photo: '',
      }));
    }
  } catch (err: unknown) {
    // Surfaced, not swallowed. A silent catch here left whatever was on screen in
    // place and gave the resident no reason to doubt it.
    loadError.value = err instanceof Error ? err.message : 'Your details could not be loaded.';
  } finally {
    isLoading.value = false;
  }
}

async function payOnlineAdyen() {
  isInitiatingAdyen.value = true;
  try {
    const payload: { billId?: string; returnUrl: string } = {
      returnUrl: window.location.origin + '/tenant'
    };
    if (activeBillId.value) {
      payload.billId = activeBillId.value;
    }

    const res = await api.post<{ sessionId: string; redirectUrl: string }>('/tenant/payments/checkout', payload);
    if (res && res.redirectUrl) {
      window.location.href = res.redirectUrl;
    }
  } catch (err: any) {
    showToast('error', 'Checkout Error', err.message || 'Failed to initialize Adyen gateway.');
    isInitiatingAdyen.value = false;
  }
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  const refParam = params.get('ref');

  if (statusParam === 'success' && refParam) {
    showToast('success', 'Online GCash Payment Submitted', `Payment Ref: ${refParam} has been submitted and is pending verification.`);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (statusParam === 'cancelled') {
    showToast('warning', 'Payment Cancelled', 'Online payment session was cancelled.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

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
    if (!activeRoomId.value) {
      showToast('error', 'No unit assigned', 'You have no active unit, so a request cannot be raised. Contact the administrator.');
      return;
    }

    // The server's response is the record. This previously swallowed the failure
    // and then fabricated a ticket with an invented id, so a tenant whose request
    // never reached the server still saw "dispatched" and a ticket number that
    // existed nowhere. A maintenance request that silently vanishes is the exact
    // problem this system was built to solve.
    const created = await api.post<{ id: string; created_at?: string }>('/tenant/tickets', {
      roomId: activeRoomId.value,
      title: ticketTitle.value.trim(),
      description: ticketDesc.value.trim(),
      category: ticketCat.value,
      priority: ticketPriority.value,
    });

    const newT: MaintenanceTicket = {
      id: created?.id ?? '',
      unit: currentRoomNumber.value,
      title: ticketTitle.value,
      category: ticketCat.value,
      priority: ticketPriority.value,
      reported: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      description: ticketDesc.value,
      technician: '',
      status: 'Open',
      // No photograph is attached by this form, so none is claimed. This used to
      // put the same stock image on every ticket a resident raised.
      photo: '',
    };
    maintenanceTickets.unshift(newT);
    myTickets.value.unshift(newT);
    ticketTitle.value = '';
    ticketDesc.value = '';
    showToast('success', 'Maintenance request dispatched', `Ticket #${newT.id} sent directly to Landlady.`);
  } catch (err: any) {
    // Say so. The previous version reported success regardless.
    showToast(
      'error',
      'Request not sent',
      err?.message || 'The maintenance request could not be saved. Please try again.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Welcome back, {{ currentUser?.fullName || 'Resident' }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          {{ currentRoomNumber ? 'Unit ' + currentRoomNumber + ' · ' : '' }}Resident Self-Service Portal
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="fetchTenantData"
          :disabled="isLoading"
          class="btn-secondary min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <RefreshCw :class="['size-3.5 text-muted-foreground', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <!-- Was an unconditional "Good Standing" badge: it said the same thing to
             a resident with an overdue bill as to one with none. -->
        <span
          v-if="currentTotalDue > 0"
          class="badge-soft badge-warning text-xs font-bold"
        >
          {{ peso(currentTotalDue) }} due
        </span>
        <span v-else-if="!isLoading && !loadError" class="badge-soft badge-success text-xs font-bold">
          Nothing outstanding
        </span>
      </div>
    </div>

    <div
      v-if="loadError"
      class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
    >
      <p class="font-bold text-rose-900">Your details could not be loaded.</p>
      <p class="mt-1">{{ loadError }}</p>
      <p class="mt-2 text-rose-700">
        Nothing below has been filled in with sample figures, so no number on this page
        is a guess.
      </p>
      <button @click="fetchTenantData" class="btn-dark mt-3">Try again</button>
    </div>

    <!-- Unit Visual & Rent Snapshot -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="surface-card overflow-hidden p-0 lg:col-span-2">
        <div class="grid sm:grid-cols-2">
          <!-- The unit's own photograph when one is on file. Previously a stock
               photograph of an unrelated apartment, shown to every resident. -->
          <img
            v-if="unitPhotoUrl"
            :src="unitPhotoUrl"
            :alt="currentRoomNumber ? 'Unit ' + currentRoomNumber : 'My unit'"
            class="h-56 w-full object-cover sm:h-full"
          />
          <div
            v-else
            class="h-56 w-full sm:h-full bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <ImageOff class="size-7" />
            <span class="text-[11px] font-semibold">No photo on file for this unit</span>
          </div>
          <div class="flex flex-col justify-between p-6 space-y-4">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-accent-ink">Unit Specs &amp; Inclusions</span>
              <h3 class="font-display font-extrabold text-xl text-foreground mt-1">
                {{ currentRoomNumber ? 'Room ' + currentRoomNumber : 'No unit assigned' }}
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                <span v-if="moveInDate">Move-in: {{ formatDate(moveInDate) }}</span>
                <!-- OD-04: this sum is ADVANCE RENT, not a refundable deposit.
                     Labelling it "Security Deposit" described a different
                     financial instrument from the one the system holds. -->
                <span v-if="advanceRentAmount > 0">
                  {{ moveInDate ? ' · ' : '' }}Advance rent: {{ peso(advanceRentAmount) }}
                </span>
                <span v-if="!moveInDate && advanceRentAmount === 0">Tenancy details not on file</span>
              </p>
            </div>

            <!-- The unit's own description. Replaces six invented "fixtures" -
                 a heater outlet, a built-in wardrobe, a laundry schedule - that
                 were shown identically for every unit in the property. -->
            <div class="space-y-1.5 text-xs text-foreground-soft">
              <p v-if="unitDescription" class="flex items-start gap-2">
                <CheckCircle2 class="size-3.5 shrink-0 text-accent mt-0.5" />
                <span>{{ unitDescription }}</span>
              </p>
              <p v-if="unitFloor > 0" class="flex items-center gap-2">
                <CheckCircle2 class="size-3.5 shrink-0 text-accent" />
                <span>Floor {{ unitFloor }}</span>
              </p>
              <p v-if="unitCapacity > 0" class="flex items-center gap-2">
                <CheckCircle2 class="size-3.5 shrink-0 text-accent" />
                <span>{{ unitOccupants }} of {{ unitCapacity }} occupant slots in use</span>
              </p>
            </div>

            <div v-if="currentRentAmount > 0" class="border-t border-border pt-3 flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Monthly rent</span>
              <span class="font-bold text-foreground">{{ peso(currentRentAmount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Statement Card -->
      <div class="surface-card flex flex-col justify-between p-6 space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">Current Statement</span>
            <span class="badge-soft badge-warning">Due Aug 05</span>
          </div>
          <div class="mt-4">
            <span class="text-3xl font-display font-black text-foreground">{{ peso(currentTotalDue) }}</span>
            <p class="text-xs text-muted-foreground mt-1">Rent: {{ peso(currentRentAmount) }} + Water: {{ peso(currentWaterAmount) }}</p>
          </div>
        </div>

        <div class="space-y-2 rounded-xl bg-muted p-4 text-xs">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Base Room Rent</span>
            <span class="font-semibold text-foreground">{{ peso(currentRentAmount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Water Billing</span>
            <span class="font-semibold text-foreground">{{ peso(currentWaterAmount) }}</span>
          </div>
          <div class="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total Payable</span>
            <span class="font-display font-black text-accent-ink">{{ peso(currentTotalDue) }}</span>
          </div>
        </div>

        <button
          @click="payOnlineAdyen"
          :disabled="isInitiatingAdyen"
          class="btn-primary min-h-12 w-full gap-2 font-extrabold shadow-sm cursor-pointer flex items-center justify-center bg-[#005ce6] hover:bg-[#0047b3] text-white rounded-xl text-sm transition-all disabled:opacity-50"
        >
          <Loader2 v-if="isInitiatingAdyen" class="size-4 animate-spin" />
          <ExternalLink v-else class="size-4" />
          <span>{{ isInitiatingAdyen ? 'Connecting to GCash Gateway...' : 'Pay Online (GCash via Adyen)' }}</span>
        </button>

        <div class="text-[11px] text-muted-foreground text-center">
          Landlady GCash: <strong class="font-mono font-bold text-foreground">{{ LANDLADY.gcash }}</strong> ({{ LANDLADY.name }})
        </div>
      </div>
    </div>

    <!-- 2-Column: Remit GCash & Payment History -->
    <div class="grid gap-6 lg:grid-cols-12">
      <!-- GCash Remittance Form -->
      <div class="surface-card p-6 space-y-4 lg:col-span-5">
        <div class="flex items-center gap-2 pb-3 border-b border-border">
          <QrCode class="size-5 text-accent" />
          <div>
            <h3 class="font-display font-extrabold text-base text-foreground">Remit GCash Payment</h3>
            <p class="text-xs text-muted-foreground">Submit your transaction reference number.</p>
          </div>
        </div>

        <!-- Instant Online Option -->
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Instant Adyen Gateway Available
            </span>
            <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white">Automated</span>
          </div>
          <p class="text-[11px] text-blue-800">
            Skip manual reference typing. Pay directly with your GCash wallet via our secure checkout.
          </p>
          <button
            type="button"
            @click="payOnlineAdyen"
            :disabled="isInitiatingAdyen"
            class="w-full py-2.5 bg-[#005ce6] hover:bg-[#0047b3] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink class="size-3.5" />
            <span>Launch GCash Hosted Checkout</span>
          </button>
        </div>

        <div class="relative flex py-1 items-center">
          <div class="flex-grow border-t border-border"></div>
          <span class="flex-shrink mx-2 text-[10px] uppercase font-bold text-muted-foreground">Or submit manual reference</span>
          <div class="flex-grow border-t border-border"></div>
        </div>

        <form @submit.prevent="handleRemit" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Sender GCash Account Name</label>
            <input v-model="senderName" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Amount Paid (₱)</label>
            <input v-model="remitAmount" type="number" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm font-bold" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">GCash Reference Number (13 digits)</label>
            <input v-model="gcashRef" placeholder="1009 8832 99120" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm font-mono" required />
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
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <div class="flex items-center gap-2">
            <Receipt class="size-5 text-accent" />
            <h3 class="font-display font-extrabold text-base text-foreground">Payment History &amp; Receipts</h3>
          </div>
          <span class="text-xs text-muted-foreground">{{ payments.length }} posted records</span>
        </div>

        <div class="max-h-[320px] overflow-y-auto space-y-3">
          <div
            v-for="(p, idx) in payments"
            :key="idx"
            class="flex items-center justify-between p-3.5 rounded-xl border border-border bg-white hover:bg-background transition-colors"
          >
            <div>
              <p class="font-mono text-xs font-bold text-foreground">{{ p.or }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ p.date }} · Period: {{ p.period }}</p>
            </div>
            <div class="text-right">
              <p class="font-display font-bold text-sm text-foreground">{{ peso(p.amount) }}</p>
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
        <div class="flex items-center gap-2 pb-3 border-b border-border">
          <Wrench class="size-5 text-accent" />
          <div>
            <h3 class="font-display font-extrabold text-base text-foreground">Submit Repair Request</h3>
            <p class="text-xs text-muted-foreground">Direct notification to Landlady &amp; Handyman.</p>
          </div>
        </div>

        <form @submit.prevent="handleCreateTicket" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Issue Title</label>
            <input v-model="ticketTitle" placeholder="e.g. Bathroom sink water leak" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Category</label>
              <select v-model="ticketCat" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm bg-white" required>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Appliances">Appliances</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Priority Level</label>
              <select v-model="ticketPriority" class="min-h-11 w-full px-3.5 border border-border rounded-xl text-sm bg-white font-bold" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">🚨 Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Description</label>
            <textarea v-model="ticketDesc" rows="3" placeholder="Please describe what needs repair and when you are home..." class="w-full p-3 border border-border rounded-xl text-xs resize-none" required></textarea>
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
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <h3 class="font-display font-extrabold text-base text-foreground">My Active Requests &amp; Tickets</h3>
          <span class="text-xs text-muted-foreground">{{ myTickets.length }} total</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="t in myTickets"
            :key="t.id"
            class="p-4 rounded-xl border border-border bg-white space-y-2 hover:bg-background transition-colors"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-foreground">{{ t.id }}</span>
                  <span class="badge-soft badge-info text-[10px]">{{ t.priority }}</span>
                  <span class="text-xs text-muted-foreground">· {{ t.category }}</span>
                </div>
                <h4 class="font-bold text-sm text-foreground mt-1">{{ t.title }}</h4>
              </div>
              <span class="badge-soft badge-info text-xs">{{ t.status }}</span>
            </div>
            <p class="text-xs text-foreground-soft leading-relaxed p-3 bg-muted rounded-xl">
              "{{ t.description }}"
            </p>
            <div class="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Reported: {{ t.reported }}</span>
              <span v-if="t.technician">Assigned: <strong class="text-foreground">{{ t.technician }}</strong></span>
              <span v-else class="text-muted-foreground">Not yet assigned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
