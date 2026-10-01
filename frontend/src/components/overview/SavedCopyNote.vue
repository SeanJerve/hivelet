<script setup lang="ts">
/**
 * Says the figures below are the copy saved on this phone, not a live read (lib/offlineCache.ts;
 * Sean, 2026-10-01). Same verify colours and icon as App.vue's "No connection" bar, so the two
 * read as one state. Short on purpose: Sean asked for fewer words.
 */
import { computed } from 'vue';
import { WifiOff } from 'lucide-vue-next';
import { savedAtLabel } from '@/lib/offlineCache';

const props = defineProps<{ savedAt: number }>();
const when = computed(() => savedAtLabel(props.savedAt));
</script>

<template>
  <p
    role="status"
    class="ws-reveal flex items-start gap-2.5 rounded-tile bg-verify-soft p-4 text-sm font-medium leading-6 text-verify"
  >
    <WifiOff class="mt-1 size-4 shrink-0" aria-hidden="true" />
    <span>Offline. Showing what was saved on {{ when }}. Paying and other actions need a connection.</span>
  </p>
</template>
