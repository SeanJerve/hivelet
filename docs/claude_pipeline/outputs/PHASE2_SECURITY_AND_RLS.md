# PHASE 2 — DATABASE SECURITY POSTURE AND RLS POLICY ENFORCEMENT

**Hivelet — Fe Galang Da Silva Boarding House**
Bicol University College of Science | Capstone Project 2 | Group 4
Database Administrator: John Lloyd Cuario

---

## 1. The posture in one sentence

**The database trusts exactly one caller — the Express backend, connecting as `service_role` — and
refuses everything else at the table level, with authorisation decided above it by a 39-permission
application RBAC model.**

Everything below either evidences that sentence or names where it is not yet true.

---

## 2. How the lockdown actually works

This is the part most often described incorrectly in student projects, so it is set out mechanically.

Supabase exposes PostgreSQL to the internet through PostgREST under three roles:

| Role | `rolbypassrls` | Who uses it |
| :--- | :---: | :--- |
| `anon` | `false` | Anyone holding the publishable key — i.e. anyone who views the website |
| `authenticated` | `false` | Any signed-in Supabase Auth user |
| `service_role` | **`true`** | The Express backend only. The key is server-side and never reaches a browser |

Two independent mechanisms then combine:

**(a) No table grants.** `anon` and `authenticated` hold **no privileges on any of the 21 tables**.
Verified:

```sql
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
-- zero rows
```

**(b) Forced RLS with zero policies.** Twenty tables are `ENABLE ROW LEVEL SECURITY` **and**
`FORCE ROW LEVEL SECURITY`, with **no policies defined at all**.

Under PostgreSQL, RLS is **deny-by-default**: with RLS enabled and no policy granting access, the
visible row set is empty for every role that does not bypass RLS. `FORCE` extends that to the table
owner as well, so not even the owning role can read around it. `service_role` is unaffected because
`rolbypassrls = true` — a role attribute, checked before policies are consulted.

**The two mechanisms are deliberately redundant.** Either alone would lock the tables; together, a
future `GRANT` issued by accident — which is easy to do in the Supabase dashboard — still hits the
RLS wall and leaks nothing.

### 2.1 "RLS enabled, no policy" is the design, not an oversight

The Supabase security advisor reports **20 × `rls_enabled_no_policy` (INFO)**. Every one of those is
expected and should be presented to the panel as such.

That lint exists to catch a specific mistake: a developer enables RLS believing it secures the table,
writes no policy, and then discovers their own app reads nothing. It assumes you *intend* browsers to
query the database directly. **This system does not.** Tier 1 (Vue 3) never holds a database
credential; it calls the Express API, which holds the only key that can read anything.

Writing policies here would be actively worse. A policy is a grant, and the only correct policy for
this architecture is "no one", which is what zero policies already means. Policies would also
duplicate the 39-permission model in a second language, in a second place, with no mechanism keeping
the two in step.

---

## 3. Where authorisation is actually decided

RLS is the floor, not the mechanism. Real authorisation is `backend/src/config/rbac.ts`:

- **39 named permissions** in a `resource:action:scope` namespace — `payment:verify`,
  `bill:read:own`, `room:manage`, `inquiry:convert`, and so on.
- **Three roles** — `prospect`, `tenant`, `admin` — each mapped to a frozen permission set
  (`ROLE_PERMISSIONS`, with `Set` lookups for the hot path).
- Routes declare what they need: `requirePermission(PERMISSIONS.PAYMENT_VERIFY)`.

The `:own` scopes are what make tenant isolation work (BR-024). A tenant carrying `bill:read:own`
reaches a handler that filters by their own `tenant_profile_id`; there is no code path by which a
tenant-scoped request reaches another tenant's rows.

**The honest architectural statement:** because the backend connects as `service_role`, *any* SQL it
issues can read *any* row. The database will not save the application from an authorisation bug. That
is the accepted trade of a modular monolith with a single trusted data-access tier, and it is why the
permission checks are declarative at the route boundary rather than scattered through handlers.

---

## 4. Findings from this phase

Three, all found by reading the live catalogue rather than the schema file. All three are fixed by
`database/migrations/011_security_posture_corrections.sql` — **written and tested, not yet applied.**

> **A fourth finding, from testing rather than reading, is not a security defect but belongs in the
> same list because it is live.** `replace_expense_allocations()` inserts uncast `text` into the
> `property_area_type` enum column, so **`PATCH /api/admin/expense-entries/:id` returns 500 on every
> allocation edit** (`42804`). It fails safely — the transaction rolls back and the entry keeps its
> allocations, verified — but the feature does not work. Fixed by migration `013`. Full account in
> the fourth addendum of `database/migrations/VERIFICATION.md`.

### 4.1 `property_areas` is outside the lockdown — the only table that is

| Table | RLS enabled | RLS forced |
| :--- | :---: | :---: |
| The other 20 | ✔ | ✔ |
| **`property_areas`** | **✘** | **✘** |

Migration `008` created the table and never enabled RLS on it. The newest table in the schema is the
only one outside the posture the design claims.

**Actual exposure today: none.** `anon` and `authenticated` hold no grant on it either, so
mechanism (a) still refuses them and the advisor does not flag it as publicly readable. The defect is
that **the second layer is missing on exactly one table** — the redundancy described in §2 is the
whole point, and a single future `GRANT SELECT` would turn a non-issue into a disclosure of the
rental-versus-personal classification of the owner's expenses.

Fix: `ENABLE` + `FORCE ROW LEVEL SECURITY`, and revoke grants explicitly. Safe for the backend —
`service_role` bypasses RLS, and foreign-key checks from `expense_property_allocations` run as
internal referential-integrity triggers that bypass RLS too.

### 4.2 A revoke in migration `002` never took effect

`database/migrations/002_rbac_rls_lockdown.sql:147` intends to lock down a `SECURITY DEFINER` helper:

```sql
REVOKE ALL ON FUNCTION public.current_user_role() FROM anon, authenticated;
```

**That statement removes nothing.** PostgreSQL grants `EXECUTE` on every new function to **`PUBLIC`**
by default. `anon` and `authenticated` can execute it because they are members of `PUBLIC`, not
because of any direct grant — and revoking a privilege a role never held directly is a no-op.

The live ACL proves it:

```
current_user_role:  =X/postgres | postgres=X/postgres | service_role=X/postgres
                    ^
                    the empty grantee IS the PUBLIC grant
```

The Supabase advisor independently reports it as
`anon_security_definer_function_executable` (WARN): the function is callable by `anon` over
`/rest/v1/rpc/current_user_role`.

**Severity, stated fairly: low.** The function reads the caller's role from the Supabase Auth JWT;
called by `anon` there is no JWT, so it returns nothing useful. It discloses no data. But it is a
`SECURITY DEFINER` function reachable by unauthenticated callers, and that is a category of thing
that should never be true by accident.

Fix: `REVOKE ALL ON FUNCTION … FROM PUBLIC`, then grant `EXECUTE` to `service_role` explicitly. The
same treatment is applied to `normalize_ph_phone(text)`, which has no business being a public RPC
either.

**The transferable lesson:** to lock down a function you must revoke from `PUBLIC`. Naming the roles
looks right, reads right in review, and does nothing.

### 4.3 Three functions have a mutable `search_path`

`current_user_role()`, `normalize_ph_phone(text)` and `update_expense_entry_total()` have no
`search_path` pinned (advisor: `function_search_path_mutable`, WARN ×3).

For a `SECURITY DEFINER` function this is a privilege-escalation vector: a caller who controls
`search_path` can place their own object ahead of an unqualified name inside the function body and
have it execute with the definer's privileges. `current_user_role()` is `SECURITY DEFINER`, so this
compounds §4.2.

`replace_expense_allocations(uuid, jsonb)` already pins `search_path = public` — migration `010` got
this right, and is the model the other three are brought up to.

**One caution carried forward.** `normalize_ph_phone()` backs the unique index
`idx_profiles_phone_login`. `ALTER FUNCTION … SET search_path` changes configuration, not the body,
and the body calls only `pg_catalog` built-ins, so returned values do not change. Migration `011`
nonetheless reindexes afterwards — 45 rows, effectively free, and an index over a function whose
definition has been altered is worth rebuilding rather than trusting.

---

## 5. Function exposure — the full picture

| Function | `SECURITY DEFINER` | `search_path` pinned | Executable by `anon` | After `011` |
| :--- | :---: | :---: | :---: | :--- |
| `current_user_role()` | **yes** | ✘ | **yes** | pinned, revoked from `PUBLIC` |
| `normalize_ph_phone(text)` | no | ✘ | yes | pinned, revoked from `PUBLIC` |
| `update_expense_entry_total()` | no | ✘ | yes (trigger function; harmless) | pinned |
| `replace_expense_allocations(uuid, jsonb)` | no | **✔** | **no** — `postgres` / `service_role` only | unchanged |

`replace_expense_allocations` is worth pointing at during the defense as the standard the others are
being raised to: `SECURITY INVOKER`, `search_path` pinned, `EXECUTE` held only by the two roles that
need it.

---

## 6. Credential and identity handling

| Control | Implementation |
| :--- | :--- |
| Password storage | bcrypt hashes in `profiles.password_hash`. No plaintext column exists. |
| Optional credentials | `password_hash` is nullable. A tenant may exist as a billing record with no portal login (OD-09) — administrator-managed, and unable to authenticate at all. |
| Credential integrity | `CHECK (profiles_login_identifier_required)`: a row with a `password_hash` must have an email **or** a phone number. A credential with no identifier cannot exist. |
| Email uniqueness | `idx_profiles_email_lower` — unique on `lower(email)`, partial on `email IS NOT NULL`. Case-insensitive, and multiple credential-less tenants may share NULL. |
| Phone uniqueness | `idx_profiles_phone_login` — unique on `normalize_ph_phone(phone_number)`, partial on credentialed rows. Folds `+63` onto `0`, so one human number cannot hold two logins. Two spouses sharing a handset may both exist as tenants provided neither has a login. |
| Brute-force resistance | `failed_login_count` and `locked_until` on `profiles`. |
| Auth linkage | `profiles.auth_user_id` → `auth.users`, `UNIQUE` and nullable, `ON DELETE CASCADE`. |

The phone-normalisation rule was not a design flourish — it was **found by a failing test** during
migration verification, where `0917 555 1234` and `+63 917 555 1234` were accepted as two separate
logins for one person.

---

## 7. Gaps that remain open, stated honestly

Not fixed by `011`, and not to be described as fixed.

| # | Gap | Evidence | Phase |
| :-- | :--- | :--- | :-- |
| 1 | **Two payment endpoints carry no authentication middleware.** Both go straight to `asyncHandler` with no `optionalAuth`, no `requireAuth`, no `requirePermission`. Every other route in the file declares a permission. | `backend/src/routes/public.ts:202`, `:853` | 3 |
| 2 | **`system_settings` is read by zero lines of backend code.** Six correctly seeded keys — including `water_rate_per_occupant = 200` and `grace_period_days = 7` — are dead configuration while the values they should supply are hardcoded. A setting that cannot be changed is a security and governance claim the system does not honour. | `admin.ts:910, 1103, 1243`; `tenant.ts:440, 453` | 3 |
| 3 | **Supabase Storage is not referenced by any backend code.** `room_photos.file_url` and `ticket_attachments.file_url` hold URLs, but no upload path, bucket policy or signed-URL logic exists. There is no storage access-control posture to document because there is no integration. | — | 3 |
| 4 | **No transaction boundary in application code.** `replace_expense_allocations` (migration `010`) is the only atomic multi-row write in the system, and it is a database function precisely because supabase-js cannot open a transaction. Every other multi-step write can half-complete. | — | 3 |

Gap 2 deserves emphasis at the defense: it is the reason **BR-012's grace period and BR-014's water
rate are not actually configurable**, and it is entangled with the open question OD-16.

---

## 8. Verification commands

Re-runnable against the live database, read-only.

```sql
-- Every table's RLS state and policy count
SELECT c.relname, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY c.relrowsecurity, c.relname;

-- Any grant at all to the internet-facing roles
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated');

-- Function exposure
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public';
```

Expected after `011`: the first query returns 21 rows all `enabled = true, forced = true,
policies = 0`; the second returns zero rows; the third shows `anon_can_execute = false` for every
function and a pinned `search_path` on all four.

---

## 9. Summary for the defense

1. **Deny-by-default at the table level, on purpose.** Twenty-one tables with forced RLS and zero
   policies is not an unfinished policy set — it is the correct expression of "no browser talks to
   this database".
2. **The 20 advisor INFO notices are expected.** They assume direct client access, which this
   architecture does not use. Say so before being asked.
3. **Two mechanisms, deliberately redundant** — no grants *and* forced RLS — so that a single
   mistaken `GRANT` is not a breach.
4. **Authorisation lives in 39 declarative permissions across three roles**, checked at the route
   boundary, because the single trusted data tier means the database cannot make that decision.
5. **Three real security findings were produced by this phase**, one of which — a `REVOKE` that has
   never done anything since migration `002` — had been in the repository unnoticed and passing
   review the whole time. Naming the roles instead of `PUBLIC` looks right, reads right in review,
   and does nothing.
6. **Testing found what reading could not.** Applying `011`–`014` to a database built to resemble
   production surfaced six further defects, including one live one: the RPC that makes expense edits
   atomic has never worked against the real column type. The lesson the project had already written
   down twice — test against production's shape, not the repository's — only paid out when it was
   actually followed.

---

*Phase 2 deliverable. Companion documents: `PHASE2_ERD_AND_DATA_DICTIONARY.md`,
`PHASE2_NORMALIZATION_PROOF.md`. Binding canon: `PHASE1_LOCKED_DECISIONS.md`,
`PHASE2_LOCKED_DECISIONS.md`.*
