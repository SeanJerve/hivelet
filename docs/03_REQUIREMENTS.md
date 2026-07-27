# HIVELET SOFTWARE REQUIREMENTS

## Functional Requirements

### FR-001 Authentication
The system shall authenticate administrators and active tenants.

### FR-002 Role-Based Access
The system shall enforce access according to user role.

### FR-003 Public Website
The system shall display property information, room information, amenities, photos, and availability information.

### FR-004 Public Inquiry
A visitor shall be able to submit an inquiry for a specific room when that room is accepting inquiries.

### FR-005 Inquiry Management
The administrator shall view, manage, communicate with, and update inquiry statuses.

### FR-006 Inquiry Conversion
The administrator shall be able to reuse inquiry information during tenant onboarding.

### FR-007 Room Management
The administrator shall create, edit, view, publish, hide, reserve, occupy, maintain, and make rooms available.

### FR-008 Room History
The system shall preserve room occupancy and tenant history.

### FR-009 Tenant Management
The administrator shall manage tenant records and account status.

### FR-010 Tenant Profile Updates
Tenants shall be able to update permitted personal information.

### FR-011 Billing
The system shall support rent and water billing records.

### FR-012 Due Dates
The system shall support individual due dates.

### FR-013 Overdue Monitoring
The system shall identify overdue payments and grace-period status.

### FR-014 Manual Payments
The administrator shall be able to record manual payments.

### FR-015 Online Payments
The system shall support optional online payment through Adyen for the GCash payment workflow.

### FR-016 Payment Verification
The administrator shall be able to verify online payments.

### FR-017 Financial Corrections
The administrator shall be able to correct financial records with auditability.

### FR-018 Expense Management
The administrator shall record categorized expenses and room allocations.

### FR-019 Cash Flow
The system shall calculate income, expenses, and net cash flow.

### FR-020 Profitability Analytics
The system shall present profitability-related graphs and trends.

### FR-021 Maintenance Tickets
Tenants shall be able to create issue tickets.

### FR-022 Attachments
Tenants shall be able to attach photos to issue tickets.

### FR-023 Ticket Priority
Tickets shall support Emergency, High, Medium, and Low priority.

### FR-024 Ticket Status
Tenants shall be able to view ticket status.

### FR-025 Ticket Administration
The administrator shall manage and close tickets.

### FR-026 Communication
The system shall centralize relevant tenant, inquiry, and issue communication.

### FR-027 Notifications
The system shall provide in-system notifications for important events.

### FR-028 Reports
The system shall provide live reports and export capabilities.

### FR-029 Audit Logs
The system shall record important actions and financial changes.

### FR-030 Offline-Ready Access
The system may provide limited offline-ready access to cached resources and safe previously available data.

### FR-031 Monthly Income Report Layout
The system shall reproduce the landlady's Monthly Income Report layout: units grouped by cluster (BH, Back Apartment, Penthouse, Front Apartment, Linda) in canonical order, with per-cluster and grand subtotals, per `09_MONTHLY_INCOME_REPORT.md`.

### FR-032 Guided Monthly Payment Entry
The administrator shall record a monthly payment through a guided form: unit dropdown, calendar date picker, contact/invoice entry, rent amount entry, with rent period, 50% share, and remitted amount computed automatically.

### FR-033 Occupant Count Memory
The system shall pre-fill a unit's occupant count from the same tenant's previous month entry, editable by the administrator.

### FR-034 Water Payment Validation
The system shall validate that Water Payment equals Occupants × ₱200 and warn the administrator before saving a mismatched value.

### FR-035 One-Time Onboarding Fields
The system shall capture Anniversary Date and Deposit once, at tenant onboarding, and reuse them on every subsequent monthly entry without re-entry.

### FR-036 Linda Fixed Billing Flow
The system shall support a distinct fixed-rate billing flow for Linda's units (LF, LB), separate from the standard per-occupant water model, remitted directly to Linda.

## Non-Functional Requirements

### NFR-001 Functional Suitability
The system shall provide the required business functions accurately.

### NFR-002 Usability
The system shall be understandable to a non-technical administrator.

### NFR-003 Security
The system shall protect personal and financial information.

### NFR-004 Performance
Common operations should respond efficiently under the expected small-property workload.

### NFR-005 Compatibility
The system shall function on modern desktop and mobile browsers.

### NFR-006 Reliability
The system shall preserve data consistency and avoid silent data loss.

### NFR-007 Maintainability
The codebase shall use modular, documented, maintainable architecture.

### NFR-008 Portability
The system shall be deployable to the university-provided server environment.

### NFR-009 Auditability
Important financial and administrative changes shall be traceable.

### NFR-010 Exportability
Relevant business data shall be usable outside the application.
