-- 027 - Remove two test maintenance tickets
--
-- Two tickets on unit 1A were created while the tenant repair form was being
-- tested (2026-08-25 and 2026-08-26) and never touched again. Both still read
-- Submitted, so they appeared on the landlady's overview as open repair
-- requests. One title is a keyboard test. The other is a slur. Titles are
-- identified below by MD5 so the slur is not written into a public repository.
--
-- Authorised by Sean on 2026-09-18. Backup taken first with `npm run backup`:
-- backups/2026-09-17T17-20-27/ (UTC), which holds both rows in
-- maintenance_tickets.json and the notification in notifications.json.
--
-- Guards. Nothing is deleted unless all of these hold, and the block aborts
-- rather than deleting any other number of rows:
--   - both ids still exist, still Submitted, with the recorded title hash
--   - neither ticket has an attachment or a message. Both foreign keys into
--     maintenance_tickets are ON DELETE CASCADE (pg_constraint, checked
--     2026-09-18), so this is what keeps the delete to these rows alone
--   - maintenance_tickets has no user triggers (pg_trigger, checked 2026-09-18)
--
-- Also removed: the one notification whose related_entity_id is one of these
-- tickets. It is the "new ticket" notice and would otherwise point at nothing.
--
-- Not touched: the two audit_logs rows that mention these tickets. audit_logs is
-- append-only by design (docs/13_AUDIT_JUDGEMENT_LOG.md 3.4).

do $$
declare
  guarded integer;
  tickets_deleted integer;
  notifications_deleted integer;
begin
  select count(*) into guarded
  from public.maintenance_tickets t
  where (t.id, md5(t.title)) in (
          ('ff4f757f-3c7a-4897-9636-fcf20455a9e1'::uuid, '9271d6eecedd55fcfa6143a33029d496'),
          ('9e49c691-2a4e-4958-b2ec-801edfc6b14e'::uuid, '7815696ecbf1c96e6894b779456d330e')
        )
    and t.status = 'Submitted'
    and not exists (select 1 from public.ticket_attachments a where a.ticket_id = t.id)
    and not exists (select 1 from public.ticket_messages m where m.ticket_id = t.id);

  if guarded <> 2 then
    raise exception '027: expected 2 guarded test tickets, found %. Nothing was deleted.', guarded;
  end if;

  delete from public.notifications n
  where n.related_entity_id in (
    'ff4f757f-3c7a-4897-9636-fcf20455a9e1'::uuid,
    '9e49c691-2a4e-4958-b2ec-801edfc6b14e'::uuid
  );
  get diagnostics notifications_deleted = row_count;

  if notifications_deleted > 1 then
    raise exception '027: would delete % notifications, expected at most 1. Rolled back.', notifications_deleted;
  end if;

  delete from public.maintenance_tickets t
  where t.id in (
    'ff4f757f-3c7a-4897-9636-fcf20455a9e1'::uuid,
    '9e49c691-2a4e-4958-b2ec-801edfc6b14e'::uuid
  );
  get diagnostics tickets_deleted = row_count;

  if tickets_deleted <> 2 then
    raise exception '027: deleted % tickets, expected 2. Rolled back.', tickets_deleted;
  end if;

  raise notice '027: removed % test tickets and % notification', tickets_deleted, notifications_deleted;
end $$;
