# Public Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the public landing page, navbar, and footer in `website/` to pattern after `wireframe/guest.html` with Hivelet's corporate blue palette (`#0c66e4`, `#0b132b`, `#172b4d`, `#f4f5f7`) for Fe Galang Da Silva Boarding House, excluding all admin-only data.

**Architecture:** Refactor `PublicLandingView.vue`, `AppNavbar.vue`, and `AppFooter.vue` to render authentic boarding house information (32 units across 3 floors in Sambat, Tanauan City), real-time floor & unit type filtering over `systemState.ts`, and direct inquiry persistence into the Landlady Inbox (`/admin/inquiries`).

**Tech Stack:** Vue 3, TypeScript, TailwindCSS, Lucide-Vue icons, Vue Router, Reactive `systemState.ts`.

---

### Task 1: Update AppNavbar Component Header & Branding

**Files:**
- Modify: `website/src/components/layout/AppNavbar.vue`

- [ ] **Step 1: Replace placeholder Horizon branding with Hivelet branding and public nav links**

Edit `website/src/components/layout/AppNavbar.vue` to update the logo to Hivelet, navigation links (`Home`, `Features`, `Available Units`, `House Rules`), search placeholder (`Search unit code (e.g. 102, 204)...`), and top comment header:

```vue
<!--
  @file components/layout/AppNavbar.vue
  @description Hivelet top application header with brand logo, public navigation links, room search input, and role switcher.
  @systemBibleRef Section 4 - User Roles & Section 5.4 - Centralized Inquiries
  @rationale Provides unified single-slug navigation between Public, Admin, and Tenant portals with corporate blue styling.
-->
```

- [ ] **Step 2: Verify AppNavbar syntax and local dev server**

Check `website/src/components/layout/AppNavbar.vue` for valid Vue template syntax.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: false`: skip commit. Print: "Skipping commit (auto_commit: false)."

---

### Task 2: Update AppFooter Component Branding & Capstone Notes

**Files:**
- Modify: `website/src/components/layout/AppFooter.vue`

- [ ] **Step 1: Update AppFooter branding, mission, and quick links**

Edit `website/src/components/layout/AppFooter.vue` to state the capstone project identity ("Fe Galang Da Silva Boarding House Management System in Barangay Sambat, Tanauan City, Batangas"), clean up placeholder links, and add top comment header:

```vue
<!--
  @file components/layout/AppFooter.vue
  @description Hivelet corporate footer with property information, quick links, and capstone system notes.
  @systemBibleRef Section 1 - Product Identity & Section 4 - Public Visitor Role
-->
```

- [ ] **Step 2: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: false`: skip commit. Print: "Skipping commit (auto_commit: false)."

---

### Task 3: Overhaul PublicLandingView View (`wireframe/guest.html` Pattern with Corporate Blue Styling)

**Files:**
- Modify: `website/src/views/PublicLandingView.vue`

- [ ] **Step 1: Implement full guest.html layout structure in PublicLandingView.vue**

Update `website/src/views/PublicLandingView.vue` with:
- Top comment header citing System Bible Section 4 & Section 5.4.
- Hero Grid: Rating badge (★ 4.9 Stars), headline ("Live Comfortably In Hivelet Stays."), subtext, CTA buttons ("Inquire Now — Free", "Browse 32 Units"), and right-side visual cutout with floating glass cards (Unit Status, Location/Rating, Landlady Messenger).
- Highlights Bar ("Get Updates Live"): Direct Inquiry, Transparent Utilities (₱200/head water), Tenant Security (Gated premises & CCTV).
- Multi-Combination Filter Chips: Floor (All, 1st Floor, 2nd Floor, 3rd Floor) & Unit Type (All, Studio, 1-Bedroom, 2-Bedroom, 3-Bedroom) filtering over `rooms` in `systemState.ts`.
- Rentable Units Grid: Unit cards showing room specs, monthly rates, status badges, and direct inquiry trigger buttons.
- House Rules & Guidelines Section: ₱200/head water rule and sub-metered electric setup.
- Direct Inquiry Form: Form fields for Prospect Name, Phone (required), Email, Target Move-in Date, Target Unit Selection, and Message. Submitting creates a record in `systemState.ts` (`activeInquirers` / `inquiries`) for `/admin/inquiries`.
- Strict Exclusion: No admin financial metrics, 50% revenue share calculations, profit graphs, expense ledgers, maintenance ticket dispatches, or tenant account private details.

- [ ] **Step 2: Verify PublicLandingView reactivity and inquiry submission**

Verify that filtering by floor/unit type updates unit cards in real time and submitting an inquiry adds the inquiry to `systemState.ts`.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: false`: skip commit. Print: "Skipping commit (auto_commit: false)."

---

### Task 4: System Build & Verification

**Files:**
- Test: `website/` build and routing

- [ ] **Step 1: Run production build check**

Run: `npm run build` in `c:\Users\LloydCuario\OneDrive\Desktop\hivelet\hivelet\website`
Expected: Successful build with zero errors.

- [ ] **Step 2: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: false`: skip commit. Print: "Skipping commit (auto_commit: false)."
