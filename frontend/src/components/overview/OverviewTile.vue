<script setup lang="ts">
/**
 * The workspace tile. Tone carries rank, not decoration: `brand` and `night`
 * are reserved for the one or two things on a screen that ask for action.
 */
import { computed, useId } from 'vue';
import { ArrowUpRight } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    title?: string;
    tone?: 'plain' | 'soft' | 'brand' | 'night';
    /** Where the tile's arrow leads. Omit when there is nowhere to go. */
    to?: string;
    toLabel?: string;
  }>(),
  { tone: 'plain' }
);

const titleId = useId();

const isDark = computed(() => props.tone === 'brand' || props.tone === 'night');

const toneClass = computed(
  () =>
    ({
      plain: 'bg-tile text-ink',
      soft: 'bg-brand-soft text-ink',
      brand: 'bg-brand text-on-brand on-dark',
      night: 'bg-night text-on-night on-dark',
    })[props.tone]
);
</script>

<template>
  <section
    :aria-labelledby="title ? titleId : undefined"
    :class="['rounded-tile p-5 sm:p-6 flex flex-col gap-4 min-w-0', toneClass]"
  >
    <header v-if="title || to || $slots.actions" class="flex items-start justify-between gap-3">
      <h2 v-if="title" :id="titleId" class="text-[0.9375rem] leading-5 font-semibold pt-2.5">
        {{ title }}
      </h2>
      <div class="flex items-center gap-2 shrink-0 ml-auto">
        <slot name="actions" />
        <router-link
          v-if="to"
          :to="to"
          :aria-label="toLabel || `Open ${title}`"
          :class="['icon-btn', isDark && 'icon-btn-on-dark']"
        >
          <ArrowUpRight class="size-4" aria-hidden="true" />
        </router-link>
      </div>
    </header>
    <slot />
  </section>
</template>
