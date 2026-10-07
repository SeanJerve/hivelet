# 2. Technical Requirements Document (TRD)

What Hivelet is built on, how the parts talk, and the rules for changing it, so nobody guesses.
Versions are the ranges in each `package.json` as of 7 October 2026; where the installed version
matters it is named. Authority for architecture detail: `docs/04_ARCHITECTURE.md`.

---

## 1. Stack

| Layer | Technology | Version | Why |
| :--- | :--- | :--- | :--- |
| Language | TypeScript | ~5.7 (frontend), ^5.4 (backend) | One language end to end; types catch shape errors before the owner does |
| Frontend framework | Vue 3 (Composition API, `<script setup>`) | ^3.5.13, installed 3.5.43 | Small, readable single-file components |
| Routing | Vue Router | ^4.5 | Role guards on every signed-in route |
| State | Pinia, plus small shared stores in `frontend/src/lib/` | ^2.3 | |
| Styling | Tailwind CSS 4 with design tokens in `frontend/src/index.css` | ^4.0.6 | Tokens, never hex values in components (`check:tokens`) |
| Icons | lucide-vue-next | ^0.475 | |
| Build | Vite | ^5.4 | Fast builds; `vite-plugin-pwa` ^1.3 for the service worker and manifest |
| Typecheck | vue-tsc | ^2.2 | Note: exits 0 on a component that does not exist; `check:components` covers that |
| Backend | Node.js with Express | Node 22 (22.16 on the team machine), Express ^4.19 | One API in front of the database |
| Validation | zod | ^3.23 | Every request that changes data is checked against a schema |
| Auth | jsonwebtoken (HS256, pinned), bcryptjs | ^9.0, ^2.4 | Signed tokens; bcrypt password hashes |
| HTTP hardening | helmet, cors, morgan | ^7.1, ^2.8, ^1.10 | Headers, origin allow-list, request log |
| Reports | exceljs | ^4.4 | The owner's two workbooks as real `.xlsx` |
| Database | PostgreSQL on Supabase | 17.6 | Row-level security on every table; the API is the only client |
| Database client | @supabase/supabase-js | ^2.110 | Used by the server only, with the service key |
| Payments | Adyen: Web Drop-in (browser), API Library (server), GCash | ^6.44, ^32.0 | Adyen with GCash, on Adyen's test account until it is moved to live |
| Hosting | Vercel | Hobby plan | The built frontend as static files, the API as one serverless function under `/api` |
| Manuscript tooling | docx | ^9.7 (root) | Builds Chapter 4's Word file from Markdown |

## 2. How the parts fit

```
Browser (Vue PWA, service worker)
   │  HTTPS, Bearer token
   ▼
Vercel: static frontend  +  /api  → Express (one serverless function)
   │  service key, server only                    │  HMAC-signed webhook from Adyen
   ▼                                              ▲
Supabase PostgreSQL 17.6 (RLS on, no policies)    Adyen (GCash)
```

- **Only the API touches the database.** Row-level security is on for every table and no policy grants
  the public keys anything, so a request that skips the API's sign-in and role checks reads nothing.
- **Payment details never pass through Hivelet.** The tenant types them into Adyen's own form; the API
  creates the session and records the payment when Adyen's signed notification arrives.
- **The webhook serves production.** It points at `https://hivelet.vercel.app/api/public/payments/adyen/webhook`.
  Never repoint it to a laptop; add a second webhook with its own HMAC key to test locally.

## 3. Configuration

Settings are environment variables on Vercel and in a local `.env` (gitignored, passed between team
members separately, never written in a document). Names only:

- **Server:** `NODE_ENV`, `PORT`, `CLIENT_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `JWT_EXPIRES_IN` (default 7d),
  `ALLOW_PUBLIC_SIGNUP` (off: public sign-up is refused).
- **Database:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`), `SUPABASE_ANON_KEY` /
  `SUPABASE_PUBLISHABLE_KEY`.
- **Payments:** `ADYEN_API_KEY`, `ADYEN_CLIENT_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_ENVIRONMENT`,
  `ADYEN_HMAC_KEY`, `ADYEN_WEBHOOK_USER`, `ADYEN_WEBHOOK_PASSWORD`. Never generate a new HMAC key without
  updating Vercel's `ADYEN_HMAC_KEY` and redeploying in the same sitting.

## 4. Non-functional requirements and where they stand

| Requirement | Target | Measured (Chapter 4) |
| :--- | :--- | :--- |
| Performance | A screen usable within about 3 s on a phone | Slowest 3.05 s (tenant portal, first load, phone) |
| Capacity | Several times the property's own load without failure | 0 of 1,085 requests failed with 12 simultaneous users |
| Security | No high-severity weakness; passive scanners graded | Code review: 0 high; SSL Labs, Observatory, securityheaders.com all A+ |
| Accessibility | WCAG 2.2 A and AA | 0 violations in 76 axe scans (19 screens, light and dark, phone and computer) |
| Compatibility | Current Chrome, Edge, Firefox, Safari on Android, iPhone, Windows | 5 of 5 combinations tried passed |
| Reliability | A missing figure never shown as ₱0; a stalled save says it may not have arrived | Met, except one open defect (walkthrough step 23b) |
| Maintainability | Business logic in service modules | 50 of 204 database calls in services; the rest in route handlers (Chapter 5, rec. 6) |
| Dependencies | No known vulnerability in production dependencies | 0 (`npm audit --omit=dev`, 7 Oct) |

## 5. Rules for changing it (from `CLAUDE.md`)

1. **The database is live** and holds the owner's real records. Never drop, wipe or reset. Every change
   to the schema or to live data is a new numbered migration in `database/migrations/` (next: 081
   after 080), run after `npm run backup`.
2. **Never trust `database/FULL_DATABASE_SCHEMA.sql`.** Ask the catalogue (`information_schema`,
   `pg_index`, `pg_constraint`, `pg_trigger`).
3. **Verify before reporting**: `npm run check:all` runs twenty suites; read the summary table. 13 run on
   a bare clone, 17 with `.env`, 20 with the backend up and `credentials/creds.txt`. Mutation-test any
   new check.
4. **Locked wording**: the 50% Share described only as half that row's Rent Amount for ledger parity;
   Adyen with GCash is configured and working; 33 units, 32 occupied. `npm run check:canon` fails the
   build otherwise.
5. Commit small, with messages that say why. Two machines share the repository: pull before starting
   and before every push.

## 6. Tools around the code

| Tool | Use |
| :--- | :--- |
| `npm run check:all` | The twenty verification suites |
| `node backend/scripts/check-auth-hardening.mjs` | The sign-in protections (admin gate, sign-up closed, limits, password rules, breach check) |
| `npm run contract` (frontend) | Regenerates `docs/SCREEN_CONTRACT.md`: every screen, every call, which ones write |
| `scripts/survey/*.mjs` | Survey, walkthrough, timing and acceptance-test tables for Chapter 4 |
| `scripts/build-chapter-4-docx.mjs` | Chapter 4's Word file from its Markdown |
| `npm run backup` | A copy of the live data before any data change |
