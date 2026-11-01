<script setup lang="ts">
/**
 * One section of a dashboard: a title and what it holds, directly on the page, with space and no
 * rule around it. `boxed` puts it in a box, for what is waiting for the person and for a table
 * (Sean, 1 Nov 2026). For the first, pass it only while that is true.
 */
import { useId } from 'vue';
import { ArrowUpRight } from 'lucide-vue-next';

defineProps<{
  title?: string;
  /** A shorter title below 768px, for a tile that is half a phone's width. */
  phoneTitle?: string;
  /** Where the tile's arrow leads. Omit when there is nowhere to go. */
  to?: string;
  toLabel?: string;
  boxed?: boolean;
}>();

const titleId = useId();
</script>

<template>
  <section
    :aria-labelledby="title ? titleId : undefined"
    :class="['flex min-w-0 flex-col gap-4', boxed && 'ws-table-card rounded-tile bg-tile p-4 sm:p-6']"
  >
    <header v-if="title || to || $slots.actions" class="flex min-h-11 items-center justify-between gap-3">
      <h2 v-if="title" :id="titleId" class="text-base leading-6 font-semibold">
        <template v-if="phoneTitle">
          <span class="md:hidden">{{ phoneTitle }}</span><span class="max-md:hidden">{{ title }}</span>
        </template>
        <template v-else>{{ title }}</template>
      </h2>
      <div class="flex items-center gap-2 shrink-0 ml-auto">
        <slot name="actions" />
        <!--
          `title` is optional, and every current caller that sets `to` also
          sets `toLabel` - but a future one that does not would have this
          fall back to the literal string "Open undefined", read aloud to a
          screen reader, on an untitled tile.
        -->
        <router-link
          v-if="to"
          :to="to"
          :aria-label="toLabel || (title ? `Open ${title}` : 'Open')"
          class="icon-btn icon-btn-goto group/goto"
        >
          <!--
            A one-pixel nudge toward where the link leads, on hover only - the
            `.icon-btn` press and border feedback already answer a click, this
            answers the pointer arriving. `motion-safe:` rather than the global
            reduced-motion rule, because this tile has no guarantee of sitting
            under the `.ws-focus` root that rule is scoped to.
          -->
          <ArrowUpRight
            class="size-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[var(--ease-out)] motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5"
            aria-hidden="true"
          />
        </router-link>
      </div>
    </header>
    <slot />
  </section>
</template>
