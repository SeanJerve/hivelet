#!/usr/bin/env node
/**
 * What is happening in the live records during a testing day - READ ONLY.
 *
 * Run:  node scripts/testing-day-watch.mjs            one snapshot
 *       node scripts/testing-day-watch.mjs --every=60  a new snapshot every 60 s until Ctrl-C
 *
 * For the technical lead's laptop (needs `.env`). It never signs in and never writes, so, unlike
 * `check:api`, it adds nothing to the Activity page the owner reads. It prints UNIT CODES, never
 * names, phone numbers or emails, so the screen can be seen by a tester.
 *
 * What it answers, from "today" in Manila time:
 *   - which tenants have set their own password (the forced change done), and how many have not;
 *   - who is LOCKED OUT and until when (5 wrong passwords), and who has failed tries building up;
 *   - repair requests and notes sent today, by status;
 *   - receipts the owner has recorded today (the ones collected since 8 August, if she is entering
 *     them), and the latest date paid in the whole ledger;
 *   - bills raised and payments made today - and any GCash payment waiting, which must be
 *     REJECTED (the gateway is on Adyen's test account);
 *   - enquiries today, and today's audit entries by action.
 *
 * A table or column it cannot read is printed as "n/a" with the reason, never as 0.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.SUPABASE_URL || !key) {
  console.error('No .env with SUPABASE_URL and the secret key: run this on the admin laptop.');
  process.exit(1);
}
const db = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false } });
const every = Number(process.argv.find((a) => a.startsWith('--every='))?.split('=')[1] ?? 0);

/** Midnight today in Manila (UTC+8, no daylight saving), as an ISO string in UTC. */
function manilaMidnightUtc() {
  const now = new Date(Date.now() + 8 * 3600_000);
  const d = now.toISOString().slice(0, 10);
  return new Date(`${d}T00:00:00+08:00`).toISOString();
}
const hhmm = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(11, 16) : '');

async function rowsSince(table, cols, since) {
  const { data, error } = await db.from(table).select(cols).gte('created_at', since).order('created_at', { ascending: true }).limit(1000);
  return error ? { error: error.message } : { rows: data ?? [] };
}
const count = (rows, k) => rows.reduce((m, r) => ((m[r[k] ?? '(none)'] = (m[r[k] ?? '(none)'] ?? 0) + 1), m), {});
const fmt = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';

async function snapshot() {
  const since = manilaMidnightUtc();
  const out = [];
  out.push(`=== Hivelet testing-day watch, ${hhmm(new Date().toISOString())} Manila (since ${since.slice(0, 16)}Z) ===`);

  // Units by tenant, for printing units instead of names.
  const { data: asg } = await db.from('room_assignments').select('tenant_profile_id, rooms:room_id (room_number)').eq('is_active', true);
  const unitOf = new Map((asg ?? []).map((a) => [a.tenant_profile_id, a.rooms?.room_number ?? '?']));
  const u = (id) => unitOf.get(id) ?? '(no unit)';

  const { data: tenants, error: tErr } = await db
    .from('profiles')
    .select('id, must_change_password, failed_login_count, locked_until, account_status')
    .eq('role', 'tenant');
  if (tErr) out.push(`accounts: n/a (${tErr.message})`);
  else {
    const active = tenants.filter((t) => t.account_status === 'active');
    const done = active.filter((t) => !t.must_change_password);
    const locked = active.filter((t) => t.locked_until && new Date(t.locked_until) > new Date());
    const failing = active.filter((t) => t.failed_login_count > 0 && !locked.includes(t));
    out.push(`accounts: ${done.length} of ${active.length} active tenants have set their own password${done.length ? ` (units ${done.map((t) => u(t.id)).sort().join(', ')})` : ''}`);
    out.push(`  LOCKED now: ${locked.length ? locked.map((t) => `${u(t.id)} until ${hhmm(t.locked_until)}`).join(', ') : 'nobody'}`);
    out.push(`  failed tries building up: ${failing.length ? failing.map((t) => `${u(t.id)} x${t.failed_login_count}`).join(', ') : 'nobody'}`);
  }

  const tk = await rowsSince('maintenance_tickets', 'id, status, priority, tenant_profile_id, created_at', since);
  out.push(tk.error ? `repairs today: n/a (${tk.error})`
    : `repairs today: ${tk.rows.length} (${fmt(count(tk.rows, 'status'))})${tk.rows.length ? ' - units ' + tk.rows.map((r) => `${u(r.tenant_profile_id)} ${hhmm(r.created_at)}`).join(', ') : ''}`);
  const msg = await rowsSince('ticket_messages', 'id, created_at', since);
  out.push(msg.error ? `repair notes today: n/a (${msg.error})` : `repair notes today: ${msg.rows.length}`);

  const inc = await rowsSince('monthly_income_records', 'id, remitted_amount, date_paid, voided_at, tenant_profile_id, created_at', since);
  if (inc.error) out.push(`receipts recorded today: n/a (${inc.error})`);
  else {
    const live = inc.rows.filter((r) => !r.voided_at);
    const sum = live.reduce((s, r) => s + Number(r.remitted_amount || 0), 0);
    out.push(`receipts recorded today: ${live.length}, P${sum.toLocaleString('en-PH')}${inc.rows.length - live.length ? `, ${inc.rows.length - live.length} voided` : ''}${live.length ? ' - units ' + [...new Set(live.map((r) => u(r.tenant_profile_id)))].sort().join(', ') : ''}`);
  }
  const { data: latest } = await db.from('monthly_income_records').select('date_paid').is('voided_at', null).order('date_paid', { ascending: false }).limit(3);
  out.push(`  latest dates paid in the ledger: ${(latest ?? []).map((r) => r.date_paid).join(', ')}`);

  const bills = await rowsSince('bills', 'id, status, total_amount, tenant_profile_id, created_at', since);
  out.push(bills.error ? `bills raised today: n/a (${bills.error})`
    : `bills raised today: ${bills.rows.length}${bills.rows.length ? ' - ' + bills.rows.map((b) => `${u(b.tenant_profile_id)} P${Number(b.total_amount).toLocaleString('en-PH')} ${b.status}`).join(', ') : ''}`);
  const pay = await rowsSince('payments', 'id, verification_status, payment_method, amount, created_at', since);
  if (pay.error) out.push(`payments today: n/a (${pay.error})`);
  else {
    out.push(`payments today: ${pay.rows.length} (${fmt(count(pay.rows, 'verification_status'))})`);
    const waiting = pay.rows.filter((p) => /pending/i.test(String(p.verification_status)));
    if (waiting.length) out.push(`  >>> ${waiting.length} payment(s) WAITING in the owner's To verify queue: GCash is on the test account, so REJECT them (guide section 8).`);
  }

  const inq = await rowsSince('inquiries', 'id, created_at', since);
  out.push(inq.error ? `enquiries today: n/a (${inq.error})` : `enquiries today: ${inq.rows.length}`);
  const aud = await rowsSince('audit_logs', 'action, created_at', since);
  out.push(aud.error ? `audit today: n/a (${aud.error})` : `audit entries today: ${aud.rows.length} (${fmt(count(aud.rows, 'action'))})`);

  console.log(out.join('\n') + '\n');
}

await snapshot();
if (every > 0) {
  setInterval(() => snapshot().catch((e) => console.error('snapshot failed:', e.message)), every * 1000);
}
