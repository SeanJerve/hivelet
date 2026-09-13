-- =============================================================================
-- DRIFT_DIAGNOSTIC.sql — what the live database actually looks like
-- =============================================================================
-- Read-only. Changes nothing. Run in the Supabase SQL Editor.
--
-- BEST: run it, then use "Download CSV" and save the file as
-- `database/live_schema.csv` in the repository. That gives the whole picture in
-- one go instead of a screenshot that truncates.
--
-- WHY THIS EXISTS. `database/FULL_DATABASE_SCHEMA.sql` does not describe the live
-- database. Two differences have already been found, each by a migration failing
-- in production after passing every local test:
--
--   1. `rooms_floor_check`  — a CHECK constraint capping rooms.floor at 3.
--                             Broke migration 007 (SQLSTATE 23514).
--   2. `property_area_type` — expense_property_allocations.property_area is a
--                             custom ENUM, not the VARCHAR(100) the file claims.
--                             Broke migration 008 (SQLSTATE 42883).
--
-- Neither appears anywhere in the repository. Two unknown differences found by
-- accident means there are probably more, and the remaining Phase 2 deliverables
-- — the Crow's Foot ERD, the data dictionary, the 3NF proof — are supposed to
-- document the real system. A panel is entitled to expect that they do. So the
-- schema gets read out of the database instead of inferred from a stale file.
--
-- Section 0 (custom types) is the section whose absence caused the second
-- failure. It is first for that reason.
--
-- Returns one flat table: `section | item | detail`.
-- =============================================================================

WITH
-- 0. Custom types and their values. The gap that broke migration 008.
enums AS (
  SELECT '0. Custom types' AS section,
         t.typname AS item,
         string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS detail
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'public'
   GROUP BY t.typname
),
-- 1. Every column, with its REAL type. This is the data dictionary source.
cols AS (
  SELECT '1. Columns' AS section,
         c.relname || '.' || a.attname AS item,
         format_type(a.atttypid, a.atttypmod)
           || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE ' NULL' END
           || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '') AS detail
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND a.attnum > 0 AND NOT a.attisdropped
),
-- 2. CHECK constraints. The gap that broke migration 007.
checks AS (
  SELECT '2. CHECK constraints' AS section,
         rel.relname || '.' || con.conname AS item,
         pg_get_constraintdef(con.oid) AS detail
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public' AND con.contype = 'c'
),
-- 3. Foreign keys with ON DELETE behaviour. Confirms 005 and 008.
fks AS (
  SELECT '3. Foreign keys' AS section,
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
-- 4. Unique and primary key constraints.
uniq AS (
  SELECT '4. PK / UNIQUE' AS section,
         rel.relname || '.' || con.conname AS item,
         pg_get_constraintdef(con.oid) AS detail
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public' AND con.contype IN ('p', 'u')
),
-- 5. Indexes, including partial ones. Confirms 006.
idx AS (
  SELECT '5. Indexes' AS section,
         indexname AS item,
         indexdef AS detail
    FROM pg_indexes
   WHERE schemaname = 'public'
),
-- 6. Functions. Confirms 006 and 010.
fns AS (
  SELECT '6. Functions' AS section,
         p.proname AS item,
         pg_get_function_identity_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid) AS detail
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
-- 7. Triggers. The repository documents none of these.
trg AS (
  SELECT '7. Triggers' AS section,
         tgrelid::regclass::text || '.' || tgname AS item,
         pg_get_triggerdef(oid) AS detail
    FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace =
                       (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
),
-- 8. RLS state per table. Confirms 002 is still in force.
rls AS (
  SELECT '8. RLS' AS section,
         c.relname AS item,
         CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'DISABLED' END
           || CASE WHEN c.relforcerowsecurity THEN ', forced' ELSE '' END
           || ', ' || (SELECT count(*) FROM pg_policies p
                        WHERE p.schemaname = 'public' AND p.tablename = c.relname)::text
           || ' policies' AS detail
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
),
-- 9. Exact row counts, for the data dictionary.
counts AS (
  SELECT '9. Row counts' AS section,
         c.relname AS item,
         (xpath('/row/c/text()',
            query_to_xml(format('SELECT count(*) AS c FROM public.%I', c.relname),
                         false, true, '')))[1]::text::text AS detail
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
)
SELECT * FROM enums
UNION ALL SELECT * FROM cols
UNION ALL SELECT * FROM checks
UNION ALL SELECT * FROM fks
UNION ALL SELECT * FROM uniq
UNION ALL SELECT * FROM idx
UNION ALL SELECT * FROM fns
UNION ALL SELECT * FROM trg
UNION ALL SELECT * FROM rls
UNION ALL SELECT * FROM counts
ORDER BY section, item;
