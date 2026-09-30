// Runs DIAGNOSTIC_expense_dates_before_064 and 064 unchanged in PGlite, the way Supabase's SQL
// editor runs them, against a copy of the expense table built from her workbook exactly as the
// original importer stored it. Nothing leaves this machine.
// Run from database/:  npm i --no-save @electric-sql/pglite && node test-064-expense-dates.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import { parseExpenses, corrections } from './gen-expense-date-fix.mjs';
process.env.TZ = 'UTC';
// fileURLToPath, not .pathname: on Windows .pathname is /C:/..., which read as C:\C:\... (2026-09-30).
const M = fileURLToPath(new URL('./migrations/', import.meta.url));
const diag = readFileSync(M + 'DIAGNOSTIC_expense_dates_before_064.sql', 'utf8');
const m064 = readFileSync(M + '064_expense_dates_as_she_wrote_them.sql', 'utf8');
let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
};
async function runLikeTheEditor(db, sql) {
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const parts = []; let cur = '', inBody = false;
  for (let i = 0; i < code.length; i++) {
    if (code.startsWith('$$', i)) { inBody = !inBody; cur += '$$'; i++; continue; }
    if (code[i] === ';' && !inBody) { if (cur.trim()) parts.push(cur); cur = ''; continue; }
    cur += code[i];
  }
  if (cur.trim()) parts.push(cur);
  for (const s of parts) { await db.exec(s); await db.exec('DISCARD TEMP'); }
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const wb = xlsx.readFile('../INCOME AND EXPENSES PAST RECORDS/Michelles-BH-Report-Income-and-Expenses-fr-Yr-2024-up (1) (1) (1).xlsx');
const rows = parseExpenses(xlsx.utils.sheet_to_json(wb.Sheets['Monthly Expenses'], { header: 1 }));
const fix = corrections(rows);
const bySheetRow = new Map(rows.map((r) => [r._sheetRow, r]));

const db = new PGlite();
await db.exec(`
  CREATE TYPE property_area_type AS ENUM ('Boarding House','Main House','Front Apartment','Back Apartment','Other Expenses / Personal','Penthouse');
  CREATE TABLE monthly_expense_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), expense_date date NOT NULL, or_supplier text NOT NULL,
    category_code varchar(20) NOT NULL, total_expenses numeric(10,2) NOT NULL, updated_at timestamptz, voided_at timestamptz);
  CREATE TABLE expense_property_allocations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_entry_id uuid REFERENCES monthly_expense_entries(id) ON DELETE CASCADE, property_area property_area_type NOT NULL, amount numeric(10,2) NOT NULL);
  CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text, entity_type text, entity_id uuid, new_values jsonb, ip_address text, created_at timestamptz DEFAULT now());
`);
// As the importer stored them: every workbook line before August, under the importer's date.
let sql = '';
for (const f of fix) {
  const r = bySheetRow.get(f.r);
  sql += `WITH e AS (INSERT INTO monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses) VALUES (${q(f.o)}, ${q(r.or_supplier)}, ${q(r.category_code)}, ${f.t}) RETURNING id)
  INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) SELECT e.id, v.a::property_area_type, v.m FROM e, (VALUES ${r.allocations.map((a) => `(${q(a.area)}, ${Number(a.amount).toFixed(2)})`).join(', ')}) v(a, m);\n`;
}
// The June electric bill as imported: Main House only, a day early (she wrote 4 June).
sql += `WITH e AS (INSERT INTO monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses) VALUES ('2026-06-03', 'Electricbill (May26)', '7', 5688.67) RETURNING id)
  INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) SELECT id, 'Main House', 5688.67 FROM e;\n`;
// Must be left alone: one she typed into the system herself, and one line she edited since the import.
sql += `WITH e AS (INSERT INTO monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses) VALUES ('2026-03-01', 'Entered in the system by her', '9', 123.45) RETURNING id)
  INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) SELECT id, 'Main House', 123.45 FROM e;\n`;
await db.exec(sql);
const edited = fix.find((f) => f.o !== f.n);
// A second, identical entry for one workbook line (as if she also typed it into the system): the
// database now holds more than the workbook for that key, so the whole group must be left alone.
const dup = fix.filter((f) => f.o !== f.n && f.r !== edited.r)[5];
await db.exec(`WITH e AS (INSERT INTO monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses)
    SELECT expense_date, or_supplier, category_code, total_expenses FROM monthly_expense_entries
    WHERE expense_date = '${dup.o}' AND or_supplier = ${q(dup.s)} AND total_expenses = ${dup.t} LIMIT 1 RETURNING id)
  INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount)
  SELECT e.id, split_part(x, ':', 1)::property_area_type, split_part(x, ':', 2)::numeric FROM e, unnest(string_to_array(${q(dup.a)}, '|')) x`);
await db.exec(`UPDATE monthly_expense_entries SET total_expenses = total_expenses + 1 WHERE id = (SELECT id FROM monthly_expense_entries WHERE expense_date = '${edited.o}' AND or_supplier = ${q(bySheetRow.get(edited.r).or_supplier)} LIMIT 1)`);

const one = async (s) => (await db.query(s)).rows[0];
const count = async () => (await one('SELECT count(*)::int n FROM monthly_expense_entries')).n;
const before = await count();

const d = (await db.query(diag)).rows;
const val = (k) => d.find((r) => r.k === k)?.value;
check('preview: every workbook line before August is read', Number(val(1)), fix.length);
check('preview: all but the edited and the duplicated lines pair up', Number(val(3)), fix.length - 2);
check('preview: stored entries with no match: the two to leave alone, the duplicated pair, the electric bill', Number(val(7)), 5);
check('preview: changes nothing', await count(), before);

const in2026Before = (await one(`SELECT count(*)::int n FROM monthly_expense_entries WHERE expense_date >= '2026-01-01'`)).n;
await runLikeTheEditor(db, m064);
const wrong = await one(`SELECT count(*)::int n FROM jsonb_to_recordset(${q(JSON.stringify(fix))}::jsonb) AS f(r int, o date, n date, s text, c text, t numeric, a text)
  WHERE f.r NOT IN (${edited.r}, ${dup.r}) AND NOT EXISTS (SELECT 1 FROM monthly_expense_entries e WHERE e.expense_date = f.n AND e.or_supplier = f.s AND e.total_expenses = f.t)`);
check('064: every paired entry now carries the date she wrote', wrong.n, 0);
check('064: as many entries moved from 2025 into 2026 as her workbook says',
  (await one(`SELECT count(*)::int n FROM monthly_expense_entries WHERE expense_date >= '2026-01-01'`)).n - in2026Before,
  fix.filter((f) => f.o < '2026-01-01' && f.n >= '2026-01-01' && f.r !== dup.r).length);
check('064: a line the database holds twice is left alone, both copies',
  (await one(`SELECT count(*)::int n FROM monthly_expense_entries WHERE expense_date = '${dup.o}' AND or_supplier = ${q(dup.s)} AND total_expenses = ${dup.t}`)).n, 2);
check('064: the entry she typed herself is untouched', (await one(`SELECT expense_date::text d FROM monthly_expense_entries WHERE or_supplier = 'Entered in the system by her'`)).d, '2026-03-01');
check('064: the line edited since the import is untouched', (await one(`SELECT count(*)::int n FROM monthly_expense_entries WHERE expense_date = '${edited.o}' AND or_supplier = ${q(bySheetRow.get(edited.r).or_supplier)}`)).n >= 1, true);
check('064: the electric bill is her figure, dated as she wrote it',
  await one(`SELECT expense_date::text d, total_expenses::text t, (SELECT string_agg(property_area::text || ' ' || amount, ' + ' ORDER BY property_area) FROM expense_property_allocations x WHERE x.expense_entry_id = e.id) a FROM monthly_expense_entries e WHERE or_supplier = 'Electricbill (May26)'`),
  { d: '2026-06-04', t: '20652.80', a: 'Boarding House 14964.13 + Main House 5688.67' });
check('064: nothing added or removed', await count(), before);
const rec = (await one(`SELECT new_values v FROM audit_logs WHERE action = 'AUDIT_CORRECTION'`)).v;
check('064: one record, counting what moved and what was left', [rec.moved, rec.workbook_lines_unmatched, rec.stored_entries_unmatched_left_as_is], [fix.filter((f) => f.o !== f.n).length - 2, 2, 5]);

await runLikeTheEditor(db, m064);
check('run twice: nothing moves, no second record', (await one(`SELECT count(*)::int n FROM audit_logs`)).n, 1);
const d2 = (await db.query(diag)).rows;
check('preview afterwards: "will move" reads 0', d2.find((r) => r.k === 4)?.value, '0');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
