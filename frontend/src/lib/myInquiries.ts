/**
 * @file lib/myInquiries.ts
 * @description The enquiries this browser has sent, so /inquiry can list them
 * without the visitor keeping the link (065, Sean 2026-09-30).
 *
 * A convenience only. It lives in this browser's localStorage and nowhere else:
 * a private window, another phone or cleared site data starts empty, which is
 * why the page also opens a conversation from its link or from the reference
 * code and phone number. Listed on the privacy page's browser-storage section.
 *
 * What is kept is what the link itself carries: the secret, the reference code,
 * the unit and when it was sent. Never the name, phone number or message.
 */
export type SavedInquiry = { token: string; referenceCode: string; unit: string | null; sentAt: string };

const KEY = 'hivelet_my_inquiries';

export function savedInquiries(): SavedInquiry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((x) => x && typeof x.token === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberInquiry(entry: SavedInquiry): void {
  try {
    const rest = savedInquiries().filter((x) => x.token !== entry.token);
    localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, 10)));
  } catch {
    /* storage unavailable: the link and the code still work */
  }
}

export function forgetInquiry(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(savedInquiries().filter((x) => x.token !== token)));
  } catch {
    /* nothing to do */
  }
}

/** The conversation page's address for a secret. The secret rides in the #fragment, which browsers never send to a server. */
export function conversationUrl(token: string): string {
  return `${window.location.origin}/inquiry#t=${encodeURIComponent(token)}`;
}
