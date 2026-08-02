<script setup lang="ts">
/**
 * @component AuditLogView
 * @description Read-only immutable audit trail (BR-018, BR-028, FR-029). audit_logs has no
 *              UPDATE/DELETE RLS policy at all (see the schema migration) -- this view can only
 *              ever display history, never alter it.
 */
import { ref, onMounted } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';

interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: any;
  new_values: any;
  created_at: string;
  actor: { full_name: string; email: string } | null;
}

const logs = ref<AuditRow[]>([]);
const loading = ref(true);

const loadLogs = async () => {
  loading.value = true;
  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, previous_values, new_values, created_at, actor:actor_profile_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  logs.value = (data as any) ?? [];
  loading.value = false;
};

onMounted(loadLogs);
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">System Audit</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">System Audit &amp; Activity Logs</h1>
      </div>
    </div>

    <p class="text-xs text-[#6b778c]">
      Immutable activity log tracking system actions, financial edits, and authorization events.
      Records here cannot be edited or deleted by any role, including the administrator.
    </p>

    <div v-if="loading" class="text-xs text-[#6b778c] p-4">Loading audit history...</div>

    <div v-else class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Timestamp</th>
              <th class="py-2.5 px-3">Actor</th>
              <th class="py-2.5 px-3">Action</th>
              <th class="py-2.5 px-3">Entity</th>
              <th class="py-2.5 px-3">Previous</th>
              <th class="py-2.5 px-3">New</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-[#f7f8f9] align-top">
              <td class="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">{{ new Date(log.created_at).toLocaleString() }}</td>
              <td class="py-2.5 px-3">{{ log.actor?.full_name || 'System' }}</td>
              <td class="py-2.5 px-3">
                <span class="jira-badge jira-badge-progress">{{ log.action }}</span>
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ log.entity_type }}</td>
              <td class="py-2.5 px-3 font-mono text-[10px] max-w-[180px] truncate" :title="JSON.stringify(log.previous_values)">
                {{ log.previous_values ? JSON.stringify(log.previous_values) : '—' }}
              </td>
              <td class="py-2.5 px-3 font-mono text-[10px] max-w-[180px] truncate" :title="JSON.stringify(log.new_values)">
                {{ log.new_values ? JSON.stringify(log.new_values) : '—' }}
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="py-6 text-center text-[#6b778c]">No audit records yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="flex items-center gap-2 text-[11px] text-[#8993a4]">
      <ShieldCheck class="w-3.5 h-3.5" />
      <span>Enforced at the database level -- no UPDATE or DELETE policy exists for this table.</span>
    </div>
  </div>
</template>
