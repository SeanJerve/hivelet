<script setup lang="ts">
/**
 * "Are you sure?" on the workspace dialog. The confirm button says what will
 * happen rather than "Confirm", and a destructive one is styled as destructive.
 */
import { ref, computed, useId } from 'vue';
import WsModal from '@/components/ui/WsModal.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
    /**
     * Set this and the confirm button stays disabled until the exact phrase has
     * been typed. For an action whose cost is not obvious from the button.
     *
     * Optional on purpose: every existing caller is a one-click confirm and
     * keeps working untouched. Reach for it only where a mis-click is expensive
     * and a dialog alone would not stop one - moving a resident out takes their
     * access away on their next request, which no amount of red on a button
     * conveys.
     */
    confirmPhrase?: string;
    /** What the phrase IS, for the label: "the unit code", "their name". */
    confirmPhraseLabel?: string;
  }>(),
  { confirmLabel: 'Yes, do it', cancelLabel: 'Cancel', destructive: false, busy: false }
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const typed = ref('');
const phraseFieldId = useId();

/**
 * Trimmed and case-insensitive. The guard is against a mis-click, not against
 * someone who cannot hold shift - making her retype a capital letter twice
 * would train her to copy and paste it, which defeats the whole point.
 */
const phraseSatisfied = computed(() => {
  if (!props.confirmPhrase) return true;
  return typed.value.trim().toLowerCase() === props.confirmPhrase.trim().toLowerCase();
});

const confirmDisabled = computed(() => props.busy || !phraseSatisfied.value);
</script>

<template>
  <!--
    Not dismissible while busy. The two buttons below already disable
    themselves during a submit, but a click on the backdrop was not guarded
    the same way - so a stray click outside a destructive action already in
    flight could fire `cancel` while the request was still running, with
    nothing on screen to say it had. `dismissible` now gates Escape as well
    (WsModal), and `close-disabled` the header X, which it does not: the X
    still fired `cancel` mid-request until 2026-09-24 (B-61).
  -->
  <WsModal
    :title="title"
    size="sm"
    :dismissible="!busy"
    :close-disabled="busy"
    :tone="destructive ? 'danger' : 'plain'"
    @close="emit('cancel')"
  >
    <!-- `whitespace-pre-line`: a caller may separate a heading line from the
         explanation with a blank line (InquiriesView's close-lead), and without
         it the two ran together as one sentence. Every other caller passes a
         single line, which this leaves exactly as it was. -->
    <p v-if="message" class="whitespace-pre-line text-sm leading-6 text-ink-soft">{{ message }}</p>
    <slot />

    <div v-if="confirmPhrase" class="ws-field">
      <label :for="phraseFieldId">
        Type <strong class="text-ink">{{ confirmPhrase }}</strong>
        <template v-if="confirmPhraseLabel"> ({{ confirmPhraseLabel }})</template>
        to confirm
      </label>
      <input
        :id="phraseFieldId"
        v-model="typed"
        type="text"
        class="ws-input w-full"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>

    <template #actions>
      <button type="button" class="pill-btn" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</button>
      <button
        type="button"
        :class="destructive ? 'pill-btn-danger' : 'pill-btn-brand'"
        :disabled="confirmDisabled"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </WsModal>
</template>
