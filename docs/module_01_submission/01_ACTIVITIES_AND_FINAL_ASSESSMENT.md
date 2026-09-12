# BUCS IT DEPARTMENT | IT 124: CAPSTONE PROJECT 2
## MODULE 01: CONCEPT REVIEW & DESIGN REFINEMENT
### Official Activity Worksheets & Final Assessment Answer Key

**Project Title:** Hivelet: A Web-Based Boarding House Management and Financial Operations System  
**Target Property:** Fe Galang Da Silva Boarding House, Legazpi City  
**Group Number:** [Insert Your Group Number]  

---

## LEARNING ACTIVITIES

### Activity 1: Knowledge and Comprehension Check (Items 1 to 8)

#### Items 1 to 5: Matching Type
* **1. Layered (n-tier) architecture** — **B** (An architectural pattern that separates presentation, business logic, and data into distinct layers.)
* **2. Crow's Foot notation** — **D** (A notation that expresses the cardinality of a relationship directly on the connecting line between two entities.)
* **3. Context Diagram (Level 0)** — **E** (A diagram that represents the entire system as a single process, showing only its boundary and external entities.)
* **4. Third Normal Form (3NF)** — **A** (A normalization standard requiring no repeating groups, no partial dependency on part of a composite key, and no transitive dependency between non-key attributes.)
* **5. Modular monolith** — **C** (A single deployable application with clearly separated internal modules, often the middle ground between a layered design and true microservices.)

#### Items 6 to 8: True or False
* **6. FALSE** — A capstone team should not default to a microservices architecture simply to demonstrate technical complexity. Microservices introduce distributed transaction overhead, network latency, and operational deployment challenges that are inappropriate for capstone-scale systems.
* **7. TRUE** — In relational database modeling, foreign keys are always placed within the entity on the "many" side of a one-to-many relationship.
* **8. FALSE** — High-fidelity design refinement requires defining edge cases, loading skeletons, error states, empty states, and confirmation dialogs; happy-path mockups alone are insufficient for validation.

---

### Activity 2: Guided Application Worksheet (Items 9 to 14)

**Scenario Analysis (Items 9 to 11):**
*A proposal panel tells a team: "Your data model has no way to track whether a submitted request was approved, denied, or is still pending."*

* **9. Schema-refinement checklist item & new schema element:**
  * *Checklist Item:* **Attribute definition** (specifically, missing status and audit timestamp fields).
  * *New Schema Element:* A `status` attribute (e.g., `status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED'))`) paired with an audit timestamp attribute `status_updated_at TIMESTAMPTZ`.

* **10. Cardinality and participation statement:**
  * *"An **Applicant** may have **zero or many Requests**, and a **Request** must belong to **exactly one Applicant**."*

* **11. Architectural patterns & capstone-appropriate justification:**
  * *Pattern A: Layered (n-tier) Architecture.* A capstone team selects this pattern to enforce a clear physical and logical separation between user interface components, server controllers/business logic, and relational database queries, enabling individual team members to work concurrently on frontend and backend code without code conflicts.
  * *Pattern B: Modular Monolith.* A capstone team selects this pattern when their system contains distinct functional domains (such as billing, inquiry handling, and maintenance ticketing) that require strict internal module boundaries, but the team wishes to deploy a single unified application rather than managing distributed network services.

**Application to Own Capstone Project — Hivelet (Items 12 to 14):**

* **12. Panel recommendation from Capstone 1 defense:**
  * *"The panel recommended exploring an online payment integration (specifically evaluating Adyen for GCash payments). Because commercial transaction fees and legal merchant registration terms are currently pending final consultation with our adviser and property stakeholder (Mrs. Fe Galang Da Silva), our team was instructed to ensure the system architecture and database do not become rigidly dependent on an unconfirmed external service."*

* **13. Corresponding schema-refinement checklist item:**
  * **Attribute definition** (generic payment attributes) and **Architecture modularity / referential integrity**.

* **14. Specific schema/architecture change made in response:**
  * *Change:* We designed a **Decoupled / Pluggable Modular Payment Architecture**. In the database schema, we structured the `payments` table generically (`amount`, `payment_method`, `payment_source`, `transaction_reference`, `verification_status`) so it natively supports our confirmed on-site cash collections and direct GCash receipts today, while already possessing the exact schema fields needed if automated Adyen integration is approved during consultation. In the architecture, we decoupled payment processing into an external adapter interface (`EXT_GCASH` / `adyenService.ts` sandbox simulator), ensuring that if consultation approves live Adyen, it plugs in seamlessly, whereas if consultation defers it, the core billing engine and database remain completely operational without breaking.

---

### Activity 3: Analysis and Synthesis Task (Items 15 to 17)

* **15. Analysis of always-online client-server architecture in a low-connectivity barangay hall:**
  * *Functionality Risks:* When the internet connection fails, all core municipal services halt immediately. Administrative staff cannot issue barangay clearances, verify resident records, or record dispute blotters, resulting in operational paralysis and backlogs of unrecorded paper notes.
  * *Usability Risks:* Users face unhandled HTTP network timeouts (e.g., 504 Gateway Timeout), silent form submission failures, and loss of lengthy encoded text fields. This induces high cognitive frustration, degrades user confidence in the software, and forces personnel to abandon the digital platform in favor of manual record-keeping.

* **16. Four-part justification for one major design decision in Hivelet:**
  * *Design Decision:* Implementing a **Decoupled / Pluggable Modular Payment Architecture Pending Consultation** (handling on-site cash and direct GCash receipts immediately, while remaining architecturally ready to plug into an automated payment gateway like Adyen once stakeholder consultation is finalized).
  * *Functionality:* Fully supports requirements `FR-011` (Billing), `FR-014` (Manual payments), `FR-015` (Online payments), and `FR-016` (Payment verification). The schema natively supports the primary on-site cash and direct GCash verification workflows, while containing the exact data attributes (`transaction_reference`, `payment_method`, `verification_status`) required if automated gateway checkout is enabled post-consultation.
  * *Security:* Isolates external payment processing logic into an independent backend adapter layer (`adyenService.ts` / `EXT_GCASH`), preventing sensitive third-party API keys or webhook secrets from being exposed on the client application. State transitions from `Pending Verification` to `Verified` are strictly enforced by server RBAC middleware, and every financial operation is logged in an append-only `audit_logs` table.
  * *Scalability:* Protects the system from premature vendor lock-in. A micro-scale boarding house (32 units) faces substantial percentage deductions and complex legal registration with commercial aggregators; our decoupled architecture handles peak monthly billing efficiently with sub-50ms indexed database queries, allowing the stakeholders to decide whether to activate gateway fees without having to refactor the core system.
  * *Problem Alignment:* Directly addresses the primary problem from our Capstone 1 proposal: eliminating paper notebook errors, lost cash envelopes, and unorganized Messenger receipts by establishing an audit-ready digital ledger, while maintaining technical flexibility as final stakeholder consultation concludes.

* **17. UI/UX usability heuristic refinement:**
  * *Heuristic:* **Error prevention (Heuristic 5)** and **User control and freedom (Heuristic 3)**.
  * *Specific Change:* In earlier billing wireframes, clicking a payment settlement action immediately modified database records. In the refined design, we introduced a dedicated **Confirmation Dialog Modal** (`ConfirmModal.vue`). Before any payment is verified, bill marked paid, or ledger entry voided, the administrator must review an itemized transaction summary (Tenant Name, Room, Amount, Reference Number) and explicitly confirm the action, preventing accidental financial record corruption.

---

## FINAL ASSESSMENT

### Part I. Objective (Items 18 to 32)

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
  **Answer: DBML (Database Markup Language) / Mermaid**
* **29.** The single deployable application with clearly separated internal modules, often the middle ground between a layered design and true microservices:  
  **Answer: Modular monolith**
* **30.** The type of key placed on the many side of a one-to-many relationship:  
  **Answer: Foreign key**
* **31.** The stage of UI/UX refinement where error states, empty states, and confirmation dialogs must be designed, not just the happy path:  
  **Answer: High-fidelity mockup refinement**
* **32.** The four dimensions used to justify a design decision in this module:  
  **Answer: Functionality, Security, Scalability, and Problem alignment**

---

### Answer Sheet, Part I (Official Summary Table)

| Item No. | Final Answer | Item No. | Final Answer |
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

### Part II. Application (Items 33 to 42)

**Cooperative Loan Scenario Analysis (Items 33 to 38):**
*Recommendation 1: Schema lacks repayment tracking over time.*  
*Recommendation 2: Architecture lacks offline resilience during loan encoding.*  
*Recommendation 3: Mockups do not depict members with multiple active loans.*

* **33. New Entity for Recommendation 1:**  
  **Proposed Entity Name:** `LoanRepayment`

| Attribute | Data Type | Constraint |
| :--- | :--- | :--- |
| `repayment_id` | `UUID` | PRIMARY KEY |
| `loan_id` | `UUID` | FOREIGN KEY REFERENCES Loan(loan_id) ON DELETE RESTRICT |
| `amount_paid` | `DECIMAL(10, 2)` | NOT NULL, CHECK (amount_paid > 0) |
| `payment_date` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `status` | `VARCHAR(20)` | NOT NULL, CHECK (status IN ('PENDING', 'POSTED', 'OVERDUE')) |

* **34. Cardinality and participation statement for new entity:**  
  *"A **Member** may have **zero or many LoanRepayments**, and a **LoanRepayment** must belong to **exactly one Member** (associated through their active Loan contract)."*

* **35. Architectural revision for Recommendation 2:**  
  Implement a **Client-side Offline Queue using a Service Worker and IndexedDB (Progressive Web Application pattern)**. When network loss is detected via browser connectivity listeners, the application intercepts the encoded loan application payload and persists it to local client storage. Upon reconnection, an asynchronous background sync worker transmits the queued payloads to the backend API layer for validation and database commit.

* **36. Step-by-step component sequence for Item 35:**  
  1. **Client Form UI:** Captures user input fields and checks `navigator.onLine`.  
  2. **Client Offline Storage (IndexedDB):** Serializes the unsubmitted form payload into an outgoing pending sync queue and displays an offline status badge.  
  3. **Network Listener Service Worker:** Detects the browser `online` event when connectivity is restored.  
  4. **API Client (Axios):** Deserializes the queued loan payloads and issues an authenticated HTTP POST request to the server API router.  
  5. **Backend Business Logic Layer:** Validates data constraints and credit rules.  
  6. **Database Persistence Layer:** Executes a database transaction persisting the loan record.  
  7. **Backend Controller:** Returns HTTP 201 Created, signaling the client to clear the local queue and display a synchronization confirmation banner.

* **37. UI/UX refinement for Recommendation 3:**  
  Implement a **Master-Detail Collapsible Card List** on the Member profile view. When an officer opens a member record, the screen renders an active loan metric badge (e.g., `"Active Loans: 2"`) with expandable accordion cards for each loan displaying Loan ID, approved principal, current balance, and due dates, allowing the officer to expand individual loans without navigating away.  
  *Heuristic:* **Recognition rather than recall (Heuristic 6)** and **Flexibility and efficiency of use (Heuristic 7)**.

* **38. Normalization check for Item 33 entity:**  
  *Check:* **Third Normal Form (3NF)**.  
  *Verification:* This check verifies that all non-key attributes (`amount_paid`, `payment_date`, `status`) are functionally dependent solely on the primary key `repayment_id` and have no transitive dependencies on other non-key fields, ensuring derived values (such as remaining balance) are calculated dynamically rather than stored redundantly.

---

**Application to Own Capstone Project — Hivelet (Items 39 to 42):**

* **39. Primary key and foreign keys for one finalized ERD entity:**  
  **Entity:** `payments`

| Key Type | Field Name | References |
| :--- | :--- | :--- |
| **Primary Key** | `id` | Unique UUID surrogate identifier |
| **Foreign Key 1** | `bill_id` | `bills(id)` ON DELETE SET NULL |
| **Foreign Key 2** | `tenant_profile_id` | `profiles(id)` ON DELETE CASCADE |
| **Foreign Key 3** | `room_id` | `rooms(id)` ON DELETE CASCADE |

* **40. Finalized architectural pattern and major components:**  
  *Pattern:* **Layered Client-Server Architecture Structured as a Modular Monolith**.  
  *Major Components:*  
  1. *Presentation Layer (Frontend):* Vue 3 Single Page Application, Tailwind CSS design system, Vue Router with navigation guards, and PWA Service Worker caching.  
  2. *API & Security Layer:* Node.js with Express.js REST route controllers, input sanitization, and JWT Role-Based Access Control (RBAC) middleware.  
  3. *Business Logic & Service Layer:* Billing Service (calculating ₱200/head water and 50% revenue share), Payment Verification Service, Occupancy Service, and Audit Trail Service.  
  4. *Data Persistence Layer:* PostgreSQL 16 relational database enforcing foreign key integrity, check constraints, and immutable audit logs.

* **41. Level 1 DFD subprocess and data stores:**  
  *Subprocess:* **Process 3.0: Process Billing & Payments** (`FR-011`, `FR-014`, `FR-016`).  
  *Data Stores Read:* $D_1$ `Room Catalog` (base rental rates), $D_3$ `Room Assignments` (active occupant headcount), and $D_{11}$ `System Parameters` (₱200/head water rate).  
  *Data Stores Written:* $D_5$ `Tenant Bills` (monthly invoices), $D_6$ `Payment Records` (payment amounts and GCash reference numbers), $D_7$ `Monthly Income Ledger` (settled revenue and 50% shares), and $D_{10}$ `Audit Logs` (verification events).

* **42. Screen requiring error-state or empty-state addition:**  
  *Screen:* **Maintenance Dispatch Management View (`/admin/tickets` and `/tenant/tickets`)**.  
  *Refinement Addition:*  
  * *Empty State:* When no unresolved tickets exist, the screen displays a centered card with a wrench icon, the title *"All Units Operational — No Active Maintenance Tickets"*, and an action button *"+ Submit Maintenance Request"*, preventing user uncertainty.  
  * *Error State:* When a tenant attempts to upload an unsupported file type or an image exceeding 5MB, an inline red banner appears below the upload input stating: *"Invalid file. Photo must be a JPEG or PNG image under 5MB in size."*

---

### Part III. Analysis and Essay (Items 43 to 47)

#### Item 43: Analyzing the argument that four-part justification is unnecessary busywork (5 to 8 sentences)
> Arguing that a four-part justification is unnecessary busywork misinterprets the fundamental nature of software engineering. While a working demonstration proves that code can execute under ideal conditions, it reveals nothing about architectural resilience, data integrity, or edge-case handling. At final defense, an unjustified system leaves the team completely defenseless when panel members probe why specific architectural patterns, cryptographic algorithms, or database constraints were selected. Without documenting functionality, security, scalability, and problem alignment, teams cannot prove their system is secure against unauthorized role elevation, capable of handling peak transaction volumes, or aligned with stakeholder needs. Writing these justifications forces deliberate engineering trade-offs during design rather than relying on accidental, unvalidated implementations.

#### Item 44: Comparing Layered (n-tier) vs. Modular Monolith for capstone-scale systems (5 to 8 sentences)
> Layered (n-tier) and modular monolith architectures are both well-suited for capstone-scale systems, but they organize complexity along different structural axes. A layered architecture separates the system horizontally by technical concern: presentation, business logic, and data storage. This pattern is most defensible when a small team requires a clear, intuitive separation between frontend user interfaces and backend API routes. In contrast, a modular monolith organizes the backend vertically by functional business domain—such as billing, inquiries, and maintenance—while retaining a single unified deployable codebase. A modular monolith becomes the more defensible choice when a system contains distinct operational domains with complex, domain-specific business rules that require strict module boundaries without the operational overhead and distributed transaction complexity of microservices.

#### Item 45: Relationship between the Design Review Checklist and traceability practice (5 to 8 sentences)
> Traceability ensures that every component, process, and data structure in the system can be tracked directly back to an approved functional requirement and panel recommendation. A design reviewer systematically checks that every DFD data store maps to an ERD entity to confirm that no "phantom data stores" exist in process diagrams without physical database representations. Similarly, verifying that every process maps to an architecture component ensures that every functional transformation has a designated software layer responsible for executing it. When ERD entities map back to panel recommendations, it verifies that the team directly solved the critique raised in Capstone 1 rather than introducing unrelated features. This rigorous cross-checking eliminates orphaned schema elements and proves disciplined academic engineering.

#### Item 46: Four-part justification for the single most significant design change in Hivelet
* **Functionality:** In response to panel recommendations to evaluate online payment integration (specifically Adyen for GCash), Hivelet designed a **Decoupled / Pluggable Modular Payment Architecture Pending Consultation**. The database schema's `payments` table was defined with generic attributes (`payment_method`, `amount`, `transaction_reference`, `verification_status`) so it fully satisfies requirements `FR-011`, `FR-014`, `FR-015`, and `FR-016` by supporting on-site cash collections and direct GCash receipts immediately, while remaining ready to handle automated gateway callbacks without schema modifications.
* **Security:** Rather than coupling external merchant credentials into client code or core services, the payment integration logic is isolated inside a backend service adapter (`adyenService.ts` / `EXT_GCASH`). All financial validations, 50% revenue share splits, and payment status updates are executed server-side via Express RBAC middleware (`requireRole('admin')`), and all mutations are captured permanently in an immutable `audit_logs` table.
* **Scalability:** The decoupled architecture prevents premature technical lock-in and protects the boarding house (32 units) from unsustainable percentage transaction fees. By keeping the core billing engine independent from external APIs, peak monthly billing cycles execute with sub-50ms indexed database queries, allowing the property stakeholder to decide whether to activate automated gateway fees following consultation without risking system failure.
* **Problem Alignment:** Directly solves the primary operational pain point identified in our Capstone 1 proposal: eliminating unorganized paper receipt stubs, misplaced cash envelopes, and scattered Facebook Messenger payment screenshots. By centralizing payment proof and automating ledger synchronization, it gives the landlady full audit control over property cash flow while maintaining technical agility as final stakeholder consultation concludes.

#### Item 47: Reflection on the artifact requiring the most revision in Hivelet (8 to 10 sentences)
> Reflecting on this module as a whole, the **Database Schema (ERD)** required the most extensive revision in our project following our Capstone 1 defense. The panel originally noted that our proposal data model lacked historical rate tracking, failed to formalize the ₱200/head water billing calculation, and lacked auditability for payment verification. To resolve these gaps, we restructured the schema into Third Normal Form (3NF) by decoupling room definitions from rental rate changes into a dedicated `room_price_history` entity, preserving the property's 2% annual increase rule without overwriting historical data. We also refined the `bills` and `payments` entities with explicit foreign key relationships and status enumerations (`Pending Verification`, `Verified`), enforcing referential integrity via `ON DELETE RESTRICT` to prevent accidental financial ledger deletion. Furthermore, an immutable `audit_logs` entity was introduced to capture all ledger modifications. These revisions transformed a basic proposal schema into an academically defensible, audit-ready operational database.
