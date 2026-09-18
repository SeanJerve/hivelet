# Blocked — needs Sean's setup

**A queue, not a discussion.** Anything Loyd's side could not finish because of what his machine
or credentials cannot reach goes here, in enough detail that Sean can pull, read one entry, and
act without asking a question.

**Never stop working because of one of these.** Record it, move to the next thing, come back if
Sean clears it. The point of this file is that nobody waits.

---

## How to add one

Copy the block. Keep it short, and make it **actionable without context**: Sean will read this
cold, possibly at midnight, after a day of his own work.

```markdown
### B-00 — one line saying what it is

- **Blocked on:** the specific thing that is missing (Adyen keys, the tunnel, a decision, …)
- **What I was doing:** the task, in one sentence
- **What I already did:** files touched, migrations written, anything ready to go
- **What Sean needs to do:** the smallest concrete action, ideally a command
- **How to know it worked:** the check, or the figure that should change
- **Raised:** YYYY-MM-DD by whom
```

**If the work is ready and only the *applying* is blocked, say so and commit the work.** A
migration that is written, reviewed and just not applied is a good entry. A vague "the payment
thing did not work" is not.

---

## Open

> **Two entries are both numbered `B-01`** — the open one below, and the closed demo-password one
> further down. Left as they are rather than renumbered, in case the new one is already referenced
> somewhere. Worth settling before a third appears, since this queue is referred to by number.

### B-06 — `deposit_amount` was redefined on 14 Sep, and the owner has since contradicted the premise

- **Blocked on:** your call, not access. It is `backend/src/`, it was your change, and it wants a
  decision before the next onboarding rather than a patch from this side
- **What happened:** commit `56c49c0` made `deposit_amount` default to `rooms.current_price` —
  **1× rent** — reasoning *"OD-04 makes that definitional: this sum is ADVANCE RENT, not a
  refundable security deposit."* **Asked on 2026-09-18 whether the move-out repair money is the
  same money as the move-in month's rent, the owner said: *"It's not the same money — it will be
  different."*** So there is a deposit, separate from the advance
- **The uncomfortable part:** the default `56c49c0` replaced was `current_price * 2`, which the
  code describes as *"the familiar one-month-advance-plus-one-month-deposit arrangement, which
  invented a figure that was never collected."* **On her answer, that is the arrangement she
  runs** — so the 2× default may have been right, and was removed on a reading she has since
  contradicted
- **What I already did:**
  - Worked the consequences through in `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5, including why
    **BR-039 as written survives**: *a tenant's **deposit** … **equal to** the Rent Amount* is a
    deposit the size of one month's rent, not a sum that **is** the rent. The 14 Sep
    reinterpretation is the deviation, not the rule
  - Established the blast radius. The deposit is **Column 12** and is **excluded from Column 10,
    Remitted Amount**, so **no owner-facing total moves**. `check:ledger` passes on 937 rows;
    `check:reports` still agrees with both workbooks. **A modelling error, not money going astray**
    — but it lands on the next onboarding, and Q10 says a vacated unit re-lets within days
  - Left `backend/src/` untouched. Two comments there — `admin.ts:577-594` and `:800` — now assert
    something the owner has contradicted, including *"this business collects no separate damage or
    security sum (OD-04, confirmed 2026-09-13)"*
- **What you need to decide:** whether `room_assignments` carries a **second** figure for the
  advance, and what the onboarding default becomes. Then correct those two comments — they are the
  judgement log's own lesson made flesh: a comment explaining why something is safe, carrying a
  date that has now passed
- **What would narrow it without asking her again:** `deposit_amount` against each unit's price
  across the 32 live tenancies. Clustering at **1×** points one way; any at **2×** the other.
  Read-only, and **not run — it needs approval for a production read**
- **The one question still hers**, written out in § 1.5: does a tenant hand over **two** amounts at
  move-in, or just the deposit and their first month as normal
- **How to know it is settled:** BR-039's crosswalk status is re-argued deliberately rather than
  inherited, and an onboarding on `PH` records what she actually collects
- **Raised:** 2026-09-18 by Claude, on Loyd's machine

---

### B-01 — the public landing shows every unit as vacant when `/public/rooms` fails

- **Blocked on:** a decision that is not the design account's to make — this is what a screen
  computes, not how it looks, so per `HANDOFF_TO_DESIGN.md` § 1 it was written down instead of
  reached across for.
- **What I was doing:** rebuilding the public landing's category section. The counts are
  unchanged from the cards that stood there; the redesign only made them legible.
- **What I already did:** nothing to the data path. The category plates read the same
  expression the old cards did: `liveUnits.filter(c.match).filter(u => u.status === 'vacant')`.
- **The defect:** `rooms` is seeded from `CANONICAL_UNITS`, whose `status` is vacant for all 33
  units (`frontend/src/lib/systemState.ts:287`). `fetchRooms()` sets `roomsFetchFailed = true`
  on failure (same file, ~636) **but the seed stays in `rooms`**, and `PublicGuestView` never
  reads that flag. With the backend down the page told me *"10 vacant of 10 units"*, *"15 vacant
  of 15 units"*, *"8 vacant of 8 units"* — 33 of 33 free, on a property that is 32 occupied.
  This is the failure path of the same defect the comment at `PublicGuestView.vue` ~line 121
  says was fixed: the source now fetches live, the *fallback* still publishes the seed silently.
- **What Sean needs to do:** decide what a prospective boarder should see when the room list
  cannot be reached — suppress the counts, or show them with an explicit "availability
  unavailable" state. Either is a small change in `PublicGuestView.vue`; the design account can
  implement the state once the call is made.
- **How to know it worked:** stop the backend, load `/public`. The page must not claim a
  vacancy it cannot verify. With the backend up, the three counts should sum to 1 vacant of 33,
  not 33 of 33.
- **Raised:** 2026-09-17 by the design account (Kiel's machine)

### B-05 — Apply `database/migrations/027` to remove two test repair tickets

- **Blocked on:** Claude Code's safety check refused the live-database change on 2026-09-18,
  although Sean had authorised it in chat. Applying it needs a person.
- **What I was doing:** removing two junk tickets on unit 1A from the live database. Both still read
  Submitted, so they sat on the landlady's overview as open repair requests. One title is a slur.
- **What I already did:**
  - Ran `npm run backup`. The folder is `backups/2026-09-17T17-20-27/` (UTC).
  - Read `pg_constraint`: both foreign keys into `maintenance_tickets` cascade, and neither ticket
    has an attachment or message.
  - Read `pg_trigger`: the table has no triggers.
  - Wrote `027_remove_test_maintenance_tickets.sql`. It identifies the rows by id plus a title
    hash, so the slur is not in the repository, and it aborts unless exactly those two rows match.
    It also removes the one notification that points at a removed ticket. `audit_logs` is left
    alone on purpose.
- **What Sean needs to do:** apply the file's contents to the live database, the same way as
  023. Paste it into the Supabase SQL editor, or approve the `apply_migration` call when asked.
- **How to know it worked:**
  - The migration raises the notice `027: removed 2 test tickets and 1 notification`.
  - `select count(*) from maintenance_tickets` goes from **5 to 3**.
  - The admin overview's *Open repair requests* tile reads *No repair requests are open*.
- **Raised:** 2026-09-18 by Claude, on Sean's machine

---

## The ones already known, carried over

### ~~B-01 — Rotate the two demo passwords~~ — **CLOSED 2026-09-17, it was already done**

**Do not rotate them again.** Doing so would break `check:api`, `check:reports` and three others
on whichever machine still holds the old `creds.txt`, for no gain.

This sat on the list because `Hivelet@Admin2026` and `Hivelet@Tenant2026` are in the public
history. They are — **16 and 21 commits** respectively, and they always will be. What nobody had
checked is whether that still matters. It does not:

| Checked 2026-09-17 | |
| :--- | :--- |
| the **current** passwords in `credentials/creds.txt` | **0 commits** contain either. They were never committed |
| the **old** admin password, tried against the live login | **401 `INVALID_CREDENTIALS`** |
| the **old** tenant password, same | **401 `INVALID_CREDENTIALS`** |
| `check:api` afterwards | **75/75**, which also reset the failed-login counter those two attempts raised |

So the rotation happened on **2026-09-13**, `creds.txt` records it, and the leaked pair opens
nothing. The exposure is historical and closed.

*The lesson is the one from the judgement log, applied to a task list rather than a comment: a
TODO is a claim with a date on it too. This one had been true, stopped being true, and would have
cost an hour and a broken teammate's setup before anyone noticed.*

### ~~B-02 — Apply `database/migrations/023`~~ — **APPLIED 2026-09-17**

Three duplicate profiles from the 27 Aug import were `active` and held a working password on the
shared literal. Applied on Sean's instruction, after `npm run backup` and after re-verifying all
four of the migration's own guards: **0 room assignments, 0 income rows, 0 bills, 0 payments** on
each.

| Read back after applying | |
| :--- | :--- |
| `Mireel Fatima ParcareyINV.#5223` | **inactive** |
| `Nikki ProllamanteINV#5212` | **inactive** |
| `Ron Juliene DominguinoINV.#5227` | **inactive** |

Nothing else moved: active profiles **44 → 41**, active tenancies still **32**, income rows still
**937**, `check:ledger` reports no anomaly and all seven pinned rows are still pinned.

*The invoice numbers stay in the names. Stripping them was the original plan and would have made
these three indistinguishable from the real residents.*

### B-03 — The Adyen webhook is shared, so only one machine can receive at a time

- **Blocked on:** coordination, not access. **Both machines have the keys.** There is one webhook
  registered with Adyen, and it can point at exactly one tunnel
- **What I was doing:** n/a until someone tests a real GCash payment
- **What I already did:** `check:adyen` runs anywhere (29 HMAC checks, no network), so signature
  handling stays covered on both machines regardless
- **What is needed:** whoever is testing starts `cloudflared tunnel --url http://localhost:5000`
  and repoints the webhook at their own URL. **The address changes on every restart** — a reboot,
  a power cut, or closing the terminal — and when it does, payments silently go nowhere. Say in
  the group chat when you take it
- **How to know it worked:** a real payment produces a `Pending Verification` row and the webhook
  handler logs it
- **Never:** generate a new HMAC key unless you are deliberately creating a *second* webhook.
  Adyen issues that key and keeps its own copy to sign with, so a different value makes every
  notification fail verification — indistinguishable from a broken integration, and horrible to
  debug
- **Raised:** 2026-09-17

> **Standing note on this one:** the gateway is **configured and working** against Adyen's
> developer sandbox with GCash. It is not a mock, not a simulator, and not pending a decision.
> `check:canon` fails the build on any document that says otherwise.

### B-04 — Run `TESTING_REHEARSAL.md`

- **Blocked on:** nothing technical — it just needs a person, about forty minutes, and a real
  browser
- **What I was doing:** 26 steps that exercise **every write path once**. No write path in this
  system has ever been used by a human being
- **What I already did:** the document is written, every writing step carries an Undo, and it
  runs on `PH`, the only vacant unit
- **Assigned 2026-09-17: Loyd, tonight.** He has full access and is already in the repository.
  Tick the boxes in the file as you go and commit them — a half-filled sheet is still evidence,
  an unfilled one is not
- **Do the garbage fee while you are in there.** Step 18 records an on-site collection; type a
  **non-zero** GBG figure. Until today that number was collected, added to the total, printed on
  the receipt and recorded as **₱0.00**. It is wired now and **no human has ever entered one**
- **How to know it worked:** the sheet is filled in, and step 23b in particular shows em dashes
  rather than ₱0.00 with the backend stopped
- **Raised:** 2026-09-17
