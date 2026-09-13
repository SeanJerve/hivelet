# CLAUDE TASK PROMPT 2: DATABASE ARCHITECTURE, 3NF SCHEMA & ERD
## Context: Capstone Project 2 — System Design Refinement & Database Defense
### Target: Bicol University College of Science (BUCS) | Group 4 (DBA: John Lloyd Cuario)

---

> [!IMPORTANT]
> **Reconciled against Phase 1 locked canon on 2026-09-13.**
> This prompt was authored *before* the Phase 1 STEP 0 alignment and originally contradicted the
> settled decisions in five places — "3 clusters", the banned "Main / Annex A / Annex B" names,
> a 2% annual rate escalation, co-ownership framing of `fifty_percent_share`, and the superseded
> `BR-001`–`BR-007` pillar numbering. Those passages are corrected below.
>
> **`docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md` outranks this file.** If anything here still
> disagrees with it, the locked decisions win — report the conflict rather than following this prompt.

---

### ROLE & DIRECTIVES FOR CLAUDE
You are the **Lead Database Administrator & Data Architect** for Group 4 (Hivelet), collaborating directly with DBA John Lloyd Cuario.
Your task is to audit, refine, and produce the comprehensive **Database Architecture, Third Normal Form (3NF) Relational Schema, Data Dictionary, and Crow's Foot Entity-Relationship Diagram (ERD)**.

> [!CAUTION]
> **STRICT FRONTEND PROHIBITION:**
> You are working exclusively on the relational schema, SQL migrations, Supabase RLS policies, seed scripts, and database documentation.
> **DO NOT modify, refactor, or generate frontend files (`frontend/`, `website/`).**

---

### BACKGROUND & SOURCE DOCUMENTS
Before analyzing or generating database artifacts, inspect:
1. `docs/01_SYSTEM_BIBLE.md` (33 rentable units across **5 clusters**, configurable per-occupant water rate seeded at ₱200, room-centric tenancy).
   Note: the System Bible says "32" at `:146`; the live seed has 33. The count is an errata item, already settled at **33**.
2. `docs/05_DATABASE_DESIGN.md` (Active schema documentation).
3. `docs/module_01_submission/03_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md` (Detailed data dictionary and schema breakdown).
4. `database/` directory (Active SQL schema, migrations, and seed scripts).
5. `docs/claude_pipeline/outputs/PHASE1_DFD_TRACEABILITY.md` — Phase 1 modernized the legacy lab DFD into **7 processes and 12 data stores** (the legacy `DFD.png` showed 5 and 6). Reconcile against the Phase 1 store list, not the lab images, and ensure every store is backed by concrete physical tables.

---

### REQUIRED TASKS FOR CLAUDE

#### 0. Pre-Generation Clarification & Alignment Check (MANDATORY)
> [!IMPORTANT]
> **STOP AND ASK FIRST IF UNCLEAR:**
> Before outputting the final ERD or Data Dictionary:
> - Review all entity definitions, cardinalities, foreign key cascades, and column types.
> - If any relationship, constraint, dynamic parameter (such as water rates or payment references), or attribute is ambiguous or not yet finalized, **initiate a conversation with John Lloyd Cuario (DBA) / the user first**.
> - Outline the questions, suggest standard database modeling options, and obtain alignment before finalizing the ERD or writing schema migrations.

#### 1. 3NF Normalization Audit & Verification
Formally demonstrate that the 20 relational tables satisfy **Third Normal Form (3NF)**:
* **1NF:** All attributes contain atomic scalar values (no repeating groups or multi-valued columns).
* **2NF:** All non-key attributes are fully functionally dependent on the primary key (no partial dependencies on composite keys).
* **3NF:** No non-key attribute is transitively dependent on another non-key attribute (e.g., remaining billing balances or 50% revenue shares are computed via atomic services or dynamic queries rather than stored redundantly).

#### 2. Crow's Foot Entity-Relationship Diagram (ERD) in Mermaid
Generate or update the comprehensive Crow's Foot ERD using Mermaid syntax (`erDiagram`).
Ensure the ERD captures:
1. **Core Domains:**
   - **Identity & RBAC:** `profiles` (Admin, Tenant, System roles, bcrypt hash, failed login lockout).
   - **Property Catalog & Clusters:** `clusters` (**BH (Main Rooms) 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2**), `rooms` (33 units across three residential floors plus a rooftop penthouse level — 11 / 11 / 10 / 1), `room_photos`, `room_price_history` (manual rate changes with effective date and the administrator who made them).
     ⚠ "Main Building / Annex A / Annex B" are **not** cluster names and must never appear. In the family's usage "Annex" denotes a *floor*.
   - **Tenancy & Leases:** `room_assignments` (active/past leases, move-in/move-out dates, headcount).
   - **Inquiries:** `inquiries`, `inquiry_messages` (public visitor leads, unit preferences, status).
   - **Billing & Settlement:** `bills` (rent + dynamic water charge), `payments` (supports on-site cash and optional Adyen Online GCash, `verification_status` ENUM ('Pending Verification', 'Verified', 'Rejected'), `transaction_reference`, `payment_method`, `payment_source`, `proof_receipt_url`).
   - **Income & Expense Ledgers:** `monthly_income_records` (gross, expenses, net income, `fifty_percent_share`, water payments, Linda water charges), `fixed_expense_categories` (13 seeded rows incl. `6a`/`6b`/`6c` sub-lines), `monthly_expense_entries`, `expense_property_allocations`.
     ⚠ **Editorial constraint (binding).** `fifty_percent_share` is described **only** as a system-computed figure equal to half the row's Rent Amount, retained so the ledger reconciles line-for-line with Column 6 of the historical spreadsheet. Do **not** model a co-owner/owner/party entity; do **not** use "co-ownership", "co-owner" or "50/50"; do **not** state or imply any purpose, recipient or external use. State the arithmetic and stop.
   - **Maintenance Operations:** `maintenance_tickets` (priority, status, assigned technician), `ticket_attachments`, `ticket_messages`.
   - **Governance & Dynamic Parameters:** `audit_logs` (immutable event ledger with JSONB state diffs), `system_settings` (dynamic `water_rate_per_occupant` configurable parameter, plus Linda flat rates `linda_lf_water_charge` and `linda_lb_water_charge`).
2. **Exact Crow's Foot Cardinalities:**
   - `||--o{` (One-to-zero-or-many)
   - `||--|{` (One-to-one-or-many)
   - `||--||` (One-to-one)
3. **Primary & Foreign Key Definitions:**
   - Surrogate UUID primary keys (`PK`).
   - Explicit Foreign Keys (`FK`) with defined cascade behaviors (`ON DELETE RESTRICT` for ledgers/bills/payments to prevent accidental deletion of financial history; `ON DELETE CASCADE` for transient photos/attachments).

#### 3. Data Dictionary & Attribute Specifications
Provide the formal data dictionary table for key entities (`rooms`, `bills`, `payments`, `monthly_income_records`, `audit_logs`):
- Field Name
- Data Type & Precision (e.g., `UUID`, `VARCHAR(255)`, `DECIMAL(12,2)`, `TIMESTAMPTZ`, `JSONB`)
- Nullability & Defaults
- Constraints (`CHECK`, `UNIQUE`, `FOREIGN KEY`)
- Business Description & canonical rule reference. The authoritative namespace is `docs/02_BUSINESS_RULES.md` (**BR-001 … BR-049**). The seven pipeline pillars are **ARCH-001 … ARCH-007** and are never cited with a `BR-` prefix.

#### 4. Security & RLS Policy Enforcement
Document the database security posture:
- Supabase Row Level Security (RLS) policies ensuring public `anon` key is strictly locked out.
- Express backend accesses data exclusively via `service_role` under strict application-level RBAC.

---

### DELIVERABLE FORMAT
Output your findings with:
1. Complete, copy-pasteable Mermaid `erDiagram` code block.
2. Formatted Markdown tables for the Data Dictionary.
3. 3NF normalization proofs and cardinalities explained in clear academic prose suitable for capstone defense.
