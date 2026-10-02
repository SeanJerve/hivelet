<script setup lang="ts">
/**
 * The Tenants page for a past year or month: who paid for each unit, read
 * from her receipts (lib/tenantHistory.ts says why the receipts and not the
 * accounts, and how one person's several spellings are shown as one).
 *
 * Read-only. Nothing here writes, and her records are shown as she wrote them:
 * a folded spelling is listed under the name it was folded into, never hidden.
 */
import { computed, onMounted, ref } from 'vue';
import {
  incomeRecords,
  incomeRecordsFetchFailed,
  fetchIncomeRecords,
  tenants,
} from '@/lib/systemState';
import { buildTenantHistory, monthsLabel, type HistoryPerson } from '@/lib/tenantHistory';
import RecordTable from '@/components/ui/RecordTable.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import DownloadDialog from '@/components/ui/DownloadDialog.vue';
import { FileSpreadsheet } from 'lucide-vue-next';

const props = defineProps<{
  year: number;
  /** 1 to 12, or null for the whole year. */
  month: number | null;
  query: string;
}>();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const loading = ref(false);

onMounted(async () => {
  // The ledger is usually loaded already by another screen; one fetch if not.
  if (incomeRecords.length === 0) {
    loading.value = true;
    await fetchIncomeRecords();
    loading.value = false;
  }
});

const people = computed<HistoryPerson[]>(() =>
  buildTenantHistory(
    incomeRecords.map((r) => ({
      unit: r.unit,
      year: r.year,
      month: r.month,
      contact: r.contact,
      datePaid: r.datePaid,
      rentFor: r.rentFor,
      invoice: r.invoice ?? "",
    })),
    tenants.map((t) => ({ name: t.name, unitCode: t.unitCode, status: t.status })),
    { year: props.year, month: props.month }
    // No unit order passed: units sort by their code (1A to 3G, then B, F, L,
    // PH), whatever order the room list arrived in.
  )
);

const shown = computed(() => {
  const q = props.query.trim().toLowerCase();
  if (!q) return people.value;
  return people.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q) ||
      p.otherSpellings.some((s) => s.toLowerCase().includes(q))
  );
});

const periodLabel = computed(() => (props.month ? `${MONTHS[props.month - 1]} ${props.year}` : String(props.year)));

/** Shared with the workbook (lib/tenantHistory.ts), so the two print it alike. */
const monthsFor = (p: HistoryPerson) => monthsLabel(p.months);

/**
 * The same period as a workbook, built by the server with the same rule and
 * written to the audit record like the other downloads. The button opens the
 * Download dialog (Sean, 2026-10-02) on the year and month shown here; it can
 * also take another month, another year, or every year (a sheet for each).
 */
const isDownloadOpen = ref(false);
const historyYears = computed(() =>
  [...new Set(incomeRecords.map((r) => Number(r.year)).filter(Boolean))].sort((a, b) => b - a)
);

const cols = computed(() => (props.month ? ['12%', '34%', '24%', '16%', '14%'] : ['12%', '48%', '26%', '14%']));
</script>

<template>
  <div class="ws-reveal space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <p class="max-w-3xl text-sm leading-6 text-ink-soft">
        Who paid for each unit in {{ periodLabel }}, from the receipts in Monthly Income. Names are as
        written on the payments; when one person was written two ways in the same unit, they are shown
        once, with the other spelling under their name.
      </p>
      <!-- "Download", with the period and the format in its name and tooltip:
           the same short label as the ledgers' (Sean, 2026-10-01). -->
      <button
        type="button"
        class="pill-btn w-full shrink-0 sm:w-auto sm:min-w-44"
        :disabled="loading"
        aria-haspopup="dialog"
        :aria-label="`Download ${periodLabel} for Excel`"
        :title="`Download ${periodLabel} for Excel`"
        @click="isDownloadOpen = true"
      >
        <FileSpreadsheet class="size-4 text-ink-soft" aria-hidden="true" />
        <span>Download</span>
      </button>
    </div>

    <DownloadDialog
      v-if="isDownloadOpen"
      kind="tenants"
      title="Tenant History"
      :years="historyYears"
      :year="year"
      :month="month"
      @close="isDownloadOpen = false"
    />

    <SkeletonTable v-if="loading" :columns="month ? 5 : 4" :rows="6" />

    <UnavailableNote
      v-else-if="incomeRecordsFetchFailed && incomeRecords.length === 0"
      message="The payments could not be loaded, so the history cannot be shown."
      @retry="fetchIncomeRecords"
    />

    <RecordTable
      v-else
      :rows="shown"
      :caption="`Tenants by unit in ${periodLabel}, from the payments`"
      noun="tenant"
      :cols="cols"
      :empty-title="`No payments for ${periodLabel}`"
      :empty-note="query ? 'Try another name or unit.' : 'Nothing is recorded for this period yet.'"
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Tenant</th>
          <template v-if="month">
            <th scope="col">Covers</th>
            <th scope="col">Paid on</th>
            <th scope="col">Invoice</th>
          </template>
          <template v-else>
            <th scope="col">Months paid in {{ year }}</th>
            <th scope="col" class="num">Payments</th>
          </template>
        </tr>
      </template>

      <template #row="{ row: p }">
        <tr>
          <td class="font-semibold uppercase text-ink">{{ p.unit }}</td>
          <th scope="row">
            <span class="block font-semibold text-ink">{{ p.name }}</span>
            <span v-if="p.livesHereNow" class="block text-xs font-normal text-ink-soft">Lives here now</span>
            <span v-if="p.otherSpellings.length" class="block text-xs font-normal text-ink-soft">
              Also written as {{ p.otherSpellings.join(', ') }}
            </span>
            <span v-if="p.alsoIn.length" class="block text-xs font-normal text-ink-soft">
              Also rented {{ p.alsoIn.map((u) => u.toUpperCase()).join(', ') }}
            </span>
          </th>
          <template v-if="month">
            <td>{{ p.covers.join('; ') }}</td>
            <td>{{ p.paidOn.join('; ') }}</td>
            <td class="tabular">{{ p.receiptNumbers.join(', ') }}</td>
          </template>
          <template v-else>
            <td>{{ monthsFor(p) }}</td>
            <td class="num tabular">{{ p.receipts }}</td>
          </template>
        </tr>
      </template>

      <template #card="{ row: p }">
        <div class="min-w-0">
          <p class="text-base font-semibold leading-snug text-ink">{{ p.name }}</p>
          <p v-if="p.livesHereNow" class="mt-0.5 text-xs text-ink-soft">Lives here now</p>
          <p v-if="p.otherSpellings.length" class="mt-0.5 text-xs text-ink-soft">
            Also written as {{ p.otherSpellings.join(', ') }}
          </p>
          <p v-if="p.alsoIn.length" class="mt-0.5 text-xs text-ink-soft">
            Also rented {{ p.alsoIn.map((u) => u.toUpperCase()).join(', ') }}
          </p>
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-faint">Unit</dt>
            <dd class="font-semibold uppercase text-ink">{{ p.unit }}</dd>
          </div>
          <template v-if="month">
            <div>
              <dt class="text-xs text-ink-faint">Invoice</dt>
              <dd class="tabular text-ink">{{ p.receiptNumbers.join(', ') }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Covers</dt>
              <dd class="text-ink">{{ p.covers.join('; ') }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Paid on</dt>
              <dd class="text-ink">{{ p.paidOn.join('; ') }}</dd>
            </div>
          </template>
          <template v-else>
            <div>
              <dt class="text-xs text-ink-faint">Payments</dt>
              <dd class="tabular text-ink">{{ p.receipts }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-ink-faint">Months paid in {{ year }}</dt>
              <dd class="text-ink">{{ monthsFor(p) }}</dd>
            </div>
          </template>
        </dl>
      </template>
    </RecordTable>
  </div>
</template>
