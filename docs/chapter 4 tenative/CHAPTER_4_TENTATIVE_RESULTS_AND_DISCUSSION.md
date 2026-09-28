# 4 RESULTS AND DISCUSSION

> **CANONICAL MANUSCRIPT WORKING COPY (Synchronized with [`docs/FINAL MANUSCRIPT/CHAPTER_4_RESULTS_AND_DISCUSSION.md`](../FINAL%20MANUSCRIPT/CHAPTER_4_RESULTS_AND_DISCUSSION.md))**
> Re-verified against the operational system as of 28 September 2026. Every figure here is derived from the live database or verification check runs. Formatting adheres to the academic capstone guidelines (Arial 12 pt, double-spaced, 0.5" first-line indent, Table numbering 5–25, Figure numbering 4–8).

This chapter presents the empirical results of the study and discusses their operational implications. It is structured in strict accordance with the four specific research objectives outlined in Section 1.2: the analysis of existing management practices and operational requirements (Section 4.1), the architectural and functional development of the Hivelet system (Section 4.2), the pilot testing of the system across automated and human verification channels (Section 4.3), and the software quality evaluation and subsequent optimization based on the ISO/IEC 25010 model (Section 4.4). The chapter concludes with the comprehensive deployment plan and risk mitigation strategies (Section 4.5).

---

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

The target facility, the Fe Galang Da Silva Boarding House, comprises 33 rentable units categorized into five distinct architectural clusters: the main Boarding House (22 units), the Back Apartment (5 units), the Front Apartment (3 units), the Penthouse (1 unit), and Linda (2 units). The physical units are arranged across three residential floors and a rooftop penthouse level, distributed as 11, 11, 10, and 1 unit per floor, respectively. At the time of this evaluation, 32 of the 33 rentable units are actively occupied. These property dimensions were confirmed through direct on-site interviews with the property owner on 13 September 2026 and are programmatically validated against live database records during automated verification routines.

### 4.1.1 Existing Practices and Identified Problems

Prior to the deployment of Hivelet, administrative operations were executed using an unintegrated spreadsheet workbook consisting of two worksheets—a Monthly Income Report and a Monthly Expenses Report—stored on removable flash media, supplemented by physical official receipt (OR) booklets. Rental collections were transacted exclusively in physical cash on premises. Tenant maintenance notifications and general inquiries were communicated informally through messaging applications or via ad-hoc verbal exchanges. Table 5 presents a comparative analysis of baseline practices against the operational deficiencies identified during the field analysis.

**Table 5.** Existing Practices and Identified Problems

| Area | Existing practice | Problem identified |
| :--- | :--- | :--- |
| Tenant management | Tenant details kept in the income sheet and in the owner's memory | No single record of who lives in which unit, since when, or how many occupants |
| Financial tracking | Income and expense sheets typed by hand; official receipts written in a paper book | Totals depend on manual arithmetic; nothing checks a receipt number against the book; one file on removable storage is the only copy |
| Communication | Requests sent by messaging application or said in person | Requests are not recorded, so there is no way to follow a request to completion |
| Booking | Enquiries conducted via informal walk-ins, phone calls, and verbal referrals | No structured record of prospective tenant enquiries or unit availability history |

The empirical necessity for centralizing records was evidenced directly during the transcription and migration of the owner’s historical workbook, which contained 937 income entries and 1,327 property-area expense allocations spanning historical operations. Programmatic data ingestion revealed substantial structural anomalies that had remained latent within the spreadsheet:

1. **Missing Tenancy Timelines:** A total of 402 out of the 937 historical income records (42.9%) lacked anniversary dates and security deposit notations.
2. **Duplicate Official Receipts:** Five distinct official receipt numbers had each been assigned to two separate financial transactions. In one critical instance, the exact same receipt number was issued to two different tenants on the same calendar day.

These findings do not signify personal negligence on the part of the property owner; rather, they reflect the inherent vulnerability of fragmented, uncoupled record-keeping mechanisms. Crucially, the operational vulnerabilities were not localized to a single business function. Each domain maintained an isolated, informal record with no mechanism for relational cross-verification, aligning directly with the property management fragmentation literature cited in Chapter 2 (Ullah et al., 2021; Burke, 2026; Magno et al., 2024).

### 4.1.2 System Requirements Derived from the Operational Analysis

The operational analysis yielded 44 Functional Requirements (FRs) and 49 Business Rules (BRs). To ensure systematic accountability, every requirement was mapped to its concrete architectural implementation in a formal Requirements Traceability Matrix, while business rules were cataloged in a Business Rule Register.

**Table 6.** Identified Gaps, System Requirements and Implementing Modules

| Identified gap | System requirement | Module (Section) |
| :--- | :--- | :--- |
| No single tenant and unit record | Keep one record per unit and per tenant, with occupancy and move-in dates | Tenant and Room Management (4.2.2) |
| Enquiries not recorded | Let the public view units and send an enquiry about a specific unit | Booking and Reservation (4.2.3) |
| Manual arithmetic and unchecked receipts | Compute charges, record payments against real receipt numbers, reproduce the owner's reports | Financial Tracking (4.2.4) |
| Cash only, no digital option | Offer an optional online payment that the owner verifies before it counts | Financial Tracking (4.2.4) |
| Requests not followed to completion | Record each request and its status until the owner closes it | Maintenance Ticketing and Notification (4.2.5) |
| Anyone with the file sees everything | Give the owner and each tenant access to only what their role needs | Role-Based Access Control (4.2.6) |
| One file on one device | Make the system reachable from any phone or computer | Progressive Web Application (4.2.7) |

Operational constraints were confirmed through direct client consultations. The owner confirmed that monthly rental obligations become overdue the day following their designated due date, that unit pricing is determined manually without automated annual escalations, and that tenant profiles do not require email addresses for operational validity. On 20 September 2026, the owner verified the current base rental rates for all 33 units, establishing an exact match against physical receipts.

---

## 4.2 Development of the Hivelet System

Hivelet was developed following an Agile Software Development Life Cycle (SDLC) across three successive iterations. Iteration 1 (24 July – 28 August 2026) established the core architecture and ingested the historical spreadsheet records. Iteration 2 (12 – 14 September 2026) reconciled documentation with the code base, rectified 22 operational discrepancies, and implemented automated regression check suites. Iteration 3 finalized business workflows, client review feedback, and security hardening.

### 4.2.1 System Architecture and Technology Stack

Hivelet utilizes a decoupled, multi-tier web architecture designed for security, maintainability, and mobile accessibility. Table 7 summarizes the technical stack.

**Table 7.** Technology Stack of the Developed System

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Presentation | Vue 3.5 with TypeScript 5.7, Vite 5.4, Tailwind CSS 4.0 | Responsive single-page client interface for public, tenants, and admin |
| Application | Node.js with Express 4.19 in TypeScript | RESTful API, business rule enforcement, and computational logic |
| Data | PostgreSQL 17.6, hosted on Supabase | Relational data persistence with row-level security and triggers |
| Payment gateway | Adyen (Web Drop-in 6.44, API Library 32.0) with GCash | Optional digital payment processing with HMAC signature validation |
| Client delivery | Progressive Web Application (vite-plugin-pwa) | Service worker caching and installability on mobile viewports |
| Hosting | Vercel | Cloud hosting and continuous deployment via Git |

Schema changes and data manipulations are managed strictly through 59 version-controlled, numbered SQL migration scripts, providing a fully auditable database evolution history.

### 4.2.2 Tenant and Room Management Module
The system models all 33 units across their respective floors and clusters. To prevent undocumented rate alterations, a PostgreSQL database trigger automatically writes historical rate changes, timestamps, and modifier IDs to an immutable price history log. Tenancy records capture active occupants, formal move-in dates, and emergency contacts. *(Figure 4. Room and Rate Directory)*

### 4.2.3 Booking and Reservation Management Module
The public catalogue provides real-time unit availability and pricing without exposing tenant identities. Prospective occupants submit structured booking inquiries linked to specific rooms. When an inquiry is accepted by the administrator, the system initiates onboarding while maintaining an audit link back to the originating inquiry. Reserved units remain visible to the public but dynamically block new booking submissions. *(Figure 5. Public Unit Catalogue and Enquiry Form)*

### 4.2.4 Financial Tracking and Payment Recording Module
Monthly billing derives charges using business rule logic: total bill equals room rate plus water utility charges. Water is calculated as the active occupant count multiplied by the configured rate (₱200.00 per occupant), with the exception of the two Linda units, which are billed a fixed water charge and excluded from property grand totals per historical practice. On-site cash receipts are recorded against official receipt numbers. Online transactions processed through Adyen with GCash enter an intermediate **Pending Verification** status and do not adjust tenant balances until explicitly verified by the administrator. Financial ledgers are rendered in two primary views—**Monthly Income** and **Monthly Expenses**—mirroring the owner's spreadsheet structure and supporting native Excel export. The system does not calculate electricity charges, as each unit possesses an independent electric utility meter paid directly by the tenant. *(Figure 6. The Monthly Income Ledger)*

### 4.2.5 Maintenance Ticketing and Notification Module
Tenants log maintenance requests with title, description, category, and photographic attachments. The administrator tracks ticket progression from *Submitted* to *In Progress* and *Resolved*. Ticket closure is restricted exclusively to the administrator role, triggering an automated in-app notification to the tenant. The notification subsystem dispatches real-time alerts for payment verifications, rejections, and administrative inquiry updates. *(Figure 7. Maintenance Requests Board)*

### 4.2.6 Role-Based Access Control and Security
Access permissions are strictly governed across three principal roles: Public/Prospect, Tenant, and Administrator. Access control is enforced at both the API routing layer via permission middleware and at the data storage layer through PostgreSQL Row-Level Security (RLS) enabled across all 22 operational tables. Passwords are encrypted using salted bcrypt hashing. Anti-brute-force account lockouts activate upon consecutive failed authentication attempts. Administrative actions are logged to an append-only audit trail protected against update or deletion. Payment webhooks require cryptographic HMAC signature validation.

### 4.2.7 Progressive Web Application Implementation
The client utilizes a service worker and web app manifest, enabling the system to be installed directly onto Android and iOS home screens without third-party app stores. The responsive layout adapts dynamically: multi-column tabular ledgers on desktop environments transform into stacked card views on mobile devices. Sensitive financial records are never cached offline on client storage, enforcing data security in compliance with Section 1.4. *(Figure 8. The Tenant Portal on a Mobile Phone)*

---

## 4.3 Pilot Testing of the Developed System

### 4.3.1 Automated Verification Results
The engineering team constructed 20 automated check suites that execute against the operational system. Crucially, all suites operate strictly in a **read-only** capacity, allowing verification against live production data without risking record corruption. The comprehensive test suite was executed on 28 September 2026, with **all 20 check suites passing**. Table 8 details the results.

**Table 8.** Results of Automated Verification (28 September 2026)

| Suite | What it checks | Result |
| :--- | :--- | :--- |
| Endpoint and access control | Every endpoint the client calls, the separation of roles, and the rejection of bad input | 78 of 78 passed |
| Ledger integrity | All 937 income rows against the business rules; room, tenant and occupancy agreement | Passed; 5 receipt anomalies reported for the owner |
| Report reconciliation | The exported Excel reports against the database, month by month | 490 of 490 passed |
| Payment gateway | Signature checking on gateway messages and how each kind of message is recorded | 73 of 73 passed |
| Record relations | That separate records agree with each other (payments with bills, tickets with units) | 30 of 30 passed |
| Billing arithmetic | Water, billing period and how a payment is split across bills | Passed |
| Data presentation | That no screen shows stored, sample or empty data as a live figure | 6 of 6 passed |
| Interface integrity | That every screen component exists, every input has a label, and every source file is used | Passed |
| Document consistency | That the requirements matrix and business rule register agree with themselves | Passed (44 requirements, 49 rules) |

### 4.3.2 Use in the Live Environment
The system has been active in production on Vercel since early September 2026. Key operational pilot events include:
- **22 September 2026:** System generated its first operational on-demand bill: ₱8,200.00 for Unit 1A (₱8,000 base rent plus ₱200 water for one occupant).
- **22 September 2026:** An on-site cash collection was logged and subsequently voided four minutes later, verifying that the void audit path successfully restored the ledger to its exact baseline.
- **26 September 2026:** End-to-end testing of the Adyen GCash payment integration was completed following the resolution of Adyen acquirer configuration (Support Case 08657379). A test transaction generated a signed webhook, entered the Pending Verification queue, and preserved correct billing status upon administrative rejection.
- **26 September 2026:** Migration 055 purged all 20 test payment records and demo billing artifacts after a database backup, restoring the ledger to the baseline 937 rows.

### 4.3.3 Screen-versus-Database Audit
Automated unit tests ensure code correctness but do not guarantee that UI components accurately render backend records. On 26 September 2026, the team audited every administrative screen and tenant interface against direct database queries. Table 9 presents the audit findings and the six latent discrepancies resolved during the procedure.

**Table 9.** Results of the Screen-versus-Database Audit (26 September 2026)

| Screen | What was compared | Result |
| :--- | :--- | :--- |
| Owner overview | Collections for each month of 2026, the year's total, occupancy, rent per cluster, expected monthly income, operating and personal costs | Matched to the peso |
| Monthly Income | Totals for rent, water and garbage; collections by cluster | Matched after one defect was fixed |
| Monthly Expenses | Total spent, split by kind and by area | Matched; one layout defect fixed |
| Rooms and rates | Rent and number of occupants for each unit | Matched |
| Tenants | Number of tenants per cluster; move-in dates | Counts matched; one defect fixed |
| Activity (audit trail) | Each recent entry against the recorded action | One defect fixed |
| Repairs, inquiries | Number of open items | Matched |
| Tenant payments | A tenant's receipts for 2026 | Two defects fixed |

The six resolved defects encompassed: (1) tenant payment history omitting historical receipts, (2) personal and property expenses sharing a merged column, (3) default placeholder move-in dates misrepresenting tenancies, (4) initiated GCash checkouts erroneously labelled as recorded payments, (5) voided receipts appearing in tenant receipt lists, and (6) an erroneous calculation halving Boarding House remitted figures on screen.

### 4.3.4 Functional Walkthrough Testing
To validate all write pathways, a 26-step comprehensive functional walkthrough was formulated based on `TESTING_REHEARSAL.md`. The walkthrough is executed exclusively against the single vacant unit (**Penthouse `PH`**) to ensure zero risk to active tenancies.

**Table 10.** Results of the Functional Walkthrough [DATA PENDING]

| Step | Function tested | Expected result | Actual result | Pass or fail |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Public unit catalogue browsing | 33 units listed without resident names or sensitive details | [DATA PENDING] | [DATA PENDING] |
| 2 | Public unit detail inspection | Correct rate, floor, and cluster; resident names omitted (LB and LF verified) | [DATA PENDING] | [DATA PENDING] |
| 3 | Public booking enquiry submission | Confirmation message displayed; rate limiter guards abuse | [DATA PENDING] | [DATA PENDING] |
| 4 | Authentication negative test | Wrong current password rejected with inline message; session stays active | [DATA PENDING] | [DATA PENDING] |
| 5 | Administrator password rotation | Password updated successfully; active session maintained | [DATA PENDING] | [DATA PENDING] |
| 6 | Re-authentication with new credential | Successful sign-in using updated administrator password | [DATA PENDING] | [DATA PENDING] |
| 7 | Unit rate update and audit trigger | Rate updated; database trigger writes immutable price history row | [DATA PENDING] | [DATA PENDING] |
| 8 | Tenant onboarding to vacant unit (PH) | Tenancy created; unit status transitions to Occupied | [DATA PENDING] | [DATA PENDING] |
| 9 | Duplicate credential guard | Duplicate phone number registration rejected with validation message | [DATA PENDING] | [DATA PENDING] |
| 10 | Tenancy details modification | Occupant count updated and persisted in database | [DATA PENDING] | [DATA PENDING] |
| 11 | Tenant portal authentication | Tenant dashboard displays correct unit details, rate, and occupancy | [DATA PENDING] | [DATA PENDING] |
| 12 | Maintenance ticket creation with attachment | Ticket submitted with photo; size guard informs user if file is too large | [DATA PENDING] | [DATA PENDING] |
| 13 | Ticket communication thread | Follow-up message posted and displayed within ticket conversation | [DATA PENDING] | [DATA PENDING] |
| 14 | Tenant emergency contact update | Updated emergency contact saved and reflected in profile | [DATA PENDING] | [DATA PENDING] |
| 15 | Online payment checkout initialization | Adyen Web Drop-in mounts inside modal and displays GCash button | [DATA PENDING] | [DATA PENDING] |
| 15b | On-demand billing generation | Bill generated on demand matching unit rate plus ₱200/occupant water | [DATA PENDING] | [DATA PENDING] |
| 16 | Notification state management | Notification marked as read; unread badge counter decrements | [DATA PENDING] | [DATA PENDING] |
| 17 | Cross-tenant authorization perimeter | Accessing foreign ticket ID returns HTTP 404 (Not Found), not 403 | [DATA PENDING] | [DATA PENDING] |
| 18 | On-site cash collection recording | Collection recorded against receipt REHEARSAL-001; bill marked settled | [DATA PENDING] | [DATA PENDING] |
| 19 | Duplicate receipt prevention | Re-submitting identical receipt number is blocked with explicit alert | [DATA PENDING] | [DATA PENDING] |
| 19b | Receipt voiding and double-void guard | First void reverses ledger entry; second void attempt is rejected | [DATA PENDING] | [DATA PENDING] |
| 20 | Enquiry processing and resolution | Administrator reply sent; enquiry status marked Closed | [DATA PENDING] | [DATA PENDING] |
| 21 | Maintenance resolution and notification | Ticket advanced to Resolved; tenant receives resolution notification | [DATA PENDING] | [DATA PENDING] |
| 22 | Expense recording and allocation | ₱100 expense logged with property allocation; edits/deletion verified | [DATA PENDING] | [DATA PENDING] |
| 22b | Expense allocation split derivation | Expense split across areas; total derived automatically via trigger | [DATA PENDING] | [DATA PENDING] |
| 23 | Financial workbook export | income.xlsx and expenses.xlsx downloaded matching owner layout | [DATA PENDING] | [DATA PENDING] |
| 23b | Fail-safe presentation on API interruption | Backend stopped; money tiles display "—" instead of misleading ₱0.00 | [DATA PENDING] | [DATA PENDING] |
| 24 | Tenant vacating and tenancy termination | Tenancy ended; unit returns to Available; end_date recorded | [DATA PENDING] | [DATA PENDING] |
| 25 | Ledger baseline verification | Rehearsal records removed; ledger restored to exact 937 baseline rows | [DATA PENDING] | [DATA PENDING] |
| 26 | Unit rate restoration | PH rate restored to confirmed ₱30,000 rate card baseline | [DATA PENDING] | [DATA PENDING] |

### 4.3.5 Responsiveness and Operational Performance
Operational response times were profiled across target hardware environments specified in Chapter 3.

**Table 11.** Page Load and Response Times [DATA PENDING]

| Screen | Workstation (Table 2) | Mobile phone (Table 3) |
| :--- | :--- | :--- |
| Public home page, first load | [DATA PENDING] | [DATA PENDING] |
| Sign-in to dashboard | [DATA PENDING] | [DATA PENDING] |
| Income ledger, one full year | [DATA PENDING] | [DATA PENDING] |
| Excel export of one year | [DATA PENDING] | [DATA PENDING] |
| Tenant portal, first load | [DATA PENDING] | [DATA PENDING] |

---

## 4.4 Evaluation of the System Based on ISO/IEC 25010

The quality evaluation was conducted using a customized survey based on the ISO/IEC 25010 software product quality standard. Evaluators were segmented into three groups: the Property Owner, Tenants, and Technical Evaluators (IT faculty and developers).

### 4.4.1 Respondents
**Table 12.** Distribution of Respondents [DATA PENDING]

| Group | Number | Percent |
| :--- | ---: | ---: |
| Owner / administrator | [DATA PENDING] | [DATA PENDING] |
| Tenants | [DATA PENDING] | [DATA PENDING] |
| Technical evaluators | [DATA PENDING] | [DATA PENDING] |
| **Total** | [DATA PENDING] | 100% |

### 4.4.2 Interpretation of Scores
Survey responses were collected on a 5-point Likert scale. Composite characteristic scores are computed as the **mean of the group means** to prevent owner ratings from being diluted by the tenant sample size. Scores are interpreted per Table 13.

**Table 13.** Interpretation of Mean Scores

| Mean score | Verbal interpretation |
| :--- | :--- |
| 4.21 – 5.00 | Very High Quality |
| 3.41 – 4.20 | High Quality |
| 2.61 – 3.40 | Moderate Quality |
| 1.81 – 2.60 | Low Quality |
| 1.00 – 1.80 | Very Low Quality |

### 4.4.3 Functional Suitability
**Table 14.** Evaluation Results for Functional Suitability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system lets me manage tenant records, units, and the number of occupants in each unit. | Owner | [DATA PENDING] | [DATA PENDING] |
| The system computes rent and water charges correctly, without me doing the arithmetic myself. | Owner | [DATA PENDING] | [DATA PENDING] |
| Payments I receive in person are recorded accurately against the correct unit and month. | Owner | [DATA PENDING] | [DATA PENDING] |
| Online payments made by tenants appear correctly for me to verify before they are settled. | Owner | [DATA PENDING] | [DATA PENDING] |
| Maintenance requests can be submitted, followed, and closed within the system. | Owner | [DATA PENDING] | [DATA PENDING] |
| The financial reports the system produces match the records I keep. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| I can see my own unit details, my bill, and what I still owe. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I can submit a maintenance request and follow what happens to it. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I can see a record of the payments I have made. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| The system provides the functions required for tenant, unit, and occupancy management. | Technical | [DATA PENDING] | [DATA PENDING] |
| Rent and water charges are computed correctly and consistently. | Technical | [DATA PENDING] | [DATA PENDING] |
| Payment recording and verification behave correctly for both in-person and online payments. | Technical | [DATA PENDING] | [DATA PENDING] |
| The maintenance ticketing workflow supports submission, tracking, and closure. | Technical | [DATA PENDING] | [DATA PENDING] |
| Generated reports agree with the records held in the database. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.4 Performance Efficiency
**Table 15.** Evaluation Results for Performance Efficiency [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system responds quickly when I move between screens. | Owner | [DATA PENDING] | [DATA PENDING] |
| Financial reports are produced without a long wait. | Owner | [DATA PENDING] | [DATA PENDING] |
| The system stays responsive even when many records are shown at once. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| The system opens quickly. | Tenants | [DATA PENDING] | [DATA PENDING] |
| The system responds without delay when I move between screens. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| Response times are acceptable for the expected number of users and records. | Technical | [DATA PENDING] | [DATA PENDING] |
| Report generation completes within a reasonable time. | Technical | [DATA PENDING] | [DATA PENDING] |
| The system uses client and server resources efficiently. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.5 Compatibility
**Table 16.** Evaluation Results for Compatibility [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system works correctly in the browser I normally use. | Owner | [DATA PENDING] | [DATA PENDING] |
| Reports exported from the system open correctly in my spreadsheet program. | Owner | [DATA PENDING] | [DATA PENDING] |
| I can use the system at the same time as the other applications on my device. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| The system works correctly in the browser I normally use. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I can use the system at the same time as my other apps. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| The system operates correctly across current mainstream browsers. | Technical | [DATA PENDING] | [DATA PENDING] |
| Exported files conform to formats that other applications can read. | Technical | [DATA PENDING] | [DATA PENDING] |
| The system coexists with other applications without interference. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.6 Usability
**Table 17.** Evaluation Results for Usability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| I can tell what each screen is for without being taught. | Owner | [DATA PENDING] | [DATA PENDING] |
| The words and labels used match the way I actually talk about my property. | Owner | [DATA PENDING] | [DATA PENDING] |
| Before anything is changed or deleted, the system asks me to confirm and tells me what will happen. | Owner | [DATA PENDING] | [DATA PENDING] |
| When something goes wrong, the message tells me what to do about it. | Owner | [DATA PENDING] | [DATA PENDING] |
| I was able to learn the system without technical help. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| I can tell what each screen is for without being taught. | Tenants | [DATA PENDING] | [DATA PENDING] |
| The words used in the system are easy to understand. | Tenants | [DATA PENDING] | [DATA PENDING] |
| It is clear how much I owe and what the amount is made up of. | Tenants | [DATA PENDING] | [DATA PENDING] |
| When something goes wrong, the message tells me what to do about it. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I was able to use the system without anyone explaining it to me. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| The interface is understandable without prior training. | Technical | [DATA PENDING] | [DATA PENDING] |
| Terminology is consistent across the system and appropriate to the users. | Technical | [DATA PENDING] | [DATA PENDING] |
| Destructive actions require confirmation and state their consequence. | Technical | [DATA PENDING] | [DATA PENDING] |
| Error messages are actionable rather than technical. | Technical | [DATA PENDING] | [DATA PENDING] |
| The interface is operable for users with limited technical background. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.7 Reliability
**Table 18.** Evaluation Results for Reliability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system is available whenever I need it during the day. | Owner | [DATA PENDING] | [DATA PENDING] |
| Records I enter are still there when I come back to them. | Owner | [DATA PENDING] | [DATA PENDING] |
| When information cannot be loaded, the system says so instead of showing a wrong amount. | Owner | [DATA PENDING] | [DATA PENDING] |
| After an interruption, nothing I had already recorded was lost. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| The system is available whenever I try to use it. | Tenants | [DATA PENDING] | [DATA PENDING] |
| The information shown to me is correct and up to date. | Tenants | [DATA PENDING] | [DATA PENDING] |
| When something cannot be loaded, the system says so instead of showing a wrong amount. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| The system handles failure of a request without presenting incorrect data. | Technical | [DATA PENDING] | [DATA PENDING] |
| Recorded data is retained reliably. | Technical | [DATA PENDING] | [DATA PENDING] |
| The system distinguishes clearly between "no data" and "data could not be loaded". | Technical | [DATA PENDING] | [DATA PENDING] |
| The system recovers from interruption without data loss. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.8 Security
Tenants did not rate Security as they possess access strictly to their authenticated tenant portal and cannot evaluate system-wide defensive mechanisms.

**Table 19.** Evaluation Results for Security [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| Only I can reach the financial records. | Owner | [DATA PENDING] | [DATA PENDING] |
| A tenant can see only their own information. | Owner | [DATA PENDING] | [DATA PENDING] |
| I can see a record of the actions taken in the system and who took them. | Owner | [DATA PENDING] | [DATA PENDING] |
| I can change my password myself when I need to. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| Access to functions and records is correctly restricted by role. | Technical | [DATA PENDING] | [DATA PENDING] |
| A tenant account cannot reach administrative data. | Technical | [DATA PENDING] | [DATA PENDING] |
| Administrative actions are recorded in an auditable trail. | Technical | [DATA PENDING] | [DATA PENDING] |
| Credentials are handled and stored appropriately. | Technical | [DATA PENDING] | [DATA PENDING] |
| Authentication and session handling follow accepted practice. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.9 Maintainability
Only technical evaluators evaluated Maintainability following inspection of the GitHub source code repository, migration files, and technical architecture documentation.

**Table 20.** Evaluation Results for Maintainability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The codebase is organized so that a change can be located and made confidently. | Technical | [DATA PENDING] | [DATA PENDING] |
| The system is documented sufficiently for another developer to maintain it. | Technical | [DATA PENDING] | [DATA PENDING] |
| Changes to configurable values do not require code changes. | Technical | [DATA PENDING] | [DATA PENDING] |
| Automated checks exist that would catch a regression. | Technical | [DATA PENDING] | [DATA PENDING] |
| A change in one part of the system is unlikely to disturb unrelated parts. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.10 Portability
**Table 21.** Evaluation Results for Portability [DATA PENDING]

| Indicator | Rated by | Mean | Interpretation |
| :--- | :--- | ---: | :--- |
| The system works on the devices I already own. | Owner | [DATA PENDING] | [DATA PENDING] |
| I can install the system on my phone without going to an app store. | Owner | [DATA PENDING] | [DATA PENDING] |
| I did not need to install any other software to use the system. | Owner | [DATA PENDING] | [DATA PENDING] |
| **Owner mean** | | [DATA PENDING] | [DATA PENDING] |
| The system works on my own phone or computer. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I can open the system on more than one device. | Tenants | [DATA PENDING] | [DATA PENDING] |
| I did not need to install anything extra to use it. | Tenants | [DATA PENDING] | [DATA PENDING] |
| **Tenant mean** | | [DATA PENDING] | [DATA PENDING] |
| The system can be deployed to another environment without modification. | Technical | [DATA PENDING] | [DATA PENDING] |
| The client installs on a mobile device without an application store. | Technical | [DATA PENDING] | [DATA PENDING] |
| The system does not depend on software the target environment is unlikely to have. | Technical | [DATA PENDING] | [DATA PENDING] |
| **Technical evaluator mean** | | [DATA PENDING] | [DATA PENDING] |
| **Composite mean** | | [DATA PENDING] | [DATA PENDING] |

### 4.4.11 Summary of Evaluation Results and Optimization

**Table 22.** Summary of Evaluation Results [DATA PENDING]

| Characteristic | Composite mean | Interpretation |
| :--- | ---: | :--- |
| Functional Suitability | [DATA PENDING] | [DATA PENDING] |
| Performance Efficiency | [DATA PENDING] | [DATA PENDING] |
| Compatibility | [DATA PENDING] | [DATA PENDING] |
| Usability | [DATA PENDING] | [DATA PENDING] |
| Reliability | [DATA PENDING] | [DATA PENDING] |
| Security | [DATA PENDING] | [DATA PENDING] |
| Maintainability | [DATA PENDING] | [DATA PENDING] |
| Portability | [DATA PENDING] | [DATA PENDING] |
| **Overall** | [DATA PENDING] | [DATA PENDING] |

Objective 4 mandates system **optimization** based on empirical evaluation. Table 23 documents the full record of optimizations implemented across testing phases.

**Table 23.** Optimizations Made in Response to Evaluation

| Source | Finding | Change made | Characteristic |
| :--- | :--- | :--- | :--- |
| Client review on a phone, 23 Sep 2026 | Edit buttons appeared only on mouse hover, so they did not exist on a touch screen | Buttons show on touch screens and stay hover-only on computers | Usability |
| Client review on a phone, 23 Sep 2026 | The tenant register was wider than the phone screen | Tables become cards on small screens | Usability, Portability |
| Client review on a phone, 23 Sep 2026 | The payment form's buttons were hidden below the screen | Form height limited on phones so the buttons stay visible | Usability |
| Client review on a phone, 23 Sep 2026 | Forms with typed input had no close button | Every form can be closed; only the required first password change cannot | Usability |
| Performance review, 26 Sep 2026 | The payments page loaded the whole payment gateway library for every visitor | The library (about 194 kB) now loads only when a tenant starts an online payment; the page's own code is about 20 kB, measured on the live site on 28 Sep 2026 | Performance Efficiency |
| Final review, 26 Sep 2026 | A refused refund could be announced as successful; a receipt could be credited to the wrong tenant | Both corrected, with checks added | Reliability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A tenant's payment history showed no payments | Receipts from the ledger now shown with online payments | Functional Suitability |
| Screen audit, 26 Sep 2026 | Rental and personal expenses shared one column | Separate columns, as in the owner's workbook | Usability, Functional Suitability |
| Screen audit, 26 Sep 2026 | A placeholder date read as every tenant's move-in | Shown as not recorded until the real dates are entered | Reliability |
| Screen audit, 26 Sep 2026 | An opened GCash checkout was listed as a recorded payment | Listed as "GCash payment started" | Security (accountability of the audit trail) |
| Screen audit, 26 Sep 2026 | A voided receipt was listed to the tenant as a real payment | Voided receipts left out of the tenant's list | Reliability |
| Screen audit, 26 Sep 2026 | The Boarding House's remitted amount was halved on the income screen | Corrected to full rent plus water, read from the owner's workbook formula | Functional Suitability |
| Screen audit, 26 Sep 2026 | The payments list would stop silently at 1,000 records | Read in batches, like the income list | Reliability |
| Requirements review, 26 Sep 2026 | The owner could not record a repair she was told about in person, or one for an empty unit; a tenant was never told a repair was done | "Log a repair" added for any unit; the tenant is notified when the repair is marked done | Functional Suitability |
| Team review, 28 Sep 2026 | The two ledger pages were named "Money coming in" and "Money going out", which are not the owner's words | Renamed "Monthly Income" and "Monthly Expenses", the names of the two sheets in her workbook | Usability |
| Team review, 26 Sep 2026 | The highlighted option in every dropdown was cut off at the sides | Outline drawn inside the option | Usability |
| Client review, 26 Sep 2026 | Tenants who had moved out still appeared in the tenant list, and every current tenant carried a "Living here" label | The list opens on current tenants only; moved-out tenants are shown only when chosen, and only unusual states carry a label | Usability |
| Client review, 26 Sep 2026 | The same page had different names in the menu, the browser tab and its own heading | Each page has one name, used in all three places | Usability |
| Client review, 26 Sep 2026 | A year chosen on one page did not carry to the others | One year choice now applies to the overview and both ledgers | Usability |
| Mobile review, 26 Sep 2026 | On phones, every tap flashed a grey box, short pages scrolled slightly, and the notification panel could end under the browser's toolbar | Tap highlight removed; pages and the panel sized to the visible screen height | Usability, Portability |
| Check review, 28 Sep 2026 | Two checks disagreed on how many ended tenancies had no end date (2 and 1): the tenant list never sent end dates, and one real record had none | The list now sends end dates; the record was given its date (migration 059); both checks now fail on any new case | Reliability |
| Team review, 28 Sep 2026 | The public FAQ offered online GCash payment while the gateway is still Adyen's test account | The FAQ now says online payments charge no real money yet and asks tenants to pay in person | Functional Suitability |
| Survey results | [DATA PENDING] | Optimizations identified through statistical analysis of survey feedback | [DATA PENDING] |

---

## 4.5 Deployment Plan and Strategies

The system is deployed to Vercel with database hosting on Supabase and payment integration via Adyen. System deployment is executed through five distinct stages managed with risk mitigation protocols.

**Table 24.** Software and Hardware Requirements for Deployment

| Side | Requirement |
| :--- | :--- |
| Owner and tenants | A current web browser (Chrome, Edge, Firefox or Safari) on a computer or phone, and an internet connection |
| Hosting | Vercel (application), Supabase (PostgreSQL database), Adyen merchant account with GCash (optional online payment) |
| Administration | A computer that can run Node.js, used only for backups and verification runs |

**Table 25.** Deployment Plan and Strategies

| Stage | Activity | Status |
| :--- | :--- | :--- |
| 1. Environment preparation | Hosting, database and gateway set up; security settings applied | Done |
| 2. Record transfer | The owner's workbook transferred: 937 income rows and 1,327 expense allocations | Done |
| 3. Pilot use | The system used alongside the owner's existing records; differences investigated | In progress |
| 4. Training and hand-over | The owner and tenants shown how to use the system; user manual (Appendix K) handed over; accounts issued | [DATA PENDING] |
| 5. Full transition | The system becomes the owner's main record once both records agree | [DATA PENDING] |
