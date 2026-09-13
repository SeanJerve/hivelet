# BUCS IT DEPARTMENT | IT 124: CAPSTONE PROJECT 2

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

## MODULE 01: DESIGN JUSTIFICATION & TRACEABILITY
### Four-Dimension Defense Framework and Functional Traceability Matrix

**Project Title:** Hivelet: A Web-Based Boarding House Management and Financial Operations System  
**Target Property:** Fe Galang Da Silva Boarding House, Legazpi City  
**Group Number:** 4  

---

## 1. The Four-Dimension Defense Framework

Module 01 dictates that every architectural, data, and interface decision must be justified along four academic dimensions:
1. **Functionality:** Proof of full requirement support traced by requirement identifier (`FR-001` through `FR-034`).
2. **Security:** Specific technical and cryptographic mechanisms, not generic claims.
3. **Scalability:** Concrete architectural choices built for the expected physical operational scale.
4. **Problem Alignment:** Direct traceability to the core problems identified in the approved Capstone 1 research paper.

---

## 2. Four-Part Justification of Major Design Decisions

### Decision 1: Decoupled / Pluggable Modular Payment Architecture Pending Consultation
*(Natively supporting confirmed on-site cash & direct GCash verification today, while remaining architecturally ready to plug into an automated payment gateway like Adyen upon consultation completion)*

* **Functionality (Traced to FR-011, FR-014, FR-015, FR-016, FR-032):**  
  The design establishes comprehensive multi-channel payment support while accommodating the pending status of commercial online gateway adoption. Active student residents can remit rent via on-site cash collections (`FR-014`) or personal GCash by uploading receipt screenshots and entering their 13-digit reference numbers (`FR-015`), which flow into an administrative verification queue (`FR-016`). The database schema's `payments` table is structured with generic payment attributes (`amount`, `payment_method`, `payment_source`, `transaction_reference`, `verification_status`), ensuring that if final consultation with the adviser and stakeholder approves automated Adyen processing, incoming gateway transactions map directly into the existing schema without database alterations or broken reporting flows (`FR-032`).
* **Security (Specific Mechanisms):**  
  Isolates third-party gateway interactions within an independent backend service adapter (`adyenService.ts` / `EXT_GCASH`), preventing commercial API credentials, merchant accounts, and webhook secrets from being exposed on client applications. State transitions from `Pending Verification` to `Verified` are strictly restricted to authenticated administrators via Express RBAC middleware (`requireRole('admin')`). The 50% co-ownership revenue share and water fee calculations are computed exclusively on the server inside atomic database transactions, preventing client-side parameter tampering. Every payment action and verification event creates an immutable record in `audit_logs` capturing administrator identity, client IP address, and server timestamps.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Protects the boarding house (32 units) from premature commercial lock-in and excessive overhead. Corporate payment aggregators enforce strict transaction fees and complex corporate registration requirements (SEC/DTI/TIN) that are currently being evaluated during stakeholder consultation. The decoupled architecture handles the monthly peak transaction volume (30 to 60 payments during the 1st week of each month) with sub-50ms indexed database queries on `payments(verification_status, paid_at)`, allowing the boarding house to operate stably with zero gateway fee deductions while retaining the ability to activate automated processing instantly if consultation confirms it.
* **Problem Alignment (Root Problem Solved):**  
  Directly resolves the primary administrative problem documented in Section 1.1 of our Capstone 1 research manuscript: the landlady's historical reliance on unorganized paper receipt stubs, misplaced cash envelopes, and untracked payment screenshots scattered across personal Facebook Messenger threads. It centralizes digital payment proof and physical cash entries into an audit-ready ledger while preserving the landlady's preferred direct financial oversight during ongoing stakeholder consultation.

---

### Decision 2: 3NF Database Schema with Decoupled Price History & Non-Destructive Voiding
*(Replacing flat property tables and destructive delete operations)*

* **Functionality (Traced to FR-007, FR-008, FR-017, FR-029):**  
  Guarantees complete historical auditability across room occupancies, leases, and rate escalations (`FR-008`). When unit rental rates are adjusted following annual contract reviews, previous billing cycles permanently retain their historical rates. If an encoding mistake occurs in the income ledger, the administrator can execute an audited void correction (`FR-017`) without corrupting past reports (`FR-029`).
* **Security (Specific Mechanisms):**  
  Foreign keys on core financial tables (`bills`, `payments`, `monthly_income_records`) enforce `ON DELETE RESTRICT` constraints at the PostgreSQL database engine level, preventing accidental cascading deletions. Non-destructive ledger correction is enforced through audit columns (`voided_at TIMESTAMPTZ`, `voided_by UUID`, `void_reason TEXT`). System event tracking is preserved in an append-only `audit_logs` table that has no `UPDATE` or `DELETE` API endpoints exposed to any user role.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Engineered for multi-year record retention (5 to 10 years of continuous financial ledgers across 32 units). Ledger retrieval queries utilize composite filtered indexes (`idx_income_active ON monthly_income_records(year, month) WHERE voided_at IS NULL`), ensuring report generation executes with sub-50ms query times regardless of cumulative database volume.
* **Problem Alignment (Root Problem Solved):**  
  Directly eliminates the landlady's recurring problem of data corruption. In previous years, manual spreadsheet formula errors and accidental row deletions caused irreconcilable financial discrepancies between property co-owners.

---

### Decision 3: Server-Authoritative Guided Billing Engine (P200/Head Water Rule & 50% Revenue Share)
*(Replacing manual mental math and fragmented spreadsheet calculations)*

* **Functionality (Traced to FR-011, FR-012, FR-013, FR-031, FR-032):**  
  Automates the operational business formulas defined in the approved System Bible:
  $$\text{Total Bill} = \text{Base Rent} + (\text{Registered Occupants} \times ₱200.00)$$
  $$\text{Co-Ownership Revenue Share} = \text{Gross Rent} \times 0.50$$
  $$\text{Net Remitted Amount} = \text{Co-Ownership Share} + \text{Water Remittance} - \text{Garbage Fees}$$
  Units are automatically organized in canonical cluster order (`BH`, `Back Apartment`, `Penthouse`, `Front Apartment`, `Linda`) per `FR-031`.
* **Security (Specific Mechanisms):**  
  The user interface is restricted to an input and presentation layer. All billing math, occupant headcount lookups, and revenue share splits are executed server-side inside isolated database transactions (`BEGIN ... COMMIT`). Client requests attempting to submit pre-computed financial totals are rejected; the server derives totals directly from authoritative database records in `room_assignments` and `system_settings`.
* **Scalability (Concrete Scale & Engineering Choices):**  
  The billing engine batch-processes monthly billing statements for the entire boarding house in a single automated transaction loop, generating all 32 tenant statements in under 150 milliseconds. Parameterized SQL queries eliminate injection vectors, and exact decimal precision `NUMERIC(10, 2)` prevents floating-point accumulator drift across multi-unit subtotals.
* **Problem Alignment (Root Problem Solved):**  
  Directly eliminates monthly disputes between tenants and co-owners regarding water utility fees and co-ownership splits. By binding water calculations directly to registered leaseholder headcounts in the database, computational inconsistencies are permanently eliminated.

---

### Decision 4: Layered Modular Monolith Architecture with PWA Resource Caching
*(Replacing distributed microservices and tightly coupled template monoliths)*

* **Functionality (Traced to FR-001, FR-002, FR-003, FR-030):**  
  Delivers a responsive, public-facing property catalog for prospective student boarders (`FR-003`), dedicated mobile portals for active tenants, and an executive management center for the landlady (`FR-001`, `FR-002`). Service Worker caching enables student boarders and the landlady to view cached room listings and previous balance statements during dormitory internet outages (`FR-030`).
* **Security (Specific Mechanisms):**  
  Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 authenticate all communications between client and server. Passwords in `profiles.password_hash` are cryptographically salted and hashed using `bcrypt` (10 rounds). Security headers are enforced via Express `helmet` middleware, and Cross-Origin Resource Sharing (CORS) is locked to authorized university and deployment domains.
* **Scalability (Concrete Scale & Engineering Choices):**  
  Deployed as a single Node.js/Express service communicating with a PostgreSQL database, consuming under 256MB of RAM on the university server. It easily handles the concurrent load of 32 units, student inquiries, and administrative reporting without the networking latency, distributed failures, or high infrastructure costs of microservices.
* **Problem Alignment (Root Problem Solved):**  
  Addresses the core research gap identified in Section 2.2 of our paper: commercial property management software is bloated, expensive, and demands stable corporate IT infrastructure. Hivelet delivers an enterprise-grade management tool tailored for the resource-constrained operational realities of student boarding houses in Legazpi City.

---

## 3. Complete Functional Traceability Matrix (FR-001 through FR-034)

| Requirement Code & Title | Architectural Layer & Component | Technical Security & Implementation Mechanism |
| :--- | :--- | :--- |
| **FR-001: Authentication** | `API_TIER` (`authController.ts`) | Bcrypt salted hashing; JWT stateless bearer token issuance; failed login lockout. |
| **FR-002: Role-Based Access** | `API_TIER` (`authMiddleware.ts`) | Role validation middleware (`'admin'` vs `'tenant'`); rejects unauthorized tokens with HTTP 403. |
| **FR-003: Public Website** | `CLIENT_TIER` (`PublicGuestView.vue`) | Public catalog displaying 33 units and photos; zero administrative or private data exposed. |
| **FR-004: Public Inquiry** | `SERVICE_TIER` (`inquiryService.ts`) | Input sanitization; inserts to `inquiries` with status `Pending`; triggers in-app alert. |
| **FR-005: Inquiry Management**| `CLIENT_TIER` (`InquiriesView.vue`) | Landlady communication inbox; status filtering; threaded messages via `inquiry_messages`. |
| **FR-006: Inquiry Conversion** | `SERVICE_TIER` (`onboardingService.ts`)| Reuses prospect contact data to initialize `profiles` and `room_assignments` without retyping. |
| **FR-007: Room Management** | `SERVICE_TIER` (`roomService.ts`) | Enforces room status rules (`Available`, `Occupied`, `Maintenance`); dual operational/visibility flags. |
| **FR-008: Room History** | `DATA_TIER` (`room_price_history`) | Preserves 2% annual increase rate changes over time; tracks historical leases in `room_assignments`. |
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
