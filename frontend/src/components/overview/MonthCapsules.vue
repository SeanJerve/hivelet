<script setup lang="ts">
/**
 * Twelve months as capsules on a labelled scale.
 *
 * Height encodes an amount only for recorded and expected months. A month not
 * yet entered is hatched across its whole track, because it has no height to
 * give. The selected month's exact figure is written out beneath the chart, so
 * nothing depends on hover, and each capsule is a button that says its own value
 * to a screen reader.
 */
import { computed, ref, watch, nextTick } from 'vue';
import { peso } from '@/lib/canonicalUnits';
import type { CapsuleMonth } from './types';

const props = defineProps<{
  months: CapsuleMonth[];
  label: string;
}>();

function defaultIndex(list: CapsuleMonth[]) {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'recorded') return i;
  return 0;
}

const selected = ref(defaultIndex(props.months));
watch(
  () => props.months.map((m) => m.kind + m.value).join('|'),
  () => (selected.value = defaultIndex(props.months))
);

/** A round top for the scale, the first step at or above the largest value. */
const scaleMax = computed(() => {
  const top = Math.max(0, ...props.months.map((m) => (m.kind === 'recorded' || m.kind === 'expected' ? m.value ?? 0 : 0)));
  if (top <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(top));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * magnitude >= top) return step * magnitude;
  return 10 * magnitude;
});

const ticks = computed(() => [scaleMax.value, scaleMax.value / 2, 0]);

function compact(value: number) {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toLocaleString('en-PH', { maximumFractionDigits: 1 })}M`;
  if (value >= 1000) return `₱${Math.round(value / 1000).toLocaleString('en-PH')}k`;
  return `₱${value}`;
}

function describe(m: CapsuleMonth) {
  switch (m.kind) {
    case 'recorded':
      return `${peso(m.value ?? 0)} recorded`;
    case 'unentered':
      return 'Not entered yet';
    case 'expected':
      return `${peso(m.value ?? 0)} expected`;
    default:
      return 'Nothing to estimate from';
  }
}

const buttons = ref<HTMLButtonElement[]>([]);

function move(delta: number) {
  const next = Math.min(props.months.length - 1, Math.max(0, selected.value + delta));
  selected.value = next;
  nextTick(() => buttons.value[next]?.focus());
}

const current = computed(() => props.months[selected.value]);
</script>

<template>
  <div class="flex flex-col gap-4 min-w-0">
    <div class="flex gap-3 min-w-0">
      <div aria-hidden="true" class="flex flex-col justify-between h-48 pb-7 text-xs text-ink-faint tabular text-right shrink-0">
        <span v-for="t in ticks" :key="t">{{ compact(t) }}</span>
      </div>

      <div class="overflow-x-auto min-w-0 flex-1 -mb-2 pb-2">
        <div
          role="group"
          :aria-label="label"
          class="grid h-48 gap-0.5 sm:gap-2 sm:min-w-[26rem]"
          :style="{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }"
        >
          <button
            v-for="(m, i) in months"
            :key="m.long"
            :ref="(el) => { if (el) buttons[i] = el as HTMLButtonElement }"
            type="button"
            :tabindex="i === selected ? 0 : -1"
            :aria-pressed="i === selected"
            :aria-label="`${m.long}, ${describe(m)}`"
            class="group flex flex-col items-center gap-2 h-full rounded-xl cursor-pointer"
            @click="selected = i"
            @keydown.right.prevent="move(1)"
            @keydown.left.prevent="move(-1)"
            @keydown.home.prevent="move(-months.length)"
            @keydown.end.prevent="move(months.length)"
          >
            <span class="relative flex w-full max-w-11 flex-1 items-end">
              <span
                v-if="m.kind === 'unentered'"
                class="absolute inset-0 rounded-full hatch border border-line"
              />
              <span
                v-else-if="m.kind === 'future'"
                class="absolute inset-0 rounded-full border border-dashed border-hatch"
              />
              <span
                v-else
                :class="[
                  'w-full rounded-full transition-colors',
                  m.kind === 'expected'
                    ? 'border-2 border-dashed border-ink-faint bg-tile'
                    : i === selected
                      ? 'bg-brand'
                      : 'bg-brand-bright group-hover:bg-brand-strong/80',
                ]"
                :style="{ height: `max(1.75rem, ${((m.value ?? 0) / scaleMax) * 100}%)` }"
              />
            </span>
            <span
              :class="[
                'leading-4',
                i === selected ? 'font-semibold text-ink' : 'text-ink-soft',
              ]"
            >
              <!--
                Twelve months across 375px leaves about 30px a column, and "Jan"
                does not fit that at a readable size. The initial does, the full
                name is in each button's aria-label, and the selected month is
                written out in full beneath the chart either way - so nothing is
                only available by reading three letters.
              -->
              <span class="text-xs sm:hidden">{{ m.short.charAt(0) }}</span>
              <span class="hidden text-xs sm:inline">{{ m.short }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <!--
        `current` is `months[selected]`, which is `undefined` if `months` is
        ever passed empty - `defaultIndex` returns 0 for an empty list rather
        than throwing, but `months[0]` on an empty array is still nothing.
        Guarded here rather than upstream because the grid above renders fine
        with zero buttons; only this summary line has anything to read.
      -->
      <p v-if="current" class="min-w-0" aria-live="polite">
        <span class="block text-xs leading-4 text-ink-faint">{{ current.long }}</span>
        <span class="block text-xl leading-7 font-semibold tabular text-ink">{{ describe(current) }}</span>
      </p>
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        <li class="flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-full bg-brand-bright" />Recorded</li>
        <li class="flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-full hatch border border-line" />Not entered yet</li>
        <li class="flex items-center gap-1.5"><span aria-hidden="true" class="size-3 rounded-full border-2 border-dashed border-ink-faint" />Expected</li>
      </ul>
    </div>
  </div>
</template>
