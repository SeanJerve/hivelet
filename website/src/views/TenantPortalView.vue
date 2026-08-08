<!--
  @file views/TenantPortalView.vue
  @description Active Tenant Self-Service Workspace for Hivelet website with billing overview and Maintenance Issue Ticketing.
  @systemBibleRef Section 4 - Tenant User Role, Section 5.5 - Water Billing Rate Rule (₱200/head), Section 5.7 - Maintenance Dispatch & Ticketing
  @rationale Provides active residents with transparent room specs, itemized monthly statement, direct online GCash remittance payment form, and maintenance issue ticketing to the landlady.
  @innovations Dual-tab resident workspace, direct maintenance issue ticketing with photo attachment upload, priority classification badges, and live remittance verification tracking.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { 
  Home, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Send, 
  FileText, 
  ShieldCheck, 
  User, 
  Droplets, 
  Zap, 
  Wifi, 
  Sparkles,
  Wrench,
  Paperclip,
  Image as ImageIcon,
  X
} from 'lucide-vue-next';

// Workspace Active Tab: 'overview' | 'payments' | 'tickets'
const activeTab = ref<'overview' | 'payments' | 'tickets'>('overview');

// Resident & Assigned Unit Data
const tenantData = ref({
  name: 'Juan Dela Cruz',
  room: 'Room 204',
  roomDetails: '2nd Floor, 1-Bedroom',
  roomType: 'BH Main Rooms • Studio / 1-Bedroom',
  occupants: 2, // 2 heads
  specs: {
    floorArea: '18 sq.m',
    bathroom: 'Private En-suite',
    aircon: 'Included (Split-type)',
    wifi: 'High-Speed Fiber WiFi',
    electricMeter: 'Individual Sub-meter',
    waterRatePerHead: 200 // ₱200 per head rule
  },
  baseRent: 6500,
  waterFee: 400, // 2 heads x ₱200
  totalAmountDue: 6900,
  dueDate: 'August 5, 2026',
  dueBadgeText: 'DUE: AUGUST 5, 2026',
  dueDaysRemaining: 'Due in 4 Days',
  landladyGCash: '0917-123-4567',
  landladyName: 'Fe Galang Da Silva'
});

// Input Payment Form State
const payDate = ref('2026-08-01');
const payAmount = ref(6900);
const payMethod = ref('GCash / Online Payment');
const payRef = ref('GCASH-9948271');
const submissionNotice = ref('');

// Payment History Records
const paymentHistory = ref([
  {
    id: 1,
    invoiceRef: 'GCASH-9948271',
    datePaid: '2026-08-01',
    billingPeriod: 'Aug 5 - Sep 4, 2026',
    amountPaid: 6900,
    paymentMethod: 'ONLINE GCASH',
    status: 'PENDING VERIFICATION'
  },
  {
    id: 2,
    invoiceRef: 'INV-77102',
    datePaid: '2026-07-05',
    billingPeriod: 'Jul 5 - Aug 4, 2026',
    amountPaid: 6900,
    paymentMethod: 'CASH ON-SITE',
    status: 'VERIFIED & SETTLED'
  }
]);

// Maintenance Ticket Data Structure
interface MaintenanceTicket {
  id: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  dateSubmitted: string;
  status: string;
  photoName: string | null;
  photoUrl: string | null;
  assignedTo: string;
}

// Maintenance Issue Ticketing State
const ticketTitle = ref('');
const ticketCategory = ref('Plumbing');
const ticketPriority = ref('Medium');
const ticketDescription = ref('');
const ticketPhotoUrl = ref<string | null>(null);
const ticketPhotoName = ref<string>('');
const ticketNotice = ref('');

// Maintenance Tickets List
const maintenanceTickets = ref<MaintenanceTicket[]>([
  {
    id: 'TCK-8821',
    title: 'Bathroom Sink Water Pipe Leak',
    category: 'Plumbing',
    priority: 'High',
    description: 'Water is dripping steadily from the pipe connector under the sink in Room 204. Small pooling on floor.',
    dateSubmitted: '2026-08-01 09:30 AM',
    status: 'IN PROGRESS',
    photoName: 'sink_pipe_leak.jpg',
    photoUrl: null,
    assignedTo: 'On-site Maintenance Staff'
  },
  {
    id: 'TCK-7104',
    title: 'Window Blinds Latch Sticking',
    category: 'Structural / Furniture',
    priority: 'Medium',
    description: 'Left side window blinds lock is hard to latch completely when closing at night.',
    dateSubmitted: '2026-07-20 02:15 PM',
    status: 'RESOLVED',
    photoName: null,
    photoUrl: null,
    assignedTo: 'Handyman'
  }
]);

// Handle Payment Submission
const handleTenantPaymentSubmit = () => {
  if (!payAmount.value || payAmount.value <= 0) {
    alert('Please enter a valid payment amount.');
    return;
  }
  if (payMethod.value !== 'Cash Payment On-Site' && !payRef.value.trim()) {
    alert('Please provide a Reference Number / OR # for online remittance verification.');
    return;
  }

  const isOnline = payMethod.value.includes('GCash') || payMethod.value.includes('Maya') || payMethod.value.includes('Online');
  const methodBadge = isOnline 
    ? (payMethod.value.includes('Maya') ? 'ONLINE MAYA' : 'ONLINE GCASH')
    : 'CASH ON-SITE';

  const newRecord = {
    id: Date.now(),
    invoiceRef: payRef.value.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    datePaid: payDate.value,
    billingPeriod: 'Aug 5 - Sep 4, 2026',
    amountPaid: Number(payAmount.value),
    paymentMethod: methodBadge,
    status: 'PENDING VERIFICATION'
  };

  paymentHistory.value.unshift(newRecord);
  submissionNotice.value = `Payment remittance of ₱${Number(payAmount.value).toLocaleString()} submitted via ${payMethod.value}. Sent to Landlady Fe Galang Da Silva for verification!`;

  setTimeout(() => {
    submissionNotice.value = '';
  }, 6000);
};

// Handle Photo File Select
const handlePhotoSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    ticketPhotoName.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      ticketPhotoUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

// Remove Photo Attachment
const removePhoto = () => {
  ticketPhotoUrl.value = null;
  ticketPhotoName.value = '';
};

// Handle Maintenance Ticket Submit
const handleTicketSubmit = () => {
  if (!ticketTitle.value.trim()) {
    alert('Please enter an issue title.');
    return;
  }
  if (!ticketDescription.value.trim()) {
    alert('Please enter detailed description of the maintenance issue.');
    return;
  }

  const newTicket = {
    id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
    title: ticketTitle.value.trim(),
    category: ticketCategory.value,
    priority: ticketPriority.value,
    description: ticketDescription.value.trim(),
    dateSubmitted: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: 'OPEN / SUBMITTED',
    photoName: ticketPhotoName.value || null,
    photoUrl: ticketPhotoUrl.value || null,
    assignedTo: 'Landlady Review'
  };

  maintenanceTickets.value.unshift(newTicket);
  ticketNotice.value = `Maintenance Issue Ticket "${newTicket.title}" (${newTicket.id}) submitted to Landlady Fe Galang Da Silva!`;

  // Reset form
  ticketTitle.value = '';
  ticketCategory.value = 'Plumbing';
  ticketPriority.value = 'Medium';
  ticketDescription.value = '';
  ticketPhotoUrl.value = null;
  ticketPhotoName.value = '';

  setTimeout(() => {
    ticketNotice.value = '';
  }, 6000);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Workspace Navigation Tabs -->
    <div class="pb-3 border-b border-[#dfe1e6]">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
            <span>Tenant Portal</span>
            <span>/</span>
            <span class="font-medium text-[#172b4d]">{{ tenantData.name }}</span>
            <span>/</span>
            <span class="font-semibold text-[#0c66e4]">{{ tenantData.room }}</span>
          </div>
          <h1 class="text-xl font-bold text-[#172b4d]">RESIDENT WORKSPACE</h1>
        </div>

        <!-- 3 Tab Buttons -->
        <div class="flex items-center bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-md gap-1 self-start sm:self-auto">
          <button 
            @click="activeTab = 'overview'"
            class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            :class="activeTab === 'overview' ? 'bg-white text-[#0c66e4] shadow-sm' : 'text-[#5e6c84] hover:text-[#172b4d]'"
          >
            <Home class="w-3.5 h-3.5" />
            <span>Unit Overview</span>
          </button>
          <button 
            @click="activeTab = 'payments'"
            class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            :class="activeTab === 'payments' ? 'bg-white text-[#0c66e4] shadow-sm' : 'text-[#5e6c84] hover:text-[#172b4d]'"
          >
            <CreditCard class="w-3.5 h-3.5" />
            <span>Payments & Billing</span>
          </button>
          <button 
            @click="activeTab = 'tickets'"
            class="px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1.5 relative cursor-pointer"
            :class="activeTab === 'tickets' ? 'bg-white text-[#0c66e4] shadow-sm' : 'text-[#5e6c84] hover:text-[#172b4d]'"
          >
            <Wrench class="w-3.5 h-3.5" />
            <span>Maintenance Tickets</span>
            <span 
              v-if="maintenanceTickets.filter(t => t.status !== 'RESOLVED').length > 0"
              class="px-1.5 py-0.2 text-[10px] bg-[#0c66e4] text-white rounded-full font-bold font-subtle-num"
            >
              {{ maintenanceTickets.filter(t => t.status !== 'RESOLVED').length }}
            </span>
          </button>
        </div>
      </div>
      <p class="text-xs text-[#6b778c]">
        {{ activeTab === 'overview' 
            ? `${tenantData.room} Specifications, Occupancy Terms & Balance Summary`
            : activeTab === 'payments'
            ? `Submit Payment Remittances & Review Payment History for ${tenantData.room}` 
            : `Submit and Track Maintenance Issue Tickets for ${tenantData.room}` }}
      </p>
    </div>

    <!-- TAB 1: OVERVIEW & STATEMENT -->
    <div v-if="activeTab === 'overview'" class="space-y-6 animate-fade-in">
      <!-- Submission Toast Notice -->
      <div 
        v-if="submissionNotice" 
        class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded flex items-center justify-between shadow-sm animate-fade-in"
      >
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{{ submissionNotice }}</span>
        </div>
        <button @click="submissionNotice = ''" class="text-emerald-700 hover:text-emerald-900 ml-2 p-0.5 rounded cursor-pointer" title="Dismiss">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Assigned Unit Specs Banner -->
      <div class="jira-card p-4 space-y-3 bg-white border border-[#dfe1e6]">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Home class="w-4 h-4 text-[#0c66e4]" />
            <span>ASSIGNED UNIT SPECIFICATIONS & AMENITIES</span>
          </h3>
          <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">Active Occupant</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="p-2 bg-gray-50 rounded border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block font-medium">Canonical Unit</span>
            <strong class="text-[#0c66e4] font-bold text-sm">{{ tenantData.room }} ({{ tenantData.roomDetails }})</strong>
          </div>
          <div class="p-2 bg-gray-50 rounded border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block font-medium">Unit Classification</span>
            <span class="font-medium text-[#172b4d]">{{ tenantData.roomType }}</span>
          </div>
          <div class="p-2 bg-gray-50 rounded border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block font-medium">Registered Occupants</span>
            <span class="font-semibold text-[#172b4d] flex items-center gap-1">
              <User class="w-3.5 h-3.5 text-[#0c66e4]" />
              {{ tenantData.occupants }} Persons
            </span>
          </div>
          <div class="p-2 bg-gray-50 rounded border border-[#dfe1e6]/60">
            <span class="text-[#6b778c] block font-medium">Floor Area & Bath</span>
            <span class="font-medium text-[#172b4d]">{{ tenantData.specs.floorArea }} • {{ tenantData.specs.bathroom }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs text-[#5e6c84] pt-1 border-t border-dashed border-[#dfe1e6]">
          <span class="flex items-center gap-1">
            <Zap class="w-3.5 h-3.5 text-amber-500" />
            Electric: <strong class="text-[#172b4d]">{{ tenantData.specs.electricMeter }}</strong>
          </span>
          <span class="flex items-center gap-1">
            <Droplets class="w-3.5 h-3.5 text-blue-500" />
            Water Utility: <strong class="text-[#172b4d]">₱{{ tenantData.specs.waterRatePerHead }}/head</strong>
          </span>
          <span class="flex items-center gap-1">
            <Wifi class="w-3.5 h-3.5 text-indigo-500" />
            Connectivity: <strong class="text-[#172b4d]">{{ tenantData.specs.wifi }}</strong>
          </span>
          <span class="flex items-center gap-1">
            <Sparkles class="w-3.5 h-3.5 text-emerald-500" />
            Climate: <strong class="text-[#172b4d]">{{ tenantData.specs.aircon }}</strong>
          </span>
        </div>
      </div>

      <!-- 2-Column Grid: Statement & Input Payment Form -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- Left Box: MONTHLY PAYMENT & DUE DATE STATEMENT -->
        <div class="jira-card p-4 space-y-4 bg-white border-2 border-[#172b4d]">
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
              <CreditCard class="w-4 h-4 text-[#0c66e4]" />
              <span>MONTHLY PAYMENT & DUE DATE STATEMENT</span>
            </h3>
            <span class="px-2 py-0.5 text-xs font-bold bg-[#172b4d] text-white rounded">
              [ {{ tenantData.dueBadgeText }} ]
            </span>
          </div>

          <div class="space-y-2.5 text-xs text-[#172b4d]">
            <div class="flex justify-between border-b border-gray-100 pb-1.5">
              <span class="text-[#5e6c84]">Resident Name:</span>
              <strong class="font-semibold">{{ tenantData.name }}</strong>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-1.5">
              <span class="text-[#5e6c84]">Assigned Unit:</span>
              <strong class="font-semibold">{{ tenantData.room }} ({{ tenantData.roomDetails }})</strong>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-1.5">
              <span class="text-[#5e6c84]">Payment Due Date:</span>
              <strong class="text-[#172b4d] underline font-bold">{{ tenantData.dueDate }} ({{ tenantData.dueDaysRemaining }})</strong>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-1.5">
              <span class="text-[#5e6c84]">Monthly Base Rent:</span>
              <span>₱{{ tenantData.baseRent.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-1.5">
              <span class="text-[#5e6c84]">Water Fee (₱{{ tenantData.specs.waterRatePerHead }}/head × {{ tenantData.occupants }}):</span>
              <span>₱{{ tenantData.waterFee.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
            </div>
            
            <div class="flex justify-between items-center font-bold text-sm border-t-2 border-[#172b4d] pt-2.5 mt-2">
              <span class="text-[#172b4d]">Total Amount Due:</span>
              <strong class="text-base text-[#0c66e4] font-subtle-num">₱{{ tenantData.totalAmountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: PAYMENTS & BILLING -->
    <div v-if="activeTab === 'payments'" class="space-y-6 animate-fade-in">
      <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-3">
          <h3 class="font-bold text-sm uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
            <CreditCard class="w-4 h-4 text-[#0c66e4]" />
            <span>Submit Payment Remittance</span>
          </h3>
          <span class="px-2 py-0.5 text-[10px] font-bold bg-[#0c66e4] text-white rounded">
            ONLINE REMITTANCE
          </span>
        </div>

          <p class="text-xs text-[#5e6c84]">
            Input your payment details below to submit your payment remittance to the landlady.
          </p>

          <form @submit.prevent="handleTenantPaymentSubmit" class="space-y-3">
            <!-- Date Paid -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="tenant-pay-date">Date Paid:</label>
              <input 
                id="tenant-pay-date"
                v-model="payDate"
                type="date" 
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white font-medium focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
                required
              />
            </div>

            <!-- Amount Paid -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="tenant-pay-amount">Amount Paid (₱):</label>
              <input 
                id="tenant-pay-amount"
                v-model="payAmount"
                type="number" 
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white font-bold focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
                required
              />
            </div>

            <!-- Payment Method -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="tenant-pay-method">Payment Method:</label>
              <select 
                id="tenant-pay-method"
                v-model="payMethod"
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white font-bold text-[#172b4d] focus:ring-1 focus:ring-[#0c66e4] focus:outline-none cursor-pointer"
                required
              >
                <option value="GCash / Online Payment">GCash / Online Payment</option>
                <option value="Maya / Online Bank">Maya / Online Bank</option>
                <option value="Cash Payment On-Site">Cash Payment On-Site</option>
              </select>
            </div>

            <!-- Online Remittance QR Code / Account Panel -->
            <div 
              v-if="payMethod.includes('GCash') || payMethod.includes('Maya') || payMethod.includes('Online')"
              class="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs space-y-1.5"
            >
              <div class="flex items-center justify-between font-bold text-[#0c66e4]">
                <span class="flex items-center gap-1.5">
                  <QrCode class="w-4 h-4" />
                  Landlady Remittance Account
                </span>
                <span class="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">Verified GCash</span>
              </div>
              <div class="text-[#172b4d]">
                Account Name: <strong>{{ tenantData.landladyName }}</strong><br />
                GCash Number: <strong class="text-[#0c66e4] underline">{{ tenantData.landladyGCash }}</strong>
              </div>
            </div>

            <!-- Reference Number -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="tenant-pay-ref">Reference Number / OR #:</label>
              <input 
                id="tenant-pay-ref"
                v-model="payRef"
                type="text" 
                placeholder="e.g. GCASH-9948271"
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white font-mono focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
                :required="payMethod !== 'Cash Payment On-Site'"
              />
            </div>

            <!-- Submit Button -->
            <button 
              type="submit"
              class="w-full py-2.5 px-4 bg-[#172b4d] hover:bg-[#0c66e4] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Send class="w-3 h-3" />
              <span>Submit Payment Record</span>
            </button>
          </form>
        </div>

      </div>

      <!-- Bottom Box: MY PAYMENT RECORD HISTORY TABLE -->
      <div class="jira-card p-4 space-y-3 bg-white border border-[#dfe1e6]">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
            <FileText class="w-4 h-4 text-[#0c66e4]" />
            <span>MY PAYMENT RECORD HISTORY</span>
          </h3>
          <span class="text-xs text-[#5e6c84]">Total Remittances Logged: <strong>{{ paymentHistory.length }}</strong></span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider">
                <th class="p-2.5 font-bold">INVOICE / REF #</th>
                <th class="p-2.5 font-bold">DATE PAID</th>
                <th class="p-2.5 font-bold">BILLING PERIOD</th>
                <th class="p-2.5 font-bold">AMOUNT PAID</th>
                <th class="p-2.5 font-bold">PAYMENT METHOD</th>
                <th class="p-2.5 font-bold">VERIFICATION STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6]">
              <tr 
                v-for="record in paymentHistory" 
                :key="record.id"
                class="hover:bg-blue-50/40 transition-colors"
              >
                <td class="p-2.5 font-mono text-[#172b4d] font-bold">
                  <code>{{ record.invoiceRef }}</code>
                </td>
                <td class="p-2.5 text-[#172b4d]">{{ record.datePaid }}</td>
                <td class="p-2.5 text-[#5e6c84]">{{ record.billingPeriod }}</td>
                <td class="p-2.5 font-bold text-[#172b4d]">
                  ₱{{ record.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </td>
                <td class="p-2.5">
                  <span 
                    class="px-2 py-0.5 font-bold text-[10px] rounded"
                    :class="record.paymentMethod.includes('ONLINE') ? 'bg-[#172b4d] text-white' : 'bg-gray-100 text-[#172b4d] border border-[#dfe1e6]'"
                  >
                    {{ record.paymentMethod }}
                  </span>
                </td>
                <td class="p-2.5">
                  <span 
                    class="px-2 py-0.5 font-bold text-[10px] rounded flex items-center gap-1 w-fit"
                    :class="record.status === 'VERIFIED & SETTLED' ? 'bg-[#172b4d] text-white' : 'bg-gray-200 text-gray-800'"
                  >
                    <ShieldCheck v-if="record.status === 'VERIFIED & SETTLED'" class="w-3 h-3 text-emerald-400" />
                    <Clock v-else class="w-3 h-3 text-amber-600" />
                    <span>{{ record.status }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: MAINTENANCE ISSUE TICKETS PAGE -->
    <div v-if="activeTab === 'tickets'" class="space-y-6 animate-fade-in">
      <!-- Submission Toast Notice for Ticket -->
      <div 
        v-if="ticketNotice" 
        class="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded flex items-center justify-between shadow-sm animate-fade-in"
      >
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-[#0c66e4] shrink-0" />
          <span>{{ ticketNotice }}</span>
        </div>
        <button @click="ticketNotice = ''" class="text-blue-700 hover:text-blue-900 ml-2 p-0.5 rounded cursor-pointer" title="Dismiss">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Grid Layout: Submit Ticket Form & Ticket Tracking List -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- Left 5-Cols: SUBMIT MAINTENANCE ISSUE TICKET FORM -->
        <div class="lg:col-span-5 jira-card p-4 space-y-4 bg-white border-2 border-[#172b4d]">
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
              <Wrench class="w-4 h-4 text-[#0c66e4]" />
              <span>SUBMIT MAINTENANCE ISSUE TICKET</span>
            </h3>
            <span class="px-2 py-0.5 text-[10px] font-bold bg-[#172b4d] text-white rounded">
              DIRECT DISPATCH
            </span>
          </div>

          <p class="text-xs text-[#5e6c84]">
            Report maintenance issues, repair requests, or structural concerns directly to Landlady Fe Galang Da Silva.
          </p>

          <form @submit.prevent="handleTicketSubmit" class="space-y-3">
            <!-- Issue Title -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="ticket-title">Issue Title:</label>
              <input 
                id="ticket-title"
                v-model="ticketTitle"
                type="text" 
                placeholder="e.g. Bathroom Sink Pipe Leak"
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white font-medium focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
                required
              />
            </div>

            <!-- Maintenance Category & Priority Level -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="ticket-category">Category:</label>
                <select 
                  id="ticket-category"
                  v-model="ticketCategory"
                  class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white text-[#172b4d] font-medium focus:ring-1 focus:ring-[#0c66e4] focus:outline-none cursor-pointer"
                  required
                >
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Appliance">Appliance / Aircon</option>
                  <option value="Structural / Furniture">Structural / Furniture</option>
                  <option value="General Maintenance">General Maintenance</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="ticket-priority">Priority Level:</label>
                <select 
                  id="ticket-priority"
                  v-model="ticketPriority"
                  class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white text-[#172b4d] font-bold focus:ring-1 focus:ring-[#0c66e4] focus:outline-none cursor-pointer"
                  required
                >
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Emergency">Emergency Priority</option>
                </select>
              </div>
            </div>

            <!-- Details & Description -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1" for="ticket-desc">Details & Description:</label>
              <textarea 
                id="ticket-desc"
                v-model="ticketDescription"
                rows="4"
                placeholder="Describe the issue in detail (location in room, when it started, severity)..."
                class="w-full text-xs p-2 border border-[#dfe1e6] rounded bg-white focus:ring-1 focus:ring-[#0c66e4] focus:outline-none"
                required
              ></textarea>
            </div>

            <!-- Attach Photo Option -->
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1">Attach Photo (Optional):</label>
              
              <div v-if="!ticketPhotoUrl" class="border border-dashed border-[#dfe1e6] rounded p-3 text-center bg-gray-50 hover:bg-blue-50/40 transition-colors">
                <input 
                  type="file" 
                  id="ticket-photo-input-website" 
                  accept="image/*"
                  @change="handlePhotoSelect"
                  class="hidden" 
                />
                <label for="ticket-photo-input-website" class="cursor-pointer flex flex-col items-center justify-center gap-1">
                  <ImageIcon class="w-5 h-5 text-[#0c66e4]" />
                  <span class="text-xs font-medium text-[#172b4d]">Click to upload photo of the issue</span>
                  <span class="text-[10px] text-[#6b778c]">PNG, JPG, WEBP up to 10MB</span>
                </label>
              </div>

              <!-- Photo Preview -->
              <div v-else class="p-2 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                <div class="flex items-center gap-2 overflow-hidden">
                  <img :src="ticketPhotoUrl" alt="Ticket Attachment Preview" class="w-10 h-10 object-cover rounded border border-blue-300 shrink-0" />
                  <div class="truncate text-xs">
                    <span class="font-bold text-[#172b4d] block truncate">{{ ticketPhotoName }}</span>
                    <span class="text-[10px] text-emerald-600 font-semibold">Photo Attached</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  @click="removePhoto" 
                  class="p-1 text-gray-500 hover:text-red-600 rounded transition-colors"
                  title="Remove Photo"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit"
              class="w-full py-2.5 px-4 bg-[#172b4d] hover:bg-[#0c66e4] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Send class="w-3 h-3" />
              <span>Submit Maintenance Ticket</span>
            </button>
          </form>
        </div>

        <!-- Right 7-Cols: MY SUBMITTED MAINTENANCE TICKETS LIST -->
        <div class="lg:col-span-7 jira-card p-4 space-y-4 bg-white border border-[#dfe1e6]">
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
              <FileText class="w-4 h-4 text-[#0c66e4]" />
              <span>MY MAINTENANCE TICKETS TRACKER</span>
            </h3>
            <span class="text-xs text-[#5e6c84]">Total Tickets: <strong>{{ maintenanceTickets.length }}</strong></span>
          </div>

          <div class="space-y-3">
            <div 
              v-for="ticket in maintenanceTickets" 
              :key="ticket.id"
              class="p-3.5 border rounded-md transition-all space-y-2.5 bg-white hover:border-[#0c66e4] shadow-sm"
              :class="ticket.priority === 'Emergency' ? 'border-red-300 bg-red-50/20' : 'border-[#dfe1e6]'"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-[#0c66e4]">{{ ticket.id }}</span>
                    <span 
                      class="px-2 py-0.5 text-[10px] font-bold rounded"
                      :class="{
                        'bg-red-100 text-red-800 border border-red-200': ticket.priority === 'Emergency',
                        'bg-amber-100 text-amber-900 border border-amber-200': ticket.priority === 'High',
                        'bg-blue-100 text-blue-900 border border-blue-200': ticket.priority === 'Medium'
                      }"
                    >
                      {{ ticket.priority.toUpperCase() }} PRIORITY
                    </span>
                    <span class="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-[#5e6c84] rounded">
                      {{ ticket.category }}
                    </span>
                  </div>
                  <h4 class="font-bold text-sm text-[#172b4d] mt-1">{{ ticket.title }}</h4>
                </div>

                <span 
                  class="px-2 py-1 text-[10px] font-bold rounded shrink-0 flex items-center gap-1"
                  :class="{
                    'bg-[#172b4d] text-white': ticket.status === 'RESOLVED',
                    'bg-amber-500 text-white': ticket.status === 'IN PROGRESS',
                    'bg-blue-600 text-white': ticket.status.includes('OPEN')
                  }"
                >
                  <ShieldCheck v-if="ticket.status === 'RESOLVED'" class="w-3 h-3" />
                  <Clock v-else class="w-3 h-3" />
                  [ {{ ticket.status }} ]
                </span>
              </div>

              <p class="text-xs text-[#5e6c84] leading-relaxed bg-[#f4f5f7] p-2.5 rounded border border-[#dfe1e6]/60">
                {{ ticket.description }}
              </p>

              <div class="flex flex-wrap items-center justify-between text-[11px] text-[#6b778c] pt-1">
                <span class="flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-[#5e6c84]" />
                  Submitted: <strong>{{ ticket.dateSubmitted }}</strong>
                </span>

                <div class="flex items-center gap-3">
                  <span v-if="ticket.photoName" class="flex items-center gap-1 text-[#0c66e4] font-semibold">
                    <Paperclip class="w-3.5 h-3.5" />
                    {{ ticket.photoName }}
                  </span>
                  <span>Assigned: <strong>{{ ticket.assignedTo }}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
</template>
