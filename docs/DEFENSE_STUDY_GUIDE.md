# Defense study guide: how Hivelet works, end to end

Written 5 October 2026 against the system as it stands that day (main at `3e686e4` and after). For
the team before the final defense. It replaces nothing: the speaking notes are in
`docs/claude_pipeline/outputs/PHASE3_DEFENSE_PACK.md` (22 Sep), and the deliberate design decisions
are argued in full in `docs/13_AUDIT_JUDGEMENT_LOG.md` §3. This guide is the map from each screen to
the code and the database behind it, so that any member can answer "and then what happens?".

**How to use it.** Each member takes one or two flows in Part 2 and can explain them from the button
to the table, then rehearses Part 3's questions out loud. Open the files named; the comments at the
top of each explain why it is the way it is.

---

## Part 1. The system in one minute

| Layer | What it is | Where |
| :--- | :--- | :--- |
| Screens | Vue 3 + TypeScript, built with Vite, installable as a Progressive Web App | `frontend/src/views/`, `components/` |
| API | Express + TypeScript, running as Vercel serverless functions under `/api` | `backend/src/routes/` |
| Rules | Business logic in services, permissions in one table | `backend/src/services/`, `config/rbac.ts` |
| Data | PostgreSQL on Supabase; row-level security on every table with no policy, so only the server's key can read or write | `database/migrations/` (numbered; never edited after applying) |
| Payments | Adyen with GCash: Drop-in on the page, signed webhook to the server | `AdyenPaymentModal.vue`, `services/adyen*.ts` |

**Two roles.** The administrator (Michelle, for the Fe Galang Da Silva Boarding House) and tenants.
A public site needs no account. **33 units, 32 of them occupied** in five clusters.

**Numbers worth knowing.** 937 income rows and 1,327 expense allocations imported from the owner's
workbook; water is ₱200 per occupant per month; five wrong passwords lock an account for 15 minutes;
open pages check for changes every 5 seconds; 76 accessibility scans (19 screens, light and dark,
phone and computer) found no violation; 71 request handlers were reviewed for security on 2 October.

---

## Part 2. The flows, screen to database

### Flow 1. Recording a payment (the owner, at the counter)

1. **Screen.** Monthly Income or the Overview > **Record payment** opens `OnsitePaymentModal.vue`.
   She picks the unit and the months; **occupants** are prefilled from the tenancy and **water is
   computed** (occupants × ₱200), never typed. The **invoice number is optional** (not every payment
   has one); "4726" or "OR#4726" is saved as `INV#4726` (`lib/invoiceNumber.ts`, same rule on the
   server). A confirmation shows the total before anything is sent.
2. **Request.** `POST /api/admin/income-records` (`routes/admin.ts`). The body is checked by a zod
   schema; amounts must be finite and positive.
3. **Guard against a duplicate.** The server reads first for the same unit, invoice, year and month;
   the database also refuses a second live receipt with the same invoice for the same unit and month
   (`idx_one_invoice_per_unit_per_month`). A receipt with no invoice is guarded by the read alone
   (judgement log 3.6b).
4. **Write.** The database function `record_income_for_months` writes one row per month into
   `monthly_income_records` in one transaction, so a three-month payment is three rows or none.
5. **After.** If the occupants she entered differ from the tenancy's, and no later month exists, the
   tenancy follows the payment. An `audit_logs` row records who did it. The screen shows a **Payment
   recorded** summary with **See it in Monthly Income**, which opens that month with the row
   highlighted. Every other open screen, the tenant's included, refreshes within about 5 seconds
   (Flow 5).
6. **Mistakes.** A receipt is never deleted. **Void** (`void_income_record`) keeps the row, marks it
   void with a reason, and leaves it out of every total.

### Flow 2. Paying online with GCash (a tenant)

1. **Screen.** Payments and billing > **Pay with GCash** (`TenantPaymentsView.vue`). The bill comes
   from `bills`, raised on demand rather than by a nightly job (judgement log 3.6: collection is in
   person, so a scheduler would bill people who have already paid).
2. **Session.** `POST /api/tenant/payments/checkout` checks the bill belongs to the caller, then asks
   Adyen for a payment session. The Adyen Drop-in opens in the page; the tenant pays in GCash.
   Hivelet never sees or stores card or wallet credentials.
3. **Adyen tells the server.** `POST /api/public/payments/adyen/webhook`: Basic Auth, then an **HMAC
   signature on every item** (constant-time comparison) before anything is read. The same
   `pspReference` twice records once.
4. **Not settled yet.** A successful payment is written to `payments` as **Pending Verification**
   (BR-017). Adyen saying the money moved is evidence, not the owner's decision.
5. **The owner decides.** Monthly Income > **To verify** > Approve calls `settle_verified_payment`,
   which marks the payment verified, the bill paid, and writes the receipt into the ledger, all in
   one transaction (migration 018): all three happen or none.
   Reject keeps it out of every total.
6. **Status today.** Adyen with GCash is configured and working on Adyen's test environment; moving the
   account to live is the owner's step (Chapter 5, recommendation 5). The public FAQ says so.

### Flow 3. Signing in and staying in your lane

1. **Screen.** `LoginView.vue`: login ID, phone number or email, and password.
2. **Server.** `POST /api/auth/login` (`services/authService.ts`): `resolve_login_identifier` finds the
   account; the **lock is checked before the password** (five wrong tries, 15 minutes); bcrypt
   compares; an inactive (moved-out) account is refused only after a correct password.
3. **Token.** A JWT signed HS256, kept 7 days in the browser. Changing the password revokes every
   older token.
4. **First sign-in.** A tenant must choose a new password and give a real email before anything else
   (`mustChangePassword`, `mustCompleteContact`; `ChangePasswordModal.vue`).
5. **Every request.** `requireAuth`, `requirePasswordCurrent`, then `requirePermission(...)` from
   `config/rbac.ts`. `/admin/*` needs the administrator. A tenant route takes the tenant **from the
   token, never from the request**, and answers "not found" for anyone else's record.
6. **The database.** Row-level security is on for every table with no policy, so the public keys can
   do nothing; only the server's service key reaches the data (Supabase's advisor, 5 Oct: no warning).

### Flow 4. A weak signal, or none

1. **The app itself** is cached by a service worker (`vite.config.ts`, vite-plugin-pwa), so it opens
   with no connection and installs on a phone.
2. **The figures.** `lib/offlineCache.ts` keeps a copy of an allow-list of reads per signed-in person
   (IndexedDB), answers from it on a network error with one "Saved figures from" line, and wipes it at
   sign-out. Saving is greyed out offline: nothing is queued to send later.
3. **Deadlines.** A page stops waiting after 25 seconds and a save after 45 (`lib/api.ts`), each with
   a message. A save that may have arrived says to **check before sending again**.
4. **New versions.** A deploy is picked up when the page comes back into view or within 15 minutes,
   and loaded on the next navigation (`lib/staleVersion.ts`).

### Flow 5. Everyone sees changes without refreshing

`GET /api/live/version` returns a fingerprint (the database function `live_version`, migration 068)
of everything the caller can see: the whole property for the owner, only their own tenancy, bills,
payments, repairs and notifications for a tenant. Every open page asks every 5 seconds while it is
on screen (`lib/live.ts`) and reloads quietly only when the fingerprint changes. A refresh that fails
for a moment keeps the figures already shown. Sounds mark a new notification, a save and a failure
(`lib/sounds.ts`).

### Flow 6. Repairs

1. **Tenant.** Repairs > describe it, choose how urgent, attach a photo (JPG or PNG, shrunk in the
   browser) > `POST /api/tenant/tickets`. The room must be the tenant's own.
2. **Owner.** Repairs board (`MaintenanceDispatchView.vue`): To dispatch, In progress, Done; reply,
   send a technician, mark resolved. The tenant is notified when it is done.
3. **Cancelling.** A tenant may cancel while it is still **Submitted**, once an hour, with an optional
   reason (`POST /api/tenant/tickets/:id/cancel`). It becomes Closed with the tenant as the one who
   closed it; nothing is deleted, and the board shows **Cancelled by the tenant**.

### Flow 7. Inquiries from the public site

1. A visitor sends an inquiry (`POST /api/public/inquiries`): name, email, a Philippine mobile number
   and a message, checked on the page and the server, rate-limited.
2. They receive a **private link** whose secret (256 bits) travels in the address's `#fragment`,
   never sent to the server; only its SHA-256 hash is stored. With the **reference code and the phone
   number** they gave, they can open the conversation again. This is a capability URL (W3C TAG,
   *Good Practices for Capability URLs*).
3. The owner replies from Inquiries; the visitor reads it and can write back without an account.

### Flow 8. The workbooks (Download)

Monthly Income, Monthly Expenses and Tenant History download as Excel workbooks in the owner's own
layout (`services/incomeReportExport.ts`, `expenseReportExport.ts`, `tenantHistoryExport.ts`, with
exceljs). The **Download** dialog asks Month, Year or All. `check:reports` reconciles every total in
the workbook against the database (545 checks).

### Flow 9. "Your recent actions"

Under the greeting on each Overview, the person's own last three actions as sentences
(`GET /api/auth/me/recent-actions`, `services/recentActions.ts`). It reads `audit_logs`, but only the
caller's rows, only recognisable actions, and only sentences: never codes, addresses or anyone else's
actions. The full audit trail stays off the site by the adviser's ruling (judgement log 3.9).

---

## Part 3. Questions a panel is likely to ask

**Why put Express in front of Supabase instead of letting the browser read the database?**
So that every rule lives in one place the browser cannot skip: permissions, the duplicate-receipt
check, the verification gate on GCash payments, the audit row. With the browser holding a database
key, each of those would need a row-level policy and could be bypassed by calling the database
directly. Here the public keys can do nothing at all.

**How is one tenant kept out of another's records?**
Three ways. The server takes the tenant's identity from the signed token, never from the request.
Every tenant query is filtered by that profile, and another tenant's record answers "not found"
rather than "forbidden", so its existence is not revealed. And the database refuses the public keys
entirely.

**Why is nothing deleted, only voided?**
These are financial records. A voided receipt keeps its row, its reason and who voided it, and leaves
every total; the audit table cannot be updated or deleted (migration 002). Anyone can see later what
was done and why.

**What happens if the connection drops in the middle of a save?**
The page waits 45 seconds at most. If no answer came, it says it cannot tell whether the save
arrived and to check before sending again, because sending twice could record a payment twice.
The duplicate check and the unique index catch a repeated receipt anyway.

**How do you know the totals are right?**
Twenty automated check suites, including 545 reconciliations of the workbook against the database,
a ledger integrity check, and targeted tests that drive the real handlers. A new check is only
trusted after it has been made to fail on purpose (mutation testing). The owner's walkthrough and
the tenants' tasks on 30 September, and the technical evaluators' review on 3 October, are in
Chapter 4.

**How is a GCash payment protected from being faked?**
The webhook needs Basic Auth and a valid HMAC signature on every item, compared in constant time. A
replayed notification records once. And even a genuine payment waits for the owner's approval before
it counts.

**What is the 50% Share?**
A system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the
owner's historical spreadsheet.

**Why are bills not generated automatically every month?**
Rent is collected in person, so an automatic bill would often arrive after she has been paid. Bills
are raised on demand, and "overdue" is worked out when it is read (judgement log 3.6).

**Why a Progressive Web App and not a native app?**
One codebase for phone and computer, installable from the browser, updated on deploy without an app
store, and usable offline for reading. The owner and tenants already have browsers.

**What did the technical evaluators find, and what did you do?**
Fourteen comments on 3 October: input checks (phone, email, photo formats), the filters, placement
of controls on a phone, cancelling a repair, a move-out reason, a recent-actions view. All fourteen
were on the live site by 5 October (Chapter 4, Table 23).

**What are the system's limits today?**
Adyen is still on its test environment; a rejected GCash payment must be refunded from the Adyen
Customer Area; notifications are in-app only (no SMS); offline mode reads but does not record. All
are in Chapter 5's recommendations.

---

## Part 4. Before the defense

- Run the suites that do not sign in (`check:canon`, `check:rules`, `check:endpoints`, `check:writes`,
  `check:fields`, `check:columns`, `check:ledger`, `check:reports`, `check:adyen`, `check:billing`).
- Settle **B-100** (a test session changed real records on 4 October) so the figures you show are the
  owner's.
- Demonstrate with **loydtest** and the owner's account read-only; never test a write on a real
  tenant or a real receipt on the live site.
