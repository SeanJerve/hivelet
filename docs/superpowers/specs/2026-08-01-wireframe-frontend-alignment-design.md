# Hivelet Frontend & Wireframe Architectural Alignment Design Spec

**Date:** 2026-08-01  
**Project:** Fe Galang Da Silva Boarding House Management System (Hivelet)  
**System Bible Reference:** Section 3 (System Features) & Section 4 (User Roles & Authorization)  

---

## 1. Executive Summary

This design specification details the architectural and functional integration of all prototype capabilities from `wireframe/` (`app.js`, `guest.js`, `index.html`, `guest.html`) into the production Vue 3 + TypeScript + TailwindCSS v4 application (`frontend/`).

The integration maintains:
1. **Design System:** Strict adherence to Jira-inspired corporate UI styling (`#f4f5f7` canvas, `#ffffff` card/sidebar surfaces, `#172b4d` text, `#0c66e4` primary blue accents, `#dfe1e6` borders, Lucide-Vue icons).
2. **Unified Single-Slug Navigation:** All Public, Tenant, and Admin views accessible via direct URL routes (`/public`, `/tenant`, `/admin/*`) with an interactive Top Header Role Switcher for seamless testing.
3. **Academic Code Documentation:** Header comments documenting System Bible references, architectural rationale, and capstone operational rules on all components.

---

## 2. Shared State Architecture (`src/lib/systemState.ts`)

A reactive state module managing live mock data shared across all views and modals:

- **32-Room Occupancy Matrix (`rooms`):**
  - Canonical 32 units across 3 floor rows: Rooms 101–110 (1st Floor), Rooms 201–211 (2nd Floor), Rooms 301–311 (3rd Floor).
  - Properties: `id`, `num`, `floor`, `type` (`Studio`, `1-Bedroom`, `2-Bedroom`, `3-Bedroom`), `price`, `occupants`, `maxOccupants`, `status` (`available`, `occupied`, `pending`, `overdue`), `tenant`, `paid`, `balance`, `photo`, `desc`.

- **Spec 09 Monthly Income Ledger (`incomeLedger`):**
  - Collection items: `unit`, `date`, `invoiceNum`, `contact`, `period`, `rent`, `share` (50% rent share), `occupants`, `water` (₱200/head rule), `remitted` (`rent + water`), `paymentMethod` (`Cash` | `Online`), `referenceNum`.

- **Spec 10 Guided Expenses Ledger (`expenseLedger`):**
  - Multi-supplier logs grouped by `date`: `items: [{ supplier, area, amount, catId, catName }]`. Supports Date `rowspan` rendering in tables.

- **Maintenance Ticket Dispatch (`tickets`):**
  - Tickets with properties: `id`, `room`, `tenant`, `phone`, `issue`, `priority` (`Low`, `Medium`, `High`, `Emergency`), `date`, `desc`, `technician`, `photo`, `status` (`OPEN` | `RESOLVED`).

- **Live Chat & Inquiry Messenger (`activeInquirers`):**
  - Active chat threads connecting public guests and landlady with unread counts and message history.

---

## 3. UI Component Architecture

### A. Modals (`src/components/modals/`)
1. **`RoomDetailModal.vue`:** Displays complete specifications, base rent, amenities notes, photo, and direct "Inquire Room & Chat Landlady" CTA.
2. **`AdminEditUnitModal.vue`:** Allows landlady to modify unit type, monthly rent, occupant limits, availability status, description, and preview/upload unit image file.
3. **`TicketHoverModal.vue`:** Outward diagonal arrow trigger pop-over modal rendering full maintenance ticket details, contact info, assigned tech, and photo.
4. **`LiveChatheadModal.vue`:** Top-right floating chathead inbox modal providing real-time guest/landlady inquiry messaging.
5. **`OnsitePaymentModal.vue`:** In-person cash payment logger for landlady to issue OR receipts.
6. **`TenantLoginModal.vue` & `GuestEntryModal.vue`:** Role portal entry popups with quick auto-fill test buttons.

### B. Views (`src/views/`)
1. **`AdminOverviewView.vue`:** Interactive 32-room occupancy matrix with floor indicators, KPI summary metrics, and quick cash record trigger.
2. **`RoomDirectoryView.vue`:** Inventory list view with room filter chips and admin edit modal triggers.
3. **`TenantManagementView.vue`:** Active tenant directory, onboarding profiles, and contract status.
4. **`BillingPaymentsView.vue`:** Spec 09 Monthly Payment recorder form with real-time 50% share & water calculation bar + auto-updating Income Collection Ledger table.
5. **`ExpensesLedgerView.vue`:** Spec 10 multi-supplier expense logger with date cell `rowspan` merging across business areas (BH, Main House, Front Apt, Back Apt, Personal).
6. **`MaintenanceDispatchView.vue`:** Landlady ticket dispatch table with diagonal expand hover modal trigger and in-place `[ ✅ RESOLVED ]` tag replacement.
7. **`InquiriesView.vue`:** Full landlady inquiry inbox workspace.
8. **`PublicGuestView.vue`:** Public property showcase with floor/availability filters, room grid, house rules, star rating badge, and inquiry form.
9. **`TenantPortalView.vue`:** Active tenant portal displaying rent balance, water breakdown, optional GCash checkout modal trigger, and maintenance issue submission form.
10. **`SystemSettingsView.vue`:** Business rules reference (₱200/head water rate, Linda units fixed rules, Excel exports).

---

## 4. Verification Plan

1. **Build Verification:** Run `npm run build` inside `frontend/` to verify TypeScript compilation and Tailwind CSS processing.
2. **Dev Server Verification:** Run `npm run dev` to verify routing, role switcher, modals, and reactive state updates across all views.
3. **Feature Coverage Verification:**
   - 32-room grid rendering and room modal trigger.
   - Spec 09 payment entry reflecting into ledger with 50% share and water calculations.
   - Spec 10 expense entry showing merged date rowspans.
   - Ticket closure updating status in-place to `RESOLVED`.
   - Floating chathead opening and sending messages.
