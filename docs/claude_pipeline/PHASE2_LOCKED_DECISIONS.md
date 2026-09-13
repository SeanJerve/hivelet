# PHASE 2 — LOCKED DECISIONS (Group 4)

Decisions confirmed on **2026-09-13** during the Phase 2 STEP 0 alignment.
These are settled. Every Phase 2 and Phase 3 artifact must agree with this file.

`PHASE1_LOCKED_DECISIONS.md` remains binding for everything it covers. This file adds to it and
never contradicts it. Where an item below closes an entry in
`outputs/PHASE1_OPEN_DECISIONS_REGISTER.md`, that register keeps its original text — it is a
submitted Phase 1 deliverable and is not rewritten after the fact.

---

## Closed this round

| ID | Question | Resolution | Schema impact |
| :-- | :--- | :--- | :--- |
| **OD-01** | Income running-total scope | **Both.** Each month shows its own subtotal; the footer carries the running year-to-date. | None — report layer |
| **OD-03** | Mid-cycle vacancy proration | **No proration, ever.** Full month owed regardless of move-out date; nothing refunded. | None — `009` comments |
| **OD-04** | Deposit refund or forfeiture | **No security deposit exists.** `deposit_amount` is advance rent, non-refundable. | `009` (comments only) |
| **OD-05** | "Main House" expense area | **Mrs. Fe's own residence** — personal, not a rental cost. | **`008`** — lookup + `is_rental_expense` |
| **OD-06** | Date format | **`D-MMM-YY`**, matching the source spreadsheet. | None — presentation |
| **OD-07** | Expense cumulative reset | **Resets each calendar year, and is computed, not stored.** | None — deliberately |
| **OD-08** | Editable expense categories | **Fixed.** No write endpoint, no `settings:manage` permission needed. | None — confirms as-built |

---

## 1. OD-05 — Main House is a personal residence, and that changes the arithmetic

This was the highest-impact answer of the round, and it is not merely a labelling question.

`docs/10_MONTHLY_EXPENSES_REPORT.md:27` recorded Main House as *"a new concept not present in the
Monthly Income Report's unit clusters"* whose meaning — "a separate physical structure, the
landlady's personal residence, or something else" — was unconfirmed.

**It is Mrs. Fe Galang Da Silva's own residence.** Those rows are personal household costs that share
a book with the business. They are not a cost of running the boarding house.

The consequence is arithmetic. §5 of the same document gives a real entry: the
`4-Jun-26 Electricbill (May26)` row splits **₱14,964.13** to Boarding House and **₱5,688.67** to Main
House on a single bill. If that ₱5,688.67 is treated as a business expense, **net rental income is
understated by that amount every time a shared bill is split** — and shared bills are routine.

`property_areas.is_rental_expense` (migration `008`) is what lets the income report subtract only the
₱14,964.13. Two of the five areas are non-rental: **Main House** and **Other Expenses / Personal**.

> **Rule for every downstream report:** net rental income sums only allocations whose area has
> `is_rental_expense = TRUE`. **BR-047** reconciliation must state which basis it is using.

## 2. OD-04 — there is no security deposit, so OD-04 needs no schema

The Phase 1 register anticipated adding `deposit_refunded_amount` / `deposit_forfeited_amount` /
settlement-date columns. **That would have been machinery for a workflow that does not exist.**

No separate damage or security sum is ever collected. `room_assignments.deposit_amount` holds
**advance rent** — rent paid ahead of the period it covers — and an unconsumed balance is **not
returned**. The correct fix was to repair the column's *meaning*, which migration `009` does with a
`COMMENT`, so the data dictionary carries the truth and nobody builds a refund screen later.

**The column is not renamed.** It is read by `backend/src/routes/admin.ts:314, :416, :512, :571, :581`
and `backend/src/routes/tenant.ts:52`, and by `frontend/src/lib/systemState.ts:57, :388` and
`frontend/src/views/TenantManagementView.vue:227, :415`. The frontend is read-only for this work
stream; a rename would break it for no functional gain.

## 3. OD-03 — rent is charged whole

A tenant leaving on the 10th owes the full month. Rent is never reduced to days occupied and nothing
is handed back. Collection happens in the closing days of a month for the month ahead, and **late
payment is not accepted**.

## 4. OD-07 — the cumulative is computed, not stored

Per calendar year, via a window function partitioned by year. No column, no roll-forward job, nothing
to drift out of sync with the rows it summarises. This keeps the 3NF claim — a stated deliverable of
Phase 2 — defensible rather than something that has to be excused at the panel.

## 5. OD-08 — the category list is fixed

The thirteen seeded rows stand. No write endpoint, and the `settings:manage` permission that
`docs/11_FORM_FIELD_AUDIT.md:340` flags as *to be added* is **not needed for this**. This confirms the
system as already built (`backend/src/routes/admin.ts:1531-1533` serves them read-only) and keeps
year-on-year expense reports comparable.

---

## Newly open — raised by this round, not yet answered

| ID | Item | Why it matters | Gate |
| :-- | :--- | :--- | :-- |
| **OD-14** | **Floor-1 count now contradicts the survey.** With `LF` and `LB` confirmed on floor 1, all twelve floor-1 units are accounted for and each encodes its own level: `1a`–`1h`, `B1F`, `F1`, `LF`, `LB`. The seeded data is internally consistent at **12**; the owner's survey says **11**. | Locked canon makes the survey authoritative and publishes 11/11/10/1, but canon was written before the LF/LB confirmation. Either the survey is off by one, or a unit is not where its code implies. Migration `007` deliberately corrects only `PH` and leaves this alone. | Phase 2 |
| **OD-15** | **Penthouse and Linda have no expense area.** The five allocation buckets cover only BH, Front Apartment and Back Apartment. Where `PH`, `LF` and `LB` costs are recorded is not established by any document. | Expenses for three units may be silently landing in the wrong bucket, or nowhere. Affects BR-041 and BR-047. Migration `008` records the gap rather than inventing a sixth area. | Phase 2 |
| **OD-16** | **"No late payment" vs the seeded 7-day grace period.** `system_settings.grace_period_days = '7'` and **BR-012** define a grace window, but OD-03's answer states late payment is not accepted. | These may be describing different things (a grace window before *Overdue* status, versus a policy of not accepting money late), or the grace period may not reflect practice. `billingService` cannot be specified until it is clear which. | Phase 3 |

## Defects surfaced this round — recorded, not fixed

| # | Defect | Evidence | Phase |
| :-- | :--- | :--- | :-- |
| D-1 | Missing deposit defaults to `current_price * 2`, the "one month advance plus one month deposit" pattern. There is no security deposit in this business, so the default is wrong and it moves money. | `backend/src/routes/admin.ts:571` | 3 |
| D-2 | Expense-entry edit **deletes all allocations, then inserts replacements, with no transaction**. `:1474` builds the area as `a.propertyArea \|\| a.area`, and the `\|\| a.area` fallback can carry a non-canonical short form. Before `008` that wrote junk silently; after `008` the insert is rejected and **the delete has already committed**, losing the entry's allocations. | `backend/src/routes/admin.ts:1471-1477` | 3 — fix before applying `008` |
| D-3 | Phone normalisation by stripping non-digits does not fold the `+63` country code onto the `0` prefix, so one human number can hold two logins. **Found and fixed during verification** — `006` now uses `public.normalize_ph_phone()`. | `database/migrations/VERIFICATION.md` | fixed |

---

| D-4 | **Schema drift.** `rooms_floor_check` exists in the live database and nowhere in this repository, so `FULL_DATABASE_SCHEMA.sql` does not describe production. It broke migration `007` on first application. One instance implies there may be more. | `database/migrations/VERIFICATION.md` addendum | fixed in `007`; the file itself is still inaccurate and the ERD must be built from `DRIFT_DIAGNOSTIC.sql` |

---

## Still open from Phase 1

| ID | Item | Gate |
| :-- | :--- | :-- |
| **OD-02** | GBG garbage fee timing — fixed calendar month, unit anniversary month, or administrator discretion | Phase 3 |
| **OD-10** | Tenant-submitted payments (form F-12) — does the form stay, and does `payment:submit:own` get added | Phase 3 |

---

*Phase 2 artifact. Companion to `PHASE1_LOCKED_DECISIONS.md`, which it extends and never contradicts.*

---

# Addendum — closed later the same day (2026-09-13)

## OD-15 — CLOSED. Penthouse gets its own category; Linda books to Back Apartment

Asked of the owner during the Phase 2 deliverables round. Their answer:

> "the expense can be put to front, back, boarding house, main house and penthouse. the penthouse is
> another separate category since its a large unit so its own category, and linda is on the back
> category."

**Resolution.** A **sixth** Property Area, `Penthouse`, with `is_rental_expense = TRUE` — the
penthouse is let to tenants, so its upkeep is an operating cost. The `Linda` cluster books to the
existing `Back Apartment` area. `Other Expenses / Personal` is retained: it holds ₱1,995,503.25 of
recorded history and was not part of the question.

**Schema impact — `012_penthouse_area_and_cluster_routing.sql`, written, not yet applied.**

The migration does one thing the question did not obviously call for, and the reason matters.
Migration `008` put `cluster_code` on `property_areas`, which can only express *one area to one
cluster*. The owner's answer is *many clusters to one area* — both `Back Apartment` and `Linda` book
to `Back Apartment`. That cannot be written down in a column on the wrong side of the relationship
without either inventing a duplicate area row or leaving `Linda` unmapped, which is exactly the state
the database was already in. So `012` adds `clusters.expense_area` (N:1), populates it for all five
clusters, and drops the superseded `property_areas.cluster_code`. Keeping both would be a stored
redundancy able to disagree with itself — the kind of finding the 3NF proof has to survive.

Final mapping:

| Cluster | Units | Books costs to |
| :--- | :-: | :--- |
| `BH` | 22 | Boarding House |
| `Back Apartment` | 5 | Back Apartment |
| `Linda` | 2 | **Back Apartment** |
| `Front Apartment` | 3 | Front Apartment |
| `Penthouse` | 1 | **Penthouse** (new) |

Every cluster now routes somewhere; `012` sets the column `NOT NULL` to keep it that way.

## OD-14 — still open, and now measured

The owner reconfirmed **11 / 11 / 10 / 1** twice. The live `rooms.floor` data says **12 / 11 / 9 / 1**.
Both total 33 and the error is symmetrical, so exactly one row's `floor` is wrong. **No migration was
written** — see `CONTINUE_HERE.md`.

## OD-17 — NEWLY OPEN. Is `LF` a Linda unit or a Front Apartment unit?

The owner stated three times that "Linda Front" should not exist and that the unit belongs to the
Front Apartment. They also stated that the Front Apartment "consists of 3 units, 1 ground and 2 on
the 2nd floor" — which `F1`, `F2B` and `F2F` already satisfy, so moving `LF` in would make four.

`LF` cannot simply be removed. It is a real, separately let unit with **31 income records**, its own
tenant, and its own ₱400 fixed water charge distinct from `LB`'s ₱200. Its cluster determines which
expense bucket its costs land in once `012` is applied, so this must be settled before the expense
reports are considered final.

**No room row was reclassified.** Changing a unit's cluster on a contradictory instruction would move
real money between reporting buckets across 31 historical records.


---

# Second addendum — the client's building breakdown (2026-09-13)

The owner walked the property with the client and returned a building-by-building account. It is
the first statement in this project that gives **structures and unit counts together**, and it
closes both remaining Phase 2 questions.

| Structure | Local reference | Units | Floors |
| :--- | :--- | :-: | :--- |
| Penthouse | *taas* | 1 | rooftop, level 4 |
| Front Apartment | *kataning ni bossing* | 3 | not stated |
| Linda | *sa luwasan mi beside red gate* | 2 | not stated |
| Apartment Building (BH) | *su may mesa tapos seesaw* | 22 | **8 / 7 / 7** |
| Back Apartment | *sa katabi niyo red gate tapos mga sa taas papunta penthouse* | 5 | **1 / 2 / 2** |

Total **33**, matching the canonical unit list and the owner's own ledger.

## OD-14 — CLOSED. `F1` is on the third floor

The two floor breakdowns the client did give match the seeded data **exactly**: BH is `1a`–`1h` /
`2a`–`2g` / `3a`–`3g` = 8 / 7 / 7, and Back Apartment is `B1F` / `B2F`+`B2B` / `B3F`+`B3B` = 1 / 2 / 2.
With the Penthouse on level 4, those three account for **9 / 9 / 9 / 1**.

Reaching the surveyed **11 / 11 / 10 / 1** needs +2 on the ground, +2 on the second and +1 on the
third — five places for the five units whose floors the client did not state (3 Front + 2 Linda).
The owner has twice said the ground floor's eleven **include both Linda units**, which fixes Linda at
2 on the ground; `F2B` and `F2F` were already on the second, filling it.

Exactly one placement remains: **`F1` is on the third floor.** Applied as migration `015`; the live
distribution is now 11 / 11 / 10 / 1 across 33 units.

> **The one inference, stated plainly.** The code `F1` reads like "Front, floor 1", which is almost
> certainly how it came to be seeded as floor 1. On the client's account the Front Apartment is a
> separate structure and `F1` denotes its first unit, not its level. This is the single thing in
> migration `015` worth eyeballing on a walk-through. `rooms.floor` is display-only — no billing,
> pricing or reporting logic reads it — so if it is wrong it is a label, not money.

## OD-17 — CLOSED. The clusters were already right; the *label* was the problem

The client's concern was *"not linda front since income shouldn't go to linda from front apartment"*.
**That separation already held, and was verified against the live data rather than assumed:**

| Cluster | Units | `is_linda_unit` | Rows flagged Linda billing | Linda water | Linda electricity |
| :--- | :--- | :-: | :-: | ---: | ---: |
| Front Apartment | `F1`, `F2B`, `F2F` | false | **0 of 93** | **₱0.00** | **₱0.00** |
| Linda | `LF`, `LB` | true | 62 of 62 | ₱18,600.00 | ₱12,035.76 |

No Front Apartment income has ever been attributed to Linda. Front Apartment stays 3 units, Linda
stays 2 — **no room was reclassified, because none needed to be.**

What was wrong was the **naming**. "Linda Front" implied a Front Apartment association that does not
exist. Both units are simply Linda units, and the UI now labels them `Linda (LF)` and `Linda (LB)`.
The `room_number` codes are deliberately unchanged: they are the natural key that reconciles with the
owner's spreadsheet, which lists them as `*LF` and `*LB`.

## Main House — CONFIRMED as expense-only

The client confirmed Main House *"is for the expense only … it's not something they go for rent but
it's something getting categorized for expenses"*. This is exactly what OD-05 settled and what the
schema already does: `Main House` is a **Property Area** with `is_rental_expense = FALSE`, and it is
**not** a cluster and owns no rentable unit. No change required.

## Newly open — raised by this round

| ID | Item | Evidence | Gate |
| :-- | :--- | :--- | :-- |
| **OD-18** | **The Linda fixed electricity charge is recorded against the wrong unit.** `system_settings.linda_lb_electricity_charge = 325` and the income screen both attributed a fixed ₱325/month to **LB**. The live ledger says the opposite: **LF** is charged electricity in **31 of 31** months (min ₱325, max ₱2,285.76, avg ₱388.25) and **LB in 0 of 31**. The owner's own spreadsheet agrees with the ledger — the `Electric` column carries 325 on the `*LF` row and nothing on `*LB`. | 31 months of `monthly_income_records`; `INCOME AND EXPENSES PAST RECORDS` workbook, Monthly Income rows 42–43 | 3 |

The UI has been corrected to match the ledger and the spreadsheet (LF: ₱325 minimum, submetered
above; LB: none on record). **`system_settings.linda_lb_electricity_charge` has deliberately not been
touched** — it is a seeded parameter that no backend code reads (defect 1), and changing a money
setting on inference rather than instruction is the wrong call. Worth one question to the client:
*which Linda unit actually pays the fixed ₱325 electricity?*
