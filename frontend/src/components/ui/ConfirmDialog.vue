<script setup lang="ts">
/**
 * "Are you sure?" on the workspace dialog. The confirm button says what will
 * happen rather than "Confirm", and a destructive one is styled as destructive.
 */
import WsModal from '@/components/ui/WsModal.vue';

withDefaults(
  defineProps<{
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
  }>(),
  { confirmLabel: 'Yes, do it', cancelLabel: 'Cancel', destructive: false, busy: false }
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <!--
    Not dismissible while busy. The two buttons below already disable
    themselves during a submit, but a click on the backdrop was not guarded
    the same way - so a stray click outside a destructive action already in
    flight could fire `cancel` while the request was still running, with
    nothing on screen to say it had. Escape still closes it either way; that
    is a deliberate keypress rather than a stray click, and every other modal
    in the workspace answers to it regardless of `dismissible` too.
  -->
  <WsModal
    :title="title"
    size="sm"
    :dismissible="!busy"
    :tone="destructive ? 'danger' : 'plain'"
    @close="emit('cancel')"
  >
    <p v-if="message" class="text-sm leading-6 text-ink-soft">{{ message }}</p>
    <slot />

    <template #actions>
      <button type="button" class="pill-btn" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</button>
      <button
        type="button"
        :class="destructive ? 'pill-btn-danger' : 'pill-btn-brand'"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </WsModal>
</template>
