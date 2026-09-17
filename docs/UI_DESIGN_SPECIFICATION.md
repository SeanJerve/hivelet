# HIVELET FUNCTIONAL UI & DESIGN SPECIFICATION

> [!CAUTION]
> **Replaced on 2026-09-18 by [DESIGN_GUIDELINE.md](DESIGN_GUIDELINE.md).** The visual rules below
> describe the look being retired and are kept as a record. The sidebar module list and role
> workspaces further down still describe the product.

> **Notice:** Detailed implementation guidelines, tri-inspiration synthesis (Jira + Notion + Airtable), non-techy landlady guidelines, and universal state feedback standards are maintained in [UI_DESIGN_SYSTEM_GUIDELINES.md](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/docs/UI_DESIGN_SYSTEM_GUIDELINES.md).

## 1. UI Architecture & Design System

**System Name:** Hivelet  
**Target Property:** Fe Galang Da Silva Boarding House (3 residential floors plus a rooftop penthouse level, **33** total units)  
**Design Theme:** Minimalist Corporate Workspace (Jira + Notion + Airtable Tri-Inspiration)  
**Primary Aesthetic Principles:**
- **Canvas:** Subtle neutral slate-gray background (`#f4f5f7`).
- **Cards & Surfaces:** Clean white container surfaces (`#ffffff`) with subtle 1px slate borders (`#dfe1e6`).
- **Typography:**
  - **Headings & Word Titles:** Plus Jakarta Sans (`.font-display`) for bold, modern headings.
  - **Metrics, Currency, & Numbers:** JetBrains Mono (`.font-mono-num`) with tabular numerals for amounts, counters, unit codes, and statistics.
  - **Body Text:** Clean slate text (`#172b4d`) with neutral subtext (`#6b778c`).
- **Accents:** Atlassian Corporate Blue (`#0c66e4`) for primary action buttons, active navigation states, and key focal points.
- **Grids & Ledgers:** Airtable-inspired dense data tables with sticky headers and summary calculation footers.
- **Strictly No Emojis / No Flashy Elements:** SVG/Lucide icons strictly replace emojis across all views.
- **Mobile-First & Responsive Mandate:** Every component must adapt to mobile breakpoints (`sm`, `md`, `lg`), utilizing slide-over navigation drawers, stacked card layouts, and horizontal table scrolling on small viewports.


---

## 2. Mandatory Academic AI Code Documentation Standard

To comply with strict academic software review policies regarding AI-assisted development:

1. **Structured Component Headers:** Every Vue component (`.vue`) and TypeScript utility (`.ts`) MUST include an explicit top comment header detailing:
   ```typescript
   /**
    * @component [Component Name]
    * @description [Detailed functional purpose]
    * @systemBibleRef [System Bible section, e.g., Section 5.3 - Financial Calculations]
    * @rationale [Architectural rationale for component structure & design]
    * @innovations [Custom logic, UI adaptations, or algorithms tailored for Hivelet]
    */
   ```
2. **Business Rule Inline Comments:** Business rules (e.g., the `fifty_percent_share` derivation — a system-computed figure equal to half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet; the ₱200/head water billing rule; the rate-change history in `room_price_history`; the room-centric occupancy model) MUST be explicitly commented inline wherever calculations or state transitions occur.
   - **Retired framings — do not reintroduce.** No rate escalation exists anywhere: the owner sets rates by hand and only the change history is kept. Describe `fifty_percent_share` by its arithmetic alone — never name a party, recipient, purpose or destination for it.

---

## 3. Core Sidebar Menu & Workspace Modules

| Module ID | Title | Purpose & System Bible Alignment | Primary Component Specs |
| :--- | :--- | :--- | :--- |
| `overview` | **Executive Overview** | Section 2 & 5.1: Actionable daily dashboard answering "What money came in/went out?" | KPI Summary Cards, Overdue Attention Alerts, 33-Unit Visual Matrix (5 clusters — BH, Back Apartment, Front Apartment, Linda, Penthouse — over 4 floors holding 11 / 11 / 10 / 1 units). |
| `directory` | **Room Directory** | Section 5.2: Room-centric occupancy & pricing model | Operational status filters, base/current price editor modal, price history tracking (every manual change preserved in `room_price_history`; there is no automatic adjustment). |
| `tenants` | **Tenant Management** | Section 5.3: Active tenant directory & emergency contacts | Onboarding move-in dates, emergency contact cards, active room assignment links. |
| `inquiries` | **Inquiry Inbox** | Section 5.4: Centralized prospect inquiries | Public inquiry submission tracking, prospect contact cards, landlady messaging inbox. |
| `billing` | **Billing & Income** | Section 5.5 & 09_REPORT: Financial collections & receipts | Record Monthly Payment form, Invoice # generator, 50% Share derivation, Collection Ledger. |
| `expenses` | **Expenses Ledger** | Section 5.6 & 10_REPORT: Operational outgoing expenses | Multi-supplier expense recording form with date-grouped supplier tables. |
| `tickets` | **Maintenance Dispatch**| Section 5.7: Dispatch & closure authorization | Priority badges (Emergency/High/Medium), Detail hover pop-over modal (`details-modal`), in-place closure status transition. |
| `audit` | **System Audit Logs** | Section 5.8: Immutable audit history | Server health diagnostics, activity logs, system role permissions inspector. |

---

## 4. Role Switcher Workspaces

The application shell provides a top header bar allowing quick switching between three authentic system perspectives:
1. **Admin / Landlady Workspace (`admin`):** Full operational, financial, and management workspace.
2. **Tenant Portal (`tenant`):** Self-service portal for active tenants (Room info, ₱200/head water & rent bill breakdown, ticket submission).
3. **Public Guest Portal (`public`):** Public property catalog, room availability grid, and direct inquiry form for prospective tenants.
