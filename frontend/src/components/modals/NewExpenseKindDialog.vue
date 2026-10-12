<script setup lang="ts">
/**
 * A kind of expense of her own, beside the thirteen built in.
 *
 * The owner, 2026-10-12, asked whether the 13 categories stay fixed: "Keep the
 * 13, but she should also have the ability to add her own." Opened from "Add a
 * new kind..." at the foot of the Kind of expense list in Record expense and
 * Edit this expense; on top of that dialog, as "Delete this expense?" sits on
 * top of the editor, so what she had typed there is still there afterwards.
 *
 * Name only. The number and the place in the list are the server's
 * (POST /admin/expense-categories, backend/src/services/expenseCategories.ts):
 * the next number after her codes, after the thirteen. The rules are checked
 * here first so a slip is answered under the field at once, and again by the
 * server, whose refusal is shown inside this dialog (WsModal draws a message
 * raised while it is on top under its title).
 *
 * There is no rename or remove, so the hint says to check the spelling.
 */
import { ref, computed, useId } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';
import { api, failureTitle } from '@/lib/api';
import { showToast } from '@/lib/systemState';

export interface ExpenseKind {
  code: string;
  name: string;
  parent_code: string | null;
  display_order: number;
}

const props = defineProps<{
  /** Every kind already in the list, to refuse a second of the same name before asking the server. */
  existing: ReadonlyArray<{ code: string; name: string }>;
}>();

const emit = defineEmits<{ created: [kind: ExpenseKind]; close: [] }>();

/** The server's limits (owner's request, 2026-10-12): 2 to 60 characters. */
const MIN = 2;
const MAX = 60;

const name = ref('');
const problem = ref('');
const busy = ref(false);
const fieldId = useId();
const errorId = useId();
const hintId = useId();

/** As the server stores it: trimmed, runs of spaces made one. */
const cleaned = computed(() => name.value.replace(/\s+/g, ' ').trim());
const key = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');

function nameProblem(): string {
  const n = cleaned.value;
  if (!n) return 'Enter a name for the new kind.';
  if (n.length < MIN) return `Use at least ${MIN} characters.`;
  if (n.length > MAX) return `Keep it to ${MAX} characters or fewer (this is ${n.length}).`;
  const same = props.existing.find((k) => key(k.name) === key(n));
  if (same) return `"${same.name}" is already in the list (${same.code}). Choose it there instead.`;
  return '';
}

async function save() {
  problem.value = nameProblem();
  if (problem.value) {
    document.getElementById(fieldId)?.focus();
    return;
  }
  busy.value = true;
  try {
    const created = await api.post<ExpenseKind>('/admin/expense-categories', { name: cleaned.value });
    emit('created', created);
  } catch (err: any) {
    showToast('error', failureTitle(err, 'Not added'), err?.message || 'The new kind could not be added. Please try again.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <WsModal
    title="New kind of expense"
    subtitle="It goes in the list after your 13."
    size="sm"
    :dismissible="!busy"
    :close-disabled="busy"
    @close="emit('close')"
  >
    <form id="new-expense-kind" class="flex flex-col gap-4" novalidate @submit.prevent="save">
      <div class="ws-field">
        <label :for="fieldId">Name</label>
        <input
          :id="fieldId"
          v-model="name"
          type="text"
          autocomplete="off"
          placeholder="Internet and cable"
          :disabled="busy"
          :class="['ws-input w-full', problem && 'border-overdue']"
          :aria-invalid="problem ? 'true' : undefined"
          :aria-describedby="problem ? errorId : hintId"
          @input="problem = ''"
        />
        <span v-if="problem" :id="errorId" class="ws-reveal text-sm text-overdue">{{ problem }}</span>
        <span v-else :id="hintId" class="ws-hint">A kind can't be renamed or removed once added, so check the spelling.</span>
      </div>
    </form>

    <template #actions>
      <button type="button" class="pill-btn" :disabled="busy" @click="emit('close')">Cancel</button>
      <button type="submit" form="new-expense-kind" class="pill-btn-brand disabled:opacity-50" :disabled="busy">
        <Loader2 v-if="busy" class="size-4 animate-spin" aria-hidden="true" />
        <span>Add kind</span>
      </button>
    </template>
  </WsModal>
</template>
