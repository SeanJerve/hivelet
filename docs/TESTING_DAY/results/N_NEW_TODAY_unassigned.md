# Part N. Shipped on 30 September, N-01 to N-03 (with P-06 and P-06b)

**Owner: ____ (not assigned yet; suggested: Kiel, with the public side).** Results of the testing day, 30 September 2026. **Goes into Chapter 4:** §4.2.3, §4.2.4 and §4.3.7. N-02 and N-03 already have Claude's automated results; add the real-phone result beside them.

> **Done by:** ____ (not assigned yet; suggested: Kiel, with the public side) · **Date:** 30 Sep 2026 · **Device and browser:** ____________ · **Network:** house wifi / mobile data
>
> Edit this file directly: type into the empty cells of the table. Keep one row per case; do not
> delete rows (a case not done is **NT**). No names of tenants or visitors: codes only (T1, PR1, L).
> Commit with a message like `results: N_NEW_TODAY_unassigned.md filled` (pull first).

**How to fill it:** **Result:** **Pass**, **Fail**, **Pass after fix**, or **NT** (not tested). Write what actually happened in the Evidence/Notes cell when it differs from "Should see".

---

Four things went live on the testing day itself. **P-06 and P-06b** above cover the inquiry
conversation (migration 065): run them with a team member's own name and number, Michelle replying
from **Inquiries** (**Save reply**). The other three are below. Write the phone model and browser in
Evidence.

| ID | ISO | Req | Do | Should see | Result | Evidence |
| :-- | :-- | :-- | :--- | :--- | :-- | :--- |
| N-01 | FS, US | FR-011, FR-013 | On a tenant's own account (a testing tenant, with their permission, or during T-05): **Payments** > **Your rent, month by month** | A sentence "Paid up to …" with Up to date / Due soon / Overdue; a bar per month (Paid, Due, Nothing recorded, Not due yet); Months paid, Paid in these months, Due now; **Show each month as a list**. The months and amounts agree with the tenant's own receipts (ask them) | | |
| N-02 | FS, RE | FR-003 | `/category/studio` (then one-bedroom, two-bedroom): tap units quickly one after another, across floors and on the same floor, then stop | The floor plan is always shown for the last unit tapped, never a blank box, without refreshing | Claude, 30 Sep 14:36, headless Chrome on the live site, 390 px and 1280 px, all four categories (33 units): every unit tapped 60 ms apart, two units alternated 40 ms apart, first then last at once; plan visible and loaded after all 20 rounds (20/20). **Real phone: pending** | |
| N-03 | FS, RE | FR-003 | Open `hivelet.vercel.app/public`; read the pop-up | "1 unit is vacant right now" (only `PH` is vacant), then "Viewings are by appointment…" and **Inquire now**. With no signal: the old text, never a number | Claude, 30 Sep: the live pop-up said "1 unit is vacant right now", matching `/api/public/rooms` (32 Occupied, 1 Available, `PH`). **Real phone: pending** | |
