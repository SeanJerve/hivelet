<script setup lang="ts">
/**
 * The Appearance control in the account menu: System, Light or Dark (Sean,
 * 2026-10-01: dark mode). lib/theme.ts does the work.
 *
 * Native radio buttons under the segments rather than buttons with ARIA roles:
 * arrow keys move between them, a screen reader announces "Appearance, radio
 * group, Dark, 3 of 3, checked", and check:labels sees each wrapped in its
 * label. The inputs are visually hidden; the segment draws the focus ring
 * when its input has keyboard focus, since the hidden input itself cannot.
 */
import { Monitor, Moon, Sun } from 'lucide-vue-next';
import { setThemeChoice, themeChoice, type ThemeChoice } from '@/lib/theme';

const props = defineProps<{ name: string }>();

const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="text-xs text-ink-faint">Appearance</legend>
    <div class="mt-2 grid grid-cols-3 gap-1 rounded-full bg-canvas p-1">
      <label
        v-for="o in options"
        :key="o.value"
        :class="[
          'press flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold outline-offset-2 pointer-coarse:min-h-11',
          'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink',
          themeChoice === o.value ? 'bg-tile text-ink shadow-card' : 'text-ink-soft hover:text-ink',
        ]"
      >
        <input
          type="radio"
          class="sr-only"
          :name="props.name"
          :value="o.value"
          :checked="themeChoice === o.value"
          @change="setThemeChoice(o.value)"
        />
        <component :is="o.icon" class="size-3.5 shrink-0" aria-hidden="true" />
        <span>{{ o.label }}</span>
      </label>
    </div>
  </fieldset>
</template>
