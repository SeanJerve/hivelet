-- =============================================================================
-- 090 - the "REHERSAL TEST" tenant removed, as 053 removed the two before it
-- =============================================================================
-- Sean, 5 Nov 2026: "can we also delete this entirely even on the database",
-- of the moved-out tenant "REHERSAL TEST" (PH, one day, 30 Sep 2026), the
-- account the testing day's A-12 created. It is not loydtest, the test tenant
-- check:api and the demo use.
--
-- Read-only on 5 Nov 2026, everything that names the profile:
--   room_assignments   1 row, PH, 30 Sep to 30 Sep, ended
--   audit_logs         3 rows with it as actor (its sign-in, password change
--                      and one PAYMENT_RECORD), 7 more about it
--   income, bills, payments, repairs, notifications, inquiries, expenses: none
--
-- As 053 did, the audit rows stay: the three it acted in keep their action
-- and time with actor_profile_id NULL, "someone did this, we no longer know
-- who". The seven about it are untouched. No constraint is changed, so every
-- other profile is still refused a delete while audit_logs names it.
--
-- SAFETY: one DO block. It finds the profile by id AND name, inactive, with
-- exactly the one ended tenancy, nothing in the ledger or the bills, and at
-- most 3 audit rows naming it as actor, or it changes nothing. A second run
-- finds no profile and does nothing.
--
-- AFTER: both return 0.
--   select count(*) from profiles where id = '3707e631-3f81-496f-a2a8-6d92fccf1c05';
--   select count(*) from room_assignments where tenant_profile_id = '3707e631-3f81-496f-a2a8-6d92fccf1c05';
-- =============================================================================

do $$
declare
  pid constant uuid := '3707e631-3f81-496f-a2a8-6d92fccf1c05';
  aid uuid;
  n int;
begin
  if not exists (select 1 from profiles where id = pid) then
    raise notice '090: the profile is already gone, nothing to do';
    return;
  end if;

  if not exists (
    select 1 from profiles
    where id = pid and full_name = 'REHERSAL TEST' and role = 'tenant' and account_status = 'inactive'
  ) then
    raise exception '090: the profile is not the inactive tenant REHERSAL TEST, nothing changed';
  end if;

  select count(*) into n from room_assignments where tenant_profile_id = pid;
  if n <> 1 then
    raise exception '090: expected 1 tenancy, found %, nothing changed', n;
  end if;
  select id into aid from room_assignments where tenant_profile_id = pid and end_date is not null;
  if aid is null then
    raise exception '090: its tenancy has not ended, nothing changed';
  end if;

  select (select count(*) from monthly_income_records where tenant_profile_id = pid or voided_by = pid or assignment_id = aid)
       + (select count(*) from bills where tenant_profile_id = pid)
       + (select count(*) from payments where tenant_profile_id = pid or verified_by = pid)
       + (select count(*) from maintenance_tickets where tenant_profile_id = pid or closed_by = pid)
       + (select count(*) from ticket_messages where sender_id = pid)
       + (select count(*) from inquiries where converted_tenant_id = pid)
       + (select count(*) from inquiry_messages where sender_id = pid)
       + (select count(*) from monthly_expense_entries where created_by = pid or voided_by = pid)
    into n;
  if n <> 0 then
    raise exception '090: % ledger, bill, payment, repair or inquiry rows name it, nothing changed', n;
  end if;

  select count(*) into n from audit_logs where actor_profile_id = pid;
  if n > 3 then
    raise exception '090: % audit rows name it as actor, expected 3 at most, nothing changed', n;
  end if;

  update audit_logs set actor_profile_id = null where actor_profile_id = pid;
  delete from notifications where recipient_profile_id = pid;
  delete from room_assignments where id = aid;
  delete from profiles where id = pid;

  raise notice '090: REHERSAL TEST removed (% audit rows kept with no actor)', n;
end
$$;
