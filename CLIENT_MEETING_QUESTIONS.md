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
four accounting habits. Section 3 is three quick confirmations. Section 4 is not for her.

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

## 2. Four things about how she keeps the books

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

### 2c. ₱35,228 of penthouse upkeep — is it a business cost or a personal one?

It is currently filed under **Other Expenses / Personal**, which is a *non-rental* area. That means
it sits **outside** the Net Operating Income figure — the property looks ₱35,228 more profitable
than if it were counted as a cost of running the rental business.

That may be exactly right. It is a classification choice, and it is hers to make.

**What we need:**
☐ Correct as is — personal, outside the rental business
☐ It is a rental business cost and should reduce Net Operating Income

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

---

## 3. Three quick confirmations (we have already chosen a sensible default)

We picked the option that matches her existing spreadsheet. She only needs to say "yes" or correct us.

| | What we assumed | Confirm |
| :--- | :--- | :--- |
| **Expense category running total** | The cumulative for each expense category **restarts each January**, rather than running forever. | ☐ Correct ☐ It runs continuously |
| **Date format on reports** | `D-MMM-YY` — e.g. `3-Aug-24` — which is what her own sheet shows. | ☐ Correct ☐ Use DD/MM/YYYY |
| **Adding expense categories** | The 13 categories are fixed and only we can change them. | ☐ Fine ☐ She should be able to add her own |

**One real question left, not a confirmation:**

**The bottom-of-page total on her income sheet.** One page shows `1,179,150` while that month's own
subtotal is `232,350`. We read the big figure as a **year-to-date running total** carried down the
page, but we have not been able to prove it from the numbers alone.

☐ Year-to-date running total   ☐ Something else: ____________________

---

## 4. Not for her — Sean's calls

These need no client input. Listed so nothing is lost.

| | Item |
| :--- | :--- |
| **Do first** | **Rotate `Hivelet@Admin2026` and `Hivelet@Tenant2026`.** In the GitHub history since 25 Aug 2026. Removing them from the current code does not remove them from history. Treat both as burned. |
| **Before any RLS** | `current_user_role()` returns `'admin'` when it cannot identify the caller — which is always. Harmless today (no policy calls it), fatal the moment one does. |
| **Data tidy** | Three residents' names carry an invoice number inside the name field. The three `UPDATE` statements are written; the sandbox refuses them, so a person must run them. |
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
