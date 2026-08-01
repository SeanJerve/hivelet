# Hivelet Final Web Application Architectural & UI Design Spec

**Date:** 2026-08-01  
**Project:** Fe Galang Da Silva Boarding House Management System (Hivelet Final Website)  
**System Bible Reference:** Section 3 (System Features), Section 4 (User Roles), Section 5 (Property Model)  

---

## 1. Executive Summary

This design specification details the architecture, component structure, and visual design for the final production web application in the `website/` directory (`c:\Users\LloydCuario\OneDrive\Desktop\hivelet\hivelet\website`).

The design draws direct visual inspiration from:
1. **Horizon Staycation Landing Page:** High-end dark glassmorphic hero header, search filter bar for 32 canonical units, 5 Property Cluster cards, Available Units showcase, promotional feature banners, and a dark corporate footer.
2. **Donezo Clean Dashboard UI:** Light `#f4f5f7` canvas with deep forest green (`#054e38`) & corporate blue (`#0c66e4`) accents, trend indicator badges (`+₱12,000 vs last month`), progress gauges, and Spec 09/10 ledgers.
3. **TripGlide & Hilya Mobile App UIs:** Mobile-first layout with floating bottom pill navigation (`[ Home | Units | Billing | Tickets | Chat ]`), balance overview cards, and touch action drawers.
4. **Animated Splash Loading Screen:** Fullscreen dark overlay with animated hexagonal emblem, progress counter (`0%` → `100%`), and smooth transition into the app.

---

## 2. Technology Stack & Project Architecture

- **Project Location:** `website/`
- **Build Tool:** Vite + Vue 3 (Composition API `<script setup>`) + TypeScript
- **Styling:** TailwindCSS v4 + Vanilla CSS Design Tokens
- **Icons:** Lucide-Vue Icons (`lucide-vue-next`)
- **Routing:** Vue Router (`createRouter`, `createWebHistory`)

---

## 3. UI Component Architecture (`website/src/`)

### A. Common & Layout Components
- **`LoadingScreen.vue`:** Animated splash screen overlay with logo glow, progress bar counter, and smooth fade-out.
- **`AppNavbar.vue`:** Top navigation header with role switcher (`[ Landlady Admin | Tenant Portal | Public Guest ]`) and live chat inbox button.
- **`MobilePillNavbar.vue`:** Floating bottom navigation bar on mobile screens (`< md`) featuring rounded icon tabs.
- **`AppFooter.vue`:** Horizon-inspired dark footer with brand story, property cluster links, house rules, and copyright.

### B. Modals (`src/components/modals/`)
- **`RoomDetailModal.vue`:** Unit specifications, base rent, amenities, water billing rules (₱200/head vs BR-040 Linda fixed), and inquiry trigger.
- **`AdminEditUnitModal.vue`:** Admin modal to edit room categories, monthly rates, occupant limits, status, and unit photo attachments.
- **`TicketHoverModal.vue`:** Outward diagonal expand pop-over modal displaying full maintenance ticket details, contact info, technician, and photo.
- **`LiveChatheadModal.vue`:** Top-right floating chathead inbox widget for real-time guest/landlady messaging.
- **`OnsitePaymentModal.vue`:** In-person cash payment logger for landlady to issue OR receipts.
- **`TenantLoginModal.vue` & `GuestEntryModal.vue`:** Role portal entry popups with quick auto-fill test buttons.

### C. Primary Views (`src/views/`)
- **`PublicLandingView.vue`:** Horizon-inspired landing page with dark hero search, 5 Property Cluster cards, Available Units grid, Star ratings (4.9 ★), Promo banners, and House Rules.
- **`AdminDashboardView.vue`:** Donezo-inspired executive dashboard with KPI cards, 32-room occupancy grid (grouped by 5 Property Clusters), Spec 09 Income Ledger, Spec 10 Expense Ledger (merged date rowspan), Maintenance Dispatch, and System Audit.
- **`TenantPortalView.vue`:** Active tenant workspace showing assigned unit specs, itemized rent statement (base rent + ₱200/head water), and ticket submission form.
- **`InquiriesView.vue`:** Full landlady inquiry inbox workspace.
- **`SystemSettingsView.vue`:** Configured business rules summary (₱200/head water, Linda fixed rates, Excel export rules).

---

## 4. Academic Code & Capstone Guidelines
- Every created file must contain structured header comments documenting System Bible section references, architectural rationale, and capstone operational rules.
- Strict adherence to 32 Canonical Units across 5 Property Clusters (`BH Main Rooms`, `Back Apartment`, `Penthouse`, `Front Apartment`, `Linda`).
