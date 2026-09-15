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
import { useToast } from '@/lib/useToast';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Activity, 
  DollarSign, 
  UserCheck, 
  FileText, 
  Clock, 
  Eye, 
  Database,
  ArrowRight
} from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';

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
 */
const categoryFilter = ref<string>('business');
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
    if (categoryFilter.value === 'business' || categoryFilter.value === 'auth') {
      params.set('category', categoryFilter.value);
    }
    const { data, meta } = await api.getWithMeta<
      AuditRecord[],
      { authTotal: number; businessTotal: number; grandTotal: number }
    >(`/admin/audit-logs?${params}`);

    auditLogs.value = Array.isArray(data) ? data : [];
    if (meta) {
      authTotal.value = meta.authTotal ?? 0;
      businessTotal.value = meta.businessTotal ?? 0;
      grandTotal.value = meta.grandTotal ?? 0;
    }
  } catch (err: unknown) {
    auditLogs.value = [];
    loadError.value =
      err instanceof Error ? err.message : 'The audit trail could not be loaded.';
  } finally {
    isLoading.value = false;
  }
}

watch(categoryFilter, (next, prev) => {
  const serverSide = (v: string) => v === 'business' || v === 'auth';
  if (serverSide(next) || serverSide(prev)) fetchAuditLogs();
});

onMounted(() => {
  fetchAuditLogs();
});

/** Totals for the WHOLE table, from the API, not just the window on screen. */
const authTotal = ref(0);
const businessTotal = ref(0);
const grandTotal = ref(0);
const authEventCount = computed(() => authTotal.value);
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

// KPIs
const totalEventsCount = computed(() => auditLogs.value.length);
const financialEventsCount = computed(() => 
  auditLogs.value.filter(l => l.action.includes('FINANC') || l.action.includes('PAYMENT') || l.action.includes('COLLECT') || l.action.includes('INCOME')).length
);
const expenseEventsCount = computed(() => 
  auditLogs.value.filter(l => l.action.includes('EXPENSE')).length
);

function toggleRow(id: string) {
  expandedRowId.value = expandedRowId.value === id ? null : id;
}

function getActionBadgeClass(action: string): string {
  const a = action.toUpperCase();
  if (a.includes('CORRECTION') || a.includes('VOID') || a.includes('DELETE') || a.includes('VACAT')) {
    return 'bg-amber-50 text-amber-800 ring-1 ring-amber-300';
  }
  if (a.includes('PAYMENT') || a.includes('COLLECT') || a.includes('ONBOARD') || a.includes('CREATE')) {
    return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300';
  }
  if (a.includes('EXPENSE')) {
    return 'bg-rose-50 text-rose-800 ring-1 ring-rose-300';
  }
  return 'bg-blue-50 text-blue-800 ring-1 ring-blue-300';
}

function formatDate(isoStr: string): string {
  if (!isoStr) return '—';
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

function exportAuditCSV() {
  if (filteredLogs.value.length === 0) {
    showToast('warning', 'Export Empty', 'No audit logs available to export.');
    return;
  }

  const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor', 'Role', 'IP Address', 'Previous Values', 'New Values'];
  const rows = filteredLogs.value.map(l => [
    `"${l.created_at}"`,
    `"${l.action}"`,
    `"${l.entity_type || '—'}"`,
    `"${l.entity_id || '—'}"`,
    `"${l.profiles?.full_name || 'System'}"`,
    `"${l.profiles?.role || 'admin'}"`,
    // An address that was not recorded is not 127.0.0.1. Exporting a plausible one into an
    // audit trail is worse than exporting a blank.
    `"${l.ip_address || '—'}"`,
    `"${JSON.stringify(l.previous_values || '').replace(/"/g, '""')}"`,
    `"${JSON.stringify(l.new_values || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Hivelet-Audit-Trail-Export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Audit Exported', 'Audit trail downloaded as CSV.');
}
</script>

<template>
  <div class="space-y-6">
    
    <!-- Page Header & Action Controls -->
    <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-foreground">System Audit Trail</span>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck class="size-6" />
          </div>
          <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            System Audit Trail &amp; Logs
          </h1>
        </div>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          Immutable chronological ledger tracking financial updates, landlady corrections, tenant mutations, and room adjustments (FR-029, BR-018, BR-028).
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
        <button
          @click="fetchAuditLogs"
          :disabled="isLoading"
          class="btn-secondary text-xs"
        >
          <RefreshCw :class="['size-3.5 text-muted-foreground', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button
          @click="exportAuditCSV"
          class="btn-primary text-xs"
        >
          <Download class="size-3.5 text-white" />
          <span>Export Audit CSV</span>
        </button>
      </div>
    </div>

    <!-- 4 Key Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="surface-card p-5">
        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Total Audit Events</span>
          <Activity class="size-4 text-primary" />
        </div>
        <p class="font-display text-3xl font-black text-foreground mt-3">
          {{ totalEventsCount }}
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          Traceable mutations in database
        </p>
      </div>

      <div class="surface-card p-5">
        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Financial Collections</span>
          <DollarSign class="size-4 text-emerald-600" />
        </div>
        <p class="font-display text-3xl font-black text-emerald-700 mt-3">
          {{ financialEventsCount }}
        </p>
        <p class="text-xs text-emerald-800 font-semibold mt-1">
          Income remittances &amp; adjustments
        </p>
      </div>

      <div class="surface-card p-5">
        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Expense Logs</span>
          <FileText class="size-4 text-rose-600" />
        </div>
        <p class="font-display text-3xl font-black text-rose-700 mt-3">
          {{ expenseEventsCount }}
        </p>
        <p class="text-xs text-rose-800 font-semibold mt-1">
          Categorized operational outlays
        </p>
      </div>

      <!--
        This card read "100.0% — Non-repudiation audit standard", and the 100.0%
        was a hardcoded literal. A percentage of nothing, on the one page whose
        whole value is that it can be trusted. It now states a property that is
        actually true and provable: migration 002 runs
        `REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated,
        service_role`, so not even the API's own privileged role can alter or
        remove an audit row. Verified by attempting a delete, which PostgreSQL
        refuses with 42501.
      -->
      <div class="surface-card p-5">
        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Tamper Resistance</span>
          <ShieldCheck class="size-4 text-primary" />
        </div>
        <p class="font-display text-3xl font-black text-primary mt-3">
          Append-only
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          UPDATE and DELETE are revoked from every role, including the API's own (BR-028)
        </p>
      </div>
    </div>

    <!-- Main Table Container -->
    <div class="surface-card overflow-hidden rounded-2xl border border-border-strong bg-white shadow-xs">
      
      <!-- Toolbar & Search -->
      <div class="p-4 border-b border-border-strong flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search action, actor, entity ID, or IP..."
            class="h-10 min-h-10 w-full rounded-xl border border-border-strong bg-white pl-10 pr-4 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <!-- Category Filter -->
          <div class="inline-flex rounded-xl bg-white p-1 border border-border-strong">
            <button
              @click="categoryFilter = 'business'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'business' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
              title="Payments, expenses, tenants, rooms and tickets - what was actually done to the records"
            >
              Business ({{ businessEventCount }})
            </button>
            <button
              @click="categoryFilter = 'auth'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'auth' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
              title="Sign-ins, sign-outs and refused requests"
            >
              Sign-in ({{ authEventCount }})
            </button>
            <button
              @click="categoryFilter = 'all'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
            >
              All ({{ grandTotal }})
            </button>
            <button
              @click="categoryFilter = 'financial'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'financial' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
            >
              Financial
            </button>
            <button
              @click="categoryFilter = 'expense'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'expense' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
            >
              Expenses
            </button>
            <button
              @click="categoryFilter = 'tenant'"
              :class="['px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer', categoryFilter === 'tenant' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground']"
            >
              Tenants
            </button>
          </div>

          <!-- Limit Selector -->
          <select 
            v-model.number="rowLimit" 
            @change="fetchAuditLogs" 
            class="h-8 px-2.5 rounded-lg border border-border-strong bg-white text-xs font-bold text-foreground"
          >
            <option :value="50">Last 50</option>
            <option :value="100">Last 100</option>
            <option :value="250">Last 250</option>
            <option :value="500">Last 500</option>
          </select>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <!-- The trail could not be loaded. Shown instead of sample rows, on purpose. -->
      <div
        v-if="loadError"
        class="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
      >
        <p class="font-bold text-rose-900">The audit trail could not be loaded.</p>
        <p class="mt-1">{{ loadError }}</p>
        <p class="mt-2 text-rose-700">
          Nothing is shown below rather than sample data, so what you see here is always
          the real record.
        </p>
        <button @click="fetchAuditLogs" class="btn-dark mt-3">Try again</button>
      </div>

      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="6" :rows="8" />
      </div>

      <!-- Audit Table -->
      <div v-else class="max-h-[600px] overflow-y-auto overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse min-w-[960px]">
          <thead class="sticky top-0 bg-background z-10 shadow-xs">
            <tr class="border-b border-border-strong text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
              <th class="py-3 px-4">Timestamp</th>
              <th class="py-3 px-4">Action Type</th>
              <th class="py-3 px-4">Target Entity / Table</th>
              <th class="py-3 px-4">Actor</th>
              <th class="py-3 px-4">Client IP</th>
              <th class="py-3 px-4 text-right">Payload Diff</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-strong">
            <template v-for="l in filteredLogs" :key="l.id">
              <tr 
                @click="toggleRow(l.id)"
                class="hover:bg-background transition-colors cursor-pointer"
              >
                <!-- Timestamp -->
                <td class="py-3 px-4 font-mono text-[11px] text-foreground whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <Clock class="size-3.5 text-muted-foreground" />
                    <span>{{ formatDate(l.created_at) }}</span>
                  </div>
                </td>

                <!-- Action Badge -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <span :class="['px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-tight', getActionBadgeClass(l.action)]">
                    {{ l.action }}
                  </span>
                </td>

                <!-- Entity Table -->
                <td class="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <Database class="size-3 text-primary" />
                    <span class="font-bold text-foreground">{{ l.entity_type || 'system' }}</span>
                    <span v-if="l.entity_id" class="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200">
                      {{ l.entity_id }}
                    </span>
                  </div>
                </td>

                <!-- Actor -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <div class="size-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">
                      {{ (l.profiles?.full_name || 'A').charAt(0).toUpperCase() }}
                    </div>
                    <span class="font-bold text-foreground">{{ l.profiles?.full_name || 'System (no signed-in actor)' }}</span>
                    <span class="text-[10px] font-semibold text-muted-foreground">({{ l.profiles?.role || 'system' }})</span>
                  </div>
                </td>

                <!-- IP -->
                <td class="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {{ l.ip_address || 'not recorded' }}
                </td>

                <!-- Diff Toggle -->
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <button 
                    type="button" 
                    class="btn-secondary min-h-7 px-2 py-0.5 text-[11px] gap-1 inline-flex items-center font-semibold"
                  >
                    <span>{{ expandedRowId === l.id ? 'Hide Diff' : 'View Diff' }}</span>
                    <ChevronDown :class="['size-3 transition-transform duration-200', expandedRowId === l.id ? 'rotate-180' : '']" />
                  </button>
                </td>
              </tr>

              <!-- Expandable Row: Old vs New Values Diff -->
              <tr v-if="expandedRowId === l.id" class="bg-surface-sunken">
                <td colspan="6" class="p-4">
                  <div class="rounded-xl border border-border-strong bg-white p-4 space-y-3 shadow-inner">
                    <div class="flex items-center justify-between text-xs font-bold text-foreground border-b border-border-strong pb-2">
                      <span class="flex items-center gap-1.5">
                        <FileText class="size-3.5 text-primary" />
                        Audit State Transition Record (ID: {{ l.id }})
                      </span>
                      <!--
                        The User Agent line is gone: `audit_logs` has no such column and
                        nothing writes one, so it read "not recorded" on every row forever.
                        A field that can only ever say "not recorded" is not information.
                      -->
                      <span v-if="l.entity_id" class="text-[11px] text-muted-foreground font-normal">
                        Entity: {{ l.entity_type || 'system' }} · {{ l.entity_id }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <!-- Old Values -->
                      <div class="p-3 rounded-lg bg-rose-50/60 border border-rose-200">
                        <div class="text-[10px] font-bold uppercase text-rose-800 mb-1.5 flex items-center gap-1">
                          <span>Previous State (Before Mutation)</span>
                        </div>
                        <pre class="text-[11px] text-rose-950 overflow-x-auto whitespace-pre-wrap">{{ l.previous_values ? JSON.stringify(l.previous_values, null, 2) : 'null (Initial record insertion)' }}</pre>
                      </div>

                      <!-- New Values -->
                      <div class="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                        <div class="text-[10px] font-bold uppercase text-emerald-800 mb-1.5 flex items-center gap-1">
                          <span>Committed State (After Mutation)</span>
                        </div>
                        <pre class="text-[11px] text-emerald-950 overflow-x-auto whitespace-pre-wrap">{{ l.new_values ? JSON.stringify(l.new_values, null, 2) : 'null' }}</pre>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="filteredLogs.length === 0">
              <td colspan="6" class="py-12 text-center text-xs text-muted-foreground">
                No audit events match your filter criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>
