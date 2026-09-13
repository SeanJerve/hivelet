#!/usr/bin/env node
/**
 * Exports every row of every public table to a timestamped local folder.
 *
 * Why this exists: the live database holds 937 income records worth 8,086,250
 * pesos, 1,327 expense allocations, 1,733 audit entries and 45 real people's
 * contact details - and as of 2026-09-13 there was no backup anywhere in this
 * repository. The Supabase free tier's retention is short and is not a substitute
 * for a copy you actually hold.
 *
 * Run:  npm run backup
 *
 * Writes to  backups/<timestamp>/<table>.json  plus a manifest with row counts.
 * The backups/ folder is gitignored - these files contain tenant personal data
 * and must never be committed.
 *
 * This is a DATA backup, not a schema backup. The schema lives in
 * database/migrations/ and database/live_schema.csv. To rebuild from nothing you
 * need both.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
dotenv.config({ path: path.join(root, '.env') });

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Parent-before-child, so a restore can run in this order without tripping a
 * foreign key. property_areas precedes clusters because 012 pointed
 * clusters.expense_area at it.
 */
const TABLES = [
  'clusters',
  'property_areas',
  'fixed_expense_categories',
  'system_settings',
  'profiles',
  'rooms',
  'room_photos',
  'room_price_history',
  'room_assignments',
  'inquiries',
  'inquiry_messages',
  'bills',
  'payments',
  'monthly_income_records',
  'monthly_expense_entries',
  'expense_property_allocations',
  'maintenance_tickets',
  'ticket_attachments',
  'ticket_messages',
  'notifications',
  'audit_logs'
];

/** PostgREST caps a response at 1,000 rows by default - page past it or lose data silently. */
const PAGE = 1000;

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(root, 'backups', stamp);
fs.mkdirSync(outDir, { recursive: true });

const manifest = { takenAt: new Date().toISOString(), tables: {}, totalRows: 0 };
let failed = 0;

for (const table of TABLES) {
  try {
    const rows = await fetchAll(table);
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2) + '\n', 'utf8');
    manifest.tables[table] = rows.length;
    manifest.totalRows += rows.length;
    console.log(`  ${String(rows.length).padStart(5)}  ${table}`);
  } catch (e) {
    failed++;
    manifest.tables[table] = `ERROR: ${e.message}`;
    console.error(`  FAIL   ${table}  ${e.message}`);
  }
}

// A couple of figures worth being able to eyeball later without opening the JSON.
try {
  const income = JSON.parse(fs.readFileSync(path.join(outDir, 'monthly_income_records.json'), 'utf8'));
  const live = income.filter(r => !r.voided_at);
  manifest.checks = {
    liveIncomeRecords: live.length,
    incomeLedgerValue: live
      .reduce((s, r) => s + Number(r.rent_amount || 0) + Number(r.water_payment || 0), 0)
      .toFixed(2)
  };
} catch {}

fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`\n${manifest.totalRows} rows across ${TABLES.length} tables`);
if (manifest.checks) {
  console.log(`income ledger: ${manifest.checks.liveIncomeRecords} live records, ${manifest.checks.incomeLedgerValue}`);
}
console.log(`written to backups/${stamp}/`);
process.exit(failed === 0 ? 0 : 1);
