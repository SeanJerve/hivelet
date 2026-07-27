# HIVELET MONTHLY EXPENSES REPORT

This document describes the landlady's existing Excel-based Monthly Expenses ledger (the "Monthly Expenses" tab, alongside "Monthly Income" and "STATEMENT OF LOAN") and defines how Hivelet must reproduce its output while replacing manual entry and manual category totals with a guided admin panel.

This is the authoritative source for BR-041 through BR-047 (`02_BUSINESS_RULES.md`) and FR-037 through FR-042 (`03_REQUIREMENTS.md`).

Only the administrator (landlady) creates or edits this report (BR-048), and it must be exportable as an Excel-compatible file (BR-049, FR-044).

---

## 1. Purpose

The landlady logs every expense (repairs, supplies, salaries, utilities, taxes, etc.) she pays out of pocket, tags it to the part of the property it belongs to and to a fixed accounting category, and needs running per-category totals for the month plus a year-to-date cumulative figure. Hivelet must let her log an expense once, through a guided form, and have every total update automatically.

---

## 2. Property Areas (Allocation Buckets)

Every peso of an expense is allocated to exactly one of five Property Areas:

- Boarding House Expenses
- Main House Expenses
- Front Apartment Expenses
- Back Apartment Expenses
- Other Expenses / Personal

"Boarding House", "Front Apartment", and "Back Apartment" line up with the BH, Front Apartment, and Back Apartment unit clusters defined in `09_MONTHLY_INCOME_REPORT.md`. **"Main House" is a new concept not present in the Monthly Income Report's unit clusters** — its exact meaning (a separate physical structure, the landlady's personal residence, or something else) is unconfirmed. See Section 8, item 1.

A single expense entry may be split across **more than one** Property Area (e.g. one electric bill covering both Boarding House and Main House) — see Section 5.

---

## 3. Fixed Expense Categories (Chart of Accounts)

Every expense entry is tagged to exactly one category, from a fixed, static list:

| ID | Category |
| --- | --- |
| 1 | Supplies |
| 2 | Taxes and Licenses |
| 3 | Janitorial and Messengerial Services |
| 4 | Depreciation |
| 5 | Professional Fees |
| 6 | Salaries: Michelle |
| 6a | PhilHealth |
| 6b | SSS |
| 6c | Allowances |
| 7 | Communication, Light, and Water |
| 8 | Repairs and Maintenance |
| 9 | Fuel and Oil |
| 10 | Others |

6a/6b/6c are sub-lines under category 6 (Salaries), not independent top-level categories. This list is fixed system-wide and is not editable per month.

---

## 4. Ledger Structure (Columns)

| Column | Field | Format / Input | Rule |
| --- | --- | --- | --- |
| 1 | Date | Calendar-picked date | The observed spreadsheet format is `D-MMM-YY` (e.g. `4-Jun-26`), matching the Income report's Date Paid column. (A `DD/MM/YYYY` format was also described verbally — confirm which is authoritative; see Section 8, item 2.) |
| 2 | OR / Supplier | Text | Free-text description of the vendor, contractor, or bill (e.g. `Wilcon Depot (bh)`, `Electricbill (May26)`). |
| 3-7 | Property Area amounts | Currency, one column per area | The amount charged to each Property Area (Section 2) for this entry. Most entries use exactly one column; see Section 5 for split entries. |
| 8 | Category ID | Dropdown (Section 3 list) | **One category per expense entry**, even when the entry's amount is split across multiple Property Areas (Section 5). |
| — | Total Expenses (row) | Currency, derived | Sum of the Property Area columns (3-7) for that row. |

At the bottom of each month's block, columns 3-7 and the Total Expenses column are each summed into a **month total row** (e.g. `JUNE TOTAL`).

---

## 5. Splitting a Single Expense Across Property Areas

One ledger entry can allocate money to more than one Property Area while keeping a single date, a single OR/Supplier description, and a single Category.

Example from the source spreadsheet: the `4-Jun-26 Electricbill (May26)` entry places ₱14,964.13 under Boarding House Expenses and ₱5,688.67 under Main House Expenses, on the same entry, tagged once to category 7 (Communication, Light, and Water).

This means the data model is: **one expense record, tagged to one category, with one-or-more (Property Area, amount) allocations.** The category is never split or duplicated per area — only the money is.

The admin panel must let the landlady add additional Property Area allocations to the same entry (a `+ Add Area` control), not force her to re-enter the date/supplier/category for each split.

---

## 6. Report Layout & Totals

Each month's block contains two independent totals systems that must both be automatic:

### 6.1 Bottom totals (by Property Area)

At the end of each month's ledger rows, sum each Property Area column (3-7) and the Total Expenses column across all entries in that month.

### 6.2 Right-side summary (by Category) — two columns

A fixed summary table lists all categories (Section 3) with two figures per category, per month:

- **"This month" column**: the sum of every entry tagged to that category, for the current month only.
- **Cumulative/"Recent month" column**: `this_month's cumulative = previous_month's cumulative + this_month's "This month" total`, i.e. a running year-to-date total per category, carried forward from month to month.

This running-total mechanic is directly confirmed by the source data: May's cumulative bottom total was ₱886,686.82, June's "This month" bottom total was ₱167,919.52, and June's cumulative bottom total is ₱1,054,606.34 — exactly `886,686.82 + 167,919.52`. **This strengthens (but does not by itself confirm) the same hypothesis raised for the Monthly Income Report's bottom totals in `08_OPEN_DECISIONS.md` item 10** — the two ledgers appear to follow the same "current month + running cumulative" convention.

The bottom-of-block red total (e.g. `167,919.52` / `1,054,606.34`) is the sum across all ten categories and must reconcile with the Property-Area bottom totals (Section 6.1) for the same month.

---

## 7. Admin Panel Workflow (Data Entry Automation)

1. **Pick Date** — calendar picker, no free-text date entry.
2. **Enter OR/Supplier** — free text.
3. **Select Property Area + Amount** — dropdown restricted to the five areas in Section 2, paired with an amount field.
4. **Split (optional)** — a `+ Add Area` control adds another (Property Area, amount) pair to the *same* entry, without re-asking for date/supplier/category.
5. **Assign Category** — single dropdown restricted to the fixed list in Section 3, applied once to the whole entry regardless of how many areas it was split across.
6. **Save & Auto-Calculate** — on save, the system must, without further input:
   - add the entry's row total into the correct Property Area bottom totals (Section 6.1)
   - add the entry's amount into the correct category's "This month" total (Section 6.2)
   - roll the correct category's cumulative total forward (Section 6.2)

---

## 8. Open Questions

These are not resolved by this document and must not be silently assumed during implementation:

1. **"Main House" scope**: confirm what "Main House Expenses" refers to — it has no corresponding unit cluster in `09_MONTHLY_INCOME_REPORT.md`.
2. **Date format**: the spreadsheet shows `D-MMM-YY` (matching the Income report), but the verbal description of this feature stated `DD/MM/YYYY`. Confirm which is authoritative for entry and display.
3. **Cumulative reset**: confirm whether the Category cumulative column (Section 6.2) ever resets (e.g. at calendar year start) or runs indefinitely.
4. **Category edits**: confirm whether the fixed category list (Section 3) can ever be edited/extended by the administrator, or is permanently hardcoded.
