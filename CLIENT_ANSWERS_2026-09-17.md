# Client answers — how the business actually runs, 2026-09-17

**Ten questions about the business itself**, asked outside the receipt-by-receipt sheet in
`CLIENT_MEETING_QUESTIONS.md`. Nine were answered; **Q8 was not.**

> [!IMPORTANT]
> **Provenance, stated plainly because it changes how much weight these carry.**
> These answers were **relayed by John Lloyd M. Cuario on 2026-09-17**, dictated rather than
> minuted at the table. They are recorded here as given — cleaned only of dictation artifacts,
> with **no number altered and no answer paraphrased**. They are not a verbatim client minute.
> **Three of them reverse decisions this team closed in the last four days.** Two were put back to
> her the same day and **both came back clean** — those answers are in **§ Round two**, and the
> findings they settle are marked in the table below. The third (**§ F-3**) was deliberately not
> re-asked: it is a team decision about locked wording, not a question for her.

**How to read the verdict column:** **Confirms** — the system already does this, and now has a
client reason. **Contradicts** — it disagrees with a recorded decision; both readings are written
down here and neither is resolved. **Opens** — new work or a new question.

| | | | Round two |
| :-- | :--- | :--- | :--- |
| Q1 | Collection month | **Confirms** — bills on demand is correct | |
| Q2 | Late payment | **Contradicts OD-16** (closed 2026-09-13) | **Resolved — § F-1** |
| Q3 | Linda | **Confirms** — and explains the arrangement | |
| Q4 | Who touches the books | **Confirms** — single operator | |
| Q5 | Electricity | **Confirms** — deliberately out of scope | |
| Q6 | Occupant counts | **Confirms** — admin edits them | |
| Q7 | Deposits | **Contradicts OD-04** (closed 2026-09-17) | **Answered — § F-2** |
| Q8 | What is still on paper | **Unanswered** | **Answered — § R4** |
| Q9 | The 50% column | **Confirms** its treatment, **and names a purpose** — see § F-3 | *not re-asked, deliberately* |
| Q10 | Move-in / move-out rate | **Confirms** — low frequency, fast re-let | |

---

## Q1 — A normal collection month

> "Every month the landlady usually gets the rent every month from the tenant. She does not go
> room to room, but instead the tenants go to her in paying the rent and water. Usually they are
> made at the same time — I mean rent and water — but there are some cases that those two bills
> are paid separately. It depends upon the tenant's due date of the rent. Right now the design of
> the system is right, just because we are complying with the landlady's needs in the system,
> matching how they work right now."

**What it settles.** Residents come to her; she does not go unit to unit; collection is in person
and the same for every cluster. **This confirms the deliberate call recorded at
`docs/13_AUDIT_JUDGEMENT_LOG.md` § 3.6 — bills are raised on demand, and that is correct.** Two
bills against 32 tenancies is the design working, not a gap. That judgement call now has a client
reason behind it, which is worth adding to § 3.6.

**What it opens — see § F-5.** *"There are some cases that those two bills are paid separately."*
A bill in this system is a single `total_amount` covering rent **and** water. `allocateReceipt()`
supports a short payment — it produces `Partially Paid` — but it allocates **across bills, never
within one**, so nothing records *which half* was paid.

---

## Q2 — What happens when someone does not pay on time

> "Usually there is at least a one week grace after the due date, for the landlady to give time
> for the tenants to pay their rent. What the current system does in our website is it notifies
> the tenant on when the due date is, or if they are already delayed, so everyone is notified. If
> it's more than a week, usually the tenant is notified several times by the landlady to pay their
> rent; if not, they will be or can be evicted in their respective apartment."

> [!NOTE]
> **This appeared to contradict OD-16, which the owner herself closed on 2026-09-13.** It was put
> back to her the same day and **it does not** — see **§ R1** and **§ F-1**. The debt is late on
> day one; the week is what she allows before pressing.

**What is on record against it.** `docs/02_BUSINESS_RULES.md` BR-012 reads **"There is no grace
period."** Its errata says the rule previously read *"A one-week grace period may apply to an
overdue payment depending on the situation"* — and that **"That was never a rule of this
business,"** introduced during the original build and documented as though it were policy.
Migration `016` set `grace_period_days` to **0**. On 2026-09-17 a defect was fixed precisely
because a bill due the 20th was not overdue until 08:00 on the 21st, described in the session
record as *"an unlegislated grace, where OD-16 says there is none."*

**The second half of the answer does not describe the system as built.** Notifications are
dispatched on exactly three events — an online payment verified, an online payment declined, and
the Adyen webhook. **There is no due-date reminder and no overdue notification.** There is no
scheduler, no handler and no trigger; `Overdue` is never written, it is **derived on read**
(`isOverdue()`, called in `admin.ts:1049` and `tenant.ts:148`). A resident sees they are late
**only if they open the portal.** See **§ F-4**.

---

## Q3 — Who Linda is

> "Linda is actually a part owner of the entire compound. But the income for only LF and LB are
> going straight and remitted directly to Linda, because she owns those two units. So in the
> entire compound's income, two units — specifically Linda's units, front and back — are remitted
> directly to Linda."

**What it settles.** The exclusion is correct and the reason is now on record: she holds those two
units, so their income never enters the property's takings. **This confirms
`docs/13_AUDIT_JUDGEMENT_LOG.md` § 3.5 — Linda is excluded from grand totals on purpose** — and it
confirms the audited arithmetic was being checked against the right rule.

> **Keep this separate from BR-035.** This answer is about **LF and LB**, which are real units
> with a real arrangement. It says nothing about `fifty_percent_share`, whose wording is locked
> and stays locked. Do not let the two be described in the same breath.

---

## Q4 — Who else touches the books

> "It is a single operating admin system, so there is only one person — specifically the landlady
> — who has access to the books of income and expenses, and even the account of the admin."

**What it settles.** Every single-operator assumption in the build holds: one admin account, no
concurrent recording, no second party to attribute a write to. **No change needed.**

**Related, and still open:** the § 3 question in `CLIENT_MEETING_QUESTIONS.md` — *should a resident
be able to report a cash payment for her to confirm?* — matters **more** under a single operator,
not less, because there is nobody else who can record one.

---

## Q5 — Electricity

> "No, the electricity is not a feature or a part of the scope in our system. Every unit has its
> own electric meter which is paid separately by each tenant, and also is not recorded in the
> income or even expenses."

**What it settles.** Electricity is **deliberately out of scope** — not a missing feature. The
system covers rent, water and garbage. Its absence from the database and the code is correct.

**What it does not settle.** The public site still quotes **"₱12.50 / kWh"** and **"readings are
recorded on the 25th"** to strangers. Both remain unverifiable — § 3b of the meeting sheet. Being
out of scope makes this **more** pressing, not less: nothing in the system will ever notice if
either figure goes stale, and the page is what a prospective resident reads.

---

## Q6 — Occupant counts

> "If that is the situation, the admin will be updating the number of occupants living in their
> apartment, so the number of water that will be charged per person in that apartment will be
> increased — still a 200 pesos per head charge. That is why the admin will have the capabilities
> also to edit the number of occupants in each apartment. We already have that."

**What it settles.** The administrator maintains the count by hand; ₱200 per head is unchanged;
the capability exists — `PATCH /admin/tenants/:profileId` accepts `occupantCount`, validated to at
least one.

**Small open question, not urgent.** If a count changes mid-month, does the change apply to the
**next** bill or is the current one adjusted? Today the charge is computed from the count at the
time the bill is raised.

---

## Q7 — Deposits at move-out

> "The deposit is usually used to fix and maintain the apartment when the tenant leaves the unit.
> So basically the deposit will be used to cover the expenses — for example a repaint, fixing
> broken properties if applicable — when the tenant moves out, and whatever is left of that entire
> expenses will be refunded to the tenant. If it's 6500 and the expenses is 6400, the 100 pesos
> will still be given back to the tenant."

> [!WARNING]
> **This contradicts OD-04, closed earlier the same day.** The follow-up in **§ R2** confirms and
> extends it — the repairs are expense-ledger entries, labelled as deposit-funded. See **§ F-2**.

**What is on record against it.** `PHASE1_OPEN_DECISIONS_REGISTER.md` closed OD-04 on **2026-09-17**
with: *"The move-in sum is **advance rent, not a refundable security deposit**."* The answer above
describes a **refundable security deposit applied against move-out costs, with the remainder
returned** — which is what OD-04 originally asked and what the register says needs schema work:

> *"A schema gap, not just a code gap. `room_assignments.deposit_amount` has no disposition column
> — no `deposit_refunded_amount`, no `deposit_forfeited_amount`, no settlement date. The vacate
> endpoint deactivates the account and frees the unit with no deposit settlement step at all."*

**A new question her answer raises.** The move-out repairs are real money leaving the business. Are
they entered in the expense ledger, and if so, does the deposit net against them there, or is the
deposit settled outside the books entirely? Nothing can be built until that is known.

---

## Q8 — What is still on paper

**No answer was given in this round.** It was re-asked the same day and **answered — see § R4.**
Nothing she keeps on paper falls outside the system's scope.

---

## Q9 — The 50% column

> "The 50% is actually a number just based on how much will be remitted for tax, so it doesn't
> actually do anything, but it is only a reconcile on how much percentage will be divided and will
> be taxed. So it is purely historical."

**What it confirms, and this part is useful.** *"It doesn't actually do anything… purely
historical."* The current treatment is right: the column is carried, nothing reads it, no code
acts on it, and she does not reconcile against it. `fifty_percent_share` is
`GENERATED ALWAYS AS (rent_amount / 2.0)` and **no code reads it at all.** Nothing needs building.

**What must not be done with the rest of it — see § F-3.** The answer **names a purpose**, and
**CLAUDE.md rule 4 forbids naming a party, recipient, purpose or destination for that figure.**
The sentence is recorded here as a **quoted client statement**, which is evidence. It is **not**
to be turned into system wording, documentation, a label, a tooltip or a business rule by anyone
acting on this file alone.

---

## Q10 — How often someone moves in or out

> "Usually tenants move out for at least a minimum of six months and above, and it can be spanned
> for several years in tenants staying. And the move-in rate, it's very quick — usually when one
> tenant moves out, in just a few days another tenant will move in."

**What it settles.** Tenancies run six months to several years; a vacated unit is re-let within
days. The vacate and assignment paths are **low frequency, high consequence** — rarely exercised,
and each one carries a deposit settlement (§ F-2) that does not exist yet. It also explains why 32
of 33 units are occupied and `PH` is the only vacancy.

---

# Round two — the follow-up answers, same day

**The four questions in [`CLIENT_FOLLOWUP_QUESTIONS.md`](CLIENT_FOLLOWUP_QUESTIONS.md) were put
back and answered**, relayed the same way and under the same caveat: dictated, not minuted. **All
four came back clean**, and two of them cost far less to act on than the first round suggested.

## R1 — When rent becomes late

> "The word — or the situation — of it being late is a day after the due date. But then again
> there is a one week grace period for the tenant to pay the rent."

**This is the first box on the sheet, and it settles § F-1.** The debt exists on day 21. The week
is what she allows before pressing — **forbearance, not a billing window.**

## R2 — The deposit and the repairs

> "Number one, yes, the deposit repairs go in the expenses book — but they are labeled, wherein
> the deposits are the ones that are used for those specific expenses. The settlement can take as
> early as the room is ready for the tenant. So basically after fixing the rooms, the unit or
> apartment is or will be ready for a new tenant to settle in."

**Three facts, and all three are schema-shaped.** The repairs are ordinary expense-ledger entries
— **category 8, Repairs and Maintenance**. In her book they carry a **label marking that a deposit
funded them**. Settlement happens **when the unit is ready to re-let**, not on a fixed clock.

## R3 — Rent and water paid separately

> "Yes, it is both. It is needed, so the tenant needs to know what — or which — is still owed, not
> just the amount."

**Note who she named: the tenant.** This is a resident-portal requirement as much as an
administrator one. See § F-5, which is now much cheaper than it looked.

## R4 — What is still on paper *(answers Q8)*

> "Of course it's what's already in the system that we have. So it's recording the incomes and the
> expenses, and managing the tenant accounts, the bookings, and the maintenance ticketing system."

**Scope is closed: there is nothing she does on paper that the system does not already cover.**
Income, expenses, tenant accounts, bookings and maintenance tickets are all modelled — including
bookings, which run inquiry → `Reserved` → assignment under **BR-006**.

> **The inference, marked as ours and not hers:** she is doing those five things **on paper in
> parallel with the system**, because **no write path in this system has ever been used by a
> person.** That is not a scope finding, it is an adoption finding, and it makes
> **`TESTING_REHEARSAL.md` (B-04) more urgent, not less** — the paper ledger is still the real one.

---

# Findings

## F-1 — ~~The grace period: two client answers, four days apart~~ **RESOLVED 2026-09-17**

**Both readings were true, and they touch different fields.** Her round-two answer separates them
in one sentence: **late on day 21, with a week before she acts.**

| | |
| :--- | :--- |
| **What does not change** | `grace_period_days` stays **`0`**. Migration `016` stands. `isOverdue()` is unchanged, and a bill is overdue the day after its due date — exactly as **OD-16** settled and as the 2026-09-17 UTC-cutoff fix restored |
| **What the week is** | an **escalation threshold** for notifications, not a billing window. `docs/08_OPEN_DECISIONS.md` § 6 already tiers overdue notifications at **">7 days"** — that section was right, and now has a client reason |
| **What it needs** | the notifications in **§ F-4**, which do not exist. The threshold has nothing to hang on |

> [!IMPORTANT]
> **One sentence of BR-012 is now contradicted, and it should not be edited quietly.**
>
> `docs/02_BUSINESS_RULES.md` BR-012 reads: *"There is no grace period. **Payment is due on the due
> date and late payment is not accepted.**"*
>
> The first sentence stands. **The second does not** — she accepts late payment, routinely, for
> about a week. Its errata traces that clause to **OD-03**, but OD-03 settled *mid-cycle vacancy
> proration* — that a departing tenant owes the whole month and nothing is refunded. That is about
> **how much is owed**, not about **when it may arrive.** The clause was carried further than its
> evidence.
>
> **Proposed, not done:** a dated errata on BR-012 keeping "there is no grace period" and
> replacing the second sentence with what she actually described — payment is late from the day
> after the due date, and late payment is accepted, with follow-up beginning after about a week.
> **It reverses part of a rule, so it goes through Sean and the group**, in the errata format the
> project already uses. Nothing in code changes either way.

## F-2 — ~~The deposit is refundable~~ **ANSWERED 2026-09-17 — OD-04 should be reopened**

Her two answers together give the whole rule: **the deposit is held, spent on move-out repairs,
and the remainder returned** (₱6,500 − ₱6,400 = ₱100 back); **the repairs are ordinary expense
entries, labelled as deposit-funded**; **settlement lands when the unit is ready to re-let.**

> [!WARNING]
> **Correction to this finding, made after checking the code: OD-04's closure was not built on a
> wrong premise.** `backend/src/routes/admin.ts:800` records it as **"ADVANCE RENT, not a
> refundable security deposit — this business collects no separate damage or security sum (OD-04,
> **confirmed 2026-09-13**)"**, and `:577-594` says the same under BR-039. **The closure rested on
> her own answer, four days before this one.**
>
> So this is the same shape as § F-1: **two client answers, both recorded, neither discarded.**
> Unlike F-1, the reconciliation is not obvious, and it is not ours to invent. **OD-04 is reopened
> as CONTESTED, not reversed.**

**One question separates them**, and it is written up in the register at
`PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5:

> *"When someone moves out and you repaint or repair the unit — is the money you use for that the
> same one month's rent they paid when they moved in? Or is it a separate amount you hold on top
> of that?"*

**Same money** → both answers were true, describing the sum's name and then its fate; OD-04 closes
as a refundable deposit with a settlement step. **Separate amount** → there are **two** sums, the
system models one, and the ledger has never recorded money the business collects — a **money
defect**, outranking everything else in the register.

**Her ₱6,500 is close to one month's rent on many units, which points at the first.** It is not
evidence. Three of the seven pinned receipts look like an off-by-one and are not being corrected
on that basis either.

**What the answer now specifies, which the first round could not:**

1. **The settlement references expense rows.** Not just an amount — the repairs live in the
   expense ledger (category **8, Repairs and Maintenance**), and her book already marks *which*
   expenses a deposit paid for. The system has no such marker: an expense entry carries a category
   and its property-area allocations, and nothing ties one to a tenancy or a deposit.
2. **`room_assignments.deposit_amount` still has no disposition columns** — no amount applied, no
   amount refunded, no settlement date.
3. **The vacate endpoint** (`backend/src/routes/admin.ts:692-708`) deactivates the account and
   frees the unit with **no settlement step at all**. **BR-025** stays *Partial* until there is one.
4. **Settlement is event-driven, not scheduled** — "as early as the room is ready". Nothing should
   wait on a date, and Q10 says that is usually a few days.

**Sequence, and the reason for it:** **ask the one question above first** — the rest is wasted if
the answer is "a separate amount". Then design the link between an expense entry and the tenancy it
settles, which is the expensive thing to get wrong and is point 1, not points 2–3. **BR-039**'s
characterisation of the deposit needs re-reading beside it either way.

## F-3 — Q9 names a purpose for the 50% figure, and the wording stays locked

**The useful half is a confirmation:** the column does nothing, she does not act on it, and that
is exactly how the system treats it.

**The other half names a purpose, and CLAUDE.md rule 4 forbids exactly that.** It is recorded in
§ Q9 as a quoted client statement — evidence, which is what a client's words are — and it stops
there.

> **`check:canon` will not save anyone here.** Its BR-035 pattern catches naming a *party*
> (`co-owner`, `50/50`, `owner share`, `landlady share`) and two purposes it was taught after they
> got through (`revenue share`, `profit share`). **The word in this answer is not in that list.**
> The guard on this one is judgement, not the script.

**This is Sean's call and the group's**, because the lock was set deliberately and BR-035 is argued
from at the defense. Two things worth weighing: the lock exists because earlier documents asserted
a framing **without evidence**, and this is the first time the owner has given one — but it arrived
dictated and second-hand, about a column she also says does nothing.

## F-4 — ~~Nothing tells a resident their rent is due, or late~~ **OVERSTATED — corrected 2026-09-18**

> [!IMPORTANT]
> **The portal does tell them, and this finding was wrong to say otherwise.**
> `TenantOverviewView.vue:120-132` computes a live countdown from the bill's own due date and
> renders **"Overdue by N days"** with its own severity level. A resident who opens the portal
> sees exactly where they stand.
>
> **What is absent is an *outbound* reminder** — nothing reaches out to them. All eight
> notification titles in `backend/src` are payment, ticket or inquiry events. **Reviewed
> 2026-09-18 and accepted as sufficient**: the week in § F-1 hangs on the portal countdown rather
> than on nothing, and she follows up in person anyway, which is what § Q2 describes her doing.
>
> The detail below is retained because it is accurate about notifications specifically.

Q2 states the system *"notifies the tenant on when the due date is, or if they are already
delayed, so everyone is notified."* **It does not.**

| What exists | |
| :--- | :--- |
| Notification on **online payment verified** | `admin.ts:1350` |
| Notification on **online payment declined** | `admin.ts:1378` |
| Adyen webhook notification | `adyenService.ts:348` |
| **A due-date reminder** | **does not exist** |
| **An overdue notification** | **does not exist** |

There is no scheduler, no handler and no trigger; `Overdue` is never written to a bill. It is
derived on read, so a resident learns they are late **only by opening the portal** — and she is
describing a system that reaches out to them.

**This is load-bearing for F-1, and round two made it more so, not less.** § R1 puts the week
squarely in **notifications** — it is not a billing window, so the only place it can live is a
reminder and an escalation that **do not exist**. Her description of the system telling residents
their due date and their delay is the behaviour F-1 now depends on.

**It is the one piece of new build that both answers point at.** Nothing else in either round
requires code that is not already there.

## F-5 — Rent and water separately: **answered, and most of it already exists**

She wants the split visible, **and named the resident as the one who needs to see it** (§ R3).
Checked against the code rather than assumed, this is **far smaller than the first round
suggested**:

| Already built | |
| :--- | :--- |
| `bills.rent_amount` and `bills.water_amount` | stored separately on every bill, beside `total_amount` (`tenant.ts:690-692`) |
| `bill_type_enum` | already `['Rent','Water','Combined','Other']`. Every bill today is created as `'Combined'` — **the other two values are unused, not unavailable** |
| The resident already sees the split | `TenantOverviewView.vue:262-263` reads both off the unpaid bill; `AdyenPaymentModal.vue:228` renders `₱rent + ₱water` |

**So there is no schema gap, and the display she asked for exists for an unpaid bill.** The single
real hole is the one Q1 described: **a partially paid bill.** `allocateReceipt()` works against
`total_amount`, so once a resident pays one half, the bill reads `Partially Paid` with an
outstanding figure and **nothing says which component it is.**

**Two ways to close it, and the second may be nearly free:**

| | |
| :--- | :--- |
| **(a) Track payment per component** | add rent-paid / water-paid tracking, or a fixed application order (rent first, then water — which she would have to confirm) |
| **(b) Raise two bills instead of one** | `'Rent'` and `'Water'`, both already valid `bill_type` values. `allocateReceipt()` **already allocates correctly across bills** and marks each one `Paid` or `Partially Paid` on its own. It also fits *"it depends upon the tenant's due date"* from Q1 — two bills can carry two due dates, which one combined bill cannot |

**(b) reuses machinery that already works** and turns `Partially Paid` into something precise. It
changes the bill-creation path and the statement layout, and retires `'Combined'` in practice —
so it is Sean's call, not a quiet refactor.

### Settled 2026-09-18: **(a)**, one bill with per-component tracking

**Her own report layout decides this, and it is not close.** `docs/09_MONTHLY_INCOME_REPORT.md`
§ 4 defines one row per unit per month carrying **both**:

| Col | |
| :-- | :--- |
| **5** | Rent Amount |
| **8** | Water Payment |
| **10** | **Remitted Amount = Column 5 + Column 8** (BR-038), computed automatically |

**Two bills would produce two income rows where her sheet has one**, splitting a single month's
entry for a unit across two lines and breaking the shape of the workbook that
**`check:reports` asserts against the database month by month, every year — 490 assertions.**
BR-049 and FR-044 require the export to match her layout. Option (b) buys precision on partially
paid bills and pays for it with the one thing the reports must not lose.

**So: keep the combined bill, and record the allocation per component.** The bill already stores
`rent_amount` and `water_amount` separately, so what is missing is only which part a payment
covered — not the ability to know the split. **Implementation is Sean's lane** (`backend/src/`
and a migration); this settles *what*, not *how*.

**One question for her remains, and it is small:**

> *"If someone owes ₱8,000 rent and ₱400 water and hands you ₱8,000 — is that the rent paid and
> the water still outstanding, or would you ask them which they meant?"*

That fixes the allocation order. **Until it is answered, do not guess one** — a default that
silently clears water first would mis-state what a resident still owes.

**Settled before the redesign fixes a layout around one combined figure**, which is what this
item was blocking — see `HANDOFF_TO_DESIGN.md` § 5.

---

# Still open after this round

**The four questions that were hers to answer — Q8, F-1, F-2 and F-5 — were put back the same day
in [`CLIENT_FOLLOWUP_QUESTIONS.md`](CLIENT_FOLLOWUP_QUESTIONS.md) and all four came back.** What is
left below is either ours to decide or a small item she has not been asked yet.

**Ours to decide, in the order the cost falls:**

| | |
| :--- | :--- |
| **F-2** | **ask the one question in `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5 first** — same money, or a separate sum? OD-04 is reopened as **contested**, and everything downstream waits on that answer |
| **F-4** | build the due-date reminder and the overdue escalation. **The only new code either round calls for**, and F-1 now depends on it |
| **F-5** | choose (a) per-component tracking or (b) two bills using the `bill_type` values that already exist. **Settle before the redesign** |
| **F-1** | a dated errata on **BR-012**'s second sentence — *"late payment is not accepted"* is contradicted by the owner. Through Sean and the group, not quietly |
| **F-3** | the locked wording. Sean's call and the group's; **not a question for her** |

**Still hers, not yet asked:**

| | |
| :--- | :--- |
| **F-2** | **the one that blocks the most work.** Is the repair money the same month's rent they paid at move-in, or a separate sum held on top? `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5 |
| **§ 3b** | is ₱12.50 / kWh still right, and is the meter read on the 25th? Out of scope for the system, still printed on the public site where strangers read it |
| **Q6** | does a mid-month occupant change adjust the current bill or the next one? |
| **F-5** | if (a) is chosen: when a part payment arrives, does it clear rent first or water first? |
| `CLIENT_MEETING_QUESTIONS.md` | §§ 1, 2, 3 — the seven receipts and the five accounting habits, untouched by both rounds. That is the long sitting, with her book open |

**Nothing in her data has been changed on the strength of this document.**
