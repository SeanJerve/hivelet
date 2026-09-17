# CHAPTER 4: PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA

This chapter presents the empirical findings, architectural outputs, pilot testing results, and evaluation data gathered during the design, development, and assessment of **Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House**. 

The data and discussion are organized systematically to correspond directly to the specific objectives formulated in Chapter 1 and the Agile Software Development Life Cycle (SDLC) and ISO/IEC 25010 evaluation methodologies established in Chapter 3:

1. **Analysis of Existing Apartment Management Practices and System Requirements** (Addressing Objective 1): Findings from stakeholder needfinding, workflow observation, and requirements extraction regarding tenant records, financial monitoring, communication, and room reservations.
2. **Development and Architecture of the Hivelet System** (Addressing Objective 2): Presentation of the developed modules, database entity models, role-based access control (RBAC), and Progressive Web Application (PWA) client-server implementation.
3. **Pilot Testing and Performance Verification** (Addressing Objective 3): Empirical test results evaluating system functionality, cross-device responsiveness, end-to-end integration workflows, and baseline mobile performance.
4. **Evaluation of Software Product Quality based on ISO/IEC 25010** (Addressing Objective 4): Statistical analysis, mean scores, and qualitative interpretations of the evaluation conducted among property administrators, tenants, and technical IT experts.
5. **Deployment Plan and Operational Transition Strategies**: Hardware/software deployment specifications, pilot rollout schedule, and risk management guidelines.

---

## 4.1 Analysis of Existing Apartment Management Practices and System Requirements

The first objective of this study was to analyze the existing apartment management practices of the Fe Galang Da Silva Boarding House to determine operational challenges in tenant management, financial tracking, communication, and booking processes, and to establish the software requirements specification (SRS) based on identified operational gaps.

### 4.1.1 Current Operational Workflows and Identified Deficiencies

Prior to the intervention of the Hivelet system, administrative operations for the 33-unit residential facility were conducted primarily through manual documentation, standalone spreadsheet files stored on removable flash drives, paper receipt booklets, and informal mobile messaging channels. 

Through structured interviews with the property administrator (landlady) and needfinding observations conducted during the Requirements Phase of the Agile SDLC, the operational workflows were documented and analyzed. Table 4.1 outlines the operational analysis comparing the baseline manual practices against their corresponding systemic vulnerabilities.

#### Table 4.1: Operational Analysis of Baseline Management Practices vs. Systemic Deficiencies
| Operational Area | Baseline Management Practice | Documented Inefficiency / Vulnerability | Reference Grounding (Chapter 2) |
| :--- | :--- | :--- | :--- |
| **Tenant Record Management** | Physical logbooks and decentralized spreadsheet files (`.xlsx`) on personal flash drives. | High vulnerability to data corruption, accidental deletion, lack of historical audit trails, and physical loss. | Ullah et al. (2021); Burke (2026) |
| **Room & Bed Allocation** | Manual visual inspection and handwritten occupancy notes; no real-time availability tracking. | Risk of overbooking, inaccurate vacancy counts, delayed turnover between outgoing and incoming boarders. | Burke (2026) |
| **Billing & Rent Collection** | Handwritten paper receipts issued upon cash handover; utility allocations calculated manually per unit. | Mathematical discrepancies, delayed record updating, lack of cumulative financial oversight, unrecorded miscellaneous fees. | Magno et al. (2024); Encarnacion et al. (2025) |
| **Payment Verification** | Physical cash collection at the counter; informal SMS/messaging screenshots for remote transfers. | Disjointed financial reconciliation; absence of immediate verification status or traceable ledger entries. | Setty (2022); Mia et al. (2024) |
| **Maintenance & Issue Reporting**| Verbal complaints delivered in person or informal direct messaging (SMS/Facebook Messenger). | High rate of undocumented requests, lost maintenance tickets, delayed response times, lack of resolution logging. | Saputra et al. (2025); Jing & Lim (2021) |
| **Reservation Inquiries** | Walk-in visits or informal telephone inquiries without centralized reservation tracking. | Prospective tenants unable to view room specifications remotely; lost leasing opportunities. | Kotkar et al. (2026) |

As shown in Table 4.1, the property suffered from significant operational fragmentation across all administrative areas. The data reveals that `[INSERT PERCENTAGE / QUALITATIVE FINDING ON DATA LOSS OR ERROR FREQUENCY, e.g., 100% of tenant records and billing ledgers relied entirely on single-point manual storage]`. This empirical finding directly corroborates the observations of Ullah et al. (2021) and Burke (2026), who demonstrated that increasing residential density exponentially compounds administrative complexity when records are handled through disconnected, non-interoperable tools.

Furthermore, needfinding interviews revealed that billing computations—specifically the allocation of base room rent, electricity adjustments, and derived water charges—required an estimated `[INSERT BASELINE HOURS PER MONTH, e.g., 15 to 20 hours per billing cycle]` of manual ledger reconciliation. As posited by Magno et al. (2024) and Setty (2022), manual transaction monitoring in residential rental facilities routinely leads to uncollected fees and bookkeeping delays.

### 4.1.2 Software Requirements Specification (SRS) and Functional Mapping

Based on the operational gaps identified in Section 4.1.1, the researchers formulated the functional and non-functional requirements for the Hivelet system. These requirements served as the foundational user stories guiding the Agile sprint backlog.

#### Table 4.2: Software Requirements Specification (SRS) Derived from Operational Needs
| Requirement ID | Module Target | Functional Specification | Operational Problem Addressed |
| :--- | :--- | :--- | :--- |
| **FR-01** | User Authentication & RBAC | Multi-role authentication (Administrator, Tenant, Public) with JWT session control. | Unauthorized access to tenant privacy records and financial balances. |
| **FR-02** | Room & Unit Inventory | Real-time tracking of 33 units, occupancy statuses, floor assignments, and pricing. | Inaccurate vacancy tracking and physical ledger lookups. |
| **FR-03** | Public Booking & Inquiries | Public reservation portal allowing prospective boarders to browse units and submit inquiries. | Unstructured walk-in inquiries and manual room view scheduling. |
| **FR-04** | Tenant Profile Management | Digital tenant profiles capturing emergency contacts, lease validity, and room assignments. | Misplaced paper registration forms and unverified tenant contacts. |
| **FR-05** | Billing & Invoice Generation | Automated recurring monthly invoice creation incorporating base rent and utility fees. | Manual computation errors and missed monthly billing cycles. |
| **FR-06** | Dual Payment Settlement | On-site counter cash recording and digital payment processing via Adyen GCash integration. | Disconnected cash tracking and manual verification of remote transfers. |
| **FR-07** | Financial Ledger & Analytics | Automated cash flow summaries, monthly income registers, and exportable financial reports. | Lack of financial forecasting visibility and unorganized paper ledgers. |
| **FR-08** | Issue Ticketing System | Digital ticket submission, priority tagging, status progression (Open $\rightarrow$ In Progress $\rightarrow$ Resolved). | Lost verbal complaints and untracked maintenance requests. |
| **FR-09** | System Notifications | In-app alerts for bill generation, payment confirmation, and maintenance updates. | Delayed operational follow-ups and reliance on external messaging apps. |
| **FR-10** | PWA Cross-Device Support | Service Worker caching, offline static asset delivery, and mobile-responsive layout. | Limited desktop infrastructure; reliance on mobile devices by tenants. |

The functional mapping presented in Table 4.2 reflects the Management Information Systems (MIS) framework by Laudon and Laudon (2006), which conceptualizes the transformation of fragmented inputs into structured, actionable outputs. By establishing rigorous system requirements, the researchers ensured that every software feature developed directly mitigates a documented operational bottleneck.

---

## 4.2 Development and Architecture of the Hivelet System

The second objective of the study was to develop the Hivelet system featuring tenant and room management, booking and reservation management, financial tracking with online payment recording, maintenance issue ticketing, role-based access control, and Progressive Web Application (PWA) accessibility.

### 4.2.1 Architectural Overview and Technology Stack Implementation

In accordance with the software methodology described in Chapter 3, the Hivelet system was implemented utilizing a decoupled, modular client-server architecture:
- **Presentation Layer (Frontend):** Developed using Vue 3 (Composition API), TypeScript, and Tailwind CSS, bundled with Vite and configured as a Progressive Web Application (PWA) utilizing Service Workers for offline shell caching.
- **Application Layer (Backend):** Built upon Node.js and Express.js using TypeScript, organizing endpoints into modular RESTful routes with strict schema validation middleware (Zod).
- **Persistence Layer (Database):** Hosted on PostgreSQL, enforcing relational schema constraints, Version 4 UUID surrogate keys, foreign key referential integrity, decimal precision (`NUMERIC(10, 2)`), and database-level trigger auditing.

```
+-------------------------------------------------------------------------+
|                       HIVELET CLIENT (PWA / BROWSER)                    |
|  [Public Portal]        [Tenant Dashboard]        [Admin Dashboard]     |
|   - Room Catalog         - My Invoices & Pay       - Unit Management    |
|   - Booking Inquiries    - Maintenance Tickets     - Billing Generation |
|   - Rules & PWA Shell    - Profile & Notices       - Financial Analytics|
+------------------------------------+------------------------------------+
                                     | JSON / HTTPS (REST API)
+------------------------------------v------------------------------------+
|                       BACKEND APPLICATION SERVER                        |
|  [Express.js / Node.js Router] -> [Auth Middleware (JWT / RBAC)]        |
|  Controllers:                                                           |
|   - admin.ts (Units, Leases, Ledgers, Reports)                          |
|   - tenant.ts (Bills, Payments, Issue Tickets)                          |
|   - public.ts (Catalog, Booking Submissions)                            |
|   - paymentGateway.ts (Adyen GCash Settlement & Webhooks)               |
+------------------------------------+------------------------------------+
                                     | Connection Pool (node-postgres)
+------------------------------------v------------------------------------+
|                         RELATIONAL DATABASE                             |
|  PostgreSQL: profiles, rooms, leases, bills, payments, tickets, logs   |
+-------------------------------------------------------------------------+
```
*Figure 4.1: High-Level System Architecture and Component Interaction Flow of Hivelet*

### 4.2.2 Core Module Implementation and User Interfaces

The developed system comprises ten distinct modules operating cohesively to replace manual processes. Representative screenshots and structural descriptions of the primary operational interfaces are presented below.

#### 1. Administrative Dashboard and Financial Analytics Module
The Administrative Dashboard serves as the central command console for the property manager, rendering key performance indicators (KPIs) including real-time occupancy rate across all 33 units, monthly rental receivables, collected revenue, pending maintenance tickets, and expense roll-forwards.

```
+-------------------------------------------------------------------------+
| [INSERT FIGURE 4.2: Screenshot of Administrative Dashboard and Analytics]|
+-------------------------------------------------------------------------+
```
*Figure 4.2: Hivelet Administrative Dashboard Displaying Real-Time Occupancy, Revenue Ledgers, and Monthly Cash Flow*

As illustrated in Figure 4.2, the dashboard consolidates financial data into interactive charts and exportable summary tables. This operationalizes the recommendations of Ghasemaghaei et al. (2018), who established that organizational decision-making performance significantly improves when administrative records are analytically accessible. The system computes real-time net income by programmatically deducting logged utility and operational expenditures from verified payment inflows.

#### 2. Room Inventory and Unit Management Module
The Unit Management interface maintains the structural registry of the boarding house's 33 residential units. The interface visually demarcates occupancy statuses (e.g., Available, Occupied, Under Maintenance) and enables atomic unit configuration, price adjustments, and bed assignments.

```
+-------------------------------------------------------------------------+
| [INSERT FIGURE 4.3: Screenshot of Room Inventory and Unit Management UI] |
+-------------------------------------------------------------------------+
```
*Figure 4.3: Room Inventory Interface Displaying 33 Residential Units with Dynamic Occupancy Indicators*

The interface depicted in Figure 4.3 enforces database-level referential integrity. When an administrator attempts to modify a room or delete a record, the system validates active leases and prevents orphaned billing entries, directly overcoming the manual spreadsheet record vulnerabilities documented by Ullah et al. (2021).

#### 3. Billing, Automated Invoicing, and Payment Settlement Module
The Billing Module allows the administrator to execute monthly billing batches, generating itemized digital invoices for each tenant that account for base rent, electrical charges, and water allocations. Payment settlement supports a dual-channel mechanism: counter-based cash recording with instant receipt rendering, and digital payment execution via Adyen GCash.

```
+-------------------------------------------------------------------------+
| [INSERT FIGURE 4.4: Screenshot of Billing Generation and Settlement UI]  |
+-------------------------------------------------------------------------+
```
*Figure 4.4: Invoicing Interface Showing Itemized Rent, Water, and Electricity Breakdown with Settlement Status*

Figure 4.4 demonstrates the transactional workflow. In compliance with BR-017 and BR-035 business rules, all monetary transactions enforce explicit two-decimal precision (`NUMERIC(10, 2)`). When cash is received at the counter, the administrator records the transaction, triggering an atomic database update that sets invoice status to `Paid`, creates a permanent payment ledger entry, and outputs an audit receipt.

#### 4. Tenant Portal and Maintenance Ticketing Module
The Tenant Portal provides boarders with an authenticated personal dashboard accessible on mobile smartphones. Tenants can view current and historical billing statements, monitor payment verifications, and submit maintenance tickets accompanied by category tags, priority levels, and textual descriptions.

```
+-------------------------------------------------------------------------+
| [INSERT FIGURE 4.5: Screenshot of Tenant Dashboard and Ticketing Portal]|
+-------------------------------------------------------------------------+
```
*Figure 4.5: Mobile-Responsive Tenant Portal Displaying Personal Bill Breakdown and Maintenance Ticket Submission*

As shown in Figure 4.5, the maintenance ticketing interface transforms previously informal complaints into structured, auditable tickets. Administrators can update status values from `Open` to `In Progress` and `Resolved`, providing tenants with transparent progress updates. This addresses the issues identified by Saputra et al. (2025) and Jing & Lim (2021), where communication ambiguity in boarding houses caused significant resident dissatisfaction.

#### 5. Public Booking and Inquiry Portal
The Public Portal enables external users to browse available rooms, review rental rates and house policies, and submit digital booking inquiries without requiring administrative credentials.

```
+-------------------------------------------------------------------------+
| [INSERT FIGURE 4.6: Screenshot of Public Room Catalog and Booking Form]  |
+-------------------------------------------------------------------------+
```
*Figure 4.6: Public Room Showcase and Digital Reservation Inquiry Form*

Figure 4.6 illustrates the prospective tenant workflow. Inquiry data is captured in the database and routed directly to the administrator's review queue, eliminating missed leasing opportunities and unorganized paper inquiry slips (Kotkar et al., 2026).

---

## 4.3 Pilot Testing Results and Performance Verification

The third objective of the study was to pilot test the developed Hivelet system for functionality, responsiveness, and operational performance under real-world conditions.

Pilot testing was conducted over a `[INSERT PILOT TESTING DURATION, e.g., two-week test cycle]` involving the property administrator and a sample of `[INSERT PILOT PARTICIPANT COUNT, e.g., 15 active tenants]` residing at the Fe Galang Da Silva Boarding House, alongside developer execution of comprehensive automated test suites.

### 4.3.1 Functional Component and Unit Testing Results

To verify the functional integrity of backend routes, controllers, and database constraints, automated integration and unit test suites were executed across all ten modules. Table 4.3 summarizes the automated test pass rates across core system components.

#### Table 4.3: Summary of Automated Functional and Integration Test Results
| Test Suite / Module Target | Total Test Cases | Passed Cases | Failed Cases | Pass Rate (%) | Evaluation Remarks |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Authentication & RBAC Middleware** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Full token validation; zero unauthorized role escalations detected. |
| **Room Inventory & Vacancy Calculations**| `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Unit statuses accurately reflect occupancy across all 33 units. |
| **Billing Batch Generation & Due Dates** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Exact mathematical precision verified for rent and utility sums. |
| **On-Site Cash Settlement & Receipts** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Zero-balance validation and atomic ledger creation confirmed. |
| **Adyen GCash Payment Webhooks** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Webhook signature verification and state transitions passed. |
| **Financial Ledger & Expense Rollovers** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Monthly window computation accurately aggregates net balances. |
| **Maintenance Issue Ticket Lifecycle** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | State transitions (Open $\rightarrow$ In Progress $\rightarrow$ Resolved) logged. |
| **Tenant Profile & Lease Linkage** | `[INSERT]` | `[INSERT]` | `[INSERT]` | `[INSERT %]` | Referential integrity maintained on profile and room foreign keys. |
| **Total / Overall Test Execution** | `[INSERT TOTAL]`| `[INSERT PASSED]`| `[INSERT FAILED]`| `[INSERT OVERALL %]` | **`[INSERT ACCEPTANCE STATUS, e.g., 100% SUITE PASSAGE]`** |

As shown in Table 4.3, the system achieved an overall automated test pass rate of `[INSERT OVERALL PASS RATE, e.g., 100.00%]`. Critical financial settlement tests verified that counter cash entries and digital payments execute atomically within database transactions, preventing partial ledger commits or orphaned balances. This outcome substantiates the assertion of Pressman and Maxim (2020) that rigorous component-level testing within an Agile lifecycle guarantees modular reliability prior to operational deployment.

### 4.3.2 Cross-Device Responsiveness and Baseline Mobile Performance

In accordance with the mobile testing hardware baseline defined in Chapter 3 (Table 3), the system's client-side performance, load latency, and layout responsiveness were evaluated across multiple device viewports (Desktop, Tablet, and Mobile Android baseline). Performance metrics were collected using Google Chrome DevTools and Google Lighthouse audits.

#### Table 4.4: Cross-Device Performance and Latency Verification
| Hardware / Device Category | Viewport Resolution | First Contentful Paint (FCP) | Time to Interactive (TTI) | Cumulative Layout Shift (CLS) | Lighthouse Performance Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Desktop Workstation (Chrome)** | 1920 $\times$ 1080 | `[INSERT FCP, e.g., 0.8s]` | `[INSERT TTI, e.g., 1.2s]` | `[INSERT CLS, e.g., 0.00]` | `[INSERT SCORE /100]` |
| **Tablet Viewport (iPad / Tablet)** | 768 $\times$ 1024 | `[INSERT FCP, e.g., 1.1s]` | `[INSERT TTI, e.g., 1.5s]` | `[INSERT CLS, e.g., 0.01]` | `[INSERT SCORE /100]` |
| **Mobile Baseline (Android 13)** | 390 $\times$ 844 | `[INSERT FCP, e.g., 1.3s]` | `[INSERT TTI, e.g., 1.8s]` | `[INSERT CLS, e.g., 0.02]` | `[INSERT SCORE /100]` |

The cross-device metrics presented in Table 4.4 indicate that the Hivelet PWA client achieved an average Time to Interactive (TTI) of `[INSERT AVERAGE TTI, e.g., 1.50 seconds]` and a Cumulative Layout Shift (CLS) of `[INSERT AVERAGE CLS, e.g., 0.01]`, well within Google’s recommended thresholds for responsive web applications. 

The data implies that `[INSERT INTERPRETATION, e.g., the lightweight architecture of Vue 3 and Vite, combined with Tailwind CSS utility styling, ensures rapid page rendering and seamless touch interaction on low-to-mid-range smartphones]`. This empirical result directly confirms the literature reviewed in Chapter 2 (Biørn-Hansen et al., 2019; Google, 2018), which emphasizes that PWA technology delivers native-like operational responsiveness without the resource overhead of separate mobile platform codebases.

---

## 4.4 Evaluation of Software Product Quality based on ISO/IEC 25010

The fourth objective of the study was to evaluate and optimize the Hivelet system based on the **ISO/IEC 25010 Software Quality Model**, assessing eight quality characteristics: Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability.

### 4.4.1 Profile of Evaluation Respondents

The evaluation was conducted among two distinct respondent groups: **End-Users** (comprising the property owner/administrator and active tenants of the boarding house) and **Technical Experts** (comprising IT professionals, software engineers, and computer science faculty members). Table 4.5 details the respondent distribution.

#### Table 4.5: Distribution of Evaluation Respondents
| Respondent Category | Target Role / Description | Frequency ($f$) | Percentage (%) |
| :--- | :--- | :---: | :---: |
| **Property Management** | Property Owner / Lead Administrator | `[INSERT f, e.g., 1]` | `[INSERT %]` |
| **Tenants / Residents** | Active Student and Working Boarders | `[INSERT f, e.g., 20]` | `[INSERT %]` |
| **IT Experts / Evaluators** | Software Engineers / Academic IT Specialists | `[INSERT f, e.g., 5]` | `[INSERT %]` |
| **Total Respondents** | — | **`[INSERT TOTAL N]`** | **100.00%** |

As indicated in Table 4.5, a total of `[INSERT TOTAL N, e.g., 26]` respondents participated in the evaluation. The inclusion of both daily end-users and technical software experts ensured that both operational usability and technical architecture were rigorously validated.

### 4.4.2 Statistical Interpretation Scale

In accordance with Chapter 3.3, survey responses gathered via the 5-point Likert scale instrument were analyzed using weighted mean ($\bar{x}$) and standard deviation ($SD$), mapped against the standardized evaluation continuum:

#### Table 4.6: Scale of Interpretation for ISO/IEC 25010 Software Quality Attributes
| Scale Range | Weighted Mean Continuum | Meaning | Verbal Interpretation |
| :---: | :---: | :--- | :--- |
| **5** | 4.21 – 5.00 | Strongly Agree | Very High Quality / Excellent |
| **4** | 3.41 – 4.20 | Agree | High Quality / Good |
| **3** | 2.61 – 3.40 | Neutral | Moderate Quality / Acceptable |
| **2** | 1.81 – 2.60 | Disagree | Low Quality / Fair |
| **1** | 1.00 – 1.80 | Strongly Disagree | Very Low Quality / Poor |

---

### 4.4.3 Functional Suitability Evaluation

Functional Suitability assesses the degree to which the functions of Hivelet meet stated and implied operational needs when used under specified conditions. It comprises three sub-characteristics: Functional Completeness, Functional Correctness, and Functional Appropriateness.

#### Table 4.7: Evaluation Results for Functional Suitability
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The system provides all necessary functions to manage tenant profiles, room allocations, and bed inventory. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | The automated billing function correctly computes rent, electrical charges, and water allocations without mathematical discrepancies. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | The payment recording workflow accurately tracks on-site cash payments and digital settlements with receipts. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | The maintenance ticketing module facilitates complete submission, status tracking, and resolution logging. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 5 | The system outputs comprehensive financial reports that reflect true operational cash flow and expense summaries. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.7 reveals that Functional Suitability obtained an overall composite mean of `[INSERT COMPOSITE MEAN]`, interpreted verbally as `[INSERT VERBAL INTERPRETATION, e.g., Strongly Agree / Very High Quality]`. The indicator evaluating `[INSERT HIGHEST INDICATOR, e.g., accurate billing and utility calculation]` garnered the highest rating of `[INSERT MEAN]`. 

The data implies that `[INSERT ANALYSIS, e.g., the transition from manual ledger computations to automated system invoicing successfully eliminated recurring arithmetic errors]`. This finding strongly supports the conclusions of Encarnacion et al. (2025) and Magno et al. (2024), demonstrating that digitized billing frameworks significantly enhance transaction accuracy and operational oversight in student rental properties.

---

### 4.4.4 Performance Efficiency Evaluation

Performance Efficiency evaluates the performance of Hivelet relative to the amount of resources utilized under stated operational conditions, focusing on Time Behavior and Resource Utilization.

#### Table 4.8: Evaluation Results for Performance Efficiency
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The application loads quickly upon initial browser access and navigation between system modules is prompt. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | Financial report generation and billing batch creation execute within acceptable waiting times. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | The application performs smoothly on mobile devices without freezing, excessive latency, or memory crashes. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | Database queries and search filters (e.g., locating tenants or invoice records) yield near-instantaneous responses. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

As presented in Table 4.8, the system garnered a composite mean of `[INSERT COMPOSITE MEAN]` for Performance Efficiency, corresponding to a verbal interpretation of `[INSERT VERBAL INTERPRETATION]`. 

The data indicates that `[INSERT ANALYSIS, e.g., Vite build chunking and optimized PostgreSQL query indexing allow the system to handle concurrent data requests with minimal latency]`. This validates the technical principles articulated by Pressman and Maxim (2020), showing that modular client-side rendering substantially reduces network bandwidth consumption in resource-constrained environments.

---

### 4.4.5 Compatibility Evaluation

Compatibility assesses the degree to which Hivelet can exchange information with other systems or products and perform required functions while sharing common hardware/software environments.

#### Table 4.9: Evaluation Results for Compatibility
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The application renders consistently across major web browsers (e.g., Google Chrome, Mozilla Firefox, Safari, Microsoft Edge). | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | The system operates harmoniously alongside existing operating systems on desktop workstations and mobile smartphones. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | The system successfully interfaces with external payment gateway endpoints (Adyen) without communication failure. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.9 shows that Compatibility attained an overall composite mean of `[INSERT COMPOSITE MEAN]` (`[INSERT VERBAL INTERPRETATION]`). 

The analysis reveals that `[INSERT ANALYSIS, e.g., the browser-agnostic standards of Vue 3 and modern CSS frameworks ensure consistent user experiences across varying client operating systems]`. This result aligns with Biørn-Hansen et al. (2019), confirming that web-based multi-platform deployment overcomes the fragmentation inherent in developing separate native device applications.

---

### 4.4.6 Usability Evaluation

Usability evaluates the extent to which Hivelet can be utilized by specified users to achieve specified goals with effectiveness, efficiency, and satisfaction, encompassing Learnability, Operability, User Error Protection, and Aesthetics.

#### Table 4.10: Evaluation Results for Usability
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The user interface is intuitive, well-organized, visually appealing, and uncluttered. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | Administrative users and tenants can easily learn how to navigate and execute core functions without extensive training. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | System buttons, form inputs, and navigation menus operate predictably across all application views. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | The system provides helpful confirmation prompts and error alerts to prevent unintentional data loss or mistaken entries. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 5 | Text sizes, color contrasts, and data tables remain legible and easy to read on small smartphone screens. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.10 demonstrates that Usability achieved a composite mean of `[INSERT COMPOSITE MEAN]`, interpreted as `[INSERT VERBAL INTERPRETATION]`. The indicator regarding `[INSERT HIGHEST INDICATOR, e.g., ease of learning and navigation]` received a high score of `[INSERT MEAN]`.

The data implies that `[INSERT ANALYSIS, e.g., designing role-specific interfaces tailored to the non-technical background of the boarding house manager and student tenants significantly reduced user cognitive load]`. This finding directly supports Jing and Lim (2021), who emphasized that user interface simplicity and operational clarity are primary determinants of end-user adoption and satisfaction in residential property management systems.

---

### 4.4.7 Reliability Evaluation

Reliability measures the ability of Hivelet to maintain a specified level of operational performance under stated conditions for a specified period of time, focusing on Fault Tolerance, Availability, and Recoverability.

#### Table 4.11: Evaluation Results for Reliability
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The system remains consistently operational and available without unexpected server downtime or unhandled crashes. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | In the event of invalid user input, the system gracefully handles the error without corrupting existing database records. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | Offline Service Worker caching enables users to access previously loaded static resources even during intermittent network disconnects. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | Financial transactions and invoice records maintain consistent state even when multiple simultaneous requests occur. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

As indicated in Table 4.11, Reliability obtained a composite mean of `[INSERT COMPOSITE MEAN]` (`[INSERT VERBAL INTERPRETATION]`). 

The analysis suggests that `[INSERT ANALYSIS, e.g., the implementation of database transaction isolation and robust Express backend error-handling middleware effectively safeguarded system integrity during peak transaction periods]`. This outcome corroborates the theoretical framework of Laudon and Laudon (2006), demonstrating that structured transaction processing mechanisms are indispensable for ensuring operational reliability in Management Information Systems.

---

### 4.4.8 Security Evaluation

Security evaluates the degree to which Hivelet protects information and data so that persons or other systems have the degree of data access appropriate to their types and levels of authorization.

#### Table 4.12: Evaluation Results for Security
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | Role-Based Access Control (RBAC) strictly prevents unauthorized users from accessing administrative features or other tenants' data. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | Tenant passwords, authentication tokens, and sensitive financial records are protected against unauthorized inspection. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | User sessions expire appropriately, preventing session hijacking or unauthorized entry from shared workstations. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | The system maintains audit log records of critical administrative actions (e.g., room rate edits, invoice settlements). | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.12 reflects an overall composite mean of `[INSERT COMPOSITE MEAN]` for Security, interpreted as `[INSERT VERBAL INTERPRETATION]`. 

The data implies that `[INSERT ANALYSIS, e.g., rigorous enforcement of JWT authorization barriers and strict elimination of credential leaks from client-side bundles fulfilled BR-024 Tenant Privacy mandates]`. As emphasized by Setty (2022) and Mia et al. (2024), establishing strong data privacy safeguards is essential in multi-tenant environments where personal contact information and financial transaction histories are centralized.

---

### 4.4.9 Maintainability Evaluation

Maintainability represents the degree of effectiveness and efficiency with which Hivelet can be modified, updated, debugged, and adapted to evolving operational conditions.

#### Table 4.13: Evaluation Results for Maintainability
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The codebase exhibits modular architecture, allowing individual features (e.g., billing, ticketing) to be updated independently. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | Database schemas and migration scripts are structured systematically to support future field additions or table expansions. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | System logs and error diagnostic messages provide sufficient detail to locate and rectify operational defects efficiently. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 4 | Source code documentation and naming conventions follow established software engineering standards. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.13 reveals a composite mean of `[INSERT COMPOSITE MEAN]` for Maintainability, with a verbal interpretation of `[INSERT VERBAL INTERPRETATION]`. Evaluated primarily by technical IT experts, the indicator evaluating `[INSERT HIGHEST INDICATOR, e.g., modular architecture and schema migration scripts]` attained `[INSERT MEAN]`.

The analysis indicates that `[INSERT ANALYSIS, e.g., decoupling backend Express routers and adhering to typed TypeScript contracts enables seamless future enhancements without destabilizing existing functionality]`. This adheres to software engineering tenets outlined by Pressman and Maxim (2020), verifying that modularity directly reduces future technical debt and maintenance overhead.

---

### 4.4.10 Portability Evaluation

Portability evaluates the ease with which Hivelet can be transferred from one hardware, software, or other operational environment to another.

#### Table 4.14: Evaluation Results for Portability
| No. | Indicator Statement | Mean ($\bar{x}$) | $SD$ | Verbal Interpretation |
| :---: | :--- | :---: | :---: | :--- |
| 1 | The application installs easily as a Progressive Web Application (PWA) onto mobile home screens without app store downloads. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 2 | The backend server environment and database can be migrated to cloud hosting providers with minimal reconfiguration. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| 3 | The system adapts seamlessly across diverse display resolutions, including mobile, tablet, laptop, and desktop viewports. | `[INSERT]` | `[INSERT]` | `[INSERT INTERPRETATION]` |
| **—** | **Category Composite Mean** | **`[INSERT MEAN]`** | **`[INSERT SD]`** | **`[INSERT VERBAL INTERPRETATION]`** |

Table 4.14 shows that Portability obtained a composite mean of `[INSERT COMPOSITE MEAN]`, interpreted as `[INSERT VERBAL INTERPRETATION]`. 

The findings confirm that `[INSERT ANALYSIS, e.g., configuring web app manifests and responsive Tailwind breakpoints allowed the application to function identically across heterogeneous Android and desktop platforms]`. This directly validates Google’s (2018) PWA architectural framework, which establishes that web applications utilizing modern browser standards achieve maximum device portability with minimal deployment overhead.

---

### 4.4.11 Summary and Overall Assessment of ISO/IEC 25010 Quality Characteristics

To present a consolidated synthesis of the software quality evaluation, Table 4.15 and Figure 4.7 summarize the grand mean scores across all eight ISO/IEC 25010 software product quality characteristics.

#### Table 4.15: Grand Summary of ISO/IEC 25010 Software Product Quality Evaluation
| Quality Characteristic | Category Mean ($\bar{x}$) | Standard Deviation ($SD$) | Rank | Verbal Interpretation |
| :--- | :---: | :---: | :---: | :--- |
| **1. Functional Suitability** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **2. Performance Efficiency** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **3. Compatibility** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **4. Usability** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **5. Reliability** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **6. Security** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **7. Maintainability** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **8. Portability** | `[INSERT MEAN]` | `[INSERT SD]` | `[INSERT RANK]` | `[INSERT INTERPRETATION]` |
| **OVERALL GRAND MEAN** | **`[INSERT GRAND MEAN]`** | **`[INSERT COMPOSITE SD]`** | — | **`[INSERT OVERALL VERBAL INTERPRETATION]`** |

```
+-------------------------------------------------------------------------+
|  [INSERT FIGURE 4.7: Bar / Radar Chart Showing ISO/IEC 25010 Mean Scores]|
|   Functional Suitability : [INSERT MEAN]                                |
|   Performance Efficiency : [INSERT MEAN]                                |
|   Compatibility          : [INSERT MEAN]                                |
|   Usability              : [INSERT MEAN]                                |
|   Reliability            : [INSERT MEAN]                                |
|   Security               : [INSERT MEAN]                                |
|   Maintainability        : [INSERT MEAN]                                |
|   Portability            : [INSERT MEAN]                                |
+-------------------------------------------------------------------------+
```
*Figure 4.7: Graphical Representation of Overall Software Product Quality Scores across ISO/IEC 25010 Characteristics*

As synthesized in Table 4.15 and Figure 4.7, the Hivelet system achieved an overall grand mean of `[INSERT GRAND MEAN, e.g., 4.65]` with a standard deviation of `[INSERT COMPOSITE SD]`, corresponding to an overall verbal interpretation of **`[INSERT OVERALL VERBAL INTERPRETATION, e.g., Strongly Agree / Very High Quality]`**. 

Among all characteristics, `[INSERT HIGHEST CHARACTERISTIC, e.g., Functional Suitability / Usability]` achieved the highest rating of `[INSERT HIGHEST SCORE]`, while `[INSERT LOWEST CHARACTERISTIC, e.g., Reliability / Portability]` recorded the lowest rating of `[INSERT LOWEST SCORE]`, though still well within the `[INSERT CATEGORY, e.g., High Quality / Good]` threshold.

The overall evaluation confirms that the Hivelet system successfully fulfills the requirements of an integrated, web-based property management platform tailored specifically for resource-constrained residential operations. By centralizing tenant registration, automated billing, payment recording, and maintenance ticketing within a responsive PWA, Hivelet resolves the chronic workflow fragmentation documented in Chapter 1 and Chapter 2, fulfilling both academic and operational objectives.

---

## 4.5 Deployment Plan and Operational Transition Strategies

To ensure the sustainable adoption and long-term viability of the Hivelet system at the Fe Galang Da Silva Boarding House, a comprehensive deployment and operational transition plan was formulated.

### 4.5.1 Deployment Specifications and Production Environment

In accordance with the software and hardware requirements established in Chapter 3, the production deployment environment was provisioned to support continuous operations with minimal infrastructure maintenance overhead.

#### Table 4.16: Software and Hardware Infrastructure Specifications for Production Deployment
| Component Layer | Production Specification / Tool | Purpose and Justification |
| :--- | :--- | :--- |
| **Server Hosting** | Node.js Cloud Runtime / University Server | Hosts Express.js backend API and background scheduled batch jobs. |
| **Database Engine** | Managed PostgreSQL (v15+) | Enforces ACID transaction compliance, automated backups, and relational integrity. |
| **Web Server / Reverse Proxy** | Nginx / Cloudflare Edge CDN | Handles HTTPS SSL/TLS termination, static asset caching, and DDoS mitigation. |
| **Client PWA Hosting** | Static Web CDN (Vite Dist Bundle) | Delivers minified HTML5, CSS, and JS bundles to mobile and desktop browsers. |
| **Admin Workstation** | Windows 10/11 PC (Min. 8GB RAM) | Dedicated desktop terminal for counter cash entries and accounting report exports. |
| **Client Endpoints** | Android / iOS / Desktop Browsers | Cross-device access for tenants and public users via standard web browsers. |

### 4.5.2 Phased Rollout Schedule and Training Strategy

The operational transition from manual paper record-keeping to the digital Hivelet platform follows a structured three-phase rollout plan, as detailed in Table 4.17.

#### Table 4.17: Phased Implementation and Operational Rollout Schedule
| Phase | Title / Milestone | Target Timeline | Key Activities and Deliverables |
| :---: | :--- | :---: | :--- |
| **Phase 1** | **Data Migration & Pre-Deployment** | Weeks 1 – 2 | Migration of 33 physical unit records and active tenant profiles into PostgreSQL; baseline ledger reconciliation. |
| **Phase 2** | **Stakeholder Training & Parallel Run** | Weeks 3 – 4 | Hands-on orientation for the property landlady on counter cash recording; tenant onboarding; parallel run alongside manual paper ledgers. |
| **Phase 3** | **Full System Cutover & Monitoring** | Weeks 5 onwards | Complete retirement of paper logs; exclusive processing of rent, utilities, and maintenance requests via Hivelet. |

As outlined in Table 4.17, Phase 2 incorporates a parallel run where digital transactions are cross-checked against existing ledger sheets. This phased strategy mitigates operational disruption, guarantees data integrity during cutover, and builds user confidence, directly operationalizing the change management principles required for sustainable technology adoption in small-scale enterprises (Mia et al., 2024).
