-- =============================================================================
-- 066 - the garbage fee leaves the system; "OR" becomes "invoice", and optional
-- =============================================================================
-- Sean, 2026-09-30, after the testing day, with his explicit permission to
-- remove the fee's data ("I don't want anything, any data, any component that
-- has to do with the garbage fee"). `npm run backup` was taken first:
-- backups/2026-09-30T14-47-18/ holds every row as it was, gbg_fee included.
--
-- WHAT CHANGES
-- ------------
-- 1. Garbage fee
--    * record_income_for_months() is re-created without p_gbg_fee (the old
--      signature is dropped; the new one gets the same lock-down as 060:
--      no PUBLIC / anon / authenticated execute, search_path pinned).
--    * monthly_income_records.gbg_fee and its CHECK constraint are dropped.
--      531 rows carried a fee, PHP 10,620.00 in all. remitted_amount is
--      rent + water and never included it, so no Remitted figure changes.
-- 2. Invoices, not official receipts ("OR")
--    * monthly_income_records.invoice_number becomes optional (NULL = the
--      payment had no invoice), and is written INV#<n>:
--        OR#4726 / O#4726 / INVOICE#4726 / INV.4726 / INV#4726  ->  INV#4726
--      (the rule in backend/src/utils/invoiceNumber.ts). The "N/A-<unit>-<m>-<y>"
--      numbers the importer invented for payments that had none become NULL.
--      Anything else ("ACKNOWL") is left exactly as written.
--    * idx_one_receipt_per_unit_per_month is renamed
--      idx_one_invoice_per_unit_per_month (same columns; NULLs never clash).
--    * monthly_expense_entries.or_supplier is renamed invoice_supplier, and
--      create_expense_entry_with_allocations() takes p_invoice_supplier
--      (re-created, same lock-down as 019).
-- Every old invoice number is kept in one AUDIT_CORRECTION row
-- (previous_values: record id -> old text), and the garbage fees removed are
-- counted and totalled in another.
--
-- The trigger on monthly_income_records fires only on water, Linda charges,
-- room or Linda flag, so rewriting invoice numbers cannot move any money.
--
-- SAFETY
-- ------
--   * One statement (a DO block) for the data and the checks; an error undoes it.
--   * Stops if a rewritten invoice number would collide in the unique index.
--   * A second run finds nothing to do and records nothing.
-- =============================================================================

DO $$
DECLARE
  n_fee       integer := 0;
  fee_total   numeric := 0;
  inv_map     jsonb;
  n_inv       integer := 0;
  n_na        integer := 0;
  has_gbg     boolean;
  has_or_col  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'monthly_income_records' AND column_name = 'gbg_fee')
    INTO has_gbg;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'monthly_expense_entries' AND column_name = 'or_supplier')
    INTO has_or_col;

  -- ---- 1. garbage fee -------------------------------------------------------
  IF has_gbg THEN
    EXECUTE 'SELECT count(*) FILTER (WHERE gbg_fee <> 0), coalesce(sum(gbg_fee), 0) FROM monthly_income_records'
      INTO n_fee, fee_total;
    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'INCOME_RECORD', '00000000-0000-0000-0000-000000000066',
            jsonb_build_object('rows_with_a_garbage_fee', n_fee, 'garbage_fee_total', fee_total),
            jsonb_build_object(
              'note', 'The garbage fee was removed from the system at the owner''s request: the column and every figure in it. Remitted amounts never included it and do not change. The full values are in the backup taken before this migration (backups/2026-09-30T14-47-18).',
              'reference', 'migration 066, Sean 2026-09-30'),
            NULL);
  END IF;

  -- ---- 2. invoice numbers ---------------------------------------------------
  WITH target AS (
    SELECT id, invoice_number AS old,
           CASE
             WHEN invoice_number ~* '^\s*N/A' THEN NULL
             WHEN regexp_replace(trim(invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i') ~ '^[0-9]'
               THEN 'INV#' || regexp_replace(trim(invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i')
             WHEN trim(invoice_number) ~ '^[0-9]' THEN 'INV#' || trim(invoice_number)
             ELSE trim(invoice_number)
           END AS new
    FROM monthly_income_records
    WHERE invoice_number IS NOT NULL
  )
  SELECT jsonb_object_agg(id::text, old), count(*) FILTER (WHERE new IS NOT NULL), count(*) FILTER (WHERE new IS NULL)
    INTO inv_map, n_inv, n_na
  FROM target
  WHERE new IS DISTINCT FROM old;

  IF inv_map IS NOT NULL THEN
    -- Would any rewritten number collide in the one-per-unit-per-month index?
    IF EXISTS (
      SELECT 1 FROM (
        SELECT room_id, year, month,
               CASE
                 WHEN invoice_number ~* '^\s*N/A' THEN NULL
                 WHEN regexp_replace(trim(invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i') ~ '^[0-9]'
                   THEN 'INV#' || regexp_replace(trim(invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i')
                 WHEN trim(invoice_number) ~ '^[0-9]' THEN 'INV#' || trim(invoice_number)
                 ELSE trim(invoice_number)
               END AS new
        FROM monthly_income_records WHERE voided_at IS NULL
      ) x WHERE new IS NOT NULL
      GROUP BY room_id, new, year, month HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION '066: rewriting invoice numbers would put two payments under one invoice for a unit and month. Nothing changed.';
    END IF;

    ALTER TABLE monthly_income_records ALTER COLUMN invoice_number DROP NOT NULL;

    UPDATE monthly_income_records m
       SET invoice_number = CASE
             WHEN m.invoice_number ~* '^\s*N/A' THEN NULL
             WHEN regexp_replace(trim(m.invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i') ~ '^[0-9]'
               THEN 'INV#' || regexp_replace(trim(m.invoice_number), '^(O\.?\s*R\.?|O|INVOICE|INV\.?)\s*#?\s*', '', 'i')
             WHEN trim(m.invoice_number) ~ '^[0-9]' THEN 'INV#' || trim(m.invoice_number)
             ELSE trim(m.invoice_number)
           END,
           updated_at = now()
     WHERE m.id::text IN (SELECT jsonb_object_keys(inv_map));

    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'INCOME_RECORD', '00000000-0000-0000-0000-000000000066',
            jsonb_build_object('invoice_number_by_record', inv_map),
            jsonb_build_object(
              'note', 'Invoice numbers written one way: INV#<number> (the owner issues invoices, not official receipts). The numbers the importer invented for payments with no invoice (N/A-...) are now blank. Every old value is in previous_values.',
              'rewritten', n_inv, 'made_blank', n_na,
              'reference', 'migration 066, Sean 2026-09-30'),
            NULL);
  ELSE
    ALTER TABLE monthly_income_records ALTER COLUMN invoice_number DROP NOT NULL;
  END IF;

  -- ---- 3. expense supplier column ------------------------------------------
  IF has_or_col THEN
    ALTER TABLE monthly_expense_entries RENAME COLUMN or_supplier TO invoice_supplier;
  END IF;
END $$;

-- The income index keeps its columns; only its name stops saying "receipt".
ALTER INDEX IF EXISTS idx_one_receipt_per_unit_per_month RENAME TO idx_one_invoice_per_unit_per_month;

-- record_income_for_months without the garbage fee -------------------------------
DROP FUNCTION IF EXISTS public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, numeric, integer, payment_method_type, character varying, jsonb
);

CREATE OR REPLACE FUNCTION public.record_income_for_months(
  p_room_id uuid, p_tenant_profile_id uuid, p_assignment_id uuid, p_date_paid date,
  p_contact_name character varying, p_invoice_number character varying,
  p_rent_amount numeric, p_water_payment numeric, p_occupants integer,
  p_payment_method payment_method_type, p_transaction_reference character varying, p_periods jsonb
)
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
END $function$;

REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, integer, payment_method_type, character varying, jsonb
) TO service_role;

-- The column goes last: nothing refers to it any more.
ALTER TABLE monthly_income_records DROP CONSTRAINT IF EXISTS monthly_income_records_gbg_fee_check;
ALTER TABLE monthly_income_records DROP COLUMN IF EXISTS gbg_fee;

-- create_expense_entry_with_allocations with p_invoice_supplier --------------------
DROP FUNCTION IF EXISTS public.create_expense_entry_with_allocations(date, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_expense_entry_with_allocations(
  p_expense_date date, p_invoice_supplier text, p_category_code text, p_allocations jsonb,
  p_created_by uuid DEFAULT NULL::uuid
)
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

  IF NOT EXISTS (
    SELECT 1 FROM public.fixed_expense_categories WHERE code = p_category_code
  ) THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no expense category %', p_category_code;
  END IF;

  INSERT INTO public.monthly_expense_entries (
    expense_date, invoice_supplier, category_code, total_expenses, created_by
  )
  VALUES (
    p_expense_date, p_invoice_supplier, p_category_code, 0, p_created_by
  )
  RETURNING id INTO v_entry_id;

  v_alloc_count := public.replace_expense_allocations(v_entry_id, p_allocations);

  IF v_alloc_count IS NULL OR v_alloc_count = 0 THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no allocation rows were written for entry %', v_entry_id;
  END IF;

  SELECT * INTO v_entry FROM public.monthly_expense_entries WHERE id = v_entry_id;

  RETURN to_jsonb(v_entry) || jsonb_build_object('allocation_count', v_alloc_count);
END
$function$;

REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(date, text, text, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(date, text, text, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(date, text, text, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_expense_entry_with_allocations(date, text, text, jsonb, uuid) TO service_role;

-- "Success. No rows returned" means it ran.
--
-- PREVIEW (read only): what will change.
--   SELECT count(*) FILTER (WHERE gbg_fee <> 0) AS rows_with_fee, sum(gbg_fee) AS fee_total,
--          count(*) FILTER (WHERE invoice_number ~* '^\s*N/A') AS na_to_blank,
--          count(*) FILTER (WHERE invoice_number ~* '^\s*(O|INV)') AS to_inv
--   FROM monthly_income_records;
--
-- AFTER:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name IN ('monthly_income_records','monthly_expense_entries')
--      AND column_name IN ('gbg_fee','or_supplier','invoice_supplier','invoice_number');
--   -- expect invoice_number and invoice_supplier only
--   SELECT upper(substring(invoice_number from '^[A-Za-z#]*')), count(*)
--     FROM monthly_income_records GROUP BY 1;   -- expect INV#, NULL, ACKNOWL
