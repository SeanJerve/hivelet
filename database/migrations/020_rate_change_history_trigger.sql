-- =============================================================================
-- Migration 020 — Rate Change History Is Recorded By The Database
-- =============================================================================
-- @phase          Phase 3
-- @businessRules  BR-003 (historical preservation), ARCH-004 (rate change history)
-- @openDecisions  OD-11 (closed — the owner sets rates by hand)
--
-- WHAT THIS CLOSES
-- ----------------
-- The defense rests on a specific claim: the owner sets every rate by hand, and
-- **every change she makes is preserved** in `room_price_history` with the old
-- rate, the new rate, the date and who made it. That claim is what replaced the
-- automatic-escalation feature withdrawn under OD-11 and errata E-20.
--
-- The write existed, in `PATCH /api/admin/rooms/:roomId`, and it was fired and
-- forgotten:
--
--     await db.from('room_price_history').insert({ ... });   // no error check
--
-- No `error` was destructured and nothing was checked. The rate on `rooms` had
-- already been updated by then, so a rejected insert left the new rate live and
-- **no record that the old one ever existed** — the precise failure BR-003 names,
-- reported to nobody. It is also two round trips with nothing joining them, so
-- even a checked insert could fail after the rate had changed.
--
-- HOW
-- ---
-- The history row is no longer the route's responsibility. An AFTER UPDATE
-- trigger on `rooms` writes it whenever `current_price` actually changes, in the
-- same transaction as the change itself. A rate cannot now be changed without
-- being recorded, by any path — the route, a future service, a direct SQL fix at
-- 2am. The route keeps only the attribution (`created_by`, `reason`), applied to
-- the row the trigger has already guaranteed.
--
-- This is the same shape as `trg_update_expense_total`, which holds the BR-047
-- reconciliation. Where an invariant must hold regardless of who is writing, the
-- database is the only place that can hold it.
--
-- `IS DISTINCT FROM` rather than `<>`: `current_price` is nullable in principle,
-- and `NULL <> 5000` is NULL, not true — so `<>` would silently skip the first
-- rate ever set on a unit whose price started empty.
--
-- Apply AFTER 019. Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.record_room_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
BEGIN
  INSERT INTO public.room_price_history (
    room_id, previous_price, new_price, effective_date, reason
  )
  VALUES (
    NEW.id,
    COALESCE(OLD.current_price, 0),
    NEW.current_price,
    CURRENT_DATE,
    -- The route overwrites this with the administrator's own reason and stamps
    -- created_by. If it never gets the chance, this is what the row says, and
    -- `audit_logs` still holds the actor for the ROOM_UPDATE that caused it.
    'Rate change recorded automatically'
  );
  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION public.record_room_price_change() IS
  'Writes a room_price_history row whenever rooms.current_price changes, in the same transaction '
  'as the change. Exists because the application wrote this row without checking the result, so a '
  'rejected insert left the new rate live and no record of the old one - the failure BR-003 names. '
  'Attribution (created_by, reason) is applied by the caller afterwards; the row itself is '
  'guaranteed here so that no write path can change a rate silently.';

DROP TRIGGER IF EXISTS trg_record_room_price_change ON public.rooms;

CREATE TRIGGER trg_record_room_price_change
  AFTER UPDATE OF current_price ON public.rooms
  FOR EACH ROW
  WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
  EXECUTE FUNCTION public.record_room_price_change();

DO $verify$
DECLARE
  v_room      UUID;
  v_price     NUMERIC;
  v_before    INTEGER;
  v_after     INTEGER;
  v_existing  UUID[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'rooms'
      AND t.tgname = 'trg_record_room_price_change' AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Migration 020 failed: trigger was not created.';
  END IF;

  -- Prove it fires, and leave nothing behind. The rate is set to itself plus one
  -- and then back, inside this transaction; both the probe rows and the probe
  -- updates are removed before the block ends.
  SELECT id, current_price INTO v_room, v_price
    FROM public.rooms ORDER BY room_number LIMIT 1;

  IF v_room IS NOT NULL THEN
    -- Every row that legitimately exists right now. Only rows absent from this
    -- list are removed afterwards, so a re-run cannot delete real history - the
    -- reason text alone would not have been safe, since the trigger writes that
    -- same text in normal operation.
    SELECT coalesce(array_agg(id), '{}') INTO v_existing
      FROM public.room_price_history WHERE room_id = v_room;
    v_before := coalesce(array_length(v_existing, 1), 0);

    UPDATE public.rooms SET current_price = v_price + 1 WHERE id = v_room;
    SELECT count(*) INTO v_after FROM public.room_price_history WHERE room_id = v_room;

    IF v_after <> v_before + 1 THEN
      RAISE EXCEPTION 'Migration 020 failed: the trigger did not record a rate change (% -> %).',
        v_before, v_after;
    END IF;

    -- Put it back. This fires the trigger a second time, so both probe rows go.
    UPDATE public.rooms SET current_price = v_price WHERE id = v_room;
    DELETE FROM public.room_price_history
     WHERE room_id = v_room AND NOT (id = ANY (v_existing));

    SELECT count(*) INTO v_after FROM public.room_price_history WHERE room_id = v_room;
    IF v_after <> v_before THEN
      RAISE EXCEPTION 'Migration 020 failed: the probe left % row(s) behind.', v_after - v_before;
    END IF;

    RAISE NOTICE 'Migration 020 OK: trigger fires, probe reverted cleanly, % history row(s) unchanged.', v_before;
  ELSE
    RAISE NOTICE 'Migration 020 OK: trigger created. No rooms to probe against.';
  END IF;
END
$verify$;

COMMIT;
