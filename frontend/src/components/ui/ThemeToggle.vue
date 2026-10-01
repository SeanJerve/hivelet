<script setup lang="ts">
/**
 * The small light/dark switch on the public pages, which have no account menu
 * to hold the full Appearance control (Sean, 2026-10-01: dark mode).
 *
 * One press sets the theme opposite to what is showing, as an explicit
 * choice; "System" is still the default until someone presses it, and stays
 * one tap away in the account menu once they sign in. The icon is what the
 * press will do (a moon on the light page), and the label says it in words.
 */
import { computed } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { resolvedTheme, setThemeChoice } from '@/lib/theme';

const isDark = computed(() => resolvedTheme.value === 'dark');
const label = computed(() => (isDark.value ? 'Use the light theme' : 'Use the dark theme'));

function toggle() {
  setThemeChoice(isDark.value ? 'light' : 'dark');
}
</script>

<template>
  <button type="button" class="icon-btn-plain" :aria-label="label" :title="label" @click="toggle">
    <Sun v-if="isDark" class="size-4" aria-hidden="true" />
    <Moon v-else class="size-4" aria-hidden="true" />
  </button>
</template>
