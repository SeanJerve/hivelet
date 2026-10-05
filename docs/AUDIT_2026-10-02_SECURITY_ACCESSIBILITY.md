# Security and accessibility audit — 2 October 2026

The first audit of either kind on this system, done the day before the panel evaluates
`https://hivelet.vercel.app`. Code review plus measurement on a local production build. **Nothing
here touched the live database, the live site or the Adyen settings**: the live site is not
reachable from the machine that ran this (its network policy blocks `hivelet.vercel.app`), the
Supabase connection was down, and every API call in the browser tests was answered by a stub
with made-up records.

**Result in one line:** no high-severity finding. Four low-severity hardening fixes are on `main`
(`887457a`); one database item (row-level security on three old backup tables) is written up for
Sean with exact SQL as **B-96**; B-94 (the Vercel challenge) is still the one that matters most on
Saturday. Accessibility: **0 axe-core violations** on 19 screens × light/dark × 375/1366 px, and
every dialog passes the keyboard checks.

---

## 1. Security

### 1.1 Findings

| ID | Severity | Finding | Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| S-1 | **High (operational)** | Vercel's Security Checkpoint challenges every request, `/api` included. The Adyen webhook is a server-to-server POST and cannot pass a browser challenge, so GCash payments may be paid at Adyen and never recorded | B-94; this machine also gets 403 from the site | **Open — needs the Vercel owner** (B-94) |
| S-2 | Medium (defence in depth) | Three backup tables made by migrations 030–032 (`rent_period_drift_backup_030`, `copied_period_backup_031`, `date_paid_import_backup_032`) were created without `ENABLE ROW LEVEL SECURITY`; every other table has it (002, 004, 011). Supabase's advisor flags such tables. Not exploitable from the website: the browser never holds a Supabase key (the backend does), and 002's default privileges probably revoked `anon`/`authenticated` grants — **not verified on the live catalogue** | `grep -i "row level" database/migrations/03[0-2]_*.sql` finds nothing | **Open — B-96**, exact SQL and the check query written there |
| S-3 | Low | `safeReturnUrl` refused `//evil.example` but passed `/\evil.example` and `/<tab>/evil.example`, which browsers read as the same protocol-relative URL. The value is a checkout return URL a tenant supplies | Scratch test against the real module: the three cases returned the attacker URL on the old file | **Fixed** (`887457a`): any backslash or control character falls back. Same test passes; mutation (old file) fails 3 |
| S-4 | Low (hardening) | `jwt.verify` did not name its algorithm. jsonwebtoken 9 already refuses `none` for a string secret, so this was not exploitable | — | **Fixed** (`887457a`): sign and verify both HS256 by name. Test: an HS256 token verifies; HS512 and `alg: none` tokens are refused `TOKEN_INVALID` |
| S-5 | Low | A tenant's repair photo could be `data:image/svg+xml`. The administrator opens it as a link. Modern browsers block top-level navigation to `data:` URLs, so this is defence in depth | `routes/tenant.ts` ticket schema | **Fixed** (`887457a`): raster data URLs or `https://` only. The site's own upload (`shrinkPhoto`) sends JPEG |
| S-6 | Low | The page CSP had no `object-src` or `base-uri` | `vercel.json` | **Fixed** (`887457a`): `object-src 'none'; base-uri 'self'`. Served the build with the header: 0 violations on 17 screens; a deliberately broken policy gives 116, so the check can fail. Adyen's drop-in could not be loaded here (no network to Adyen); neither directive affects scripts, frames or redirects |
| S-7 | Low | The rate limits (sign-in failures per IP, sign-up, enquiries, enquiry replies) are in memory, so on Vercel each function instance counts on its own | `middleware/rateLimit.ts` says so in its header | **Accepted for now.** The per-account lockout (5 wrong passwords, 15 minutes) is in the database and holds across instances. A shared counter needs a table — a migration, not a change for the day before |
| S-8 | Low | The sign-in token lives 7 days in local storage; signing out forgets it in the browser but does not revoke it on the server. A password change does revoke (`password_changed_at` vs the token's `iat`) | `services/authService.ts`, `routes/auth.ts` logout | **Accepted.** `script-src 'self'` with no inline script limits the XSS that could read it |
| S-9 | Info | The administrator's unit photo accepts any string. It is shown only as `<img src>`, where a `javascript:` value does nothing | `routes/admin.ts` room schemas | **Left as is**: the unit editor sends the stored value back on every save, and the stored formats could not be checked, so a stricter rule could refuse a save of an existing unit **Resolved 5 Oct 2026:** `room_photos` held no rows (checked in the database), so the stricter rule could refuse nothing on file; a unit photo is now JPG or PNG, or https (`unitPhoto` in routes/admin.ts, at the technical evaluators' request) |
| S-10 | Info | `npm audit --omit=dev`: root 0, frontend 0, backend **1 high**: `brace-expansion` (GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p), pulled in by `exceljs → archiver → readdir-glob` | Run 2 Oct | **Reported, not upgraded** (no bulk upgrades before the evaluation). Only reachable through glob patterns the code writes, never user input. `npm audit fix` in `backend/` after Saturday **Resolved:** `npm audit --omit=dev` reports 0 vulnerabilities in the root, frontend and backend on 5 Oct 2026 |
| S-11 | Info | CSP `connect-src 'self' https:` is wider than needed (the API is same-origin; Adyen's drop-in calls `*.adyen.com`) | `vercel.json` | **Left**: narrowing it needs the Adyen drop-in tested in a browser that can reach Adyen |

### 1.2 Checked and sound

- **RBAC and IDOR, every route** (`routes/*.ts`, 71 handlers). `/admin/*` sits behind
  `requireAuth + requirePasswordCurrent + requireAdmin` on the router; `/tenant/*` behind
  `requireAuth + requirePasswordCurrent`, and every tenant handler reads the profile from the
  token, never from the request. The ones that take an id check ownership: ticket messages
  (GET/POST, 404 for another tenant's ticket), notification read (`recipient_profile_id`), checkout
  (`bill.tenant_profile_id` must be the caller), GCash session verify (`confirmRedirect` checks the
  bill's tenant), new tickets (`assertRoomInScope`). `GET /live/version` passes the caller's own
  profile. Every `:id` goes through `requireUuidParam`.
- **Input validation.** Every POST/PATCH/PUT that takes a body runs a zod schema (28 of 28);
  the ones without (DELETE, mark-read, reset-password, vacate, logout) take no body. Money fields
  refuse `Infinity`. JSON bodies are capped at 1 MB.
- **Auth.** bcrypt; lockout after 5 failures for 15 minutes (`failed_login_count`, `locked_until`);
  password spraying limited per IP; wrong current passwords on change-password limited; tokens
  older than the last password change refused; deactivated accounts refused on every request.
- **CORS.** Allow-list from `CORS_ORIGINS`; `null` and `localhost:*` only outside production;
  no-Origin requests allowed (curl, Adyen). No cookies are used, so `credentials: true` carries none.
- **Adyen webhook (code only).** Basic Auth compared in constant time; refuses to run without an
  HMAC key; every item's HMAC verified (constant-time, length-safe) before any is applied;
  idempotent on `pspReference`; non-PHP currency or another merchant account recorded nothing and
  notified the owner; any failed item leaves the batch unacknowledged so Adyen retries. The
  webhook URL and HMAC key were not looked at or changed.
- **Errors.** Every 500 answers `Internal server error.`; stacks only outside production.
- **Public data.** `/public/rooms` selects room columns and photos only — no tenancy, name or phone.
- **Uploads.** No Supabase Storage buckets exist in the migrations; photos are data URLs in
  `room_photos` / `ticket_attachments`, shrunk to JPEG in the browser, within the 1 MB body cap.
- **Database functions.** Every non-trigger function the migrations create has `EXECUTE`
  revoked from `PUBLIC`, `anon` and `authenticated` and granted to `service_role` only
  (`settle_verified_payment`, `void_income_record`, `record_income_for_months`,
  `create_expense_entry_with_allocations`, `replace_expense_allocations`,
  `resolve_login_identifier`, `live_version`, `current_user_role`, `normalize_ph_phone`).
  `audit_logs` has UPDATE/DELETE revoked.
- **Secrets.** No key, token or password in tracked files or in the history (searched for JWTs,
  Postgres URLs and Adyen/JWT/HMAC assignments); `.env`, `backend/.env`, `frontend/.env` and
  `credentials/` are ignored. `.env` contents were not read.
- **Headers** (`vercel.json`): HSTS 2 years, `nosniff`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, a referrer policy and a permissions policy. The API has helmet's set.

---

## 2. Accessibility

**How:** `vite build` of `main`, served locally; Playwright (Chromium 1194) with every `/api`
call answered by a stub with fictitious records (8 units, 6 tenants, nine months of income and
expenses, two repairs, an enquiry, a GCash payment waiting, one notification). axe-core 4 with the
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice` rules. Each screen was confirmed to
have rendered the stub figures before it was scanned. Scripts were kept outside the repository.

| Check | Scope | Result |
| :--- | :--- | :--- |
| axe-core, page state | 19 screens (8 public, 7 admin, 4 tenant) × light, dark × 375×812, 1366×768 = 76 scans | **0 violations** |
| axe-core, open state | Filters on all 8 lists, Download, Notifications, phone menu, account menu, Overview +, Record payment, Record expense — light and dark | **0 violations** |
| Focus moves into the dialog | Filters ×8, Download, Notifications, phone menu, Record payment, Record expense | Pass |
| Tab stays inside (25–40 presses) | Same | Pass — no leak |
| Escape closes, focus returns to the trigger | Same, plus account menu and Overview + | Pass |
| Disclosure menus | Account menu, Overview + | `aria-expanded` and `aria-controls` set; Tab reaches the items in order; Escape closes and restores focus |
| Form errors | Enquiry, repair request | Invalid fields get `aria-invalid` and an `aria-describedby` message, and focus goes to the first one; the repair form also announces through a live region |
| | Sign in, My details | Submit stays disabled until the form is valid (the fields are `required`) |
| | Record expense | Native `required` validation, focus to the empty field |
| | Record payment | Submit opens the confirmation dialog, which takes focus |
| Toasts | All | A polite live region |
| Escape on forms | Manage this repair, Log a repair (and other forms holding typed input) | Escape and the backdrop do **not** close these, by design (`WsModal` `dismissible=false`: a reflexive Escape must not throw away typing); the X and **Cancel** close them. WCAG does not require Escape; noted so a tester does not log it |
| Visible focus | First 25 Tab stops on 15 screens, light and dark | Every stop draws an outline or ring |
| Touch targets, 375 px | 15 screens | Nothing under 24 px except the Overview and income month bars (20 px wide), which pass WCAG 2.2's spacing exception (axe `target-size` passes) |
| Reduced motion | 6 screens, `reduce` vs `no-preference` | With `reduce` the loader breathes instead of spinning and only opacity fades run; no slide, fill, arc or skeleton-pulse animation |
| Skip link, landmarks, names | All | "Skip to content" first; axe `region`, `landmark-*`, `button-name`, `link-name`, `label` all pass |

**Not covered here, and why it matters:** a real screen reader (TalkBack, VoiceOver) and a real
phone. axe finds roughly a third to a half of WCAG problems; these results say the markup is
right, not that a blind user has tried it. The Adyen GCash dialog could not be opened (no
network to Adyen). `HANDOFF_TO_QA.md` §0a keeps the phone checks.

### 2.1 Offline essentials, re-verified the same day

`vite build` + `vite preview` with the service worker, stub API, 375 px: every main screen visited
online, then the browser taken offline and each screen reopened cold in a new tab. **Admin 24/25,
tenant 15/15.** Each screen showed its figures with one "Saved figures from" line; the bell kept its
unread count; Pay with GCash, Mark all read and the Overview's + were not offered; no write left the
browser; back online the line went within 7 s without a reload; sign-out left 0 saved rows, and a
cold offline reopen afterwards showed nothing old. The one miss is accepted: an inquiry's reply
thread is not saved, so it says the replies could not be loaded.

It found one defect, fixed in `03f4bbb`: **Inquiries and Repairs still offered their writes
offline** (Close inquiry; Save reply once text was typed; Save changes, Delete repair, Dispatch,
Resolve, the comment send and Log a repair's save). Pressing one only failed with a connection
message, but every other screen greys them. They use the same `writesUnavailable` flag now; the run
shows them greyed offline and enabled online.

---

## 3. What a person needs to do

1. **B-94**: ~~turn the challenge off~~ **off as of 2 Oct evening** (no `x-vercel-mitigated` on any
   page, `/api` or precache file). Left: check Adyen's recent webhook deliveries. Before Saturday.
2. ~~**B-96**~~ **done 2 Oct evening**: migration 076 applied; 24/24 public tables RLS on, 0 readable by
   anon, the security advisor has no WARN or ERROR.
3. ~~`npm audit fix` in `backend/` (S-10)~~ **done 2 Oct evening (`a8ebbcc`)**: lockfile only,
   brace-expansion 1.1.21 / 2.1.7; `npm audit --omit=dev` is 0 in both packages. After Saturday: a
   shared rate-limit counter (S-7) and a screen-reader pass on a phone.
4. ~~**Confirm the deploy.**~~ **Confirmed 2 Oct evening** from a cloud session: the live CSP ends
   `object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.

## 4. The live site, probed from outside (2 Oct evening, no sign-in)

| Probe | Result |
| :--- | :--- |
| Admin and tenant endpoints without a token, or with a forged one | 401 everywhere |
| A foreign `Origin` header | **was 500 "Internal server error"**; now **403** (`f8718cf`), still refused before any route runs |
| `/.env`, `/.git/config`, `/package.json`, backend source, the schema file, `credentials/` | 404 (`/backups/` is the app's own not-found page) |
| Source maps in the build | none |
| API headers | HSTS, nosniff, `X-Frame-Options`, `Referrer-Policy: no-referrer`, a CSP of its own |
| Lighthouse, mobile, landing page (through this sandbox's proxy, ~700 ms TTFB) | Performance 80, Accessibility 100, Best Practices 100, SEO 100. Sign-in: SEO 66 because it is `noindex` on purpose |
| 13 public pages at 320, 375 (light) and 1366 (dark) | no horizontal overflow, one `h1` each, no broken image, every image has `alt` |
| Page titles | were "Hivelet" on every tab; a browser tab now reads "<page> · Hivelet" (`a08fa95`, WCAG 2.4.2), the installed app still "Hivelet" |


## 5. Accessibility re-run, 5 October 2026 (night)

The same 76 combinations (19 screens, light and dark, 375 and 1,366 px; axe-core 4.10.2, WCAG 2.0/2.1 A and AA, 2.2 AA) on the local build with the harnesses, after the technical evaluators' changes.

| Finding | Screens | Cause | Fix |
| :--- | :--- | :--- | :--- |
| aria-valid-attr-value (critical) | Rooms and rates, Tenants, Monthly Income; every width and theme | `aria-controls="cluster-units-Boarding House"`: the cluster's label was its id, and 'BH' became 'Boarding House' on 2 Oct | `lib/domId.ts` for both ends of the pair (commit `8b68bb7`, 5 Oct) |
| color-contrast, 4 nodes | Category page, 375 px light, once | Unit cards scanned mid fade-in | None needed: clean on a re-scan after 9 s |
| scrollable-region-focusable | Overview, 375 px light, once (first sweep, interrupted by a reload) | Scanned mid-load | None needed: clean on re-scan |

After the fix: **76 of 76 clean.** No screen reader was tried; this shows the markup is right, not that a user of one has tried it.

## 6. Dependency re-audit, 6 October 2026 (after midnight)

New advisories had appeared since the 5 Oct run. `npm audit --package-lock-only` (the registry's
bulk endpoint; plain `npm audit` in `frontend/` falls back to a retired endpoint and errors with
"Invalid package tree", which is the endpoint, not the tree: `npm ls` is clean).

| Package | Severity | Where | Done |
| :--- | :--- | :--- | :--- |
| brace-expansion 2.1.4 and 5.0.9 | High (CPU or stack exhaustion on crafted patterns) | Build tooling: minimatch under vue-tsc and workbox-build | `npm update` to 2.1.7 and 5.0.12, inside the ranges their parents allow |
| fast-uri 3.1.6 | High (URI parsing) | Build tooling: ajv under workbox-build | `npm update` to 3.1.8 |
| esbuild 0.21.5 (via Vite 5) | Moderate: any website can send requests to the **development server** and read the answers | `npm run dev` on a developer's machine only | **Accepted**: the fix is Vite 8, three major versions, not taken the week of the defense. Never run the dev server while browsing untrusted sites; the deployed site is a static build and does not include esbuild |

`npm audit --omit=dev` (what ships): **0** in root, frontend and backend, so Chapter 4 §4.4.8's sentence
stands. vue-tsc and the production build pass on the updated lockfile.
