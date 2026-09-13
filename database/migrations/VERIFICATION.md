# Migration Verification Record — `005`–`010`

**Run 2026-09-13 against PostgreSQL 16 (`postgres:16-alpine`) in a throwaway container.**
Not run against Supabase. These migrations remain **unapplied to the live database**.

Live-data preconditions *were* checked directly against production, read-only, with
`database/check-migration-preconditions.mjs`. **No blockers.**

## Method

The live schema (`database/FULL_DATABASE_SCHEMA.sql`, 20 tables, 33 seeded units) was loaded into a
virgin database, then `001`–`009` were applied in order. The three Supabase roles (`anon`,
`authenticated`, `service_role`) had to be created first — they are assumed by `002` and do not exist
in stock PostgreSQL. That is a harness detail, not a defect.

## Result

All nine migrations applied clean, and `005`–`009` were then **re-run on the already-migrated
database and applied clean a second time**, confirming idempotency. Row counts and corrected values
survived the re-run unchanged.

### Behaviour actually exercised, not just executed

| Test | Expected | Result |
| :--- | :--- | :--- |
| Delete a room that has a bill | refused | **refused** — `bills_room_id_fkey` |
| Ledger FK `ON DELETE` behaviour | 6 × RESTRICT | **6 × RESTRICT**; `payments.bill_id` and `monthly_income_records.assignment_id` correctly left `SET NULL` |
| `PH` floor | 4 | **4** |
| Tenant with no email and no login | allowed | **allowed** |
| A second tenant also with no email | allowed | **allowed** (multiple NULLs legal) |
| Spouse sharing a phone, neither has a login | allowed | **allowed** |
| Account with a password but no email and no phone | refused | **refused** — `profiles_login_identifier_required` |
| Second login on `+63 917 555 1234` vs existing `0917 555 1234` | refused | **refused** — `idx_profiles_phone_login` |
| Second login on `0917-555-1234` (punctuation variant) | refused | **refused** |
| Login on a genuinely different number | allowed | **allowed** |
| Expense allocation to a canonical area | allowed | **allowed** |
| Allocation to `'Mian House'` (typo) | refused | **refused** — FK |
| Delete a property area that has expenses | refused | **refused** — `ON DELETE RESTRICT` |

### The exclusion arithmetic, on the real spreadsheet row

The `4-Jun-26 Electricbill (May26)` entry from `docs/10_MONTHLY_EXPENSES_REPORT.md` §5 was inserted as
its true two-way split and queried back through `is_rental_expense`:

| | |
| :--- | ---: |
| Business expense (Boarding House) | **₱14,964.13** |
| Personal, excluded (Main House) | **₱5,688.67** |

This is the OD-05 decision working end to end: without `is_rental_expense`, that ₱5,688.67 would be
subtracted from rental income it has nothing to do with.

## A defect the verification found, and the fix applied

The first version of `006` normalised phone numbers with `regexp_replace(phone_number,'[^0-9]','','g')`
— strip everything that is not a digit. **It failed the live test.** `0917 555 1234` yields
`09175551234`; `+63 917 555 1234` yields `639175551234`. Different strings, so the unique index let
the same human phone number register two separate logins.

Philippine mobile numbers are written both ways as a matter of course. `006` now uses an `IMMUTABLE`
helper, `public.normalize_ph_phone(text)`, which folds a leading `63` country code onto the national
`0` prefix before comparing. The three variants above now collide correctly.

> Caveat on that helper: because a unique index is built on it, replacing its body silently
> invalidates the index. Reindex `profiles` if it is ever altered. The `COMMENT` on the function says so.

## Risk this introduces — read before applying `008`

`008` converts a previously silent bad write into a hard error, and one code path turns that into
**data loss**.

`backend/src/routes/admin.ts:1471-1477` handles an expense-entry edit. It **deletes every allocation
for the entry, then inserts the replacements**, with no transaction around the pair — consistent with
known defect 7, that no `BEGIN`/`COMMIT` exists anywhere in `backend/src`. Line `:1474` builds the
value as `a.propertyArea || a.area`. The `|| a.area` fallback can carry a short form such as
`'Front Apt'` or `'Other'`, which are **not** canonical area codes.

Today that writes a junk string and no report ever finds it again. After `008` the insert is rejected
by the foreign key — **but the delete has already committed**, so the entry loses its allocations.

Verified: `'Front Apt'` is refused by the constraint, exactly as a bad value should be.

**Recommended sequencing.** Either fix `:1474` to normalise to the canonical five (and wrap the
delete/insert in a transaction) *before* applying `008`, or accept that an expense-entry edit carrying
a short-form area will fail and lose that entry's allocations until it is fixed. The frontend's own
`areaMap` (`frontend/src/views/ExpensesLedgerView.vue:234-240`) does map to canonical forms before
posting, so the path is not exercised by normal UI use — but it is reachable by the API.

## Reproducing

```bash
docker run -d --name hivelet-verify -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=hivelet postgres:16-alpine
docker exec hivelet-verify psql -U postgres -d hivelet -c \
  "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;"
docker cp database/FULL_DATABASE_SCHEMA.sql hivelet-verify:/tmp/base.sql
docker exec hivelet-verify psql -U postgres -d hivelet -v ON_ERROR_STOP=1 -f /tmp/base.sql
# then copy and apply database/migrations/001..009 in order
```

---

## Migration `010` — atomicity, proven

`010` adds `public.replace_expense_allocations(uuid, jsonb)`, a plpgsql function that replaces an
entry's allocations inside a single transaction. The claim it makes is that a rejected insert can no
longer destroy the allocations that were already there. That was tested directly.

An entry was seeded with the real two-way split — ₱14,964.13 Boarding House and ₱5,688.67 Main
House — and then a replacement was attempted whose payload contained `'Front Apt'`, a non-canonical
value:

```
ERROR: insert or update on table "expense_property_allocations"
       violates foreign key constraint "expense_property_allocations_property_area_fkey"
DETAIL: Key (property_area)=(Front Apt) is not present in table "property_areas".
```

**Both original rows survived, unchanged.** Under the previous two-round-trip code the delete would
already have committed and the entry would have been left with nothing.

A valid replacement then inserted 3 rows, and `total_expenses` was recomputed to `300.00` from the
allocations themselves — rental `255.50`, personal `44.50`.

## Live production preconditions, checked read-only

`database/check-migration-preconditions.mjs` reads the live database and writes nothing. Run
2026-09-13:

| Check | Result |
| :--- | :--- |
| Credentialed accounts sharing a phone (after `+63` folding) | none |
| Case-insensitive email collisions | none |
| Credentialed accounts with neither email nor phone | none |
| Stored `property_area` values outside the canonical five | none, across **1,327** allocations |
| `bills` / `payments` / `monthly_income_records` | 2 / 15 / 937 rows — `RESTRICT` affects DELETE only, so conversion touches none |
| `PH` current floor | 3 → becomes 4 |

**Verdict: no blockers. `005`–`010` can be applied as written.**

### What the live data revealed about OD-05

Totals across all 1,327 allocations (paginated past PostgREST's 1,000-row default, which silently
truncates and would have understated this):

| | |
| :--- | ---: |
| Boarding House | ₱2,253,574.74 |
| Front Apartment | ₱87,411.27 |
| Back Apartment | ₱49,609.99 |
| **Operating total** | **₱2,390,596.00** |
| Main House | ₱1,437,487.22 |
| Other Expenses / Personal | ₱1,995,503.25 |
| **Personal total** | **₱3,432,990.47** |
| Ledger face value | ₱5,823,586.47 |

**58.9% of the expense ledger is personal, not operating cost.** The admin overview computed
`noi = grossIncome - totalExpenses`, subtracting all of it, so Net Operating Income was understated
by ₱3.43M across the recorded history. Fixed in `frontend/src/views/AdminOverviewView.vue` and
`frontend/src/lib/systemState.ts`; the personal figure is now displayed separately rather than
dropped.

## Applying to Supabase

`database/migrations/APPLY_PHASE2.sql` concatenates `005`–`010` in order with a header. Paste it into
the Supabase SQL Editor and Run. It was tested by applying it, whole, to a fresh database built from
`FULL_DATABASE_SCHEMA.sql` + `001`–`004`, then applying it a second time: zero errors both times.

DDL cannot be applied through PostgREST even with the `service_role` key, so the SQL Editor (or a
direct Postgres connection string) is the only route.

---

# Addendum — the first production run failed, and why the verification missed it

**2026-09-13. `APPLY_PHASE2.sql` was run against Supabase and stopped at migration `007`:**

```
ERROR: 23514: new row for relation "rooms" violates check constraint "rooms_floor_check"
DETAIL: Failing row contains (..., PH, 4, Penthouse, ...)
```

## What happened to the database

`005` and `006` committed. `007` failed and **rolled back cleanly**. `008`, `009` and `010` never ran,
because the editor stops at the first error. Confirmed afterwards by reading the live database:
`PH` still on floor 3, no `property_areas` table, no `replace_expense_allocations` function.

Nothing was left half-applied. That is the per-migration `BEGIN`/`COMMIT` doing its job, and it is the
reason a failure here cost a re-run rather than a repair.

## Why the verification did not catch it

**The test database was built from `database/FULL_DATABASE_SCHEMA.sql`. The live database is not.**

Production carries a CHECK constraint, `rooms_floor_check`, capping `rooms.floor` at 3. That
constraint appears **nowhere in this repository** — not in the master schema file, not in migrations
`001`–`004`. It was applied out of band. The schema file declares `floor INTEGER NOT NULL DEFAULT 1`
and defines exactly one CHECK constraint in the whole file, so a database built from it has nothing
stopping `floor = 4`.

Migration `007` even said so in its own comments: *"`rooms.floor` is a plain INTEGER NOT NULL DEFAULT
1 with no CHECK constraint, so level 4 is accepted."* That was a true statement about the file and a
false statement about the database, and every test run inherited the same blind spot. The behavioural
tests were sound; the fixture was wrong.

**The correction to the method:** a migration bound for production must be tested against a database
that reproduces production, not against the repo's idea of it. `007` was re-verified against a
container built from the schema file **plus** the real `rooms_floor_check`, which reproduced the
23514 failure exactly before the fix, and passed after it.

## The fix

`007` now finds any CHECK constraint on `rooms` whose definition mentions `floor` — by definition, not
by name, so it works whatever the constraint is called and whether or not it exists — reports what it
replaced, drops it, and installs `CHECK (floor BETWEEN 1 AND 4)` before touching the row.

Verified against the drifted database:

| Test | Result |
| :--- | :--- |
| Reports the constraint it replaces | `CHECK (((floor >= 1) AND (floor <= 3)))` |
| `PH` reaches level 4 | yes |
| Re-run on its own output | clean, idempotent |
| `floor = 5` still rejected | **rejected** — the constraint still constrains |
| `005`, `006`, `008`, `009`, `010` on the drifted schema | all clean |

## What this means for the rest of Phase 2

`FULL_DATABASE_SCHEMA.sql` is **not** an accurate description of the live database, and one instance of
drift means there may be more — other CHECK constraints, triggers, indexes or columns applied out of
band and never written back.

The ERD, data dictionary and 3NF proof are meant to document the real system. They will be built from
`DRIFT_DIAGNOSTIC.sql`, which reads the live catalogue directly, rather than from the schema file.
