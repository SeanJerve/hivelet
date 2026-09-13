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

## MODULE 01: FINAL GROUP PRESENTATION GUIDE & SCRIPT
### 10-to-15 Minute Oral Defense Presentation Guide, Slide Deck Structure, and Spoken Script

**Project / System Title:** Hivelet: A Web-Based Boarding House Management and Financial Operations System for Fe Galang Da Silva Boarding House  
**Group Number:** 4  
**Team Members & Roles:**
* **[Member 1 Name]** — Project Lead / System Analyst
* **[Member 2 Name]** — Development Lead / Software Engineer
* **[Member 3 Name]** — UI/UX Lead / Frontend Architect

---

## 1. Presentation Overview & Rubric Strategy

Module 01 evaluates your group oral presentation on a **100-point rubric** across four equal criteria (25 points each):
1. **Design Completeness and Technical Accuracy (25 pts):** Consistency between Architecture, ERD, and DFDs.
2. **Incorporation of Panel Recommendations (25 pts):** Systematic proof that every Capstone 1 panel comment was addressed.
3. **Design Justification (25 pts):** Specific defense along Functionality, Security, Scalability, and Problem Alignment.
4. **Presentation Delivery and Team Participation (25 pts):** Equal speaking time across all members within the 10-to-15 minute time limit.

*Note on Tool Descriptions (Page 20 Guideline):* When presenting to the instructor, refer to tools by generic category: e.g., *"an enterprise relational database engine"*, *"a vector diagramming tool"*, or *"a component-based interface framework"*, rather than commercial product names.

---

## 2. Master Slide Deck Structure & Timing

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      10-TO-15 MINUTE DEFENSE TIMELINE & HANDOFFS                       │
├───────┬────────────────────────────────────────────┬──────────────┬────────────────────┤
│ Slide │ Topic / Slide Title                        │ Target Time  │ Primary Speaker    │
├───────┼────────────────────────────────────────────┼──────────────┼────────────────────┤
│ 1     │ Title Slide & System Identity              │ 0:00 - 0:30  │ Project Lead       │
│ 2     │ Problem Recap & Research Alignment         │ 0:30 - 1:30  │ Project Lead       │
│ 3     │ Capstone 1 Panel Recommendations Recap     │ 1:30 - 3:00  │ Project Lead       │
│ 4     │ Finalized Architecture & Pattern Choice    │ 3:00 - 5:00  │ Development Lead   │
│ 5     │ Refined Database Schema (Crow's Foot ERD)  │ 5:00 - 7:00  │ Project Lead       │
│ 6     │ Process Flows (Context & Level 1 DFD)      │ 7:00 - 9:00  │ Development Lead   │
│ 7     │ UI/UX Design Refinement & Heuristics       │ 9:00 - 11:00 │ UI/UX Lead         │
│ 8     │ Four-Part Design Justification             │ 11:00 - 13:00│ Shared by All Three│
│ 9     │ Summary, Conclusion & Q&A Readiness        │ 13:00 - 15:00│ Open for Panel Q&A │
└───────┴────────────────────────────────────────────┴──────────────┴────────────────────┘
```

---

## 3. Slide-by-Slide Presentation Script

---

### Slide 1 & 2: Title, Introduction & Problem Recap (1.5 Minutes)
* **Slide Contents:** System Title, Group Identification, Target Property photo, Problem statement summary.
* **Speaker:** **[Project Lead / System Analyst]**
* **Spoken Script:**
  > *"Good day, respected instructor and panel members. We present our finalized System Design Document and Design Refinement for **Hivelet: A Web-Based Boarding House Management and Financial Operations System**, specifically designed for **Fe Galang Da Silva Boarding House** in Legazpi City.
  >
  > In our Capstone 1 research, we documented that the boarding house—a 32-unit residential facility near Bicol University—relies entirely on fragmented, manual administrative methods. Monthly rent and utility collections are handwritten into physical notebooks, payment confirmations are scattered across personal messaging chats, and operational expenses are manually tracked on paper receipts. This fragmented structure creates three critical operational problems: first, high risk of financial record loss and math errors; second, recurring friction over the 50/50 co-ownership revenue share and occupant-based water fees; and third, untracked tenant maintenance requests that result in delayed repairs.
  >
  > Hivelet transitions the property into a centralized digital operations portal, consolidating tenant leases, billing schedules, maintenance dispatch, and financial ledgers into one secure system."*

---

### Slide 3: Capstone 1 Panel Recommendations Recap (1.5 Minutes)
* **Slide Contents:** Table comparing Capstone 1 panel feedback against our specific Capstone 2 design actions.
* **Speaker:** **[Project Lead / System Analyst]**
* **Spoken Script:**
  > *"During our Capstone 1 proposal defense, our panel provided three critical recommendations that guided our design refinement throughout Module 01:
  >
  > First, the panel recommended exploring an online payment integration, specifically evaluating Adyen for GCash payments. Because commercial transaction fees and merchant registration terms for a localized boarding house are currently pending final consultation with our adviser and property stakeholder (Mrs. Fe Galang Da Silva), our team designed a **Decoupled / Pluggable Modular Payment Architecture**. The system operates reliably today with on-site cash collections and direct GCash receipt verification, while remaining architecturally ready to plug into automated Adyen processing without altering the core database or billing logic.
  >
  > Second, the panel noted that our data model lacked auditability, failed to preserve rental rate histories, and lacked formalization for the ₱200-per-head water calculation. We resolved this by restructuring our schema into **Third Normal Form (3NF)**, decoupling rate history into a dedicated entity to preserve the property's 2% annual increase rule, and adding audit logs.
  >
  > Third, the panel recommended establishing a clear offline resilience strategy for low-connectivity dormitory environments. We incorporated a Progressive Web Application architecture with service worker resource caching."*

---

### Slide 4: Finalized System Architecture (2 Minutes)
* **Slide Contents:** System Architecture Diagram (Presentation, API, Services, Persistence, Adapters), Tech Stack Table.
* **Speaker:** **[Development Lead / Software Engineer]**
* **Spoken Script:**
  > *"To resolve our panel's architectural feedback, we finalized our system as a **Layered Client-Server Architecture Structured as a Modular Monolith**.
  >
  > As shown on the architecture diagram, the system is partitioned horizontally into four distinct layers:
  > 1. At the **Presentation Layer**, a modern component-based single-page application and progressive web app executes in the browser, providing dedicated portals for public visitors, active tenants, and the administrator. Crucially, our PWA service worker caches read-only data, allowing active tenants to inspect their billing statements and the landlady to view her occupancy matrix and tenant emergency contacts even during dormitory internet disruptions.
  > 2. At the **API and Security Layer**, an asynchronous backend server routes incoming requests through JSON Web Token authentication and Role-Based Access Control middleware.
  > 3. At the **Business Logic Layer**, we structure backend operations as a modular monolith. Discrete domain services govern billing rules, payment verification, room occupancy, maintenance ticketing, and audit logging within a single deployable runtime.
  > 4. At the **Data Persistence Layer**, an enterprise relational database engine guarantees ACID transaction consistency, strict foreign key constraints, and immutable audit logging.
  >
  > We deliberately chose this pattern over microservices. For a 32-unit boarding house, microservices introduce distributed network latency, container orchestration overhead, and multi-service transaction failures. Our layered modular monolith provides clean domain separation while running reliably on our university deployment server."*

---

### Slide 5: Refined Database Schema (ERD) (2 Minutes)
* **Slide Contents:** Crow's Foot ERD Diagram, 3NF Normalization Proof Summary, Key Audit Attributes.
* **Speaker:** **[Project Lead / System Analyst]**
* **Spoken Script:**
  > *"Our database schema was audited across all six schema-refinement checks and normalized to **Third Normal Form (3NF)** using standard Crow's Foot notation.
  >
  > We closed critical narrative gaps by introducing five dedicated tables:
  > * `clusters` preserves the property’s canonical five-cluster reporting layout: Main Boarding House, Back Apartment, Penthouse, Front Apartment, and Linda.
  > * `room_price_history` decouples historical rates from active room records, ensuring the property's 2% annual increase rule does not overwrite past accounting history.
  > * `room_assignments` tracks active tenant headcounts, which directly drives the water fee formula of ₱200 per registered occupant.
  > * `payments` incorporates verification status flags (`Pending Verification`, `Verified`) and 13-digit transaction reference numbers.
  > * `audit_logs` maintains an append-only ledger of all administrative financial modifications.
  >
  > All passwords are cryptographically salted and hashed using bcrypt before storage, all currency attributes enforce exact two-decimal numeric precision, and core financial tables enforce `ON DELETE RESTRICT` constraints to prevent accidental record loss."*

---

### Slide 6: Process and Data Flow Diagrams (2 Minutes)
* **Slide Contents:** Context Diagram (Level 0), Level 1 DFD, and Payment Verification Sequence Diagram.
* **Speaker:** **[Development Lead / Software Engineer]**
* **Spoken Script:**
  > *"Our Context Diagram establishes system boundaries between three external entities: Public Prospects, Active Tenants, and the Administrator. 
  >
  > In our Level 1 DFD, we decomposed system operations into six discrete subprocesses. To satisfy the Design Review Checklist, **every single DFD data store maps one-to-one to an entity in our ERD**, and every process maps directly to a service component in our architecture.
  >
  > As demonstrated in our transaction sequence diagram for **Subprocess 3.0: Billing and Payment Processing**:
  > 1. The billing engine batch-processes active room assignments, multiplying occupant counts by the ₱200 rate to generate itemized tenant bills.
  > 2. When a tenant submits a GCash payment, the record is inserted with a 'Pending Verification' status, and an in-app notification is dispatched to the administrator.
  > 3. The landlady inspects the reference number and receipt against her personal GCash account.
  > 4. Upon clicking 'Verify', an atomic database transaction updates the bill to 'Paid', derives the 50% co-ownership revenue share, updates the Monthly Income Ledger, and writes an immutable audit record."*

---

### Slide 7: UI/UX Design Refinement & Heuristics (2 Minutes)
* **Slide Contents:** UI Design Tokens, Nielsen Heuristics Compliance, Empty/Error/Confirm States, User Walkthrough Log.
* **Speaker:** **[UI/UX Lead / Frontend Architect]**
* **Spoken Script:**
  > *"Our user interface refinement moved beyond wireframes into a fully validated, high-fidelity corporate workspace inspired by Jira and Airtable design systems.
  >
  > We established strict design tokens: a neutral slate canvas (`#f4f5f7`) to minimize eye fatigue, crisp white card surfaces (`#ffffff`), high-contrast charcoal typography (`#172b4d`) meeting WCAG AAA standards, and Atlassian corporate blue (`#0c66e4`) for primary action focal points. In strict accordance with our capstone design guidelines, emojis were completely eliminated in favor of clean, standardized vector icons.
  >
  > We evaluated the system against Nielsen's 10 Usability Heuristics:
  > * For **Visibility of System Status**, asynchronous operations display animated skeleton screens rather than blank pages, and payments feature distinct color-coded status badges.
  > * For **Error Prevention**, destructive actions—such as voiding an income ledger entry—trigger a dedicated confirmation modal with an explicit impact warning.
  > * For **Match with the Real World**, we conducted an on-site walkthrough with Mrs. Fe Galang Da Silva. In response to her feedback, we replaced complex debit/credit accounting forms with a **Guided Payment Entry Wizard** that auto-populates occupant counts and calculates the 50% revenue share automatically upon selecting a room unit."*

---

### Slide 8: Four-Part Design Justification (2 Minutes)
* **Slide Contents:** 4-Quadrant Summary Card (Functionality, Security, Scalability, Problem Alignment) defending our Decoupled Payment Architecture Pending Consultation.
* **Speakers:** **All Three Members (Sequential Delivery)**
* **Spoken Script:**
  * **[Project Lead] (Functionality):**
    > *"For our primary design justification, we defend our **Decoupled / Pluggable Modular Payment Architecture Pending Consultation**. Along **Functionality**, the database schema's `payments` table was defined with generic attributes to support on-site cash collections and direct GCash verification immediately, while remaining ready to handle automated gateway callbacks without schema modifications (`FR-011`, `FR-014`, `FR-015`, `FR-016`)."*
  * **[Development Lead] (Security & Scalability):**
    > *"Along **Security**, third-party gateway interactions are isolated in a modular backend adapter, preventing credential leakage while server-authoritative calculations and Express RBAC enforce strict payment validation and immutable audit logging.
    > Along **Scalability**, this decoupled design avoids premature vendor lock-in and protects the boarding house from unsustainable percentage transaction fees, handling peak monthly billing cycles with sub-50ms indexed database queries while keeping gateway integration plug-and-play."*
  * **[UI/UX Lead] (Problem Alignment):**
    > *"Finally, along **Problem Alignment**, the design immediately resolves lost paper receipts, misplaced cash envelopes, and scattered Messenger screenshots, giving the landlady full financial clarity while preserving technical agility as final stakeholder consultation concludes."*

---

### Slide 9: Conclusion & Q&A Defense Readiness
* **Speaker:** **[Project Lead / System Analyst]**
* **Spoken Script:**
  > *"In conclusion, our refined design completely addresses our Capstone 1 panel recommendations, aligns with the operational realities of Fe Galang Da Silva Boarding House, and establishes a robust engineering foundation for Capstone 2 construction. Thank you, and we are now ready to answer your questions."*

---

## 4. Anticipated Panel Questions & Bulletproof Answers

### Question 1: "What is your group's decision regarding the panel's recommendation to integrate Adyen for online payments?"
* **Spoken Defense [Development Lead]:**  
  > *"Our panel recommended exploring Adyen for GCash payments. Because commercial transaction fee structures and sole-proprietorship merchant underwriting are currently pending final consultation with our adviser and property owner Mrs. Fe Galang Da Silva, our team implemented a **Decoupled / Pluggable Modular Architecture**. 
  > 
  > In the database schema, the `payments` table is structured generically (`payment_method`, `amount`, `transaction_reference`, `verification_status`) so it natively handles on-site cash and direct GCash verification today. Simultaneously, in the architecture, we isolated the payment gateway into an external adapter service (`adyenService.ts`). If final consultation approves live Adyen, it plugs in seamlessly with zero database or billing changes; if consultation decides to defer it, our core operations continue running reliably without external vendor dependencies."*

### Question 2: "What prevents a tenant from submitting a fraudulent GCash reference number?"
* **Spoken Defense [Development Lead]:**  
  > *"The system enforces human-in-the-loop authorization. When a tenant submits a reference number and receipt screenshot, the payment record is initialized with a status of `Pending Verification`. The bill remains in an active due status. The administrator receives an in-app notification, cross-references the submitted 13-digit reference and amount against her personal GCash application or SMS alerts, and only clicks 'Verify' once the deposit is confirmed. This guarantees fraudulent entries cannot alter the financial ledger."*

### Question 3: "How does the system ensure the 50% revenue share is computed accurately?"
* **Spoken Defense [Project Lead]:**  
  > *"The revenue share calculation is completely server-authoritative. The client application is never trusted to calculate or submit financial totals. When a payment is verified, the backend billing service executes a database transaction that multiplies gross rent by 0.50, factors in the ₱200 per head water remittance from active registered occupants, deducts garbage collection fees, and writes the resulting net remittance into `monthly_income_records`. Every calculation is permanently auditable in the Monthly Income Report."*
