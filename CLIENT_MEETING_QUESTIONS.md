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
five accounting habits, in the order they are easiest to answer. Section 3 is three quick confirmations. Section 4 is not for her.

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

## 3. Three quick confirmations (we have already chosen a sensible default)

We picked the option that matches her existing spreadsheet. She only needs to say "yes" or correct us.

| | What we assumed | Confirm |
| :--- | :--- | :--- |
| **Expense category running total** | The cumulative for each expense category **restarts each January**, rather than running forever. | ☐ Correct ☐ It runs continuously |
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

These need no client input. Listed so nothing is lost.

| | Item |
| :--- | :--- |
| **Do first** | **Rotate `Hivelet@Admin2026` and `Hivelet@Tenant2026`.** In the GitHub history since 25 Aug 2026. Removing them from the current code does not remove them from history. Treat both as burned. |
| **Before any RLS** | `current_user_role()` returns `'admin'` when it cannot identify the caller — which is always. Harmless today (no policy calls it), fatal the moment one does. |
| **Do first — security** | **Three logins belong to nobody.** What was carried as a cosmetic name problem is three **duplicate** profiles from the 2026-08-27 import — zero tenancies, zero ledger rows, but `active` and holding a working password, on the shared literal that has been public since 25 Aug. The real residents have separate, complete profiles. **`database/migrations/023` is written and not applied** — the sandbox refuses `UPDATE` on `profiles`. One statement, run by hand. *Do not strip the invoice numbers from the names: that was the original plan and it would make the duplicates indistinguishable from the real residents.* |
| **Product** | A change-password screen — there is currently **no way to change a password inside the product**. Highest of these. |
| **Product** | An administrator bills screen, or retire `GET /admin/bills`. Five superseded endpoints to delete or wire. |
| **Before filming** | `VIDEO PRESENTATION DOCS/` is gitignored — three corrections made on 16 Sep exist **only on this machine**. Regenerate from `docs/claude_pipeline/outputs/`, or film from the canonical documents. |
| **Demo** | No unit has a photograph — `room_photos` is empty across all 33. The upload path works; it has simply never been used. |
| **Later** | The vite 8 upgrade. 4 advisories, all devDependencies, none shipped. Not something to do days before a defense. |

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
