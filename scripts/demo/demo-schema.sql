-- Hivelet DEMO database schema.
--
-- Generated on 2026-10-15 from the live database's catalogue (pg_get_functiondef,
-- pg_get_constraintdef, pg_get_indexdef, pg_get_triggerdef), not from
-- database/FULL_DATABASE_SCHEMA.sql. It describes the live schema as of that day
-- and will drift from it: the source of truth stays database/migrations/.
--
-- Used ONLY to build the separate demo project (hivelet-demo org) that outside
-- evaluators sign in to. It holds no live rows. The three one-off backup tables
-- left by migrations 030-032 are omitted.
SET check_function_bodies = off;

CREATE TYPE public.account_status_type AS ENUM ('active', 'inactive');

CREATE TYPE public.bill_status_type AS ENUM ('Pending', 'Due', 'Overdue', 'Paid', 'Partially Paid');

CREATE TYPE public.bill_type_enum AS ENUM ('Rent', 'Water', 'Combined', 'Other');

CREATE TYPE public.inquiry_status_type AS ENUM ('Pending', 'Contacted', 'Converted', 'Closed');

CREATE TYPE public.operational_status_type AS ENUM ('Available', 'Reserved', 'Occupied', 'Under Maintenance');

CREATE TYPE public.payment_method_type AS ENUM ('Cash', 'GCash', 'Bank Transfer', 'Adyen Online');

CREATE TYPE public.property_area_type AS ENUM ('Boarding House', 'Main House', 'Front Apartment', 'Back Apartment', 'Other Expenses / Personal', 'Penthouse');

CREATE TYPE public.room_type_enum AS ENUM ('Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom');

CREATE TYPE public.ticket_priority_type AS ENUM ('Emergency', 'High', 'Medium', 'Low');

CREATE TYPE public.ticket_status_type AS ENUM ('Submitted', 'In Progress', 'Resolved', 'Closed');

CREATE TYPE public.user_role_type AS ENUM ('admin', 'tenant', 'prospect');

CREATE TYPE public.verification_status_type AS ENUM ('Verified', 'Pending Verification', 'Rejected');

CREATE TYPE public.visibility_status_type AS ENUM ('Published', 'Hidden');

CREATE OR REPLACE FUNCTION public.create_expense_entry_with_allocations(p_expense_date date, p_invoice_supplier text, p_category_code text, p_allocations jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_entry_id    UUID;
  v_alloc_count INTEGER;
  v_entry       public.monthly_expense_entries%ROWTYPE;
BEGIN
  IF p_expense_date IS NULL THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_expense_date is required';
  END IF;
  IF p_invoice_supplier IS NULL OR btrim(p_invoice_supplier) = '' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_invoice_supplier is required';
  END IF;
  IF p_category_code IS NULL OR btrim(p_category_code) = '' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_category_code is required';
  END IF;
  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_allocations must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_allocations), 'null');
  END IF;
  IF jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: at least one property-area allocation is required (BR-041)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fixed_expense_categories WHERE code = p_category_code) THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no expense category %', p_category_code;
  END IF;

  INSERT INTO public.monthly_expense_entries (expense_date, invoice_supplier, category_code, total_expenses, created_by)
  VALUES (p_expense_date, p_invoice_supplier, p_category_code, 0, p_created_by)
  RETURNING id INTO v_entry_id;

  v_alloc_count := public.replace_expense_allocations(v_entry_id, p_allocations);

  IF v_alloc_count IS NULL OR v_alloc_count = 0 THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no allocation rows were written for entry %', v_entry_id;
  END IF;

  SELECT * INTO v_entry FROM public.monthly_expense_entries WHERE id = v_entry_id;
  RETURN to_jsonb(v_entry) || jsonb_build_object('allocation_count', v_alloc_count);
END
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS user_role_type
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    u_role user_role_type;
BEGIN
    SELECT role INTO u_role
      FROM profiles
     WHERE auth_user_id = auth.uid()
     LIMIT 1;

    -- NULL, never a role. An unidentified caller gets no privileges, and every
    -- comparison against a role literal evaluates to NULL rather than TRUE.
    -- The previous body returned 'admin' here, described as a local-development
    -- default; it shipped to the live database. A-14, migration 022.
    RETURN u_role;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_ph_phone(raw text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN regexp_replace(COALESCE(raw, ''), '[^0-9]', '', 'g') ~ '^63[0-9]{10}$'
      THEN '0' || substring(regexp_replace(raw, '[^0-9]', '', 'g') FROM 3)
    ELSE regexp_replace(COALESCE(raw, ''), '[^0-9]', '', 'g')
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_income_for_months(p_room_id uuid, p_tenant_profile_id uuid, p_assignment_id uuid, p_date_paid date, p_contact_name character varying, p_invoice_number character varying, p_rent_amount numeric, p_water_payment numeric, p_occupants integer, p_payment_method payment_method_type, p_transaction_reference character varying, p_periods jsonb)
 RETURNS SETOF monthly_income_records
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  period jsonb;
BEGIN
  IF p_periods IS NULL OR jsonb_array_length(p_periods) = 0 THEN
    RAISE EXCEPTION 'record_income_for_months: no periods supplied, so nothing would be recorded';
  END IF;

  FOR period IN SELECT * FROM jsonb_array_elements(p_periods)
  LOOP
    RETURN QUERY
    INSERT INTO monthly_income_records (
      room_id, tenant_profile_id, assignment_id,
      year, month, date_paid, contact_name, invoice_number,
      rent_amount, occupants, water_payment,
      payment_method, transaction_reference,
      rent_period_start, rent_period_end, verification_status
    )
    VALUES (
      p_room_id, p_tenant_profile_id, p_assignment_id,
      (period->>'year')::int, (period->>'month')::int,
      p_date_paid, p_contact_name, p_invoice_number,
      p_rent_amount, p_occupants, p_water_payment,
      p_payment_method, p_transaction_reference,
      (period->>'start')::date, (period->>'end')::date,
      'Verified'
    )
    RETURNING *;
  END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.record_room_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO public.room_price_history (
    room_id, previous_price, new_price, effective_date, reason
  )
  VALUES (
    NEW.id,
    COALESCE(OLD.current_price, 0),
    NEW.current_price,
    CURRENT_DATE,
    'Rate change recorded automatically'
  );
  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION public.replace_expense_allocations(p_entry_id uuid, p_allocations jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  inserted_count INTEGER;
  v_area_type    TEXT;
BEGIN
  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_entry_id is required';
  END IF;

  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_allocations must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_allocations), 'null');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.monthly_expense_entries WHERE id = p_entry_id) THEN
    RAISE EXCEPTION 'replace_expense_allocations: no expense entry %', p_entry_id;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_area_type
    FROM pg_attribute a
    JOIN pg_class c     ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'expense_property_allocations'
     AND a.attname = 'property_area'
     AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_area_type IS NULL THEN
    RAISE EXCEPTION 'replace_expense_allocations: expense_property_allocations.property_area not found';
  END IF;

  DELETE FROM public.expense_property_allocations
   WHERE expense_entry_id = p_entry_id;

  EXECUTE format(
    'INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
     SELECT $1,
            (elem ->> %L)::%s,
            (elem ->> %L)::NUMERIC
       FROM jsonb_array_elements($2) AS elem',
    'property_area', v_area_type, 'amount')
  USING p_entry_id, p_allocations;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE public.monthly_expense_entries
     SET total_expenses = COALESCE((
           SELECT SUM(amount) FROM public.expense_property_allocations
            WHERE expense_entry_id = p_entry_id), 0),
         updated_at = NOW()
   WHERE id = p_entry_id;

  RETURN inserted_count;
END
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_identifier text)
 RETURNS TABLE(id uuid, email character varying, full_name character varying, role user_role_type, account_status account_status_type, password_hash character varying, failed_login_count integer, locked_until timestamp with time zone, must_change_password boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.email IS NOT NULL
     AND lower(p.email) = lower(btrim(COALESCE(p_identifier, '')))
  UNION ALL
  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.phone_number IS NOT NULL
     AND p.password_hash IS NOT NULL
     AND public.normalize_ph_phone(p_identifier) <> ''
     AND public.normalize_ph_phone(p.phone_number) = public.normalize_ph_phone(p_identifier)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles e
        WHERE e.email IS NOT NULL
          AND lower(e.email) = lower(btrim(COALESCE(p_identifier, '')))
     )
  UNION ALL
  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.login_id IS NOT NULL
     AND p.password_hash IS NOT NULL
     AND regexp_replace(COALESCE(p_identifier, ''), '[^A-Za-z0-9]', '', 'g') <> ''
     AND upper(regexp_replace(p.login_id, '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(p_identifier, '[^A-Za-z0-9]', '', 'g'))
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.route_linda_water()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_is_linda boolean;
BEGIN
  SELECT COALESCE(is_linda_unit, false) INTO v_is_linda
    FROM public.rooms WHERE id = NEW.room_id;

  IF v_is_linda IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_is_linda THEN
    NEW.linda_water_charge := COALESCE(NEW.linda_water_charge, 0)
                            + COALESCE(NEW.water_payment, 0);
    NEW.water_payment      := 0;
    NEW.is_linda_billing   := true;
  ELSE
    NEW.water_payment      := COALESCE(NEW.water_payment, 0)
                            + COALESCE(NEW.linda_water_charge, 0);
    NEW.linda_water_charge := 0;
    NEW.is_linda_billing   := false;
  END IF;

  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION public.settle_verified_payment(p_payment_id uuid, p_verified_by uuid, p_income jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment       payments%ROWTYPE;
  v_income_id     UUID := NULL;
  v_bill_updated  BOOLEAN := FALSE;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_verified_payment: p_payment_id is required';
  END IF;
  IF p_verified_by IS NULL THEN
    RAISE EXCEPTION 'settle_verified_payment: p_verified_by is required (BR-017 - a human decides)';
  END IF;

  SELECT * INTO v_payment
    FROM payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'settle_verified_payment: payment % not found', p_payment_id;
  END IF;

  IF v_payment.verification_status = 'Verified' THEN
    RETURN jsonb_build_object(
      'payment_id',   v_payment.id,
      'already_done', TRUE,
      'bill_updated', FALSE,
      'income_id',    NULL
    );
  END IF;

  UPDATE payments
     SET verification_status = 'Verified',
         verified_by         = p_verified_by,
         verified_at         = NOW()
   WHERE id = p_payment_id;

  IF v_payment.bill_id IS NOT NULL THEN
    UPDATE bills
       SET status     = 'Paid',
           updated_at = NOW()
     WHERE id = v_payment.bill_id;
    v_bill_updated := TRUE;
  END IF;

  IF p_income IS NOT NULL THEN
    INSERT INTO monthly_income_records (
      room_id, tenant_profile_id, assignment_id,
      year, month, date_paid, contact_name, invoice_number,
      rent_period_start, rent_period_end,
      rent_amount, occupants, water_payment,
      payment_method, transaction_reference
    )
    VALUES (
      (p_income ->> 'room_id')::UUID,
      (p_income ->> 'tenant_profile_id')::UUID,
      NULLIF(p_income ->> 'assignment_id', '')::UUID,
      (p_income ->> 'year')::INTEGER,
      (p_income ->> 'month')::INTEGER,
      (p_income ->> 'date_paid')::DATE,
      p_income ->> 'contact_name',
      p_income ->> 'invoice_number',
      (p_income ->> 'rent_period_start')::DATE,
      (p_income ->> 'rent_period_end')::DATE,
      (p_income ->> 'rent_amount')::NUMERIC,
      (p_income ->> 'occupants')::INTEGER,
      (p_income ->> 'water_payment')::NUMERIC,
      COALESCE(
        NULLIF(p_income ->> 'payment_method', '')::payment_method_type,
        v_payment.payment_method,
        'Cash'::payment_method_type
      ),
      NULLIF(p_income ->> 'transaction_reference', '')
    )
    RETURNING id INTO v_income_id;
  END IF;

  RETURN jsonb_build_object(
    'payment_id',   p_payment_id,
    'already_done', FALSE,
    'bill_updated', v_bill_updated,
    'income_id',    v_income_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_expense_entry_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    UPDATE public.monthly_expense_entries
    SET total_expenses = (
        SELECT COALESCE(SUM(amount), 0.00)
        FROM public.expense_property_allocations
        WHERE expense_entry_id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.void_income_record(p_income_id uuid, p_voided_by uuid, p_reason text DEFAULT 'Administrator manual deletion'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_income      monthly_income_records%ROWTYPE;
  v_payment     payments%ROWTYPE;
  v_bill_total  NUMERIC;
  v_still_paid  NUMERIC;
  v_bill_status bill_status_type := NULL;
  v_payment_id  UUID := NULL;
BEGIN
  IF p_income_id IS NULL THEN
    RAISE EXCEPTION 'void_income_record: p_income_id is required';
  END IF;
  IF p_voided_by IS NULL THEN
    RAISE EXCEPTION 'void_income_record: p_voided_by is required (BR-048 - a human decides)';
  END IF;

  -- Locked for the life of the transaction, so two voids of one row cannot both
  -- pass the already-voided check below.
  SELECT * INTO v_income FROM monthly_income_records WHERE id = p_income_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'void_income_record: income record % not found', p_income_id;
  END IF;

  IF v_income.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('income_id', p_income_id, 'already_voided', TRUE,
                              'payment_id', NULL, 'bill_id', NULL, 'bill_status', NULL);
  END IF;

  -- 1. the ledger row
  UPDATE monthly_income_records
     SET voided_at   = NOW(),
         voided_by   = p_voided_by,
         void_reason = COALESCE(NULLIF(p_reason, ''), 'Administrator manual deletion')
   WHERE id = p_income_id;

  -- 2. the GCash payment it settled, if it is one
  IF v_income.payment_method = 'Adyen Online'::payment_method_type
     AND v_income.transaction_reference IS NOT NULL THEN

    SELECT * INTO v_payment
      FROM payments
     WHERE transaction_reference = v_income.transaction_reference
       AND payment_method = 'Adyen Online'::payment_method_type
       AND verification_status = 'Verified'::verification_status_type
     FOR UPDATE;

    IF FOUND THEN
      v_payment_id := v_payment.id;

      UPDATE payments
         SET verification_status = 'Rejected'::verification_status_type
       WHERE id = v_payment.id;

      -- 3. its bill, from what is still Verified against it
      IF v_payment.bill_id IS NOT NULL THEN
        SELECT total_amount INTO v_bill_total FROM bills WHERE id = v_payment.bill_id FOR UPDATE;

        SELECT COALESCE(SUM(amount), 0) INTO v_still_paid
          FROM payments
         WHERE bill_id = v_payment.bill_id
           AND verification_status = 'Verified'::verification_status_type;

        v_bill_status := CASE
          WHEN v_still_paid >= v_bill_total - 0.005 THEN 'Paid'::bill_status_type
          WHEN v_still_paid > 0                     THEN 'Partially Paid'::bill_status_type
          ELSE 'Due'::bill_status_type
        END;

        UPDATE bills SET status = v_bill_status, updated_at = NOW() WHERE id = v_payment.bill_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'income_id',      p_income_id,
    'already_voided', FALSE,
    'payment_id',     v_payment_id,
    'bill_id',        v_payment.bill_id,
    'bill_status',    v_bill_status
  );
END;
$function$
;

CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_profile_id uuid,
  action character varying(100) NOT NULL,
  entity_type character varying(100) NOT NULL,
  entity_id uuid NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  ip_address character varying(50),
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bills (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  tenant_profile_id uuid NOT NULL,
  bill_type bill_type_enum DEFAULT 'Combined'::bill_type_enum NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  rent_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
  water_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  grace_period_end_date date NOT NULL,
  status bill_status_type DEFAULT 'Pending'::bill_status_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  checkout_opened_at timestamp with time zone
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clusters (
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  display_order integer NOT NULL,
  expense_area property_area_type NOT NULL
);
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.expense_property_allocations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  expense_entry_id uuid NOT NULL,
  property_area property_area_type NOT NULL,
  amount numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.expense_property_allocations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fixed_expense_categories (
  code character varying(20) NOT NULL,
  name character varying(255) NOT NULL,
  parent_code character varying(20),
  display_order integer NOT NULL
);
ALTER TABLE public.fixed_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inquiries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  prospect_name character varying(255) NOT NULL,
  prospect_email character varying(255) NOT NULL,
  prospect_phone character varying(50) NOT NULL,
  message text NOT NULL,
  status inquiry_status_type DEFAULT 'Pending'::inquiry_status_type NOT NULL,
  converted_tenant_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  access_token_hash text,
  reference_code character varying(9)
);
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inquiry_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inquiry_id uuid NOT NULL,
  sender_id uuid,
  sender_name character varying(255) NOT NULL,
  message_body text NOT NULL,
  sent_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenance_tickets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  tenant_profile_id uuid,
  title character varying(255) NOT NULL,
  description text NOT NULL,
  category character varying(100) DEFAULT 'General Repair'::character varying NOT NULL,
  priority ticket_priority_type DEFAULT 'Medium'::ticket_priority_type NOT NULL,
  status ticket_status_type DEFAULT 'Submitted'::ticket_status_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  closed_by uuid,
  assigned_technician character varying(160)
);
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.monthly_expense_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  expense_date date NOT NULL,
  invoice_supplier text NOT NULL,
  category_code character varying(20) NOT NULL,
  total_expenses numeric(10,2) DEFAULT 0.00 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  voided_at timestamp with time zone,
  voided_by uuid,
  void_reason text
);
ALTER TABLE public.monthly_expense_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.monthly_income_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  tenant_profile_id uuid,
  assignment_id uuid,
  year integer NOT NULL,
  month integer NOT NULL,
  date_paid date NOT NULL,
  contact_name character varying(255) NOT NULL,
  invoice_number character varying(100),
  rent_period_start date NOT NULL,
  rent_period_end date NOT NULL,
  rent_amount numeric(10,2) NOT NULL,
  fifty_percent_share numeric(10,2) GENERATED ALWAYS AS ((rent_amount / 2.0)) STORED,
  occupants integer NOT NULL,
  water_payment numeric(10,2) DEFAULT 0.00 NOT NULL,
  remitted_amount numeric(10,2) GENERATED ALWAYS AS ((rent_amount + water_payment)) STORED,
  is_linda_billing boolean DEFAULT false,
  linda_electricity_charge numeric(10,2) DEFAULT 0.00,
  linda_water_charge numeric(10,2) DEFAULT 0.00,
  payment_method payment_method_type DEFAULT 'Cash'::payment_method_type NOT NULL,
  verification_status verification_status_type DEFAULT 'Verified'::verification_status_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  transaction_reference character varying(120),
  voided_at timestamp with time zone,
  voided_by uuid,
  void_reason text
);
ALTER TABLE public.monthly_income_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  recipient_profile_id uuid NOT NULL,
  title character varying(255) NOT NULL,
  message text NOT NULL,
  type character varying(100) DEFAULT 'System'::character varying NOT NULL,
  priority ticket_priority_type DEFAULT 'Low'::ticket_priority_type NOT NULL,
  is_read boolean DEFAULT false,
  related_entity_type character varying(100),
  related_entity_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  bill_id uuid,
  room_id uuid NOT NULL,
  tenant_profile_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method payment_method_type DEFAULT 'Cash'::payment_method_type NOT NULL,
  payment_source character varying(100) DEFAULT 'On-Site Cash'::character varying NOT NULL,
  verification_status verification_status_type DEFAULT 'Pending Verification'::verification_status_type NOT NULL,
  transaction_reference character varying(255),
  paid_at timestamp with time zone DEFAULT now() NOT NULL,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  email character varying(255),
  full_name character varying(255) NOT NULL,
  phone_number character varying(50),
  emergency_contact_name character varying(255),
  emergency_contact_phone character varying(50),
  occupation character varying(100),
  facebook_url text,
  role user_role_type DEFAULT 'tenant'::user_role_type NOT NULL,
  account_status account_status_type DEFAULT 'active'::account_status_type NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password_hash character varying(255),
  last_login_at timestamp with time zone,
  failed_login_count integer DEFAULT 0 NOT NULL,
  locked_until timestamp with time zone,
  password_changed_at timestamp with time zone,
  must_change_password boolean DEFAULT false NOT NULL,
  login_id character varying(20)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.property_areas (
  code property_area_type NOT NULL,
  name character varying(150) NOT NULL,
  is_rental_expense boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  notes text
);
ALTER TABLE public.property_areas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  tenant_profile_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  anniversary_date date NOT NULL,
  deposit_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
  occupant_count integer DEFAULT 1 NOT NULL,
  is_primary_contact boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_photos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  file_url text NOT NULL,
  caption character varying(255),
  display_order integer DEFAULT 0 NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_price_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid NOT NULL,
  previous_price numeric(10,2) NOT NULL,
  new_price numeric(10,2) NOT NULL,
  effective_date date DEFAULT CURRENT_DATE NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.room_price_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_number character varying(20) NOT NULL,
  floor integer NOT NULL,
  cluster_code character varying(50) NOT NULL,
  room_type room_type_enum DEFAULT 'Studio'::room_type_enum NOT NULL,
  description text,
  capacity integer NOT NULL,
  base_price numeric(10,2) NOT NULL,
  current_price numeric(10,2) NOT NULL,
  operational_status operational_status_type DEFAULT 'Available'::operational_status_type NOT NULL,
  visibility_status visibility_status_type DEFAULT 'Published'::visibility_status_type NOT NULL,
  available_from date,
  is_linda_unit boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_settings (
  key character varying(80) NOT NULL,
  value text NOT NULL,
  value_type character varying(20) DEFAULT 'number'::character varying NOT NULL,
  label character varying(160) NOT NULL,
  description text,
  business_rule character varying(20),
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ticket_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type character varying(50) DEFAULT 'image/jpeg'::character varying,
  uploaded_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ticket_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message_body text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.bills ADD CONSTRAINT bills_pkey PRIMARY KEY (id);

ALTER TABLE public.bills ADD CONSTRAINT bills_rent_amount_check CHECK ((rent_amount >= (0)::numeric));

ALTER TABLE public.bills ADD CONSTRAINT bills_total_amount_check CHECK ((total_amount >= (0)::numeric));

ALTER TABLE public.bills ADD CONSTRAINT bills_water_amount_check CHECK ((water_amount >= (0)::numeric));

ALTER TABLE public.clusters ADD CONSTRAINT clusters_pkey PRIMARY KEY (code);

ALTER TABLE public.expense_property_allocations ADD CONSTRAINT expense_property_allocations_amount_check CHECK ((amount >= (0)::numeric));

ALTER TABLE public.expense_property_allocations ADD CONSTRAINT expense_property_allocations_expense_entry_id_property_area_key UNIQUE (expense_entry_id, property_area);

ALTER TABLE public.expense_property_allocations ADD CONSTRAINT expense_property_allocations_pkey PRIMARY KEY (id);

ALTER TABLE public.fixed_expense_categories ADD CONSTRAINT fixed_expense_categories_pkey PRIMARY KEY (code);

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);

ALTER TABLE public.inquiry_messages ADD CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id);

ALTER TABLE public.monthly_expense_entries ADD CONSTRAINT monthly_expense_entries_pkey PRIMARY KEY (id);

ALTER TABLE public.monthly_expense_entries ADD CONSTRAINT monthly_expense_entries_total_expenses_check CHECK ((total_expenses >= (0)::numeric));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_linda_electricity_charge_check CHECK ((linda_electricity_charge >= (0)::numeric));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_linda_water_charge_check CHECK ((linda_water_charge >= (0)::numeric));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_month_check CHECK (((month >= 1) AND (month <= 12)));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_occupants_check CHECK ((occupants >= 0));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_pkey PRIMARY KEY (id);

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_rent_amount_check CHECK ((rent_amount >= (0)::numeric));

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_water_payment_check CHECK ((water_payment >= (0)::numeric));

ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric));

ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_login_identifier_required CHECK (((password_hash IS NULL) OR (email IS NOT NULL) OR (phone_number IS NOT NULL) OR (login_id IS NOT NULL)));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.property_areas ADD CONSTRAINT property_areas_pkey PRIMARY KEY (code);

ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_deposit_amount_check CHECK ((deposit_amount >= (0)::numeric));

ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_occupant_count_check CHECK ((occupant_count >= 1));

ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.room_photos ADD CONSTRAINT room_photos_pkey PRIMARY KEY (id);

ALTER TABLE public.room_price_history ADD CONSTRAINT room_price_history_new_price_check CHECK ((new_price >= (0)::numeric));

ALTER TABLE public.room_price_history ADD CONSTRAINT room_price_history_pkey PRIMARY KEY (id);

ALTER TABLE public.room_price_history ADD CONSTRAINT room_price_history_previous_price_check CHECK ((previous_price >= (0)::numeric));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_base_price_check CHECK ((base_price >= (0)::numeric));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_capacity_check CHECK ((capacity > 0));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_current_price_check CHECK ((current_price >= (0)::numeric));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_floor_check CHECK (((floor >= 1) AND (floor <= 4)));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);

ALTER TABLE public.rooms ADD CONSTRAINT rooms_room_number_key UNIQUE (room_number);

ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);

ALTER TABLE public.ticket_attachments ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);

ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES profiles(id);

ALTER TABLE public.bills ADD CONSTRAINT bills_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE public.bills ADD CONSTRAINT bills_tenant_profile_id_fkey FOREIGN KEY (tenant_profile_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.clusters ADD CONSTRAINT clusters_expense_area_fkey FOREIGN KEY (expense_area) REFERENCES property_areas(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.expense_property_allocations ADD CONSTRAINT expense_property_allocations_expense_entry_id_fkey FOREIGN KEY (expense_entry_id) REFERENCES monthly_expense_entries(id) ON DELETE CASCADE;

ALTER TABLE public.expense_property_allocations ADD CONSTRAINT expense_property_allocations_property_area_fkey FOREIGN KEY (property_area) REFERENCES property_areas(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.fixed_expense_categories ADD CONSTRAINT fixed_expense_categories_parent_code_fkey FOREIGN KEY (parent_code) REFERENCES fixed_expense_categories(code);

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_converted_tenant_id_fkey FOREIGN KEY (converted_tenant_id) REFERENCES profiles(id);

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE public.inquiry_messages ADD CONSTRAINT inquiry_messages_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE;

ALTER TABLE public.inquiry_messages ADD CONSTRAINT inquiry_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id);

ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES profiles(id);

ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id);

ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_tenant_profile_id_fkey FOREIGN KEY (tenant_profile_id) REFERENCES profiles(id);

ALTER TABLE public.monthly_expense_entries ADD CONSTRAINT monthly_expense_entries_category_code_fkey FOREIGN KEY (category_code) REFERENCES fixed_expense_categories(code);

ALTER TABLE public.monthly_expense_entries ADD CONSTRAINT monthly_expense_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE public.monthly_expense_entries ADD CONSTRAINT monthly_expense_entries_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES profiles(id);

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES room_assignments(id);

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_tenant_profile_id_fkey FOREIGN KEY (tenant_profile_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.monthly_income_records ADD CONSTRAINT monthly_income_records_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES profiles(id);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_profile_id_fkey FOREIGN KEY (recipient_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments ADD CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL;

ALTER TABLE public.payments ADD CONSTRAINT payments_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_profile_id_fkey FOREIGN KEY (tenant_profile_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.payments ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES profiles(id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE public.room_assignments ADD CONSTRAINT room_assignments_tenant_profile_id_fkey FOREIGN KEY (tenant_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_photos ADD CONSTRAINT room_photos_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE public.room_photos ADD CONSTRAINT room_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id);

ALTER TABLE public.room_price_history ADD CONSTRAINT room_price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE public.room_price_history ADD CONSTRAINT room_price_history_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE public.rooms ADD CONSTRAINT rooms_cluster_code_fkey FOREIGN KEY (cluster_code) REFERENCES clusters(code);

ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE public.ticket_attachments ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id);

ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets(id) ON DELETE CASCADE;

CREATE INDEX idx_allocations_entry ON public.expense_property_allocations USING btree (expense_entry_id);

CREATE INDEX idx_bills_room ON public.bills USING btree (room_id);

CREATE INDEX idx_bills_status_due ON public.bills USING btree (status, due_date);

CREATE INDEX idx_bills_tenant ON public.bills USING btree (tenant_profile_id);

CREATE INDEX idx_expense_active ON public.monthly_expense_entries USING btree (expense_date) WHERE (voided_at IS NULL);

CREATE INDEX idx_expense_alloc_area ON public.expense_property_allocations USING btree (property_area);

CREATE INDEX idx_income_active ON public.monthly_income_records USING btree (year, month) WHERE (voided_at IS NULL);

CREATE INDEX idx_income_room ON public.monthly_income_records USING btree (room_id);

CREATE INDEX idx_inquiries_room ON public.inquiries USING btree (room_id);

CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);

CREATE INDEX idx_inquiry_messages_inquiry ON public.inquiry_messages USING btree (inquiry_id);

CREATE INDEX idx_maintenance_tickets_room ON public.maintenance_tickets USING btree (room_id);

CREATE INDEX idx_maintenance_tickets_tenant ON public.maintenance_tickets USING btree (tenant_profile_id);

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_profile_id, is_read);

CREATE UNIQUE INDEX idx_one_bill_per_tenant_per_period ON public.bills USING btree (tenant_profile_id, billing_period_start, bill_type);

CREATE UNIQUE INDEX idx_one_invoice_per_unit_per_month ON public.monthly_income_records USING btree (room_id, invoice_number, year, month) WHERE ((voided_at IS NULL) AND ((invoice_number)::text IS DISTINCT FROM 'Acknowledgement receipt'::text));

CREATE INDEX idx_payments_bill ON public.payments USING btree (bill_id);

CREATE INDEX idx_payments_room ON public.payments USING btree (room_id);

CREATE INDEX idx_payments_tenant ON public.payments USING btree (tenant_profile_id);

CREATE INDEX idx_price_history_room ON public.room_price_history USING btree (room_id);

CREATE UNIQUE INDEX idx_profiles_email_lower ON public.profiles USING btree (lower((email)::text)) WHERE (email IS NOT NULL);

CREATE UNIQUE INDEX idx_profiles_login_id ON public.profiles USING btree (upper(regexp_replace((login_id)::text, '[^A-Za-z0-9]'::text, ''::text, 'g'::text))) WHERE (login_id IS NOT NULL);

CREATE UNIQUE INDEX idx_profiles_phone_login ON public.profiles USING btree (normalize_ph_phone((phone_number)::text)) WHERE ((phone_number IS NOT NULL) AND (password_hash IS NOT NULL));

CREATE INDEX idx_profiles_role_status ON public.profiles USING btree (role, account_status);

CREATE INDEX idx_room_assignments_room_active ON public.room_assignments USING btree (room_id, is_active);

CREATE INDEX idx_room_assignments_tenant_active ON public.room_assignments USING btree (tenant_profile_id, is_active);

CREATE UNIQUE INDEX idx_room_photos_one_primary ON public.room_photos USING btree (room_id) WHERE is_primary;

CREATE INDEX idx_room_photos_room ON public.room_photos USING btree (room_id, display_order);

CREATE UNIQUE INDEX idx_rooms_room_number_lower ON public.rooms USING btree (lower((room_number)::text));

CREATE UNIQUE INDEX idx_single_active_assignment_per_room ON public.room_assignments USING btree (room_id) WHERE (is_active = true);

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments USING btree (ticket_id);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages USING btree (ticket_id);

CREATE UNIQUE INDEX inquiries_access_token_hash_key ON public.inquiries USING btree (access_token_hash) WHERE (access_token_hash IS NOT NULL);

CREATE UNIQUE INDEX inquiries_reference_code_key ON public.inquiries USING btree (reference_code) WHERE (reference_code IS NOT NULL);

CREATE UNIQUE INDEX uq_income_gateway_reference ON public.monthly_income_records USING btree (transaction_reference) WHERE ((transaction_reference IS NOT NULL) AND (payment_method = 'Adyen Online'::payment_method_type));

CREATE UNIQUE INDEX uq_payments_gateway_reference ON public.payments USING btree (transaction_reference) WHERE ((transaction_reference IS NOT NULL) AND (payment_method = 'Adyen Online'::payment_method_type));

CREATE TRIGGER trg_record_room_price_change AFTER UPDATE OF current_price ON public.rooms FOR EACH ROW WHEN ((old.current_price IS DISTINCT FROM new.current_price)) EXECUTE FUNCTION record_room_price_change();

CREATE TRIGGER trg_route_linda_water BEFORE INSERT OR UPDATE OF water_payment, linda_water_charge, room_id, is_linda_billing ON public.monthly_income_records FOR EACH ROW EXECUTE FUNCTION route_linda_water();

CREATE TRIGGER trg_update_expense_total AFTER INSERT OR DELETE OR UPDATE ON public.expense_property_allocations FOR EACH ROW EXECUTE FUNCTION update_expense_entry_total();

-- Same lockdown as live: the publishable key reaches no table and no function;
-- the API uses the secret key only. Trigger functions keep PUBLIC execute, as live.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_expense_entry_total(), public.record_room_price_change(), public.route_linda_water() TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
