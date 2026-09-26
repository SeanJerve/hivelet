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
- **Status:** see the fix log below.

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
- **Status:** OPEN. Added to `BLOCKED_FOR_SEAN.md`.

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
- **Status:** see the fix log below.

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
- **Status:** see the fix log below.

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
- **Status:** see the fix log below.

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
- **Status:** see the fix log below.

---

## Fix log

(filled in as fixes land)
