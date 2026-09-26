import { nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Opens one record named in the URL, then takes the name back out.
 *
 * A notification links to `/admin/income?tab=verify&payment=<id>`, and the page
 * opens that payment instead of leaving the owner to scroll for it. It works on
 * arrival and while already on the page: clicking a second notification only
 * changes the query, which the watch sees.
 *
 * The parameter is removed once handled, so a refresh or Back does not reopen
 * the dialog, and clicking the same notification again still works.
 *
 * `open` fetches afresh when the record is not in the list it has: a
 * notification is usually about something newer than the page's last load.
 */
export function useOpenFromQuery(key: string, open: (id: string) => void | Promise<void>): void {
  const route = useRoute();
  const router = useRouter();

  watch(
    () => route.query[key],
    async (value) => {
      if (typeof value !== 'string' || !value) return;
      const next = { ...route.query };
      delete next[key];
      router.replace({ query: next });
      // `immediate` runs this during the page's setup, before the state its
      // dialog uses has been declared. One tick later the page is whole.
      await nextTick();
      await open(value);
    },
    { immediate: true },
  );
}

/**
 * Where a notification leads. The record's own dialog when the notification
 * names one, otherwise the page for its kind, as before.
 */
export function notificationTarget(
  item: { type: string; related_entity_type?: string | null; related_entity_id?: string | null },
  isAdmin: boolean,
): string | null {
  const id = item.related_entity_id ? encodeURIComponent(item.related_entity_id) : null;
  const kind = item.related_entity_type;

  if (isAdmin) {
    if (item.type === 'Payment' || item.type === 'Billing') {
      return kind === 'PAYMENT' && id ? `/admin/income?tab=verify&payment=${id}` : '/admin/income?tab=verify';
    }
    if (item.type === 'Maintenance') return kind === 'TICKET' && id ? `/admin/tickets?ticket=${id}` : '/admin/tickets';
    if (item.type === 'Inquiry') return kind === 'INQUIRY' && id ? `/admin/inquiries?inquiry=${id}` : '/admin/inquiries';
    return null;
  }

  if (item.type === 'Payment' || item.type === 'Billing') return '/tenant/payments';
  if (item.type === 'Maintenance') return kind === 'TICKET' && id ? `/tenant/tickets?ticket=${id}` : '/tenant/tickets';
  return '/tenant';
}
