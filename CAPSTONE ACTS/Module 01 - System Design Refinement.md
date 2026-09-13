# BICOL UNIVERSITY

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

### College of Science | Department of Information Technology
### IT 124 – Capstone Project 2
## Learning Module 01: System Design Refinement

---

**Course Code & Title:** IT 124 – Capstone Project 2  
**Module Title:** Learning Module 01: System Design Refinement  
**Project / System Title:** Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House  
**Target Stakeholder / Property:** Fe Galang Da Silva Boarding House, Legazpi City (3 Floors, 32 Rentable Units)  
**Group Number:** Group 4  
**Year - Block:** 4th Year - BS Information Technology  

---

# LEARNING ACTIVITIES

## Activity 1: Knowledge and Comprehension Check (Items 1 to 8)

### Items 1 to 5: Matching Type
* **1. Layered (n-tier) architecture** — **B** *(An architectural pattern that separates presentation, business logic, and data into distinct layers.)*
* **2. Crow's Foot notation** — **D** *(A notation that expresses the cardinality of a relationship directly on the connecting line between two entities.)*
* **3. Context Diagram (Level 0)** — **E** *(A diagram that represents the entire system as a single process, showing only its boundary and external entities.)*
* **4. Third Normal Form (3NF)** — **A** *(A normalization standard requiring no repeating groups, no partial dependency on part of a composite key, and no transitive dependency between non-key attributes.)*
* **5. Modular monolith** — **C** *(A single deployable application with clearly separated internal modules, often the middle ground between a layered design and true microservices.)*

### Items 6 to 8: True or False
* **6. FALSE** — A capstone team should not default to a microservices architecture simply to demonstrate technical skill. Microservices introduce unnecessary distributed transaction complexity, network latency, and operational deployment overhead that are unsuitable for capstone-scale systems.
* **7. TRUE** — In relational database modeling, a foreign key always belongs on the "many" side of a one-to-many ($1:N$) relationship.
* **8. FALSE** — Happy-path screens alone are not sufficient for a validated UI/UX mockup; design refinement requires designing edge cases, error states, empty states, and confirmation dialogs before construction begins.

---

## Activity 2: Guided Application Worksheet (Items 9 to 14)

### Module Scenario Analysis (Items 9 to 11)
*(Note: Items 9 to 11 answer the module's hypothetical scenario: A panel tells a team: "Your data model has no way to track whether a submitted request was approved, denied, or is still pending.")*

* **9. Which schema-refinement checklist item does this recommendation most directly point to, and what new schema element would resolve it?**
  * **Checklist Item:** Attribute definition (specifically, defining missing status attributes and audit timestamps).
  * **New Schema Element:** A `status` attribute (e.g., `status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED'))`) paired with an audit timestamp attribute `status_updated_at TIMESTAMPTZ`.

* **10. State the cardinality and participation between a new Request entity and an existing Applicant entity, using the sentence form modeled in the worked example:**
  * *"An **Applicant** may have **zero or many Requests**, and a **Request** must belong to **exactly one Applicant**."*

* **11. Name two of the four architectural patterns covered in the concept review, and give one capstone-appropriate reason a team might choose each one:**
  * **Pattern A: Layered (n-tier) Architecture** — A capstone team chooses this because it enforces clear horizontal separation between the user interface, business logic/API controllers, and database access, making it straightforward for a small team to divide frontend and backend tasks.
  * **Pattern B: Modular Monolith** — A capstone team chooses this when a system encompasses multiple distinct functional areas (such as billing, inquiries, and maintenance) that need organized internal module boundaries, while deploying as a single unified application without the distributed networking overhead of microservices.

---

### Application to Own Capstone Project — Hivelet (Items 12 to 14)

* **12. From your own Capstone 1 panel's recommendations, write down one recommendation that concerns your system's architecture, database schema, or data flow diagrams:**
  * *"The panel recommended exploring and incorporating an optional online payment feature—specifically digital payment submission using GCash via the Adyen API—so tenants have a digital payment alternative alongside the system's primary manual cash payment tracking."*

* **13. Which of the six schema-refinement checklist items best addresses the recommendation you wrote in Item 12?**
  * **Attribute definition** (defining flexible payment method, gateway transaction reference, and verification status attributes in the payment entity).

* **14. Describe, in your own words, the specific schema or architecture change your team will make in response to that recommendation:**
  * While our team is currently pending final consultation with our capstone adviser and stakeholder regarding the operational feasibility and account requirements of Adyen, we responded architecturally by designing a **Decoupled Modular Payment Architecture**. In the database schema, we designed the `payments` table with generic attributes (`payment_method`, `payment_reference`, `verification_status`) so it fully handles on-site cash payments right now, while remaining schema-ready to store gateway references without database migrations if Adyen is approved. In the architecture, the payment gateway is isolated in an external modular service layer so it can be enabled or deferred without touching core billing logic.

---

## Activity 3: Analysis and Synthesis Task (Items 15 to 17)

* **15. A team's barangay-based system was proposed as always-online client-server, but the panel noted that the barangay hall loses internet access for several hours at a time. Analyze this situation: what functionality and usability risks does the original design create for the system's actual end users?**
  * **Functionality Risks:** When internet connectivity drops, municipal operations halt completely. Staff cannot query resident records, issue clearances, or record blotter reports, creating severe transaction backlogs and forcing staff to revert to manual paper notes that risk getting misplaced or conflicting with database records once re-encoded.
  * **Usability Risks:** Users experience hanging requests, unhandled HTTP network timeouts (e.g., 504 Gateway Timeout), and silent form submission failures where long text fields are wiped out upon page reload. This causes severe user frustration, lack of trust in the system, and eventual abandonment of the software.

* **16. Using the four-part justification framework (functionality, security, scalability, and problem alignment), write a short justification for one major design decision in your own capstone project. Address all four dimensions.**
  * **Design Decision:** *Adopting a Decoupled Modular Payment Architecture to accommodate Optional Online GCash (Adyen) alongside Primary On-Site Cash Settlement, pending final stakeholder consultation (`FR-014`, `FR-015`, `FR-016`, `BR-016`, `BR-017`).*
  * **Functionality:** Completely preserves requirement `FR-014` by supporting the landlady's primary, preferred workflow of recording on-site cash payments directly at the boarding house office, while providing the technical capability for optional online GCash payments via Adyen (`FR-015`, `FR-016`) once consultation is finalized.
  * **Security:** Isolates external payment API calls and webhook processing inside a dedicated backend service. This guarantees that merchant credentials and webhook signing keys remain strictly on the server and are never exposed to the frontend, while ensuring core billing tables remain protected regardless of gateway status.
  * **Scalability:** Prevents the boarding house's day-to-day operations (32 units) from becoming hard-dependent on an external third-party payment vendor. The core billing and tenant management systems continue to operate reliably at full speed without risk of external API downtime or rate-limiting.
  * **Problem Alignment:** Directly aligns with the landlady's established preference for direct oversight and cash settlement, while constructively addressing the panel's recommendation by preparing a ready architectural pathway for digital payment convenience.

* **17. Identify one usability heuristic from the concept review that your own system's current UI/UX design does not yet fully satisfy, and describe the specific change you will make to satisfy it:**
  * **Usability Heuristic:** **Visibility of system status (Heuristic 1)** and **Error prevention (Heuristic 5)**.
  * **Specific Change:** In our initial payment interface, payment state transitions and processing feedback were not explicitly visualized. In the refined design, we implemented an explicit loading state and a confirmation modal (`ConfirmModal.vue`). When recording or submitting a payment, the modal displays an itemized summary (tenant name, room number, amount, payment method) and requires deliberate confirmation, preventing duplicate submissions and accidental record creation.

---

# FINAL ASSESSMENT

## Part I. Objective (Items 18 to 32)

* **18.** Which architectural pattern separates a system into presentation, business logic, and data layers?  
  **Answer: B** *(Layered n-tier)*
* **19.** A team proposes true microservices for a system with three users and one functional module. Based on the concept review, what is the most likely panel reaction?  
  **Answer: B** *(A request to justify the choice, since microservices are rarely necessary at capstone scale)*
* **20.** Which of the following is NOT one of the six schema-refinement checklist items?  
  **Answer: C** *(Version control branching strategy)*
* **21.** A password field in a schema should be documented as:  
  **Answer: B** *(A field to be hashed before storage)*
* **22.** Which normal form specifically eliminates transitive dependency of a non-key attribute on another non-key attribute?  
  **Answer: C** *(Third Normal Form - 3NF)*
* **23.** In Crow's Foot notation, cardinality is expressed:  
  **Answer: B** *(Directly on the line connecting two entities)*
* **24.** Which DFD level represents the entire system as a single process, showing only its boundary and external entities?  
  **Answer: C** *(Context Diagram - Level 0)*
* **25.** A sequence diagram is most useful for documenting:  
  **Answer: B** *(The step-by-step interaction between the client, the API layer, and the database for one transaction)*
* **26.** Which usability heuristic is being applied when a system shows a loading indicator while a report is generating?  
  **Answer: B** *(Visibility of system status)*
* **27.** Which of the four design-justification dimensions is addressed by the statement, "Passwords are hashed using bcrypt before storage"?  
  **Answer: B** *(Security)*
* **28.** The tool named in the concept review for defining a schema through a lightweight text-based syntax that instantly renders a diagram:  
  **Answer: DBML (Database Markup Language) / Mermaid** *(or dbdiagram.io)*
* **29.** The single deployable application with clearly separated internal modules, often the middle ground between a layered design and true microservices:  
  **Answer: Modular monolith**
* **30.** The type of key placed on the many side of a one-to-many relationship:  
  **Answer: Foreign key**
* **31.** The stage of UI/UX refinement where error states, empty states, and confirmation dialogs must be designed, not just the happy path:  
  **Answer: High-fidelity mockup refinement**
* **32.** The four dimensions used to justify a design decision in this module:  
  **Answer: Functionality, Security, Scalability, and Problem alignment**

---

### Answer Sheet, Part I (Summary Table for Page 18)

| Item No. | Answer | Item No. | Answer |
| :---: | :---: | :---: | :---: |
| **18** | **B** | **26** | **B** |
| **19** | **B** | **27** | **B** |
| **20** | **C** | **28** | **DBML / Mermaid** |
| **21** | **B** | **29** | **Modular monolith** |
| **22** | **C** | **30** | **Foreign key** |
| **23** | **B** | **31** | **High-fidelity mockup refinement** |
| **24** | **C** | **32** | **Functionality, Security, Scalability, Problem alignment** |
| **25** | **B** | | |

---

## Part II. Application (Items 33 to 42)

### Cooperative Loan Scenario (Items 33 to 38)
*(Note: Items 33 to 38 answer the module's hypothetical scenario for a Cooperative Loan Management System)*

* **33. Propose a new entity that would resolve Recommendation 1. Give it at least three attributes and complete the table below:**  
  **Proposed Entity:** `LoanRepayment`

| Attribute | Data Type | Constraint |
| :--- | :--- | :--- |
| `repayment_id` | `UUID` | PRIMARY KEY |
| `loan_id` | `UUID` | FOREIGN KEY REFERENCES Loan(loan_id) ON DELETE RESTRICT |
| `amount_paid` | `DECIMAL(10, 2)` | NOT NULL, CHECK (amount_paid > 0) |
| `payment_date` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `status` | `VARCHAR(20)` | NOT NULL, CHECK (status IN ('PENDING', 'POSTED', 'OVERDUE')) |

* **34. Write the cardinality and participation statement, in the sentence form used in this module, between your new entity from Item 33 and the existing Member entity:**  
  * *"A **Member** may have **zero or many LoanRepayments**, and a **LoanRepayment** must belong to **exactly one Member**."*

* **35. Which architectural revision from the worked model would most directly resolve Recommendation 2? Explain your answer in two to three sentences:**  
  * Adopting a layered architecture with an offline-capable client, similar to the worked model, most directly resolves Recommendation 2. The client application uses browser local storage (IndexedDB) and a Service Worker to queue new loan applications locally whenever the device loses connection. Once internet access is restored, an asynchronous background sync worker transmits the queued applications to the central server without data loss.

* **36. Describe, step by step, the component sequence (client, then which components, in what order) that results from your answer to Item 35:**  
  1. **Client Form UI:** The loan officer submits the encoded loan application form, and the client application detects an offline status.  
  2. **Client Offline Storage (IndexedDB / Service Worker):** The form payload is serialized into a pending synchronization queue, and an offline status badge is shown.  
  3. **Client Network Listener:** The browser detects an active network connection event (`online`).  
  4. **API Client (Axios / Fetch):** Reads the queued payloads and issues authenticated HTTP POST requests to the backend server.  
  5. **Backend Business Logic Layer:** Validates the application fields and checks member credit rules.  
  6. **Database Persistence Layer:** Executes a database transaction to commit the new loan record.  
  7. **Backend Controller Response:** Returns an HTTP 201 Created status, signaling the client to clear the local queue and display a synchronization confirmation banner.

* **37. Propose a UI/UX refinement that resolves Recommendation 3, and name the specific usability heuristic it satisfies:**  
  * Implement a **Master-Detail Collapsible Card List** on the Member profile. When a member has multiple active loans, the screen displays a summary badge (e.g., `"Active Loans: 2"`) and renders individual accordion cards for each loan showing Loan ID, principal, balance, and due date, enabling the officer to inspect each loan separately without clutter.  
  * **Heuristic:** **Recognition rather than recall (Heuristic 6)** and **Flexibility and efficiency of use (Heuristic 7)**.

* **38. State one normalization check (1NF, 2NF, or 3NF) that the new entity from Item 33 should be tested against, and explain in one sentence what that check would verify for this entity:**  
  * **Check:** **Third Normal Form (3NF)**.  
  * **Verification:** This check verifies that all non-key attributes (`amount_paid`, `payment_date`, `status`) depend strictly on the primary key `repayment_id` and have no transitive dependencies on other non-key attributes, ensuring derived calculations (such as remaining balance) are computed dynamically rather than stored redundantly.

---

### Application to Own Capstone Project — Hivelet (Items 39 to 42)

* **39. List the primary key and at least two foreign keys for one entity in your own system's finalized ERD:**  
  **Entity:** `payments` (from `05_DATABASE_DESIGN.md` and `hivelet_erd.mmd`)

| Key Type | Field Name | References |
| :--- | :--- | :--- |
| **Primary Key** | `id` | Unique UUID surrogate identifier |
| **Foreign Key 1** | `bill_id` | `bills(id)` ON DELETE SET NULL |
| **Foreign Key 2** | `tenant_profile_id` | `tenant_profiles(id)` ON DELETE CASCADE |
| **Foreign Key 3** | `room_id` | `rooms(id)` ON DELETE CASCADE |

* **40. Identify the architectural pattern your team has finalized for your own system, and list the major components shown in your architecture diagram:**  
  * **Pattern:** **Layered Client-Server Architecture (3-Tier Web Application structured as a Modular Monolith)**.  
  * **Major Components:**  
    1. *Presentation Layer (Frontend Client):* Built with Vue 3 and Tailwind CSS, featuring the Public Website, Tenant Self-Service Portal, and Admin Control Center, with routing handled by Vue Router and state managed by Pinia.  
    2. *API & Security Layer (Backend Server):* Built with Node.js and Express.js, providing REST route controllers (`/auth`, `/rooms`, `/bills`, `/payments`, `/tickets`), input validation, and JWT Role-Based Access Control (`admin` vs `tenant`).  
    3. *Business Logic & Service Layer:* Modular backend services including Billing Service, Payment Verification Service, Occupancy Service, Maintenance Ticketing Service, and Audit Trail Service.  
    4. *Data Persistence Layer (Database):* PostgreSQL 16 (hosted on Supabase) storing normalized relational tables with foreign keys and audit logs.  
    5. *External Integration Layer:* Dedicated modular integration adapter for payment gateways (ready for Adyen GCash integration pending final consultation).

* **41. Identify one Level 1 DFD subprocess in your own system, and the data store or stores it reads from or writes to:**  
  * **Subprocess:** **Process 3.0: Process Billing & Payments** (`FR-011`, `FR-014`, `FR-015`, `FR-016`).  
  * **Data Stores Read:** $D_1$ `Room Catalog` (base rental rates), $D_3$ `Room Assignments` (active occupant headcount), and $D_{11}$ `System Settings` (water rate parameter).  
  * **Data Stores Written:** $D_5$ `Tenant Bills` (issued monthly invoices), $D_6$ `Payments` (payment transaction records), and $D_{10}$ `Audit Logs` (administrative verification events).

* **42. Identify one screen in your own system's UI/UX mockups that required an error-state or empty-state addition during refinement, and describe that addition:**  
  * **Screen:** **Tenant Payment / Billing Screen (`/tenant/payments`)**.  
  * **Refinement Addition:**  
    * *Empty State:* When a tenant has settled all obligations, the view displays a clean card with a checkmark badge, the text *"All Caught Up — No Pending Bills"*, and receipt history, preventing uncertainty about account status.  
    * *Error State:* If an online payment session fails to initiate due to a network interruption, an inline banner appears stating: *"Unable to initialize payment session. Please check your connection or choose on-site cash payment."*

---

## Part III. Analysis and Essay (Items 43 to 47)

* **43. A classmate argues that writing a four-part justification is unnecessary busywork as long as the system works when demonstrated. Analyze this argument using the concepts from this module, and explain what risk their position creates at final defense. (5 to 8 sentences)**  
  > Arguing that a four-part justification is unnecessary busywork misinterprets the fundamental purpose of an academic capstone defense. While a working demonstration shows that software can execute a successful scenario, it does not prove architectural resilience, security controls, or suitability for real-world constraints. At final defense, an unjustified system leaves the team defenseless when panel members question why specific technologies, cryptographic mechanisms, or database structures were selected. Without documenting functionality, security, scalability, and problem alignment, a team cannot substantiate that user permissions are properly guarded, that the design can handle operational workloads, or that it faithfully addresses stakeholder needs. Writing these justifications ensures that every technical decision is deliberate and defendable rather than accidental.

* **44. Compare and contrast a layered (n-tier) architecture and a modular monolith architecture in terms of when each is the more defensible choice for a capstone-scale system. (5 to 8 sentences)**  
  > Layered (n-tier) and modular monolith architectures are both defensible patterns for capstone projects, but they divide responsibilities along different axes. A layered architecture separates the system horizontally by technical function: presentation, business logic, and database persistence. This is the most defensible choice when a small team needs a straightforward, standard structure that cleanly separates frontend views from backend API endpoints. In contrast, a modular monolith organizes the application vertically into distinct business domains—such as billing, maintenance ticketing, and inquiries—while still running as a single unified deployable service. A modular monolith is more defensible when a system contains several loosely coupled functional areas that require clear internal boundaries and domain isolation without the deployment complexity and networking latency of microservices.

* **45. Analyze the relationship between the Design Review Checklist and the traceability practice discussed in this module. Why would a design reviewer specifically check that DFD data stores map to ERD entities, and that ERD entities map back to the panel's original recommendations? (5 to 8 sentences)**  
  > Traceability ensures that every component, process, and data structure in the system is directly accountable to an approved requirement or panel recommendation. A design reviewer verifies that every DFD data store maps to an ERD entity to confirm that process diagrams do not reference "phantom" data stores that have no actual physical database implementation. Similarly, checking that processes map to architecture components confirms that every functional step has a designated software service responsible for executing it. When ERD entities map back to the panel's recommendations, it proves that the team actively resolved the specific feedback given during Capstone 1 rather than building arbitrary or out-of-scope features. This cross-checking ensures that the design is cohesive, verifiable, and academically rigorous.

* **46. Write a complete four-part justification (functionality, security, scalability, and problem alignment) for the single most significant design change your team made to your system after your Capstone 1 defense. (One short paragraph per dimension)**  
  * **Functionality:** In response to the panel's recommendation regarding digital payment options, our team adopted a **Decoupled Modular Payment Architecture**. While the final deployment of Adyen remains subject to pending consultation with our adviser and stakeholder, the design fully implements on-site cash recording (`FR-014`) while providing a clean architectural interface for optional GCash checkout via Adyen (`FR-015`, `FR-016`) without requiring redesign if approved.  
  * **Security:** Isolates external payment API calls and webhook processing strictly on the backend server. No sensitive payment gateway tokens, API credentials, or HMAC secrets are ever exposed to the client-side application, and all financial state modifications require authenticated administrator role access (`requireRole('admin')`).  
  * **Scalability:** By decoupling payment processing into an external adapter, the property's day-to-day operations across 32 units are never held hostage by third-party gateway downtime or API latency. The core application runs efficiently on university infrastructure, with the capacity to handle digital payment spikes if the online gateway is enabled.  
  * **Problem Alignment:** Directly respects the landlady's primary operational preference for in-person cash settlement while addressing the panel's recommendation for student digital payment flexibility, maintaining a clear and stable path forward while consultation is finalized.

* **47. Reflecting on this module as a whole, identify the one artifact (architecture, schema, DFD, or UI/UX) that required the most revision in your own project, and explain, with specific reference to at least one panel recommendation, why that artifact needed the most work. (8 to 10 sentences)**  
  > Reflecting on this module as a whole, the **System Architecture** required the most revision in our project following our Capstone 1 defense. The panel recommended exploring an optional digital payment option for tenants using GCash via Adyen, alongside our existing manual cash recording workflow. Because our team is currently pending consultation with our adviser and stakeholder regarding the final implementation decision, we had to revise our architecture to introduce a decoupled, modular external service layer for payments. This required defining clear system boundaries so that the core application remains fully functional with on-site cash payments, while establishing an isolated adapter ready to integrate Adyen's checkout API and webhook listeners. We also had to ensure that payment credentials remain strictly confined to the backend server and that payment state transitions feed properly into administrative verification. This architectural refinement allowed us to address the panel's recommendation constructively without locking the project into an unconfirmed third-party dependency.

---

# FINAL GROUP REQUIREMENT: PRESENTATION & DEFENSE (Pages 19 to 20)

### Group Identification
* **Group Number:** Group 4  
* **Project / System Title:** Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House  
* **Member 1 (Name & Role):** Sean Jerve Ll. Rebancos (System Architect / Full-Stack Developer)  
* **Member 2 (Name & Role):** John Lloyd M. Cuario (Database Administrator / Data Analyst)  
* **Member 3 (Name & Role):** Eljohn Paulo C. Loterte (Frontend Developer / UI/UX Designer)  
* **Member 4 (Name & Role):** Victor Noel A. Napay (Backend Developer / Integration Engineer)  
* **Member 5 (Name & Role):** Kiel Hedrix V. Relos (Quality Assurance / Systems Analyst)  

### 10 to 15 Minute Presentation Outline
1. **Introduction & Problem Recap (1 min):** Present Hivelet's core purpose for Fe Galang Da Silva Boarding House—replacing manual paper ledgers, cash envelopes, and informal Messenger tracking with a centralized management web application.  
2. **Panel Recommendations Recap (1 to 2 mins):** State the key recommendation from Capstone 1: exploring an optional online GCash payment option via Adyen API alongside manual cash payment tracking (noting the current pending consultation status).  
3. **Finalized Architecture (2 mins):** Present the Layered Client-Server Architecture (Modular Monolith) with Vue 3, Express.js, PostgreSQL/Supabase, and the decoupled modular payment adapter.  
4. **Finalized Database Schema (2 mins):** Walk through the Crow's Foot ERD, highlighting the `payments`, `bills`, `rooms`, and `tenant_profiles` entities and the attributes that support both cash and digital payment tracking.  
5. **Finalized Process & Data Flow Diagrams (2 mins):** Walk through Level 1 DFD Process 3.0 (Billing & Payment processing), demonstrating how billing calculations and payments flow into the system.  
6. **Design Justification (2 to 3 mins):** Deliver the four-part defense (Functionality, Security, Scalability, Problem Alignment) for the decoupled payment architecture.  
7. **Q&A Defense (2 to 3 mins):** Address questions from the instructor referencing the system requirements (`FR-001` to `FR-044`) and architectural boundaries.
