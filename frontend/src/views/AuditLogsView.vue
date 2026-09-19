<script setup lang="ts">
/**
 * ============================================================================
 * AUDIT LOGS VIEW — SYSTEM AUDIT TRAIL (FR-029, BR-018, BR-028)
 * ============================================================================
 * Component Purpose:
 *   Provides administrators, compliance auditors, and capstone examiners with
 *   an immutable, chronological ledger of all administrative interventions,
 *   financial entries, corrections, tenant record updates, and room allocations.
 *
 * System Bible Alignment:
 *   - Section 14: Financial Corrections and Auditability (previous vs. new values).
 *   - Section 20: Security and Access Control.
 *   - BR-018: Financial Corrections must create an audit record.
 *   - BR-028: Auditability: Important business operations must be traceable.
 * ============================================================================
 */
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/lib/api';
import { downloadReport } from '@/lib/downloadReport';
import { usePaged } from '@/lib/usePaged';
import ShowMore from '@/components/ui/ShowMore.vue';
import { useToast } from '@/lib/useToast';
import { ShieldCheck, Search, FileSpreadsheet, ChevronDown } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

const { showToast } = useToast();

interface AuditRecord {
  id: string;
  actor_profile_id?: string;
  action: string;
  /**
   * These names must match `audit_logs` exactly, because the endpoint returns `select('*')`
   * and the row keys ARE the column names. Three of them did not:
   *
   *   entity_table  ->  entity_type       the table's column
   *   old_values    ->  previous_values   the table's column
   *   user_agent    ->  does not exist    nothing records one
   *
   * A wrong name in a browser is not an error - it is `undefined`, and every fallback in
   * this file then did its job perfectly on nothing. The entity column read "system" for
   * every row, and the Previous State panel read "null (Initial record insertion)" for every
   * row, which is the one thing an audit trail exists to show.
   */
  entity_type?: string;
  entity_id?: string;
  previous_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

const auditLogs = ref<AuditRecord[]>([]);
const isLoading = ref(false);
/** Set when the trail could not be loaded. Never replaced with sample rows. */
const loadError = ref<string | null>(null);
const searchQuery = ref('');
/**
 * Defaults to business events, not everything.
 *
 * 1,700 of the 2,221 rows in the live trail - 77% - are AUTH_ACCESS_DENIED,
 * almost all of them produced by a bug in this very application: `systemState.ts`
 * fired six administrator-only requests on every page load regardless of who was
 * signed in, and each refusal was dutifully audited. The bug is fixed, but the
 * table is append-only by design and those rows can never be removed.
 *
 * So the default view shows what the landlady actually did. The authentication
 * events are one click away and nothing is hidden - but a log that opens on 77%
 * noise is a log nobody reads.
 *
 * **The same thing happened again, from a different source, and was fixed on
 * 2026-09-19.** `LEDGER_EXPORT` does not begin with `AUTH_`, so every workbook
 * download counted as an event "done to the records" - and the verification
 * suites export one on every run. Measured that day: **1,581 of the 1,715
 * business rows, 92%**, leaving 134 real events under a newest-first limit of
 * 100. So this tab had quietly gone back to being the thing the paragraph above
 * describes. Downloads have their own chip now; they are still recorded, they
 * are simply not a change.
 */
const categoryFilter = ref<string>('business');

/**
 * The categories the DATABASE applies, before the row limit. The rest only
 * narrow what has already come back.
 */
const SERVER_SIDE_CATEGORIES = ['business', 'auth', 'export'];
const expandedRowId = ref<string | null>(null);
const rowLimit = ref<number>(100);

/**
 * Loads the audit trail.
 *
 * On failure this shows an error. It used to substitute four invented audit
 * entries - a financial correction, a cash collection, an expense, an onboarding -
 * each attributed to "Fe Galang Da Silva" with an invented IP address, so an API
 * hiccup rendered a fabricated audit trail that was indistinguishable from the
 * real one. The audit log is the one view whose entire claim is that it records
 * what actually happened; inventing rows for it is worse than showing nothing.
 */
async function fetchAuditLogs() {
  isLoading.value = true;
  loadError.value = null;
  try {
    // The category is applied by the DATABASE, before the row limit. It has to
    // be: 2,103 of the 2,223 rows are authentication events, so the newest 100
    // are all AUTH_*, and a filter applied here would return nothing at all.
    const params = new URLSearchParams({ limit: String(rowLimit.value) });
    if (SERVER_SIDE_CATEGORIES.includes(categoryFilter.value)) {
      params.set('category', categoryFilter.value);
    }
    const { data, meta } = await api.getWithMeta<
      AuditRecord[],
      { authTotal: number; exportTotal: number; businessTotal: number; grandTotal: number }
    >(`/admin/audit-logs?${params}`);

    auditLogs.value = Array.isArray(data) ? data : [];
    if (meta) {
      authTotal.value = meta.authTotal ?? 0;
      exportTotal.value = meta.exportTotal ?? 0;
      businessTotal.value = meta.businessTotal ?? 0;
      grandTotal.value = meta.grandTotal ?? 0;
    }
  } catch (err: unknown) {
    auditLogs.value = [];
    // The whole-table totals go with the rows.
    //
    // On a FIRST failure they are already 0 and `count()` prints an em-dash, so
    // nothing was claimed. On a REFRESH failure they held the figures from the
    // last good load and the three tiles went on presenting them as current,
    // directly above a banner saying the trail could not be read. Stale is a
    // quieter lie than invented, and this is the one screen whose entire claim
    // is that what it shows is what actually happened.
    authTotal.value = 0;
    exportTotal.value = 0;
    businessTotal.value = 0;
    grandTotal.value = 0;
    loadError.value =
      err instanceof Error ? err.message : 'The audit trail could not be loaded.';
  } finally {
    isLoading.value = false;
  }
}

watch(categoryFilter, (next, prev) => {
  const serverSide = (v: string) => SERVER_SIDE_CATEGORIES.includes(v);
  if (serverSide(next) || serverSide(prev)) fetchAuditLogs();
});

onMounted(() => {
  fetchAuditLogs();
});

/** Totals for the WHOLE table, from the API, not just the window on screen. */
const authTotal = ref(0);
const exportTotal = ref(0);
const businessTotal = ref(0);
const grandTotal = ref(0);
const authEventCount = computed(() => authTotal.value);
const exportEventCount = computed(() => exportTotal.value);
const businessEventCount = computed(() => businessTotal.value);

const filteredLogs = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  return auditLogs.value.filter(log => {
    // Category filter
    // 'business' and 'auth' are applied server-side; the rest narrow what came back.
    if (categoryFilter.value === 'financial' && !log.action.includes('FINANC') && !log.action.includes('PAYMENT') && !log.action.includes('COLLECT') && !log.action.includes('INCOME')) return false;
    if (categoryFilter.value === 'expense' && !log.action.includes('EXPENSE')) return false;
    if (categoryFilter.value === 'tenant' && !log.action.includes('TENANT') && !log.action.includes('VACAT')) return false;
    if (categoryFilter.value === 'room' && !log.action.includes('ROOM') && !log.action.includes('UNIT')) return false;

    if (!query) return true;

    return (
      log.action.toLowerCase().includes(query) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(query)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(query)) ||
      (log.profiles?.full_name && log.profiles.full_name.toLowerCase().includes(query)) ||
      (log.ip_address && log.ip_address.includes(query))
    );
  });
});


/**
 * A first page of entries, with the rest behind a control.
 *
 * All of them rendered at once. At the default limit that is 100 records each
 * carrying its own disclosure, and the reader's chosen limit goes to 500 - a
 * page five hundred entries long before anyone has asked to read one.
 */
const {
  visible: visibleLogs,
  remaining: remainingLogs,
  nextStep: nextLogStep,
  showMore: showMoreLogs,
  showEverything: showAllLogs,
} = usePaged(filteredLogs, 12);

/**
 * The kinds of event to read. Business and sign-in carry whole-table counts
 * from the API. The last three narrow whatever came back, so they carry none
 * rather than a number that would mean something different from its neighbours.
 */
const filterChips = computed<{ key: string; label: string; count: number | null; hint: string }[]>(
  () => [
    {
      key: 'business',
      label: 'Done to the records',
      count: businessEventCount.value,
      hint: 'Payments, expenses, tenants, units and repairs',
    },
    { key: 'auth', label: 'Sign-ins', count: authEventCount.value, hint: 'Sign-ins, sign-outs and refused requests' },
    /**
     * Downloads are their own chip because they are not a change.
     *
     * They used to be counted under "Done to the records", and they swamped it:
     * 1,581 of 1,715 on 2026-09-19, because the verification suites export a
     * workbook on every run. At a limit of 100 newest-first, the first page was
     * entirely exports.
     */
    { key: 'export', label: 'Downloads', count: exportEventCount.value, hint: 'Ledger workbooks that were downloaded. A read, not a change' },
    { key: 'all', label: 'Everything', count: grandTotal.value, hint: 'All three of the above' },
    { key: 'financial', label: 'Money in', count: null, hint: 'Within what is listed' },
    { key: 'expense', label: 'Money out', count: null, hint: 'Within what is listed' },
    { key: 'tenant', label: 'Tenants', count: null, hint: 'Within what is listed' },
  ]
);

/** Four figures on this page run into the thousands and need their separators. */
function count(n: number) {
  return n > 0 ? n.toLocaleString('en-US') : '—';
}

function toggleRow(id: string) {
  expandedRowId.value = expandedRowId.value === id ? null : id;
}

/** The kinds of event, each with its own tone. The words carry the meaning. */
function actionTone(action: string): 'verify' | 'paid' | 'overdue' | 'neutral' {
  const a = action.toUpperCase();
  if (a.includes('CORRECTION') || a.includes('VOID') || a.includes('DELETE') || a.includes('VACAT')) {
    return 'verify';
  }
  if (a.includes('DENIED') || a.includes('FAIL')) return 'overdue';
  if (a.includes('PAYMENT') || a.includes('COLLECT') || a.includes('ONBOARD') || a.includes('CREATE')) {
    return 'paid';
  }
  if (a.includes('EXPENSE')) return 'neutral';
  return 'neutral';
}

/** EXPENSE_ENTRY reads as "expense entry". */
function entityLabel(entity?: string): string {
  if (!entity) return 'the system';
  return entity.toLowerCase().replace(/_/g, ' ');
}

/**
 * The all-zero UUID is what the export writes when the entry belongs to no one
 * row. Printing it says "record 00000000-0000-…", which is a record nobody can
 * look up.
 */
function recordId(id?: string): string | null {
  if (!id) return null;
  return /^0+(-0+)*$/.test(id) ? null : id;
}

/** ADMIN_CREATE_EXPENSE reads as "Admin create expense". */
function actionLabel(action: string): string {
  const words = action.toLowerCase().replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatDate(isoStr: string): string {
  if (!isoStr) return 'No time recorded';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoStr;
  }
}

/**
 * The trail as a workbook, not a CSV.
 *
 * The CSV wrote `previous_values` and `new_values` as quoted JSON. Every comma,
 * quote and newline in them was a chance to shift a column, on the one artifact
 * whose whole claim is that it records exactly what happened. The workbook is
 * built server-side and its columns cannot slip.
 */
const isExporting = ref(false);

async function exportAuditTrail() {
  if (isExporting.value) return;
  if (filteredLogs.value.length === 0) {
    showToast('warning', 'Nothing to export', 'No entry is listed to export.');
    return;
  }
  isExporting.value = true;
  try {
    await downloadReport('audit', categoryFilter.value, { limit: rowLimit.value });
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          What has been done
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Every payment recorded, correction made, tenant moved and unit changed, in the order
          it happened, with who did it. Nothing here can be edited or removed (FR-029, BR-018,
          BR-028).
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">

        <button
          type="button"
          class="pill-btn-brand"
          :disabled="isExporting"
          @click="exportAuditTrail"
        >
          <FileSpreadsheet
            :class="['size-4', isExporting && 'animate-pulse']"
            aria-hidden="true"
          />
          <span>{{ isExporting ? 'Building the file' : 'Download for Excel' }}</span>
        </button>
      </div>
    </div>

    <!--
      What each figure counts is now part of what it says. Three of these tiles
      used to print the size of the window on screen under the word "Total".
    -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewTile title="Everything on record" tone="night">
        <p class="tabular text-4xl font-semibold leading-none">{{ count(grandTotal) }}</p>
        <p class="mt-2 text-sm leading-6 text-on-night-soft">
          entries in the whole trail, not only the ones listed below
        </p>
      </OverviewTile>

      <OverviewTile title="Done to the records">
        <p class="tabular text-4xl font-semibold leading-none text-ink">
          {{ count(businessEventCount) }}
        </p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">
          payments, expenses, tenants, units and repairs
        </p>
      </OverviewTile>

      <OverviewTile title="Sign-ins and refusals">
        <p class="tabular text-4xl font-semibold leading-none text-ink">
          {{ count(authEventCount) }}
        </p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">
          most of them a fault this application has since had fixed
        </p>
      </OverviewTile>

      <!--
        This tile read "100.0% - Non-repudiation audit standard", and the 100.0%
        was a hardcoded literal. A percentage of nothing, on the one page whose
        whole value is that it can be trusted. It now states a property that is
        actually true and provable: migration 002 runs
        `REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated,
        service_role`, so not even the API's own privileged role can alter or
        remove an audit row. Verified by attempting a delete, which PostgreSQL
        refuses with 42501.
      -->
      <OverviewTile title="Can this be altered" tone="soft">
        <p class="text-2xl font-semibold leading-tight text-brand">No, by the database</p>
        <p class="mt-2 text-sm leading-6 text-ink-soft">
          Changing and deleting are revoked from every role, the API's own included (BR-028)
        </p>
      </OverviewTile>
    </div>

    <!-- Search, the kinds of event, and how far back to read -->
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="relative xl:max-w-xs xl:flex-1">
        <Search
          class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <label for="audit-search" class="sr-only">Search the trail</label>
        <input
          id="audit-search"
          v-model="searchQuery"
          type="search"
          placeholder="Action, person, record or address"
          class="ws-input w-full pl-11"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Kind of event">
          <button
            v-for="chip in filterChips"
            :key="chip.key"
            type="button"
            :aria-pressed="categoryFilter === chip.key"
            :title="chip.hint"
            class="chip"
            @click="categoryFilter = chip.key"
          >
            {{ chip.label }}
            <span v-if="chip.count" class="chip-count">{{
              chip.count?.toLocaleString('en-US')
            }}</span>
          </button>
        </div>

        <div class="ws-field">
          <label for="audit-limit" class="sr-only">How many to read</label>
          <select
            id="audit-limit"
            v-model.number="rowLimit"
            class="ws-select w-auto"
            @change="fetchAuditLogs"
          >
            <option :value="50">Newest 50</option>
            <option :value="100">Newest 100</option>
            <option :value="250">Newest 250</option>
            <option :value="500">Newest 500</option>
          </select>
        </div>
      </div>
    </div>

    <!-- The trail could not be loaded. Shown instead of sample rows, on purpose. -->
    <div v-if="loadError" class="rounded-tile bg-overdue-soft p-5 sm:p-6">
      <p class="text-base font-semibold text-overdue">The trail could not be loaded.</p>
      <p class="mt-1 text-sm leading-6 text-overdue">{{ loadError }}</p>
      <p class="mt-2 text-sm leading-6 text-overdue">
        Nothing is listed below rather than sample entries, so what you read here is always the
        real record.
      </p>
      <button type="button" class="pill-btn-night mt-4" @click="fetchAuditLogs">Try again</button>
    </div>

    <SkeletonTable v-else-if="isLoading" :columns="4" :rows="8" />

    <div v-else-if="filteredLogs.length === 0" class="rounded-tile bg-tile px-6 py-16 text-center">
      <ShieldCheck class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
      <p class="mt-3 text-base font-semibold text-ink">Nothing matches</p>
      <p class="mt-1 text-sm leading-6 text-ink-soft">
        No entry in this window answers to what you have asked for.
      </p>
    </div>

    <!--
      A trail reads in time order, one entry at a time, and each entry carries a
      different kind of detail. It was a six-column table 960px wide, so on any
      laptop the actor and the address sat off the right edge and every phone
      scrolled sideways. Each entry is now a record: when, what, to which row,
      by whom, and a control that opens what actually changed.
    -->
    <div v-else class="overflow-hidden rounded-tile bg-tile">
      <p class="border-b border-line px-5 py-3 text-sm text-ink-soft sm:px-6">
        Newest first
      </p>

      <ul class="divide-y divide-line">
        <li v-for="l in visibleLogs" :key="l.id" class="p-5 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <StatusPill :tone="actionTone(l.action)">{{ actionLabel(l.action) }}</StatusPill>
                <time :datetime="l.created_at" class="tabular text-sm text-ink-soft">
                  {{ formatDate(l.created_at) }}
                </time>
              </div>

              <p class="mt-2 text-sm leading-6 text-ink">
                <span class="font-semibold">{{
                  l.profiles?.full_name || 'No signed-in person'
                }}</span>
                <span class="text-ink-soft"
                  >, {{ l.profiles?.role || 'the system itself' }}, on
                </span>
                <span class="font-semibold">{{ entityLabel(l.entity_type) }}</span>
              </p>

              <p class="tabular mt-1 break-all text-xs text-ink-faint">
                <span v-if="recordId(l.entity_id)">Record {{ recordId(l.entity_id) }} · </span>
                {{ l.ip_address ? `from ${l.ip_address}` : 'no address recorded' }}
              </p>
            </div>

            <button
              type="button"
              class="pill-btn shrink-0 self-start"
              :aria-expanded="expandedRowId === l.id"
              :aria-controls="`audit-change-${l.id}`"
              @click="toggleRow(l.id)"
            >
              <span>{{ expandedRowId === l.id ? 'Hide what changed' : 'What changed' }}</span>
              <ChevronDown
                :class="['size-3.5 transition-transform', expandedRowId === l.id && 'rotate-180']"
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            v-if="expandedRowId === l.id"
            :id="`audit-change-${l.id}`"
            class="mt-4 grid gap-3 md:grid-cols-2"
          >
            <div class="rounded-2xl bg-canvas p-4">
              <p class="text-sm font-semibold text-ink">Before</p>
              <pre
                class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-ink-soft"
                >{{
                  l.previous_values
                    ? JSON.stringify(l.previous_values, null, 2)
                    : 'Nothing. This entry created the record.'
                }}</pre
              >
            </div>

            <div class="rounded-2xl bg-brand-soft p-4">
              <p class="text-sm font-semibold text-brand">After</p>
              <pre
                class="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-brand"
                >{{
                  l.new_values ? JSON.stringify(l.new_values, null, 2) : 'Nothing recorded.'
                }}</pre
              >
            </div>
          </div>
        </li>
      </ul>
    </div>

    <ShowMore
      v-if="!isLoading && !loadError && filteredLogs.length > 0"
      :shown="visibleLogs.length"
      :total="filteredLogs.length"
      :remaining="remainingLogs"
      :next-step="nextLogStep || 12"
      noun="entry"
      @more="showMoreLogs"
      @all="showAllLogs"
    />
  </div>
</template>
