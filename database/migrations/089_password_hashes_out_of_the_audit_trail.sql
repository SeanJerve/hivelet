-- =============================================================================
-- 089 - password hashes taken out of sixteen old audit trail rows
-- =============================================================================
-- Found by the test re-run of 4 Nov 2026: sixteen TENANT_UPDATE rows written
-- between 19 and 25 August 2026 copied the whole profile row into
-- previous_values and new_values, password_hash included. The code has
-- stripped the hash since then; these rows were never cleaned.
--
-- Read-only check on 4 Nov 2026: 16 rows, the key is always password_hash, in
-- both columns, and none of the sixteen hashes matches a password any account
-- uses today. So nothing is exposed that still opens an account, but a hash
-- has no business in a log the owner can read.
--
-- Only the password_hash key is removed. Every other value in those rows, and
-- who did what and when, stays as recorded.
--
-- SAFETY: one DO block. It expects exactly 16 rows, all TENANT_UPDATE, all
-- dated 19 to 25 August 2026, or it changes nothing. A second run finds no
-- hash and does nothing.
--
-- AFTER: this returns 0.
--   select count(*) from audit_logs
--   where (coalesce(previous_values::text,'') || coalesce(new_values::text,'')) ~ '\$2[aby]\$';
-- =============================================================================

do $$
declare
  found_rows int;
  wrong_rows int;
begin
  select count(*) into found_rows
  from audit_logs
  where previous_values ? 'password_hash' or new_values ? 'password_hash';

  if found_rows = 0 then
    raise notice '089: no password hash left in audit_logs, nothing to do';
    return;
  end if;

  select count(*) into wrong_rows
  from audit_logs
  where (previous_values ? 'password_hash' or new_values ? 'password_hash')
    and (action <> 'TENANT_UPDATE'
         or created_at < '2026-08-19'::date
         or created_at >= '2026-08-26'::date);

  if found_rows <> 16 or wrong_rows <> 0 then
    raise exception '089: expected 16 TENANT_UPDATE rows from 19 to 25 Aug 2026, found % (% outside that), nothing changed',
      found_rows, wrong_rows;
  end if;

  update audit_logs
  set previous_values = previous_values - 'password_hash',
      new_values = new_values - 'password_hash'
  where previous_values ? 'password_hash' or new_values ? 'password_hash';

  raise notice '089: password_hash removed from % audit_logs rows', found_rows;
end
$$;
