# Hivelet Database — RBAC Migrations

Apply these in order. They are idempotent, so re-running them is safe.

## How to apply

These are DDL statements. Supabase's REST API (PostgREST) cannot execute DDL
even with the `service_role` key, so they must be run through the SQL editor:

1. Open the Supabase dashboard → your project → **SQL Editor** → **New query**
2. Paste the contents of one migration file, then **Run**
3. Repeat in order: `001` → `002` → `003`

## Migrations

| File | Purpose | Reference |
| --- | --- | --- |
| `001_rbac_auth_columns.sql` | Adds `password_hash`, lockout and login-tracking columns to `profiles`; adds the indexes tenant-scoping queries depend on. | FR-001, 05_DATABASE_DESIGN.md Rule 8 |
| `002_rbac_rls_lockdown.sql` | Enables and forces RLS on all 18 tables, drops permissive policies, revokes every privilege from `anon` and `authenticated`, and makes `audit_logs` append-only. | System Bible §14, §20; BR-024, BR-028, BR-048 |
| `003_seed_rbac_credentials.sql` | Attaches bcrypt hashes to the seeded profiles so all three roles can be demonstrated. | FR-002, BR-025 |

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
