-- =============================================================================
-- 078 - every unit's description says only what is known
-- =============================================================================
-- Sean, 2026-10-02: the descriptions on the public unit pages and in Rooms and
-- rates claimed things nobody has confirmed for that unit ("with private
-- bathroom & cabinets", "with bed frame", "with balcony access", "spacious",
-- "Master Suite"), and LF's repeated a rule that is no longer true (Linda's
-- units pay water per person, BR-040 errata). "1st Floor Studio unit" is the
-- model: simple and true. The owner can write more per unit later in Rooms and
-- rates > Edit.
--
-- Each description is built from columns the database already holds:
--   main house, back and front apartments:  "<floor> Floor <type> unit"
--     plus ", front side" / ", back side" where the unit code says so
--     (B1F, B2F, B2B, B3F, B3B, F2F, F2B)
--   Penthouse:  "<type> unit on the rooftop level"
--   Linda (LF, LB):  "<type> unit beside the red gate"
-- Only rows whose text changes are written. The old text of every changed
-- unit is kept in one AUDIT_CORRECTION row. Changes nothing else.
--
-- Verify: SELECT room_number, description FROM rooms ORDER BY cluster_code, floor, room_number;
-- =============================================================================
DO $$
DECLARE
  before jsonb;
  n int;
BEGIN
  WITH plain AS (
    SELECT r.id, r.room_number, r.description AS old_description,
           CASE
             WHEN r.cluster_code = 'Linda' THEN r.room_type::text || ' unit beside the red gate'
             WHEN r.cluster_code = 'Penthouse' THEN r.room_type::text || ' unit on the rooftop level'
             ELSE
               CASE r.floor WHEN 1 THEN '1st' WHEN 2 THEN '2nd' WHEN 3 THEN '3rd' ELSE r.floor::text || 'th' END
               || ' Floor ' || r.room_type::text || ' unit'
               || CASE
                    WHEN r.cluster_code IN ('Back Apartment', 'Front Apartment') AND r.room_number ~ '^[BF][0-9][F]$' THEN ', front side'
                    WHEN r.cluster_code IN ('Back Apartment', 'Front Apartment') AND r.room_number ~ '^[BF][0-9][B]$' THEN ', back side'
                    ELSE ''
                  END
           END AS new_description
      FROM rooms r
  ), done AS (
    UPDATE rooms r
       SET description = p.new_description
      FROM plain p
     WHERE r.id = p.id AND r.description IS DISTINCT FROM p.new_description
    RETURNING p.room_number, p.old_description
  )
  SELECT COALESCE(jsonb_object_agg(room_number, old_description), '{}'::jsonb), COUNT(*) INTO before, n FROM done;

  IF n = 0 THEN
    RAISE NOTICE '078: every description is already plain. Nothing changed.';
    RETURN;
  END IF;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'ROOM', '00000000-0000-0000-0000-000000000078',
          jsonb_build_object('descriptions', before),
          jsonb_build_object(
            'note', 'Unit descriptions reduced to floor, type and side - what the database knows - '
                    || 'instead of unconfirmed fittings (Sean, 2026-10-02).',
            'units_changed', n,
            'reference', 'migration 078, 2026-10-02'),
          NULL);

  RAISE NOTICE '078: % unit description(s) made plain.', n;
END $$;
