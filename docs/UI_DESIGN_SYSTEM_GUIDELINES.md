# HIVELET MASTER UI/UX DESIGN SYSTEM GUIDELINES

> **Authoritative Design Building Standard for Hivelet (Fe Galang Da Silva Boarding House Management System)**  
> **Mandatory Rule:** All AI agents, developers, and team members MUST adhere strictly to these guidelines when building, modifying, or styling any component or view in this repository.

---

## 1. Executive Summary & Design Core Philosophy

Hivelet is a specialized, web-based apartment management system designed for **Fe Galang Da Silva Boarding House** (32 rentable units across 3 floors and 5 property clusters).

The system replaces fragmented paper notebooks, Messenger chats, text messages, and spreadsheet ledgers with a unified, high-clarity business operations portal.

### The Tri-Inspiration Design Synthesis (Jira + Notion + Airtable)

Hivelet combines the best elements of three world-class productivity platforms to serve an administrator (landlady) who requires maximum clarity with zero technical complexity:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE HIVELET TRI-INSPIRATION                           │
├───────────────────────────────┬─────────────────────────────────────────────────┤
│ 1. JIRA TASKS & WORKFLOW      │ - Structured operational workflows              │
│    (Operational Focus)        │ - Status Badges: To Do, In Progress, Done       │
│                               │ - Urgency Badges: Emergency, High, Medium, Low  │
│                               │ - Slide-over drawers & details popovers         │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 2. NOTION ELEGANCE            │ - Clean typography with Inter font scale        │
│    (Readability & Simplicity) │ - Distraction-free, card-based document layouts │
│                               │ - High visual contrast & plain-English labels   │
│                               │ - Zero cognitive overload for non-techy users   │
├───────────────────────────────┼─────────────────────────────────────────────────┤
│ 3. AIRTABLE DATA MATRIX       │ - Dense, readable data grids with sticky headers│
│    (Grid & Financial Clarity) │ - Interactive 32-room unit matrix view          │
│                               │ - Split-expense property area tables            │
│                               │ - Live column totals & status pill indicators   │
└───────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 2. Target User Persona: The Non-Techy Administrator / Landlady

### Key Behavioral Needs & UX Mandates

1. **Instant Operational Answer ("What needs my attention today?")**
   - The landlady should see immediate key metrics upon logging in:
     - Unpaid / Overdue rent
     - Online GCash payments pending manual verification
     - New prospect inquiries
     - Emergency / High-priority maintenance tickets
2. **Subtle & Visible Action Feedback Engine**
   - No silent actions! Every click, submission, update, or deletion MUST produce explicit visual feedback:
     - **Success Toast**: Soft green floating message (`Payment recorded successfully`).
     - **Warning Toast / Banner**: Soft amber message (`Water fee mismatch: 2 occupants × ₱200 = ₱400 expected`).
     - **Error Toast**: Clear red explanation with resolution guidance.
     - **Confirmation Modal**: Destructive or status-altering actions (e.g. tenant deactivation, ticket closure, room vacancy settlement) require an explicit modal confirmation with an impact statement.
3. **No Mystery Icons or Obscure Gestures**
   - Emojis are **STRICTLY PROHIBITED**. Use SVG / Lucide icons paired with explicit text labels.
   - Buttons must clearly state their action: `Record Payment`, `Convert Inquiry`, `Dispatch Ticket`, `Export Ledger`.
4. **Color-Coded Status & Urgency System**
   - Statuses use universal color coding:
     - **Occupied / Done**: Atlassian Blue (`#0c66e4`) / Forest Green (`#006644`).
     - **Available**: Soft Green (`#e3fcef` / `#006644`).
     - **Reserved / Overdue / Warning**: Amber (`#fffae6` / `#826100`).
     - **Emergency / Error**: Red (`#ffebe6` / `#bf2600`).
     - **Under Maintenance / Hidden**: Neutral Slate (`#ebecf0` / `#42526e`).

---

## 3. Design System Tokens & Color Palette

### Base Canvas & Surfaces
- **Canvas Background**: `#f4f5f7` (Subtle neutral slate gray)
- **Container / Card Surfaces**: `#ffffff` (Pure crisp white)
- **Modal Backdrops**: `rgba(9, 30, 66, 0.54)` (Translucent slate overlay)

### Typography & Text Colors
- **Font Family**: `'Inter', system-ui, -apple-system, sans-serif`
- **Primary Text**: `#172b4d` (Deep slate, high contrast for maximum readability)
- **Secondary / Subtext**: `#6b778c` (Muted slate for metadata, timestamps, helper text)
- **Disabled Text**: `#a5adba`

### Brand & Interactive Accents
- **Primary Action (Jira Blue)**: `#0c66e4` (Hover: `#0052cc`)
- **Secondary Button Surface**: `#091e420f` (Hover: `#ebecf0`)
- **Borders & Dividers**: `#dfe1e6` (Subtle 1px division line)
- **Active Focus Ring**: `0 0 0 2px #388bfd`

---

## 4. Component Building Specifications

### 4.1 Room Visual Matrix (Airtable + Jira Hybrid)
- Represents the 32 rentable units of Fe Galang Da Silva Boarding House across 3 floors and 4 property clusters:
  - **Main Boarding House (BH)**: Floor 1 (1a-1h), Floor 2 (2a-2g), Floor 3 (3a-3g)
  - **Clusters**: Back Apartment (B1F, B2F, B2B, B3F, B3B), Front Apartment (F1, F2F, F2B), Linda (LF, LB)
- **Card Design**:
  - Compact Jira-style card with floor/unit identifier, current tenant name, occupancy count, and rent rate.
  - Color border indicator on left edge reflecting status (Green = Available, Blue = Occupied, Amber = Reserved, Gray = Maintenance).

### 4.2 Data Grid Tables (Airtable Style)
- Used for Billing Collections Ledger, Expenses Ledger, Tenant Directory, and Inquiry Inbox.
- **Specifications**:
  - Sticky header row (`bg-[#f4f5f7]`, `font-semibold`, `text-[#42526e]`).
  - Subtle row hover effect (`hover:bg-[#f8f9fa]`).
  - Explicit column alignments: Left for text, Center for dates/badges, Right for monetary values (`₱X,XXX.XX`).
  - Summary Footer Row (`bg-[#ebecf0]`, bold total calculations).

### 4.3 Form Inputs & Inline Validation
- All numeric inputs (Rent, Water, Occupants, Split Expenses) must include real-time inline validation labels.
- **Water Billing Rule (BR-014 & BR-036)**:
  - Water Payment must equal `Occupants × ₱200`. If entered value differs, show an amber helper badge:  
    `⚠️ Notice: Standard calculation for 2 occupants is ₱400 (2 × ₱200).`

### 4.4 Modals & Slide-Over Drawers (Notion & Jira Style)
- Drawers slide from right for detailed inspection (e.g. Maintenance Ticket details, Tenant Profile).
- Modals pop center with dark backdrop overlay for critical forms (e.g. Record Payment, Convert Inquiry, Add Expense).
- Every modal MUST have:
  - Title & Subtitle explaining the action.
  - Explicit `Cancel` button (Secondary style) and `Confirm / Submit` button (Primary or Danger style).

---

## 5. Universal State, Feedback & Notification Architecture

Every action performed in Hivelet must be processed through a standardized state lifecycle:

```
[User Action] ──► [Optimistic / Loading State] ──► [Backend Execution] ──► [Feedback Response]
                                                                                │
                  ┌─────────────────────────────────────────────────────────────┴─────────────────────────────┐
                  ▼                                                             ▼                             ▼
       [SUCCESS FEEDBACK]                                              [WARNING FEEDBACK]             [ERROR FEEDBACK]
  - Soft Green Toast Banner                                      - Soft Amber Alert Banner      - Clear Red Alert Toast
  - Smooth Auto-dismiss (4s)                                     - Requires Acknowledgment       - Non-blocking error retry
  - Visual checkmark icon                                        - Inline helper text           - Actionable resolution guide
```

### Toast Notification Protocol
- Position: Top-Right floating stack (`z-50`).
- Variants:
  1. `success`: Green backdrop (`#e3fcef`), dark green text (`#006644`), Lucide `CheckCircle` icon.
  2. `warning`: Yellow backdrop (`#fffae6`), dark amber text (`#826100`), Lucide `AlertTriangle` icon.
  3. `error`: Red backdrop (`#ffebe6`), dark red text (`#bf2600`), Lucide `XCircle` icon.
  4. `info`: Blue backdrop (`#deebff`), dark blue text (`#0747a6`), Lucide `Info` icon.

### Destructive Action Confirmation Protocol
- Triggered before:
  - Deactivating a tenant account
  - Closing a maintenance ticket
  - Deleting an expense or financial entry
  - Settling a room vacancy
- Modal layout:
  - Title: Red/Amber warning heading
  - Body: Plain-English explanation of impact (e.g. "Settling this vacancy will deactivate the tenant account and return Room 204 to Available status.")
  - Action buttons: `Cancel` (Secondary) vs `Deactivate & Settle` (Danger Red).

---

## 6. Academic AI Coding & Documentation Standard

To comply with capstone evaluation standards and repository rules, every `.vue` component and `.ts` utility script created or modified MUST include the following JSDoc header comment:

```typescript
/**
 * @component [Component Name]
 * @description [Detailed functional purpose]
 * @systemBibleRef [System Bible section, e.g. Section 5.3 - Financial Calculations]
 * @rationale [Architectural rationale for component structure & design]
 * @innovations [Custom logic, UI adaptations, or algorithms tailored for Hivelet]
 */
```

Inline code comments must explicitly cite business rules where relevant (e.g. `// BR-035: 50% Share is derived as Rent / 2`, `// BR-014: Water charged at ₱200/head`).

---

## 7. Developer & Agent Implementation Checklist

Before declaring any UI task or component complete, verify:
- [ ] Uses Inter typography and Atlassian Jira slate design tokens (`#f4f5f7`, `#ffffff`, `#172b4d`, `#0c66e4`, `#dfe1e6`).
- [ ] No emojis used anywhere in labels, icons, or badges (Lucide icons only).
- [ ] Clear, non-techy plain-English labels on all interactive elements.
- [ ] Includes subtle & visible state feedback (Toast notifications, confirmation modals, or inline warnings).
- [ ] Responsive layout tested for mobile drawers, stacked cards, and horizontal table scrolling.
- [ ] JSDoc header comment present at top of file with `@systemBibleRef` and `@rationale`.
- [ ] Project builds cleanly via `npm run build`.
