/**
 * @file services/recentActions.ts
 * @description The last few things the signed-in person did, in plain words.
 *
 * Technical evaluators, 3 Oct 2026: "action history". Sean, 5 Oct: show each
 * person what they did recently, "the last three things they did, so that when
 * they go back to the website they can see: I did these three things last time".
 *
 * THIS IS NOT THE AUDIT TRAIL ON A SCREEN. The adviser ruled the trail a
 * developer's record that does not belong on the site (judgement log 3.9), and
 * the Activity page stays gone. This reads the same rows but shows a person only
 * their OWN actions, only the ones a person would recognise as something they
 * did (an allow-list per role), and only a sentence built from named fields:
 * never the action code, the address, the raw values, or anyone else's actions.
 * Sign-ins, refused requests and downloads are left out; so is anything the
 * sentence builder does not know, rather than shown as a code.
 *
 * Every lookup that names something (a unit, a repair, an inquiry, a tenant)
 * is read from the row's own values first and from its table only when the row
 * did not carry it. A name that can no longer be found is left out of the
 * sentence rather than guessed.
 */
import { db } from '../config/db.js';

export type ActorRole = 'admin' | 'tenant';

export interface RecentAction {
  id: string;
  /** When it happened (ISO). */
  at: string;
  /** What happened, in a sentence: "Recorded a payment for 2B, October 2026, ₱8,800." */
  text: string;
  /** Where to see it, or null. */
  link: string | null;
}

const ADMIN_ACTIONS = [
  'PAYMENT_RECORD', 'PAYMENT_VERIFY', 'PAYMENT_CORRECT',
  'EXPENSE_CREATE', 'EXPENSE_UPDATE', 'EXPENSE_VOID',
  'TENANT_CREATE', 'TENANT_UPDATE', 'TENANT_DEACTIVATE',
  'TICKET_CREATE', 'TICKET_STATUS_CHANGE', 'TICKET_DELETE', 'TICKET_MESSAGE_SEND',
  'INQUIRY_MESSAGE_SEND', 'INQUIRY_STATUS_CHANGE', 'INQUIRY_DELETE',
  'ROOM_UPDATE', 'ROOM_STATUS_CHANGE', 'BILL_CREATE', 'AUTH_PASSWORD_CHANGE',
] as const;

const TENANT_ACTIONS = [
  'TICKET_CREATE', 'TICKET_MESSAGE_SEND', 'TICKET_CANCEL',
  'PROFILE_UPDATE', 'AUTH_PASSWORD_CHANGE', 'PAYMENT_RECORD',
] as const;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Json = Record<string, any>;
interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_values: Json | null;
  new_values: Json | null;
  created_at: string;
}

function peso(n: unknown): string | null {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function period(month: unknown, year: unknown): string | null {
  const m = Number(month);
  const y = Number(year);
  return m >= 1 && m <= 12 && y > 2000 ? `${MONTHS[m - 1]} ${y}` : null;
}

const unitCode = (code: unknown) => (code ? String(code).toUpperCase() : null);
const quoted = (title: unknown) => (title ? `“${String(title).trim()}”` : null);
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(', ');

/** Reads `ids` from `table` in one query, as a map by id. Empty on any failure: a name is optional. */
async function lookup(table: string, columns: string, ids: Set<string>): Promise<Map<string, Json>> {
  const list = [...ids].filter(Boolean);
  if (list.length === 0) return new Map();
  const { data, error } = await db.from(table).select(columns).in('id', list);
  if (error || !Array.isArray(data)) return new Map();
  return new Map((data as unknown as Json[]).map((row) => [String(row.id), row]));
}

/**
 * The signed-in person's last `limit` recognisable actions, newest first.
 * Reads at most 40 audit rows of theirs, so a burst of identical actions
 * (three GCash checkouts started in a row) still leaves room for others.
 */
export async function recentActionsFor(profileId: string, role: ActorRole, limit = 3): Promise<RecentAction[]> {
  const allowed: readonly string[] = role === 'admin' ? ADMIN_ACTIONS : TENANT_ACTIONS;
  const { data, error } = await db
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, previous_values, new_values, created_at')
    .eq('actor_profile_id', profileId)
    .in('action', allowed as string[])
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AuditRow[];

  // What the sentences need that the rows may not carry.
  const roomIds = new Set<string>();
  const ticketIds = new Set<string>();
  const inquiryIds = new Set<string>();
  const profileIds = new Set<string>();
  const paymentIds = new Set<string>();
  const billIds = new Set<string>();
  for (const r of rows) {
    const nv = r.new_values ?? {};
    const pv = r.previous_values ?? {};
    for (const id of [nv.room_id, pv.room_id]) if (id) roomIds.add(String(id));
    if (r.entity_id) {
      if (r.action.startsWith('TICKET_')) ticketIds.add(r.entity_id);
      if (r.action.startsWith('INQUIRY_')) inquiryIds.add(r.entity_id);
      if (r.action === 'TENANT_DEACTIVATE' || r.action === 'TENANT_UPDATE') profileIds.add(r.entity_id);
      if (r.action === 'PAYMENT_VERIFY') paymentIds.add(r.entity_id);
      if (r.action === 'PAYMENT_RECORD' && role === 'tenant') billIds.add(r.entity_id);
    }
  }
  const [rooms, tickets, inquiries, profiles, payments, bills] = await Promise.all([
    lookup('rooms', 'id, room_number', roomIds),
    lookup('maintenance_tickets', 'id, title, room_id', ticketIds),
    lookup('inquiries', 'id, prospect_name', inquiryIds),
    lookup('profiles', 'id, full_name', profileIds),
    lookup('payments', 'id, amount, room_id, payment_method', paymentIds),
    lookup('bills', 'id, total_amount', billIds),
  ]);
  // A payment's unit is known only once the payment is read, after the first lookup of units; so
  // "Approved a GCash payment of P8,800" never said which unit. Read those units now.
  const paymentRoomIds = new Set(
    [...payments.values()].map((p) => String(p.room_id ?? '')).filter((id) => id && !rooms.has(id))
  );
  if (paymentRoomIds.size) for (const [id, row] of await lookup('rooms', 'id, room_number', paymentRoomIds)) rooms.set(id, row);
  const roomOf = (id: unknown) => (id ? unitCode(rooms.get(String(id))?.room_number) : null);

  function describe(r: AuditRow): { text: string; link: string | null } | null {
    const nv = r.new_values ?? {};
    const pv = r.previous_values ?? {};
    const ticket = r.entity_id ? tickets.get(r.entity_id) : undefined;
    const ticketTitle = quoted(nv.title ?? pv.title ?? ticket?.title);
    const inquiryName = (r.entity_id && inquiries.get(r.entity_id)?.prospect_name) || pv.prospect_name || null;

    if (role === 'tenant') {
      switch (r.action) {
        case 'TICKET_CREATE':
          return { text: `Sent a repair request${ticketTitle ? `: ${ticketTitle}` : ''}.`, link: '/tenant/tickets' };
        case 'TICKET_MESSAGE_SEND':
          return { text: `Added a note to ${ticketTitle ?? 'a repair request'}.`, link: '/tenant/tickets' };
        case 'TICKET_CANCEL':
          return { text: `Cancelled the repair request ${ticketTitle ?? ''}`.trim() + '.', link: '/tenant/tickets' };
        case 'PROFILE_UPDATE':
          return { text: 'Updated your contact details.', link: '/tenant/profile' };
        case 'AUTH_PASSWORD_CHANGE':
          return { text: 'Changed your password.', link: null };
        case 'PAYMENT_RECORD': {
          const amount = peso(r.entity_id ? bills.get(r.entity_id)?.total_amount : null);
          if (nv.status === 'Checkout Session Initiated') {
            return { text: `Started a GCash payment${amount ? ` of ${amount}` : ''}.`, link: '/tenant/payments' };
          }
          if (nv.status === 'Confirmed On Return') return { text: `Paid${amount ? ` ${amount}` : ''} by GCash.`, link: '/tenant/payments' };
          return null;
        }
        default:
          return null;
      }
    }

    switch (r.action) {
      case 'PAYMENT_RECORD': {
        if (!nv.room_id && !nv.month) return null; // a gateway row, not one she recorded
        return {
          text: `Recorded a payment: ${join(roomOf(nv.room_id), period(nv.month, nv.year), peso(nv.remitted_amount))}.`,
          link: nv.year && nv.month && nv.id
            ? `/admin/income?year=${nv.year}&month=${nv.month}&highlight=${nv.id}`
            : '/admin/income',
        };
      }
      case 'PAYMENT_VERIFY': {
        const payment = r.entity_id ? payments.get(r.entity_id) : undefined;
        const what = join(peso(payment?.amount), roomOf(payment?.room_id) ? `from ${roomOf(payment?.room_id)}` : null).replace(', from', ' from');
        const verdict = nv.verification_status === 'Rejected' ? 'Rejected' : 'Approved';
        // Named by how it was paid: a cash payment can be verified or rejected too (2 Oct 2026).
        const method = String(payment?.payment_method ?? '');
        const kind = /adyen|gcash/i.test(method) ? 'a GCash payment' : /cash/i.test(method) ? 'a cash payment' : /bank/i.test(method) ? 'a bank transfer' : 'a payment';
        return { text: `${verdict} ${kind}${what ? ` of ${what}` : ''}.`, link: '/admin/income?tab=verify' };
      }
      case 'PAYMENT_CORRECT': {
        if (!pv.room_id && !pv.month) return null;
        const voided = !r.new_values || nv.voided_at;
        return {
          text: `${voided ? 'Voided' : 'Corrected'} a payment: ${join(roomOf(pv.room_id), period(pv.month, pv.year))}.`,
          link: '/admin/income',
        };
      }
      case 'EXPENSE_CREATE': {
        const entry = nv.entry ?? {};
        return { text: `Recorded an expense${peso(entry.total_expenses) ? ` of ${peso(entry.total_expenses)}` : ''}.`, link: '/admin/expenses' };
      }
      case 'EXPENSE_UPDATE':
        return { text: `Edited an expense${peso(nv.total_expenses) ? ` of ${peso(nv.total_expenses)}` : ''}.`, link: '/admin/expenses' };
      case 'EXPENSE_VOID':
        return { text: `Voided an expense${peso(pv.total_expenses) ? ` of ${peso(pv.total_expenses)}` : ''}.`, link: '/admin/expenses' };
      case 'TENANT_CREATE': {
        const name = nv.fullName ?? nv.full_name;
        const unit = unitCode(nv.roomNumber ?? nv.room_number);
        if (!name) return null;
        return { text: `Moved ${name} in${unit ? ` to ${unit}` : ''}.`, link: '/admin/tenants' };
      }
      case 'TENANT_UPDATE': {
        const name = nv.full_name ?? (r.entity_id ? profiles.get(r.entity_id)?.full_name : null);
        return name ? { text: `Updated ${name}'s details.`, link: '/admin/tenants' } : null;
      }
      case 'TENANT_DEACTIVATE': {
        const name = r.entity_id ? profiles.get(r.entity_id)?.full_name : null;
        return { text: `Moved ${name ?? 'a tenant'} out.`, link: '/admin/tenants' };
      }
      case 'TICKET_CREATE':
        return { text: `Logged a repair${roomOf(nv.room_id) ? ` for ${roomOf(nv.room_id)}` : ''}${ticketTitle ? `: ${ticketTitle}` : ''}.`, link: '/admin/tickets' };
      case 'TICKET_STATUS_CHANGE': {
        const status = String(nv.status ?? '');
        const word = status === 'In Progress' ? 'in progress' : status === 'Submitted' ? 'back to submitted' : status.toLowerCase();
        if (!word) return null;
        const unit = unitCode(nv.rooms?.room_number) ?? roomOf(nv.room_id);
        return { text: `Marked the repair ${ticketTitle ?? ''}${unit ? ` in ${unit}` : ''} ${word}.`.replace('  ', ' '), link: '/admin/tickets' };
      }
      case 'TICKET_DELETE':
        return { text: `Deleted the repair ${ticketTitle ?? ''}`.trim() + '.', link: '/admin/tickets' };
      case 'TICKET_MESSAGE_SEND':
        return { text: `Replied on the repair ${ticketTitle ?? ''}`.trim() + '.', link: '/admin/tickets' };
      case 'INQUIRY_MESSAGE_SEND':
        return { text: `Replied to ${inquiryName ? `${inquiryName}'s` : 'an'} inquiry.`, link: '/admin/inquiries' };
      case 'INQUIRY_STATUS_CHANGE': {
        const status = String(nv.status ?? '').toLowerCase();
        if (!status) return null;
        return { text: `Marked ${inquiryName ? `${inquiryName}'s` : 'an'} inquiry ${status}.`, link: '/admin/inquiries' };
      }
      case 'INQUIRY_DELETE':
        return { text: `Deleted ${inquiryName ? `${inquiryName}'s` : 'an'} inquiry.`, link: '/admin/inquiries' };
      case 'ROOM_UPDATE':
      case 'ROOM_STATUS_CHANGE': {
        const unit = unitCode(nv.room_number) ?? roomOf(r.entity_id);
        return unit ? { text: `Updated unit ${unit}.`, link: '/admin/directory' } : null;
      }
      case 'BILL_CREATE':
        return { text: `Raised a bill${roomOf(nv.room_id) ? ` for ${roomOf(nv.room_id)}` : ''}.`, link: '/admin/income' };
      case 'AUTH_PASSWORD_CHANGE':
        return nv.tenant
          ? { text: `Reset ${nv.tenant}'s password.`, link: '/admin/tenants' }
          : { text: 'Changed your password.', link: null };
      default:
        return null;
    }
  }

  const out: RecentAction[] = [];
  for (const r of rows) {
    const d = describe(r);
    if (!d) continue;
    // The same sentence twice in a row (two GCash checkouts started a minute apart) is one action.
    if (out.length && out[out.length - 1].text === d.text) continue;
    out.push({ id: r.id, at: r.created_at, text: d.text, link: d.link });
    if (out.length >= limit) break;
  }
  return out;
}
