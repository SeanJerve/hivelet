import { computed, ref, watch, type Ref } from 'vue';

/**
 * Shows a first page of a long list and asks before showing more.
 *
 * Every register in this application rendered every row it had. The expense
 * ledger and the audit trail run to hundreds, so the page scrollbar became a
 * sliver and the only way to the bottom of a screen was through the whole
 * ledger. Capping the first render keeps a screen the height of a screen.
 *
 * A change of filter starts the count again, or the reader is left several
 * pages into a list they have just replaced.
 */
export function usePaged<T>(rows: Ref<T[]>, pageSize = 10) {
  const shown = ref(pageSize);

  watch(rows, () => {
    shown.value = pageSize;
  });

  const visible = computed(() => rows.value.slice(0, shown.value));
  const remaining = computed(() => Math.max(0, rows.value.length - shown.value));
  const nextStep = computed(() => Math.min(pageSize, remaining.value));

  function showMore() {
    shown.value += pageSize;
  }

  function showEverything() {
    shown.value = rows.value.length;
  }

  return { visible, remaining, nextStep, shown, showMore, showEverything, pageSize };
}
