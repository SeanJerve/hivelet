# Rehearsal — every write path, once, before testing week

**Written 2026-09-17.** Hivelet, Group 4.

## Why this exists

The write paths are covered by eighteen verification suites and **have never been used for real**.
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

Eighteen green. If `check:api`, `check:billing` or `check:adyen` fail to connect, the backend is not
running — `npm run dev:backend` first. Run it again at the end: a suite that was green before and
red after tells you exactly what the rehearsal broke.

**Screen names below are the ones in the sidebar**, read from `AppSidebar.vue` rather than
remembered: *Executive Overview, Room & Rate Directory, Active Tenants, Income & Collections,
Monthly Expenses, Maintenance Dispatch, Prospect Inquiries, System Audit Trail* — and for a
resident, *Unit Overview, Payment & Billing, Maintenance Tickets, My Profile*. **If the redesign
renames any of them, these steps need renaming with it.**

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
| 7 | Open **Room & Rate Directory**, edit `PH`. Change the rate from ₱12,000 to ₱12,500 and save. | Saved. This also writes a `room_price_history` row — by database trigger, so the history cannot drift from the rate. | ✍ |
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

> [!NOTE]
> **A resident's "My Bills" is empty, and that is correct.** There are **2 bills** in the whole
> database against **32 active tenancies** — because bills are **raised on demand**, not generated
> monthly (judgement log § 3.6). All **32** residents do have receipts: their payment history lives
> in the income ledger, which is the record Mrs. Da Silva actually keeps.
>
> So a panel signing in as a resident sees **no bill and a full payment history**. That is the
> design, not a gap — but it is a question worth being ready for rather than meeting live.

---

## Phase 4 — Administrator, the money

Back to the administrator.

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 18 | **Record an on-site collection** for `PH`. Receipt number **`REHEARSAL-001`** so it is findable. | Written to the ledger, bills settled against it. **This is the path no real collection has ever taken.** | ✍ |
| 19 | Record **the exact same receipt again** — same unit, number, date and amount. | Refused: *"Receipt REHEARSAL-001 is already recorded for unit PH on …"* If it accepts it, the duplicate guard is broken and the ledger can double-count. | |
| 20 | Open **Prospect Inquiries**. Reply to the enquiry from step 3, then close it. | Message posts; status moves to **Closed**. | ✍ |
| 21 | Open **Maintenance Dispatch**. Move the rehearsal ticket to In Progress, then Resolved, then delete it. | Each transition saves. `PH` returns from **Under Maintenance** to **Occupied**. | ✍ |
| 22 | Add an expense entry against **Penthouse**, ₱100, description *"REHEARSAL"*. Then edit the amount, then delete it. | Each step saves; allocations recompute. | ✍ |
| 23 | Download **income.xlsx** and **expenses.xlsx**. | Real workbooks that open in Excel. Check `REHEARSAL-001` appears in the income sheet, and that the **LINDA** line is present — ₱18,600 across 2024–2026. | |

| 23b | **The one that proves a wrong number cannot hide.** With the dashboard open, **stop the backend** (Ctrl-C in its terminal), then reload the page. | Every money tile shows **—** and *"Figures unavailable — refresh to retry"*. **It must not show ₱0.00, and Net Operating Income must not equal Gross Inflow.** Before 17 Sep a failed expense fetch showed the whole year's takings as profit. Restart the backend and reload; the real figures return. | ✍ |

**Undo 18:** delete the `REHEARSAL-001` income record from the ledger view.
**Undo 22:** already deleted in the step.

---

## Phase 5 — Teardown

| # | Do | Should see | ✍ |
| :-- | :--- | :--- | :-- |
| 24 | Vacate the rehearsal tenant from `PH`. | Tenancy ends, `PH` returns to **Available**, the account goes inactive. | ✍ |
| 24b | **Immediately after step 24, run `npm run check:relations`.** | Its pinned line must still read **16** ended tenancies with no end date — **not 17**. This is the one step that proves the vacate path records *when* a tenancy ended. The code has written `end_date` since 2026-09-16, and **no human has used that path since**, so this is the first correctly-dated row the system will ever have produced. If the count rises to 17, the date was not written and **B-11 is a code defect rather than a data gap**. | |
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

## What the numbers on screen were checked against, 2026-09-17

Every headline figure on the money screens was read out of the interface and compared against a
direct query. **All of them matched.** Worth knowing before a panel asks, and worth re-checking if
the redesign touches these views.

| Screen | Shows | Database |
| :--- | ---: | ---: |
| Income ledger — total gross rent | ₱7,772,250 | ₱7,772,250 |
| Income ledger — 50% column, BH rows | ₱2,343,375 | ₱2,343,375 |
| Income ledger — water collections | ₱314,000 | ₱314,000 |
| Income ledger — total remitted | ₱8,086,250 | ₱8,086,250 |
| Income ledger — spreadsheet parity line | ₱5,742,875 | ₱5,742,875 |
| Expenses — total disbursed | ₱5,823,586 | ₱5,823,586 |
| Overview — FY 2026 to date | ₱1,826,850 | ₱1,826,850 |
| Overview — occupancy | 32 / 33, 1 vacant | 32 / 33, 1 vacant |

**Net Operating Income was the one to check hardest**, and it is right. January 2026 on screen:
revenue **₱259,250**, operating **₱58,179**, *"Personal (not deducted)"* **₱71,559**, NOI
**₱201,071**. The query returns 259,250.00 / 58,179.05 / 71,558.85 / 201,070.95.

The important part is the wording: **"Personal (not deducted)"**. Main House and Other/Personal are
shown beside the figure rather than folded into it, so the screen says what it is excluding instead
of quietly excluding it. That is the right answer to the ₱2.5M question on the client sheet — the
system is not hiding that spending, it is declining to call it a cost of the rental business.

**One thing to know before a demo:** the income ledger sorts newest first, so the **first row is
`INVOICE#5120`, dated 26 February 2027** — one of the seven receipts awaiting the owner. It is the
first thing anyone sees on that screen. Either settle it with her first, or be ready to say what it
is.

---

## What this rehearsal cannot tell you

Stated plainly, so nobody claims more than was done.

| | |
| :--- | :--- |
| **A completed GCash payment.** | Step 15 stops at Adyen's page. A real payment writes a `Pending Verification` row and fires the webhook — worth doing **once**, with the tunnel up, if you want the verification path exercised end to end. Only then does step 18's sibling path (`PATCH /admin/payments/:id/verify`) get used. **If you do it, try this:** verify the payment, then press **Reject** on the same row. It must refuse, and the refusal must tell you to void the income record instead. Before 17 Sep it accepted — reopening the bill while the money stayed booked in the ledger. Guarded in code; never yet exercised by a human. |
| **Concurrency.** | One person clicking. Two administrators recording the same receipt at the same moment is not covered: the **on-site receipt** guard is a read-then-write, not a database constraint (deliberately — judgement log § 3.6b). Two paths *are* now hard-guarded and neither is exercised here: the **gateway reference** carries a unique index (migration `024`), and **verifying a payment** locks its row and re-checks the status, so a second verify returns `already_done` rather than posting a second ledger line. Rejecting is compare-and-set on the status read, so a stale queue cannot overwrite another administrator's decision. |
| **Volume.** | The ledger is ~1,500 rows. It has never been asked to render or export ten years of them. |
| **13 test payments are visible.** | The `payments` table holds 15 rows from the build window - 8 `ADYEN-GCASH-*` and 7 `CASH-REC-*`, PHP 67,000 across the 13 with no bill. **Nothing sums them**, so no figure the owner reads is wrong, and her ledger is `monthly_income_records`. But they show in the admin payments list, so know they are there before a panel asks. |
| **August and September 2026.** | Not in the ledger at all — see `CLIENT_MEETING_QUESTIONS.md` §2b. A demonstration today shows *"0 collections this month"* because the data is absent, not because the figure is wrong. |

---

*Every path listed above is exercised by the suites at the API level. What has never been tested is
a person doing it through the interface — which is the only thing testing week actually measures.*
