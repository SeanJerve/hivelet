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

---

# Second addendum — a second drift, and the same mistake made twice

**2026-09-13, second production run.** `005`, `006` and `007` applied. `008` failed:

```
ERROR: 42883: operator does not exist: character varying = property_area_type
QUERY:  ... LEFT JOIN public.property_areas p ON p.code = a.property_area
```

`008` rolled back; `009` and `010` never ran. `PH` is now on level 4, so the `007` fix worked.

## What the second drift is

**In production, `expense_property_allocations.property_area` is a custom ENUM called
`property_area_type`.** `FULL_DATABASE_SCHEMA.sql` declares it `VARCHAR(100) NOT NULL`. The enum type
is not mentioned anywhere in the repository.

This did not merely break a join. **It falsified the migration's stated premise.** `008` opened by
arguing that `property_area` was unconstrained free text where *"a typo silently creates a sixth area
that no report will ever find again"*. Against an enum that was never true: the value set was already
closed, and typos were already impossible.

So the foreign key `008` adds is not the point and never was. The point is `is_rental_expense` — the
personal/rental boundary from OD-05, which no enum can carry and which nothing in the live database
records anywhere. The migration's rationale has been rewritten to say that, rather than leaving a
justification that the database contradicts.

## The mistake, stated plainly

The first addendum drew the right lesson — *"a migration bound for production must be tested against a
database that reproduces production"* — and then only half-applied it. `007` was re-verified against a
fixture carrying the real CHECK constraint. `008` was regenerated in the same commit **without
checking the type of the column it was about to constrain**, from the same file already known to be
unreliable. The correction was applied to the specific failure instead of to the class of failure.

Both drifts were found by production rejecting a migration. Neither was found by reading. That is the
part worth fixing, and it is why the fixture below now exists as a file rather than as a set of
commands typed once.

## `_TEST_FIXTURE_production_drift.sql`

Every known difference between the repository and production, in one idempotent script, applied
immediately after `FULL_DATABASE_SCHEMA.sql` + `001`-`004` when building any test database:

| # | Drift | Broke | SQLSTATE |
| :-- | :--- | :--- | :--- |
| 1 | `rooms_floor_check` capping `rooms.floor` at 3 | `007` | 23514 |
| 2 | `property_area` is the enum `property_area_type`, not varchar | `008` | 42883 |

**A migration that has not been run against this fixture has not been tested.**

The fixture was confirmed to reproduce *both* original errors before the fixes were applied — the
42883 was reproduced by joining a `VARCHAR(100)` key against the column, exactly as the old `008` did.

## The fix in `008`

Step 1 now reads the column's real type out of `pg_attribute` and builds the lookup's primary key to
match, via `format()` and `EXECUTE`. It is correct whether the column is the enum, a varchar, or
something else again — it does not assume, it asks. The seed works unchanged either way, because
unquoted string literals are of unknown type and coerce to whatever the column turned out to be.

Verified on the production-like fixture:

| Test | Result |
| :--- | :--- |
| `008` reports the type it found | `property_area is of type property_area_type` |
| `property_areas.code` type | `property_area_type` — matches the referencing column |
| Areas seeded / non-rental | 5 / 2 |
| `005`-`010` on the drifted schema | all clean |
| Whole `APPLY_PHASE2.sql`, run twice | zero errors both runs |
| End state | PH level 4, 6 ledger RESTRICT, email nullable, RPC present |

## Consequence for the rest of Phase 2

Two unknown differences, both found by accident, means the count of unknown differences is not two.
`DRIFT_DIAGNOSTIC.sql` now dumps custom types first — the section whose absence caused this failure —
along with every column's real type, CHECK constraints, foreign keys, indexes, functions, triggers,
RLS state and row counts.

**The ERD, data dictionary and 3NF proof will be built from its output, saved as
`database/live_schema.csv`, and not from `FULL_DATABASE_SCHEMA.sql`.**

---

# Third addendum — the full run succeeded, and a third drift found by reading

**2026-09-13, third production run.** `APPLY_PHASE2.sql` completed. Confirmed by reading the live
catalogue afterwards:

| Migration | Live evidence |
| :--- | :--- |
| `005` | 6 ledger foreign keys are `RESTRICT`; `payments.bill_id` still `SET NULL` |
| `006` | `profiles.email` is nullable; `idx_profiles_phone_login` and `profiles_login_identifier_required` present |
| `007` | `PH` is on floor 4; `rooms_floor_check` reads `CHECK (floor >= 1 AND floor <= 4)` |
| `008` | `property_areas` holds 5 rows, 2 non-rental; FK from `expense_property_allocations` is `RESTRICT` and its key type matches the `property_area_type` enum |
| `009` | The `deposit_amount` comment is in place and reads "ADVANCE RENT, not a refundable security deposit" |
| `010` | `replace_expense_allocations(uuid, jsonb)` present, `search_path` pinned, `EXECUTE` held only by `postgres` and `service_role` |

**All 21 tables present.** `005`–`010` are now live. Nothing in this record's earlier sections
should be read as still pending.

## Drift 3 — `fifty_percent_share` and `remitted_amount` are GENERATED columns

Found while preparing the Phase 2 data dictionary, by reading `pg_attribute.attgenerated`.

| | |
| :--- | :--- |
| `FULL_DATABASE_SCHEMA.sql:268, :272` says | `NUMERIC(10,2) NOT NULL DEFAULT 0.00` |
| Production actually has | `NUMERIC(10,2)` **`GENERATED ALWAYS AS (rent_amount / 2.0) STORED`** and **`GENERATED ALWAYS AS (rent_amount + water_payment) STORED`**, both nullable |

This is the **first drift found by reading rather than by a production failure**, which is the
correction the second addendum said was the part worth fixing. The sweep that found it —
"every column with a generation expression or a column-referencing default" — is now one of the three
mechanical sweeps recorded in `PHASE2_NORMALIZATION_PROOF.md` section 1.

### It falsifies defect #5

The register has carried, since Phase 1:

> `fifty_percent_share` / `remitted_amount` computed but **never written** — every row stores `0.00`

The first clause is true: `backend/src/routes/admin.ts:922` assigns `fiftyPercentShare` and the
variable is never read again — dead code. The second clause is **false**. Measured across all 937
live non-void rows:

| Check | Result |
| :--- | ---: |
| `fifty_percent_share = 0` | **0 rows** |
| `fifty_percent_share = round(rent_amount / 2, 2)` | **937 of 937** |
| `remitted_amount = 0` | **0 rows** |
| `remitted_amount = rent_amount + water_payment` | **937 of 937** |

PostgreSQL maintains both columns. The defect is much smaller than recorded: dead code to delete,
moving no money. **Any Phase 3 insert must omit both columns** — a generated column cannot be
written, and naming it in an `INSERT` is an error.

## Migrations 011 and 012 — written, NOT applied

Neither has been run against any database. Both were produced after the third run.

| Migration | Purpose | Risk if deferred |
| :--- | :--- | :--- |
| `011_security_posture_corrections.sql` | Forced RLS on `property_areas`; makes migration `002`'s `current_user_role()` revoke actually take effect by revoking from `PUBLIC`; pins `search_path` on all four public functions | Low today. `anon` holds no grant on `property_areas`, so the missing RLS is a lost second layer rather than an open door. The `SECURITY DEFINER` function stays callable by `anon`. |
| `012_penthouse_area_and_cluster_routing.sql` | Adds the `Penthouse` property area (OD-15); moves the cluster-to-area mapping onto `clusters.expense_area` so many clusters can share one area; routes `Linda` to `Back Apartment` | Penthouse, LF and LB costs continue to have nowhere to be booked. |

**`012` has an ordering constraint.** `ALTER TYPE ... ADD VALUE` cannot be used in the same
transaction that adds it, so the file commits the enum change before seeding the row. Run the file
whole; do not wrap it in a single outer transaction.

**`012` also requires a code change, applied second, not first:** add `'Penthouse'` to
`PROPERTY_AREAS` in `backend/src/config/propertyAreas.ts`. Adding it while the database still has
five areas would let the API accept a value the foreign key rejects.

---

# Fourth addendum — 011/012/013 tested properly, and what that turned up

**2026-09-13.** Migrations `011` and `012` could not be applied to Supabase from the session that
wrote them (the environment refused the production write), so they were instead tested the way this
record has twice said migrations must be: against a throwaway PostgreSQL 16 built to resemble
production, not the repository.

**Testing them found four defects that reading had not.** Three were in the new migrations. The
fourth is live in production right now.

## The fixture was badly incomplete — seven drifts, not two

`_TEST_FIXTURE_production_drift.sql` claimed to hold "every known difference". It held two. Building
a database from it and comparing against `live_schema.csv` found five more:

| # | Drift | How found | Consequence if unreproduced |
| :-- | :--- | :--- | :--- |
| 1 | `rooms_floor_check` capping floor at 3 | `007` failed in production, 23514 | — |
| 2 | `property_area` is an enum | `008` failed in production, 42883 | — |
| 3 | **All thirteen enums.** `FULL_DATABASE_SCHEMA.sql` contains **zero `CREATE TYPE`** statements; production defines 13 enum types across 18 columns, every one declared `VARCHAR` in the repo | Reading `pg_type` | Drift 2 was never a special case. **No migration touching any enum column had ever been genuinely tested.** |
| 4 | `fifty_percent_share` / `remitted_amount` are `GENERATED ALWAYS AS … STORED` | Reading `pg_attribute.attgenerated` | Falsified defect #5 |
| 5 | `update_expense_entry_total()` + `trg_update_expense_total` exist in production and **nowhere in the repository** | Comparing function and trigger lists | A database rebuilt from the repo has **no triggers at all**, so BR-045 silently stops holding |
| 6 | `current_user_role()` exists in production, created out of band | Comparing function lists | The revoke path in `011` was untestable |
| 7 | `UNIQUE (expense_entry_id, property_area)` | An `ON CONFLICT` clause failing with 42P10 under behavioural test | **The only composite candidate key in the schema.** It enforces BR-044, and the entire 2NF section of the normalization proof is about it |

All seven are now reproduced by the fixture. A database built from it has 13 enum types, 18
enum-typed columns, 2 generated columns, 1 trigger and the composite unique key — matching production.

Drift 5 deserves emphasis beyond testing: **`update_expense_entry_total` is the object that makes
BR-045 true, and it exists in exactly one place in the world — the production database.** It is not
in the schema file, not in any migration, not in any backup script in this repository. Restore
production from the repo and expense totals quietly stop tracking their allocations.

## Defects found in the new migrations, and fixed

| # | Defect | Fix |
| :-- | :--- | :--- |
| A | `011` named `current_user_role()` in an unconditional `ALTER FUNCTION`. On a database where migration `002` had not created it, the whole transaction aborted with 42883. | `011` now iterates `pg_proc` instead of naming functions. |
| B | That iteration then pinned `search_path` on **44 pgcrypto and uuid-ossp functions**. On Supabase those live in the `extensions` schema so production was unaffected, but altering extension-owned objects is out of scope and can be undone by `ALTER EXTENSION UPDATE`. | `011` now excludes anything with a `pg_depend` entry of `deptype = 'e'`. Verified: 0 extension functions touched. |
| C | `008` stopped being replayable once `012` dropped `property_areas.cluster_code` — a static `INSERT` naming a dropped column fails at **parse** time, so no runtime guard can save it. Its verification also asserted `COUNT(*) = 5`, which the sixth area from `012` broke. | `008` seeds without `cluster_code` and populates it through dynamic SQL only while the column exists. Its assertion now checks **the five areas it is responsible for**, not the size of the table. A migration's verification must not turn every later addition into a false failure. |

## Defect found in production: `replace_expense_allocations` has never worked

This is the important one.

Migration `010` added the RPC that makes an expense-entry edit atomic — the fix for D-2. Its INSERT
reads `elem ->> 'property_area'`, which yields **`text`**. In production that column is the enum
`property_area_type`, and PostgreSQL does not implicitly cast text to an enum:

```
ERROR: 42804: column "property_area" is of type property_area_type but expression is of type text
CONTEXT: PL/pgSQL function replace_expense_allocations(uuid,jsonb) line 23 at SQL statement
```

`backend/src/routes/admin.ts` routes **every** allocation edit through this RPC, so
**`PATCH /api/admin/expense-entries/:id` has been failing with a 500 whenever the payload contains
allocations**, ever since that code shipped. The live function definition was read back from
production and confirmed to contain the uncast expression.

**It fails safely, and this was verified rather than assumed.** The exception aborts the function's
transaction, so the `DELETE` rolls back with it and the entry keeps the allocations it had. Measured:
after a rejected call the entry still held 3 rows totalling 175.00, unchanged. The feature is broken;
the ledger is not.

The verification for `010` missed it for the third instance of the same reason: it tested against a
database built from `FULL_DATABASE_SCHEMA.sql`, where the column is `VARCHAR(100)` and uncast text
inserts perfectly well.

**Fixed by `013_fix_replace_allocations_enum_cast.sql`**, which reads the column's real type from the
catalogue and casts to it — correct whether the column is the enum or a varchar, the same technique
that repaired `008`.

## Test results

Built from `FULL_DATABASE_SCHEMA.sql` + `001`–`004` + the seven-drift fixture, on
`postgres:16-alpine`.

| Test | Result |
| :--- | :--- |
| `001`–`013` applied in order, fresh database | **clean** |
| Whole sequence replayed a 2nd time | **clean** |
| Whole sequence replayed a 3rd time | **clean** |
| Extension functions altered by `011` | **0** |
| Tables without forced RLS after `011` | **none** (21 of 21) |
| `anon` can execute `current_user_role()` after `011` | **false** |
| Our functions with a mutable `search_path` after `011` | **none** |
| Property areas after `012` | **6, of which 4 rental** |
| Clusters routing nowhere after `012` | **0** |
| `PH` floor | **4** |

### Behaviour actually exercised

| Test | Expected | Result |
| :--- | :--- | :--- |
| Allocate an expense to `Penthouse` | allowed | **allowed** |
| Allocate to `Front Apt` | refused | **refused** — 22P02, invalid enum label |
| Trigger recomputes `total_expenses` from allocations | 1,234.50 | **1,234.50** |
| Rental / personal split via `is_rental_expense` | 1,000.00 / 234.50 | **1,000.00 / 234.50** |
| Duplicate `(entry, area)` pair | refused | **refused** — BR-044 unique key |
| `replace_expense_allocations` with a valid 3-area payload | 3 rows, total recomputed | **3 rows, 175.00; rental 150.00 / personal 25.00** |
| The same function with a bad label | refused, originals intact | **refused; 3 rows / 175.00 survived** |
| Delete a property area still in use | refused | **refused** — `clusters_expense_area_fkey` |
| `rooms.floor = 5` | refused | **refused** — the constraint still constrains |
| Write to a generated column | refused | **refused** — cannot insert a non-DEFAULT value into `fifty_percent_share` |

That last row is the direct confirmation that any Phase 3 insert must omit both generated columns.

## One known limitation

`FULL_DATABASE_SCHEMA.sql` is **not replayable over a database that has had `012` applied**: its
`clusters` seed does not supply `expense_area`, which `012` makes `NOT NULL`. This is accepted rather
than worked around — a bootstrap schema is not a migration, and replaying one over a live migrated
database is not an operation this project should support. Migrations `001`–`013` replay cleanly,
which is the invariant that matters.

## Reproducing

```bash
docker run -d --name hivelet-verify -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=hivelet postgres:16-alpine
docker exec hivelet-verify sh -c 'until pg_isready -q -U postgres; do sleep 1; done'
docker exec hivelet-verify psql -U postgres -d hivelet -c \
  "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;"
# then apply, in order:
#   FULL_DATABASE_SCHEMA.sql, 001-004, _TEST_FIXTURE_production_drift.sql, 005-013
```


---

# Fifth addendum — 014, and two more portability defects testing found

## Migration 014 — the production-only objects are now in version control

Drifts 5 and 7 were not just testing problems. Two objects that **enforce business rules** existed in
the production database and in no file anywhere:

- `update_expense_entry_total()` + `trg_update_expense_total` — this **is** BR-045.
- `UNIQUE (expense_entry_id, property_area)` — this **is** BR-044, and it is the only composite
  candidate key in the schema, which the whole 2NF proof is an argument about.

Reproducing them in the test fixture made migrations testable. It did **not** make a rebuilt database
correct. `014_codify_production_only_objects.sql` does that: it creates both, guarded and idempotent,
so it is a **no-op against production** and a repair against anything rebuilt from this repository.

It refuses to add the unique key if the live data would violate it, reporting the number of offending
pairs rather than failing on a constraint error.

Verified on both paths:

| Path | Result |
| :--- | :--- |
| Objects already present (the production case) | no-op; reports "already present"; self-test still passes |
| Repo-built database with neither object | both created; trigger and key present afterwards |
| Trigger recomputes `total_expenses` on INSERT | 200.00 as expected |
| Trigger recomputes on DELETE | 120.00 as expected |
| Duplicate `(entry, area)` pair | **refused** |
| Re-run | clean |

## Two portability defects in 012, found by building without the fixture

Running the sequence against a database built from the repository **alone** — no fixture, so
`property_area` is `VARCHAR(100)` and no enum exists — broke `012` twice:

| Defect | Error | Fix |
| :--- | :--- | :--- |
| `ALTER TYPE public.property_area_type ADD VALUE 'Penthouse'` ran unconditionally | `42704: type "public.property_area_type" does not exist` | Guarded on the type existing. Where the column is a varchar there is nothing to extend and the seed works unchanged. |
| `ADD COLUMN expense_area public.property_area_type` hardcoded the enum as the column type | `42704` again | The type is now read from `property_areas.code` and the column built to match — the same technique that repaired `008`. |

Both matter because `008` deliberately builds `property_areas.code` to match whatever the referencing
column turned out to be. A later migration that then hardcodes one of the two possibilities undoes
that care. `012` now adapts the same way `008` does.

`012` produces an identical end state on both database shapes: 6 property areas, 0 clusters routing
nowhere, and `Linda` → `Back Apartment`.

## Final state of the test suite

Built from `FULL_DATABASE_SCHEMA.sql` + `001`–`004` + the seven-drift fixture + `005`–`014`:

| Run | Result |
| :--- | :--- |
| Pass 1 (fresh) | **15 files clean** |
| Pass 2 (full replay) | **15 files clean** |
| Pass 3 (full replay) | **15 files clean** |
| Repo-only build with no fixture, `001`–`014` | **clean** |

**Summary of what testing these three migrations found:** three defects in the migrations themselves
(`011` aborting on an absent function, `011` altering 44 extension functions, `008` becoming
unreplayable), two portability defects in `012`, and **one live production defect** —
`replace_expense_allocations` failing on every call. None of these were visible by reading.

---

# Sixth addendum — 011 to 014 applied to production

**2026-09-13.** All four were applied through the Supabase MCP server and verified against the live
catalogue. `012` was split into two applications because PostgreSQL will not permit a value added by
`ALTER TYPE … ADD VALUE` to be *used* in the transaction that added it, and the MCP wraps each
migration in one.

| Migration | Applied as | Result |
| :--- | :--- | :--- |
| `013` | `fix_replace_allocations_enum_cast` | The RPC now reads the column's real type and casts to it |
| `011` | `security_posture_corrections` | 21 of 21 tables forced; `current_user_role()` revoked from `PUBLIC`; `search_path` pinned |
| `012` step 1 | `penthouse_area_add_enum_value` | `property_area_type` gains `Penthouse` |
| `012` step 2 | `penthouse_area_and_cluster_routing` | Area seeded; `clusters.expense_area` added, populated, `NOT NULL`; `property_areas.cluster_code` dropped |
| `014` | `codify_production_only_objects` | No-op, as designed — both objects were already present |

## Verified end state

| Check | Live value |
| :--- | :--- |
| Tables without forced RLS | **none** (21 of 21) |
| `anon` can execute `current_user_role()` | **false** |
| Our functions with a mutable `search_path` | **none** |
| Extension functions altered | **0** |
| Property areas | **6, of which 4 rental** |
| Clusters routing nowhere | **0** |
| `property_areas.cluster_code` | **dropped** |
| BR-044 composite unique key | present |
| BR-045 trigger | present |
| `monthly_expense_entries` / `expense_property_allocations` / `rooms` | **1,262 / 1,327 / 33** |

Cluster routing now reads: `BH` → Boarding House · `Back Apartment` → Back Apartment ·
`Linda` → **Back Apartment** · `Front Apartment` → Front Apartment · `Penthouse` → **Penthouse**.

**Row counts are identical to before the migrations.** None of the four touched a row of business
data.

## The production defect, fixed and proven against production

`013` was not taken on trust from the container run. A self-cleaning test was executed against the
live database:

1. Created an expense entry labelled `CLAUDE 013 SELF TEST - DELETE ME`.
2. Called `replace_expense_allocations()` with a valid two-area payload — **this is the exact call
   that previously raised `42804` every time**. It succeeded: 2 rows, ₱300.00.
3. Called it again with `'Front Apt'`, a non-canonical label. **Refused**, and the two original rows
   survived unchanged at ₱300.00 — the atomicity guarantee holding under a real rejection.
4. Deleted the test entry.

Afterwards: **0 rows matching the test label**, and `monthly_expense_entries` /
`expense_property_allocations` back at exactly **1,262 / 1,327**. Nothing was left behind.

`PATCH /api/admin/expense-entries/:id` works again.

## Application code brought into step, in the right order

`backend/src/config/propertyAreas.ts` and `frontend/src/lib/systemState.ts` now carry `Penthouse` as
a sixth area, and it is deliberately **not** in either `NON_RENTAL_AREAS` list — the penthouse is let
to tenants, so its upkeep is an operating cost.

This was done **after** `012`, not before. Adding the value to the TypeScript lists first would have
let the API accept an area the enum and the foreign key both reject. `tsc --noEmit` and
`vue-tsc --noEmit` both exit 0.

## What remains open

Only the two questions that need the client, both about the building rather than the database:

- **OD-14** — which single `rooms.floor` value is wrong. Stored: 12 / 11 / 9 / 1. Canon and the
  owner: 11 / 11 / 10 / 1. The second floor is already at 11, so the unit leaving the ground floor
  has to land on the **third**. The owner's ledger records no floor for any unit, so there is no
  document to settle it against.
- **OD-17** — whether `LF` is a Linda unit. The owner's own workbook lists `*LF` and `*LB` together
  under a `Linda` header against the footnote *"Rent remitted to Linda directly"*, and `LF` carries a
  ₱325 electric charge no other unit has.

No room row has been reclassified and no floor moved.

## Post-application housekeeping

`database/live_schema.csv` was refreshed against the catalogue after the four migrations, so the
stated source of truth is not itself stale. The deltas: `property_area_type` gains `Penthouse`;
`clusters.expense_area` appears as a column and a `RESTRICT` foreign key;
`property_areas.cluster_code` and its foreign key are gone; `property_areas` reads
`enabled, forced, 0 policies`; the area count is 6; and the four functions now carry their
`SECURITY DEFINER` and pinned-`search_path` state. Still 407 rows.

**Supabase security advisor, after `011`:** the three WARN findings are gone —
`function_search_path_mutable` (was 3), `anon_security_definer_function_executable`, and
`authenticated_security_definer_function_executable`. What remains is 21 × `rls_enabled_no_policy`
at INFO, which is the intended design and is argued in `PHASE2_SECURITY_AND_RLS.md` §2.1.
`property_areas` is now among those 21; before `011` it was excluded because RLS was off entirely.


---

# Seventh addendum — migration 015, closing OD-14

**2026-09-13.** The client gave a building-by-building breakdown that settled the floor question.

The two floor counts they stated match the seeded room codes exactly — Apartment Building (BH)
8 / 7 / 7 for `1a`-`1h`, `2a`-`2g`, `3a`-`3g`, and Back Apartment 1 / 2 / 2 for `B1F`, `B2F`+`B2B`,
`B3F`+`B3B`. With the Penthouse on level 4 those account for **9 / 9 / 9 / 1**.

The surveyed **11 / 11 / 10 / 1** therefore needs +2 / +2 / +1 from the five units whose floors the
client did not state: 3 Front Apartment + 2 Linda. The owner has twice placed both Linda units on the
ground floor, and `F2B` / `F2F` were already on the second. One placement remained:

> **`F1` is on the third floor, not the ground floor.**

Applied as `015_correct_front_apartment_floor.sql`. It updates one row and asserts the resulting
distribution, refusing to commit if it is not 11 / 11 / 10 / 1 across 33 units.

| Check | Result |
| :--- | :--- |
| Floors after `015`, live | **11 / 11 / 10 / 1** |
| Total units | **33** |
| Rows changed | **1** |
| `001`-`015` on a fresh seven-drift container | **16 files clean** |
| Replayed a 2nd time | **16 files clean** |
| Replayed a 3rd time | **16 files clean** |
| Floors reached independently in the container | **11 / 11 / 10 / 1** |

That last row matters: the container is seeded from `FULL_DATABASE_SCHEMA.sql`, so it starts at
12 / 11 / 9 / 1 like production did, and `015` brings it to the surveyed distribution without any
manual step.

**The single inference.** The code `F1` reads like "Front, floor 1", which is almost certainly how it
came to be seeded as floor 1; on the client's account the Front Apartment is a separate structure and
`F1` numbers its first unit rather than its level. This is the one thing in `015` worth checking on a
walk-through. `rooms.floor` is display-only — searched across `backend/src` and `frontend/src`, its
only consumers are floor labels in `RoomDetailModal.vue` and `AdminEditUnitModal.vue` — so an error
here is a label, not money.

## A defect this round surfaced: the Linda electricity charge is on the wrong unit

Checking that no Front Apartment income reaches Linda (it does not — 0 of 93 rows flagged, ₱0.00 of
Linda charges) turned up a mismatch between configuration and ledger:

| | `system_settings` / old UI | Live ledger, 31 months | Owner's spreadsheet |
| :--- | :--- | :--- | :--- |
| `LF` | electricity "submetered actual" | **charged 31 of 31** — min ₱325, max ₱2,285.76, avg ₱388.25 | `Electric` column = 325 on the `*LF` row |
| `LB` | **fixed ₱325 / month** | **charged 0 of 31** | nothing on the `*LB` row |

The ledger and the owner's own book agree with each other and disagree with
`system_settings.linda_lb_electricity_charge = 325`. The income screen was corrected to match the
evidence. **The setting was deliberately not changed** — it is a money parameter, no backend code
reads it (defect 1), and altering one on inference rather than instruction is the wrong call.
Recorded as **OD-18** for the client to confirm: which Linda unit actually pays the fixed ₱325?
