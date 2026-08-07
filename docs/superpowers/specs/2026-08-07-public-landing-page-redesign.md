# Hivelet Public Landing Page Redesign Specification

**Date:** 2026-08-07  
**Project:** Fe Galang Da Silva Boarding House Management System (Hivelet)  
**System Bible Reference:** Section 4 (Public Visitor Role), Section 5 (Property Model), and Section 5.4 / Section 9 (Centralized Inquiries)  
**UI Wireframe Reference:** `wireframe/guest.html` (layout structure) + Minimalist Corporate Workspace (`#0c66e4`, `#0b132b`, `#172b4d`, `#f4f5f7`)  

---

## 1. Executive Summary

This design specification details the complete overhaul of Hivelet's public landing page (`website/src/views/PublicLandingView.vue`), navbar header (`website/src/components/layout/AppNavbar.vue`), and footer (`website/src/components/layout/AppFooter.vue`).

The redesign eliminates all generic "Horizon Staycation / Hotel / Car Rental" templates and replaces them with a 1:1 functional adaptation of `wireframe/guest.html`, styled with Hivelet's corporate blue design palette (`#0c66e4` accent, `#0b132b` header/hero background, `#f4f5f7` canvas, `#ffffff` cards).

The public portal strictly displays public-facing data for **Fe Galang Da Silva Boarding House** in Sambat, Tanauan City, Batangas, completely excluding admin-only data (financial ledgers, profit share calculations, tenant identities, maintenance ticket dispatches, and system audit logs).

---

## 2. Core Functional Requirements & Boundaries

### Included Public Features
1. **Official Boarding House Identity:** Clear property title ("Fe Galang Da Silva Boarding House"), location ("Sambat, Tanauan City, Batangas"), and core property attributes (3 Floors, 32 Units, ₱200/head monthly water rule, sub-metered electricity per unit, parking availability, gated security).
2. **Hero Section (`wireframe/guest.html` Layout):**
   - Left Column: Rating badge (★ 4.9 Stars), headline ("Live Comfortably In Hivelet Stays."), subtext, CTA buttons ("Inquire Now", "Browse 32 Units").
   - Right Visual Area: High-quality room photo cutout with floating glass status cards (Unit 204 Status Card, Location & Rating Card, Mrs. Fe Galang Live Inquiry Messenger Status Card).
3. **"Get Updates Live" Highlights Bar:**
   - 3 Highlights Cards: Direct Inquiry Line, Transparent Utility Sub-meters (₱200/head water), and Tenant Security (Gated premises & CCTV).
4. **Interactive 32-Unit Room Catalog & Filter Matrix:**
   - Combined Floor Filters: All Floors, 1st Floor (Rooms 101–110), 2nd Floor (Rooms 201–210), 3rd Floor (Rooms 301–312).
   - Combined Unit Type Filters: All Types, Studio, 1-Bedroom, 2-Bedroom, 3-Bedroom.
   - Status Filters: All, Available, Reserved, Occupied (with expected availability dates).
   - Unit Cards: Unit Code, Floor, Status Badge, Monthly Rent Rate, Unit Amenities (private/shared bathroom, kitchen sink, sub-metered setup), and direct "Inquire Now" modal trigger button.
5. **Transparent House Rules & Renting Guidelines:**
   - ₱200/head water billing rule explanation.
   - Individual sub-metered electricity calculation rule.
   - Payment due dates based on move-in date and 1-week grace period.
6. **Direct Inquiry Submission Form:**
   - Fields: Full Name, Contact Phone (required), Email, Target Unit Selection (auto-filled when clicking a unit's inquire button), Target Move-in Date, Number of Occupants, and Message.
   - Persistence: Submitting an inquiry creates an entry in `systemState.ts` (`activeInquirers` / `inquiries`) so it appears in the Landlady's Inquiry Inbox (`/admin/inquiries`) and updates the live messenger chat.

### Explicit Public Exclusions
- NO internal tenant names or occupant contact lists.
- NO admin financial metrics, 50% revenue share calculations, profit/cash-flow charts, or expense ledgers.
- NO maintenance ticket dispatch tables or closure triggers.
- NO system audit logs or server diagnostic tools.

---

## 3. Component Architecture & File Mapping

### A. Layout Header (`website/src/components/layout/AppNavbar.vue`)
- Replace logo text with `Hivelet` and subtext `Fe Galang Da Silva Boarding House`.
- Update navigation links: `Home`, `Features`, `Available Units`, `House Rules`.
- Search bar placeholder: `Search room code (e.g. 102, 204)...`.
- Top-Right Actions: Public/Admin/Tenant workspace switcher pill bar + Direct Inquiry Chat trigger button.

### B. Public Landing View (`website/src/views/PublicLandingView.vue`)
- Implement full `wireframe/guest.html` hero grid layout with corporate blue styling.
- Render 3 Highlights Cards ("Get Updates Live").
- Render multi-combination Floor and Unit Type filter chips with live computed filtering over `rooms` in `systemState.ts`.
- Render unit cards grid with direct inquiry modal/drawer trigger.
- Render House Rules section and embedded Direct Inquiry submission form.

### C. Layout Footer (`website/src/components/layout/AppFooter.vue`)
- Update footer text, mission statement, contact information (Sambat, Tanauan City, Batangas), and quick links to match Hivelet capstone study details.

---

## 4. Verification Plan

1. **Build Verification:** Run `npm run build` in `website/` to ensure clean TypeScript compilation without broken imports or lint errors.
2. **Interactive UI Verification:** Run dev server, visit `http://localhost:5173/` (or active port), verify:
   - Header shows Hivelet logo and correct public navigation links.
   - Hero displays rating badge, headline, and 3 floating glass cards.
   - Floor and Unit Type filter chips filter the 32-unit room grid in real time.
   - Inquire buttons pre-fill unit code into inquiry form.
   - Submitting an inquiry persists into Landlady Inbox (`/admin/inquiries`).
   - Role Switcher smoothly toggles between Public, Admin, and Tenant portals.
