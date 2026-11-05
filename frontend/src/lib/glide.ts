import type { Directive } from 'vue';

/**
 * v-glide: one pane of glass that slides between the options of a control (Sean, 5 Nov 2026,
 * after the sidebar: "I would love to have that animation on everything").
 *
 * Put it on the element whose children are the options: the sidebar's links, a dropdown's list,
 * a segmented switch. A pane is added behind them. It rests on the chosen option and glides to the
 * one under the pointer, then back when the pointer leaves. The options draw no fill of their own
 * inside a glide (glass.css `[data-glide]`), so the pane is the only highlight.
 *
 * The chosen option is the child with `data-chosen`, `aria-selected="true"`, `aria-current` or a
 * checked radio inside it. Positions come from the options' own boxes, so it works across or down.
 * Under reduced motion the pane moves without sliding (glass.css).
 */

interface GlideState {
  pane: HTMLSpanElement;
  hovered: HTMLElement | null;
  observer: MutationObserver;
  resize: ResizeObserver;
  onOver: (e: PointerEvent) => void;
  onLeave: () => void;
}
const states = new WeakMap<HTMLElement, GlideState>();

function options(el: HTMLElement): HTMLElement[] {
  return [...el.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('ws-glide'));
}

function isChosen(o: HTMLElement): boolean {
  return (
    o.hasAttribute('data-chosen') ||
    o.getAttribute('aria-selected') === 'true' ||
    (o.hasAttribute('aria-current') && o.getAttribute('aria-current') !== 'false') ||
    !!o.querySelector('input:checked')
  );
}

function place(el: HTMLElement) {
  const st = states.get(el);
  if (!st) return;
  const target = st.hovered ?? options(el).find(isChosen) ?? null;
  if (!target || target.offsetParent === null) {
    st.pane.style.opacity = '0';
    return;
  }
  st.pane.style.opacity = '1';
  st.pane.style.width = `${target.offsetWidth}px`;
  st.pane.style.height = `${target.offsetHeight}px`;
  st.pane.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
  st.pane.style.borderRadius = getComputedStyle(target).borderRadius;
  st.pane.classList.toggle('is-hover', target !== null && !isChosen(target));
}

export const vGlide: Directive<HTMLElement> = {
  mounted(el) {
    el.setAttribute('data-glide', '');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const pane = document.createElement('span');
    pane.className = 'ws-glide';
    pane.setAttribute('aria-hidden', 'true');
    el.prepend(pane);
    const st: GlideState = {
      pane,
      hovered: null,
      observer: new MutationObserver(() => place(el)),
      resize: new ResizeObserver(() => place(el)),
      onOver: (e) => {
        const o = options(el).find((c) => c.contains(e.target as Node)) ?? null;
        if (o && o !== st.hovered) {
          st.hovered = o;
          place(el);
        }
      },
      onLeave: () => {
        st.hovered = null;
        place(el);
      },
    };
    states.set(el, st);
    el.addEventListener('pointerover', st.onOver);
    el.addEventListener('pointerleave', st.onLeave);
    st.observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'aria-current', 'data-chosen', 'class'],
    });
    el.addEventListener('change', () => place(el));
    st.resize.observe(el);
    requestAnimationFrame(() => place(el));
  },
  updated(el) {
    place(el);
  },
  unmounted(el) {
    const st = states.get(el);
    if (!st) return;
    st.observer.disconnect();
    st.resize.disconnect();
    el.removeEventListener('pointerover', st.onOver);
    el.removeEventListener('pointerleave', st.onLeave);
    states.delete(el);
  },
};
