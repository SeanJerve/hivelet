/**
 * @file lib/phoneFormat.ts
 * @description Phone numbers spaced as they are typed: 0917 123 4567.
 *
 * Technical evaluators, 3 Oct 2026: "auto format the phone number with
 * spacing", and number validation. Every phone field takes `v-phone`
 * (registered in main.ts). It spaces the digits 4-3-4 as they are typed, or
 * +63 917 123 4567 when the number starts with +63, keeps the caret where the
 * person was typing, and drops anything that is not a digit.
 *
 * SPACES ARE SAFE TO STORE. Every comparison reads the digits only: sign-in
 * and the unique index use `normalize_ph_phone()`, the inquiry lookup
 * `phoneKey()`, and `phoneDigits()` on both sides. What a field holds is what
 * the person sees.
 */
import type { Directive } from 'vue';

/** The digits of `raw`, spaced 0917 123 4567 (or +63 917 123 4567), cut at a full number. */
export function formatPhone(raw: string | null | undefined): string {
  const value = String(raw ?? '');
  const intl = value.trim().startsWith('+');
  let digits = value.replace(/\D/g, '');
  if (intl || /^63/.test(digits)) {
    digits = digits.slice(0, 12);
    const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 12)].filter(Boolean);
    return (intl ? '+' : '') + groups.join(' ');
  }
  digits = digits.slice(0, 11);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)].filter(Boolean).join(' ');
}

/** How many digits (and a leading +) sit before position `at`. */
function countKept(text: string, at: number): number {
  return text.slice(0, at).replace(/[^\d+]/g, '').length;
}

function reformat(el: HTMLInputElement, keepCaret: boolean) {
  const raw = el.value;
  const formatted = formatPhone(raw);
  if (formatted === raw) return;
  const kept = keepCaret ? countKept(raw, el.selectionStart ?? raw.length) : 0;
  el.value = formatted;
  if (keepCaret) {
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < kept) {
      if (/[\d+]/.test(formatted[pos])) seen++;
      pos++;
    }
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* some input types do not take a selection */
    }
  }
  // Tell v-model. The second pass finds the value already formatted and stops.
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function onInput(e: Event) {
  reformat(e.target as HTMLInputElement, true);
}

/**
 * `v-phone` on an <input>. Formats while typing and when a value arrives from
 * the server (a number on file shows spaced too), never while the field has
 * focus from outside a keystroke.
 */
export const vPhone: Directive<HTMLInputElement> = {
  mounted(el) {
    el.addEventListener('input', onInput);
    if (!el.hasAttribute('maxlength')) el.setAttribute('maxlength', '16');
    if (!el.hasAttribute('inputmode')) el.setAttribute('inputmode', 'tel');
    if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'tel');
    reformat(el, false);
  },
  updated(el) {
    if (document.activeElement !== el) reformat(el, false);
  },
  beforeUnmount(el) {
    el.removeEventListener('input', onInput);
  },
};
