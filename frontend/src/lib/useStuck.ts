import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/**
 * True while a `position: sticky` element is stuck at its `top`, so it can draw a pane behind
 * itself only then (the list toolbars, Sean, 5 Nov 2026: search and filters stay in reach down a
 * long list). At rest the toolbar sits on the page as it always has.
 *
 * Read from the element's own box on scroll: stuck when its top sits at its sticky offset. Its
 * resting place is always lower than that offset (it sits under the page heading), and once its
 * container scrolls past, it is carried above the offset and is no longer stuck.
 */
export function useStuck(target: Ref<HTMLElement | null>): Ref<boolean> {
  const stuck = ref(false);

  function measure() {
    const el = target.value;
    if (!el) return;
    const top = parseFloat(getComputedStyle(el).top);
    if (Number.isNaN(top)) return;
    stuck.value = Math.abs(el.getBoundingClientRect().top - top) < 1;
  }

  onMounted(() => {
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    measure();
  });
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', measure);
    window.removeEventListener('resize', measure);
  });

  return stuck;
}
