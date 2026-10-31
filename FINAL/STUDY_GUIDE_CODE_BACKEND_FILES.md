# Study guide: the backend, the database and the scripts, file by file

For the whole team, before the defense. [STUDY_GUIDE_CODE.md](STUDY_GUIDE_CODE.md) explains the
system feature by feature (screen, endpoint, table). This guide goes the other way: it walks through
**every file** in `backend/src`, **every migration** in `database/migrations`, and **every script**
in `scripts/` and `backend/scripts/`, and says in plain words what each one does. Everything here was
read from the code on 24 October 2026. Where the code does not make something clear, this guide says
"unclear from the code" instead of guessing.

Read Section 1 once. Then use the rest as a reference: when a panelist points at a file, find it here.

---

## 1. How a request travels

A few words first:

- **Request**: a message from the browser to the server, such as "give me my bills".
- **Endpoint** or **route**: one address on the server plus a method, such as `GET /api/tenant/my-bills`.
  GET reads; POST creates; PATCH and PUT change; DELETE removes.
- **Middleware**: code that runs on every request (or every request to a group of routes) *before*
  the route itself. It checks things such as "is this person signed in?"
- **Service**: a file of shared logic that several routes call, such as the billing arithmetic.
- **Supabase**: the company that hosts the PostgreSQL database.

The path of one request, for example a tenant opening their bills:

1. **Vercel** receives it at `https://hivelet.vercel.app/api/tenant/my-bills`. The root `vercel.json`
   declares two services: anything under `/api/` goes to the backend service, everything else to the
   frontend. For Vercel, the backend is bundled into one file by `backend/scripts/bundle-for-vercel.mjs`.
2. **The Express app** in `backend/src/server.ts` receives it. Express is the web framework the
   backend is built on. The app runs its global middleware in this order: `helmet` (security
   headers), `cors` (which websites may call the API), `morgan` (a request log line),
   `express.json` (reads the JSON body, up to 1 MB).
3. **The API router** (`routes/index.ts`) first marks every caller as a `guest`, then hands the
   request to the right group of routes: health, auth, public, tenant, admin, live, recent actions.
4. **Route-group middleware** runs next. Every `/tenant` route first passes `requireAuth` (a valid
   token from an active account) and `requirePasswordCurrent` (not still on a one-time password).
   Every `/admin` route passes those two plus `requireAdmin`.
5. **Per-route middleware**: `requirePermission(...)` asks the permission table in `config/rbac.ts`
   whether this role may do this action, and `requireUuidParam(...)` refuses a malformed id.
6. **The route handler** checks the body with a **zod** schema (zod is a library that checks the
   shape of data), then calls **services** and the database.
7. **The database call** goes through `config/db.ts`, which talks to Supabase with the server's
   secret key. The browser never holds a database key.
8. If anything throws, `middleware/errorHandler.ts` turns it into a JSON answer with a status code,
   and hides database details from the caller.

How to read the rest: Section 2 is every backend file, by folder. Section 3 is the database. Section 4
is every migration. Section 5 is the check suites and other scripts. Section 6 is the panel's likely
questions.

---

## 2. Every file in `backend/src`

Forty-nine files: 1 entry file, 4 config, 4 middleware, 8 routes, 17 services, 1 types, 14 utils.

### 2.1 The entry file

**`backend/src/server.ts`**
Creates the Express app and starts it. It sets a strict Content Security Policy with `helmet` (a
header telling browsers what the response may load) and a CORS rule: only the origins listed in the
`CORS_ORIGINS` setting may call the API from a browser, and in production `localhost` and the `null`
origin are refused. Requests with no Origin header at all (curl, health checks, Adyen's webhook) are
allowed, because they are not browsers. It mounts everything under `/api`, then the not-found and
error handlers, and sets `trust proxy` so the audit trail records the real client address.

### 2.2 `config/` (settings read once at start-up)

**`config/env.ts`**
Reads the `.env` file and builds one typed `config` object. It **refuses to start** if a required
value is missing, if the JWT secret is shorter than 32 characters, or if it is a secret known to have
been published. It defaults `NODE_ENV` to production, so a forgotten setting fails safe (no stack
traces sent to callers). It also holds the sign-in rules: bcrypt cost 12, 5 failed sign-ins lock an
account for 15 minutes, tokens last 7 days. Public sign-up is **off** unless `ALLOW_PUBLIC_SIGNUP=true`.

**`config/db.ts`**
Creates the database client `db`, which uses the server's secret (service-role) key. That key
bypasses row-level security, so it is the only way to the data, and it is only used after the
middleware has checked the caller. A second client with the public key exists only for the health
check: it tries to read `profiles` and must be refused. The result is reported as `enforced`
(refused by PostgreSQL, the good answer), `exposed` (it could read, an emergency) or `unverified`.

**`config/rbac.ts`**
RBAC means role-based access control. This file is **the one permission table** for the whole
system. It defines four roles (`guest`, `prospect`, `tenant`, `admin`) and permissions written as
`domain:action`, such as `bill:read:own`. A guest may view public units and rates and send or follow
an inquiry; a tenant adds their own profile, room, bills, payments, tickets and notifications; the
administrator holds every permission. A permission ending in `:own` is also narrowed to the caller's
own rows when the query runs. A prospect has guest rights only.

**`config/propertyAreas.ts`**
The six property areas an expense can be split across: Boarding House, Main House, Front Apartment,
Back Apartment, Penthouse, Other Expenses / Personal. Main House (the owner's own home) and Other
Expenses / Personal are marked as **not** rental costs. It also accepts short forms ("bh", "ph",
"front apt") and turns them into the full names; a caller must refuse anything it cannot resolve.

### 2.3 `middleware/` (runs before the routes)

**`middleware/auth.ts`**
The enforcement point for sign-in and permissions. `attachGuestRole` marks every request as a guest
first, so a missing check means "deny", not "crash". `requireAuth` reads the `Authorization: Bearer`
token, verifies it, and **re-reads the profile from the database on every request**, so a moved-out
tenant loses access on their next tap. `optionalAuth` does the same when a token is present (used on
public routes that show the owner a little more). `requirePasswordCurrent` answers 428 to an account
still on a one-time password. `requireRole`, `requireAdmin`, `requirePermission` and
`requireSelfOrAdmin` are the guards routes declare.

**`middleware/errorHandler.ts`**
The last stop for every error. A known `ApiError` keeps its status and message. A too-large body
becomes 413 with a message about photo size; an unreadable body becomes 400. Anything else becomes a
500 that says only "Internal server error", so a database message never reaches the caller. Every 401
and 403 is written to the audit trail as an access-denied event. Unknown addresses get a 404 JSON
answer from `notFoundHandler`.

**`middleware/rateLimit.ts`**
A small limiter kept in memory, per client address. `rateLimit` counts requests (used on public
inquiries, inquiry look-ups and replies, and sign-up). `failureLimit` counts only **failed** attempts
(used on sign-in, 30 failures per 15 minutes per address, and on password changes, 10 per 15 minutes).
Counting only failures stops one password being tried against many accounts without ever slowing
down a person who signs in correctly. These counts live in one function's memory, and Vercel runs
many, so they are a first filter only. What must hold is counted in the database: failed sign-ins per
address from `audit_logs` (`overRecordedLoginFailures` in `routes/auth.ts`, 30 in 15 minutes), new
inquiries from anyone from `inquiries` (`INQUIRY_CEILING` in `routes/public.ts`, 30 in 15 minutes),
and the per-account lockout on `profiles`.

**`middleware/requireUuidParam.ts`**
Checks that an id in the address (such as `:roomId`) is a real UUID (the long random id every row
has). If not, it answers 404 "not found" before any database query. Without it, PostgreSQL would
answer with an error and the caller would see a 500.

### 2.4 `routes/` (the endpoints)

"Who may call" uses: **Anyone** (no sign-in), **Signed-in** (tenant or administrator), **Tenant**
(a signed-in tenant whose password is not a one-time one), **Admin** (the administrator only).

**`routes/index.ts`**
Joins the seven route files into one router under `/api`, after `attachGuestRole`. It defines no
endpoints itself.

**`routes/health.ts`**

| Method and path | Who | What |
| :--- | :--- | :--- |
| `GET /api/health` | Anyone | Says whether the database is reachable and whether the public key is refused (`rlsLockdown`). Returns 503 when the database cannot be reached. Never returns the raw database error. |

**`routes/auth.ts`** (sign-in and the caller's own account; services: `authService.ts`, `contactDetails.ts`)

| Method and path | Who | What |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Anyone | Sign in with a **login ID or phone number** and password. Returns a token (JWT). Failed tries are counted per address. |
| `POST /api/auth/register` | Anyone, but refused | Public sign-up. Refused with 403 unless `ALLOW_PUBLIC_SIGNUP` is turned on, and rate-limited to 5 per 15 minutes either way. It never accepts a `role` field. |
| `GET /api/auth/me` | Signed-in | Who am I: user, profile and permissions. Reachable even on a one-time password. |
| `PATCH /api/auth/me` | Signed-in | Change own contact fields. The **name is refused** (it is the landlady's), the administrator's phone cannot change here, an email sent by an old copy of the app is dropped. Audited as `PROFILE_UPDATE`. |
| `POST /api/auth/change-password` | Signed-in | New password: at least 10 characters, a letter and a number, and not found in a known data breach. Returns a new token; every older token stops working. A tenant's first sign-in also sets their phone here. |
| `POST /api/auth/change-sign-in` | Admin | The administrator changes her sign-in number and/or password. Needs her current number **and** current password, with one refusal for either being wrong. |
| `POST /api/auth/logout` | Signed-in | Only writes `AUTH_LOGOUT` to the audit trail; the browser throws the token away. |

Tables: `profiles` (through `authService`), `audit_logs`.

**`routes/public.ts`** (no account needed)

| Method and path | Who | What |
| :--- | :--- | :--- |
| `GET /api/public/rooms` | Anyone | The unit list, from an allow-list of columns with no tenant details. A guest sees only Published units; the administrator also sees Hidden ones. Tables: `rooms`, `room_photos`. |
| `GET /api/public/rates` | Anyone | The water rate per occupant from `system_settings`, so the public page never quotes a hard-typed price. |
| `GET /api/public/contact` | Anyone | The number to call: the active administrator's own phone number, digits only, nothing else from her row. Table: `profiles`. |
| `POST /api/public/inquiries` | Anyone | Send an inquiry about a unit: name, Philippine mobile number, message. **No email.** The unit must be Published, and a Reserved unit refuses inquiries (BR-006). Limited to 10 per 15 minutes per address. Writes `inquiries` and the first `inquiry_messages` row, notifies the owner, and returns the visitor's private link secret and reference code. |
| `POST /api/public/inquiries/thread` | Anyone holding the link secret, or the reference code with the phone number | Read one's own inquiry and its replies. Credentials go in the body, never the address. 30 tries per 15 minutes. |
| `POST /api/public/inquiries/thread/messages` | Same | The visitor replies. Refused once the inquiry is Closed or Converted. A reply to a Contacted inquiry sets it back to Pending. |
| `GET /api/public/payments/local-cashier` | Anyone with a session id | A built-in checkout page for an environment with **no** gateway credentials. Answers 404 whenever Adyen is configured, as it is on the live site. |
| `POST /api/public/payments/local-cashier/complete` | Same | The completion step of that page; also 404 when Adyen is configured. Would write only a Pending Verification payment. |
| `POST /api/public/payments/adyen/webhook` | Adyen's servers | Adyen's payment notification. Optional Basic Auth (both user and password, or neither), then **every item's HMAC signature is checked before any is applied**. Answers `[accepted]` when handled so Adyen stops retrying; answers 500 if an item failed so Adyen retries. Handled by `services/adyenWebhookHandler.ts`. |

**`routes/tenant.ts`** (every route: `requireAuth` + `requirePasswordCurrent`; who: Tenant)

The header names two controls on every route: the permission, and the tenant's own scope. Room and
tenant ids are never taken from the body; they come from the signed-in profile.

| Method and path | What | Tables |
| :--- | :--- | :--- |
| `GET /api/tenant/my-rooms` | The units this tenant has or had | `room_assignments`, `rooms`, `bills`, `payments` |
| `GET /api/tenant/my-bills` | Own bills, with an `effective_status` worked out on read (overdue from the day after the due date); the stored `status` is left as it is | `bills` |
| `GET /api/tenant/my-payments` | Own payments and their verification status (read only) | `payments` |
| `GET /api/tenant/my-standing` | Paid up, or which periods are owed, read from the receipts (`standingService.ts`) | `monthly_income_records`, `room_assignments` |
| `GET /api/tenant/my-income-records` | Own receipts in the owner's ledger; voided ones are left out | `monthly_income_records` |
| `GET /api/tenant/my-tickets` | Own repair requests | `maintenance_tickets` |
| `POST /api/tenant/tickets` | New repair request with priority and JPEG/PNG photos. The unit must be one of the tenant's own. If the photo fails to save, the ticket is kept and the tenant is told | `maintenance_tickets`, `ticket_attachments`, `notifications` |
| `GET /api/tenant/tickets/:ticketId/messages` | The notes on one of their own tickets | `ticket_messages` |
| `POST /api/tenant/tickets/:ticketId/messages` | Add a note to their own ticket (not a Closed one) | `ticket_messages` |
| `POST /api/tenant/tickets/:ticketId/cancel` | Withdraw their own request **only while Submitted**, at most once an hour. Nothing is deleted: it becomes Closed with `closed_by` = the tenant | `maintenance_tickets`, `ticket_messages` |
| `GET /api/tenant/my-notifications`, `/unread-count`; `PATCH .../:id/read`; `POST .../mark-all-read` | Own notifications only | `notifications` |
| `POST /api/tenant/payments/checkout` | Open an Adyen checkout for GCash. Raises the bill first if none exists (bills are raised on demand). Refused if a payment on that bill is already waiting for verification, or if a checkout was opened on it in the last **15 minutes** (migration 051) | `bills`, `room_assignments`, `payments` |
| `POST /api/tenant/payments/adyen/verify-session` | Asks Adyen what happened to the session and tells the payer. **Records no payment**; only the webhook does | none written |
| `GET /api/tenant/my-profile`, `PUT /api/tenant/my-profile` | Read and change own contact details (same rules as `PATCH /auth/me`; name refused) | `profiles` |

**`routes/admin.ts`** (every route: `requireAuth` + `requirePasswordCurrent` + `requireAdmin`; who: Admin)

The header says the whole router is gated, so even a forgotten per-route permission cannot let a
tenant in; the per-route permissions are a second barrier.

| Method and path | What | Tables |
| :--- | :--- | :--- |
| `GET /api/admin/rooms` | Every unit | `rooms` |
| `POST /api/admin/rooms` | Add a unit, with an optional photo (JPEG/PNG or an https address) | `rooms`, `room_photos` |
| `PATCH /api/admin/rooms/:roomId` | Edit a unit. A rate change is recorded by the database trigger; the route only adds who and why to that history row, and complains if the row is missing | `rooms`, `room_photos`, `room_price_history` |
| `DELETE /api/admin/rooms/:roomId` | Delete a unit **only if it has no history at all** (no tenancies, rates, inquiries, photos, bills, payments or receipts); otherwise 409. Audited as `ROOM_DELETE` with the whole row | all of those |
| `GET /api/admin/tenants` | Tenants and prospects, never the password hash | `profiles`, `room_assignments`, `rooms` |
| `POST /api/admin/tenants` | Move someone in. Gives them a **login ID** (`HV-` and five digits) and a random one-time password, shown once; checks the unit **before** creating the person; deposit defaults to one month's rent (BR-039) | `profiles`, `rooms`, `room_assignments` |
| `PATCH /api/admin/tenants/:profileId` | Edit a tenant or move them to another unit. Refuses a change to their email or phone (theirs to change). Every refusal happens before the first write. Re-sending the same unit is not a move | `profiles`, `room_assignments`, `rooms` |
| `POST /api/admin/tenants/:profileId/reset-password` | New one-time password; ends all their sessions; clears the lock. Refused for the administrator and for a moved-out account | `profiles` |
| `POST /api/admin/tenants/:profileId/vacate` | Move out: closes the tenancy, frees the unit, marks the account inactive, optional reason. Refused for the administrator | `profiles`, `room_assignments`, `rooms` |
| `GET /api/admin/inquiries` | All inquiries (the hash of the visitor's secret is removed) | `inquiries` |
| `PATCH /api/admin/inquiries/:inquiryId` | Change status. **Converted needs the tenant it became** (`converted_tenant_id`, BR-009) | `inquiries`, `profiles` |
| `DELETE /api/admin/inquiries/:inquiryId` | Delete for good; its messages go with it; notifications pointing at it removed; audit keeps the row | `inquiries`, `notifications` |
| `GET /api/admin/inquiries/:id/messages`, `POST .../messages` | Read and reply to an inquiry conversation | `inquiry_messages`, `inquiries` |
| `GET /api/admin/bills` | All bills, with overdue worked out on read | `bills` |
| `GET /api/admin/payments` | All payments, paged past the 1,000-row read limit | `payments` |
| `PATCH /api/admin/payments/:paymentId/verify` | Verify or reject a payment. Verifying calls the database function `settle_verified_payment`: payment Verified, bill Paid, receipt written, **in one transaction**. A Verified payment cannot be switched to Rejected here | `payments`, `bills`, `monthly_income_records`, `notifications` |
| `GET /api/admin/reports/income.xlsx`, `expenses.xlsx`, `tenants.xlsx` | Excel downloads in her layout, for one month, one year or everything. Audited as `LEDGER_EXPORT` | the ledgers |
| `GET /api/admin/income-records` | The Monthly Income ledger, paged | `monthly_income_records` |
| `POST /api/admin/income-records` | Record a receipt. Calls `record_income_for_months`, so a receipt covering three months becomes three rows, all or nothing. Refuses a duplicate, an invoice number already used on another unit or another day, and never invents an invoice number. Then settles the tenant's open bills (`allocateReceipt`) | `monthly_income_records`, `bills`, `payments`, `rooms`, `room_assignments` |
| `PATCH /api/admin/income-records/:id` | Correct a receipt in place; unknown fields are refused, not dropped | `monthly_income_records`, `rooms` |
| `DELETE /api/admin/income-records/:id` | **Void**, not delete: calls `void_income_record`; refuses to void twice (it would erase who voided it first) | `monthly_income_records`, `payments`, `bills` |
| `GET/POST /api/admin/expense-entries`, `PATCH/DELETE .../:id` | The expense ledger. Create through `create_expense_entry_with_allocations`, edit through `replace_expense_allocations`, delete = void. One amount per area per expense | `monthly_expense_entries`, `expense_property_allocations` |
| `GET/POST /api/admin/expense-categories` | The thirteen built-in kinds, plus adding her own (add only, no rename or delete) | `fixed_expense_categories` |
| `GET/POST /api/admin/tickets`, `PATCH/DELETE .../:ticketId` | The repair board. Logging a repair sets the unit Under Maintenance; finishing it puts back only what the repair changed; the tenant is told once when it is done. Delete is one of only two hard deletes, audited | `maintenance_tickets`, `rooms`, `room_assignments`, `notifications` |
| `GET/POST /api/admin/tickets/:id/messages` | Read and add notes on any ticket | `ticket_messages` |
| `GET /api/admin/notifications`, `/unread-count`; `PATCH .../:id/read`; `POST .../mark-all-read` | Her own notifications | `notifications` |

There is no endpoint that shows the audit trail. A comment in `admin.ts` records that the adviser
ruled the audit trail a developer's record, so the Activity screen and its two endpoints were
removed; every handler still writes to `audit_logs`.

**`routes/live.ts`**

| Method and path | Who | What |
| :--- | :--- | :--- |
| `GET /api/live/version` | Signed-in | A short fingerprint of everything this person can see, from the database function `live_version` (migration 068). Open pages ask every few seconds and reload only when it changes. A tenant's fingerprint covers only their own rows. |

**`routes/recentActions.ts`**

| Method and path | Who | What |
| :--- | :--- | :--- |
| `GET /api/auth/me/recent-actions` | Signed-in | The caller's own last three recognisable actions, as sentences. The profile comes from the token, never a parameter. |

### 2.5 `services/` (shared logic)

**`services/authService.ts`**
Sign-in, tokens and the caller's own profile. `login` refuses anything containing `@` exactly like an
unknown account, then finds the account through the database function `resolve_login_identifier`.
It checks the **lock before the password**, compares the bcrypt hash, counts failures (5 lock for 15
minutes), and only after a correct password checks that the account is active. `resolveAuthUser`
re-reads the profile on every request and refuses a token issued before the last password change.
Also holds `changeOwnPassword`, `changeOwnSignIn`, `updateOwnProfile` and the disabled `register`.
Table: `profiles` (never selects `password_hash` for a response).

**`services/billingService.ts`**
The bill arithmetic, as pure functions that do not write to the database. Water is occupants times
the rate from settings for **every** unit, Linda's included (`computeWaterFee`). It works out the
bill period from the tenancy's own day of the month (BR-033), the due date (grace is 0 days),
overdue, the rent period for a receipt, how a receipt pays down open bills (`allocateReceipt`), and a
tenant's standing (`computeStanding`). `npm run check:billing` tests it.

**`services/standingService.ts`**
Reads what `computeStanding` needs for one tenant: their tenancy and their receipts. It counts from
the start of the tenant's **continuous** stay, so moving to another unit does not wipe what was owed
before the move. Tables: `room_assignments`, `monthly_income_records`.

**`services/settingsService.ts`**
Reads `system_settings` and keeps a copy for one minute. Gives the water rate per occupant, the grace
period (0: the business does not accept late payment), and the flags that mark Linda's two units
(LF and LB). The fixed Linda charge it was named after is retired; only "is this a Linda unit" is
still used. A fallback value is used only if a row is missing, and that is logged.

**`services/scopeService.ts`**
Works out which rooms a tenant may read: the units of their active tenancies, plus past ones for
their own history. Every tenant query is narrowed with this, never with an id from the request.
Table: `room_assignments`.

**`services/adyenService.ts`**
Opens the Adyen checkout session on the server, so the Adyen API key never reaches a browser. Adyen
runs on its **test account** (`checkout-test.adyen.com`). The session expires inside the 15-minute
hold on the bill. Its rule: **only the webhook writes an Adyen payment**; the browser's return is used
to tell the payer what Adyen says, never to record money. It also raises a bill on demand if a paid
notification arrives with none, and contains the local cashier fallback used only when no gateway is
configured. Tables: `bills`, `payments`, `notifications`, `room_assignments`, `profiles`.

**`services/adyenWebhook.ts`**
The HMAC check. HMAC is a signature computed from the message and a shared secret key; only someone
holding the key can produce it. Adyen signs eight fields joined by colons; this rebuilds that string,
signs it with the key, and compares in constant time (`timingSafeEqual`). It also cleans a key pasted
with quotes or spaces and prints a short one-way fingerprint of the key, never the key itself.

**`services/adyenWebhookHandler.ts`**
Runs only after the signature is accepted. A successful AUTHORISATION writes a payment as **Pending
Verification**; it never settles a bill (BR-017). A repeat of the same gateway reference is a
duplicate and is acknowledged. Refunds and chargebacks change no ledger row: the owner is notified
loudly, naming the unit and amount, and decides herself. Notifications that can never succeed are
acknowledged and audited so Adyen stops retrying. Tables: `payments`, `bills`, `notifications`,
`audit_logs`.

**`services/auditService.ts`**
Writes the audit trail: who acted, what action (a fixed list such as `PAYMENT_VERIFY`,
`TENANT_CREATE`, `EXPENSE_VOID`), the record, the values before and after, the client address and the
time. Password fields are stripped before writing. Table: `audit_logs`, which the application can add
to but cannot change, delete or empty (migrations 002 and 080).

**`services/notificationService.ts`**
Writes and reads in-app notifications. If no recipient is given, the notice goes to the
administrator. Table: `notifications`.

**`services/contactDetails.ts`**
Who owns what on a tenant's profile: the tenant owns their phone and password; the landlady owns their
name. Holds the phone rule (a Philippine mobile, 09 plus nine digits, or +63), the emergency-contact
rule, the "is this number already someone's sign-in" check (asked through `resolve_login_identifier`),
and `mustCompleteContact`, which asks a tenant on a one-time password or with no phone to confirm one.
Since 20 October 2026 email is not asked for.

**`services/inquiryThread.ts`**
Lets the person who sent an inquiry read and answer replies without an account. It issues a
256-bit secret for a private link (only its SHA-256 hash is stored) and an 8-character reference code
that works together with the phone number they gave. Tables: `inquiries`, `inquiry_messages`.

**`services/recentActions.ts`**
Turns the caller's own audit rows into plain sentences ("Recorded a payment for 2B, ..."). Only the
caller's own rows, only actions on an allow-list per role, never sign-ins, refused requests or
downloads, never codes or raw values. Table: `audit_logs` (read only).

**`services/expenseCategories.ts`**
The rules for the owner adding her own kind of expense: a name of 2 to 60 characters, not a repeat
of an existing name in any spelling, numbered after her highest number and placed after the
thirteen built-in kinds, which are never renamed or removed. Table: `fixed_expense_categories`.

**`services/incomeReportExport.ts`**
Builds the Monthly Income workbook (library `exceljs`) in the layout of her spreadsheet: month blocks,
units in fixed order inside each cluster, a subtotal per cluster, a grand subtotal that leaves out
Linda's units, then Linda's own section. Because the owner has not said whether she wants monthly or
year-to-date totals, it prints both, labelled. Tables: `monthly_income_records`, `room_assignments`.

**`services/expenseReportExport.ts`**
Builds the Monthly Expenses workbook: six area columns totalled at the bottom, and a category summary
on the right with "this month" and a running total. It states whether the two ways of adding up agree
(BR-047). Tables: `monthly_expense_entries`, `fixed_expense_categories`, `property_areas`.

**`services/tenantHistoryExport.ts`**
Builds the Tenants page's history as a workbook: who paid for each unit in a year or month, read from
her receipts, using the same name-matching rule as the screen (`utils/tenantHistory.ts`). Read only.
Tables: `monthly_income_records`, `room_assignments`.

### 2.6 `types/`

**`types/auth.ts`**
Type definitions only (no running code). It describes the signed-in user (`AuthUser`, including
`mustChangePassword` and `mustCompleteContact`), the token's contents (`JwtPayload`), the tenant's
scope, and adds `user` and `role` to every Express request. It notes that the role in the token is
for convenience only; the profile is re-read every time.

### 2.7 `utils/` (small helpers)

**`utils/ApiError.ts`** The error class every route throws, each with a status and a fixed code:
400/422 bad input, 401 not signed in or wrong password, 403 not allowed or inactive, 404 not found,
409 conflict, 428 password change required, 429 locked or rate-limited, 500 internal.

**`utils/asyncHandler.ts`** Wraps an async route so an error inside it reaches the error handler
instead of leaving the request hanging.

**`utils/validators.ts`** Shared zod checks: `money` (finite, not negative, two decimals; it rejects
NaN and Infinity, which PostgreSQL would otherwise accept past `rent_amount >= 0` and spread into
every total), `isoDate` (only `YYYY-MM-DD`), `uuid`, `occupantCount`, `unitCode`, `shortText`,
`queryInt`.

**`utils/checkedWrite.ts`** The database library does not throw on a failed write. `assertWritten`
fails loudly when a failed write would leave data wrong; `warnIfWriteFailed` only logs when the write
is secondary to one already saved (such as a notification after a payment). `uniqueViolationOn`
recognises a duplicate refused by a unique index.

**`utils/breachedPassword.ts`** Checks a new password against Have I Been Pwned using k-anonymity:
only the first 5 characters of its SHA-1 hash leave the server. If the service cannot be reached, it
lets the password through (the length and character rules still apply).

**`utils/generateTemporaryPassword.ts`** A random one-time password per tenant from a secure random
source, without look-alike characters (0/O, 1/l/I), shown once to the administrator and never logged.

**`utils/loginId.ts`** Makes a tenant's login ID, `HV-` and five digits. A clash is refused by the
unique index `idx_profiles_login_id` and the caller tries again.

**`utils/invoiceNumber.ts`** The one way an invoice number is written: blank is "no invoice" (stored
empty, never invented), "OR#4726", "inv 4726" and the like become `INV#4726`, and the many spellings of
an acknowledgement receipt become "Acknowledgement receipt".

**`utils/likeLiteral.ts`** Escapes `_`, `%` and `\` so a text search matches literally (an `_` in a
value once matched a different person's row).

**`utils/propertyClock.ts`** "Today" in Manila time (UTC+8). Storing the UTC date had written dates a
day early between midnight and 8 a.m.

**`utils/reportScope.ts`** Reads the download choice (one month, one year, everything) from the
address and refuses a bad one with the same 422 everywhere.

**`utils/reportFileName.ts`** The download's file name, such as "Monthly Income August 2026.xlsx".

**`utils/safeRedirect.ts`** Accepts a return address only if it is relative or on the CORS allow-list,
so the payment return cannot send a payer to a stranger's site.

**`utils/tenantHistory.ts`** Builds "who lived in which unit, month by month" from the receipts, and
decides carefully when two hand-written names are the same person. A copy of the frontend's file;
`check:reports` keeps the two together.

---

## 3. The database

**What it is.** PostgreSQL hosted on Supabase, holding the owner's live records: 33 units, 32 of them
occupied. There are **24 tables**. The full column list is
`docs/FINAL MANUSCRIPT/APPENDIX_N_DATA_DICTIONARY.md` (Appendix N); the overview is in
[STUDY_GUIDE_CODE.md, Section 7](STUDY_GUIDE_CODE.md). Do not read `database/FULL_DATABASE_SCHEMA.sql`
as the truth: it does not describe the live database.

### 3.1 The tables in plain words

**Property**

| Table | In plain words |
| :--- | :--- |
| `rooms` | One row per unit (33): its code, floor (1 to 3, and 4 for the rooftop penthouse), cluster, type, current rate, whether it is Available, Reserved, Occupied or Under Maintenance, and whether it is shown on the public site. |
| `clusters` | The five clusters (Boarding House, Back Apartment, Front Apartment, Penthouse, Linda) and the expense area each one's costs go to. |
| `property_areas` | The six areas an expense can be split across, and whether each counts as a rental cost. |
| `room_photos` | Photos of each unit, one marked as the first one shown. |
| `room_price_history` | Every change of a unit's rate: old rate, new rate, date, who. Written by a trigger. |

**People**

| Table | In plain words |
| :--- | :--- |
| `profiles` | Everyone with a record: the administrator, tenants, and visitors recorded from an inquiry. Holds the bcrypt password hash (never the password), the login ID, failed sign-ins, the lock time, and `must_change_password`. The email column is no longer used. |
| `room_assignments` | Tenancies: who lives in which unit, from when, the day of the month rent runs from, the deposit (one month), and the number of occupants water is charged for. |

**Money**

| Table | In plain words |
| :--- | :--- |
| `monthly_income_records` | The owner's Monthly Income ledger: one row per receipt per month covered. Includes the **50% Share** column, a system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet, and the Remitted Amount (rent plus water). Voided rows stay, marked. |
| `monthly_expense_entries` | The Monthly Expenses ledger: one row per expense. Its total is kept equal to its parts by a trigger. |
| `expense_property_allocations` | How each expense is split across the property areas. |
| `fixed_expense_categories` | Her expense categories: the thirteen numbered lines (with sub-lines such as 6a) and any she adds. |
| `bills` | A bill for one whole month: rent plus water, due date, status, and when a GCash checkout was last opened on it. |
| `payments` | Payments against bills, by GCash through Adyen or recorded on site, with their verification. |
| `system_settings` | Values the owner can change without a new release, such as the water rate per occupant. |

**Requests**

| Table | In plain words |
| :--- | :--- |
| `maintenance_tickets` | Repair requests, from Submitted to Closed. The tenant may be empty for a repair the owner logs on an empty unit. |
| `ticket_messages` | Notes on a repair request. |
| `ticket_attachments` | Photos on a repair request (JPEG or PNG). |
| `inquiries` | Questions from the public site about a unit, with the visitor's name and mobile number, the hash of their private-link secret and their reference code. |
| `inquiry_messages` | The conversation on an inquiry. |

**System and backups**

| Table | In plain words |
| :--- | :--- |
| `notifications` | In-app notices to one person, each linked to the record it is about. |
| `audit_logs` | Every administrator action and sign-in event, with values before and after. Append-only. |
| `rent_period_drift_backup_030`, `copied_period_backup_031`, `date_paid_import_backup_032` | Copies of the values that migrations 030, 031 and 032 corrected, kept so each correction can be undone. No client role can read them. |

### 3.2 The rules the database itself keeps

A **migration** is a numbered SQL file that changes the database. A **unique index** makes the
database refuse a second row with the same values. A **partial** unique index applies only to rows
that meet a condition. A **trigger** is code the database runs by itself when a row changes. A
**generated column** is computed by the database and cannot be written. **Row-level security (RLS)**
decides, row by row, what a database role may see.

| Rule | What it protects | Where it came from |
| :--- | :--- | :--- |
| RLS enabled and forced on every table, **no policies**, and the browser roles' privileges revoked | The public key can read nothing; only the server's key reaches the data | 002, 011 (`property_areas`), 076 (the three backup tables) |
| `audit_logs`: no UPDATE, DELETE or TRUNCATE for the application | Nobody, not even the server, can edit, delete or empty the trail | 002, 080 |
| Ledger foreign keys are `ON DELETE RESTRICT` | Deleting a unit or person cannot silently delete bills, payments or receipts | 005 |
| `fifty_percent_share` = `rent_amount / 2.0` and `remitted_amount` = `rent_amount + water_payment`, both generated | No code can set them to anything else | Appendix N; the code comments say `GENERATED ALWAYS` |
| `idx_one_invoice_per_unit_per_month`: one live row per unit, invoice number, year and month (acknowledgement receipts and receipts with no invoice excepted) | The same receipt saved twice, including two clicks at once | 033, renamed in 066, narrowed in 072 |
| `idx_one_bill_per_tenant_per_period` | Two taps on Pay raising the same bill twice | 038 |
| `uq_payments_gateway_reference`, `uq_income_gateway_reference`: one Adyen reference, one row | Adyen's retries recording one payment twice | 024, narrowed to Adyen rows in 040 |
| `idx_single_active_assignment_per_room`: one active tenancy per unit | Two tenants on one unit. Checked on the live database on 24 October 2026: it exists, as a unique index on `room_id` where `is_active` is true. No file in `database/migrations` creates it, so it was made outside the numbered migrations | live database |
| `idx_rooms_room_number_lower` | "1A" and "1a" being two units | 028 |
| `idx_profiles_login_id`, `idx_profiles_phone_login` (on the normalised phone, for accounts with a password), `idx_profiles_email_lower` | Two people sharing one sign-in identifier | 073, 006, 001/006 |
| CHECK `profiles_login_identifier_required` | A password with nothing to sign in with | 006, widened to count the login ID in 073 |
| UNIQUE (`expense_entry_id`, `property_area`) | One expense charging the same area twice | 014 |
| `idx_room_photos_one_primary` | Two "first" photos for one unit | 004 |
| `inquiries_access_token_hash_key`, `inquiries_reference_code_key` | Two inquiries sharing a secret or code | 065 |
| `payments.verification_status` defaults to Pending Verification | A forgotten field producing a payment nobody approved | 026 |
| `rooms_floor_check` | A floor outside the building's levels | 007 |

**Triggers**

| Trigger | What it does |
| :--- | :--- |
| `trg_record_room_price_change` (on `rooms`) | Writes a `room_price_history` row whenever a rate changes, by any path (020) |
| `trg_update_expense_total` (on `expense_property_allocations`) | Keeps an expense's total equal to the sum of its parts (014; BR-045) |
| `trg_route_linda_water` (on `monthly_income_records`) | On a Linda unit, moves the water into Linda's own column; off a Linda unit, moves it back (041; BR-040) |

**Database functions** (several writes done as one, all or nothing; callable only by the server)

| Function | Used by | Migration |
| :--- | :--- | :--- |
| `record_income_for_months` | Recording a receipt over several months | 029, 060, 066 |
| `settle_verified_payment` | Verifying a payment | 018 |
| `void_income_record` | Voiding a receipt; also reverses a GCash settlement | 054 |
| `create_expense_entry_with_allocations` | New expense | 019, 066 |
| `replace_expense_allocations` | Editing an expense's split | 010, 013 |
| `resolve_login_identifier` | Sign-in by login ID or phone | 021, 048, 073 |
| `live_version` | The live-update fingerprint | 068 |
| `normalize_ph_phone` | Folds `+63`/`63`/`0` forms of a number to one | 006 |
| `current_user_role` | Not used by anything; fixed to fail closed | 022 |

---

## 4. Every migration

The rule (CLAUDE.md): every change to the schema or to live data is a new numbered file, never an
ad-hoc edit, and `npm run backup` is run first. Several headers say "NOT APPLIED by the author"; that
means the author wrote it for Sean to run in the Supabase SQL editor. Whether each one was run later
is not recorded in every file, so this list says what each file **does**, not whether it ran. Checked on 24 October 2026: every migration from 066 to 085 is in effect on the live database (the database's own migration history lists them, and the effects of the hand-run ones, 070 to 075, were checked directly), and the 21 check suites pass against it.

| # | What it changed, and why |
| :--- | :--- |
| 001 | Added sign-in columns to `profiles` (password hash, last sign-in, failed count, lock time, password-changed time) and indexes, because Express checks passwords itself with bcrypt. |
| 002 | Turned on and forced RLS on every table with no policies and revoked the browser roles, because the public key could read and write everything; also made `audit_logs` append-only. |
| 003 | Development and demo only: put bcrypt hashes on the seeded demo profiles so the three roles could be shown (those passwords were later rotated). |
| 004 | Filled gaps the form audit found: created `room_photos` and `system_settings` (with RLS) and indexes for unvoided rows; one setting's wording was corrected later by 025. |
| 005 | Changed the ledgers' foreign keys from CASCADE to RESTRICT, so deleting a unit cannot silently delete its money history. |
| 006 | Made email optional so a tenant can exist without one; added `normalize_ph_phone`, the unique phone-login index and the "password needs an identifier" CHECK. |
| 007 | Moved the penthouse to floor 4 (the rooftop) and added a floor CHECK. |
| 008 | Created `property_areas`, marking Main House (the owner's home) and personal costs as not rental costs, with a foreign key from the expense split. |
| 009 | Recorded two owner answers as column comments: rent is charged whole, never prorated; and its reading of the deposit, which 036 later corrected. |
| 010 | Added `replace_expense_allocations`, so editing an expense's split is one transaction instead of a delete then an insert. |
| 011 | Security fixes: RLS on `property_areas`, revoking a function from PUBLIC properly, and pinning functions' `search_path`. |
| 012 | Added Penthouse as a sixth expense area and linked each cluster to the area its costs go to (owner's answer). |
| 013 | Fixed `replace_expense_allocations`, which could not insert into the area column's enum type. |
| 014 | Wrote into the repository two objects that existed only in production: the expense-total trigger and the one-amount-per-area unique key. |
| 015 | Corrected one unit's floor so the floors read 11/11/10/1, as the owner surveyed. |
| 016 | Set the grace period to 0: the business does not accept late payment (the seeded 7 days was never a rule). |
| 017 | Retired the fixed electricity charge for unmetered units (owner's answer); old rows stay as collected. |
| 018 | Added `settle_verified_payment`: verify payment, mark bill Paid and write the receipt in one transaction. |
| 019 | Added `create_expense_entry_with_allocations`, so a new expense and its split are saved together. |
| 020 | Added the trigger that records every rate change in `room_price_history`, by any path. |
| 021 | Added `resolve_login_identifier`, so a tenant can sign in with a phone number. |
| 022 | Made `current_user_role()` answer "no role" instead of "admin" when it cannot identify the caller (nothing used it). |
| 023 | Deactivates three duplicate profiles the first import created (names with invoice numbers stuck on); their real profiles are untouched. |
| 024 | Made the gateway reference unique on payments and receipts, so Adyen's retries cannot record a payment twice. |
| 025 | Rewrote the label and description of the settings row behind the 50% Share to the locked wording. |
| 026 | Made a new payment default to Pending Verification instead of Verified. |
| 027 | Removed two test repair tickets on one unit (one with an offensive title, identified by hash). |
| 028 | Made unit codes unique regardless of capital letters. |
| 029 | Added `record_income_for_months`: a receipt covering several months becomes one row per month, in one transaction. |
| 030 | Corrected 58 rent periods whose year disagreed with the row's own year; old values kept in a backup table. |
| 031 | Corrected 5 rent periods copied from the previous receipt; old values kept in a backup table. |
| 032 | Moved every imported payment date one day later to match the owner's workbook; totals checked unchanged; backup table kept. |
| 033 | Added the unique index so the same receipt cannot be saved twice for one unit in one month. |
| 034 | Corrected unit F1's floor to 1. |
| 035 | Set each tenancy's rent day from the receipts instead of the import's placeholder date. |
| 036 | Rewrote the deposit column's comment to match the owner's answer: one month held, used for repairs at move-out, the rest refunded. |
| 037 | Set occupant counts from the receipts (every tenancy read 1), because water is billed from them. |
| 038 | Added the unique index so two taps on Pay cannot raise the same bill twice. |
| 039 | Removed 37 rows an audit's tests had put into the live ledger. |
| 040 | Narrowed the gateway-reference indexes to Adyen rows, because one on-site receipt legitimately splits across several payment rows. |
| 041 | Added the trigger that routes a Linda unit's water into Linda's own column on every write path. |
| 042 | Removed four rate-history rows created while testing the 020 trigger. |
| 043 | Added one correcting audit entry for 276 rows that wrongly said an account was created when someone only signed in. |
| 044 | Removed residents' names from two units' public descriptions. |
| 045 | Set the unit rates from the rate card the owner gave. |
| 046 | Deletes three inactive profiles the import created twice that nothing references. |
| 047 | Deletes five test profiles (and their test records) that were not real people. |
| 048 | Added `must_change_password`, so a new tenant must set their own password before using the portal. |
| 049 | Deactivates two residents who had moved out but could still sign in. |
| 050 | Deletes three dummy profiles, deliberately keeping two the request had included (one a current resident). |
| 051 | Added `bills.checkout_opened_at`, so a second GCash checkout on a bill is refused for 15 minutes. |
| 052 | An attempt to remove a rehearsal test tenant; its header says it cannot succeed as written (an audit foreign key refused it). Do not re-run. |
| 053 | Removed the rehearsal test profiles, loosening the audit foreign key for that one transaction so the audit rows stay with an empty actor. |
| 054 | Added `void_income_record`: voiding a GCash receipt also rejects its payment and re-derives its bill, in one transaction. |
| 055 | Removes the GCash test payments and the demo profiles' records. |
| 056 | Corrected one receipt's rent period that the import misread from a typo in the workbook. |
| 057 | Deletes the last demo profile, which showed as a former tenant who never lived there. |
| 058 | Made a repair's tenant optional, so the owner can log a repair for an empty unit. |
| 059 | Gave the one ended tenancy with no end date the date it ended. |
| 060 | Locked `record_income_for_months` like every other function (pinned `search_path`, no PUBLIC execute). |
| 061 | Removes what the testing day's rehearsal tenant left in the books. |
| 062 | Added the owner's August 2026 receipts (15) and expenses (34) from her updated workbook; additive only. |
| 063 | Put the name of the person who uses the administrator account on it. |
| 064 | Moved imported expenses to the dates the owner wrote (the import had shifted them). |
| 065 | Added the inquiry's secret-link hash and reference code, so a visitor can follow and answer their inquiry. |
| 066 | Removed the garbage fee entirely; made the invoice number optional and written as `INV#`; renamed the receipt index and the expense supplier column. |
| 067 | Gave active tenants a placeholder email that cannot receive mail until they gave their own (email has since been dropped from the site). |
| 068 | Added `live_version`, the fingerprint that lets open pages update themselves. |
| 069 | Removed what a second test tenant left in the books (part of it was reversed by 071). |
| 070 | Voided two expenses the testing-day walkthrough left. |
| 071 | Turned the evaluation tenant account back on, because 069 had wrongly switched it off. |
| 072 | Wrote acknowledgement receipts one way and left them out of the one-invoice-per-month index (they carry no number). |
| 073 | Gave every tenant a login ID, cleared phone numbers typed in for them, and made every tenant set their own password and phone at next sign-in. |
| 074 | Marked the old "--" payments in her sheets as acknowledgement receipts (317 rows the import had given invented numbers). |
| 075 | Moved the evaluation tenant account into the penthouse, the one vacant unit. |
| 076 | Turned on RLS for the three correction-backup tables. |
| 077 | Made the evaluation account's bills agree with its ledger again. |
| 078 | Rewrote every unit's public description to say only what is known. |
| 079 | Undid what one test session on the live site did to real records on 4 October 2026 (expense lines added, a receipt voided, a tenant moved out). |
| 080 | Took TRUNCATE on `audit_logs` away from the application, so it cannot empty the trail. |
| 081 | Set three units' occupant counts to 2, as the owner confirmed. |
| 082 | Marked two bills Paid that the owner's August receipts had already paid, by adding the payment the receipt route would have added. |
| 083 | Named the administrator as verifier on 082's two payments, so the "every Verified payment names its verifier" check holds. |
| 084 | Put the property's public number on the administrator's account, so her sign-in number and the site's contact number are one number. |
| 085 | Made an inquiry's email optional: the site no longer asks for one. |

**The other files in `database/migrations/`** (no number, not part of the sequence)

| File | What it is |
| :--- | :--- |
| `APPLY_ALL_RBAC.sql` | 001 to 003 joined into one paste-ready file (generated; not edited by hand). |
| `APPLY_PHASE2.sql` | 005 to 010 joined into one paste-ready file, with the production state at the time. |
| `RUN_IN_SUPABASE_2026-09-19.sql` | 035, 036 and 037 joined for one sitting. |
| `RUN_IN_SUPABASE_2026-09-23.sql` | 046, 049 and 050 joined for one sitting. |
| `B61_EDIT_REOPENED_TENANCIES.sql` | Read only: lists tenancies that an old edit bug closed and reopened. |
| `DIAGNOSTIC_rent_period_year_drift.sql` | Read only: how the 030 problem was found. |
| `DIAGNOSTIC_test_data_before_055.sql` | Read only: what 055 would remove and keep. |
| `DIAGNOSTIC_profiles_not_current.sql` | Read only: every account that is not a current tenant, and what it holds. |
| `DIAGNOSTIC_expense_dates_before_064.sql` | Read only: what 064 would change. |
| `DIAGNOSTIC_uncovered_rent_periods.sql` | Read only: month-sized gaps in a current tenant's paid periods. |
| `DIAGNOSTIC_what_is_left.sql` | Read only: whether older queued migrations have run. |
| `DRIFT_DIAGNOSTIC.sql` | Read only: dumps the live catalogue to save as `database/live_schema.csv`. |
| `VERIFICATION.md` | The record of testing 005 to 010 in a throwaway PostgreSQL container. |
| `_TEST_FIXTURE_production_drift.sql` | Never for Supabase: reproduces known differences between the schema file and production, for local tests. |

---

## 5. The scripts

### 5.1 The 21 suites in `npm run check:all`

`scripts/check-all.mjs` runs them in this order and prints a summary table. Read the table, not the
tail. None of them writes to the database. "Needs" says what must be present: **nothing** (runs on a
fresh copy), **.env** (reads the live database with the server key), or **backend** (the API running
with `npm run dev:backend`, plus `credentials/creds.txt` to sign in). Both `.env` and `credentials/`
are gitignored and must be sent separately.

| Suite | What it checks, in plain words | Needs |
| :--- | :--- | :--- |
| `check:secrets` | No password, key or token in any tracked file (also the pre-commit hook) | nothing |
| `check:rules` | The business-rule register (`PHASE1_BR_CROSSWALK.md`) agrees with itself | nothing |
| `check:matrix` | The traceability matrix agrees with itself (rows add up to the summary) | nothing |
| `check:copies` | The gitignored filming copies match the documents of record (skips a pair where neither file exists) | nothing |
| `check:canon` | No live document carries a banned framing (BR-035, unit count, rate escalation, gateway wording) | nothing |
| `check:relations` | Separate records agree: 33 units in 5 clusters, occupancy agrees across three sources, every bill's unit is one its tenant held, bill totals add up | backend |
| `check:tokens` | The interface's colours come from the design tokens | nothing |
| `check:reachable` | Every frontend file can be reached from `main.ts` | nothing |
| `check:components` | Every component a screen renders actually exists | nothing |
| `check:labels` | Every field a person types into has a name for screen readers | nothing |
| `check:liveness` | No screen shows cached or seeded data as if live. 4 of its 7 rules run without the backend and it **still exits 0**; read its `note:` lines | partly backend |
| `check:writes` | No database write in `backend/src` throws away its result | nothing |
| `check:columns` | Every table and column the backend names exists in the live database | .env |
| `check:fields` | Every field the frontend reads is one the API actually sends | .env |
| `check:endpoints` | Every backend route has a caller in the frontend, or a stated reason | nothing |
| `check:ledger` | The owner's money adds up and the business rules hold in the live data | .env |
| `check:reports` | The Excel workbooks agree with the database, month by month | .env |
| `check:adyen` | The HMAC signature code matches Adyen's own library and published example, and the payment return is read correctly | nothing (builds first) |
| `check:billing` | Water, period, due date, overdue and receipt-allocation arithmetic, against the live settings | .env (builds first) |
| `check:concurrency` | The same receipt or checkout sent many times at once is saved once (real handlers, stand-in database) | nothing (builds first) |
| `check:api` | Signs in for real and calls every read endpoint of both roles; checks permissions, the perimeter and input rules | backend |

### 5.2 Other scripts in `scripts/`

| Script | One line |
| :--- | :--- |
| `backup-database.mjs` | `npm run backup`: copies every row of every table to a dated, gitignored `backups/` folder. Run before any data change. |
| `check-all.mjs` | Runs the 21 suites above. |
| `refresh-filming-copies.mjs` | `npm run refresh:copies`: brings the filming copies back in step after `check:copies` fails. |
| `reset-owner-password.mjs` | Reads only, unless given `--confirm`: then gives the administrator a new one-time password and ends her sessions. A live write. |
| `reset-tenant-accounts.mjs` | Gives every tenant a fresh one-time password (printed slips to `credentials/`), forcing a change at next sign-in. A live write. |
| `rotate-demo-passwords.mjs` | Replaced every password that had been published in the repository (run after the September audit). |
| `testing-day-watch.mjs` | Read only: during a testing day, shows who has set a password, who is locked out, and today's requests, by unit code only. |
| `build-chapter-4-diagrams.mjs` | Draws the paper's diagrams (ERD, data flows) as images from the real system. |
| `build-chapter-4-docx.mjs` | Builds Chapter 4 as a Word file in the manuscript format. |
| `build-consent-docx.mjs` | Builds the testing day's consent form as a Word file. |
| `build-uat-signoff-docx.mjs` | Builds the owner's acceptance sign-off form as a Word file. |
| `lib/adminSignIn.mjs` | The one way a suite signs in as the administrator; it refuses to resend a password that was already refused, so the suites cannot lock her account. |
| `ai-use/export-prompt-log.mjs` | Turns this machine's AI session logs into a dated prompt log for the AI-use disclosure (gitignored output). |
| `demo/` (`make-demo-passwords.mjs`, `set-demo-secrets.mjs`, `demo-schema.sql`, `demo-seed.sql`) | Build and fill the separate demo copy (its own database of invented people and money) for outside evaluators; never the live site. |
| `field-tests/` (`offline-and-weak-signal.mjs`, `simultaneous-readers.mjs`, `layout-and-accessibility.mjs`, `owner-screens-layout.mjs`, `print-docs.mjs`) | The browser measurements behind Chapter 4: offline and slow-network behaviour, many readers at once, page width and accessibility (read only), and print versions of the testing-day handouts. |
| `survey/` (`compute-survey.mjs`, `compute-uat.mjs`, `fill-timings.mjs`, `fill-walkthrough.mjs`, `a-md-to-csv.mjs`, `t-md-to-csv.mjs`) | Turn the survey export and the testing-day sheets into Chapter 4's tables. |
| `manuscript/` (`build-final.mjs`, `build-manuscript-docx.mjs`, `docx-from-markdown.mjs`, `build-data-dictionary.mjs`, `build-appendices-j-l.mjs`, `number-by-chapter.mjs`, `check-docx.mjs`, `build-slides.mjs`, `reviewer/build.mjs`) | The manuscript builders: `FINAL/` from its sources, the Word file, Appendix N from the live database, Appendices J and L, the table and figure renumbering list, a checker for the Word file, the defense slides, and the team study page. |

### 5.3 Scripts in `backend/scripts/`

| Script | One line |
| :--- | :--- |
| `bundle-for-vercel.mjs` | Part of `npm run build`: bundles the API into one file so Vercel can run it. |
| `mark-dist-esm.mjs` | Part of the build: marks the compiled output as ES modules. |
| `check-silent-writes.mjs` | `check:writes` (above). |
| `check-column-refs.mjs` | `check:columns` (above). |
| `check-frontend-fields.mjs` | `check:fields` (above). |
| `check-endpoint-reach.mjs` | `check:endpoints` (above). |
| `check-ledger-integrity.mjs` | `check:ledger` (above). |
| `check-report-totals.mjs` | `check:reports` (above). |
| `check-adyen-hmac.mjs`, `check-adyen-return.mjs` | Together `check:adyen` (above). |
| `check-billing.mjs` | `check:billing` (above). |
| `check-concurrency.mjs` | `check:concurrency` (above). |
| `check-api-contract.mjs` | `check:api` (above). |
| `check-auth-hardening.mjs` | Not in `check:all`: confirms the sign-in protections are still in place and that the breached-password check really answers. |
| `check-contact-rules.mjs` | Targeted test: the emergency contact number rule. |
| `check-expense-kinds.mjs` | Targeted test: adding her own expense kind (stand-in database). |
| `check-income-edit.mjs` | Targeted test: a corrected receipt stays with the tenancy that covered its period. |
| `check-list-reads.mjs` | Targeted test: voided receipts hidden from tenants; the payment list reads past 1,000 rows. |
| `check-recent-actions.mjs` | Targeted test: "Your recent actions" shows only the caller's own, as sentences. |
| `check-sign-in-change.mjs` | Targeted test: the administrator's change of number or password. |
| `check-standing-move.mjs` | Targeted test: moving units does not wipe what was owed. |
| `check-ticket-cancel.mjs` | Targeted test: a tenant cancelling their own repair request. |
| `check-ticket-done.mjs` | Targeted test: the tenant is told once when a repair is done; a repair on an empty unit. |
| `hmac-fingerprint.mjs` | Prints a one-way fingerprint of an Adyen HMAC key, so two people can confirm they hold the same key without reading it out. |
| `measure-endpoints.mjs` | `npm run measure`: times the read endpoints (needs the backend and credentials). |
| `measure-doc-citations.mjs` | Counts how many line-number citations in the traceability matrix still point at the right route. |
| `simulate-adyen.mjs` | `npm run simulate:adyen`: posts correctly signed notifications that the system must refuse or ignore to the running API, then reports what it left (audit rows only, by design). Needs the backend and `.env`. |
| `tmp-bill.mjs` | A one-off, read-only check that bills come out right after migrations 035 and 037. |

The frontend's own suite scripts are in `frontend/scripts/` (`check-design-tokens.mjs`,
`check-reachable.mjs`, `check-components.mjs`, `check-labels.mjs`, `check-liveness.mjs`), with
`screen-contract.mjs` (writes `docs/SCREEN_CONTRACT.md`) and `check-income-filing.mts` (a targeted
test of which month a receipt is filed under).

---

## 6. Questions the panel could ask about the backend and database

1. **"Where is the line that stops a tenant from calling an admin endpoint?"**
   `backend/src/routes/admin.ts`, the first `router.use('/admin', requireAuth, requirePasswordCurrent, requireAdmin)`.
   It covers every admin route at once; each route also names its own permission from `config/rbac.ts`.

2. **"How do you stop a tenant reading another tenant's bills?"** Tenant routes never take a room or
   tenant id from the request; they use the signed-in profile and `services/scopeService.ts`. The
   database adds RLS with no policies, so the public key reads nothing (migration 002).

3. **"What happens when a tenant moves out but still has the app open?"** `vacate` marks the account
   inactive, and `requireAuth` re-reads the profile on every request (`middleware/auth.ts`,
   `authService.resolveAuthUser`), so the next request is refused.

4. **"How does sign-in work without email?"** `services/authService.ts` `login`: anything with `@` is
   refused like an unknown account; otherwise `resolve_login_identifier` (migration 073) matches the
   login ID or the phone number. Five wrong passwords lock the account for 15 minutes.

5. **"What if the owner presses Save twice on a receipt?"** The unique index
   `idx_one_invoice_per_unit_per_month` refuses the second one (migrations 033, 066, 072), and the
   route turns that into a clear 409. `check:concurrency` proves it on every run. A receipt with no
   invoice number is guarded only by the route's read-before-write (judgement log 3.6b).

6. **"Can the payment gateway mark a bill as paid on its own?"** No. `services/adyenWebhookHandler.ts`
   writes a payment as Pending Verification only; the owner verifies it in
   `PATCH /admin/payments/:paymentId/verify`, which calls `settle_verified_payment`.

7. **"How do you know a webhook really came from Adyen?"** `services/adyenWebhook.ts` checks the HMAC
   signature on every item before any is applied, in constant time; `check:adyen` tests it against
   Adyen's own library.

8. **"Why are some writes in database functions?"** The database library cannot open a transaction,
   so writes that must happen together (verify, record a multi-month receipt, void, save an expense
   with its split) are done in one PostgreSQL function, all or nothing (migrations 010, 018, 019, 029,
   054).

9. **"Can someone change or delete the audit trail?"** No. Migration 002 removed UPDATE and DELETE,
   migration 080 removed TRUNCATE; `services/auditService.ts` only inserts.

10. **"How is the 50% Share computed?"** It is a generated column in `monthly_income_records`, equal
    to `rent_amount / 2.0`: a system-computed figure equal to half that row's Rent Amount, kept for
    ledger parity with the owner's historical spreadsheet. No code can write it.

11. **"How is water computed, and do rates go up automatically?"** `services/billingService.ts`
    `computeWaterFee`: occupants times the rate in `system_settings` (₱200 each). Rates never change by
    themselves; the owner sets each one by hand and the trigger from migration 020 records every
    change in `room_price_history`.

12. **"What stops two GCash payments for one bill?"** Checkout is refused while a payment on the bill
    awaits verification, and for 15 minutes after a checkout opens (`bills.checkout_opened_at`,
    migration 051, `routes/tenant.ts`); the Adyen session expires inside that hold
    (`services/adyenService.ts`).

13. **"Why can't you delete a unit?"** `DELETE /admin/rooms/:roomId` deletes only a unit with no
    history; the ledgers' foreign keys are RESTRICT (migration 005), so the database also refuses.

14. **"How do you change the live database safely?"** Only by a new numbered migration, after
    `npm run backup` (`scripts/backup-database.mjs`); no reset, no ad-hoc update. Many migrations have
    guards that stop if the rows are not exactly what was expected.

15. **"How do you know the code still works?"** `npm run check:all` (21 suites, Section 5.1). For
    example, `check:ledger` re-derives the owner's money from the live data, and `check:api` calls
    every endpoint both roles use without writing anything.
