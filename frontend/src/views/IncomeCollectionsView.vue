<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { incomeRecords, isOnsitePaymentModalOpen, rooms, showToast, type IncomeRecord } from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { 
  Download, 
  Plus, 
  FileSpreadsheet, 
  Search, 
  RefreshCw,
  Pencil,
  Trash2,
  ReceiptText,
  X,
  Loader2
} from 'lucide-vue-next';

interface ApiIncome {
  id: string;
  room_id: string;
  date_paid: string;
  contact_name: string;
  invoice_number: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  occupants: number;
  fifty_percent_share: number;
  water_payment: number;
  gbg_fee: number;
  remitted_amount: number;
  payment_method: string;
  rooms?: { room_number: string; cluster_code: string };
}

const q = ref('');
const selectedCluster = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Month and Year Filters
const filterMonth = ref('All');
const filterYear = ref('All');

const monthsList = [
  { val: 'All', label: 'All Months' },
  { val: 'Jan', label: 'January' },
  { val: 'Feb', label: 'February' },
  { val: 'Mar', label: 'March' },
  { val: 'Apr', label: 'April' },
  { val: 'May', label: 'May' },
  { val: 'Jun', label: 'June' },
  { val: 'Jul', label: 'July' },
  { val: 'Aug', label: 'August' },
  { val: 'Sep', label: 'September' },
  { val: 'Oct', label: 'October' },
  { val: 'Nov', label: 'November' },
  { val: 'Dec', label: 'December' },
];

const yearsList = ['All', '2025', '2026', '2027', '2028', '2029'];

function formatDateForDisplay(dStr: string): string {
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

async function fetchIncome() {
  isLoading.value = true;
  try {
    const res = await api.get<{ success: boolean; data: ApiIncome[] }>('/admin/income-records');
    const data = res && res.data ? res.data : [];
    if (data && data.length) {
      data.forEach((item) => {
        const unitNumber = item.rooms?.room_number || '1A';
        const existingIndex = incomeRecords.findIndex((r) => r.invoice === item.invoice_number);
        const record: IncomeRecord = {
          id: item.id,
          unit: unitNumber.toUpperCase(),
          cluster: item.rooms?.cluster_code === 'BH' ? 'BH' : 'Back Apartment',
          datePaid: formatDateForDisplay(item.date_paid),
          contact: item.contact_name,
          invoice: item.invoice_number || '—',
          rentFor: `${item.rent_period_start} – ${item.rent_period_end}`,
          rent: Number(item.rent_amount) || 0,
          occupants: item.occupants || 1,
          water: Number(item.water_payment) || 0,
          garbage: Number(item.gbg_fee) || 0,
          anniversary: '21 Aug',
          deposit: (Number(item.rent_amount) || 4500) * 2,
        };
        if (existingIndex !== -1) {
          incomeRecords[existingIndex] = record;
        } else {
          incomeRecords.unshift(record);
        }
      });
    }
  } catch (err) {
    console.warn('Fetch income failed, using local offline state:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchIncome();
});

const rows = computed(() => {
  return incomeRecords.filter((r) => {
    const matchesCluster = selectedCluster.value === 'All' || r.cluster === selectedCluster.value;
    const query = q.value.toLowerCase().trim();
    const matchesQuery =
      !query ||
      r.unit.toLowerCase().includes(query) ||
      r.contact.toLowerCase().includes(query) ||
      r.invoice.toLowerCase().includes(query);

    let matchesMonth = true;
    let matchesYear = true;
    if (r.datePaid && r.datePaid !== '—') {
      const d = new Date(r.datePaid);
      if (!isNaN(d.getTime())) {
        const itemYear = String(d.getFullYear());
        const itemMonthName = d.toLocaleString('en-US', { month: 'short' }); 
        
        if (filterYear.value !== 'All') {
          matchesYear = itemYear === filterYear.value;
        }
        if (filterMonth.value !== 'All') {
          matchesMonth = itemMonthName === filterMonth.value;
        }
      }
    } else {
      if (filterYear.value !== 'All' || filterMonth.value !== 'All') {
        return false;
      }
    }
    
    return matchesCluster && matchesQuery && matchesMonth && matchesYear;
  });
});

const totalRent = computed(() => rows.value.reduce((s, r) => s + r.rent, 0));
const totalShare = computed(() => rows.value.reduce((s, r) => s + (r.rent / 2), 0));
const totalWater = computed(() => rows.value.reduce((s, r) => s + r.water, 0));
const totalRemitted = computed(() => rows.value.reduce((s, r) => s + (r.rent / 2) + r.water, 0));

// Custom Confirmation Modal state
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

// Edit Income State
const isEditOpen = ref(false);
const editingIncome = ref<IncomeRecord | null>(null);

const editUnit = ref('1a');
const editRent = ref(4500);
const editWater = ref(400);
const editGarbage = ref(0);
const editInvoice = ref('');
const editDate = ref('');
const editMethod = ref<'Cash' | 'Online'>('Cash');
const editReference = ref('');
const editMonthsCovered = ref(1);
const editDateCoveredStart = ref('');

const editDateCoveredEnd = computed(() => {
  const start = new Date(editDateCoveredStart.value);
  if (isNaN(start.getTime())) return '';
  start.setMonth(start.getMonth() + editMonthsCovered.value);
  start.setDate(start.getDate() - 1);
  return start.toISOString().split('T')[0];
});

const editTotal = computed(() => {
  return (Number(editRent.value) || 0) + (Number(editWater.value) || 0) + (Number(editGarbage.value) || 0);
});

function startEditIncome(r: IncomeRecord) {
  editingIncome.value = r;
  editUnit.value = r.unit.toUpperCase();
  editRent.value = r.rent;
  editWater.value = r.water;
  editGarbage.value = r.garbage;
  editInvoice.value = r.invoice;
  
  const d = new Date(r.datePaid);
  if (!isNaN(d.getTime())) {
    editDate.value = d.toISOString().split('T')[0];
  } else {
    editDate.value = new Date().toISOString().split('T')[0];
  }

  editMonthsCovered.value = 1;
  editDateCoveredStart.value = editDate.value;
  editMethod.value = 'Cash';
  editReference.value = '';

  isEditOpen.value = true;
}

function handleDeleteIncome(id: string, invoice: string, unit: string) {
  showConfirm(
    'Void Payment Record',
    `Are you sure you want to void the payment of unit ${unit.toUpperCase()} with Invoice/OR #${invoice}? This action cannot be undone.`,
    async () => {
      try {
        await api.delete(`/admin/income-records/${id}`);
        const idx = incomeRecords.findIndex(r => r.id === id);
        if (idx !== -1) {
          incomeRecords.splice(idx, 1);
        }
        showToast('success', 'Payment deleted', `Voided invoice #${invoice} successfully.`);
      } catch (err: any) {
        showToast('error', 'Delete failed', err.message || 'Server error occurred');
      }
    }
  );
}

async function handleEditIncome() {
  if (!editingIncome.value) return;
  const invalid = Number(editRent.value) < 0 || Number(editWater.value) < 0 || Number(editGarbage.value) < 0;
  if (invalid) {
    showToast('error', 'Validation Error', 'Amounts cannot be negative.');
    return;
  }

  const unitUpper = editUnit.value.toUpperCase();
  const room = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
  const occupants = room ? (room.occupants || 1) : 1;
  let waterBaseline = occupants * 200;
  if (unitUpper === 'LF') {
    waterBaseline = 400;
  } else if (unitUpper === 'LB') {
    waterBaseline = 200;
  }

  const waterVal = Number(editWater.value) || 0;
  if (waterVal !== 0) {
    if (waterVal < waterBaseline) {
      showToast('error', 'Water Payment Error', `Water payment for ${unitUpper} cannot be lower than the limit of ₱${waterBaseline} for ${occupants} occupant(s) unless it is ₱0.`);
      return;
    }
    if (waterVal % 200 !== 0) {
      showToast('error', 'Water Payment Error', 'Water payment must be paid in whole multiples of ₱200 (e.g. 0, 200, 400, 600).');
      return;
    }
  }

  const oldId = editingIncome.value.id;
  const oldInvoice = editingIncome.value.invoice;

  isSubmitting.value = true;
  try {
    if (oldId && !oldId.startsWith('INC-MOCK-')) {
      try {
        await api.delete(`/admin/income-records/${oldId}`);
      } catch (err) {
        console.warn('API delete failed during edit:', err);
      }
    }

    let newId = `INC-NEW-${Date.now()}`;
    const room = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
    const occupants = room ? (room.occupants || 1) : 1;

    try {
      const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
      const matched = allRooms.find((rm) => rm.room_number.toLowerCase() === editUnit.value.toLowerCase());
      if (matched) {
        const payload = {
          roomNumber: editUnit.value.toUpperCase(),
          datePaid: editDate.value,
          contactName: room?.tenant || 'Walk-in Resident',
          invoiceNumber: editInvoice.value || `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          rentAmount: Number(editRent.value) || 0,
          occupants: occupants,
          paymentMethod: editMethod.value === 'Online' ? 'Online' : 'Cash',
          transactionReference: editMethod.value === 'Online' ? editReference.value : undefined,
          monthsCovered: Number(editMonthsCovered.value) || 1,
          dateCoveredStart: editDateCoveredStart.value,
          dateCoveredEnd: editDateCoveredEnd.value,
        };
        const response = await api.post<any>('/admin/income-records', payload);
        if (response && response.data && response.data.id) {
          newId = response.data.id;
        }
      }
    } catch (err) {
      console.warn('API post failed during edit:', err);
    }

    const formattedStart = new Date(editDateCoveredStart.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const formattedEnd = new Date(editDateCoveredEnd.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const idx = incomeRecords.findIndex(r => r.id === oldId);
    if (idx !== -1) {
      incomeRecords[idx] = {
        id: newId,
        unit: editUnit.value.toUpperCase(),
        cluster: room?.cluster || 'BH',
        datePaid: formatDateForDisplay(editDate.value),
        contact: room?.tenant || 'Walk-in Resident',
        invoice: editInvoice.value || oldInvoice,
        rentFor: `${formattedStart} – ${formattedEnd}`,
        rent: Number(editRent.value) || 0,
        occupants: occupants,
        water: Number(editWater.value) || 0,
        garbage: Number(editGarbage.value) || 0,
        anniversary: new Date(editDate.value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        deposit: (room?.price || 4500) * 2,
      };
    }

    isEditOpen.value = false;
    editingIncome.value = null;
    showToast('success', 'Payment updated', `Updated unit ${editUnit.value.toUpperCase()} payment successfully.`);
  } catch (err: any) {
    showToast('error', 'Update failed', err.message || 'Server error occurred');
  } finally {
    isSubmitting.value = false;
  }
}

function exportCSV() {
  const headers = ['Unit', 'Cluster', 'Date Paid', 'Contact', 'Invoice', 'Rent For', 'Rent (PHP)', '50% Share (PHP)', 'Occupants', 'Water (PHP)', 'Garbage (PHP)', 'Remitted (PHP)'];
  const csvRows = [headers.join(',')];

  // Sort chronologically ascending
  const sortedRecords = [...rows.value].sort((a, b) => {
    const da = new Date(a.datePaid).getTime();
    const db = new Date(b.datePaid).getTime();
    return da - db;
  });

  // Group rows by month
  const groups: { monthKey: string; records: typeof rows.value }[] = [];
  
  sortedRecords.forEach(r => {
    let monthKey = 'Unknown Month';
    if (r.datePaid && r.datePaid !== '—') {
      const d = new Date(r.datePaid);
      if (!isNaN(d.getTime())) {
        monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    let group = groups.find(g => g.monthKey === monthKey);
    if (!group) {
      group = { monthKey, records: [] };
      groups.push(group);
    }
    group.records.push(r);
  });

  groups.forEach((g, gIdx) => {
    // 3 blank rows before subsequent months
    if (gIdx > 0) {
      csvRows.push(',,,,,,,,,,,');
      csvRows.push(',,,,,,,,,,,');
      csvRows.push(',,,,,,,,,,,');
    }

    // Month header row
    csvRows.push([`"** ${g.monthKey.toUpperCase()} **"`, '', '', '', '', '', '', '', '', '', '', ''].join(','));

    // Records
    g.records.forEach((r) => {
      const row = [
        r.unit,
        r.cluster,
        `"${r.datePaid}"`,
        `"${r.contact}"`,
        `"${r.invoice}"`,
        `"${r.rentFor}"`,
        r.rent,
        r.rent / 2,
        r.occupants,
        r.water,
        r.garbage,
        (r.rent / 2) + r.water
      ];
      csvRows.push(row.join(','));
    });

    // Monthly Subtotals row
    const rentSubtotal = g.records.reduce((sum, r) => sum + r.rent, 0);
    const shareSubtotal = rentSubtotal / 2;
    const occupantsSubtotal = g.records.reduce((sum, r) => sum + r.occupants, 0);
    const waterSubtotal = g.records.reduce((sum, r) => sum + r.water, 0);
    const garbageSubtotal = g.records.reduce((sum, r) => sum + r.garbage, 0);
    const remittedSubtotal = shareSubtotal + waterSubtotal;

    csvRows.push([
      `"SUBTOTAL (${g.monthKey.toUpperCase()})"`,
      '',
      '',
      '',
      '',
      '',
      rentSubtotal,
      shareSubtotal,
      occupantsSubtotal,
      waterSubtotal,
      garbageSubtotal,
      remittedSubtotal
    ].join(','));
  });

  // Yearly Grand Totals
  const rentGrand = rows.value.reduce((sum, r) => sum + r.rent, 0);
  const shareGrand = rentGrand / 2;
  const occupantsGrand = rows.value.reduce((sum, r) => sum + r.occupants, 0);
  const waterGrand = rows.value.reduce((sum, r) => sum + r.water, 0);
  const garbageGrand = rows.value.reduce((sum, r) => sum + r.garbage, 0);
  const remittedGrand = shareGrand + waterGrand;

  csvRows.push(',,,,,,,,,,,');
  csvRows.push([
    '"GRAND YEARLY TOTALS"',
    '',
    '',
    '',
    '',
    '',
    rentGrand,
    shareGrand,
    occupantsGrand,
    waterGrand,
    garbageGrand,
    remittedGrand
  ].join(','));

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const monthName = filterMonth.value !== 'All' ? filterMonth.value : 'AllMonths';
  const yearName = filterYear.value !== 'All' ? filterYear.value : 'AllYears';
  link.setAttribute('download', `hivelet_income_${monthName}_${yearName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('success', 'Excel CSV Exported', 'Income collections ledger successfully downloaded.');
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 border-b border-[#e7e5e4] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Monthly Income &amp; Collections Ledger
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Excel-matched canonical revenue ledger with automatic 50% gross rent share and water billing allocation.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="fetchIncome"
          :disabled="isLoading"
          class="btn-secondary min-h-11 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="exportCSV"
          class="btn-secondary min-h-11 px-3.5 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <Download class="size-4 text-[#71717a]" />
          <span>Export Excel CSV</span>
        </button>

        <button 
          @click="isOnsitePaymentModalOpen = true"
          class="btn-primary min-h-11 gap-2 text-xs shadow-xs cursor-pointer"
        >
          <Plus class="size-4 text-[#f59e0b]" />
          <span>Record On-Site Payment</span>
        </button>
      </div>
    </div>

    <!-- 4 Summary KPI StatCards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Total Gross Rent</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(totalRent) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Before 50% share derivation</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">50% Owner Share</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#8a5814]">{{ peso(totalShare) }}</p>
        <p class="mt-1 text-xs text-amber-800 font-medium">Automatic gross rent cut</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Water Collections</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(totalWater) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">₱200 / head monthly rule</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Total Remitted</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-800">{{ peso(totalRemitted) }}</p>
        <p class="mt-1 text-xs text-emerald-700 font-medium">50% Share + Total Water</p>
      </div>
    </div>

    <!-- Ledger Table Container -->
    <div class="surface-card overflow-hidden">
      <!-- Filter Bar -->
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search unit, resident or OR #…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
          />
        </div>

        <select
          v-model="selectedCluster"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-44"
        >
          <option value="All">All Clusters</option>
          <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
        </select>

        <select
          v-model="filterMonth"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-44"
        >
          <option v-for="m in monthsList" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>

        <select
          v-model="filterYear"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-36"
        >
          <option value="All">All Years</option>
          <option v-for="y in yearsList" :key="y" :value="y">{{ y === 'All' ? 'All Years' : y }}</option>
        </select>
      </div>

      <!-- Excel-Matched Ledger Table -->
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[1300px] text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">CLUSTER</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">DATE PAID</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">CONTACT / RESIDENT</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">INVOICE #</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold">RENT FOR</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-right">RENT (₱)</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-right">50% SHARE (₱)</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-center">OCC.</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-right">WATER (₱)</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-right">GBG (₱)</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-right">TOTAL REMITTED (₱)</th>
              <th class="whitespace-nowrap px-3.5 py-3 font-bold text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7e5e4]">
            <tr v-if="rows.length === 0">
              <td colspan="13" class="p-8 text-center text-[#71717a] bg-white">
                No income collections recorded matching the filters.
              </td>
            </tr>
            <tr 
              v-else
              v-for="r in rows" 
              :key="r.unit + r.invoice"
              class="hover:bg-[#fafaf9] transition-colors"
            >
              <td class="whitespace-nowrap px-3.5 py-3 font-display font-extrabold uppercase text-[#1c1917]">
                {{ r.unit }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 text-[#71717a] font-medium">
                {{ r.cluster }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 text-[#71717a]">
                {{ r.datePaid }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 font-bold text-[#1c1917]">
                {{ r.contact }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-[#71717a]">
                {{ r.invoice }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 text-[#71717a]">
                {{ r.rentFor }}
              </td>
              <td class="tabular whitespace-nowrap px-3.5 py-3 text-right font-display font-bold text-[#1c1917]">
                {{ peso(r.rent) }}
              </td>
              <td class="tabular whitespace-nowrap px-3.5 py-3 text-right font-display font-bold text-[#8a5814]">
                {{ peso(r.rent / 2) }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 text-center font-bold text-[#1c1917]">
                {{ r.occupants }}
              </td>
              <td class="tabular whitespace-nowrap px-3.5 py-3 text-right font-semibold text-[#1c1917]">
                {{ peso(r.water) }}
              </td>
              <td class="tabular whitespace-nowrap px-3.5 py-3 text-right text-[#71717a]">
                {{ peso(r.garbage) }}
              </td>
              <td class="tabular whitespace-nowrap px-3.5 py-3 text-right font-display font-extrabold text-emerald-800">
                {{ peso((r.rent / 2) + r.water) }}
              </td>
              <td class="whitespace-nowrap px-3.5 py-3 text-center">
                <div class="inline-flex items-center justify-center gap-1.5">
                  <button 
                    @click="startEditIncome(r)" 
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                    title="Edit Collection"
                  >
                    <Pencil class="size-3.5 text-[#71717a]" />
                    <span>Edit</span>
                  </button>
                  <button 
                    @click="handleDeleteIncome(r.id || '', r.invoice, r.unit)" 
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs hover:border-rose-300 hover:text-rose-600 cursor-pointer"
                    title="Void Collection"
                  >
                    <Trash2 class="size-3.5 text-[#71717a]" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Table Footer Subtotals -->
          <tfoot class="sticky bottom-0 bg-[#f5f5f4] border-t-2 border-[#d6d3d1] font-display font-bold text-xs text-[#1c1917]">
            <tr>
              <td colspan="6" class="px-3.5 py-3 uppercase tracking-wider text-[#71717a]">
                GRAND TOTALS ({{ rows.length }} ROWS)
              </td>
              <td class="tabular px-3.5 py-3 text-right font-black">{{ peso(totalRent) }}</td>
              <td class="tabular px-3.5 py-3 text-right font-black text-[#8a5814]">{{ peso(totalShare) }}</td>
              <td class="px-3.5 py-3 text-center">—</td>
              <td class="tabular px-3.5 py-3 text-right font-black">{{ peso(totalWater) }}</td>
              <td class="tabular px-3.5 py-3 text-right font-black">{{ peso(rows.reduce((s, r) => s + r.garbage, 0)) }}</td>
              <td class="tabular px-3.5 py-3 text-right font-black text-emerald-800">{{ peso(totalRemitted) }}</td>
              <td class="px-3.5 py-3 text-center">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Linda Units Separate Reference Card (BR-040) -->
    <div class="surface-card p-6 space-y-3">
      <div class="flex items-center gap-2">
        <FileSpreadsheet class="size-5 text-[#f59e0b]" />
        <h3 class="font-display font-extrabold text-base text-[#1c1917]">Linda Units Fixed Charge Schedule (BR-040)</h3>
      </div>
      <p class="text-xs text-[#71717a] leading-relaxed">
        Linda units follow fixed municipal utility billing rules rather than submetered rates.
      </p>

      <div class="grid gap-4 sm:grid-cols-2 pt-2">
        <div class="p-4 rounded-xl bg-[#fafaf9] border border-[#e7e5e4] space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-display font-bold text-sm text-[#1c1917]">Linda Front (LF)</span>
            <span class="badge-soft badge-info text-[10px]">Fixed Billing</span>
          </div>
          <p class="text-xs text-[#71717a]">Water: <strong>₱400.00 / month</strong> · Electricity: Submetered actual</p>
        </div>

        <div class="p-4 rounded-xl bg-[#fafaf9] border border-[#e7e5e4] space-y-1">
          <div class="flex justify-between items-center">
            <span class="font-display font-bold text-sm text-[#1c1917]">Linda Back (LB)</span>
            <span class="badge-soft badge-info text-[10px]">Fixed Billing</span>
          </div>
          <p class="text-xs text-[#71717a]">Water: <strong>₱200.00 / month</strong> · Electric: <strong>₱325.00 fixed / month</strong></p>
        </div>
      </div>
    </div>

    <!-- Edit Payment Modal -->
    <div 
      v-if="isEditOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isEditOpen = false"
    >
      <div class="surface-card w-full max-w-2xl shadow-2xl p-6 space-y-4 rounded-2xl bg-white my-6">
        
        <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-[#8a5814]">
              <Banknote class="size-5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-base text-[#1c1917]">Edit Payment Collection</h3>
              <p class="text-xs text-[#71717a]">Modify the rent and utility allocations for this collection record.</p>
            </div>
          </div>
          <button @click="isEditOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleEditIncome" class="space-y-4 text-xs">
          <!-- Room/Unit selector -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Unit</label>
            <select v-model="editUnit" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
                {{ r.unitCode.toUpperCase() }} — {{ r.tenant || 'Vacant' }} ({{ r.cluster }})
              </option>
            </select>
          </div>

          <!-- Rent Amount & Water Payment Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Amount for Rent (₱)</label>
              <input v-model.number="editRent" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Payment for Water (₱)</label>
              <input v-model.number="editWater" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
          </div>

          <!-- GBG Fee & OR Receipt Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">GBG Fee (₱)</label>
              <input v-model.number="editGarbage" type="number" min="0" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-bold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">OR / Receipt Number</label>
              <input v-model="editInvoice" type="text" placeholder="OR-2026-1055" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm font-mono text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
          </div>

          <!-- Payment Method & Online Reference Number Row -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Payment Method</label>
              <select v-model="editMethod" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none">
                <option value="Cash">Cash</option>
                <option value="Online">Online Payment</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5" :class="{ 'opacity-40': editMethod !== 'Online' }">Transaction Reference #</label>
              <input v-model="editReference" type="text" placeholder="Gcash / Bank Ref #" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none disabled:opacity-40 disabled:bg-[#f5f5f4]" :disabled="editMethod !== 'Online'" :required="editMethod === 'Online'" />
            </div>
          </div>

          <!-- Rent Validity / Duration Details Row -->
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Months Covered</label>
              <input v-model.number="editMonthsCovered" type="number" min="1" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Covered Period Start</label>
              <input v-model="editDateCoveredStart" type="date" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Covered Period End</label>
              <input :value="editDateCoveredEnd" type="date" class="min-h-11 w-full px-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-sm text-[#71717a] focus:outline-none" disabled />
            </div>
          </div>

          <!-- Date Received & Read-Only Total Amount calculation -->
          <div class="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Date Received</label>
              <input v-model="editDate" type="date" class="min-h-11 w-full px-3.5 bg-white border border-[#e7e5e4] rounded-xl text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none" required />
            </div>
            <div class="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-3.5 flex flex-col justify-center">
              <span class="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Total Amount (₱)</span>
              <span class="font-display font-black text-lg text-emerald-800 pt-0.5">{{ peso(editTotal) }}</span>
            </div>
          </div>

          <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-3">
            <button type="button" @click="isEditOpen = false" class="btn-secondary px-5 cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary px-6 flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
              <Check v-else class="size-3.5" />
              <span>Update Collection</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
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
          <h3 class="font-display font-extrabold text-lg text-[#1c1917]">{{ confirmTitle }}</h3>
          
          <div class="w-full text-left bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3.5 text-xs text-[#1c1917] space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
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
