<script setup lang="ts">
/**
 * The invoice field on Record payment and Edit payment: a number typed in, or
 * ACK for an acknowledgement receipt, which has no number.
 *
 * It was a text box with a <datalist> holding "Acknowledgement receipt". On a
 * phone a datalist is a suggestion in the keyboard's bar, the full words, and
 * on a computer a drop-down under the box; Loyd (2026-10-03) found it worked but
 * did not look like anything. Now the choice is a button in the box, "ACK",
 * the word her sheets and the Excel downloads already use: tap it and the box
 * reads ACK, tap it again and it is empty.
 *
 * What is saved does not change. `normalizeInvoiceNumber` (lib/invoiceNumber.ts,
 * and its twin on the server) turns anything starting "ack" into
 * ACKNOWLEDGEMENT_RECEIPT, as it did for "ACKNOWL" before, so the ledger keeps
 * one spelling and nothing already recorded needs touching.
 */
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';
import { isAcknowledgementReceipt } from '@/lib/invoiceNumber';

defineProps<{ id: string; label: string }>();
const model = defineModel<string>({ default: '' });

const isAck = computed(() => isAcknowledgementReceipt(model.value));

/** A record saved as "Acknowledgement receipt" opens reading ACK. */
const shown = computed({
  get: () => (isAck.value ? 'ACK' : model.value),
  set: (v: string) => (model.value = v),
});

/** No focus into the box afterwards: on a phone that would raise the keyboard
    for a field that is now filled in. */
function toggleAck() {
  model.value = isAck.value ? '' : 'ACK';
}
</script>

<template>
  <label :for="id">{{ label }}</label>
  <div class="relative">
    <input
      :id="id"
      v-model="shown"
      type="text"
      placeholder="INV#4627"
      class="ws-input w-full pr-20 font-mono"
      autocomplete="off"
      autocapitalize="characters"
      spellcheck="false"
    />
    <button
      type="button"
      :aria-pressed="isAck"
      aria-label="No number: acknowledgement receipt"
      title="Acknowledgement receipt (no number)"
      :class="[
        'press absolute right-1.5 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-full border px-3 text-xs font-semibold tracking-wide transition-colors',
        isAck ? 'border-brand bg-brand text-on-brand' : 'border-line bg-canvas text-ink-soft hover:text-ink',
      ]"
      @click="toggleAck"
    >
      <Check v-if="isAck" class="size-3.5" aria-hidden="true" />
      ACK
    </button>
  </div>
</template>
