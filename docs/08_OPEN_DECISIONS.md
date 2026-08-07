# HIVELET RESOLVED & FINALIZED SYSTEM DECISIONS

This document records the official decisions made for the Hivelet Apartment Management & Financial Operations System based on `01_SYSTEM_BIBLE.md` and `02_BUSINESS_RULES.md`.

---

## 1. Primary Payment Policy (Landlady Preference: On-Site Cash Payment)
- **Decision**: The owner / landlady prefers **On-Site In-Person Cash Payment** as the primary payment method.
- **On-Site Workflow**: Tenants pay their monthly bill directly to Mrs. Fe Galang Da Silva at the Boarding House Office. The administrator logs the cash payment in the Admin Control Center using `💵 [ Record On-Site Cash Payment ]`, issuing an official paper receipt and settling the balance to ₱0.00.
- **Optional GCash Online Payment (BR-016)**: GCash online checkout via Adyen is strictly optional. Tenants who prefer digital payment can submit online payments, which enter `Pending Verification` status for admin approval.
- **Tenant Balance Visibility**: The Tenant Portal displays the tenant's itemized outstanding balance statement ($\text{Base Rent} + \text{Water Utility @ ₱200/head}$) along with clear instructions for on-site cash collection.

## 2. Final Monthly Billing Generation Behavior
- **Decision**: Bills are automatically generated on each tenant's specific monthly due date based on their move-in date (BR-010).
- **Admin Override**: The administrator can safely regenerate or adjust a bill if water occupant counts change or special adjustments apply. All adjustments generate an audit record (BR-018).

## 3. Exact Water Billing Relationship
- **Decision**: Water is charged at **₱200 per registered occupant** assigned to the active room contract (BR-014, BR-034).
- **Calculation Formula**:  
  $$\text{Total Monthly Bill} = \text{Base Room Rent} + (\text{Registered Occupants} \times ₱200.00)$$
- **Linda's Units Exception**: Linda's units (LF, LB) are excluded from this model — they use a fixed per-unit rate instead (BR-040).

## 4. Report Export Formats
- **Decision**: The system provides export capability in primary formats (BR-030):
  - **Excel-Compatible Spreadsheet**: Confirmed for Monthly Income Report and Monthly Expenses Report (BR-049, FR-044).
  - **PDF Export**: Clean, printable summary reports for capstone evaluation and official accounting.

## 5. Maintenance Ticket Administration
- **Decision**: Tenants can submit tickets with title, description, priority (Emergency, High, Medium, Low), and optional photo attachment (BR-021, BR-022). The administrator retains sole final authority to inspect and close resolved tickets (BR-023).

## 6. Notification Priority Rules
- **Decision**:
  - 🔴 **Emergency / High Priority**: Water leak / electrical emergency tickets, payments overdue past grace period (>7 days).
  - 🟡 **Medium / Pending Priority**: Payments pending admin verification, new room inquiry submitted by prospective tenant.
  - 🔵 **Low / Informational**: Ticket status updates, general boarding house announcements.

## 7. Tenant Reactivation & Profile Reuse
- **Decision**: To prevent duplicate records (BR-026, BR-027), when a former tenant returns, the administrator re-links their existing historical profile record rather than creating a duplicate entry.

## 8. Room Rent Adjustment Workflow
- **Decision**: After 1 year of continuous tenancy, the system presents an automated recommendation for a 2% annual rent adjustment. The change requires explicit administrator confirmation before taking effect on the next billing cycle.

## 9. Additional Monthly Income & Expense Ledger Notes
- Monthly Income Report running totals, GBG garbage fee timing, and deposit reconciliation workflows are implemented according to `09_MONTHLY_INCOME_REPORT.md` and `10_MONTHLY_EXPENSES_REPORT.md`.

## 10. Canonical Unit Count: 32 Units, No Penthouse Cluster (2026-08-07)
- **Conflict found**: The original schema migration, seed data, `DATABASE_SPECIFICATION.md`, `09_MONTHLY_INCOME_REPORT.md`, `03_REQUIREMENTS.md`, and `UI_DESIGN_SYSTEM_GUIDELINES.md` all described a 33-unit property with a 5th "Penthouse (PH)" cluster. This contradicted `docs/reference/manuscript.txt` ("the 32-unit Fe Galang Da Silva Apartment") and `01_SYSTEM_BIBLE.md` Section 5 ("32 total rooms/units"), which never mention a Penthouse.
- **Decision**: The manuscript is the academic authority (`CAPSTONE_ALIGNMENT_PROTOCOL.md`). The property is **32 units across four clusters**: BH, Back Apartment, Front Apartment, Linda. The Penthouse cluster and its single 'PH' room are removed from the schema, seed data, and all documentation.
- **Confirmed by**: Project owner, 2026-08-07.
