-- =============================================================================
-- 075 - the evaluation account, loydtest, moves into PH
-- =============================================================================
-- B-92, decided by Sean: the technical evaluators use the tenant account
-- loydtest (switched back on by 071), and it goes into the Penthouse, PH, the
-- one vacant unit. Sean, 2026-10-01: do it directly rather than by hand.
--
-- Written the way POST /admin/tenants writes a move-in: an active
-- room_assignments row (start and anniversary today, Manila; deposit = PH's
-- current rate per BR-039; one occupant) and PH set to Occupied. A
-- TENANT_UPDATE audit row records it.
--
-- WHILE IT LASTS the Overview reads 33 of 33 occupied: one of them is this
-- evaluation tenancy. Move it out from Tenants after the evaluation.
--
-- SAFETY: stops, changing nothing, if loydtest is not an active tenant, already
-- holds an active tenancy, or PH is occupied by anyone. One DO block.
-- =============================================================================

DO $$
DECLARE
  p_id uuid;
  ph record;
  today date := (now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
  SELECT id INTO p_id FROM profiles
   WHERE full_name = 'loydtest' AND role = 'tenant' AND account_status = 'active';
  IF p_id IS NULL THEN
    RAISE EXCEPTION '075: loydtest is not an active tenant. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM room_assignments WHERE tenant_profile_id = p_id AND is_active) THEN
    RAISE NOTICE '075: loydtest already has an active tenancy. Nothing to do.';
    RETURN;
  END IF;

  SELECT id, current_price INTO ph FROM rooms WHERE room_number = 'PH';
  IF ph.id IS NULL THEN
    RAISE EXCEPTION '075: unit PH not found. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM room_assignments WHERE room_id = ph.id AND is_active) THEN
    RAISE EXCEPTION '075: PH already has an active tenant. Nothing changed.';
  END IF;

  INSERT INTO room_assignments (room_id, tenant_profile_id, start_date, anniversary_date, deposit_amount, occupant_count, is_active)
  VALUES (ph.id, p_id, today, today, ph.current_price, 1, true);

  UPDATE rooms SET operational_status = 'Occupied' WHERE id = ph.id;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('TENANT_UPDATE', 'PROFILE', p_id,
          jsonb_build_object('unit', NULL),
          jsonb_build_object(
            'note', 'The evaluation account moved into PH for the technical evaluation (B-92). Move it out after the evaluation.',
            'room_number', 'PH', 'start_date', today, 'deposit_amount', ph.current_price, 'occupant_count', 1,
            'reference', 'migration 075, Sean 2026-10-01'),
          NULL);
END $$;
