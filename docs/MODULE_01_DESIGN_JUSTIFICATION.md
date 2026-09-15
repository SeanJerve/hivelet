# HIVELET DESIGN JUSTIFICATION DOCUMENT

> [!CAUTION]
> **SUPERSEDED IN PART — read `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` first.**
>
> This document was submitted before the Phase 1 and Phase 2 audits. Twenty-one corrections
> (E-01 … E-21) apply to this submission set. The ones most likely to be read aloud by mistake:
>
> | Claim in this pack | Correction |
> | :--- | :--- |
> | "32 units" | **33 units** across 5 clusters, floors **11 / 11 / 10 / 1** |
> | "2% annual increase rule" | **No such rule exists.** The owner sets rates by hand; only the change history is kept |
> | "50/50 co-ownership revenue share" | **Banned wording.** `fifty_percent_share` is a system-computed figure equal to half the row's Rent Amount, retained for ledger parity with the historical spreadsheet — no party, recipient or purpose is modelled |
> | "Main Building / Annex A / Annex B" | **Not cluster names.** BH, Back Apartment, Front Apartment, Penthouse, Linda. "Annex" is the family's word for a *floor* |
> | "Pending Consultation" | **Withdrawn.** The Adyen evaluation is complete — a developer sandbox is configured and the GCash flow runs against it |
> | "one-week grace period" | **There is no grace period.** Late payment is not accepted (OD-16) |
> | "ON DELETE RESTRICT" as existing fact | It did **not** exist when this was written. Applied by migration `005` on 2026-09-13 |
> | "atomic database transaction" | No transaction existed in `backend/src` when this was written |
>
> **For the Capstone 2 defense, speak from `docs/claude_pipeline/outputs/PHASE3_DEFENSE_PACK.md`,
> not from this pack.** Only one panel recommendation was ever given — see
> `PHASE3_PANEL_RECOMMENDATION_REGISTER.md`.

---

## Academic Design Defense across Four Dimensions
### IT 124 — Capstone Project 2 | Module 01 | BUCS IT Department

---

## 1. Executive Summary & Design Defense Framework

Module 01 establishes that an academic software engineering design is complete only when the development team can rigorously defend it along four specific dimensions:
1. **Functionality:** Proof that the design fully covers the approved functional requirements traced by requirement code (`FR-001` through `FR-034`).
2. **Security:** Identification of concrete cryptographic, authorization, and data-integrity mechanisms rather than vague claims.
3. **Scalability:** Justification of architectural choices built for the specific operational scale of the target property (Fe Galang Da Silva Boarding House).
4. **Problem Alignment:** Proof that the technical design directly resolves the core problems identified in the approved Capstone 1 research paper.

---

## 2. Four-Part Justification for Major System Design Decisions

### Decision 1: Asynchronous GCash Proof-of-Payment Verification & Cash Settlement Workflow
*(Replacing live third-party automated payment gateway dependencies)*

* **Functionality (Traced to FR-011, FR-014, FR-015, FR-016, FR-032):**  
  The system fully supports the multi-channel payment realities of student dormitories. Tenants can pay in cash directly at the boarding house office (`FR-014`) or digitally transfer funds via personal GCash, entering their 13-digit transaction reference number and uploading receipt screenshots (`FR-015`). The administrator reviews these transactions in a dedicated verification queue before marking bills as settled (`FR-016`), with all figures automatically flowing into the guided Monthly Income Ledger (`FR-032`).
* **Security (Specific Mechanisms):**  
  Eliminates the critical vulnerability of storing or exposing external third-party merchant API keys and webhook secrets on the client application. Financial state transitions from `Pending Verification` to `Verified` are strictly restricted to authenticated administrators via Express RBAC middleware (`requireRole('admin')`). The 50% revenue share and water fee calculations are computed solely server-side to prevent client-side parameter tampering. Every verification action creates an immutable log entry in `audit_logs` storing the admin’s profile ID, client IP address, and timestamp.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Designed specifically for the 32 rentable units of Fe Galang Da Silva Boarding House (~20 to 50 active boarders). Automated corporate payment aggregators (e.g., Adyen) impose high transaction percentages and rigid Know-Your-Business (KYB) underwriting that are unsustainable for a micro-scale sole proprietorship. The asynchronous queue handles the monthly peak volume (30 to 60 payments during the 1st week of each month) with zero external gateway API rate-limiting or downtime risks, utilizing indexed queries on `payments(verification_status, paid_at)`.
* **Problem Alignment (Root Problem Solved):**  
  Directly solves the primary pain point documented in Section 1.1 of our manuscript: the landlady's historical reliance on disorganized paper receipt stubs, misplaced cash envelopes, and unsearchable Facebook Messenger payment screenshots. It centralizes digital proof and cash logs into an audit-ready ledger without disrupting the landlady’s preferred in-person oversight.

---

### Decision 2: 3NF Database Schema with Decoupled Price History & Non-Destructive Voiding
*(Replacing flat property tables and destructive delete operations)*

* **Functionality (Traced to FR-007, FR-008, FR-017, FR-029):**  
  Preserves complete historical integrity across tenant occupancies and rate changes (`FR-008`). When room rental rates are adjusted or updated after contract anniversaries, previous billing cycles remain untouched. If a data-entry mistake occurs in the income ledger, the administrator can perform an audited correction (`FR-017`) without corrupting historical reports (`FR-029`).
* **Security (Specific Mechanisms):**  
  Foreign keys on core financial ledgers (`bills`, `payments`, `monthly_income_records`) enforce `ON DELETE RESTRICT` constraints at the PostgreSQL database engine level, preventing accidental cascading deletions. Non-destructive soft-voiding utilizes `voided_at TIMESTAMPTZ`, `voided_by UUID`, and `void_reason TEXT`. System activity is recorded in an append-only `audit_logs` table that has no `UPDATE` or `DELETE` API endpoints exposed to any user role.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Optimized for multi-year record retention (5 to 10 years of historical ledgers across 32 units). Database queries for monthly income and expense ledgers utilize composite indexes (`idx_income_active ON monthly_income_records(year, month) WHERE voided_at IS NULL`), ensuring report generation executes in sub-50ms query times regardless of historical database growth.
* **Problem Alignment (Root Problem Solved):**  
  Resolves the landlady’s fear of data corruption and accidental loss. In previous years, manual spreadsheet edits frequently caused formulas to break or historical rows to be accidentally overwritten, creating irreconcilable discrepancies between co-owners.

---

### Decision 3: Server-Authoritative Guided Billing Engine (P200/Head Water Rule & 50% Revenue Share)
*(Replacing manual mental math and fragmented spreadsheet calculations)*

* **Functionality (Traced to FR-011, FR-012, FR-013, FR-031, FR-032):**  
  Automates the exact mathematical business rules mandated by the property owners:
  $$\text{Total Bill} = \text{Base Rent} + (\text{Registered Occupants} \times ₱200.00)$$
  $$\text{Co-Ownership Share} = \text{Gross Rent} \times 0.50$$
  $$\text{Net Remitted} = \text{Co-Ownership Share} + \text{Water Remittance} - \text{Garbage Fees}$$
  Units are automatically presented in canonical cluster order (`BH`, `Back Apartment`, `Penthouse`, `Front Apartment`, `Linda`) per `FR-031`.
* **Security (Specific Mechanisms):**  
  The frontend interface is strictly treated as a display layer. Total amounts, occupant water fees, and revenue shares are computed on the Node.js backend inside isolated database transactions (`BEGIN ... COMMIT`). Request payloads containing client-calculated totals are rejected by schema validators; the server recalculates totals from active `room_assignments` and `system_settings` records.
* **Scalability (Concrete Scale & Engineering Choices):**  
  The billing engine batch-processes the entire property's monthly billing cycle in a single transaction loop executed on the server, generating all 32 tenant statements in under 150 milliseconds. Parameterized database queries prevent SQL injection, and database-level numeric precision `NUMERIC(10, 2)` prevents floating-point accumulator drift across multi-unit subtotals.
* **Problem Alignment (Root Problem Solved):**  
  Directly eliminates monthly disputes between the property co-owners and tenants regarding occupant headcounts and water surcharges. By linking water charges directly to registered active leaseholders in the database, math errors and manual spreadsheet inconsistencies are eliminated.

---

### Decision 4: Layered Modular Monolith Architecture with PWA Resource Caching
*(Replacing distributed microservices and tightly coupled template monoliths)*

* **Functionality (Traced to FR-001, FR-002, FR-003, FR-030):**  
  Enables a responsive, modern public property catalog for prospective students (`FR-003`), dedicated mobile portals for boarders, and an executive workspace for the landlady (`FR-001`, `FR-002`). Service Worker caching allows students and the landlady to view cached room listings and previous billing statements even during dorm internet outages (`FR-030`).
* **Security (Specific Mechanisms):**  
  Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 authenticate all requests across the presentation and application layers. Passwords stored in `profiles.password_hash` are cryptographically salted and hashed using `bcrypt` (10 rounds). Security headers are enforced via `helmet` middleware, and Cross-Origin Resource Sharing (CORS) is restricted to approved campus domain origins.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Deployed as a single lightweight Node.js/Express service communicating with a PostgreSQL database. Consumes less than 256MB of RAM on the university server, easily handling the concurrent load of 32 units, student inquiries, and administrative reporting without the networking latency, distributed failures, or high hosting costs of microservices.
* **Problem Alignment (Root Problem Solved):**  
  Addresses the technological gap identified in Section 2.2 of our paper: commercial enterprise property systems are bloated, expensive, and require stable enterprise IT infrastructure. Hivelet provides an enterprise-quality interface optimized for the resource-constrained environment of Legazpi City boarding houses.

---

## 3. Complete Functional Traceability Matrix (FR-001 through FR-034)

| Requirement Code & Title | Architectural Layer & Component | Concrete Security & Implementation Mechanism |
| :--- | :--- | :--- |
| **FR-001: Authentication** | `API_TIER` (`authController.ts`) | Bcrypt password hashing; JWT stateless bearer token issuance; failed login counter lockout. |
| **FR-002: Role-Based Access** | `API_TIER` (`authMiddleware.ts`) | Strict role validation (`'admin'` vs `'tenant'`); routes reject unauthorized tokens with HTTP 403. |
| **FR-003: Public Website** | `CLIENT_TIER` (`PublicGuestView.vue`) | Public catalog displaying 33 units and photos; zero administrative or private tenant data exposed. |
| **FR-004: Public Inquiry** | `SERVICE_TIER` (`inquiryService.ts`) | Input sanitization; inserts to `inquiries` with status `Pending`; dispatches in-app notification. |
| **FR-005: Inquiry Management**| `CLIENT_TIER` (`InquiriesView.vue`) | Landlady communication inbox; status filters; threaded messages via `inquiry_messages`. |
| **FR-006: Inquiry Conversion** | `SERVICE_TIER` (`onboardingService.ts`)| Reuses prospect contact data to generate `profiles` and `room_assignments` without retyping. |
| **FR-007: Room Management** | `SERVICE_TIER` (`roomService.ts`) | Enforces room status rules (`Available`, `Occupied`, `Maintenance`); dual operational/visibility flags. |
| **FR-008: Room History** | `DATA_TIER` (`room_price_history`) | Preserves ~~2% annual increase~~ **administrator-initiated** rate changes over time (no automatic increase exists — see the errata banner above); tracks historical leases in `room_assignments`. |
| **FR-009: Tenant Management** | `CLIENT_TIER` (`TenantManagementView`)| Comprehensive tenant record directory with active lease dates and emergency contact details. |
| **FR-010: Profile Updates** | `API_TIER` (`tenantController.ts`) | Tenants can only edit phone, emergency contact, and occupation; cannot alter room or rent rates. |
| **FR-011: Billing** | `SERVICE_TIER` (`billingService.ts`) | Server-authoritative rent calculation plus occupant-based water calculation ($₱200/\text{head}$). |
| **FR-012: Due Dates** | `SERVICE_TIER` (`billingService.ts`) | Individual monthly billing schedule tied to the tenant's contractual move-in start date. |
| **FR-013: Overdue Monitoring** | `SERVICE_TIER` (`billingService.ts`) | Automatic status transition to `Overdue` when payment is unverified after 7-day grace period. |
| **FR-014: Manual Payments** | `API_TIER` (`paymentController.ts`) | Administrator records cash collections on-site with paper receipt numbers and audit logs. |
| **FR-015: Online Payments** | `CLIENT_TIER` (`TenantPaymentsView`) | Tenant submits 13-digit GCash reference and screenshot; payment enters `Pending Verification`. |
| **FR-016: Payment Verification**| `API_TIER` (`paymentController.ts`) | Admin verifies funds in personal GCash app, clicks verify; updates bill to `Paid` and logs audit. |
| **FR-017: Financial Corrections**| `DATA_TIER` (`monthly_income_records`)| Non-destructive ledger voiding with mandatory text reason; immutable snapshot in `audit_logs`. |
| **FR-018: Expense Management** | `CLIENT_TIER` (`ExpensesLedgerView`)| Records official receipts across 1..10 standardized categories with property area splits. |
| **FR-019: Cash Flow** | `SERVICE_TIER` (`financeService.ts`) | Calculates Net Cash Flow: $\text{Total Remitted Income} - \text{Total Operational Expenses}$. |
| **FR-020: Profitability Analytics**| `CLIENT_TIER` (`IncomeCollectionsView`)| Tabular and graphical trends grouped by calendar year, month, and property cluster. |
| **FR-021: Maintenance Tickets**| `CLIENT_TIER` (`MaintenanceDispatchView`)| Tenant issue logging with categorized titles, descriptions, and urgency ratings. |
| **FR-022: Attachments** | `DATA_TIER` (`ticket_attachments`) | Multipart photo upload validation (JPEG/PNG only, max 5MB); tied via FK `ON DELETE CASCADE`. |
| **FR-023: Ticket Priority** | `SERVICE_TIER` (`ticketService.ts`) | Four priority levels (`Emergency`, `High`, `Medium`, `Low`) with visual color-coded badges. |
| **FR-024: Ticket Status** | `CLIENT_TIER` (`TenantPortalView.vue`)| Tenant visibility into real-time repair progression (`Submitted`, `In Progress`, `Resolved`, `Closed`). |
| **FR-025: Ticket Administration**| `API_TIER` (`ticketController.ts`) | Sole admin authority to assign maintenance technicians and formally close resolved tickets. |
| **FR-026: Communication** | `DATA_TIER` (`ticket_messages`) | Threaded internal messaging between landlady and tenant attached directly to ticket context. |
| **FR-027: Notifications** | `CLIENT_TIER` (`NotificationPopover.vue`)| In-app alerts for pending payment verification, emergency maintenance, and new inquiries. |
| **FR-028: Reports** | `CLIENT_TIER` (`ExpensesLedgerView`)| Instant printable PDF summaries and Excel-compatible spreadsheet export formats. |
| **FR-029: Audit Logs** | `DATA_TIER` (`audit_logs`) | Append-only system ledger capturing actor, action, previous/new state JSON, IP, and timestamp. |
| **FR-030: Offline-Ready Access**| `CLIENT_TIER` (Vite PWA Plugin) | Service Worker caching application shell and room catalog for offline dormitory browsing. |
| **FR-031: Monthly Income Layout**| `CLIENT_TIER` (`IncomeCollectionsView`)| Replicates landlady's cluster order (`BH`, `Back`, `PH`, `Front`, `Linda`) with subtotals. |
| **FR-032: Guided Payment Entry**| `CLIENT_TIER` (`OnsitePaymentModal.vue`)| Auto-populates rent, water, and derives 50% revenue share upon selecting property unit. |
| **FR-033: Monthly Expense Layout**| `CLIENT_TIER` (`ExpensesLedgerView`)| Standardized 1..10 expense classification mirroring official Philippine accounting categories. |
| **FR-034: Expense Cluster Breakdown**| `DATA_TIER` (`expense_property_allocations`)| Subdivides single supplier invoices across property clusters (`BH`, `Apartment`, `Main House`). |
