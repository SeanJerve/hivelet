# Migration Verification Record — `005`–`009`

**Run 2026-09-13 against PostgreSQL 16 (`postgres:16-alpine`) in a throwaway container.**
Not run against Supabase. These migrations remain **unapplied to the live database**.

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
