# 1. Product Requirements Document (PRD)

**Hivelet**, apartment management for the Fe Galang Da Silva Boarding House.
Written 7 October 2026 from the system as it runs at `https://hivelet.vercel.app`, the requirements
register (`docs/03_REQUIREMENTS.md`), the business rules (`docs/02_BUSINESS_RULES.md`) and Chapter 4
of the manuscript. Where the system and an older document disagree, this file says what the system
does today and names the older wording.

---

## 1. The problem

The owner ran a 33-unit property, 32 of them occupied, from a two-sheet spreadsheet workbook on
removable storage, a paper invoice book, cash collected on site, and requests sent by messaging app or
in person. Each area kept its own record and nothing connected them. When her records were moved into
the system, 402 of 937 income rows had no anniversary date or deposit, and five invoice numbers had
each been used twice. General property-management products assume card payments, online leases and a
property manager; she has none of those.

## 2. Who uses it

| User | What they need | How they get in |
| :--- | :--- | :--- |
| **Visitor** (prospective tenant) | See the units, their rates and which are free; ask about one | The public site, no account |
| **Prospect** | A visitor who sent an inquiry; their details carry over if they move in | Private link or reference code with their phone number |
| **Tenant** | See their unit, what they owe and have paid; pay by GCash; report and follow repairs | An account the owner creates, with a one-time starting password |
| **Administrator** (the owner, or Michelle who manages for her) | Run the whole property: units, tenants, money in and out, repairs, inquiries | The one administrator account |

## 3. Goals and non-goals

**Goals**
- One connected record of units, tenancies, receipts, expenses, repairs and inquiries.
- Keep the owner's own way of working: her two workbook sheets, her invoice numbers, cash first.
- Let tenants see their own standing and report repairs without a phone call.
- Work on the phones and laptop the owner and tenants already have, without an app store.

**Not in scope** (the delimitations in Section 1.4 of the manuscript)
- Electricity. Every unit has its own meter and the tenant pays the electric company directly.
- Recording payments or other changes without a connection (reading saved figures offline is in).
- Refunds through the system. A rejected GCash payment is refunded in Adyen's own dashboard.
- More than one property. SMS or email notifications (notifications are in-app).

## 4. Features

Status: **Live** means used on the real records; **Partial** means it works but not to the full
requirement as written; **Planned** means not built.

### 4.1 Public site and inquiries

| Feature | What it does | Status |
| :--- | :--- | :--- |
| Landing page | The building photograph, "33 Units, 4 Floors", the address, the four unit categories and the house rules | Live |
| Unit catalogue | Each category's units with floor, capacity, floor plan, rate and whether it is vacant, read live from the database. Never shows a tenant's name | Live |
| Vacancy prompt | When a unit is vacant, a once-per-visitor prompt invites a viewing | Live |
| Send an inquiry | Name, email, Philippine mobile, a question, about a specific unit, with no account. Rate-limited | Live |
| Read the reply | On sending, a private link and a short reference code; either (the code with the phone number) opens the conversation, where the visitor can write back | Live |
| Privacy policy and terms | Plain-language policy under the Data Privacy Act of 2012 | Live |

### 4.2 Units and tenants (administrator)

| Feature | What it does | Status |
| :--- | :--- | :--- |
| Rooms and rates | Every unit by cluster with tenant, rent and status; edit rate, kind, status, public visibility and floor plan photo. Every rate change is recorded with old rate, new rate, date and who | Live |
| Tenants | Current tenants by cluster; move someone in (unit, deposit, move-in and anniversary dates, occupants, emergency contact), edit, move out with an optional reason | Live |
| Inquiry to tenancy | An accepted inquiry becomes a tenancy linked to it | Live |
| Reset a tenant's password | Gives the tenant a new one-time password; they choose their own at next sign-in | Live |
| Occupant count memory (FR-033) | The occupant count carries forward from the tenancy the owner edits, not from last month's ledger row as worded | Partial |

### 4.3 Money (administrator and tenant)

| Feature | What it does | Status |
| :--- | :--- | :--- |
| Bills | Rent plus water (₱200 per occupant, a rate in the settings) for a period from the tenancy's anniversary date; raised on demand, not by a scheduler; overdue from the day after the due date, with no grace period | Live |
| Record a payment | The owner records a cash, bank or GCash payment against a unit and month with her own invoice number or "ACK" for a slip with no number; water is computed, never typed; warns before a second payment for the same month | Live |
| Pay with GCash | The tenant pays through Adyen's GCash page. It enters **Pending Verification** and changes nothing until the owner verifies it. Adyen is on its test account, so no real money moves yet | Live (test account) |
| Verify, correct, void | The owner verifies or rejects online payments, corrects a receipt, or voids it with a reason; nothing is deleted | Live |
| Monthly Income | Her income sheet: receipts by cluster with Rent, Water, the 50% Share and Remitted, filed under the month the rent is for. The 50% Share is a system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet | Live |
| Monthly Expenses | Her expense sheet: each entry with supplier, one of her numbered categories, split across property areas; totals worked out | Live |
| Downloads | Excel workbooks of either ledger, by month, year or all, in her layout | Live |
| Overview figures | Collections by month, occupancy, net operating income, what needs her attention | Live (computed in the browser, not a server report: FR-019 and FR-020 Partial) |
| Linda's units | Water at ₱200 per occupant, recorded separately and kept out of the property's grand totals, as in her workbook | Live |
| Tenant payments page | "Your rent, month by month": paid up to, what is due, each month Paid, Due, Not entered or Not due yet | Live |

### 4.4 Repairs, notifications and history

| Feature | What it does | Status |
| :--- | :--- | :--- |
| Report a repair | Tenant: title, category, urgency, details, optional JPG or PNG photo | Live |
| Follow and cancel | Tenant sees status and notes; can cancel until work starts, once an hour | Live |
| Repairs board | Owner: to dispatch, in progress, done; log a repair she was told about, including for an empty unit; only she closes one | Live |
| Notifications | In-app, each opening the record it is about | Live |
| Recently | Each person's own latest action in plain words (phone) or last three (computer sidebar) | Live |
| Audit trail | Every administrator action recorded; kept in the database for the developers, not shown in the app (adviser's call, 1 Oct) | Live |

### 4.5 Access, security and devices

| Feature | What it does | Status |
| :--- | :--- | :--- |
| Sign in | By email, phone or login ID; account locks for 15 minutes after five wrong passwords | Live |
| First sign-in | Must choose a new password (10 characters, a letter, a number, not a known breached password) and give a phone and email | Live |
| Roles | Visitor, prospect, tenant, administrator, from one permission matrix checked by the server on every request | Live |
| Progressive Web App | Installs from the browser on Android, iPhone and computers; opens offline with the last saved figures readable and every write disabled | Live |
| Light and dark mode | Follows the device, switchable at the top of the public pages | Live |

## 5. Requirements that changed

| Requirement as written | What the system does, and why |
| :--- | :--- |
| FR-013 "grace-period status" | No grace period. The owner confirmed a bill is overdue the day after it is due |
| FR-034 "warn on a mismatched water value" | Water cannot be typed at all; it is worked out from the occupants |
| FR-036 "Linda fixed billing flow" | Linda's units pay the same ₱200 per occupant, recorded separately (BR-040) |
| NFR-008 "deployable to the university server" | Hosted on Vercel and Supabase |
| FR-033 previous-month occupants | Taken from the tenancy instead (Partial) |
| FR-019, FR-020 cash flow and profitability | Shown on the Overview, computed in the browser from the ledgers (Partial) |

The 16 September grading of all 44 requirements: 25 implemented as worded, 15 in part, 1 in the
interface only, 3 not as worded (`docs/claude_pipeline/outputs/PHASE1_TRACEABILITY_MATRIX.md`).

## 6. How success is measured

From Chapter 4: 82 of 83 tests executed passed (98.8%) with no critical defect; three tenants
completed all 34 task attempts, 31 without help; six respondents rated the system 4.53, Very High
Quality, on ISO/IEC 25010:2011. Section 4.4.11 of the manuscript has the full evaluation.
