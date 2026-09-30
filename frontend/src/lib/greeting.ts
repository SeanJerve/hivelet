/**
 * @file lib/greeting.ts
 * @description "Good morning", "Good noon", "Good afternoon" or "Good evening"
 * for the overviews, by the property's clock, kept current while the page is open.
 *
 * Both overviews worked this out once, when the page opened, from the device's
 * own hour, and had no noon: a tab opened at 11:50 still said "Good morning" at
 * three in the afternoon (Sean, 2026-09-30). "Good noon" is how the house greets
 * people between twelve and one.
 *
 * The hour is Manila's (PROPERTY_TIMEZONE), like every other date here, so a
 * phone set to another zone greets by the time at the boarding house.
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { PROPERTY_TIMEZONE } from './propertyDate';

export type PartOfDay = 'morning' | 'noon' | 'afternoon' | 'evening';

/** 05:00-11:59 morning, 12:00-12:59 noon, 13:00-17:59 afternoon, otherwise evening. */
export function partOfDayAt(date: Date = new Date()): PartOfDay {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: PROPERTY_TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(date)
  );
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour === 12) return 'noon';
  if (hour >= 13 && hour < 18) return 'afternoon';
  return 'evening';
}

/** The current part of the day, re-read every minute and whenever the tab comes back into view. */
export function usePartOfDay(): Ref<PartOfDay> {
  const part = ref<PartOfDay>(partOfDayAt());
  const refresh = () => {
    part.value = partOfDayAt();
  };
  let timer: ReturnType<typeof setInterval> | undefined;
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  onMounted(() => {
    timer = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', onVisible);
  });
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  });
  return part;
}

/** The name to greet someone by: the first word of their name, without an honorific. */
export function greetingName(fullName: string | null | undefined): string {
  const bare = (fullName ?? '').replace(/^(mrs|mr|ms|miss|dr)\.?\s+/i, '').trim();
  return bare.split(/\s+/)[0] ?? '';
}
