# Study guide: the code

For the team, before the defense. The system was built with an AI coding assistant, so this guide
is how each of you can answer **"where is this feature?", "how does it work?" and "how would you
debug it?"** without having written every line yourself. Everything here was read from the code and
the live database on 13 October 2026. Line numbers are as of that day and drift as the code changes;
search for the name if a line has moved.

**How to study it:** read Section 1 once, then pick the features you are most likely to be asked
about (Section 3) and open each file named, in VS Code, while reading. Section 9 is the panel's
likely questions. For every single file explained one by one, see `STUDY_GUIDE_CODE_FRONTEND_FILES.md`
and `STUDY_GUIDE_CODE_BACKEND_FILES.md` (the backend one also covers every table, migration and check
suite).

---

## 1. The whole system in one paragraph

A **Vue 3** web application (the *frontend*) runs in the browser and installs on the phone as a
Progressive Web App. It talks only to an **Express** server (the *backend*, the *API*), never to the
database directly. The backend checks who is asking and what they may do, then reads or writes a
**PostgreSQL** database hosted on **Supabase**. For online payments the backend opens a session with
**Adyen**, the payment gateway, which handles GCash and reports the result back to the backend.
Both the frontend and the backend are hosted on **Vercel** (`vercel.json` declares the two
services), at `https://hivelet.vercel.app`.

```
Phone or laptop browser            Vercel                         Supabase
┌──────────────────────┐   HTTPS   ┌──────────────────────┐   SQL  ┌──────────────────┐
│ Vue 3 PWA (frontend) │ ────────▶ │ Express API (backend)│ ─────▶ │ PostgreSQL       │
│ frontend/src         │ ◀──────── │ backend/src          │ ◀───── │ 24 tables, RLS   │
└──────────────────────┘   JSON    └──────────┬───────────┘        └──────────────────┘
                                              │ session, signed result
                                              ▼
                                        Adyen (GCash)
```

Both halves are **TypeScript**, so a field with the wrong shape is caught before the code runs.

---

## 2. Where everything lives

| Folder | What is in it |
| :--- | :--- |
| `frontend/src/views/` | **The 19 screens**, one file per page (table in Section 3) |
| `frontend/src/components/` | Pieces used inside screens: `layout/` (header, sidebar, footer), `modals/` (pop-up forms such as Record payment), `overview/` (the Overview tiles), `ui/` (buttons, tables, dialogs) |
| `frontend/src/lib/` | The frontend's logic, no screens. Most important: `api.ts` (every call to the backend), `systemState.ts` (the shared data the screens read), `authStore.ts` (who is signed in), `live.ts` (refresh every 2 s), `offlineCache.ts` (offline copies) |
| `frontend/src/router/index.ts` | Which address opens which screen, and who may open it |
| `frontend/vite.config.ts` | The build, and the PWA settings (`VitePWA`, line 120) |
| `backend/src/server.ts` | Where the API starts |
| `backend/src/routes/` | **Every API endpoint**: `public.ts` (no sign-in), `auth.ts` (sign-in), `tenant.ts`, `admin.ts` (the owner), `live.ts`, `recentActions.ts`, `health.ts` |
| `backend/src/middleware/` | Runs before a route: `auth.ts` (who you are, what you may do), `rateLimit.ts`, `errorHandler.ts`, `requireUuidParam.ts` |
| `backend/src/services/` | Logic shared by routes: billing, Adyen, audit trail, notifications, Excel exports |
| `backend/src/config/rbac.ts` | **The role and permission matrix**: who may do what |
| `backend/src/utils/validators.ts` | The rules every input is checked against (money, dates, unit codes) |
| `database/migrations/` | **Every change ever made to the database**, numbered 001 to 081, applied in order |
| `scripts/`, `backend/scripts/`, `frontend/scripts/` | The 21 automated check suites and the build tools |
| `video/` | The defense film (Remotion), separate from the system |

---

## 3. Feature by feature: screen, endpoint, code, database

Read each row as a path: the screen calls the endpoint, the endpoint is handled at that line, and
the handler reads or writes those tables.

### The public website (no account)

| Feature | Screen | Endpoint | Backend | Tables |
| :--- | :--- | :--- | :--- | :--- |
| Landing page, units and rates | `PublicGuestView.vue`, `CategoryRoomsView.vue` | `GET /public/rooms`, `GET /public/rates` | `public.ts:57`, `:92` | `rooms`, `room_photos`, `system_settings` |
| The landlady's number to call | every public page (`LANDLADY.phone` in `lib/systemState.ts`) | `GET /public/contact` | `public.ts:136`, her account's own phone number and nothing else | `profiles` |
| Send an inquiry | `InquireView.vue` (and the form on a unit) | `POST /public/inquiries` | `public.ts:179`, rate-limited per address (`middleware/rateLimit.ts`) | `inquiries` |
| Read and answer the reply | `InquiryThreadView.vue` | `POST /public/inquiries/thread`, `.../thread/messages` | `public.ts:301`, `:340`; `services/inquiryThread.ts` | `inquiries`, `inquiry_messages` |

### Signing in

| Feature | Screen | Endpoint | Backend |
| :--- | :--- | :--- | :--- |
| Sign in with login ID or phone (an email is refused) | `LoginView.vue` | `POST /auth/login` | `auth.ts:76` → `services/authService.ts` (finds the account through the database function `resolve_login_identifier`) |
| Change password (a tenant) | `ChangePasswordModal.vue` | `POST /auth/change-password` | `auth.ts:334`, checks the new password against known breaches (`utils/breachedPassword.ts`) |
| Change number / password (the landlady) | `ChangeSignInModal.vue` | `POST /auth/change-sign-in` | `auth.ts:445` → `changeOwnSignIn`: current number AND current password first, one refusal for either |
| Who am I | (every page) | `GET /auth/me` | `auth.ts:225` |

### The tenant's side

| Feature | Screen | Endpoint | Backend | Tables |
| :--- | :--- | :--- | :--- | :--- |
| Overview: unit, rent, standing, deposit | `TenantOverviewView.vue` | `GET /tenant/my-rooms`, `/my-standing` | `tenant.ts:50`, `:404`; `services/standingService.ts` | `room_assignments`, `rooms`, `bills` |
| Bills, payments, receipts | `TenantPaymentsView.vue` | `GET /tenant/my-bills`, `/my-payments`, `/my-income-records` | `tenant.ts:345`, `:372`, `:413` | `bills`, `payments`, `monthly_income_records` |
| Pay with GCash | `TenantPaymentsView.vue` + `AdyenPaymentModal.vue` | `POST /tenant/payments/checkout`, `.../adyen/verify-session` | `tenant.ts:944`, `:1281`; `services/adyenService.ts` | `bills`, `payments` (Section 5) |
| Repair requests, with photos | `TenantTicketsView.vue` | `POST /tenant/tickets`, `GET /tenant/my-tickets`, `.../cancel` | `tenant.ts:531`, `:438`, `:737` | `maintenance_tickets`, `ticket_attachments`, `ticket_messages` |
| My details | `TenantProfileView.vue` | `GET`/`PUT /tenant/my-profile` | `tenant.ts:1318`, `:1349` → `authService.ts` (only the allowed fields are copied) | `profiles` |
| Notifications | `NotificationPopover.vue` | `/tenant/my-notifications...` | `tenant.ts:830` onward; `services/notificationService.ts` | `notifications` |

### The owner's side

| Feature | Screen | Endpoint | Backend | Tables |
| :--- | :--- | :--- | :--- | :--- |
| Overview | `AdminOverviewView.vue` + `components/overview/` | several reads; `GET /admin/payments` | `admin.ts:1958` | many |
| Rooms and rates | `RoomDirectoryView.vue`, `AdminEditUnitModal.vue` | `GET`/`POST /admin/rooms`, `PATCH /admin/rooms/:roomId` | `admin.ts:66`, `:159`, `:274` | `rooms`; a rate change is recorded by the trigger `trg_record_room_price_change` into `room_price_history` |
| Tenants: move in, edit, reset password, move out | `TenantManagementView.vue` | `POST /admin/tenants`, `PATCH /admin/tenants/:profileId`, `.../reset-password`, `.../vacate` | `admin.ts:627`, `:1164`, `:1478`, `:1590` | `profiles`, `room_assignments`, `rooms` |
| Record a cash payment | `IncomeCollectionsView.vue` + `OnsitePaymentModal.vue` | `POST /admin/income-records` | `admin.ts:2731` → database function `record_income_for_months` | `monthly_income_records` |
| Correct or void a receipt | `IncomeCollectionsView.vue` | `PATCH`/`DELETE /admin/income-records/:id` | `admin.ts:3420`, `:3674` → `void_income_record` | `monthly_income_records`, `audit_logs` |
| Verify a GCash payment | `IncomeCollectionsView.vue` (Online verification) | `PATCH /admin/payments/:paymentId/verify` | `admin.ts:2004` → `settle_verified_payment` (Section 5) | `payments`, `bills`, `monthly_income_records` |
| Expenses | `ExpensesLedgerView.vue`, `NewExpenseKindDialog.vue` | `/admin/expense-entries`, `/admin/expense-categories` | `admin.ts:3795` to `:4195` → `create_expense_entry_with_allocations`, `replace_expense_allocations` | `monthly_expense_entries`, `expense_property_allocations`, `fixed_expense_categories` |
| Excel workbooks in her layout | Download buttons (`DownloadDialog.vue`) | `GET /admin/reports/income.xlsx`, `expenses.xlsx`, `tenants.xlsx` | `admin.ts:2442`, `:2486`, `:2531`; `services/incomeReportExport.ts`, `expenseReportExport.ts`, `tenantHistoryExport.ts` (library: `exceljs`) | the ledgers |
| Repair board | `MaintenanceDispatchView.vue` | `/admin/tickets...` | `admin.ts:4219`, `:4254`, `:4419` | `maintenance_tickets`; a ticket also changes the unit's status |
| Inquiries | `InquiriesView.vue` | `/admin/inquiries...` | `admin.ts:1701`, `:1765`, `:4944` | `inquiries`, `inquiry_messages` |
| Your recent actions | `RecentActions.vue` | `GET /auth/me/recent-actions` | `routes/recentActions.ts`, `services/recentActions.ts` | `audit_logs` |

---

## 4. Security, and where each protection is

| Protection | How | Where |
| :--- | :--- | :--- |
| Passwords | Never stored, only a **bcrypt** hash (cost 12, with its own salt) | `admin.ts:807`, `:1519`; checked in `authService.ts` |
| Signed-in session | A **JWT** (signed token) sent with every request as `Authorization: Bearer`; kept in the browser's storage | `api.ts:124` onward; verified in `middleware/auth.ts` |
| Too many wrong passwords | The account locks for **15 minutes** (`failed_login_count`, `locked_until`) | `config/env.ts:168`, `authService.ts` |
| Breached passwords | Checked against Have I Been Pwned **by k-anonymity**: only the first 5 characters of the password's hash ever leave the server | `utils/breachedPassword.ts` |
| Who may do what | One permission matrix; every protected route names the permission it needs | `config/rbac.ts`; `middleware/auth.ts` (`requirePermission`) |
| A tenant sees only their own rows | Each tenant query is scoped to the caller | `services/scopeService.ts` |
| Database-level protection | **Row-level security** on all 24 tables (checked 13 Oct); the browser never holds a database key | Supabase; `config/db.ts` |
| Inputs | Every body and query is checked by **zod** schemas before use | `utils/validators.ts`, at each route |
| The public form cannot be flooded | Per-address rate limit | `middleware/rateLimit.ts` |
| Everything the owner changes is recorded | An audit trail the application cannot edit, delete or empty (migration 080) | `services/auditService.ts`, `audit_logs` |
| Headers | HTTPS forced, no framing, no MIME sniffing | `vercel.json`, `helmet` in `server.ts` |
| Gateway messages are genuine | Every Adyen notification is checked by **HMAC signature** before anything is written | `services/adyenWebhook.ts` |

**The known weaknesses** (Chapter 4, Section 4.4.4; Chapter 5, recommendation 3): the token is kept
where a script could read it, rather than in a protected cookie, and the administrator has no second
sign-in factor.

---

## 5. How money works

**Water** is ₱200 per registered occupant per month, for every unit: `computeWaterFee`,
`billingService.ts:69`. **A bill** (rent plus water) is raised on demand, when it is needed, not by
a schedule: `computeBillAmounts` (`:110`) and `computeBillPeriod` (`:140`). **Overdue** begins the
day after the due date: `isOverdue` (`:271`).

**A cash payment** (`POST /admin/income-records`) goes through one database function,
`record_income_for_months`, so a receipt covering three months is saved as three rows, together or
not at all. **The same receipt saved twice** is refused by the database itself: the unique index
`idx_one_invoice_per_unit_per_month`, which ignores receipts with no invoice number and
acknowledgement receipts (the limit Chapter 4, Section 4.3.6 names). **Voiding** keeps the row and
marks it, through `void_income_record`.

**The 50% Share** is a system-computed figure equal to half that row's Rent Amount, kept for ledger
parity with the owner's historical spreadsheet. In the database it is a generated column, so no
code can set it differently.

**A GCash payment, step by step:**
1. The tenant presses Pay; `POST /tenant/payments/checkout` (`tenant.ts:944`) raises the bill if
   needed and asks Adyen for a session. The bill is held for **15 minutes**, so a second checkout on
   the same bill is refused (migration 051).
2. Adyen's payment window (`AdyenPaymentModal.vue`, library `@adyen/adyen-web`) takes the GCash
   payment. Hivelet never sees the GCash account.
3. On return, `POST /tenant/payments/adyen/verify-session` (`tenant.ts:1281`) confirms the session.
4. Adyen also calls `POST /public/payments/adyen/webhook` (`public.ts:1172`). Its HMAC signature is
   checked (`adyenWebhook.ts`), then `adyenWebhookHandler.ts` writes the payment as **Pending
   Verification**. The same gateway reference cannot be recorded twice (`uq_payments_gateway_reference`).
5. The owner verifies it (`PATCH /admin/payments/:paymentId/verify`, `admin.ts:2004`).
   `settle_verified_payment` settles the bill and writes the receipt in one step.

Adyen runs on its **test account**, so no real money moves yet (Chapter 5, recommendation 3).
`GET /public/payments/local-cashier` is a built-in checkout page for development only; the server
refuses it whenever Adyen is configured, as it is on the live site.

---

## 6. Live updates, offline use and installing

- **Live updates:** every open page asks the server whether anything changed, **every 2 seconds**
  while it is on screen (`frontend/src/lib/live.ts`, `INTERVAL_MS = 2000`), through one small
  database function, `live_version`. Only what changed is reloaded.
- **Timeouts:** a page stops waiting after **25 seconds**, a save after **45 seconds**, and says it
  cannot tell whether the save arrived (`api.ts:238`).
- **Installing:** the PWA plugin (`vite.config.ts:120`) makes a service worker that keeps the
  application's files on the device, **70 files, about 1.2 MB**. Adding it to the home screen opens
  it in its own window; nothing comes from an app store.
- **Offline:** read-only copies of what the person last loaded are kept on the device
  (`offlineCache.ts`, IndexedDB) and shown with the time they were saved. Paying and recording
  always need a connection.

---

## 7. The database

**24 tables** (the full list is Appendix N): property (`rooms`, `clusters`, `property_areas`,
`room_photos`, `room_price_history`), people (`profiles`, `room_assignments`), money
(`monthly_income_records`, `monthly_expense_entries`, `expense_property_allocations`,
`fixed_expense_categories`, `bills`, `payments`, `system_settings`), requests (`maintenance_tickets`,
`ticket_messages`, `ticket_attachments`, `inquiries`, `inquiry_messages`), system (`notifications`,
`audit_logs`), and three backup tables from corrections.

**Database functions** (do several writes as one): `record_income_for_months`,
`settle_verified_payment`, `void_income_record`, `create_expense_entry_with_allocations`,
`replace_expense_allocations`, `resolve_login_identifier`, `live_version`, `normalize_ph_phone`,
`current_user_role`.

**Triggers** (run automatically on a change): `trg_record_room_price_change` (every rate change is
recorded), `trg_update_expense_total` (an expense's total follows its allocations),
`trg_route_linda_water`.

**One rule above all:** the database is live, with the owner's real records. Every change is a new
numbered file in `database/migrations/`, taken after `npm run backup`; nothing is ever reset.

---

## 8. Running it, and debugging it

**Run it on a laptop:** `npm install` in the root, `frontend/` and `backend/`; put the keys in `.env`
at the root (copy `.env.example`; never commit it); `npm run dev:backend` (port 5000) and
`npm run dev:frontend` (port 5173). **Check it:** `npm run check:all`, and read the summary table.

| If this happens | Look here first |
| :--- | :--- |
| A GCash payment does not appear | Adyen dashboard, webhook log (was it delivered and accepted?); Vercel's function logs for `/public/payments/adyen/webhook`; the `payments` table |
| A screen shows a total the owner disputes | The same figure in the database (Supabase SQL editor); `npm run check:ledger` and `check:reports` |
| Someone cannot sign in | `profiles.locked_until` and `failed_login_count`; the owner can reset a tenant's password from the Tenants page |
| A change on one device does not show on another | `live.ts`; is the other page on screen? Is it offline? |
| "Cannot tell whether it was saved" | The connection stalled past 45 s (`api.ts:238`); check the record before sending it again |
| A page fails after a deploy | Vercel deployment log; `npm run build` in `frontend/` and `npx tsc --noEmit` in `backend/` |
| An error with no clear cause | `middleware/errorHandler.ts` logs it; Vercel's runtime logs show the request |

---

## 9. What the panel may ask, and what to show

- **"Show us where the login is."** `backend/src/routes/auth.ts:76`, then `services/authService.ts`.
- **"How are passwords stored?"** Hashed with bcrypt, cost 12, a salt per password (`admin.ts:809`).
- **"How do you stop a tenant seeing another tenant's bill?"** Every protected route names a permission
  (`config/rbac.ts`), tenant queries are scoped to the caller (`scopeService.ts`), and the database
  has row-level security on every table.
- **"What happens if the owner clicks Save twice?"** The database refuses the second receipt (the
  unique index), and Chapter 4, Section 4.3.6 shows the test.
- **"How does the online payment work?"** Section 5, steps 1 to 5. Stress: nothing counts until the
  owner verifies it.
- **"Where is the water computed?"** `billingService.ts:69`, `computeWaterFee`.
- **"Is it really offline?"** It reads offline; it does not write offline (Section 6).
- **"Why Vue, Express and Supabase?"** Chapter 3, Section 3.1.1 gives the reasons; in short, one
  language for both halves, the database enforcing who sees what, and triggers that keep history.
- **"Did the AI write this?"** Yes, at the team's direction; the team reviewed it, directed every
  change, and the 21 check suites and the screen-versus-database audit verified it (Chapter 4,
  Sections 4.3.1 and 4.3.3).
- **"Show us a test."** `backend/scripts/check-concurrency.mjs` (simultaneous saves) or
  `npm run check:ledger`.
