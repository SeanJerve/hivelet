# HIVELET OPEN DECISIONS

This file is intentionally kept for decisions that must be finalized before the related implementation.

## 1. Final exact monthly billing generation behavior

Need to finalize:
- whether bills are generated automatically on schedule
- how the system handles missed generation
- whether an administrator can regenerate safely

## 2. Exact water billing relationship — RESOLVED

The business rule is ₱200 per person (BR-014).

The count used is the occupant count the administrator maintains per unit (BR-034): it carries forward from the previous month's entry for the same tenant and is manually edited by the administrator when occupancy changes. The system validates Water Payment against this count (BR-036) and warns on mismatch rather than blocking silently.

See `09_MONTHLY_INCOME_REPORT.md` for the full monthly entry workflow. Linda's units (LF, LB) are excluded from this model — they use a fixed per-unit rate instead (BR-040).

## 3. Exact payment verification workflow

Need to finalize:
- what evidence the administrator reviews
- what statuses exist
- what happens when a payment is rejected

## 4. Exact Adyen/GCash production workflow

Must be finalized against the actual Adyen configuration and sandbox/production requirements before integration.

## 5. Exact report export formats

Candidate formats:
- CSV
- Excel-compatible spreadsheet
- PDF

**Update:** confirmed for the Monthly Income Report and Monthly Expenses Report specifically — both must export as Excel-compatible spreadsheet files (BR-049, FR-044). Still open for other exportable records (payment history, occupancy, maintenance history, inquiries, audit activity — see `01_SYSTEM_BIBLE.md` Section 18).

## 6. Exact notification priority rules

Need to define which events are:
- urgent
- normal
- informational

## 7. Exact communication retention rules

Need to define how long messages and attachments are retained.

## 8. Exact tenant reactivation workflow

The intended direction is reuse of an existing historical tenant record without creating a duplicate.

The exact reactivation flow must be finalized before implementation.

## 9. Exact room price increase workflow

The business rule is a 2% increase after at least one year of tenancy.

Need to finalize:
- whether the increase applies automatically or requires administrator confirmation
- the exact effective date
- rounding behavior

## 10. Monthly Income Report running totals

The source spreadsheet shows a bottom-of-page total far larger than a single month's grand subtotal, implying a possible year-to-date running total. Confirm with the landlady whether Hivelet should show per-month totals only, year-to-date totals, or both. See `09_MONTHLY_INCOME_REPORT.md` Section 8.

**Update:** the Monthly Expenses ledger confirms this exact "this month + running cumulative" pattern in its own category totals (see `10_MONTHLY_EXPENSES_REPORT.md` Section 6.2: June cumulative = May cumulative + June's month total, verified against the source numbers). This makes it likely the Income report's bottom totals follow the same convention, but it is not yet confirmed for Income specifically.

## 11. Garbage (GBG) fee timing

Confirm what determines which month's entry the annual garbage fee is attached to: fixed calendar month, tenant anniversary month, or administrator discretion. See `09_MONTHLY_INCOME_REPORT.md` Section 8.

## 12. Mid-cycle vacancy billing

Confirm how Rent Amount, Water Payment, and Remitted Amount are handled when a tenant vacates partway through a billing period. See `09_MONTHLY_INCOME_REPORT.md` Section 8.

## 13. Deposit reconciliation on vacancy

Confirm whether/how a stored deposit (Column 12 of the Monthly Income Report) is reconciled or refunded when a tenant vacates, in relation to BR-025. See `09_MONTHLY_INCOME_REPORT.md` Section 8.

## 14. "Main House" scope

The Monthly Expenses ledger allocates money to a "Main House Expenses" Property Area that has no corresponding unit cluster in the Monthly Income Report. Confirm what this refers to (a separate structure, the landlady's personal residence, or something else). See `10_MONTHLY_EXPENSES_REPORT.md` Section 8.

## 15. Monthly Expenses date format

The Monthly Expenses spreadsheet displays dates as `D-MMM-YY` (matching the Income report), but the feature was also verbally described using `DD/MM/YYYY`. Confirm the authoritative format. See `10_MONTHLY_EXPENSES_REPORT.md` Section 8.

## 16. Expense category cumulative reset

Confirm whether the expense category cumulative totals ever reset (e.g. at calendar year start) or accumulate indefinitely. See `10_MONTHLY_EXPENSES_REPORT.md` Section 8.
