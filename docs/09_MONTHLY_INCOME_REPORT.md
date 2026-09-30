# HIVELET MONTHLY INCOME REPORT

This document describes the landlady's existing Excel-based Monthly Income Report and defines how Hivelet must reproduce its output while replacing manual entry with a guided admin panel.

This is the authoritative source for BR-032 through BR-039 (`02_BUSINESS_RULES.md`) and FR-031 through FR-036 (`03_REQUIREMENTS.md`), and resolves Open Decision #2 in `08_OPEN_DECISIONS.md`.

Only the administrator (landlady) creates or edits this report (BR-048), and it must be exportable as an Excel-compatible file (BR-049, FR-044).

---

## 1. Purpose

The landlady currently tracks rent, water and deposits per unit per month in a spreadsheet (her workbook also had a garbage-fee column, removed from the system on 2026-09-30, see Column 9), organized by property cluster, with running totals. Hivelet must let her enter a payment once, through a guided form, and produce the same report layout automatically — without requiring her to compute anything by hand.

---

## 2. Canonical Unit List

The property's rentable units are fixed and grouped into five clusters, always presented in this order:

| Cluster | Units |
| --- | --- |
| **BH (Main Rooms)** | 1a, 1b, 1c, 1d, 1e, 1f, 1g, 1h, 2a, 2b, 2c, 2d, 2e, 2f, 2g, 3a, 3b, 3c, 3d, 3e, 3f, 3g |
| **Back Apartment** | B1F, B2F, B2B, B3F, B3B |
| **Penthouse** | PH |
| **Front Apartment** | F1, F2F, F2B |
| **Linda** | LF, LB |

A unit may be `VACANT` for a given month — it still appears in the layout with no payment row.

Linda's two units (LF, LB) are billed under a different rule set (see Section 6) and must never be combined into the same subtotal as BH/Back/Front/Penthouse.

---

## 3. Report Layout

The report is organized as a running ledger, not a flat table:

1. A `YEAR <yyyy>` row starts each year's block.
2. A `<MONTH> <yyyy>` row starts each month's block.
3. Each cluster's unit rows follow, in canonical unit order.
4. Each cluster (BH, Back Apartment, Front Apartment) ends with a **subtotal row**: sum of Rent Amount, Occupants, Water Payment, and Remitted Amount for that cluster. Penthouse has no subtotal while vacant.
5. A **grand subtotal row** follows, combining BH + Back Apartment + Penthouse + Front Apartment (excluding Linda).
6. The **Linda** section follows, with its own fixed-rate rows and its own total, remitted directly to Linda (Section 6).
7. At least one blank row separates each month's block from the next.

Whether the very bottom figures on a report page represent a single month's total or a running year-to-date total across all months entered so far is unresolved — see Open Decision (Section 8, item 1).

---

## 4. Column Definitions

| # | Column | Format | Rule |
| --- | --- | --- | --- |
| 1 | Rm # | Dropdown from the Canonical Unit List | Identifies the unit. One row per payment per month. |
| 2 | Date Paid | `D-MMM-YY` | Date the payment was actually received, picked via calendar control. |
| 3 | Contact + Invoice # | Text + number | Tenant/contact name; the invoice number is the one the landlady issued, written `INV#<n>`, rendered in red to distinguish it from the name. **Optional**: not every payment has an invoice, and a blank is saved as none (migration 066, 2026-09-30). Never "OR". |
| 4 | Rent For | `MMM.D-D/YY` (e.g. `Jun.26-Jul.25/26`) | The billing period covered by this payment. Derived automatically from the tenant's Anniversary Date (Column 11) and the current cycle — the landlady does not type this. |
| 5 | Rent Amount | Currency | Total rent charged for the period. Entered by the landlady. Column total appears in the cluster/grand subtotal rows. |
| 6 | 50% Share | Currency | Exactly half of Column 5. Calculated automatically, never entered. |
| 7 | Occupants | Integer | Number of people in the unit. Carried forward from the previous month for the same tenant (editable), so the landlady only touches it when occupancy changes. Column total appears in subtotal rows. |
| 8 | Water Payment | Currency | Occupants (Col 7) × **the configured rate** — `system_settings.water_rate_per_occupant`, seeded at ₱200 and **currently ₱200**, but the landlady's to change (BR-014). Never hardcode the figure; read the setting. **Since 2026-09-30 it is computed from the occupants and never typed**, so a mismatch cannot be entered (BR-036). A unit with 0 registered occupants shows `-`. Column total appears in subtotal rows. |
| 9 | ~~GBG (Garbage)~~ | — | **Removed 2026-09-30 (migration 066, BR-037 retired).** The column is gone from the database, the form and the workbook, which now has **11 columns**. The 531 historical fees (₱10,620.00) are kept in 066's audit row. The other columns keep their numbers so that references to Column 10 and 12 stay valid. |
| 10 | Remitted Amount | Currency | = Column 5 (Rent Amount) + Column 8 (Water Payment) (BR-038). Calculated automatically. Column total appears in subtotal rows. |
| 11 | Anniv Date | `MMM D/YY` | The tenant's original move-in / billing-anchor date for this unit. Entered once, at onboarding, and reused every month to derive Column 4. Not re-entered on each payment. |
| 12 | Deposit | Currency | Equal to the Rent Amount at the time the tenant moved in (BR-039). Entered once, at onboarding. |

---

## 5. Onboarding-Time Fields vs. Monthly-Entry Fields

To keep the monthly entry screen uncluttered, fields are split by when they are captured:

**Captured once, at tenant onboarding (stored on the tenant/room relationship, not on the payment record):**
- Anniv Date (Column 11)
- Deposit (Column 12)
- Initial Occupants count (Column 7 seed value)

**Captured or confirmed on every monthly payment:**
- Rm # (Column 1)
- Date Paid (Column 2)
- Contact + Invoice # (Column 3)
- Rent Amount (Column 5)
- Occupants (Column 7) — pre-filled from last month, editable; the count recorded with the latest payment becomes the tenancy's own
- Invoice # — optional

**Derived automatically, never typed:**
- Rent For (Column 4)
- 50% Share (Column 6)
- Water Payment (Column 8), from Occupants
- Remitted Amount (Column 10)

---

## 6. Linda's Units — Special Billing (LF, LB)

> **Superseded in part (BR-040 errata, 2026-09-20).** The fixed water charge below never existed:
> Linda's units pay water at the same ₱200 per occupant as every other unit, and the flat
> electricity charge was retired on 2026-09-13. What stays separate is the **money**: Linda's
> charges are recorded in their own columns and kept out of the grand subtotal and Remitted.
> The list below is kept as the record of what was first written.

Linda's two units (LF, LB) do not follow the standard rent/water model. Instead:

- **Electricity**: fixed ₱325 per unit, every month, regardless of occupants.
- **Water**: fixed per unit, not per-occupant — ₱400 for LF (Gayon), ₱200 for LB (Jaye Casia).
- These fixed charges are totaled separately from the BH/Back/Front/Penthouse grand subtotal.
- The Linda total is remitted **directly to Linda**, not pooled with the rest of the monthly remittance.

This is a distinct billing mode from BR-014 (per-occupant water at the configured rate) and must not reuse the same per-occupant calculation path.

---

## 7. Admin Panel Workflow (Data Entry Automation)

When the landlady records a payment, the panel must guide her through this sequence:

1. **Pick Unit** — dropdown restricted to the Canonical Unit List (Section 2).
2. **Pick Date Paid** — calendar picker, no free-text date entry.
3. **Contact + Invoice #** — typed. If the unit already has an active tenant, pre-fill the contact name.
4. **Rent For (auto)** — system computes the billing period from the unit's stored Anniv Date and the current cycle; not editable as free text, but the landlady can review it.
5. **Enter Rent Amount** — system immediately computes and displays 50% Share.
6. **Occupants (auto-filled, editable)** — pre-filled from the same tenant's prior month entry. The landlady only edits it when someone moves in or out.
7. **Water Payment (auto)** — computed as `Occupants × waterRatePerOccupant`, the rate read from `system_settings` (seeded 200, currently 200) rather than a literal, and shown read-only (since 2026-09-30; BR-036 is met by construction).
8. ~~**GBG**~~ — removed 2026-09-30 (migration 066).
9. **Remitted Amount (auto)** — computed as Rent Amount + Water Payment, read-only.
10. **Anniv Date / Deposit** — only shown/editable during onboarding of a new tenant on a unit, not on the recurring monthly form.

For Linda's units (LF, LB), the panel must switch to the fixed-rate flow in Section 6 instead of the standard rent/occupant flow.

---

> **Note added 2026-09-15 — the water rate is a setting, not a constant.**
>
> Three places in this document stated the per-occupant water charge as a literal ₱200.
> **BR-014 makes it configurable**: it lives in `system_settings.water_rate_per_occupant`,
> seeded at 200, and the landlady may change it without a redeployment. Stating it as a
> constant is exactly how it came to be hardcoded in four backend handlers (known defects
> **D-2** and **A-2**, both since closed) — and step 7 of Section 7 was an *implementation
> instruction*, so a developer following it literally would have reintroduced the defect.
>
> Live values, verified 2026-09-15: `water_rate_per_occupant` **200**, `linda_lf_water_charge`
> **400**, `linda_lb_water_charge` **200**. The figures in this document are correct **today**;
> what changed is that they are now described as the settings they read from.

## 8. Open Questions

These are not resolved by this document and must not be silently assumed during implementation:

1. **Running totals**: the source spreadsheet's bottom-of-page total (e.g. `1,179,150`) is far larger than a single month's grand subtotal (e.g. `232,350`), implying it may be a year-to-date running total across all months on the sheet rather than a per-month figure. Confirm with the landlady whether Hivelet's report should show per-month totals only, year-to-date totals, or both.
2. ~~**GBG timing**~~ — **closed 2026-09-30**: the garbage fee is removed from the system (migration 066, BR-037 retired).
3. **Mid-cycle vacancy**: confirm how Rent Amount/Water Payment/Remitted Amount are handled when a tenant vacates partway through a billing period.
4. **Deposit refund**: confirm whether/how a deposit is reconciled or refunded when a tenant with a stored Column 12 deposit vacates (ties to BR-025 tenant deactivation).
