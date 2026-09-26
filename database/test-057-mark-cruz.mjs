// Runs migration 057 unchanged in PGlite, the way Supabase's SQL editor runs it
// (statement by statement, no temporary table kept between them), against
// scratch tables shaped like the live ones. Nothing leaves this machine.
// Run from database/:  npm i --no-save @electric-sql/pglite && node test-057-mark-cruz.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const m057 = readFileSync(new URL('./migrations/057_delete_demo_profile_mark_cruz.sql', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
};
const MARK = '22222222-2222-2222-2222-222222222222', LOBBY = '00000000-0000-0000-0000-00000000000a';

async function runLikeTheEditor(db, sql) {
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const parts = []; let cur = '', inBody = false;
  for (let i = 0; i < code.length; i++) {
    if (code.startsWith('$$', i)) { inBody = !inBody; cur += '$$'; i++; continue; }
    if (code[i] === ';' && !inBody) { if (cur.trim()) parts.push(cur); cur = ''; continue; }
    cur += code[i];
  }
  if (cur.trim()) parts.push(cur);
  for (const stmt of parts) { await db.exec(stmt); await db.exec('DISCARD TEMP'); }
}

async function fresh() {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE user_role_type AS ENUM ('admin','tenant','prospect');
    CREATE TYPE account_status_type AS ENUM ('active','inactive');
    CREATE TABLE profiles (id uuid PRIMARY KEY, full_name text, role user_role_type, account_status account_status_type);
    CREATE TABLE room_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE);
    CREATE TABLE monthly_income_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_profile_id uuid REFERENCES profiles(id));
    CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE);
    CREATE TABLE ticket_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE);
    CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text, entity_type text, entity_id uuid, new_values jsonb, ip_address text,
      actor_profile_id uuid, created_at timestamptz DEFAULT now());
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES profiles(id);
    INSERT INTO profiles VALUES ('${MARK}','Mark Cruz','tenant','inactive'), ('${LOBBY}','Lobby Toor','tenant','active');
    INSERT INTO room_assignments (tenant_profile_id) VALUES ('${LOBBY}');
    INSERT INTO monthly_income_records (tenant_profile_id) VALUES ('${LOBBY}');
    INSERT INTO notifications (recipient_profile_id) VALUES ('${MARK}'), ('${LOBBY}');
    INSERT INTO audit_logs (action, actor_profile_id) SELECT 'AUTH_LOGIN', '${MARK}' FROM generate_series(1, 902);
    INSERT INTO audit_logs (action, actor_profile_id) VALUES ('AUTH_LOGIN', '${LOBBY}');
  `);
  return db;
}
const one = async (db, q) => (await db.query(q)).rows[0];

let db = await fresh();
await runLikeTheEditor(db, m057);
check('Mark Cruz is gone', (await one(db, `SELECT count(*)::int n FROM profiles WHERE id = '${MARK}'`)).n, 0);
check('Lobby Toor is untouched', (await one(db, `SELECT count(*)::int n FROM profiles WHERE id = '${LOBBY}'`)).n, 1);
check('his 902 audit rows stay, actor blanked', (await one(db, `SELECT count(*)::int n FROM audit_logs WHERE action = 'AUTH_LOGIN' AND actor_profile_id IS NULL`)).n, 902);
check("everyone else's audit rows keep their actor", (await one(db, `SELECT count(*)::int n FROM audit_logs WHERE actor_profile_id = '${LOBBY}'`)).n, 1);
check('the constraint is back to no ON DELETE', (await one(db, `SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname = 'audit_logs_actor_profile_id_fkey'`)).d, 'FOREIGN KEY (actor_profile_id) REFERENCES profiles(id)');
check('only his notification went', (await one(db, `SELECT count(*)::int n FROM notifications`)).n, 1);
check('one correction record, naming the 902', (await one(db, `SELECT new_values->>'actor_cleared_on' c FROM audit_logs WHERE action = 'AUDIT_CORRECTION'`)).c, '902');
let err = '';
await db.exec(`INSERT INTO profiles VALUES ('00000000-0000-0000-0000-0000000000cc','Only In The Trail','tenant','inactive');
  INSERT INTO audit_logs (action, actor_profile_id) VALUES ('AUTH_LOGIN', '00000000-0000-0000-0000-0000000000cc')`);
try { await db.exec(`DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-0000000000cc'`); } catch (e) { err = e.message; }
check('afterwards, a profile the trail names still cannot be deleted', /audit_logs_actor_profile_id_fkey/.test(err), true);
await runLikeTheEditor(db, m057);
check('run twice: nothing more happens', (await one(db, `SELECT count(*)::int n FROM audit_logs WHERE action = 'AUDIT_CORRECTION'`)).n, 1);

db = await fresh();
await db.exec(`INSERT INTO ticket_messages (sender_profile_id) VALUES ('${MARK}')`);
err = '';
try { await runLikeTheEditor(db, m057); } catch (e) { err = e.message; }
check('stops when something else names him, and says what', /ticket_messages\.sender_profile_id/.test(err), true);
check('stopped means nothing changed', [(await one(db, `SELECT count(*)::int n FROM profiles`)).n, (await one(db, `SELECT count(*)::int n FROM audit_logs WHERE actor_profile_id = '${MARK}'`)).n], [2, 902]);

db = await fresh();
await db.exec(`UPDATE profiles SET account_status = 'active' WHERE id = '${MARK}'`);
err = '';
try { await runLikeTheEditor(db, m057); } catch (e) { err = e.message; }
check('stops when the profile is not the inactive demo it was written for', /not the inactive tenant/.test(err), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
