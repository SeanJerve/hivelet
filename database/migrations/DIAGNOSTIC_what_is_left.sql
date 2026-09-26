-- =============================================================================
-- DIAGNOSTIC - is anything from the older queue still waiting? READ ONLY.
-- =============================================================================
-- One table, one row per question:
--   B-20 / 034  unit F1's floor. 1 means 034 has run; 3 means it has not.
--   B-14 / 027  the two test repair tickets on 1A. 0 means 027 has run.
--   repairs     every repair on record, one row each (no titles: one of the
--               027 tickets has an offensive title, identified there by hash)
--   inquiries   every inquiry, one row each, to spot test submissions
-- =============================================================================

SELECT * FROM (
  SELECT 1 AS n, 'B-20 F1 floor (1 = done)' AS item, floor::text AS value, '' AS detail
  FROM rooms WHERE lower(trim(room_number)) = 'f1'

  UNION ALL
  SELECT 2, 'B-14 027 test tickets left (0 = done)', count(*)::text, ''
  FROM maintenance_tickets
  WHERE id IN ('ff4f757f-3c7a-4897-9636-fcf20455a9e1', '9e49c691-2a4e-4958-b2ec-801edfc6b14e')

  UNION ALL
  SELECT 3, 'repair', coalesce(r.room_number, '(no unit)'),
         t.status::text || ', ' || t.priority::text || ', raised ' ||
         to_char(t.created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') ||
         CASE WHEN t.tenant_profile_id IS NULL THEN ', no tenant' ELSE '' END
  FROM maintenance_tickets t LEFT JOIN rooms r ON r.id = t.room_id

  UNION ALL
  SELECT 4, 'inquiry', coalesce(i.prospect_name, ''),
         i.status::text || ', ' || to_char(i.created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') ||
         ', ' || coalesce(i.prospect_email, '')
  FROM inquiries i
) x
ORDER BY n, value, detail;
