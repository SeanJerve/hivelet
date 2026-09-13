# HIVELET TECHNICAL ARCHITECTURE

**Project:** Hivelet: Web-Based Boarding House Management and Financial Operations System
**Client:** Fe Galang Da Silva Boarding House, Legazpi City
**Course:** IT 124 — Capstone Project 2, Bicol University College of Science, Group 4
**Status:** Phase 1 architecture baseline. Supersedes the prior three-bucket layer sketch in this file.

---

## 1. Architectural Pattern

> **Layered Client-Server Architecture Structured as a Modular Monolith with a Pluggable Payment Gateway Adapter**

This string is canonical and is reproduced verbatim in every Hivelet artifact.[^synonym] The system separates horizontally into **exactly five numbered tiers**. Any document in this repository that states a four-tier or three-tier structure is superseded; see `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md`, items E-04 through E-06.

[^synonym]: "Isolated Payment Gateway Adapter" appears as an earlier synonym for Tier 5 in `docs/module_01_submission/FINAL_PRESENTATION_ARCHITECTURE_AND_DATABASE_DEFENSE.md:15` and `docs/module_01_submission/DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md:137`. The two names denote the same tier; a panelist quoting the earlier slide is not contradicted.

The rendered component diagram is maintained at `docs/diagrams/hivelet_architecture.mmd`.

---

## 2. The Five Tiers

### Tier 1 — Presentation

A Vue 3 single-page application served to the browser, with a service worker providing a strictly read-only offline cache.

| Concern | Implementation |
| :--- | :--- |
| Framework | Vue 3, Composition API |
| Routing | `vue-router`, with navigation guards enforcing role-gated route transitions |
| Client state | Pinia, registered at `frontend/src/main.ts:8` via `createPinia()` |
| Build | Vite |
| Offline | `vite-plugin-pwa` (Workbox), configured at `frontend/vite.config.ts:11-80` |
| Styling | Tailwind CSS via the `@tailwindcss/vite` plugin |

The presentation tier is Vue, not React. No React dependency exists in `frontend/package.json`.

### Tier 2 — API and Security Perimeter

A Node.js process running Express in TypeScript. This tier terminates every request before any domain logic executes, and it is the only tier permitted to make an authorization decision.

| Control | Location |
| :--- | :--- |
| Security headers | `helmet()` — `backend/src/server.ts:21` |
| Origin lock | `cors()` with an explicit allowlist — `backend/src/server.ts:37-40` |
| Request logging | `morgan` — `backend/src/server.ts:50` |
| Body limit | `express.json({ limit: '1mb' })` — `backend/src/server.ts:51` |
| Guest role attachment | `attachGuestRole` runs before every router — `backend/src/routes/index.ts:25` |
| JWT bearer auth | `requireAuth` — `backend/src/middleware/auth.ts:73` |
| Role guard | `requireRole(...)` — `backend/src/middleware/auth.ts:98`; `requireAdmin` at `:115` |
| Permission guard | `requirePermission(...)` — `backend/src/middleware/auth.ts:123` |
| Self-or-admin guard | `requireSelfOrAdmin(...)` — `backend/src/middleware/auth.ts:146` |
| Centralized errors | `errorHandler` — `backend/src/server.ts:61`, shape defined in `backend/src/utils/ApiError.ts` |
| Payload validation | `zod` schemas, imported in each of the four route modules that accept a request payload (`backend/src/routes/admin.ts:16`, `auth.ts:8`, `public.ts:14`, `tenant.ts:18`); `health.ts` accepts none |

**Authorization model.** `backend/src/config/rbac.ts:21` defines four roles — `guest`, `prospect`, `tenant`, `admin` — over a named permission matrix at `:38-89`. Routes authorize against a *permission*, not a role name, which keeps the "who may do what" decision in one file. `guest` is the unauthenticated caller; `prospect` is the stored identity of a public visitor who submitted an inquiry and carries guest-level rights only (`rbac.ts:144-149`).

### Tier 3 — Domain Service Layer (Modular Monolith)

Domain logic organized by business capability inside a single deployable process. **This tier is partially realized.** Five services exist; eight are the target of a mechanical extraction scheduled for Phase 3. The table below is the authoritative status register, and no planned service may be described elsewhere as though it exists.

| Service | Responsibility | Status |
| :--- | :--- | :--- |
| `adyenService.ts` | Payment gateway adapter; Checkout session creation and completion | **Implemented** (259 lines) |
| `auditService.ts` | Append-only audit record writes | **Implemented** (138 lines) |
| `authService.ts` | Credential verification, token issue, session lifecycle | **Implemented** (388 lines) |
| `notificationService.ts` | In-app notification fan-out | **Implemented** (197 lines) |
| `scopeService.ts` | Row-scope resolution for self-scoped roles | **Implemented** (64 lines) |
| `billingService.ts` | Bill generation, water derivation, due-date and grace computation | Planned (Phase 3) |
| `paymentService.ts` | Cash settlement, verification queue, gateway dispatch | Planned (Phase 3) |
| `occupancyService.ts` | Unit catalog, assignment lifecycle, occupant headcount | Planned (Phase 3) |
| `ticketService.ts` | Maintenance ticket lifecycle and triage | Planned (Phase 3) |
| `inquiryService.ts` | Inquiry intake and conversion to tenancy | Planned (Phase 3) |
| `settingsService.ts` | Reads and writes of `system_settings` parameters | Planned (Phase 3) |
| `expenseService.ts` | Expense entry and cluster allocation | Planned (Phase 3) |
| `financialReportService.ts` | Income-versus-expense aggregation | Planned (Phase 3) |

**The measured gap.** Of 158 database calls in `backend/src/`, **131 (83%) sit in route handlers** rather than in services, and `backend/src/routes/admin.ts` alone is **2,056 lines**. The Phase 3 extraction moves that logic behind the eight planned service interfaces without changing behaviour.

### Tier 4 — Data Persistence

PostgreSQL 16 hosted on Supabase. Twenty tables, UUID surrogate primary keys, row-level security forced on every table, and containment of the privileged key inside the backend process.

| Property | Evidence |
| :--- | :--- |
| 20 relational tables | `database/FULL_DATABASE_SCHEMA.sql` — 20 `CREATE TABLE` statements, `clusters` (`:26`) through `system_settings` (`:441`) |
| RLS enabled and forced on all tables | `database/FULL_DATABASE_SCHEMA.sql:558-559` |
| Browser roles revoked from `public` schema | `database/FULL_DATABASE_SCHEMA.sql:566-569` |
| `audit_logs` append-only | `UPDATE` and `DELETE` revoked, including from `service_role` — `database/FULL_DATABASE_SCHEMA.sql:572-573` |
| Backend connects with the service-role key | `backend/src/config/db.ts:23-28`, session persistence disabled |
| 33 seeded units across 5 clusters | `database/FULL_DATABASE_SCHEMA.sql:468-506` |

Because the backend holds the service-role key, RLS is not the tenant-isolation mechanism at runtime — **Tier 2 is**. RLS and the schema-level revocations exist so that a leaked anonymous or authenticated key grants nothing. This is defence in depth, not a substitute for the backend guard.

### Tier 5 — External Integration Boundary

Two outbound integrations, each reached only through backend code. One is implemented today; the second is a planned Phase 3 integration and is marked as such.

**Adyen GCash adapter.** The group obtained and configured an Adyen developer sandbox account and implemented the GCash checkout flow against it through a decoupled adapter. `backend/src/services/adyenService.ts:42-50` resolves credentials at call time through an explicit `isLiveConfigured()` predicate, so one code path serves either the sandbox or the live credential set without any change to the billing schema or the ledger; the adapter POSTs the Checkout session at `:61`. Posting to `https://checkout-test.adyen.com` is the correct host for a developer sandbox account, not a defect. Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone.

One caveat is carried openly: `@adyen/api-library` is declared at `backend/package.json:13` but is not imported anywhere in `backend/src/`. The adapter calls the Checkout API over HTTP directly.

**Supabase Storage — Planned (Phase 3).** The target integration is multipart upload of room imagery and maintenance photo attachments. It does not exist today: `backend/src/` contains no storage SDK call, and the backend persists caller-supplied `file_url` strings only (`backend/src/routes/admin.ts:90`). No artifact may describe this integration as implemented.

**Settlement posture.** On-site in-person cash settlement remains the **primary** method, matching Mrs. Fe's daily routine. Adyen GCash is the optional digital alternative. Under BR-017 the administrator retains a sovereign verification gate: gateway completion inserts a payment as *Pending Verification* and never auto-settles a bill.

---

## 3. Pinned Dependency Versions

Read from the manifests, not from a stability label. Semantic-version ranges are reproduced exactly as declared.

### Backend — `backend/package.json`

| Package | Declared range | Line | Role |
| :--- | :--- | :--- | :--- |
| `express` | `^4.19.2` | `:18` | HTTP framework |
| `typescript` | `^5.4.5` | `:34` | Language |
| `@supabase/supabase-js` | `^2.110.9` | `:14` | PostgreSQL client |
| `helmet` | `^7.1.0` | `:19` | Security headers |
| `cors` | `^2.8.5` | `:16` | Origin lock |
| `jsonwebtoken` | `^9.0.2` | `:20` | JWT issue and verification |
| `bcryptjs` | `^2.4.3` | `:15` | Password hashing |
| `zod` | `^3.23.8` | `:23` | Request payload validation |
| `morgan` | `^1.10.0` | `:21` | Request logging |
| `dotenv` | `^16.4.5` | `:17` | Environment loading |
| `qrcode` | `^1.5.4` | `:22` | Payment QR rendering |
| `@adyen/api-library` | `^32.0.0` | `:13` | Declared; not imported (see Tier 5) |
| `tsx` | `^4.10.5` | `:33` | Dev runner |
| `@types/node` | `^20.12.12` | `:31` | Node 20 typings |

`backend/package.json` declares no `engines` field. The Node 20 target is implied by `@types/node` at `:31`; pinning it explicitly is Phase 2 work.

### Frontend — `frontend/package.json`

| Package | Declared range | Line | Role |
| :--- | :--- | :--- | :--- |
| `vue` | `^3.5.13` | `:17` | SPA framework |
| `vue-router` | `^4.5.0` | `:18` | Client routing and guards |
| `pinia` | `^2.3.1` | `:15` | Client state |
| `vite` | `^5.4.14` | `:26` | Build tool |
| `vite-plugin-pwa` | `^1.3.0` | `:27` | Service worker generation |
| `tailwindcss` | `^4.0.6` | `:24` | Styling |
| `@tailwindcss/vite` | `^4.0.6` | `:21` | Tailwind build integration |
| `typescript` | `~5.7.2` | `:25` | Language |
| `vue-tsc` | `^2.2.0` | `:28` | Type-checked build |
| `@vitejs/plugin-vue` | `^5.2.1` | `:23` | SFC compilation |
| `@adyen/adyen-web` | `^6.44.0` | `:12` | Adyen Drop-in client |
| `lucide-vue-next` | `^0.475.0` | `:14` | Icon set |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.0.1` | `:13` / `:16` | Class composition |

### Platform

| Component | Version |
| :--- | :--- |
| PostgreSQL | 16, hosted on Supabase |
| Node.js | 20 LTS target |

---

## 4. Invariant Architecture Rules

These four rules bind every tier and survive any refactor.

### 4.1 The frontend is not a security boundary

**Every protected operation must be validated and authorized by the backend.** Navigation guards, disabled buttons and hidden menu items are usability affordances only. An attacker who bypasses all of them must still be stopped by Tier 2, and the permission matrix in `backend/src/config/rbac.ts` is where that decision lives.

### 4.2 Financial truth is server-side

Financial calculations must be based on server-side authoritative data. The frontend may display a calculation but must never be trusted to define financial truth. Rates and thresholds are read from `system_settings` rather than embedded in client code or handler literals.

- Water charge = registered occupants × `system_settings.water_rate_per_occupant`, seeded at PHP 200 and **configurable** (BR-014, BR-036).
- Linda units `LF` and `LB` are excluded from the per-occupant model and carry fixed per-unit charges — `linda_lf_water_charge` PHP 400, `linda_lb_water_charge` PHP 200, `linda_lb_electricity_charge` PHP 325 (BR-040).
- The 50% Share column equals exactly half of the row's Rent Amount, computed by the system and never entered by hand. Water, GBG fee and deposit are excluded from it. The column is carried over from Column 6 of the landlady's existing source spreadsheet so that the digital ledger reconciles line-for-line with her historical records (BR-035).
- Remitted Amount = Rent Amount + Water Payment (BR-038). Deposit = Rent at move-in (BR-039).
- Due date derives from the move-in date (BR-010); overdue begins the day after the due date (BR-011); the grace window is `system_settings.grace_period_days`, seeded at 7 (BR-012).
- Room rates carry **no automatic increase and no system-generated recommendation**. The administrator sets a unit's rate manually whenever she decides to change it, and every change is recorded in `room_price_history` with the previous price, the administrator-set new rate, the date that rate takes effect, and the administrator who made it (`database/FULL_DATABASE_SCHEMA.sql:136-145`). This is pillar **ARCH-004 Rate Change History**, governed by BR-003 Historical Preservation (`docs/02_BUSINESS_RULES.md:15`).

### 4.3 Offline capability is read-oriented

**Offline capability is moderate and read-oriented. Do not permit offline financial mutations that can later create conflicting transactions.**

The implemented scope is precise and narrow. `frontend/vite.config.ts:32-79` precaches build assets (`:33`) and defines three runtime rules: Google Fonts (`:36`), Google Static Fonts (`:50`), and one API rule matching `/api/public` and `/api/health` only (`:64`), under `NetworkFirst` with a one-hour expiry. Tenant statements (`/api/tenant`) and administrative data (`/api/admin`) are mounted at `backend/src/routes/index.ts:30-31` and match no cache rule, so they are never available offline. Offline capability is not claimed beyond this.

### 4.4 Payment secrets stay behind the boundary

Gateway integration is isolated in a dedicated backend service (`backend/src/services/adyenService.ts`). Merchant credentials, API keys and HMAC secrets are read from the environment at `backend/src/config/env.ts:84-89` and never reach the browser. Callbacks and redirect returns are validated before any ledger state changes, and the administrator verification workflow (BR-017) is never bypassed by a gateway result.

---

## 5. Deployment

The system deploys to the university-provided server over HTTPS where available. The production environment supplies, through environment variables only:

- database credentials and the Supabase service-role key
- JWT signing secret
- Adyen API key, merchant account, client key and HMAC key
- CORS origin allowlist

No secret may be committed to Git.

---

## 6. Known Architectural Debt

Stated here so that no reader mistakes an intention for an implementation. Every item is Phase 2 or Phase 3 work and none is a Phase 1 correction.

| # | Defect | Evidence | Scheduled |
| :-- | :--- | :--- | :--- |
| D-1 | `system_settings` holds six correctly seeded keys and is read by **zero** lines of backend code | No occurrence of `system_settings` in `backend/src/` | Phase 3 (`settingsService.ts`) |
| D-2 | Water rate hardcoded as `occupants * 200` | `backend/src/routes/admin.ts:910`, `:1103`, `:1243` | Phase 3 |
| D-3 | Share column hardcoded as `rentAmount / 2` | `backend/src/routes/admin.ts:911`, `:1102` | Phase 3 |
| D-4 | Grace window hardcoded at 10 days, contradicting the seeded 7 and BR-012 | `backend/src/routes/tenant.ts:453` | Phase 3 |
| D-5 | ~~`fifty_percent_share` and `remitted_amount` … every row stores `0.00`~~ **WITHDRAWN 2026-09-13 — this was never a defect.** Both columns are `GENERATED ALWAYS AS … STORED` (`is_generated = 'ALWAYS'`), so PostgreSQL derives them and rejects any write naming them; omitting them is required. The residual issue is one line of dead code at `admin.ts:922`. See `PHASE2_ERD_AND_DATA_DICTIONARY.md` section 6, which verifies this against all 937 live rows. | `information_schema.columns` | **Withdrawn** |
| D-6 | Foreign keys are 17 `CASCADE`, 4 `SET NULL`, 0 `RESTRICT` on financial tables | `database/FULL_DATABASE_SCHEMA.sql` | Phase 2 — proposed migration `005_ledger_fk_restrict.sql` moving `room_id` and `tenant_profile_id` on `bills`, `payments` and `monthly_income_records` to `RESTRICT`. Soft-delete already exists (`profiles.account_status`, `rooms.operational_status`), so the change is safe. |
| D-7 | No `BEGIN`/`COMMIT` transaction exists anywhere in `backend/src` | Repository-wide search returns zero matches | Phase 3 — atomic multi-table writes are a **design target**, not current behaviour |
| D-8 | Two payment endpoints are unauthenticated | `backend/src/routes/public.ts:202` (`GET /public/payments/mock-gateway`) and `:853` (`POST /public/payments/mock-gateway/complete`) | Phase 3 hardening |
| D-9 | 131 of 158 database calls sit in route handlers; `admin.ts` is 2,056 lines | `backend/src/routes/` | Phase 3 service extraction |

No performance figure is asserted anywhere in this document. Claims of "256MB RAM", "sub-50ms" and "100% data consistency" appearing in earlier submissions are unsubstantiated and are withdrawn; see errata item E-16.

---

## 7. Problem Alignment

The architecture is shaped by the manual baseline it replaces, documented in `PHYSICAL.png`: a paper ledger and logbook, a spreadsheet file carried on a USB stick, verbal rental requests, maintenance reports arriving as chat messages and noted informally with no log, and repairman assignment by word of mouth.

- **The paper ledger and the USB spreadsheet** become Tier 4 tables under forced RLS with an append-only `audit_logs` table — one authoritative copy, with every ledger adjustment attributable.
- **Verbal requests** become the public inquiry pipeline in Tier 1 and Tier 2, so a prospect's details survive as a record rather than as a remembered conversation.
- **Chat-message maintenance reports with no log** become ticket rows with a lifecycle, attachments and assignment history.
- **The spreadsheet's arithmetic**, including the derived 50% Share column, is reproduced exactly in Tier 3 and Tier 4 so the digital ledger reconciles line-for-line against the records Mrs. Fe already keeps — the migration costs her no historical continuity.
- **Cash at the door** remains the primary settlement path. Tier 5 adds a digital alternative without displacing the routine that works.
