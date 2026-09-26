# Final review before the defense, 2026-09-26

Scope: the places where a mistake costs the owner money or exposes a tenant's data. Online
payments, money recorded or changed by hand, billing, access, and this week's new features.

How this was done: a cloud session with no `.env` and no credentials, so nothing here was run
against the live database or a running backend. Every finding below is proved by reading the code
and, where a fix was made, by a targeted test that fails before the fix and passes after it. Each
entry says what it was verified against.

Findings are ranked by money or data at stake. Status is one of **FIXED** (commit named),
**OPEN** (needs a decision or a migration, and why), or **NOT A DEFECT** (looked wrong, is not).

---

## F1. A GCash session stays payable for an hour; the guard against paying twice lasts 15 minutes

- **Where:** `backend/src/services/adyenService.ts`, `createCheckoutSession`, the body sent to
  `POST /sessions` (no `expiresAt`); the hold is `CHECKOUT_HOLD_MS` in
  `backend/src/routes/tenant.ts`.
- **What breaks:** the tenant checkout refuses a second session on a bill for 15 minutes after the
  first one opens (migration 051). The Adyen session itself is created with no `expiresAt`, so Adyen
  keeps it payable for its default of one hour. `AdyenPaymentModal.vue` leaves the Drop-in mounted
  until the tenant closes the dialog. After 15 minutes the hold lapses while the first session can
  still take money.
- **Trigger:** tenant opens Pay in tab A at 10:00 and leaves it. At 10:16 opens Pay in tab B; the
  hold has lapsed, a second session opens, tenant pays in B. Before the webhook arrives (or at any
  point before the admin verifies, if they go back to tab A), tab A's Drop-in is still live and
  takes a second full payment for the same bill. Two pspReferences, so neither the idempotency
  lookup nor the unique index sees a duplicate. The tenant is charged twice.
- **Severity:** high. One bill's full amount charged twice to a tenant's GCash.
- **Fix:** send `expiresAt` equal to the hold, so no session outlives the guard that protects it.
- **Status:** **FIXED** in `981e2ac`.

## F2. Voiding an income row does not reopen the bill it settled, so the debt stays closed

- **Where:** `backend/src/routes/admin.ts`, `DELETE /admin/income-records/:id`. It sets
  `voided_at` on the one `monthly_income_records` row and nothing else.
- **What breaks:** a settled payment writes three records: the income row, a `payments` row marked
  Verified, and the bill marked Paid. Voiding reverses only the first. Two readings of the same
  tenant then disagree:
  - `readStanding()` reads income rows, skips voided ones, and shows the period as owed again.
  - The bill still reads Paid, and `outstandingOnBill()` still counts the Verified payment, so it
    reports nothing outstanding.
- **Trigger:** the one the system itself recommends. A GCash payment is verified, then a
  CHARGEBACK or REFUND arrives. `adyenWebhookHandler.ts` notifies the owner to "void the payment
  here if the money really has gone back". She voids the income row. The tenant's portal still
  shows the bill Paid. When the tenant presses Pay, the checkout finds no unpaid bill, raises one
  for the owed period, collides with the Paid bill on `idx_one_bill_per_tenant_per_period`, reads
  it back, finds 0 outstanding, and answers 409 "No unpaid bill could be resolved". The reversed
  money cannot be collected online, and the tenant is told they owe nothing.
  The same happens after voiding an on-site receipt that was applied to an open bill (for example
  one recorded against the wrong unit): the wrong tenant keeps a Verified payment and a Paid bill
  for cash they never handed over.
- **Severity:** medium. No money is lost from the ledger (the void is recorded), but a real debt
  reads as settled on the tenant's side and cannot be paid online.
- **Why not fixed here:** reversing it means choosing which `payments` rows belong to a voided
  income row. For a GCash settlement that is exact (`transaction_reference` = pspReference,
  `payment_method = 'Adyen Online'`). For an on-site receipt it is not: one receipt covering three
  months writes three income rows but its payments are allocated across bills in aggregate
  (`allocateReceipt`), so voiding one of the three has no single right answer. That is a decision
  about how a void should behave, and it touches three tables with no transaction available from
  supabase-js. It wants a database function like `settle_verified_payment` (migration 018), not
  more awaits in a route.
- **Proposed shape:** a `void_income_record(p_id, p_by, p_reason)` function that, in one
  transaction, voids the row and, only when the row is a GCash settlement, marks the matching
  `Adyen Online` payment as reversed and sets its bill back to Due or Partially Paid from the
  remaining Verified payments. On-site receipts keep today's behaviour until the owner says what a
  void of one month of a multi-month receipt should do.
- **Status:** **FIXED in code** in `e2c2a27`, by the proposed shape: migration 054 adds
  `void_income_record()`, and the route calls it (falling back to the plain void until it is
  applied). **Migration 054 is written and tested, not applied** (B-71).

## F3. Money coming in files a payment under the month it was paid; the Overview and the Excel export file it under the month it is for

- **Where:** `frontend/src/views/IncomeCollectionsView.vue`, `matchesExceptCluster` (the year and
  month filters) and `collectionsByMonth` (the month chart). Both parse `r.datePaid`, the display
  string of `date_paid`.
- **What breaks:** every other money figure files an income row by its `year`/`month` columns,
  which are the month the rent covers: the Overview (`r.year === CURRENT_YEAR`, `r.month`), the
  Excel export (`.eq('year', year)`), and the page's own year list (`yearsList` is built from
  `r.year`). Only this page's filter and chart used the date paid. Her book files by the month the
  rent covers; the create path says so and counts it (216 rows follow the period, 50 the date).
  With the shared year added this week, one pick now shows two different totals for the same year
  on two screens, and the Excel file the page exports for that year matches neither of the page's
  own totals.
- **Trigger:** rent for January 2026 paid on 28 December 2025, which is how she collects (OD-03,
  "the closing days of a month for the month ahead"). Pick 2025: the page counts it in 2025, the
  Overview and `hivelet-income-2025.xlsx` do not. Pick 2026: the reverse.
- **Size, from her source spreadsheet** (`INCOME AND EXPENSES PAST RECORDS/`, the file B-27
  reconciled against; a quick parse caught 661 rows, so treat these as approximate): 25 rows sit
  in a different year by date paid, worth about ₱209,200 of rent and water. By year, 2024 reads
  about ₱113,400 lower on this page than on the Overview, and 2026 about ₱53,400 higher. About 221
  rows sit in a different month. Two rows with a mistyped payment year (1900 and 2027) could only
  ever be seen under All years.
- **Also:** the month chart summed rent + water + garbage, where the Overview's month capsules
  and the page's own "Rent + water" total sum rent + water. Garbage has been zero since June 2025,
  so this only shows for 2024 and early 2025.
- **Severity:** high for the defense and for her trust in the numbers. No row is wrong, but two
  screens and a spreadsheet disagree about what came in for a year.
- **Fix:** filter and chart by `r.year` / `r.month`, the same fields the Overview and the export
  use, and chart rent + water. No API, calculation or wording change.
- **Status:** **FIXED** in `c451f4f`.

## F4. A refund Adyen refused is announced to the owner as a refund that happened

- **Where:** `backend/src/services/adyenWebhookHandler.ts`, the non-AUTHORISATION branch of
  `applyNotificationItem`. The `REVERSAL_EVENTS` message is chosen by `eventCode` alone; `success`
  is computed and never consulted for it.
- **What breaks:** for a modification event, Adyen's `success` says whether it happened. A
  `REFUND` with `success: "false"` means the refund request was refused and the money is still in
  the owner's account. The handler sends the same High-priority notification either way: "Adyen
  reports that this payment has been refunded to the payer ... void the payment here if the money
  really has gone back." The same holds for `CANCEL_OR_REFUND` and `CANCELLATION`.
- **Trigger:** she refunds a mistaken GCash payment from the Adyen Customer Area and Adyen
  refuses it (for example the payment is too old for the method, or the balance is short). The
  notification reads `eventCode: REFUND, success: "false"`. She is told the payer has been paid
  back, voids a payment she still holds, and the tenant's rent disappears from her ledger. Nothing
  tells her the refund needs retrying.
- **Also:** `CAPTURE_FAILED`, `EXPIRE` and `TECHNICAL_CANCEL` are missing from the map, so they
  are audited and answered silently. Each means an authorisation that is sitting in her
  verification queue as "Pending Verification" will never become money. Verifying it books rent
  that never arrived.
- **Severity:** high. The wrong instruction, on the screen she acts from, about real money.
- **Fix:** when `success` is false on a modification event, say plainly that it did NOT happen
  and that nothing needs voiding; add the three missing events.
- **Status:** **FIXED** in `63df720`.

## F5. The new duplicate-payment warning cannot see a GCash payment still waiting to be verified

- **Where:** `frontend/src/components/modals/OnsitePaymentModal.vue`, `findOverlappingPayments`.
  It reads `incomeRecords` only. A GCash payment is not an income row until the owner verifies it;
  until then it is a `payments` row in `Pending Verification`.
- **What breaks:** the one double collection the system still allows goes past the warning
  written to catch it. The reverse order is already closed (a recorded receipt moves the tenant's
  standing and pays the bill, so checkout will not charge that period again). This order is not:
  - the tenant pays by GCash; the webhook records it as Pending Verification;
  - before she verifies it, the tenant also pays cash at the counter (the GCash screen was
    unclear, or they forgot);
  - she records the cash. `allocateReceipt` counts Verified payments only, so the bill is still
    open, the cash settles it, and the warning finds no income row, so it says nothing;
  - she verifies the GCash payment. `settle_verified_payment` books a second income row for the
    same period.
- **Trigger:** unit 2e pays ₱6,900 by GCash at 21:00; at 08:00 next day the tenant hands over
  ₱6,900 cash. The confirm dialog shows no warning. After verification the ledger holds ₱13,800 for
  one month and the tenant has paid twice.
- **Severity:** medium. The money is real and recorded, but it was collected twice from a tenant,
  and the month's income is overstated until someone notices.
- **Fix:** the modal also loads the verification queue and lists any payment waiting to be
  verified for the same unit in the same warning banner, in the same words and style.
- **Status:** **FIXED** in `6471a28`.

## F6. Phone-first sign-in gives iPhones a keypad with no letters, so an email cannot be typed

- **Where:** `frontend/src/views/LoginView.vue`, the sign-in identifier input, `inputmode="tel"`
  (added in `b6a5ab1` this week).
- **What breaks:** the field accepts a phone number or an email, and its own comment says it is
  `type="text"` so that neither is refused. `inputmode="tel"` asks the phone for a telephone
  keypad. On iOS that keypad has digits, `*`, `#` and `+` only, with no key to switch to letters.
  Anyone whose account signs in by email cannot type it on an iPhone.
- **Trigger:** the owner, or any account with no phone number on file, opens the site on an
  iPhone and taps the field. No `@`, no letters.
- **Severity:** medium. Not money, but it can lock the one person who verifies payments out of
  the system on her phone. Whether it bites depends on which accounts have a phone number, which
  this session cannot read.
- **Fix:** drop `inputmode`. The label and placeholder still lead with the phone number, which
  was the change asked for; the keyboard is the ordinary one, which types both.
- **Verified against:** the HTML standard's definition of `inputmode="tel"` (a telephone keypad)
  and iOS's tel keyboard layout. Not tried on a device from this session.
- **Status:** **FIXED** in `722ebf5`.

## F7. A month skipped and a later month paid reads as nothing owed

- **Where:** `backend/src/services/standingService.ts` `readStanding` and
  `backend/src/services/billingService.ts` `computeStanding`. Paid-through is the single latest
  `rent_period_end` on a verified, unvoided receipt; owed periods start the day after it.
- **What breaks:** a gap in her records before the latest receipt is invisible. The tenant
  portal's Amount due, the tenant's standing and the checkout (which bills `owedPeriods[0]`) all
  read from this.
- **Trigger:** a tenant paid through 31 July, skipped August, and paid September in cash. She
  records September. Paid-through becomes 30 September, the portal says nothing is due, and the
  checkout refuses to bill August. August's rent is never asked for by the system.
- **Severity:** medium. A month's rent can go uncollected with nothing on screen to say so.
- **Why not fixed here:** the fix is to find the earliest uncovered period since the tenancy
  started, not the one after the latest. That changes what every tenant is told they owe, and it
  would run over 937 imported rows whose periods came from her book and do not tile cleanly (16
  anniversaries are still placeholders, B-32). Done without measuring it against the live rows
  first, it could show tenants debts they do not have, the week of the defense. It needs a
  read-only count of how many active tenancies have a gap, and Sean's decision.
- **Status:** **DECIDED, not auto-billed.** Measured against her source spreadsheet: her book
  holds real month-sized holes (2026: unit 3d mid-May to mid-June, unit 2f November to February)
  beside formatting noise, and whether each is owed is her fact. Standing is unchanged; the holes
  go to her as a read-only list, `database/migrations/DIAGNOSTIC_uncovered_rent_periods.sql`
  (`4bda6b5`, checked in PGlite). B-72. **Run on the live data 2026-09-26: no rows**, after a
  first version that trusted tenancy start dates was corrected. The 3d hole in her spreadsheet
  is a typed period (INV#5182 entered as 1 to 31 May on a 15th-to-14th cycle), leaving two weeks
  uncovered, not a missed month. No hidden arrears.

---

## F8. Money going out and the Overview page the ledgers on a date alone, so a row can be counted twice or not at all

- **Where:** `backend/src/routes/admin.ts`, `GET /admin/expense-entries` (ordered by
  `expense_date` only) and `GET /admin/income-records` (ordered by `date_paid` only). Both read
  in 1,000-row pages with `.range()`. Also `notificationService.getNotifications`
  (`created_at` only) and the income export (`month, date_paid, invoice_number`, not unique).
- **What breaks:** PostgreSQL gives no fixed order among rows that tie on the sort key, and
  each page is a separate query. A receipt dated the same day as the thousandth row can come
  back on both pages, or on neither. The browser sums whatever arrives, so the Overview, Money
  going out and Money coming in can be off by whole entries, differently on each load. The PostgreSQL
  manual says so directly: without an ORDER BY that fixes the order, LIMIT and OFFSET "will
  give inconsistent results".
- **This is live for expenses today.** The frontend asks for `/admin/expense-entries` with no
  year, and 2025 alone holds 837 entries (`expenseReportExport.ts` says so), so the expense list
  is already more than one page. Income is 937 rows and passes 1,000 at about 33 rows a month,
  around November.
- **Already known in one place:** `expenseReportExport.ts` added `.order('id')` for exactly this
  reason, with a comment saying so. The list endpoints the screens use never got it.
- **Severity:** high. The totals the owner reads and presents can silently be wrong.
- **Fix:** end every paged ordering on `id`, and teach `check:writes` to refuse a `.range()`
  read whose ordering does not end on a unique key.
- **Status:** **FIXED** in `7aa28ec`.

## F9. Moving a receipt to the right unit leaves it credited to the wrong tenant

- **Where:** `backend/src/routes/admin.ts`, `PATCH /admin/income-records/:id`. A new
  `roomNumber` rewrites `room_id`; `tenant_profile_id` and `assignment_id` are never touched.
- **What breaks:** the edit dialog on Money coming in offers every unit with its tenant's name,
  and the route's own comment says moving the row "is the point of supplying the number". But a
  tenant's standing (`readStanding`: paid-through, the portal's Amount due, what the GCash checkout
  bills) is read by `tenant_profile_id`, not by unit. After the move:
  - the tenant who actually paid still has that period uncovered, so the portal says it is owed
    and the checkout will charge it again;
  - the tenant it was wrongly entered against keeps it, so their unpaid month reads as paid.
- **Trigger:** cash from unit 2B is recorded against 2A by mistake. She opens the row, picks 2B,
  saves. 2B's tenant opens the portal, sees the month due, and pays it again by GCash.
- **Severity:** high. The correction she is offered for a wrong-unit entry produces a double
  charge on one tenant and a hidden arrear on another.
- **Fix:** when the unit changes, re-attribute the row to the tenancy of the new unit that covered
  the row's rent period (by `start_date`/`end_date`), or to nobody if none did. The payments rows
  from the original entry are the F2 problem and stay with it.
- **Status:** **FIXED** in `2d236ef`.

## F10. A receipt for a period before the current tenancy is credited to the current tenant

- **Where:** `backend/src/routes/admin.ts`, `POST /admin/income-records`. `assign` is the unit's
  ACTIVE tenancy, whatever period the receipt covers, and it decides `tenant_profile_id`,
  `assignment_id` and whose open bills `allocateReceipt` settles.
- **What breaks:** a former tenant settling arrears for a unit that has since been let again. The
  receipt is credited to the new tenant, and its money pays down the new tenant's open bill. The
  same happens when a tenant who moved rooms pays an old room's arrears.
- **Trigger:** Z left 2B in February owing January. Y has lived in 2B since March and has an open
  September bill (raised when Y opened the GCash screen). Z pays January in cash; she records it
  against 2B with the January dates. Y's September bill is marked Paid with Z's money, the row
  carries Y's id, and Z's debt is still open against nothing.
- **Severity:** medium. It needs a re-let unit and an open bill, but then one tenant's payment
  closes another tenant's debt.
- **Fix:** the same rule as F9. The tenancy that covered the receipt's rent period pays; the
  active tenancy only when none did. The period derivation and the occupant carry-forward still
  read the active tenancy, as before.
- **Checked against the live data, and corrected (2026-09-26).** Sean ran the first check query
  read-only: 6 of 44 receipts in 2026 would have been credited differently. All six were unit 1a,
  January to July 2026, paid by Lobby Toor. In 1a the seeded demo tenancy (Mark Cruz,
  2025-06-05 to 2026-08-25, no income rows) overlaps hers, which is dated 2026-07-01 although
  she has paid 1a since 2024. The rule trusted dates that do not describe what happened. It now
  gives a receipt to a past tenancy only on a clean hand-over (that tenancy ended on or before
  the day the current one began); overlapping tenancies fall back to the current tenant, as
  before F10. Fixed in `f96967a`, with the 1a shape added to the test. Re-run this read-only
  query. It lists only receipts where the corrected rule credits someone OTHER than the old
  code would have (the unit's current tenant), which is exactly what F10 changes. Each row it
  returns should be a former tenant who really did pay that month:

  ```sql
  SELECT rm.room_number AS unit, mir.rent_period_start, mir.invoice_number,
         pr.full_name AS credited_now, pa.full_name AS old_code_credits, pn.full_name AS new_code_credits
    FROM monthly_income_records mir
    JOIN rooms rm ON rm.id = mir.room_id
    LEFT JOIN profiles pr ON pr.id = mir.tenant_profile_id
    LEFT JOIN LATERAL (
      SELECT ra.* FROM room_assignments ra
       WHERE ra.room_id = mir.room_id AND ra.start_date <= mir.rent_period_start
         AND (ra.end_date IS NULL OR ra.end_date >= mir.rent_period_start)
       ORDER BY ra.start_date DESC LIMIT 1) cov ON true
    LEFT JOIN LATERAL (
      SELECT ra.* FROM room_assignments ra
       WHERE ra.room_id = mir.room_id AND ra.is_active LIMIT 1) act ON true
    LEFT JOIN profiles pa ON pa.id = act.tenant_profile_id
    LEFT JOIN profiles pn ON pn.id = CASE
         WHEN cov.id IS NULL THEN act.tenant_profile_id
         WHEN act.id IS NULL OR cov.id = act.id
           OR (cov.end_date IS NOT NULL AND cov.end_date <= act.start_date) THEN cov.tenant_profile_id
         ELSE act.tenant_profile_id END
   WHERE mir.voided_at IS NULL AND mir.year = 2026
     AND pn.id IS DISTINCT FROM act.tenant_profile_id
   ORDER BY rm.room_number, mir.rent_period_start;
  ```

  A first version of this query compared the rule against today's crediting instead, and on
  the live data it listed 9 receipts in 1g, 3b and 3g paid by tenants who have since moved
  (Jan to Mar 2026). Those are not changes: their earlier tenancies are not in the table, so
  the old and the new code both credit a new receipt for those months to the current tenant.
  F10 cannot improve units whose history was never recorded; it does not make them worse.

  **Result on the live data, 2026-09-26: no rows.** Run read-only by Sean after `f96967a`. On
  today's data the corrected rule credits every 2026 receipt exactly as the old code did; it
  only acts on a clean re-let, and there is none on record yet.

  Checked in PGlite against the 1a shape and a clean re-let: 1a stays with the current tenant,
  and only a genuine mismatch is listed.
- **Status:** **FIXED** in `02fb01a`.

## F11. Moving a tenant to another unit wipes their arrears from what they are shown

- **Where:** `backend/src/services/standingService.ts` `readStanding`, which passes the ACTIVE
  tenancy's `start_date` as `tenancyStart`; `computeStanding` never counts a period before it.
  A room move (`PATCH /admin/tenants/:profileId`) ends the old tenancy and starts a new one
  dated today.
- **What breaks:** everything owed from before the move day disappears from the portal's Amount
  due and from what the checkout will bill, although the tenant never left the property.
- **Trigger:** a tenant paid through 31 August and owes September. On 26 September she moves
  them from 2A to 2B. Their standing now starts on 26 September: 1 to 25 September is no longer
  owed anywhere the system looks.
- **Severity:** medium. Room moves are rare, but each one can erase up to a month's rent.
- **Fix:** standing counts from the start of the tenant's continuous stay: the current tenancy
  and every earlier one that ran into it with no gap (an end on or after the day before the next
  began). A tenant who left and came back later still starts fresh.
- **Status:** **FIXED** in `5acef2c`.

## F12. A resident back from a successful GCash payment is told it could not be confirmed

- **Where:** `frontend/src/views/TenantPaymentsView.vue` `handleGatewayReturn` and
  `backend/src/services/adyenService.ts` `confirmCheckout`.
- **What breaks:** the return leg from GCash. The page sent Adyen's `redirectResult` as a
  `sessionResult`, which the session-result endpoint cannot read; and the checkout session it
  looks up lives in one process's memory, which on Vercel is often not the instance the resident
  comes back to. Either one alone ends in the warning.
- **Found:** live, 2026-09-26, on the first GCash test payment that ever went through
  (`NDQW3Z5ZQL8MNB75`, after Adyen fixed the acquirer account, B-74). The payment, the webhook
  and the verification queue were all right; the resident's screen said "Could not confirm
  your payment here".
- **Severity:** medium. No money is at risk and the wording tells them not to pay again, but
  every successful GCash payment ended on a warning, in front of the person who just paid.
- **Fix:** the return leg asks Adyen with `POST /payments/details` and the `redirectResult`,
  server to server. Its answer carries the pspReference and our merchantReference, so the bill,
  its owner and "recorded" are all read from the database, not from memory. Still writes nothing.
- **Status:** **FIXED** in `4863695`. Confirmed against a stub of Adyen, not yet against Adyen
  itself: the next GCash test payment should end on "Payment received".

## Low severity, recorded and left

- ~~**The merchant account check passes an empty value.**~~ **FIXED** in `45ef05e`
  (`check:adyen` fails without it). `adyenWebhookHandler.ts` refuses a
  notification for another merchant account only when `merchantAccountCode` is present. The field
  is HMAC-signed, so an empty one cannot be forged; it can only come from Adyen. Worth tightening
  if the webhook is ever shared.
- ~~**The verification queue dates a GCash payment in the viewer's time zone.**~~ **FIXED** in
  `3b2358c`.
  `IncomeCollectionsView.vue` formats `paid_at` with no `timeZone`, the B-59 display shape. A
  payment at 07:00 Manila shows the day before to a browser in the Americas. Display only; the
  ledger row is dated in Manila (`propertyParts`).
- ~~**A hardcoded phone number on the no-gateway cashier page.**~~ **FIXED** in `c8187a0`
  (now 0900 000 0000). It is still in the git history, which is not rewritten here. `routes/public.ts` prints
  "Auto-fill Tenant Phone: 0906 354 9001". The page returns 404 whenever the gateway is
  configured, so production never serves it. If that number belongs to a real person, it should
  not be in the repository.
- **A tenant can be told their GCash session is "no longer available" after paying.** The
  sessions `confirmCheckout` looks up live in memory, and production runs on Vercel, where the
  confirm request can reach a different instance. The wording is safe ("Do not pay again", and
  the webhook still records the payment), so it confuses rather than costs.
- **A tenant who has moved out can still file a repair request against their old unit.**
  `POST /tenant/tickets` scopes to current and historical rooms (`scopeService.ts`). Nothing of
  the new tenant's is read or changed, but the request lands on someone else's unit.

## Checked and clean

These were read for the defect classes in the brief and nothing survived:

- **Webhook authentication.** Basic Auth (both-or-neither, constant-time, non-short-circuiting),
  HMAC over the eight fields with Adyen's own library as the reference, every item verified before
  any is applied, and the verifier never throws.
- **Webhook idempotency and failures.** Lookup scoped to the unique index's predicate, `23505`
  treated as a duplicate, permanent failures acknowledged rather than retried forever, and a
  failed item making the whole batch retry safely.
- **Verification.** `settle_verified_payment` locks the row and is idempotent; Verified to
  Rejected is refused; a compare-and-set stops two administrators overwriting each other; partial
  payments leave the bill Partially Paid.
- **Checkout.** Ownership check on an explicit bill, the pending-payment refusal on both branches,
  the one-row conditional UPDATE for the hold, and migration 038's index catching a double tap.
- **On-site receipts, edits and voids.** Duplicate and cross-unit receipt guards, one row per
  month through a database function, water derived rather than typed, the double-void guard.
- **Expenses.** Create and edit go through database functions that derive the total from the
  allocation rows; allocations are validated before anything is written.
- **Access.** `/admin` is gated as a whole (`requireAuth`, `requirePasswordCurrent`,
  `requireAdmin`), every tenant route filters on the caller's own profile id, and no public route
  returns a tenant's name or contact (a separate read of every public and tenant route found
  nothing).

---

## Fix log

| | Finding | Commit | Proved by |
| :-- | :--- | :--- | :--- |
| F1 | GCash session outlives its hold | `981e2ac` | `check:adyen`: 4 new assertions failed before, pass after; moving the expiry past the hold fails again |
| F3 | Money coming in filed by date paid | `c451f4f` | `node frontend/scripts/check-income-filing.mts`: 9 of 10 failed on the old logic, 10 of 10 pass, in Manila and New York time |
| F4 | A refused refund announced as a refund | `63df720` | `check:adyen` drives the real handler: 8 new assertions failed before, 71 of 71 pass; disabling the fix fails 4 |
| F5 | Warning blind to a pending GCash payment | `6471a28` | The real modal in Chromium, API answered locally: no warning before, the pending payment listed after |
| F6 | iPhone keypad cannot type an email | `722ebf5` | Rendered DOM: `inputmode="tel"` before, absent after. Not tried on a device |
| F8 | Ledger lists paged on a date alone | `7aa28ec` | `check:writes` gains a rule: failed on these 4 reads before, passes after, fails again with one tiebreak removed; request checked as `order=expense_date.desc,id.asc` |
| F9 | A moved receipt keeps the old tenant | `2d236ef` | `node backend/scripts/check-income-edit.mjs` drives the real edit handler, database stubbed: 3 of 7 failed before, all pass after |
| F10 | Old-period receipts credited to the current tenant | `02fb01a`, corrected in `f96967a` after the live check | The same script drives the real create handler: 4 of 15 failed on the previous route, 15 of 15 pass |
| F11 | A room move wipes arrears from standing | `5acef2c` | `node backend/scripts/check-standing-move.mjs` drives the real `readStanding`, database stubbed: 3 of 5 failed before, 5 of 5 pass |
| F12 | Back from GCash, told it could not be confirmed | `4863695` | `node backend/scripts/check-adyen-return.mjs` (in `check:adyen`) drives the real service, Adyen and the database stubbed: no redirect path before, 14 of 14 after, 4 mutations each fail it. Chromium, API answered locally: warning before, "Payment received" after |
| F2 | A void leaves the bill Paid | `e2c2a27` | Migration 054 run unchanged in PGlite: 14 of 14; the route's void checks: 5 failed before, 23 of 23 pass. **054 not applied** |
| F7 | A skipped month reads as paid | `4bda6b5` | Decided: a read-only report, not auto-billing. SQL checked in PGlite against fixtures |

**Nothing here changed live data or the schema.** One migration was written, 054, and it is
not applied (B-71). F1 changes the
request sent to Adyen when a session is created: after it deploys, one real checkout is worth
opening to confirm Adyen accepts the `expiresAt` (it is in Adyen's documented request, and a
refusal would show as "The payment gateway did not accept this checkout").
