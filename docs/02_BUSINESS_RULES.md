# HIVELET BUSINESS RULES

This document contains the business rules that must be treated as system laws.

> [!NOTE]
> **Spot-checked against the live system on 2026-09-15. The rules tested hold, in the code and
> in the data.**
>
> This register had never been read against the running system - `npm run check:rules` proves
> it is internally consistent, not that the code obeys it. Five of the most falsifiable rules
> were traced to their implementation and to live rows:
>
> | Rule | Checked against |
> | :--- | :--- |
> | **BR-003** Historical Preservation | `bills`, `payments` and `monthly_income_records` are `ON DELETE RESTRICT` from `rooms`, so PostgreSQL refuses to delete a room holding any of them - and all 33 hold some. |
> | **BR-007** Website Visibility | `visibility_status` is enforced in three places in `public.ts`, and as of `17095f3` an administrator can finally set it. |
> | **BR-009** Inquiry Conversion | `converted_tenant_id` is written by the inquiry PATCH; the lead is linked to the tenancy it became. |
> | **BR-011** Overdue | `isOverdue()` returns false for a Paid bill and otherwise compares against the bill's **own stored** window, falling back to `due_date`. |
> | **BR-012** No Grace Period | `system_settings.grace_period_days` is **0** live, and `computeRentPeriod()` reads it from settings rather than pinning zero in code - so granting a window later is a settings change, not a deploy. |
>
> **The BR-012 errata was tested against the data and is exactly right, including the part
> that looks like a discrepancy.** Both live bills carry a `grace_period_end_date` seven days
> after their due date - 2026-07-05 → 07-12 and 2026-09-05 → 09-12. That is not the old policy
> leaking: both were created on **2026-07-30** and **2026-08-21**, before migration `016`, and
> BR-003 says a bill keeps the terms it was issued under. `isOverdue()` honours each bill's own
> window rather than applying today's policy retroactively, which is what makes the two
> statements consistent rather than contradictory.
>
> **Not every rule was tested** - forty-nine of them, and this is a spot-check of five. What it
> establishes is that this register is of the kind that describes intent and has been kept, not
> the kind that describes an afternoon and decayed. Treat the untested rules as unverified, not
> as wrong.

## BR-001 — Single Property Scope

Hivelet currently manages one property: Fe Galang Da Silva Boarding House.

## BR-002 — Room Identity

Each room is a unique property unit identified by its room number and floor context.

## BR-003 — Historical Preservation

Historical records must not be silently deleted merely because a room, tenant, payment, inquiry, or expense is no longer active.

## BR-004 — Room Occupancy

A room is occupied when the administrator identifies an active tenant/contact relationship for the room.

## BR-005 — Room Availability

A room becomes available again through an administrator-controlled vacancy process.

The administrator may:
- mark it available
- mark it under maintenance
- set an expected availability date

## BR-006 — Reservation

A reserved room must not accept new public inquiries for that room while the reservation is active.

## BR-007 — Website Visibility

Operational status and website visibility are separate.

A room may remain visible publicly while under maintenance or reserved, with the public status clearly communicated.

## BR-008 — Primary Contact

A room has one primary accountable contact/account relationship for official communication and transactions.

Additional contact information may be stored.

## BR-009 — Inquiry Conversion

Inquiry conversion should reuse existing prospect information instead of requiring unnecessary retyping.

Conversion does not guarantee tenancy. The final real-world agreement remains an administrative/business decision.

## BR-010 — Due Date

A tenant's monthly due date is based on the relevant move-in date and billing relationship.

## BR-011 — Overdue

A payment is overdue beginning on the day after its due date.

## BR-012 — Grace Period

**There is no grace period in billing.** Payment is due on the due date, and a bill is overdue
from the day after it. **Late payment is accepted**: the owner allows roughly a week before
following it up. That week is a **follow-up threshold, not a billing window** — it does not change
when a bill becomes overdue, and `system_settings.grace_period_days` stays `0`.

> **ERRATA (2026-09-17).** This rule's second sentence read *"Payment is due on the due date and
> **late payment is not accepted**."* The first half was right; **the second was not, and was
> carried further than its evidence.**
>
> Asked what happens when someone pays late, the owner answered: *"The word — or the situation —
> of it being late is a day after the due date. But then again there is a one week grace period
> for the tenant to pay the rent."* She accepts late payment routinely; what she does after about
> a week is follow it up, repeatedly, and eviction is the end of that road rather than a refusal
> to take the money. Recorded in `CLIENT_ANSWERS_2026-09-17.md` §§ Q2, R1 — **relayed and
> dictated, not minuted at the table**, which is why this errata corrects a sentence rather than
> creating a rule.
>
> **The 2026-09-13 errata below stands in full**, and this one does not disturb it. The two
> answers are about different things, which is why they looked like a contradiction: OD-16 asked
> **when a bill becomes overdue** — the answer is the day after the due date, and
> `grace_period_days` is `0`. This asks **what she does about it** — the answer is that she waits
> about a week. **No code changes either way.** The week belongs to notification and escalation,
> where `docs/08_OPEN_DECISIONS.md` § 6 already tiers overdue reminders at ">7 days" — and where
> neither a due-date reminder nor an overdue notification currently exists.
>
> **On the withdrawn clause's provenance.** The 2026-09-13 errata justified it as *"consistent
> with OD-03, which established that a departing tenant owes the full month and that late payment
> is not accepted."* OD-03 settled **mid-cycle vacancy proration** — how much a departing tenant
> owes, and that nothing is refunded. It says nothing about **when payment may arrive.** The
> clause was inferred from a rule about a different question.

> **ERRATA (2026-09-13, OD-16).** This rule previously read *"A one-week grace period may apply to an overdue payment depending on the situation"*, and the system was seeded with `grace_period_days = 7` accordingly. **That was never a rule of this business.** The owner has confirmed it was introduced during the original build of the website and then documented as though it were policy, which is how it came to carry a BR- number. It is consistent with OD-03, which established that a departing tenant owes the full month and that late payment is not accepted.
>
> Migration `016` sets `grace_period_days` to `0`. The key is kept rather than deleted so this rule stays traceable to a value and so billing code reads the policy from one place instead of a literal — if a grace window is ever granted, it is a settings change, not a deploy.
>
> `bills.grace_period_end_date` is retained and now equals `due_date` for every bill issued from that date. **Bills issued earlier keep the window they were issued under** (BR-003): a bill's terms are the terms it was issued on, and `isOverdue()` honours each bill's own stored window rather than applying today's policy retroactively.

## BR-013 — Full Payment

Tenants are expected to pay in full according to the business process.

Partial payment is not the default workflow unless the administrator explicitly records an exceptional arrangement.

## BR-014 — Water Fee

Water is charged at ₱200 per person.

## BR-015 — Electricity

Electricity is handled through the private electric company and is not generated by Hivelet's own billing engine.

Hivelet may record relevant electricity financial data for business monitoring.

## BR-016 — Online Payment

Online GCash payment is optional and implemented through Adyen.

Online payment records must follow the required verification workflow.

## BR-017 — Payment Verification

An online payment may remain pending verification until the administrator confirms it.

## BR-018 — Payment Correction

Financial corrections must create an audit record containing the previous and updated values.

## BR-019 — Report Recalculation

Confirmed financial corrections must affect active reports and analytics.

## BR-020 — Expense Allocation

Expenses must support categories and may be assigned to a room where applicable.

## BR-021 — Ticket Priority

Priority levels are Emergency, High, Medium, and Low.

## BR-022 — Ticket Visibility

New tickets must become visible to the administrator immediately after successful submission.

## BR-023 — Ticket Closure

The administrator has final authority to close an issue ticket after resolution.

## BR-024 — Tenant Privacy

Tenants can access only information they are authorized to access.

## BR-025 — Tenant Deactivation

When a tenant vacates and the administrator settles the departure, the tenant account becomes inactive.

Historical records remain.

## BR-026 — Duplicate Prevention

The system must avoid duplicate tenant/person records and duplicate active account relationships.

Existing tenant information should be reused where appropriate.

## BR-027 — Returning Tenant

A returning tenant should be capable of being associated with their existing historical record rather than creating a duplicate record.

## BR-028 — Auditability

Important administrative and financial actions must be traceable.

## BR-029 — Current Month Dashboard

Financial dashboard statistics default to the current month.

## BR-030 — Exportability

Important business records must be exportable for use outside Hivelet.

## BR-031 — Online Authority

The server/database is the authoritative source for current system state.

Client-side cached/offline data must not override authoritative server records.

## BR-032 — Canonical Unit List

The property's rentable units are fixed and grouped into five clusters: BH (Main Rooms: 1a-1h, 2a-2g, 3a-3g), Back Apartment (B1F, B2F, B2B, B3F, B3B), Penthouse (PH), Front Apartment (F1, F2F, F2B), and Linda (LF, LB).

See `09_MONTHLY_INCOME_REPORT.md` for full detail.

## BR-033 — Rent Period Derivation

A tenant's billing period ("Rent For") is derived automatically from their stored Anniversary Date and the current billing cycle. It is not manually typed on each monthly payment entry.

## BR-034 — Occupant Count Carries Forward

A unit's occupant count defaults to the value recorded in the previous month for the same tenant. The administrator may edit it when occupancy changes.

## BR-035 — 50% Share Is Derived

The "50% Share" figure on a monthly payment is always exactly half of the Rent Amount and must be calculated by the system, never entered manually.

## BR-036 — Water Payment Validation

Water Payment must equal Occupants × ₱200 (BR-014). If the administrator enters a mismatched value, the system must warn before saving rather than silently accepting the discrepancy.

## BR-037 — Garbage Fee Frequency

The garbage (GBG) fee is charged once per year per unit, not on every monthly entry.

## BR-038 — Remitted Amount Formula

Remitted Amount = Rent Amount + Water Payment. It is calculated by the system, never entered manually.

## BR-039 — Deposit Equals Initial Rent

A tenant's deposit is set once, at onboarding, equal to the Rent Amount in effect when they moved in.

> **CLARIFIED 2026-09-18 (OD-04). The rule is unchanged; what it means was being read two ways.**
>
> **The owner calls this sum the "advance".** That is a label, not a definition —
> *"the labeled advance is actually the deposit."* It is **held, spent on repairs when the tenant
> leaves, and the remainder returned** to them: ₱6,500 held against ₱6,400 of work returns ₱100.
>
> It is **separate from the first month's rent**, which is an ordinary income row like any other
> month. Two amounts change hands at move-in; this rule governs the second.
>
> **Settlement is her bookkeeping, deliberately.** The move-out repairs are expense entries under
> category 8, Repairs and Maintenance, and the refund is an entry she writes herself. **The system
> stores the figure and does not settle it** — `room_assignments.deposit_amount`, and Column 12 of
> the Monthly Income Report, which is excluded from Column 10, Remitted Amount.
>
> **Retired reading — do not reintroduce.** That this sum is *"advance rent, not a refundable
> security deposit"*, and that *"this business collects no separate damage or security sum"*.
> Both were recorded on 2026-09-13 and are contradicted by the owner. **BR-025**'s *Partial*
> status in the crosswalk rests on the vacate path having no settlement step, and is worth
> re-arguing now that settlement is known to be manual by choice.

## BR-040 — Linda's Fixed Billing Exception

Linda's units (LF, LB) are billed a **fixed monthly water charge** rather than the per-occupant water model (BR-014): **LF ₱400/month, LB ₱200/month**. This is remitted directly to Linda and kept separate from the standard rent/water subtotal.

> **ERRATA (2026-09-13, OD-18).** This rule previously read "a flat electricity charge **plus** a fixed water charge per unit". **The flat electricity charge is retired.** It was a workaround for units without their own electricity meter, not a rate belonging to a unit, and the client has confirmed that unmetered electricity will not be recorded in this system. `system_settings.linda_lb_electricity_charge` was deleted by migration `017`. Historical figures remain in `monthly_income_records.linda_electricity_charge` — 31 rows against LF totalling ₱12,035.76 — and are preserved read-only under BR-003. Only the fixed **water** half of this rule survives.

See `09_MONTHLY_INCOME_REPORT.md` Section 6 for exact figures.

## BR-041 — Expense Property Areas

Every expense is allocated to one or more of **six** fixed Property Areas: Boarding House, Main House, Front Apartment, Back Apartment, **Penthouse**, Other Expenses/Personal.

> **ERRATA (2026-09-13, OD-15).** This rule previously said **five**. The client confirmed that the Penthouse is booked as its own expense category, since it is a single large unit whose costs were previously folded in elsewhere or lost. Migration `012` added it. Of the six, **Main House** and **Other Expenses / Personal** are non-rental (`is_rental_expense = FALSE`) and are excluded from net rental income (OD-05).

See `10_MONTHLY_EXPENSES_REPORT.md`.

## BR-042 — One Category Per Expense Entry

An expense entry is tagged to exactly one fixed expense category (BR-043), even when its amount is split across multiple Property Areas.

## BR-043 — Fixed Expense Category List

The expense category list (Supplies, Taxes and Licenses, Janitorial and Messengerial Services, Depreciation, Professional Fees, Salaries: Michelle with PhilHealth/SSS/Allowances sub-lines, Communication/Light/Water, Repairs and Maintenance, Fuel and Oil, Others) is fixed and system-wide.

See `10_MONTHLY_EXPENSES_REPORT.md` Section 3.

## BR-044 — Split Expense Allocation

A single expense entry may allocate its amount across more than one Property Area without duplicating its date, supplier description, or category.

## BR-045 — Expense Row Total Is Derived

An expense entry's Total Expenses figure is always the sum of its Property Area allocations and must be calculated by the system, never entered manually.

## BR-046 — Expense Category Totals

Each expense category maintains a "this month" total (sum of entries tagged to it in the current month) and a running cumulative total (previous month's cumulative + this month's total), both calculated by the system.

## BR-047 — Expense Category Reconciliation

The sum of all category "this month" totals (BR-046) must equal the sum of all Property Area bottom totals (BR-041) for the same month.

## BR-048 — Admin-Only Authorship of Income/Expense Ledgers

Only the administrator (landlady) may create or edit Monthly Income Report and Monthly Expenses Report entries. Tenants and public visitors have no access to these ledgers.

## BR-049 — Excel Export of Income/Expense Reports

The Monthly Income Report and Monthly Expenses Report must each be exportable as an Excel-compatible spreadsheet file, reproducing the layouts defined in `09_MONTHLY_INCOME_REPORT.md` and `10_MONTHLY_EXPENSES_REPORT.md`.
