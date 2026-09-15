# HIVELET RESOLVED & FINALIZED SYSTEM DECISIONS

> **This filename is misleading, and the rename it was promised has not happened.**
> The file is called `08_OPEN_DECISIONS.md` but its contents — including this H1 — are
> **closed** decisions. Anyone opening it looking for the project's unresolved questions
> will find none and conclude that none exist.
>
> **The open questions live in `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md`.**
> That register's Section 0 prescribed renaming this file to `08_CLOSED_DECISIONS.md` in
> Phase 2 and striking Section 9. Checked 2026-09-15: the rename has not been done. This
> banner stands in for it until someone does, because a wrong filename that nobody has
> time to change is still worth labelling.
>
> **Two sections below were wrong and are struck rather than deleted:** Section 8 described
> an automatic 2% rent adjustment that the client withdrew on 2026-09-13, and Section 9
> deferred three genuinely open questions to a document that declines to answer them.

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
- ~~**Decision**: After 1 year of continuous tenancy, the system presents an automated recommendation for a 2% annual rent adjustment. The change requires explicit administrator confirmation before taking effect on the next billing cycle.~~
- **WITHDRAWN IN FULL — the client settled this on 2026-09-13.** She edits a room's rate herself when she decides to change it. There is **no automatic adjustment and no system-generated recommendation of any kind**, and no percentage figure applies. This note was the decision of record that created the feature; every other mention in the repository restated it rather than establishing a rule, and a search of the canonical register `docs/02_BUSINESS_RULES.md` returns zero matches for it. Errata **E-20**, misattribution **M-11**.
- **What survives is the record-keeping, not the automation.** Rate changes are administrator-initiated, and every change is preserved in `room_price_history` with the previous rate, the new rate, the effective date and its author — **ARCH-004 Rate Change History**, anchored to canonical **BR-003** Historical Preservation. Since migration `020` this is held by an `AFTER UPDATE` trigger on `rooms`, so a rate cannot be changed by any write path without being recorded.

## 9. Additional Monthly Income & Expense Ledger Notes
- ~~Monthly Income Report running totals, GBG garbage fee timing, and deposit reconciliation workflows are implemented according to `09_MONTHLY_INCOME_REPORT.md` and `10_MONTHLY_EXPENSES_REPORT.md`.~~
- **STRUCK — this defers three unanswered questions to a document that explicitly declines to answer them.** All three are listed in `09_MONTHLY_INCOME_REPORT.md` **Section 8, "Open Questions"** — running totals at `:133`, GBG timing at `:134`, deposit reconciliation at `:136` — under the preamble *"These are not resolved by this document and must not be silently assumed during implementation."*
- **They are open client decisions, carried as OD-01, OD-02 and OD-04** in `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md`, which is the authoritative list of what is genuinely unresolved. **OD-04 requires a schema migration once answered.** Read that register, not this section.
