# Rehearsal — every write path, once, before testing week

**Written 2026-09-17.** Hivelet, Group 4.

## Why this exists

The write paths are covered by fifteen verification suites and **have never been used for real**.
Not once. Every one of the 937 income rows and 1,262 expense entries came from the 2026-08-28
migration — no collection has ever been recorded through the interface, by anybody.

That is the single largest risk going into testing. This document turns it into about **forty
minutes of clicking**, in an order where each step sets up the next, with what you should see and
what it means if you do not.

## Read this first

> [!WARNING]
> **There is no staging database. This writes to the owner's live records.**
>
> Every step that writes is marked ✍, and every one of them has an **Undo** line. Do them in
> order — the undo steps run in reverse at the end. Nothing here touches an existing resident,
> an existing receipt, or an existing expense.
>
> **The rehearsal unit is `PH` (Penthouse, ₱12,000, floor 4).** It is the only unit not currently
> occupied — 32 of 33 are. Everything is done against `PH` and a made-up tenant, so no real
> person's record is involved.

**Before you start**

```bash
npm run check:all
```

Fifteen green. If `check:api`, `check:billing` or `check:adyen` fail to connect, the backend is not
running — `npm run dev:backend` first. Run it again at the end: a suite that was green before and
red after tells you exactly what the rehearsal broke.

Keep a note of anything that does not match the "should see" column. **A step that fails is the
point of doing this** — better now than in front of the panel.

**And once, from scratch, after the passwords are rotated:**

```bash
cd frontend && rm -rf dist && npm run build && cd .. && npm run check:secrets
```

`check:secrets` reads whatever `dist/` happens to be sitting there, so scanning an old build
proves nothing about the current code. **Deleting it first is what makes the scan mean something.**

This matters because of what happened: the login page's demo panel put **34 passwords and every
resident's name, email and unit number** into the built bundle, and it stayed there from
2026-08-25 until it was found. The code is fixed — a clean rebuild on 2026-09-17 carried **no
passwords and no resident addresses**, checked both by the suite and by hand.

**Do it again after rotating the two demo passwords.** The fix keeps secrets out of the bundle by
loading the demo list only in development; a new password added the wrong way would go straight
back in, and the only thing that would notice is this command.

---

## Phase 1 — Public site, signed out

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 1 | Open the public site signed out. Browse the unit catalogue. | 33 units. Every one **without a photo** — `room_photos` is empty, which is expected and is worth deciding about before filming. | |
| 2 | Open a unit's detail. | Rate, floor, cluster, occupancy. No resident name anywhere — the public payload carries nothing tenant-shaped. | |
| 3 | Send an enquiry from a unit page. | "Thank you" confirmation. **If you get *"Too many enquiries from this connection"*, that is the new per-IP limit doing its job** — ten per fifteen minutes from one address. Wait it out or use another connection. | ✍ |

**Undo 3:** the enquiry appears in **Inquiries**; close it in step 20, or delete the `inquiries` row.

---

## Phase 2 — Administrator, setting up

Sign in as the administrator.

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 4 | **Change Password** from the account menu. Type the wrong current password first, deliberately. | *"That is not your current password."* against the field — **and you stay signed in.** If you get bounced to the login screen, stop and say so: that is the failure this was built to avoid. | |
| 5 | Now change it for real, to something you will remember. | Toast: *"Password changed."* You stay signed in. | ✍ |
| 6 | Sign out, sign back in with the **new** password. | Works. | |
| 7 | Open **Unit Directory**, edit `PH`. Change the rate from ₱12,000 to ₱12,500 and save. | Saved. This also writes a `room_price_history` row — by database trigger, so the history cannot drift from the rate. | ✍ |
| 8 | Onboard a tenant into `PH`. Use an obviously fake name — *"REHEARSAL Test"* — a phone number you control, move-in date today. | Created, and `PH` flips to **Occupied**. | ✍ |
| 9 | Try to onboard a **second** tenant with the same phone number. | Refused: *"That phone number already signs someone in to the portal."* | |
| 10 | Edit the rehearsal tenant — change the occupant count to 2. | Saved. | ✍ |

**Undo 5:** none needed — keep the new password, the old one is burned anyway.
**Undo 7:** set `PH` back to ₱12,000 (the history keeps both changes, which is correct).
**Undo 8/10:** step 24 vacates them; delete the `profiles` row afterwards.

---

## Phase 3 — The resident's side

Sign in as the rehearsal tenant from step 8.

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 11 | Open the overview. | Unit `PH`, the rate, occupancy. No photo — same as step 1. | |
| 12 | File a maintenance ticket **with a photo attached**. | *"...has been submitted to Landlady Fe Galang Da Silva for review."* If the photo fails, you get the **same message plus** *"the photo could not be attached — reply to it with the photo instead."* **You must not see "Submission failed" for a ticket that exists** — that was the bug fixed on 17 Sep. | ✍ |
| 13 | Post a message on that ticket. | Appears in the thread. | ✍ |
| 14 | Open **My Profile**, change the emergency contact. | Saved. | ✍ |
| 15 | Start a **GCash payment** for a bill. | Adyen's hosted checkout. **Do not complete a real payment.** Reaching the page proves the session was created against `checkout-test.adyen.com`. | ✍ |
| 16 | Mark a notification read. | The unread badge drops by one. | ✍ |
| 17 | **Try to reach another resident's data.** In the address bar, change a ticket id to one belonging to someone else. | **404 — not 403.** 403 would confirm the record exists to someone who should not know. Asserted by `check:api`; confirm by hand once. | |

**Undo 12/13:** delete the ticket in step 21.
**Undo 15:** an abandoned checkout writes nothing — the session is in memory and expires.

---

## Phase 4 — Administrator, the money

Back to the administrator.

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 18 | **Record an on-site collection** for `PH`. Receipt number **`REHEARSAL-001`** so it is findable. | Written to the ledger, bills settled against it. **This is the path no real collection has ever taken.** | ✍ |
| 19 | Record **the exact same receipt again** — same unit, number, date and amount. | Refused: *"Receipt REHEARSAL-001 is already recorded for unit PH on …"* If it accepts it, the duplicate guard is broken and the ledger can double-count. | |
| 20 | Open **Inquiries**. Reply to the enquiry from step 3, then close it. | Message posts; status moves to **Closed**. | ✍ |
| 21 | Open **Maintenance**. Move the rehearsal ticket to In Progress, then Resolved, then delete it. | Each transition saves. `PH` returns from **Under Maintenance** to **Occupied**. | ✍ |
| 22 | Add an expense entry against **Penthouse**, ₱100, description *"REHEARSAL"*. Then edit the amount, then delete it. | Each step saves; allocations recompute. | ✍ |
| 23 | Download **income.xlsx** and **expenses.xlsx**. | Real workbooks that open in Excel. Check `REHEARSAL-001` appears in the income sheet, and that the **LINDA** line is present — ₱18,600 across 2024–2026. | |

**Undo 18:** delete the `REHEARSAL-001` income record from the ledger view.
**Undo 22:** already deleted in the step.

---

## Phase 5 — Teardown

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 24 | Vacate the rehearsal tenant from `PH`. | Tenancy ends, `PH` returns to **Available**, the account goes inactive. | ✍ |
| 25 | Delete the `REHEARSAL-001` income record if you have not. | Gone from the ledger. | ✍ |
| 26 | Set `PH` back to ₱12,000. | Saved. | ✍ |

Then:

```bash
npm run check:all
npm run check:ledger
```

**If `check:copies` is red**, a document of record was edited and its filming copy is a
revision behind. One command fixes all nine:

```bash
npm run refresh:copies
```

That folder is gitignored, so the refresh lives only on the machine you run it on. Run it
on the machine you will film from.

**`check:ledger` is the one that matters here.** It will tell you:

- **`room status agrees with tenancy`** — 33 units, 32 Occupied, 32 active tenancies, no drift. If a
  unit is named here, a write stopped halfway and the unit and its tenancy disagree. It says which.
- **`no unrecorded anomaly in 937 income rows`** — if the count is no longer 937, a rehearsal row is
  still in the ledger.
- The **seven receipts awaiting the owner** print every run. That is expected, not a failure.

---

## What this rehearsal cannot tell you

Stated plainly, so nobody claims more than was done.

| | |
| :--- | :--- |
| **A completed GCash payment.** | Step 15 stops at Adyen's page. A real payment writes a `Pending Verification` row and fires the webhook — worth doing **once**, with the tunnel up, if you want the verification path exercised end to end. Only then does step 18's sibling path (`PATCH /admin/payments/:id/verify`) get used. |
| **Concurrency.** | One person clicking. Two administrators recording the same receipt at the same moment is not covered, and the duplicate guard is a read-then-write, not a database constraint. |
| **Volume.** | The ledger is ~1,500 rows. It has never been asked to render or export ten years of them. |
| **13 test payments are visible.** | The `payments` table holds 15 rows from the build window - 8 `ADYEN-GCASH-*` and 7 `CASH-REC-*`, PHP 67,000 across the 13 with no bill. **Nothing sums them**, so no figure the owner reads is wrong, and her ledger is `monthly_income_records`. But they show in the admin payments list, so know they are there before a panel asks. |
| **August and September 2026.** | Not in the ledger at all — see `CLIENT_MEETING_QUESTIONS.md` §2b. A demonstration today shows *"0 collections this month"* because the data is absent, not because the figure is wrong. |

---

*Every path listed above is exercised by the suites at the API level. What has never been tested is
a person doing it through the interface — which is the only thing testing week actually measures.*
