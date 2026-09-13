-- =============================================================================
-- DRIFT_DIAGNOSTIC.sql — what the live database actually looks like
-- =============================================================================
-- Read-only. Changes nothing. Run in the Supabase SQL Editor and send the result.
--
-- WHY THIS EXISTS. `rooms_floor_check` was found in production but appears nowhere
-- in this repository, which means `database/FULL_DATABASE_SCHEMA.sql` does not
-- describe the live database. The remaining Phase 2 deliverables — the Crow's Foot
-- ERD, the data dictionary and the 3NF proof — are supposed to document the real
-- system, and a capstone panel is entitled to expect they do. So the real schema
-- has to be read out of the database rather than inferred from a stale file.
--
-- Returns one flat table. Every row is `section | item | detail`.
-- =============================================================================

WITH
-- 1. Every CHECK constraint, the class of drift that broke migration 007.
checks AS (
  SELECT '1. CHECK constraints' AS section,
         rel.relname || '.' || con.conname AS item,
         pg_get_constraintdef(con.oid) AS detail
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public' AND con.contype = 'c'
),
-- 2. Every foreign key with its ON DELETE behaviour (confirms 005 and 008).
fks AS (
  SELECT '2. Foreign keys' AS section,
         rel.relname || '.' || att.attname AS item,
         CASE con.confdeltype
           WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
           WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION'
           WHEN 'd' THEN 'SET DEFAULT' ELSE con.confdeltype::text
         END || ' -> ' || fref.relname AS detail
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class fref ON fref.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
   WHERE nsp.nspname = 'public' AND con.contype = 'f'
),
-- 3. Tables, and whether the repo knows about them.
tbls AS (
  SELECT '3. Tables' AS section,
         table_name AS item,
         (SELECT count(*)::text FROM information_schema.columns c
           WHERE c.table_schema = 'public' AND c.table_name = t.table_name) || ' columns' AS detail
    FROM information_schema.tables t
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
-- 4. Nullability of the columns this phase changed.
cols AS (
  SELECT '4. Key columns' AS section,
         table_name || '.' || column_name AS item,
         data_type || ', nullable=' || is_nullable AS detail
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND (table_name, column_name) IN (
       ('profiles','email'), ('profiles','phone_number'), ('profiles','password_hash'),
       ('rooms','floor'), ('room_assignments','deposit_amount'),
       ('expense_property_allocations','property_area'))
),
-- 5. Unique and partial indexes (confirms 006).
idx AS (
  SELECT '5. Unique indexes' AS section,
         indexname AS item,
         indexdef AS detail
    FROM pg_indexes
   WHERE schemaname = 'public' AND indexdef ILIKE '%UNIQUE%'
),
-- 6. Functions (confirms 006 and 010).
fns AS (
  SELECT '6. Functions' AS section,
         p.proname AS item,
         pg_get_function_identity_arguments(p.oid) || ' -> ' ||
         pg_get_function_result(p.oid) AS detail
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
-- 7. Triggers, which the repo does not document at all.
trg AS (
  SELECT '7. Triggers' AS section,
         tgrelid::regclass::text || '.' || tgname AS item,
         pg_get_triggerdef(oid) AS detail
    FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace =
                       (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
),
-- 8. Row counts, for the data dictionary.
counts AS (
  SELECT '8. Row counts (estimate)' AS section,
         rel.relname AS item,
         rel.reltuples::bigint::text AS detail
    FROM pg_class rel JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public' AND rel.relkind = 'r'
)
SELECT * FROM checks
UNION ALL SELECT * FROM fks
UNION ALL SELECT * FROM tbls
UNION ALL SELECT * FROM cols
UNION ALL SELECT * FROM idx
UNION ALL SELECT * FROM fns
UNION ALL SELECT * FROM trg
UNION ALL SELECT * FROM counts
ORDER BY section, item;
