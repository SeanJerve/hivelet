# Everything we need from Mrs. Fe Galang Da Silva — one sitting

**Prepared 2026-09-17** for the client meeting. Hivelet, Group 4, IT 124 Capstone 2.

Every item below was found by checking her **actual records** — 937 income rows, 1,262 expense
entries, 33 units — not by guessing. Nothing here has been changed in her data. **We have never
written to her ledger.**

> **A note on names.** This document uses unit numbers, receipt numbers, dates and amounts rather
> than residents' names, because it lives in the project repository. Running `npm run check:ledger`
> prints the same seven receipts **with** the names, on screen only, for cross-checking against her
> own book during the meeting.

**How to use this:** work top to bottom. Section 1 is money and takes the longest. Section 2 is
five accounting habits, in the order they are easiest to answer, **plus 2f — three things the
system had to guess, added 2026-09-19, of which the rent question is the single most valuable
thing in this document.** Section 3 is three quick confirmations. Section 4 is not for her.

> **A separate round of ten questions — about how the business runs rather than about her books —
> was answered on 2026-09-17 and is recorded in [`CLIENT_ANSWERS_2026-09-17.md`](CLIENT_ANSWERS_2026-09-17.md).**
> Read its findings before this sheet: **two of those answers contradict decisions closed on
> 2026-09-13 and 2026-09-17** (the grace period, and whether the deposit is refundable), and both
> need one more question put to her. Sections 1, 2 and 3 below are untouched by that round.

---

## 1. Seven receipts that cannot be right as written

These are in her ledger now. **None has been altered.** Each needs her to say what the correct
figure is, from her own receipt book.

### 1a. Two impossible dates

| Receipt | Unit | Recorded date | Amount | The problem |
| :--- | :--- | :--- | ---: | :--- |
| `OR#4839` | **2g** | **17 Jan 1900** | ₱6,500 | 1900 is what Excel shows when a date cell never read properly. Its rent period says **9 Dec 2025 – 8 Jan 2026**, but the row is filed under **December 2024**. |
| `INVOICE#5120` | **1c** | **26 Feb 2027** | ₱8,000 | A year in the future. The rent period says **26 Feb – 25 Mar 2026**, so this looks like `2027` typed where `2026` was meant. |

**What we need:** the real payment date on each.

- `OR#4839` actual date paid: ____________________  and is it **Dec 2024** or **Dec 2025**? ____________
- `INVOICE#5120` actual date paid: ____________________

### 1b. Three rent periods that end the day before they start

| Receipt | Unit | Period as recorded | Amount |
| :--- | :--- | :--- | ---: |
| `OR#4757` | **1h** | 3 Aug 2024 → **2 Aug 2024** | ₱6,000 |
| `OR#4775` | **2b** | 30 Aug 2024 → **29 Aug 2024** | ₱8,000 |
| `OR#4872` | **1h** | 3 Feb 2025 → **2 Feb 2025** | ₱6,000 |

Each covers **minus one day**. Almost certainly the end date should be a month later —
`OR#4757` would run to **2 Sep 2024** — but that is us guessing, and this is her ledger.

**What we need:** confirm the end date should be one month after the start on all three.
☐ Yes, one month later   ☐ No — correct dates: ____________________

### 1c. Two receipt numbers used twice

| Receipt | Used for | Amounts | Why it matters |
| :--- | :--- | ---: | :--- |
| `OR#4774` | **Unit 3f** paid 22 Aug 2024, and **unit 3g** paid 3 Sep 2024 | ₱6,500 each | Same resident, two units, **twelve days apart**. One of the two numbers is likely a transcription slip. |
| `OR#4813` | **Unit 2a** and **unit 3a**, both on 1 Nov 2024 | ₱8,000 and ₱9,000 | **Two different residents, same day, one receipt number.** Two people cannot share one official receipt. |

`OR#4813` is the one to settle first — it is ₱17,000 across two households.

**What we need:** the correct receipt number for whichever entry is wrong.

- `OR#4774` — which unit keeps the number? ☐ 3f ☐ 3g. The other's real number: ____________
- `OR#4813` — which unit keeps it? ☐ 2a (₱8,000) ☐ 3a (₱9,000). The other's real number: ____________

> **Note:** a receipt covering several months of arrears on several rows is **normal and correct** —
> `OR#4895` legitimately covers four months. We checked, and built the duplicate guard around it, so
> the system will not reject her arrears settlements. The seven above are different: the same number
> against **different tenants or different units on unrelated dates**.

---

## 2. Five things about how she keeps the books

### 2a. The ₱20 garbage fee stopped after June 2025 — was that deliberate?

We found this by counting, not by being told:

| Period | Rows carrying the ₱20 fee |
| :--- | :--- |
| 2024, all 12 months | **357 of 366** — ₱7,140 |
| Jan–Jun 2025 | **174** — ₱3,480 |
| **Jul 2025 onward — 15 straight months** | **0** |

So it is **₱20 every month on every unit**, not an annual charge as our earlier notes assumed —
and **it stopped completely after June 2025**.

**What we need:**
☐ Stopped on purpose — the system should no longer offer it
☐ Stopped by accident — it should still be charged, and the missing months need adding
☐ Paused — it will come back

### 2b. August and September 2026 collections are not in the ledger

Her records run **complete through July 2026** (last payment recorded 7 Aug 2026). Today is
**17 September**. So **two months of collections are not entered anywhere.**

This is not a fault in the system — it is simply data that has not been typed in. But it means a
demonstration today shows *"0 collections this month"*.

**What we need:**
☐ She will provide August and September so we can enter them before testing
☐ Leave it — we will say plainly that the ledger is complete through July

### 2c. Penthouse spending is in three different places, and none of them is the Penthouse

On **13 September she decided** the Penthouse should have its own expense area (OD-15). It was
created that day, and marked as a **rental** cost. **It has never been used — zero entries.**

Meanwhile the spending that mentions the penthouse sits in three other areas:

| Where it is now | Entries | Amount | Counts as a rental cost? |
| :--- | ---: | ---: | :--- |
| **Other Expenses / Personal** | 5 | **₱35,228.00** | **No** — outside Net Operating Income |
| Back Apartment | 4 | ₱11,075.00 | Yes |
| Boarding House | 7 | ₱8,895.00 | Yes |
| | **16** | **₱55,198.00** | |

The area was created; the history was never moved into it. Only the ₱35,228 changes the profit
figure — while it sits under *Personal*, the property reads ₱35,228 more profitable than if that
spending were counted as a cost of the rental business.

**What we need:**
☐ Move all ₱55,198 into the new **Penthouse** area
☐ Move only the ₱35,228 — the other two are correctly filed where they are
☐ Leave everything where it is; the Penthouse area is for future spending only

### 2d. Linda's fixed water — which column is it?

The two Linda units (**LF ₱400, LB ₱200**) pay a fixed water charge rather than the ₱200-per-head
rate. The same money currently lands in **two different columns** depending on when the row was
written:

- the **62 migrated rows** put it in `linda_water_charge`
- a **newly entered row** puts it in `water_payment`

That matters because the *Remitted Amount* is calculated as rent **+** `water_payment`. So a new row
counts Linda's water as remitted money and an old one does not — **the same payment, two different
totals.**

**What we need:** is Linda's fixed water part of the remitted amount?
☐ Yes — it is remitted like any other water payment
☐ No — it is recorded separately and not remitted

### 2e. In 2025, ₱2.56 million was booked as personal rather than as a rental cost

Read straight from her ledger. **She is profitable every year** — this is not a loss:

| | 2024 | 2025 | 2026 (7 months) |
| :--- | ---: | ---: | ---: |
| Rent, water and garbage collected | ₱3,218,140 | ₱3,051,880 | ₱1,826,850 |
| **Costs of running the rental** | ₱933,347 | ₱1,184,778 | ₱272,470 |
| **Net Operating Income** | **₱2,284,793** | **₱1,867,102** | **₱1,554,380** |
| | | | |
| *Main House (her residence)* | *₱150,039* | ***₱1,226,941*** | *₱60,508* |
| *Other Expenses / Personal* | *₱365,829* | ***₱1,333,701*** | *₱295,974* |
| **Booked as NOT a rental cost** | ₱515,868 | **₱2,560,641** | ₱356,482 |

**Main House spending was eight times higher in 2025 than in 2024**, and Other/Personal three and
a half times higher. That is almost certainly a real year — building work on her own house would
do exactly this — but it is ₱2.5 million sitting outside the rental accounts and **only she can
confirm it belongs there.**

**What we need:**
☐ Correct — 2025 was an unusual year for the house, and none of it is a rental cost
☐ Some of it should be a rental cost: ____________________________________

---

## 2f. Three things the system had to guess, because her book does not spell them out · **added 2026-09-19**

> **Say this first, and mean it: nothing is broken and no money is missing.** Nobody has used the
> system to take a payment yet, so none of this has reached a tenant. When her records were copied
> in, three things her book does not state outright were filled in with a placeholder, and the
> same placeholder went onto every unit. These are the three, in the order worth asking.

### 2f-i. What is the rent for each unit today?

**This is the big one and it is worth most of the meeting.** The system still holds the prices from
when the units were first set up. Her receipts show tenants paying **about 1.6x more** than that on
average — 31 of 33 units disagree with the stored rate.

**Why it matters now:** the rent a tenant is shown, and charged, when they pay online comes from
that stored price. **If a resident paid through the portal today they would be asked for roughly
half of what they owe** — across the property, ₱91,850 a month short. The public website advertises
from the same number, which is why the Penthouse is listed at ₱12,000 when it last let for ₱30,000.

**How to ask it, and it is one question, not thirty-three:** print the list of what each unit last
paid, put it in front of her, and ask *"are these right?"* Her ledger already implies every answer;
she only has to confirm or correct.

**Do not infer the rates and write them in.** A rent paid may include something agreed for that
month. She sets rates; the system records them.

### 2f-ii. What day of the month does each tenant's rent start?

The system currently believes **every** resident's rent starts on the **1st**. Her book says
otherwise for 29 of the 32: 1a has run from the **7th for 31 straight months**, B2F the 21st, LB
the 25th, LF the 13th, B2B the 3rd — each unbroken across its whole recorded history.

**Sixteen can be read straight out of her receipts** and need no question. **Sixteen cannot**, and
these are the ones to ask about:

| | which units | why her book cannot settle it |
| :--- | :--- | :--- |
| end of the month | **3c, B3B**, and less cleanly **2g, 3d, 1e** | the receipts follow the last day — 31st, 30th, 28th in February — then sit on the 28th from March 2026. Probably "end of the month", but probably is not good enough to write into her records |
| changed this year | **1b, 1g, 1h, 2c, 2e, 2f, 3b, 3f, 3g, B3F, F2F** | the day moved at some point in the last year. Either the resident changed or the day was renegotiated, and the book cannot say which |

**Why it matters:** this day decides what period a receipt covers and when a bill falls due. Every
receipt entered from now on would be stamped with the wrong month for those units — and worse, the
system would flag the administrator as being wrong when she typed the **correct** dates.

### 2f-iii. How many people live in these seven units right now?

Water is ₱200 a head (BR-014), so this number is money. The system currently thinks **one person
lives in every unit**.

Most can be read from her receipts. **Seven changed within the last four months**, and a change
that recent is as likely to be real as a slip — so they need her, not a guess:

| | units |
| :--- | :--- |
| went up to 2 recently | **1h, B3B, B3F** |
| dropped to 1 recently | **2e, 3b, 3d, 3g** |

**Tell her this while the subject is open, as a check rather than a complaint:** her own records
show **1b and 1f each holding 3 people in a 2-person unit**, and have done for eleven straight
months. That is a fact about the property rather than an error, and the system records a note
whenever a payment is taken for more people than a unit holds. It is worth confirming she knows.

### 2f-iv. One word on her screen

Her admin screen calls the move-in money **"Advance rent"** in four places. On 2026-09-17 she
described that money as the **deposit** — held while the tenant lives there, spent at move-out on
fixing and maintaining the unit, and *"whatever is left of that entire expenses will be refunded."*

**Nothing has been renamed.** "Advance" is her own word and may well be what she wants to keep.
**Ask: should the screen say "Deposit", or leave it as "Advance rent"?** Either is fine; we only
need to know which she reads more easily. The amount itself is correct and is not changing.

---

## 3. Two quick confirmations (we have already chosen a sensible default)

We picked the option that matches her existing spreadsheet. She only needs to say "yes" or correct us.

> **A third row was here and has been removed.** It asked whether the expense category cumulative
> restarts each January. **It does** — read out of the built report and checked against every
> month of 2024, 2025 and 2026, where each month's figure is exactly the previous month's plus
> its own. Carried as **OD-07**; settled by the implementation and by `check:reports`, which now
> asserts the whole chain. Her time is better spent on the rows that are genuinely open.

| | What we assumed | Confirm |
| :--- | :--- | :--- |
| **Date format on reports** | `D-MMM-YY` — e.g. `3-Aug-24` — which is what her own sheet shows. | ☐ Correct ☐ Use DD/MM/YYYY |
| **Adding expense categories** | The 13 categories are fixed and only we can change them. | ☐ Fine ☐ She should be able to add her own |

**Two real questions left, not confirmations:**

**Should a resident be able to tell her they have paid?**

Today there are exactly two ways a payment reaches the system:

| | |
| :--- | :--- |
| **GCash** | The resident pays through the portal. A payment appears for her to verify, automatically. |
| **Cash or bank transfer** | **She types it in herself.** The resident has no way to say anything. |

So if a resident hands her cash on a Tuesday and she records it on Friday, there is nothing in
between — no record, and no way for them to ask *"did you get it?"*

The original design had a form for this: the resident enters what they paid and it waits for her
approval, exactly as a GCash payment does. It was never built, and **nothing would be marked paid
without her** — an unverified entry is only a claim until she confirms it.

It is a policy choice, not a technical one. Some owners want it; some find it creates arguments
about what was or was not handed over.

☐ Yes — let residents report a cash payment for me to confirm
☐ No — I record every payment myself; keep it that way

**And the last one:**

**The bottom-of-page total on her income sheet.** One page shows `1,179,150` while that month's own
subtotal is `232,350`. We read the big figure as a **year-to-date running total** carried down the
page, but we have not been able to prove it from the numbers alone.

☐ Year-to-date running total   ☐ Something else: ____________________

---

## 3b. Four things her public website tells strangers, that nobody has confirmed

**This one is quick, and it is the only section where a wrong answer is visible to people who
are not her.** The public pages quote these as policy to anyone who visits. Two of the four,
we can check against the system. **The other two exist nowhere except on that page** — not in
the database, not in the settings, not in the code — so there is no way to verify them and no
way to notice if they go out of date.

| | What the site says | Can we check it? |
| :--- | :--- | :--- |
| **Water** | *"a fixed standard rate of **₱200 per head** monthly"* | **Yes — matches the configured rate.** |
| **Rents from** | *"**₱4,500/mo**"* as the headline starting price | **Yes — that is the cheapest of the 33 units, and 7 of them are at it.** |
| **Electricity** | *"billed at actual consumption rate (**₱12.50 / kWh**)"* | **No.** That figure is not stored anywhere. It was typed onto the page. |
| **Meter reading day** | *"Readings are recorded on the **25th** of every month"* | **No.** Nothing in the system records or enforces a reading day. |

**So, two questions:**

**Is ₱12.50 per kWh still what you charge?**

☐ Yes, that is right   ☐ No, it is ₱________ / kWh   ☐ It varies — we should not print a figure

**Do you read the meters on the 25th?**

☐ Yes, the 25th   ☐ No, it is the ________   ☐ It varies — we should not print a date

> *Why it is worth thirty seconds: the water rate and the ₱4,500 are pinned by a check now, so
> if either drifts the build says so. These two cannot be, because there is nothing to pin them
> to. If either is wrong, the site has been telling prospective residents the wrong thing, and
> nothing in the system would ever notice.*

---

## 4. Not for her — Sean's calls

These need no client input. **Every row re-verified 2026-09-17**, because four of them had
quietly become untrue and would have sent someone to redo finished work.

### Still open

| | Item |
| :--- | :--- |
| ~~**Do first — security**~~ **DONE 2026-09-17** | ~~**Three logins belong to nobody.**~~ Migration `023` applied; all three read `inactive`, nothing else moved. Original note: **Three logins belong to nobody.** Three **duplicate** profiles from the 2026-08-27 import — zero tenancies, zero ledger rows, but `active` and holding a working password on the shared literal. The real residents have separate, complete profiles. **`database/migrations/023` is written and not applied.** One statement, run by hand. *Do not strip the invoice numbers from the names: that was the original plan and it would make the duplicates indistinguishable from the real residents.* |
| **Product** | An administrator bills screen, or retire `GET /admin/bills` — confirmed still present at `backend/src/routes/admin.ts:1160`. Five superseded endpoints to delete or wire. |
| **Demo** | **No unit has a photograph.** `room_photos` holds **0 rows** across all 33 units — checked today. The upload path works; it has simply never been used. |
| **Later** | The vite 8 upgrade. 4 advisories, all devDependencies, none shipped. Not something to do days before a defense. |

### Closed, with the evidence — do not redo these

| | Was | Verified 2026-09-17 |
| :--- | :--- | :--- |
| **Rotate the two demo passwords** | both in GitHub history since 25 Aug | **Already done 13 Sep.** The current pair appears in **0 commits**; the old pair returns **401 `INVALID_CREDENTIALS`** against the live login. Rotating again would only break whichever machine still holds the old `creds.txt` |
| **`current_user_role()` returns `'admin'`** | fatal the moment any RLS policy called it | **Migration `022` applied.** It returns `NULL`, which fails closed in both spellings |
| **A change-password screen** | no way to change a password inside the product | **Built and wired** — `ChangePasswordModal.vue`, reachable from `AppHeader.vue:409` |
| **`VIDEO PRESENTATION DOCS/` is gitignored** | three corrections existed on one machine only | **Now tracked.** `git check-ignore` returns nothing for it |

> *A task list is a claim with a date on it, exactly like a code comment. Four of these had been
> true, stopped being true, and nothing about them said so. The password row was the dangerous
> one: acting on it today would have invalidated credentials being handed to a second machine.*

---

## What she does not need to be asked

Recorded so no one re-opens them in the meeting. Each was listed as an open question and is in fact
**already decided and built**:

| | Settled |
| :--- | :--- |
| Mid-cycle vacancy | **Rent is never prorated.** A tenant leaving mid-month owes the whole month; nothing is refunded. |
| The move-in sum | It is **advance rent**, not a refundable security deposit. |
| "Main House" | **Her own residence** — a non-rental area, confirmed 13 Sep 2026. |
| Grace period | **There is none.** Late payment is not accepted. |
| Rate increases | **No automatic increase of any kind.** She sets rates by hand; only the history of changes is kept. |
| Penthouse and Linda expense areas | Penthouse has its own category; Linda books to Back Apartment. |
| Floors | 33 units over four floors — **11 / 11 / 10 / 1**. |

---

*Prepared from the live database on 2026-09-17. Every figure in this document was read from her
records, and nothing in them was modified.*
