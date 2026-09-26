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

---

## Fix log

(filled in as fixes land)
