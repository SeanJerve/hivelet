# Hivelet Database — RBAC Migrations

Apply these in order. They are idempotent, so re-running them is safe.

## How to apply

These are DDL statements. Supabase's REST API (PostgREST) cannot execute DDL
even with the `service_role` key, so they must be run through the SQL editor:

1. Open the Supabase dashboard → your project → **SQL Editor** → **New query**
2. Paste the contents of one migration file, then **Run**
3. Repeat in order: `001` → `002` → `003` → `004` → `005` → `006` → `007` → `008` → `009`

## Migrations

| File | Purpose | Reference |
| --- | --- | --- |
| `001_rbac_auth_columns.sql` | Adds `password_hash`, lockout and login-tracking columns to `profiles`; adds the indexes tenant-scoping queries depend on. | FR-001, 05_DATABASE_DESIGN.md Rule 8 |
| `002_rbac_rls_lockdown.sql` | Enables and forces RLS on all 18 tables, drops permissive policies, revokes every privilege from `anon` and `authenticated`, and makes `audit_logs` append-only. | System Bible §14, §20; BR-024, BR-028, BR-048 |
| `003_seed_rbac_credentials.sql` | Attaches bcrypt hashes to the seeded profiles so all three roles can be demonstrated. | FR-002, BR-025 |
| `004_form_schema_gaps.sql` | Adds the storage the existing admin forms write to but the schema lacked (`room_photos`, ticket attachments, rate columns). | 11_FORM_FIELD_AUDIT.md §4 |
| `005_ledger_fk_restrict.sql` | Moves the six ledger foreign keys on `bills`, `payments` and `monthly_income_records` from `ON DELETE CASCADE` to `RESTRICT`, so financial history cannot be erased by a cascade that never reaches `auditService`. Touches zero rows. | Phase 2; defect 6 |
| `006_profiles_optional_login.sql` | Makes `profiles.email` nullable, drops the now-redundant raw-email unique constraint, makes the case-insensitive index partial, and adds `phone_number` as an alternate login identifier. A tenant may now exist as a billable record with no credentials at all. | OD-09; §7b |
| `007_rooms_floor_correction.sql` | Corrects `PH` from `floor = 3` to the rooftop level 4. Does **not** guess at the one remaining floor-1 unit the owner's survey places on floor 3. | OD-13; defect 10 |
| `008_property_areas_lookup.sql` | Replaces the free-text `property_area` with a five-row lookup and a foreign key, and marks Main House and Other/Personal as **non-rental** so they can be excluded from net rental income. | OD-05 |
| `009_advance_rent_and_whole_month_billing.sql` | Comments only. Corrects the meaning of `deposit_amount` to advance rent (there is no security deposit) and records that rent is never prorated. | OD-04, OD-03 |

## Why the lockdown matters

Before `002`, every table in `public` was readable **and writable** by the
Supabase `anon` key — which is published to the browser by design and was also
committed to `.env.example`. That exposed tenant emails, phone numbers and
emergency contacts, the full billing and payment history, and both financial
ledgers that BR-048 restricts to the administrator. `audit_logs` was writable,
so audit history could be forged, defeating System Bible §14.

After `002`, the database trusts exactly one client: the Express API, which
connects with `service_role` and enforces roles in middleware before any query
runs. Browsers never speak to PostgREST.

## Verifying

With the API running (`npm run dev:backend`):

```bash
node database/verify-rbac.mjs
```

It asserts that the anon key is denied on every table, that guests are refused
private endpoints, that a tenant reaches only their own rows and is refused
admin endpoints, that a deactivated tenant cannot sign in (BR-025), and that
forged tokens are rejected.

`GET /api/health` also reports `security.rlsLockdownActive`, which stays `false`
until `002` has been applied.

## Seeded credentials (development only)

| Role | Email | Password |
| --- | --- | --- |
| admin | `admin@hivelet.ph` | `Hivelet@Admin2026` |
| tenant | `mark.cruz@gmail.com` | `Hivelet@Tenant2026` |
| tenant | `sean.jerve@gmail.com` | `Hivelet@Tenant2026` |
| tenant | `john.lloyd@gmail.com` | `Hivelet@Tenant2026` |
| tenant | `jaye.casia@gmail.com` | `Hivelet@Tenant2026` |
| tenant (inactive) | `miguel.ramos@gmail.com` | `Hivelet@Tenant2026` — sign-in is refused by design (BR-025) |
| prospect | `rhea.mendoza@gmail.com` | no password; a prospect holds no account access (System Bible §4) |

Rotate all of these before deploying to the university server. They are
published in this repository.

## Note on `server/` and `database/*.js`

The `server/` directory is an abandoned MySQL/EJS prototype (it contains only a
`package.json`). The live stack is `website/` + `backend/` + Supabase
PostgreSQL, per `04_ARCHITECTURE.md`.

## Phase 2 migrations (005-007) — what to know before applying

These three come from the Phase 1 handoff (`docs/claude_pipeline/CONTINUE_HERE.md`) and the locked
decisions (`docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md`). All three are wrapped in a single
`BEGIN`/`COMMIT` and end with an assertion block, so a partial application rolls back rather than
leaving the database in a half-migrated state.

**`006` can legitimately refuse to apply.** If two accounts that both hold credentials share a phone
number, it raises and rolls back rather than silently dropping one. Resolve the duplicates and re-run.

**`007` is deliberately incomplete, and says so.** The owner's survey is 11 / 11 / 10 / 1. After `007`
the seeded per-unit values read 12 / 11 / 9 / 1 — one unit sits on floor 1 in the data that the survey
places on floor 3. The candidates are `LF` and `LB`, the only two units whose codes encode position
rather than level. That row is not corrected until someone confirms it physically. The *published*
tally stays 11 / 11 / 10 / 1 on the owner's survey either way.

**`007` has a frontend consequence that is not fixed here.**
`frontend/src/lib/canonicalUnits.ts:8` declares `floor: 1 | 2 | 3`, a type that cannot represent
level 4, and `:84` still carries `PH` as `floor: 3, floorLabel: "Floor 3"`. The frontend is outside
the scope of this work — flagged for Eljohn (Frontend / UI-UX), not changed.

### `008` and `009` — the two decisions behind them

**`008` encodes a money rule, not a tidy-up.** "Main House" is Mrs. Fe's own residence, confirmed
2026-09-13. Those rows are personal household costs sharing a book with the business. Shared utility
bills are split across both areas — `docs/10_MONTHLY_EXPENSES_REPORT.md` §5 shows one electric bill
at ₱14,964.13 Boarding House / ₱5,688.67 Main House — so treating Main House as a business expense
understates net rental income every time. `property_areas.is_rental_expense` is what lets the report
subtract only the boarding-house half. Any net-income query must filter on it.

`008` refuses to apply if a stored `property_area` is not one of the five canonical strings, naming
the offenders. Reconcile them and re-run.

**`009` changes nothing.** It is `COMMENT` statements only. It exists because `deposit_amount` does
not hold a deposit — it holds advance rent, and it is never refunded. Without the comment the next
person to read the schema builds a refund workflow for money that is never given back. The column is
not renamed because the frontend reads it and the frontend is out of scope here.

Known defect recorded by `009` and deliberately left for Phase 3:
`backend/src/routes/admin.ts:571` defaults a missing deposit to `current_price * 2`, the familiar
"one month advance plus one month deposit" arrangement. With no security deposit in this business
that default is wrong. Correcting it moves money, so it belongs with the `billingService` extraction.
