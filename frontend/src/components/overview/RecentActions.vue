<script setup lang="ts">
/**
 * "Your recent actions": the last three things the signed-in person did, under
 * the greeting on each Overview (Sean, 5 Oct 2026, from the technical
 * evaluators' "action history": "so that when they go back to the website they
 * can see: I did these three things last time").
 *
 * Their own actions only, in sentences the server writes
 * (GET /auth/me/recent-actions, services/recentActions.ts), each linking to
 * where it happened. It is NOT the audit trail the adviser kept off the site
 * (judgement log 3.9): no codes, no other people, no addresses.
 *
 * Kept current with the rest of the page (lib/live.ts). A refresh that fails
 * keeps what is shown; only the first load reports a failure, quietly, since
 * nothing here is money or a decision.
 */
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowUpRight } from 'lucide-vue-next';
import { api } from '@/lib/api';
import { useLiveRefresh } from '@/lib/live';
import { PROPERTY_TIMEZONE } from '@/lib/propertyDate';
import Skeleton from '@/components/ui/Skeleton.vue';

interface RecentAction {
  id: string;
  at: string;
  text: string;
  link: string | null;
}

const actions = ref<RecentAction[]>([]);
const loading = ref(true);
const failed = ref(false);
/** On a phone only the latest shows until asked, so the money below stays in the first screen. */
const expanded = ref(false);

async function load(opts: { quiet?: boolean } = {}) {
  if (!opts.quiet) {
    loading.value = true;
    failed.value = false;
  }
  try {
    const data = await api.get<RecentAction[]>('/auth/me/recent-actions');
    actions.value = Array.isArray(data) ? data : [];
    failed.value = false;
  } catch {
    if (!opts.quiet) failed.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
useLiveRefresh(() => load({ quiet: true }));

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: PROPERTY_TIMEZONE });
const clock = (d: Date) => d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: PROPERTY_TIMEZONE });

/** "Just now", "12 minutes ago", "Today, 3:12 PM", "Yesterday, 3:12 PM", "4 Oct, 10:59 PM". */
function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const minutes = Math.round((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (dayKey(d) === dayKey(now)) return `Today, ${clock(d)}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(d) === dayKey(yesterday)) return `Yesterday, ${clock(d)}`;
  const date = d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', timeZone: PROPERTY_TIMEZONE });
  return `${date}, ${clock(d)}`;
}
</script>

<template>
  <section aria-labelledby="recent-actions-title" class="rounded-tile bg-tile px-4 py-3.5 sm:px-5 sm:py-4">
    <h2 id="recent-actions-title" class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      Your recent actions
    </h2>

    <div v-if="loading" class="mt-2.5 grid gap-3 sm:grid-cols-3" aria-busy="true">
      <span class="sr-only" role="status">Loading your recent actions</span>
      <div v-for="i in 3" :key="i" class="flex flex-col gap-1.5">
        <Skeleton class-name="h-3.5 w-4/5 rounded-full" />
        <Skeleton class-name="h-3 w-24 rounded-full" />
      </div>
    </div>

    <p v-else-if="failed && actions.length === 0" class="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
      Your recent actions could not be loaded.
      <button type="button" class="press min-h-11 font-semibold text-brand hover:text-brand-strong cursor-pointer" @click="load()">
        Try again
      </button>
    </p>

    <p v-else-if="actions.length === 0" class="mt-1.5 text-sm text-ink-soft">
      Nothing yet. What you do here will be listed, newest first.
    </p>

    <ol v-else class="mt-1.5 grid gap-x-4 sm:grid-cols-3">
      <li v-for="(a, i) in actions" :key="a.id" :class="['min-w-0', i > 0 && !expanded && 'max-sm:hidden']">
        <component
          :is="a.link ? RouterLink : 'div'"
          v-bind="a.link ? { to: a.link } : {}"
          :class="[
            'group -mx-2 flex min-h-11 items-start justify-between gap-2 rounded-xl px-2 py-1.5',
            a.link && 'press hover:bg-canvas',
          ]"
        >
          <span class="min-w-0">
            <span class="block break-words text-sm font-medium leading-snug text-ink">{{ a.text }}</span>
            <time :datetime="a.at" class="mt-0.5 block text-xs text-ink-faint">{{ when(a.at) }}</time>
          </span>
          <ArrowUpRight
            v-if="a.link"
            class="mt-0.5 size-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        </component>
      </li>
    </ol>
    <button
      v-if="actions.length > 1"
      type="button"
      class="press -mb-1 min-h-11 text-sm font-semibold text-brand hover:text-brand-strong cursor-pointer sm:hidden"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show fewer' : `Show ${actions.length - 1} more` }}
    </button>
  </section>
</template>
