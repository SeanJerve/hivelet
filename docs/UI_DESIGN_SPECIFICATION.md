# HIVELET FUNCTIONAL UI & DESIGN SPECIFICATION

> **Notice:** Detailed implementation guidelines, tri-inspiration synthesis (Jira + Notion + Airtable), non-techy landlady guidelines, and universal state feedback standards are maintained in [UI_DESIGN_SYSTEM_GUIDELINES.md](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/docs/UI_DESIGN_SYSTEM_GUIDELINES.md).

## 1. UI Architecture & Design System

**System Name:** Hivelet  
**Target Property:** Fe Galang Da Silva Boarding House (3 Floors, 32 Total Units)  
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
2. **Business Rule Inline Comments:** Business rules (e.g., 50% revenue share derivation, ₱200/head water billing rule, 2% annual price increase history, room-centric occupancy model) MUST be explicitly commented inline wherever calculations or state transitions occur.

---

## 3. Core Sidebar Menu & Workspace Modules

| Module ID | Title | Purpose & System Bible Alignment | Primary Component Specs |
| :--- | :--- | :--- | :--- |
| `overview` | **Executive Overview** | Section 2 & 5.1: Actionable daily dashboard answering "What money came in/went out?" | KPI Summary Cards, Overdue Attention Alerts, 32-Room Visual Matrix (3 Floors: 101-110, 201-210, 301-312). |
| `directory` | **Room Directory** | Section 5.2: Room-centric occupancy & pricing model | Operational status filters, base/current price editor modal, price history tracking (2% annual rule). |
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
