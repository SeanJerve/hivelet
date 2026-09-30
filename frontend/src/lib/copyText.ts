/**
 * Puts text on the clipboard, and says whether it worked.
 *
 * `navigator.clipboard.writeText` is the modern way, and it is refused more
 * often than it looks: by a browser embedded in another app, by a page that is
 * not focused, by a permissions setting. On the testing morning (2026-09-30)
 * the one-time password dialog said "Could not copy automatically" to Sean, so
 * the owner would have met the same thing handing a password over.
 *
 * The fallback is the older `document.execCommand('copy')` on a hidden
 * textarea, which still works in most of the places the modern call is
 * refused. The textarea goes inside the open dialog when there is one: a
 * dialog traps focus, and a textarea outside it would lose the selection the
 * copy reads before the copy runs.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused. Try the older way below.
  }

  const host =
    (document.activeElement?.closest('[role="dialog"]') as HTMLElement | null) ??
    (document.querySelector('[role="dialog"]') as HTMLElement | null) ??
    document.body;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.width = '1px';
  area.style.height = '1px';
  area.style.opacity = '0';
  const previous = document.activeElement as HTMLElement | null;
  host.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus?.();
  }
}
