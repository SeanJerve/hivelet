# BUCS IT DEPARTMENT | IT 124: CAPSTONE PROJECT 2
## MODULE 01: UI/UX DESIGN REFINEMENT SPECIFICATION
### Design Tokens, Nielsen's Heuristics Audit, Screen States, and End-User Walkthrough

**Project Title:** Hivelet: A Web-Based Boarding House Management and Financial Operations System  
**Target Property:** Fe Galang Da Silva Boarding House, Legazpi City  
**Group Number:** [Insert Your Group Number]  

---

## 1. Design System Architecture & Design Tokens

Hivelet implements a **Jira-Inspired Minimalist Corporate Aesthetic** designed specifically for high operational clarity, dense financial reporting, and zero cognitive clutter for a non-technical property administrator.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HIVELET DESIGN TOKENS                                  │
├──────────────────────┬─────────────────────────┬───────────────────────────────────────┤
│ Design Token         │ Hex / CSS Value         │ Architectural Rationale               │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Canvas Surface       │ #f4f5f7 (Neutral Slate) │ Reduces eye strain during multi-hour  │
│                      │                         │ financial reconciliation sessions.    │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Container Surfaces   │ #ffffff (Pure White)    │ Elevated, crisp card and table bodies │
│                      │                         │ providing high figure legibility.     │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Structural Dividers  │ #dfe1e6 (Subtle Slate)  │ 1px clean separation lines replacing  │
│                      │                         │ heavy shadows and visual clutter.     │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Primary Action       │ #0c66e4 (Corporate Blue)│ Atlassian primary action blue used for│
│                      │                         │ focal buttons and active nav links.   │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Primary Typography   │ #172b4d (Deep Slate)    │ Meets WCAG AAA 7:1 contrast ratio     │
│                      │                         │ standards on white container surfaces.│
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Metadata Subtext     │ #6b778c (Muted Slate)   │ Used for timestamps, helper text, and │
│                      │                         │ table column header labels.           │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Numeric & Financial  │ JetBrains Mono          │ Tabular monospaced numerals prevent   │
│ Typography           │ (.font-mono-num)        │ decimal drift in financial tables.    │
├──────────────────────┼─────────────────────────┼───────────────────────────────────────┤
│ Iconography Engine   │ Lucide-Vue SVG (16-20px)│ Strictly NO emojis; clean vector icons│
│                      │                         │ paired with descriptive text labels.  │
└──────────────────────┴─────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Nielsen's 10 Usability Heuristics Compliance Audit

The Hivelet interface was systematically audited against Jakob Nielsen's 10 Usability Heuristics to guarantee operational effectiveness for both student residents and the property landlady:

| # | Usability Heuristic | Practical Hivelet Implementation | Verified Component |
| :-: | :--- | :--- | :--- |
| **1** | **Visibility of System Status** | System operations provide immediate visual state feedback. Asynchronous data fetches render animated skeleton loaders (`SkeletonTable.vue`). Payments clearly display color-coded status badges: `Pending Verification` (Amber), `Verified` (Emerald), and `Overdue` (Crimson). | `components/ui/Skeleton.vue`<br>`TenantPaymentsView.vue` |
| **2** | **Match Between System & Real World** | The system models the boarding house using the landlady’s exact real-world vocabulary. Units are organized into her five physical clusters (`BH`, `Back Apartment`, `Penthouse`, `Front Apartment`, `Linda`). Ledger calculations directly replicate her notebook formula: $\text{Rent} + (\text{Occupants} \times ₱200)$. | `IncomeCollectionsView.vue`<br>`canonicalUnits.ts` |
| **3** | **User Control & Freedom** | All modals and slide-overs feature explicit `Cancel` buttons, backdrop-click dismissal, and `Esc` key bindings. If an administrator accidentally records an incorrect payment, the system provides a **Void Transaction** workflow with a recorded audit reason, rather than locking the database. | `ConfirmModal.vue`<br>`BillingPaymentsView.vue` |
| **4** | **Consistency & Standards** | Universal UI layouts are maintained across all modules: top header displaying active workspace roles, left collapsible sidebar with consistent Lucide icons, and uniform table header styles with sticky vertical scrolling. | `AppSidebar.vue`<br>`AppHeader.vue` |
| **5** | **Error Prevention** | High-impact actions (such as voiding an income ledger entry or closing an unresolved maintenance ticket) cannot occur with a single click. The system triggers a confirmation modal (`ConfirmModal.vue`) displaying an explicit impact statement before executing state changes. | `ConfirmModal.vue` (`variant="danger"`) |
| **6** | **Recognition Rather than Recall** | In the Guided Monthly Payment form, selecting a unit code automatically queries and pre-fills the active tenant’s name, registered occupant count, and base rent from the database, eliminating the need for the administrator to memorize lease details. | `OnsitePaymentModal.vue`<br>`BR-009` |
| **7** | **Flexibility & Efficiency of Use** | The dashboard provides quick-filter buttons for floor levels (`1st Floor`, `2nd Floor`, `3rd Floor`), cluster filter tabs, and unit code search inputs, allowing the landlady to look up any room's ledger in under two seconds. | `RoomDirectoryView.vue`<br>`AdminOverviewView.vue` |
| **8** | **Aesthetic & Minimalist Design** | Uncluttered, document-style layouts inspired by Jira and Airtable. Non-essential tenant details (e.g., secondary emergency contact numbers) are progressively disclosed in detail hover popovers (`TicketHoverModal.vue`) rather than crowding the main table. | `TicketHoverModal.vue`<br>`UI_DESIGN_SPECIFICATION.md` |
| **9** | **Help Users Recognize & Recover from Errors** | Form input errors display inline red alert text directly adjacent to the invalid input (e.g., *"GCash reference number must be exactly 13 digits"* or *"Attachment exceeds 5MB limit"*), paired with clear corrective instructions. | `useToast.ts`<br>`TenantPortalView.vue` |
| **10**| **Help & Documentation** | Complex operational rules—such as the 50% co-ownership revenue share calculation and the 2% annual increase recommendation—feature inline informational helper tooltips explaining the governing business rule (`BR-035`, `BR-048`). | `02_BUSINESS_RULES.md`<br>`IncomeCollectionsView.vue` |

---

## 3. Screen State Specifications (Beyond the Happy Path)

To fulfill Module 01 design refinement standards, every interactive screen in Hivelet defines four complete states:

### 3.1 Loading State
* Rather than rendering unstyled blank pages or generic spinning spinners, Hivelet renders layout-accurate **Animated Skeleton Screens** (`SkeletonTable.vue`, `SkeletonCard.vue`, `SkeletonDetail.vue`).
* Pulse animations transition between `#e2e8f0` and `#f1f5f9`, maintaining page structure and reducing perceived latency while API responses are awaited.

### 3.2 Empty State
* Displayed whenever an administrative query returns zero database records (e.g., no pending payment verifications, zero active maintenance tickets, or an empty inquiry inbox).
* Contains three mandatory visual elements:
  1. A neutral, monochromatic Lucide SVG icon illustration.
  2. A plain-English descriptive headline and explanatory subtext (e.g., *"No Maintenance Requests Pending — All property units are currently operating without reported issues."*).
  3. A context-sensitive action button (e.g., *"+ Submit Ticket on Behalf of Tenant"*).

### 3.3 Error State
* Displayed when network connectivity is lost, an API returns a 500-series error, or multipart file uploads fail.
* Rendered as an elevated card container with a crimson border (`#fecaca`) and soft red background (`#fef2f2`), displaying an `AlertTriangle` vector icon, a non-technical problem explanation, and an actionable recovery button (*"Retry Network Request"*).

### 3.4 Confirmation Dialog State
* Built using `components/ui/ConfirmModal.vue`, utilizing a semi-transparent slate backdrop blur (`rgba(28, 25, 23, 0.5)`).
* Displays a clear title, a warning body text, an explicit system notice (*"Notice: This action will update the system state and audit logs immediately."*), a secondary `Cancel` button, and a prominent primary confirmation button (`Confirm Action`).

---

## 4. End-User Walkthrough & Feedback Documentation

During our design refinement phase, we walked through the high-fidelity mockups with our primary stakeholder, **Mrs. Fe Galang Da Silva (Property Owner & Administrator)**. Her feedback directly drove three critical design adaptations:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           END-USER VALIDATION & FEEDBACK LOG                           │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ Initial Wireframe Design│ End-User (Landlady) Feedback  │ Resulting Design Refinement  │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ Standard Accounting Form│ "I don't understand debit,    │ Replaced with Guided Monthly │
│ with general ledger     │ credit, or journal entries. I │ Payment Entry: selecting the │
│ account codes.          │ just want to write who paid,  │ room unit automatically      │
│                         │ what room, and water."        │ computes rent, water, and    │
│                         │                               │ the 50% co-ownership share.  │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ Single flat room table  │ "Rooms 1a to 1h are different │ Reorganized the directory into│
│ sorted sequentially by  │ from the Back Apartment and   │ five canonical cluster cards │
│ unit number.            │ Penthouse. Linda has her own  │ (BH, Back, PH, Front, Linda) │
│                         │ separate rates."              │ mirroring physical property. │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ Automated gateway auto- │ "I cannot mark a bill paid if │ Introduced Asynchronous      │
│ marking bills as 'Paid' │ I haven't seen the money in   │ GCash Verification Queue:    │
│ upon digital checkout.  │ my own GCash account first."  │ payments remain 'Pending'    │
│                         │                               │ until landlady clicks Verify.│
└─────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

---

## 5. Mobile-First Responsive Architecture

Because student boarders interact with Hivelet predominantly through mobile smartphones, all views implement responsive Tailwind breakpoints (`sm:`, `md:`, `lg:`):
* **Navigation Drawer:** On mobile viewports ($<768\text{px}$), the desktop sidebar transforms into a slide-over off-canvas drawer accessed via a top header hamburger button.
* **Data Grids & Ledgers:** Financial tables on mobile devices feature smooth horizontal overflow scrolling (`overflow-x-auto`) paired with sticky first columns (`sticky left-0 bg-white`), allowing the landlady to view payor names while scrolling across rent and water breakdown columns.
* **Card Stacking:** Multi-column dashboard metric grids stack fluidly from 4 columns on desktop ($>1024\text{px}$) to 2 columns on tablet ($768\text{px}$) and a single vertical column on mobile screens ($<640\text{px}$).
