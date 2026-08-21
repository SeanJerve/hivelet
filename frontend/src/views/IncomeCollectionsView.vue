<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { incomeRecords, isOnsitePaymentModalOpen, showToast, type IncomeRecord } from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { 
  Download, 
  Plus, 
  FileSpreadsheet, 
  Search, 
  RefreshCw 
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

async function fetchIncome() {
  isLoading.value = true;
  try {
    const data = await api.get<ApiIncome[]>('/admin/income');
    if (data && data.length) {
      data.forEach((item) => {
        const unitNumber = item.rooms?.room_number || '1A';
        const existing = incomeRecords.find((r) => r.invoice === item.invoice_number);
        if (!existing) {
          incomeRecords.unshift({
            unit: unitNumber.toUpperCase(),
            cluster: item.rooms?.cluster_code === 'BH' ? 'BH' : 'Back Apartment',
            datePaid: item.date_paid,
            contact: item.contact_name,
            invoice: item.invoice_number,
            rentFor: `${item.rent_period_start} – ${item.rent_period_end}`,
            rent: Number(item.rent_amount),
            occupants: item.occupants,
            water: Number(item.water_payment),
            garbage: Number(item.gbg_fee) || 0,
            anniversary: '21 Aug',
            deposit: Number(item.rent_amount) * 2,
          });
        }
      });
    }
  } catch {
    // Offline fallback
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
    return matchesCluster && matchesQuery;
  });
});

const totalRent = computed(() => rows.value.reduce((s, r) => s + r.rent, 0));
const totalShare = computed(() => rows.value.reduce((s, r) => s + (r.rent / 2), 0));
const totalWater = computed(() => rows.value.reduce((s, r) => s + r.water, 0));
const totalRemitted = computed(() => rows.value.reduce((s, r) => s + (r.rent / 2) + r.water, 0));

function exportCSV() {
  const headers = ['Unit', 'Cluster', 'Date Paid', 'Contact', 'Invoice', 'Rent For', 'Rent (PHP)', '50% Share (PHP)', 'Occupants', 'Water (PHP)', 'Garbage (PHP)', 'Remitted (PHP)'];
  const csvRows = [headers.join(',')];

  rows.value.forEach((r) => {
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

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Hivelet_Income_Ledger_July2026.csv`);
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
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-56"
        >
          <option value="All">All Clusters</option>
          <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <!-- Excel-Matched Ledger Table -->
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[1200px] text-xs border-collapse">
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
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7e5e4]">
            <tr 
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
  </div>
</template>
