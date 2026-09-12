# HIVELET: DEEP TECHNICAL ARCHITECTURE & DATABASE ANALYSIS
## Comprehensive Engineering Documentation for Capstone 2 Defense (Items 3 & 4)

**Project Title:** Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House  
**Authors:** John Lloyd M. Cuario, Eljohn Paulo C. Loterte, Victor Noel A. Napay, Sean Jerve Ll. Rebancos, Kiel Hedrix V. Relos  
**Adviser:** Dr. Jayvee Christopher Vibar  
**Panel Committee:** Dr. Aris J. Ordonez (Chairman), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho  
**Academic Institution:** Bicol University College of Science (BUCS), Department of Computer Science & Information Technology  

---

## 1. ARCHITECTURAL ANALYSIS & SYSTEM TRADEOFFS (Item 3)

### 1.1 Architectural Pattern: Layered Modular Monolith with Pluggable Gateway Adapter
Hivelet implements a **Layered Client-Server Architecture Structured as a Modular Monolith**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        4-TIER MODULAR MONOLITH ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. PRESENTATION LAYER (Vue 3 SPA + Vite PWA Workbox Plugin)                           │
│    • Client-side reactive stores (Vue 3 Composition API singletons)                    │
│    • Vue Router with asynchronous Role-Based Access Control (RBAC) guards              │
│    • PWA CacheStorage: read-only statements, unit availability, and contact cards       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. API & SECURITY LAYER (Node.js LTS / Express.js)                                     │
│    • Stateless HMAC-SHA256 JSON Web Token (JWT) bearer authentication                  │
│    • Role authorization middleware: requireRole('admin') vs requireRole('tenant')      │
│    • Express Helmet security headers, CORS origin locking, and centralized ApiError   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. BUSINESS LOGIC LAYER (In-Process Domain Services / Modular Monolith)                │
│    • billingService.ts: Computes move-in anniversary cycles, 200/head water, 50% split │
│    • paymentService.ts: Cash settlement, GCash queue, and Adyen adapter dispatch       │
│    • occupancyService.ts: 33 canonical units, active headcounts, 2% annual review     │
│    • ticketService.ts: Multi-priority maintenance triage and technician dispatch       │
│    • auditService.ts: Append-only ledger modification tracking                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. DATA PERSISTENCE LAYER (PostgreSQL 16 on Supabase)                                 │
│    • 20 Third Normal Form (3NF) relational tables with UUIDv4 surrogate keys           │
│    • ACID transaction atomicity across billing, payments, and income ledgers          │
│    • Partial unique indexes, foreign key ON DELETE RESTRICT constraints, JSONB logs   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. EXTERNAL INTEGRATION ADAPTER (Isolated Service Layer)                               │
│    • adyenService.ts: Decoupled Payment Gateway Adapter (Live API + Mock Simulator)    │
│    • Supabase Storage: Multipart file uploads for room imagery & repair photos         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Engineering Trade-Off: Modular Monolith vs. Microservices
* **Microservices Drawback for Boarding House Operations:**  
  In a microservices architecture, verifying a payment requires updating four separate services: Billing, Payments, Ledger, and Audit. If network partitions occur, the system requires complex distributed two-phase commits or saga orchestrators. If any step fails, bills may show 'Paid' while the landlady's 50% revenue share is lost.
* **Modular Monolith Advantage:**  
  By organizing domain services as modular components inside a single Node.js process sharing a PostgreSQL database, all four updates execute inside an **atomic database transaction (`BEGIN ... COMMIT`)**. The transaction takes less than 50ms and guarantees 100% data consistency without distributed network latency.

### 1.3 Resolution of the Capstone 1 Panel Recommendation
* **The Recommendation:** *"Explore online payment using Adyen."*
* **The Engineering Problem:** Commercial payment aggregators require corporate business registration (SEC/DTI), corporate TIN, and bank merchant underwriting, while deducting transaction percentage fees. A sole-proprietor 32-unit boarding house cannot risk having its primary cash-flow halted by external merchant account underwriting delays.
* **The Implementation (`backend/src/services/adyenService.ts`):**  
  We implemented an **Adapter Pattern**:
  ```typescript
  export class AdyenService {
    isLiveConfigured(): boolean;
    async createCheckoutSession(params: CheckoutSessionParams): Promise<SessionResponse>;
    async createMockCheckoutSession(params: CheckoutSessionParams): Promise<SessionResponse>;
  }
  ```
  * `createMockCheckoutSession` provides a complete **sandbox payment simulator** for academic evaluation, generating mock PSP references and simulating webhook callbacks.
  * The core system operates natively using on-site cash and direct GCash verification today.
  * If live Adyen integration is approved, the live API credentials activate inside `adyenService.ts` with **zero modifications to the core database schema or billing engine**.

---

## 2. DATABASE SCHEMA ANALYSIS & AUDIT (Item 4)

### 2.1 From Proposal to Reality: The Form Field Audit & Migration 004
In our Capstone 1 proposal, the database was described as a basic MySQL schema. During Capstone 2 development, we audited all 15 UI forms and 57 bound input controls (`docs/11_FORM_FIELD_AUDIT.md`) against actual operational workflows. This revealed critical narrative gaps that were resolved in **Migration 004** (`004_form_schema_gaps.sql`).

### 2.2 Table-by-Table Technical Breakdown

#### 1. `payments` Table (Online Payment Resolution)
* **`transaction_reference VARCHAR(150)`**: Designed to store Adyen PSP reference IDs, GCash 13-digit reference numbers, or paper receipt numbers uniformly without vendor-specific tables.
* **`verification_status VARCHAR(50)`**: Enumerated as `'Pending Verification'`, `'Verified'`, or `'Rejected'`. Ensures that digital payments do not mark bills as paid until funds are validated.
* **`payment_source VARCHAR(100)`**: Distinguishes between `'On-Site Office'`, `'Direct GCash'`, and `'Adyen Online'`.
* **Foreign Key Constraints**: `bill_id REFERENCES bills(id) ON DELETE SET NULL`, preserving payment audit trails even if an invoice is voided.

#### 2. `system_settings` Table (Eliminating Magic Numbers)
* Discovered that utility rates were hardcoded in frontend files.
* Created a generic parameter table (`key`, `value`, `value_type`, `label`, `business_rule`):
  * `water_rate_per_occupant`: `200` (`BR-014`)
  * `revenue_share_percent`: `50` (`BR-035`)
  * `grace_period_days`: `7` (`BR-012`)
  * `linda_lf_water_charge`: `400` / `linda_lb_water_charge`: `200` (`BR-040`)
* Allows the administrator to adjust operating parameters without developer redeployment.

#### 3. `room_photos` Table (Partial Unique Index)
* Extracted multi-photo arrays into `room_photos(id, room_id, file_url, caption, is_primary, display_order)`.
* **Database Constraint:**
  ```sql
  CREATE UNIQUE INDEX idx_room_photos_one_primary 
  ON public.room_photos (room_id) 
  WHERE is_primary;
  ```
  Guarantees at the database engine level that no unit can ever have more than one primary catalog thumbnail.

#### 4. `expense_property_allocations` Table (BR-044 Split Allocations)
* A single hardware receipt is often divided across multiple property sections.
* Modeled as a 1:N relationship: `monthly_expense_entries` stores the receipt date, supplier, and category, while `expense_property_allocations` subdivides the monetary total across `Boarding House`, `Main House`, `Front Apartment`, and `Back Apartment`.

#### 5. `room_price_history` Table (BR-048 2% Annual Escalation)
* Decouples rental rates from the active `rooms` table.
* When rent escalates after a tenant's 1-year anniversary, `room_price_history` logs the previous rate, new rate, effective date, and approval reason, ensuring past billing records remain historically accurate.

#### 6. Non-Destructive Ledger Voiding (BR-003)
* Accounting rows are never permanently deleted (`DELETE FROM`).
* Added `voided_at TIMESTAMPTZ`, `voided_by UUID`, and `void_reason TEXT` to `monthly_income_records` and `monthly_expense_entries`.
* Active ledger sums utilize partial filtered indexes (`WHERE voided_at IS NULL`) to maintain sub-50ms query execution times.

---

## 3. MASTER PROMPT FOR CLAUDE PRO GENERATION

Copy and paste the prompt below into Claude Pro along with this document:

```markdown
You are an expert academic software engineering evaluator helping refine oral defense materials for an undergraduate Capstone Project 2 at Bicol University College of Science (BUCS), Department of Computer Science & Information Technology.

PROJECT DETAILS & VERIFIED FACTS:
- Title: Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House
- Authors: John Lloyd M. Cuario, Eljohn Paulo C. Loterte, Victor Noel A. Napay, Sean Jerve Ll. Rebancos, Kiel Hedrix V. Relos
- Adviser: Dr. Jayvee Christopher Vibar
- Panel: Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho
- Setting: Fe Galang Da Silva Boarding House (32 rentable units, Legazpi City / Daraga, Albay)
- Panel Recommendation from Capstone 1: The ONLY major recommendation was to "explore online payment using Adyen."
- Manuscript Scope Delimitation (Chapter 1.4): "the supplementary online payment feature is restricted to basic transaction recording and explicitly excludes advanced financial processing capabilities like automated reconciliation, refunds, or direct banking integration."

CONCRETE TECHNICAL FACTS (FROM AUDITED CODEBASE & SCHEMA):
1. Architecture Pattern: Layered Client-Server Architecture Structured as a Modular Monolith with an Isolated Payment Gateway Adapter.
   - Frontend: Vue 3 (Composition API) SPA + Tailwind CSS + Vite PWA Workbox plugin (caching read-only billing statements and room directory).
   - Backend: Node.js / Express.js with JWT authentication and Role-Based Access Control (RBAC).
   - Service Layer: In-process domain services (billingService, paymentService, occupancyService, ticketService, auditService) sharing ACID database transactions.
   - Payment Adapter: `backend/src/services/adyenService.ts` contains an Adapter Pattern with `createMockCheckoutSession` for sandbox simulation and `createCheckoutSession` for live API calls.
2. Database Schema (PostgreSQL 16 on Supabase):
   - `payments`: `transaction_reference` (stores Adyen PSP or GCash 13-digit ref), `verification_status` ('Pending Verification', 'Verified'), `payment_source`.
   - `monthly_income_records`: Tracks 50% revenue share, ₱200/head water fee, and non-destructive voiding (`voided_at`, `void_reason`).
   - `system_settings`: Key-value table storing dynamic business parameters (water rate = ₱200, grace period = 7 days, revenue share = 50%).
   - `room_photos`: 1:N table with partial unique index `idx_room_photos_one_primary` (WHERE is_primary).
   - `expense_property_allocations`: 1:N split table dividing single receipts across property clusters (BR-044).
   - `room_price_history`: Decoupled price history preserving 2% annual escalation records without overwriting past ledgers.

TASK:
Generate the finalized presentation defense content for Items 3 and 4:
1. Item 3: Finalized Architecture (2-Minute Oral Script + Slide Visual Outline + Technical Justification for Modular Monolith over Microservices, explaining how the pluggable adyenService adapter cleanly resolves the panel's recommendation).
2. Item 4: Finalized Database Schema (2-Minute Oral Script + Slide Visual Outline + Table-by-Table Explanation of what entities, attributes, and indexes changed in response to the Adyen recommendation and operational needfinding).
3. 3 Bulletproof Q&A Responses to anticipate panel grilling regarding online payment fraud, why Adyen is simulated, and how financial consistency is guaranteed.

Tone: Strictly professional, academic, concise, and grounded in real software engineering principles.
```
