-- =============================================================================
-- 088 - sixteen units moved into the category they really are
-- =============================================================================
-- Lloyd, 2026-11-02: "Explore by unit category" on the public page put these
-- units under the wrong kind. Price and every other detail stay as they are;
-- only the kind was wrong.
--
--   1a 1b 1c 1d, 2b 2c 2d, 3b 3c 3d   Studio       -> Two-bedroom
--   2a, 3a                            One-bedroom  -> Two-bedroom
--   2e, 3e                            Studio       -> One-bedroom
--   B1F                               One-bedroom  -> Two-bedroom
--   B3B                               Two-bedroom  -> Three-bedroom
--
-- Units not named were confirmed right where they are and are not touched.
--
-- After:  Studio x10 (1e-1h, 2f 2g, 3f 3g, LB, LF)
--         One-bedroom x5 (2e, 3e, B2B, B2F, F1)
--         Two-bedroom x16 (1a-1d, 2a-2d, 3a-3d, B1F, B3F, F2B, F2F)
--         Three-bedroom x2 (B3B, PH)
--
-- The description carries the kind ("2nd Floor Studio unit", migration 078),
-- so the old kind in it is replaced by the new one in the same row; the rest
-- of the description is unchanged. current_price is not written, so the price
-- history trigger does not fire. The old kind and description of every changed
-- unit are kept in one AUDIT_CORRECTION row.
--
-- SAFETY: one DO block. Every unit must be found with the kind listed above as
-- "from", or nothing changes. A second run finds them already moved and does
-- nothing.
--
-- Verify: SELECT room_type, string_agg(room_number, ' ' ORDER BY room_number)
--           FROM rooms GROUP BY room_type ORDER BY room_type;
-- =============================================================================
DO $$
DECLARE
  before jsonb;
  n int;
  wrong text;
BEGIN
  CREATE TEMP TABLE m088 (room_number text PRIMARY KEY, from_type room_type_enum, to_type room_type_enum) ON COMMIT DROP;
  INSERT INTO m088 VALUES
    ('1a', 'Studio', 'Two-bedroom'), ('1b', 'Studio', 'Two-bedroom'),
    ('1c', 'Studio', 'Two-bedroom'), ('1d', 'Studio', 'Two-bedroom'),
    ('2a', 'One-bedroom', 'Two-bedroom'), ('2b', 'Studio', 'Two-bedroom'),
    ('2c', 'Studio', 'Two-bedroom'), ('2d', 'Studio', 'Two-bedroom'),
    ('3a', 'One-bedroom', 'Two-bedroom'), ('3b', 'Studio', 'Two-bedroom'),
    ('3c', 'Studio', 'Two-bedroom'), ('3d', 'Studio', 'Two-bedroom'),
    ('2e', 'Studio', 'One-bedroom'), ('3e', 'Studio', 'One-bedroom'),
    ('B1F', 'One-bedroom', 'Two-bedroom'),
    ('B3B', 'Two-bedroom', 'Three-bedroom');

  IF NOT EXISTS (
    SELECT 1 FROM m088 m JOIN rooms r ON r.room_number = m.room_number WHERE r.room_type <> m.to_type
  ) AND (SELECT COUNT(*) FROM m088 m JOIN rooms r ON r.room_number = m.room_number) = 16 THEN
    RAISE NOTICE '088: every unit is already in its category. Nothing changed.';
    RETURN;
  END IF;

  SELECT string_agg(m.room_number || ' is ' || COALESCE(r.room_type::text, 'missing'), ', ')
    INTO wrong
    FROM m088 m LEFT JOIN rooms r ON r.room_number = m.room_number
   WHERE r.room_type IS DISTINCT FROM m.from_type;
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION '088: not as expected, nothing changed: %', wrong;
  END IF;

  WITH done AS (
    UPDATE rooms r
       SET room_type = m.to_type,
           description = replace(r.description, m.from_type::text, m.to_type::text)
      FROM m088 m
     WHERE r.room_number = m.room_number
    RETURNING r.room_number, m.from_type, (SELECT description FROM rooms o WHERE o.id = r.id) AS old_description
  )
  SELECT jsonb_object_agg(room_number, jsonb_build_object('room_type', from_type, 'description', old_description)), COUNT(*)
    INTO before, n FROM done;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'ROOM', '00000000-0000-0000-0000-000000000088',
          jsonb_build_object('units', before),
          jsonb_build_object(
            'note', 'Units moved into the category they really are; price and other details unchanged (Lloyd, 2026-11-02).',
            'units_changed', n,
            'reference', 'migration 088, 2026-11-02'),
          NULL);

  RAISE NOTICE '088: % unit(s) moved into their right category.', n;
END $$;
