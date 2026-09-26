-- =============================================================================
-- 057 - delete the demo profile Mark Cruz
-- =============================================================================
-- NOT APPLIED by the author. `npm run backup` first.
--
-- Sean's decision, 2026-09-26, after DIAGNOSTIC_profiles_not_current.sql
-- showed Mark Cruz as the only account that is not a current tenant:
--   22222222-2222-2222-2222-222222222222  tenant  inactive
--   tenancies 0, income rows 0, repairs 0, audit rows 902
-- A seeded demo account (049 deactivated it, 050 kept it, 055 removed its
-- payments, bills and two fake 1a tenancies). It still showed on the Tenants
-- page under "Moved out", as a former tenant who never lived there.
--
-- THE TRADE, STATED PLAINLY
-- ----------------------------------------------------------------------------
-- audit_logs_actor_profile_id_fkey refuses to delete a profile the trail
-- names, on purpose, and the trail is append-only. So, exactly as 053 did for
-- the two "Rehearsal Test" profiles: the constraint becomes ON DELETE SET NULL
-- for this one statement, the profile goes, its 902 audit rows keep every
-- field except the actor, which reads NULL ("someone did this"), and the
-- constraint is put back to its original definition before anything commits.
-- Those 902 rows are the development testing Mark Cruz was used for.
--
-- SAFETY
-- ----------------------------------------------------------------------------
-- * Stops unless the profile is exactly this one: that id, that name, a
--   tenant, inactive, no tenancy, no receipt.
-- * Stops if the constraint is not exactly what 053 restored.
-- * Reads every foreign key into profiles from pg_constraint and stops,
--   naming it, if anything other than the audit trail's actor and his own
--   notifications still points at him. Nothing else is deleted with him.
-- * ONE statement (a single DO block), so it runs whole in Supabase's SQL
--   editor, and an error anywhere undoes all of it (see 055, B-78).
-- =============================================================================

DO $$
DECLARE
  mark CONSTANT uuid := '22222222-2222-2222-2222-222222222222';
  fk record;
  n bigint;
  def text;
  audit_rows bigint;
BEGIN
  SELECT count(*) INTO n FROM profiles
  WHERE id = mark AND full_name = 'Mark Cruz'
    AND role::text = 'tenant' AND account_status::text = 'inactive';
  IF n = 0 THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = mark) THEN
      RAISE NOTICE '057: Mark Cruz is already gone. Nothing changed.';
      RETURN;
    END IF;
    RAISE EXCEPTION '057 stopped, nothing changed: profile % is not the inactive tenant "Mark Cruz" this was written for.', mark;
  END IF;

  IF EXISTS (SELECT 1 FROM room_assignments WHERE tenant_profile_id = mark)
     OR EXISTS (SELECT 1 FROM monthly_income_records WHERE tenant_profile_id = mark) THEN
    RAISE EXCEPTION '057 stopped, nothing changed: Mark Cruz has a tenancy or a receipt. Run 055 first, or send this message.';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO def FROM pg_constraint
  WHERE conname = 'audit_logs_actor_profile_id_fkey';
  IF def IS DISTINCT FROM 'FOREIGN KEY (actor_profile_id) REFERENCES profiles(id)' THEN
    RAISE EXCEPTION '057 stopped, nothing changed: audit_logs_actor_profile_id_fkey is not the expected definition (got: %).', def;
  END IF;

  -- His own inbox goes with him.
  DELETE FROM notifications WHERE recipient_profile_id = mark;

  -- Anything else that still names him stops this, whatever its ON DELETE.
  FOR fk IN
    SELECT c.conname, child.relname AS child_table, a.attname AS child_column
    FROM pg_constraint c
    JOIN pg_class child  ON child.oid = c.conrelid
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_namespace ns ON ns.oid = parent.relnamespace AND ns.nspname = 'public'
    JOIN pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1
      AND parent.relname = 'profiles'
      AND c.conname <> 'audit_logs_actor_profile_id_fkey'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', fk.child_table, fk.child_column)
      INTO n USING mark;
    IF n > 0 THEN
      RAISE EXCEPTION '057 stopped, nothing changed: % row(s) of %.% (constraint %) still name Mark Cruz. Send this message.',
        n, fk.child_table, fk.child_column, fk.conname;
    END IF;
  END LOOP;

  SELECT count(*) INTO audit_rows FROM audit_logs WHERE actor_profile_id = mark;

  -- Loosen, for this statement only.
  ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_actor_profile_id_fkey;
  ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey
    FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

  DELETE FROM profiles WHERE id = mark;

  -- Put it back exactly as it was.
  ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_actor_profile_id_fkey;
  ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey
    FOREIGN KEY (actor_profile_id) REFERENCES profiles(id);

  INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PROFILE', mark,
          jsonb_build_object(
            'note', 'Deleted the demo profile Mark Cruz, a seeded development account with no tenancy, receipt or repair. It showed on the Tenants page as a former tenant who never lived here.',
            'actor_cleared_on', audit_rows,
            'why_cleared', 'audit_logs_actor_profile_id_fkey refuses to delete a profile the trail names; as in 053, those rows keep every field except the actor, which now reads NULL.',
            'reference', 'migration 057, Sean''s decision 2026-09-26'),
          NULL);

  -- Nothing commits unless he is gone and the constraint is whole again.
  IF EXISTS (SELECT 1 FROM profiles WHERE id = mark) THEN
    RAISE EXCEPTION '057: the profile is still there. Rolled back.';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO def FROM pg_constraint
  WHERE conname = 'audit_logs_actor_profile_id_fkey';
  IF def IS DISTINCT FROM 'FOREIGN KEY (actor_profile_id) REFERENCES profiles(id)' THEN
    RAISE EXCEPTION '057: the audit constraint did not restore (got: %). Rolled back.', def;
  END IF;
END $$;

-- "Success. No rows returned" means it ran. Check afterwards:
-- SELECT count(*) FROM profiles WHERE id = '22222222-2222-2222-2222-222222222222';          -- 0
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'audit_logs_actor_profile_id_fkey';                                     -- no ON DELETE
-- SELECT new_values FROM audit_logs WHERE action = 'AUDIT_CORRECTION'
--   ORDER BY created_at DESC LIMIT 1;                                                      -- the record of this
