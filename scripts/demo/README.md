# The demo copy: hivelet-demo.vercel.app

A second, separate Hivelet that outside evaluators can sign in to, with its own database full of
invented people and money. Built on 15 October 2026 so that an evaluator from Panelista could use
the owner side without anyone handing out the live administrator account.

| | Live | Demo |
| :--- | :--- | :--- |
| Site | hivelet.vercel.app | **hivelet-demo.vercel.app** |
| Vercel project | `hivelet` | `hivelet-demo` |
| Supabase | org `hivelet`, project `xeynbzcoywogcaesyhkw` | org `hivelet-demo`, project `xthblwzyvporxicgrcgz` |
| Data | the owner's real records | invented; nothing copied but the units, rates, areas and settings |
| GCash | Adyen, test account, webhook to the live site | Adyen not configured: a tenant's payment lands as **Pending Verification** for the owner side to verify |

Nothing in the demo reads from or writes to the live database, and the live webhook is untouched.

## What is in it

`demo-seed.sql`, run once on 15 October 2026: the 33 units (31 occupied, 2g and F2F vacant), 31
current tenants and 2 former ones, every rent period from January 2025 to 15 October 2026 (663
receipts, one voided), 280 expenses split across the areas (one voided), October bills (four
overdue, one with a GCash payment waiting for verification, two paid), seven maintenance tickets
in every status, four enquiries on the vacant units, and notifications for all of it.

Sign-ins are in `credentials/demo-evaluator-accounts.txt` (gitignored; made by
`make-demo-passwords.mjs`): the team's owner account, three evaluator owner accounts and three
tenants (1a paid up, 2b overdue, B2B with open tickets). One account per evaluator, because five
wrong passwords lock an account for fifteen minutes.

## How it was built, and how to rebuild it

1. `demo-schema.sql`: the live schema, read from the catalogue on 15 Oct 2026 (not from
   `database/FULL_DATABASE_SCHEMA.sql`), minus the three one-off backup tables, with the same
   lockdown as live (the publishable key reaches no table). It drifts from live as migrations
   land; regenerate it the same way if the demo must match.
2. `make-demo-passwords.mjs`, then `demo-seed.sql` with the printed hashes put in place of the
   `{{...}}` markers, run in the demo project's SQL editor.
3. The site is deployed from `~/hivelet-demo-deploy` (`C:\Users\seanjerve\hivelet-demo-deploy`):
   a `git archive` of the code, linked to the `hivelet-demo` Vercel project so a deploy from
   there can never reach the live one. `vercel deploy --prod --yes` from inside it. It is outside
   the repository because a copy of the code inside it makes `check:canon` fail on the copy.
   Vercel settings it needs beyond the secrets: `VITE_API_BASE_URL=/api`, `CORS_ORIGINS` and
   `CLIENT_URL` set to the demo address, `NODE_ENV=production`, `ALLOW_PUBLIC_SIGNUP=false`.
4. `set-demo-secrets.mjs` asks for the demo Supabase project's secret key, generates a JWT secret,
   sets both on `hivelet-demo` and redeploys. It refuses to run unless that folder is linked to
   `hivelet-demo`.

To start the data over, run `demo-seed.sql` into empty tables again. **Only ever in the
hivelet-demo project**; rule 1 in CLAUDE.md still governs the live database without exception.
