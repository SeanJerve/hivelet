# HIVELET FORM & DATA-FLOW AUDIT

**Scope:** every form, input, select, textarea and file picker in `website/src/`
(the live app on port 5174), mapped against the live Supabase schema.

**Purpose:** establish exactly what each form must read and write once the UI
stops using `systemState.ts` mock data, so the schema migration and the capstone
documentation are driven by real field requirements rather than guesswork.

**Method:** all 57 bound controls were inventoried from source, then each field
was compared against the live column definitions pulled from the database's
OpenAPI schema and against the governing business rule in
`02_BUSINESS_RULES.md`.

**Status of the data layer at audit time:** no view reads or writes the
database. Every form mutates an in-memory `reactive()` store and its data is
lost on refresh.

---

## 1. Form Inventory

| # | Form | File | Role | Target table(s) |
| --- | --- | --- | --- | --- |
| F-01 | Sign in | `views/LoginView.vue` | guest | `profiles` (read) |
| F-02 | Public inquiry | `views/PublicGuestView.vue` | guest | `inquiries`, `inquiry_messages` |
| F-03 | Record monthly payment | `views/BillingPaymentsView.vue` | admin | `monthly_income_records` |
| F-04 | Edit payment | `components/modals/EditPaymentModal.vue` | admin | `monthly_income_records` |
| F-05 | On-site cash payment | `components/modals/OnsitePaymentModal.vue` | admin | `payments`, `monthly_income_records` |
| F-06 | Log date expenses | `views/ExpensesLedgerView.vue` | admin | `monthly_expense_entries`, `expense_property_allocations` |
| F-07 | Edit expense | `components/modals/EditExpenseModal.vue` | admin | `monthly_expense_entries`, `expense_property_allocations` |
| F-08 | Onboard tenant | `views/TenantManagementView.vue` | admin | `profiles`, `room_assignments` |
| F-09 | Edit tenant | `views/TenantManagementView.vue` | admin | `profiles`, `room_assignments` |
| F-10 | Add unit spec | `views/RoomDirectoryView.vue` | admin | `rooms` |
| F-11 | Edit unit spec | `components/modals/AdminEditUnitModal.vue` | admin | `rooms`, `room_price_history` |
| F-12 | Tenant payment submission | `views/TenantPortalView.vue` | tenant | `payments` |
| F-13 | Tenant maintenance ticket | `views/TenantPortalView.vue` | tenant | `maintenance_tickets`, `ticket_attachments` |
| F-14 | System configuration | `views/SystemSettingsView.vue` | admin | **no table exists** |
| F-15 | Chat reply | `components/modals/LiveChatheadModal.vue` | admin | `inquiry_messages` / `ticket_messages` |

---

## 2. Field-by-Field Mapping

Legend — **OK** maps cleanly · **FIX** exists but mismatched · **ADD** needs a
schema change · **DERIVE** must be computed server-side, never stored from input.

### F-02 Public Inquiry → `inquiries`

| UI field | Column | Type | Verdict |
| --- | --- | --- | --- |
| `selectedUnitCode` | `room_id` | uuid FK | **FIX** — UI holds a room *code* (`"1c"`), column needs the uuid |
| `prospectName` | `prospect_name` | varchar NOT NULL | OK |
| `phone` | `prospect_phone` | varchar NOT NULL | OK |
| `email` | `prospect_email` | varchar **NOT NULL** | **FIX** — field is optional in the UI; insert will fail |
| `message` | `message` | text NOT NULL | OK |
| — | `status` | enum | DERIVE — always `Pending` on create |

`submitInquiry()` currently only sets a boolean flag; it performs no write.
The room dropdown also filters to `status === 'available'`, which contradicts
BR-007 (rooms stay publicly visible while Reserved/Occupied/Under Maintenance,
with status communicated).

### F-03 / F-04 Monthly Payment → `monthly_income_records`

| UI field | Column | Verdict |
| --- | --- | --- |
| `selectedUnitNum` | `room_id` | **FIX** — code → uuid |
| `datePaid` | `date_paid` | OK |
| `tenantName` | `contact_name` | OK — but should also resolve `tenant_profile_id` + `assignment_id` |
| `invoiceNum` | `invoice_number` | OK |
| `rentAmount` | `rent_amount` | OK |
| `occupantsCount` | `occupants` | OK (BR-034: should pre-fill from previous month) |
| `paymentMethod` | `payment_method` | **FIX** — UI emits `Cash`/`Online`; enum is `Cash`/`GCash`/`Bank Transfer`/`Adyen Online` |
| `referenceNum` | — | **ADD** — no reference/transaction column on this table |
| `calcShare` | `fifty_percent_share` | DERIVE (BR-035) |
| `calcWater` | `water_payment` | DERIVE (BR-014/BR-036) |
| `calcRemitted` | `remitted_amount` | DERIVE (BR-038) |
| — | `year`, `month` | DERIVE from `date_paid` |
| — | `rent_period_start/end` | DERIVE from anniversary date (BR-033) |
| — | `gbg_fee` | **missing from UI** (BR-037, annual charge) |
| — | `is_linda_billing`, `linda_electricity_charge`, `linda_water_charge` | **missing from UI** (BR-040) |
| — | `verification_status` | **missing from UI** |

### F-06 / F-07 Expenses → `monthly_expense_entries` + `expense_property_allocations`

| UI field | Column | Verdict |
| --- | --- | --- |
| `expenseDate` | `expense_date` | OK |
| `item.supplier` | `or_supplier` | OK |
| `item.catId` | `category_code` | **FIX** — see §3.1, the UI category list is invented |
| `item.amount` | `expense_property_allocations.amount` | OK |
| `item.area` | `expense_property_allocations.property_area` | **FIX** — see §3.2 |
| — | `total_expenses` | DERIVE (BR-045) |
| — | `created_by` | DERIVE from session |

**Structural defect.** The DB models one entry with *many* allocations
(1:N), correctly implementing BR-044. The UI models a flat list where each row
carries exactly one area, so a single receipt split across Boarding House and
Main House must be entered twice — duplicating its date, supplier and category,
which BR-044 explicitly forbids. **The form needs redesigning, not just
rewiring:** one entry header (date, supplier, category) plus a repeatable
allocation sub-list.

### F-08 / F-09 Tenant Onboarding → `profiles` + `room_assignments`

| UI field | Column | Verdict |
| --- | --- | --- |
| `newTenantName` | `profiles.full_name` | OK |
| `newTenantPhone` | `profiles.phone_number` | OK |
| `newTenantEmergency` | `emergency_contact_name` + `_phone` | **FIX** — UI is one free-text field (`"Maria (Mother - 0918...)"`); schema has two columns |
| `newTenantRoom` | `room_assignments.room_id` | **FIX** — code → uuid |
| `newTenantMoveIn` | `room_assignments.start_date` | OK |
| — | `profiles.email` | **missing — NOT NULL + unique.** Onboarding cannot succeed without it |
| — | `room_assignments.anniversary_date` | **missing — NOT NULL** (BR-033/BR-035) |
| — | `room_assignments.deposit_amount` | **missing — NOT NULL** (BR-039) |
| — | `room_assignments.occupant_count` | **missing — NOT NULL** (BR-034) |
| — | `profiles.occupation`, `facebook_url` | missing (System Bible §19) |
| `status` | `profiles.account_status` | **FIX** — see §3.3 |

This is the **most broken form in the system**: four NOT NULL columns have no
input at all, so the current form cannot produce a valid row.

### F-10 / F-11 Unit Specification → `rooms`

| UI field | Column | Verdict |
| --- | --- | --- |
| `newUnitCode` | `room_number` | OK |
| `newCluster` | `cluster_code` | **FIX** — UI uses `"BH (Main Rooms)"`, FK value is `"BH"` |
| `newType` / `.type` | `room_type` | **FIX** — see §3.4 |
| `newPrice` / `.price` | `current_price` | OK — must also write `room_price_history` |
| `maxOccupants` | `capacity` | OK |
| `status` | `operational_status` | **FIX** — see §3.5 |
| `desc` | `description` | OK |
| `photo` | — | **ADD** — no room photo storage exists |
| `waterRateType` | `is_linda_unit` | **FIX** — `'standard'`/`'linda_fixed'` → boolean |
| — | `visibility_status` | **missing from UI** (BR-007 Published/Hidden) |
| — | `available_from` | **missing from UI** (BR-005 expected availability) |
| — | `floor` | **missing** — NOT NULL; UI only has a free-text `floorLabel` |

### F-13 Maintenance Ticket → `maintenance_tickets` + `ticket_attachments`

| UI field | Column | Verdict |
| --- | --- | --- |
| `ticketTitle` | `title` | OK |
| `ticketCategory` | `category` | OK (free varchar; consider a lookup) |
| `ticketPriority` | `priority` | **FIX** — dropdown omits `Low`, which BR-021 requires |
| `ticketDescription` | `description` | OK |
| `ticketPhotoUrl` | `ticket_attachments.file_url` | **FIX** — UI holds a base64 data URL from `FileReader`; column expects a URL. Needs Supabase Storage upload |
| `assignedTo` / `technician` | — | **ADD** — no technician column |
| — | `room_id`, `tenant_profile_id` | DERIVE from session (never from the client) |

### F-14 System Configuration → *no table*

`standardWaterRate` (₱200), `lindaLfWaterRate` (₱400), `lindaLbWaterRate` (₱200)
are local `ref()`s. "Save Configuration" fires a toast and persists nothing.
BR-014 and BR-040 rates are otherwise hardcoded across the codebase.
**Needs a `system_settings` table.**

---

## 3. Enum & Vocabulary Mismatches

Every one of these will throw a Postgres enum error on first write.

### 3.1 Expense categories — UI list is invented

BR-043 fixes the category list, and `fixed_expense_categories` already holds all
13 rows correctly. The UI hardcodes a **different 7-item list** in two files
(`ExpensesLedgerView.vue`, `EditExpenseModal.vue`), with codes that collide
against different meanings.

| UI code | UI label | Actual DB meaning of that code |
| --- | --- | --- |
| `1` | Taxes & Licenses | **Supplies** |
| `2` | Salaries & Wages | **Taxes and Licenses** |
| `3` | Supplies & Hardware | **Janitorial and Messengerial Services** |
| `4` | Capital Outlay / Improvements | **Depreciation** |
| `5` | Miscellaneous | **Professional Fees** |
| `7` | Comm, Light, Water (Utilities) | Communication, Light, and Water ✓ |
| `8` | Repairs & Maintenance | Repairs and Maintenance ✓ |

Codes 1–5 are **silently wrong**: an expense tagged "Taxes & Licenses" in the UI
would be stored as *Supplies*. Missing entirely from the UI: `6` Salaries with
its `6a` PhilHealth / `6b` SSS / `6c` Allowances sub-lines (required by BR-043
and FR-041), `9` Fuel and Oil, `10` Others.

**Fix:** delete both hardcoded arrays; load from `GET /api/admin/expense-categories`.

### 3.2 Property areas

| UI value | DB `property_area_type` |
| --- | --- |
| `BH` | `Boarding House` |
| `MainHouse` | `Main House` |
| `FrontApt` | `Front Apartment` |
| `BackApt` | `Back Apartment` |
| `Other` | `Other Expenses / Personal` |

### 3.3 Tenant status — conflates two concepts

UI offers `Active` / `Overdue` / `Vacated`; `profiles.account_status` is only
`active` / `inactive`. **`Overdue` is a billing state, not an account state** —
it belongs to `bills.status`. Storing it on the profile would mean an overdue
tenant loses portal access, which is not what BR-011 or BR-025 say.

Correct mapping: `Active` → `active`; `Vacated` → `inactive` (BR-025);
`Overdue` → derive from `bills`, display only.

### 3.4 Room type

UI: `Studio`, `1-Bedroom`, `2-Bedroom`, `3-Bedroom`, `Penthouse Suite`, `Special Unit`.
DB `room_type_enum`: `Studio`, `One-bedroom`, `Two-bedroom`, `Three-bedroom`.

Note the seed data already resolves the two extras — PH is stored as
`Three-bedroom`, and the Linda units as `One-bedroom` with `is_linda_unit = true`.
`RoomDirectoryView` makes this worse by using a **free-text input** for type, so
any string can be submitted.

### 3.5 Room status — conflates occupancy with payment

UI: `available` / `occupied` / `pending` / `overdue`.
DB `operational_status_type`: `Available` / `Reserved` / `Occupied` / `Under Maintenance`.

`pending` and `overdue` are payment states on the wrong entity. More seriously,
the UI has **no way to set `Reserved`** — so BR-006 ("a reserved room must not
accept new public inquiries") is unenforceable through the interface — and no
way to set `Under Maintenance`, breaking the BR-005 vacancy workflow.

### 3.6 Payment method

UI emits `Cash` / `Online` (admin forms) and `GCash / Online Payment` /
`Maya / Online Bank` / `Cash Payment On-Site` (tenant portal).
DB `payment_method_type`: `Cash` / `GCash` / `Bank Transfer` / `Adyen Online`.
**Maya has no enum value.**

### 3.7 Ticket status

UI: `OPEN` / `RESOLVED` (admin) and `IN PROGRESS` / `RESOLVED` (tenant).
DB: `Submitted` / `In Progress` / `Resolved` / `Closed`.

The admin "Close Ticket" button calls `resolveTicket()`, which sets `RESOLVED`.
BR-023 treats resolution and closure as distinct, with closure reserved to the
administrator — the UI currently collapses them.

### 3.8 Inquiry status

UI: `Pending Review` / `Replied` / `Converted`. DB: `Pending` / `Contacted` /
`Converted` / `Closed`.

---

## 4. Schema Additions Required

Delivered in `database/migrations/004_form_schema_gaps.sql`.

| # | Need | Driven by |
| --- | --- | --- |
| 1 | `room_photos` table | F-10/F-11 photo field; System Bible §5 ("photos") |
| 2 | `system_settings` table | F-14; BR-014, BR-036, BR-040 |
| 3 | `monthly_income_records.transaction_reference` | F-03 GCash Ref # |
| 4 | `maintenance_tickets.assigned_technician` | F-13; admin dispatch view |
| 5 | `profiles.email` made nullable **or** onboarding form gains an email input | F-08 |

Item 5 is a **decision, not a defect** — see §7.

---

## 5. Business-Rule Violations Found in Form Logic

| Rule | Violation | Location |
| --- | --- | --- |
| BR-036 | Water is auto-computed with **no mismatch warning**; the rule requires warning the admin before saving a discrepancy | `BillingPaymentsView`, `EditPaymentModal` |
| BR-038 | `OnsitePaymentModal` runs the formula **backwards**: `rent = amount - 400`, hardcoding water at ₱400 and occupants at 2 | `OnsitePaymentModal.vue:26-30` |
| BR-034 | Occupant count does not carry forward from the previous month | `BillingPaymentsView` |
| BR-033 | Rent period hardcoded to the literal string `'Current Period'` | `BillingPaymentsView.vue:57` |
| BR-035 | 50% share is correctly derived in the UI, but must be **recomputed server-side** — the client value cannot be trusted | all payment forms |
| BR-037 | GBG fee absent from every form | — |
| BR-040 | No Linda fixed-billing flow; LF/LB use the standard per-occupant path | `BillingPaymentsView` |
| BR-044 | Split allocation impossible (see §2, F-06) | `ExpensesLedgerView` |
| BR-021 | `Low` priority missing from the tenant dropdown | `TenantPortalView.vue:643` |
| BR-006 | No way to set `Reserved`, so the inquiry block cannot be triggered | `AdminEditUnitModal` |
| BR-007 | Public catalogue hides all non-available units | `PublicGuestView.vue:11` |
| BR-003 | `deleteTenant` / `deleteIncomeRecord` / `deleteExpenseItem` **hard-delete**; historical records must be preserved | `systemState.ts` |

The BR-003 item is the most consequential: three UI actions permanently destroy
financial and tenancy history that System Bible §14 requires be retained. These
must become soft-deletes or status changes.

---

## 6. Fields the Server Must Own

Never accept these from a form body — compute or resolve them server-side:

- `tenant_profile_id`, `room_id` on tenant-submitted tickets and payments — from the session
- `fifty_percent_share`, `water_payment`, `remitted_amount`, `total_expenses` — BR-035/036/038/045
- `year`, `month`, `rent_period_start`, `rent_period_end` — from `date_paid` + anniversary
- `verification_status` — admin-only transition (BR-017)
- `created_by`, `verified_by`, `closed_by`, `actor_profile_id` — from the session
- All `created_at` / `updated_at` — server clock (05_DATABASE_DESIGN.md Rule 7)

---

## 7. Open Decisions

**7.1 Tenant email.** `profiles.email` is NOT NULL and unique because it is the
login identifier, but the landlady onboards tenants who may not have email. Options:
(a) require email at onboarding; (b) make it nullable and let tenants without one
simply have no portal access; (c) auto-generate a placeholder. This needs your call —
it changes both the form and the migration.

**7.2 Unit count.** BR-032 and System Bible §5 both say **32** units, but the
canonical list enumerates **33**: BH 22 (1a–1h = 8, 2a–2g = 7, 3a–3g = 7) +
Back Apartment 5 + Penthouse 1 + Front Apartment 3 + Linda 2. The database
holds 33 and matches the enumeration. Either the prose "32" is an arithmetic
error, or one unit should not be listed. The docs need correcting either way.

**7.3 Tenant-submitted payments.** F-12 lets a tenant record a payment awaiting
verification, which fits FR-015/BR-017. The RBAC matrix currently grants tenants
no payment-write permission and there is no endpoint. If this form stays, it
needs `payment:submit:own` plus a scoped endpoint that forces
`verification_status = 'Pending Verification'`.

---

## 8. RBAC Per Form

Confirms the enforcement built in `backend/src/config/rbac.ts`.

| Form | Required permission | Guest | Tenant | Admin |
| --- | --- | --- | --- | --- |
| F-02 Inquiry | `inquiry:create` | ✅ | ✅ | ✅ |
| F-03..F-05 Payments | `payment:record` | ❌ | ❌ | ✅ |
| F-06/F-07 Expenses | `expense:write` | ❌ | ❌ | ✅ |
| F-08/F-09 Tenants | `tenant:manage` | ❌ | ❌ | ✅ |
| F-10/F-11 Units | `room:manage` | ❌ | ❌ | ✅ |
| F-12 Tenant payment | `payment:submit:own` *(to be added)* | ❌ | ✅ own | ✅ |
| F-13 Ticket | `ticket:create:own` | ❌ | ✅ own | ✅ |
| F-14 Settings | `settings:manage` *(to be added)* | ❌ | ❌ | ✅ |

BR-048 is satisfied: F-03 through F-07 are admin-only.

---

## 9. Recommended Sequence

1. Apply `004_form_schema_gaps.sql` (after resolving §7.1)
2. Replace the two hardcoded category arrays with the API lookup — highest
   data-integrity risk, smallest change
3. Add the missing NOT NULL inputs to tenant onboarding (F-08)
4. Correct the five enum vocabularies (§3.2–3.8)
5. Restructure the expense form for BR-044 split allocation
6. Convert hard-deletes to soft-deletes (BR-003)
7. Wire forms to the API view by view, retiring `systemState.ts` as each lands
