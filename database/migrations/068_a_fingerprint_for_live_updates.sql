-- =============================================================================
-- 068 - one fingerprint of what a person can see, so pages update by themselves
-- =============================================================================
-- Sean, 2026-09-30, after the testing day: changes did not show until people
-- refreshed - Michelle recorded a payment and the tenant's page kept the old
-- figures; a tenant sent a repair and her list did not move.
--
-- The site runs on Vercel functions, which cannot hold a live connection open,
-- so the pages ask instead: every few seconds, while a page is visible, it
-- asks GET /api/live/version for a fingerprint of everything its person can
-- see, and reloads its data only when the fingerprint changes.
--
-- live_version(profile, is_admin) returns that fingerprint: an md5 over the
-- rows themselves, so ANY change to ANY watched row changes it - including a
-- repair's status, which has no updated_at. Sign-in bookkeeping (last login,
-- failed attempts, lock) is left out, so somebody signing in does not make
-- every open page reload. The administrator's covers the whole property; a
-- tenant's covers only their own tenancy, room, payments, bills, repairs,
-- notifications and the water rate.
--
-- Read only; changes no data. SECURITY INVOKER; callable by the server
-- (service_role) only, like 060 and 019.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.live_version(p_profile uuid, p_is_admin boolean)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE WHEN p_is_admin THEN md5(concat_ws('|',
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM monthly_income_records t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM monthly_expense_entries t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM expense_property_allocations t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM rooms t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM room_assignments t),
    (SELECT md5(coalesce(string_agg(concat_ws(',', id, role, full_name, email, phone_number, account_status, must_change_password), ';' ORDER BY id), '')) FROM profiles),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM bills t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM payments t),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM maintenance_tickets t),
    (SELECT count(*) || ':' || coalesce(max(created_at)::text, '') FROM ticket_messages),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM inquiries t),
    (SELECT count(*) || ':' || coalesce(max(sent_at)::text, '') FROM inquiry_messages),
    (SELECT count(*) || ':' || count(*) FILTER (WHERE NOT is_read) || ':' || coalesce(max(created_at)::text, '')
       FROM notifications WHERE recipient_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.key), '')) FROM system_settings t)
  ))
  ELSE md5(concat_ws('|',
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM monthly_income_records t WHERE t.tenant_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM room_assignments t WHERE t.tenant_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM rooms t
       WHERE t.id IN (SELECT room_id FROM room_assignments WHERE tenant_profile_id = p_profile)),
    (SELECT md5(coalesce(string_agg(concat_ws(',', id, full_name, email, phone_number, account_status, must_change_password), ';' ORDER BY id), ''))
       FROM profiles WHERE id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM bills t WHERE t.tenant_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM payments t WHERE t.tenant_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.id), '')) FROM maintenance_tickets t WHERE t.tenant_profile_id = p_profile),
    (SELECT count(*) || ':' || coalesce(max(created_at)::text, '') FROM ticket_messages
       WHERE ticket_id IN (SELECT id FROM maintenance_tickets WHERE tenant_profile_id = p_profile)),
    (SELECT count(*) || ':' || count(*) FILTER (WHERE NOT is_read) || ':' || coalesce(max(created_at)::text, '')
       FROM notifications WHERE recipient_profile_id = p_profile),
    (SELECT md5(coalesce(string_agg(t::text, ';' ORDER BY t.key), '')) FROM system_settings t)
  ))
  END
$function$;

REVOKE ALL ON FUNCTION public.live_version(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.live_version(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.live_version(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.live_version(uuid, boolean) TO service_role;

-- "Success. No rows returned" means it ran.
--
-- AFTER (read only): a 32-character fingerprint, and it changes when a row does.
--   SELECT live_version((SELECT id FROM profiles WHERE role::text = 'admin'), true);
