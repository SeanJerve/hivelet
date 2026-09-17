<!--
  Hivelet - Academic Capstone Project
  Document: Status Report (Week 1)
  System Bible Section Reference: Sections 1-13 (All Core Modules and Capstone Scope)
  Academic Reference: "Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House"
  Institution: Bicol University College of Science - Information Technology Department
-->

# Status Report

**Week 1**

---

## Manuscript

| Deliverable | Component | Status | Notes |
| :--- | :--- | :--- | :--- |
| Chapter 3 Manuscript | 3.1 Materials (Software & Hardware Specifications) | Completed | Outlined development and testing stacks including VS Code, Vue 3, Tailwind CSS, TypeScript, Express.js, Node.js, PostgreSQL/Supabase, and baseline mobile testing device specs (Table 1, Table 2, Table 3). |
| Chapter 3 Manuscript | 3.2 Software Methodology (Agile SDLC Adaptation) | Completed | Documented the iterative 6-phase Agile life cycle model tailored for boarding house operational workflows and continuous feedback loops with the landlady. |
| Chapter 3 Manuscript | 3.2.1 Requirements Analysis & Specification (FR & NFR) | Completed | Formulated 44 Functional Requirements (FR-001 to FR-044) and 10 Non-Functional Requirements (NFR-001 to NFR-010) strictly aligned with the Capstone Paper and System Bible. |
| Chapter 3 Manuscript | 3.2.2 System & Database Design (DFD, Use Case, ERD, UI) | Completed | Finalized architectural models: Context Diagram, DFD Level 0, Child DFDs, Use Case Diagram, normalized relational schema (ERD), and Jira-inspired minimalist corporate UI design specifications. |
| Chapter 3 Manuscript | 3.2.3 Development & Integration (Architecture & APIs) | Completed | Detailed decoupled full-stack architecture, RESTful API endpoints, server-side authoritative financial calculation engines, and service layer structures. |
| Chapter 3 Manuscript | 3.2.4 Testing & Quality Verification (Test Cases) | Partial | Automated unit tests and RBAC authorization verification completed; comprehensive end-to-end user acceptance and boundary test case matrix currently undergoing final documentation. |
| Chapter 3 Manuscript | 3.2.5 Deployment & Configuration Plan | Partial | Local staging and PWA service worker asset caching verified; production deployment configuration to the university-provided server scheduled for final release phase. |
| Chapter 3 Manuscript | 3.3 Evaluation Procedure (ISO/IEC 25010 Quality Model) | Partial | Survey instrument based on ISO/IEC 25010 product quality standards (Functional Suitability, Usability, Performance, Security, etc.) and 5-point Likert scale criteria drafted; pending system rollout for respondent evaluation. |

---

## Features

| System Feature | Description | Related Module | Status | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| Canonical Room Registry & State Machine | Manages 33 units across 4 floors with distinct operational statuses (Available, Reserved, Occupied, Maintenance) and independent website visibility toggles. | Room & Occupancy Management | Completed | FR-007, FR-008. Preserves full historical occupancy and price adjustments across 2024–2026 without overwriting data. |
| Public Property Showcase & Unit Catalog | Public-facing responsive portal displaying property info, unit photo galleries, amenities, and real-time availability badges. | Public Website & Inquiries | Completed | FR-003, NFR-005. Mobile-first design for prospective boarders. |
| Centralized Inquiry Management & Conversion | Prospective boarders submit inquiries for specific units; administrators track conversations and convert leads into tenant records with 1 click. | Public Website & Inquiries | Completed | FR-004, FR-005, FR-006. Eliminates duplicate data entry between inquiries and tenant onboarding. |
| Role-Based Authentication & Guard Middleware | Secure JWT authentication with strict role authorization separating Admin controls from Tenant self-service views. | Authentication & Authorization | Completed | FR-001, FR-002, NFR-003. Enforces server-side security boundaries; prevents unauthorized cross-tenant record access. |
| Guided Monthly Payment Entry | Streamlined payment recording form with unit dropdown, date picker, invoice number, rent amount, and automatic rent period computation. | Billing & Collections Management | Completed | FR-032. Enforces input validation and prevents duplicate period billing. |
| Cluster-Grouped Monthly Income Ledger | Matrix-style monthly income tracking grouped by physical clusters (BH, Back Apt, Penthouse, Front Apt, Linda) with a system-computed figure equal to half each row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet. | Billing & Collections Management | Completed | FR-031, FR-035. Faithful 1-to-1 reproduction of the landlady's physical record book and Excel layout. |
| Water Billing Mismatch Validation (₱200/head) | Pre-fills occupant count from prior month and strictly validates water dues equal Occupants × ₱200 with administrator warning. | Billing & Collections Management | Completed | FR-033, FR-034. Preserves business rule integrity across all boarding units. |
| Linda Unit Fixed-Rate Remittance Flow | Specialized billing calculation for units LF & LB with fixed monthly dues directly remitted without per-head water charges. | Billing & Collections Management | Completed | FR-036. Handles unique sub-cluster contractual agreement. |
| Multi-Area Split Expense Ledger | Expense entry supporting single or multi-area cost distribution across property zones, tagged to fixed expense categories (Salaries 6a/6b/6c). | Operational Expenses & Allocation | Completed | FR-037, FR-038, FR-041. Automatically tallies row totals and property area subtotals. |
| Expense Reconciliation & Cumulative Roll-Forward | Auto-verifies that total property area allocations equal category sums, and rolls category totals forward across months. | Operational Expenses & Allocation | Completed | FR-039, FR-040, FR-042. Prevents bookkeeping discrepancies across fiscal cycles. |
| Financial Analytics & Trajectory Engine | Real-time cash flow monitoring (Income vs. Expenses), annual comparison charts (2024–2026), and cluster collection metrics. | Financial Analytics & Cash Flow Engine | Completed | FR-019, FR-020. Server-authoritative calculations with interactive visual filters. |
| Maintenance Ticket Lifecycle with Photos | Tenant issue submission portal supporting 4 priority levels (Emergency to Low), image uploads, and admin-exclusive resolution. | Maintenance Ticketing & Issue Tracking | Completed | FR-021 through FR-025. Direct tenant-admin communication thread per ticket. |
| Tamper-Evident Audit Trail Logging | System-wide audit log capturing actor, IP, timestamp, target entity, and before/after payloads for all financial and tenancy changes. | Security, Audit Logging & Compliance | Completed | FR-029, NFR-009. Academic compliance and operational traceability. |
| Progressive Web App (PWA) Offline-Ready Shell | Service worker and manifest caching application shell, unit catalog, and emergency information for offline resiliency. | Progressive Web App (PWA) Layer | Completed | FR-030, NFR-005. Read-only offline model strictly avoids conflicting offline financial transactions. |
| Adyen GCash Online Payment Workflow | Optional digital checkout session integration for GCash payments with backend webhook handling and admin verification queue. | Online Payment Processing (Adyen) | Partial | FR-015, FR-016. Sandbox environment operational; live production merchant account pending. |

---

## Modules

| System Module | Purpose | Major Functions | Status | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| Authentication & Authorization Module | Regulate system access, protect endpoints, and manage user lifecycles according to assigned academic/system roles. | User login/logout, JWT issuance, route guards, active/inactive tenant account toggles, password hashing, session validation. | Completed | Operational across both Admin and Tenant portals with strict server-side boundary enforcement. |
| Room & Occupancy Management Module | Maintain comprehensive records of physical rooms, pricing history, tenant tenure, and real-time operational statuses. | 33-unit registry across 4 floors, room status transitions (Available, Reserved, Occupied, Maintenance), visibility toggles, price history tracking, tenant move-in/move-out workflows. | Completed | Room-centric architecture preserves complete historical occupancy without data deletion. |
| Public Property Website & Inquiries Module | Serve prospective tenants with property details, room availability, and an online channel for booking inquiries. | Public landing page, room catalog with amenity filters, room-specific inquiry submission, admin inquiry inbox, status progression, 1-click conversion to tenant. | Completed | Direct bridge between marketing and tenant onboarding; auto-disables inquiries for reserved units. |
| Billing & Collections Management Module | Digitize rent and utility collection, enforcing boarding house operational policies and cluster report formatting. | Monthly income ledger, cluster grouping (BH, Back Apt, Penthouse, Front Apt, Linda), guided monthly payment entry, a system-computed figure equal to half each row's Rent Amount for ledger parity, water billing validation (₱200/head), Linda remittance, overdue tracking with 3-day grace period. | Completed | 1-to-1 operational fidelity with the landlady's physical records; includes spreadsheet export. |
| Operational Expenses & Allocation Module | Centralize boarding house operating expenses, cost allocations across physical property areas, and category accounting. | Expense ledger entry, multi-property area split allocation, standardized category classification (including Salaries 6a/6b/6c), auto-totals, cumulative roll-forward, cross-reconciliation checks. | Completed | Replaces fragmented paper receipts with an auditable digital ledger; exports to Excel. |
| Financial Analytics & Cash Flow Engine | Deliver real-time executive visibility into net cash flow, income trends, and property profitability. | Net cash flow computation (Income - Expenses), monthly trajectory line graphs, cluster revenue distribution, multi-year comparison (2024–2026), Excel report exports. | Completed | Core business philosophy fulfilled: "I finally know exactly where my money goes." |
| Maintenance Ticketing & Issue Tracking Module | Centralize reporting, tracking, communication, and administrative closure of physical property repairs. | Tenant ticket creation, photo attachments, 4-tier priority levels (Emergency, High, Medium, Low), live status pipeline (Open, In Progress, Resolved, Closed), tenant-admin discussion thread, admin closure. | Completed | Eliminates scattered complaints across SMS and Facebook Messenger; maintains permanent audit log. |
| Communication & In-System Notifications Module | Provide unified messaging and event-driven notifications between management and tenants. | Automated alert triggers (billing generation, overdue warnings, maintenance status updates, inquiry alerts), read/unread status management, announcement delivery. | Completed | Reduces reliance on third-party chat channels while maintaining an immutable internal log. |
| Security, Audit Logging & Compliance Module | Guarantee data integrity, role compliance, and traceability of all administrative and financial changes. | Immutable audit log recording, before/after change tracking, IP and user-agent logging, searchable audit trail view, role enforcement verification. | Completed | Fulfills academic auditability standards and ISO/IEC 25010 security/reliability requirements. |
| Progressive Web App (PWA) Layer | Ensure high availability, responsive mobile access, and offline readiness for property tenants and managers. | Service worker lifecycle, caching of static assets and shell, offline room listings cache, network status indicators, mobile installability. | Completed | Moderate read-only offline scope strictly prevents offline financial transaction conflicts. |
| Online Payment Processing Module (Adyen GCash) | Provide an optional digital payment pathway via GCash for modern tenant convenience. | Adyen payment session initialization, GCash checkout redirect, secure server webhook verification, payment reference tracking, admin verification queue. | Partial | Sandbox integration tested; awaiting university/production merchant account deployment. |
