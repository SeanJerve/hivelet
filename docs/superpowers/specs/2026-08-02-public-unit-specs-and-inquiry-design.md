# Public Unit Catalog Specs, Photos & Direct Landlady Inquiry Specification

## Overview
This document specifies the enhancement to the Public Guest view (`frontend/src/views/PublicGuestView.vue`) and unit specification modal (`frontend/src/components/modals/RoomDetailModal.vue`) in Hivelet.

The enhancement enables prospective tenants visiting the public unit catalog to:
1. View visual photos of every unit card.
2. Click a dedicated "View Specs" button on any unit to open full technical and architectural specifications.
3. Inquire directly to the landlady from within the unit specs view, automatically transferring unit details to the inquiry form or live chat messenger.

## System Bible & Capstone Alignment
- **Section 4 - Public Visitor Role:** Prospected tenants can view room information, see room availability, check room specifications, and submit direct inquiries with contact information.
- **Section 5 - Property Model & BR-032 / BR-040:** Canonical 32 units model, floor levels, unit types, max occupancy, submetered electric billing notice, and water billing rules (₱200 per head standard vs Linda fixed rate).

## Technical Changes

### 1. Master State Updates (`frontend/src/lib/systemState.ts`)
- Ensure every `RoomUnit` object includes explicit unit photo representations and detailed specification lists (amenities, floor level, kitchen/bath status, submeter type).
- Expose state helper function `openRoomDetail(room: RoomUnit)` to trigger `RoomDetailModal`.

### 2. Room Specs Modal (`frontend/src/components/modals/RoomDetailModal.vue`)
- Header banner with unit photo SVG / image asset display.
- Structured grid breakdown:
  - Unit Code & Floor Level
  - Unit Type & Property Cluster
  - Monthly Rate (₱)
  - Max Occupancy
  - Water Billing Rule (BR-014 / BR-040)
  - Submetered Electricity notice
  - Key Amenities (Kitchenette, Private T&B, Storage Cabinets, Bed Frame, Balcony/Window Access)
- Primary CTA: **"Inquire Directly to Landlady"** button.
  - Action: Sets `selectedUnitCode`, populates inquiry message template, closes modal, and scrolls smoothly to the inquiry form or opens the landlady live chat.

### 3. Public Guest View (`frontend/src/views/PublicGuestView.vue`)
- Display visual Unit Photos for each available/canonical unit card.
- Add dual action buttons per card:
  - **"View Specs"** (Secondary Jira Button) $\rightarrow$ Triggers `RoomDetailModal`.
  - **"Inquire Now"** (Primary Jira Button) $\rightarrow$ Direct landlady inquiry trigger.
- Synchronize unit selection across modal and inquiry form.

## Verification & Testing Strategy
- Verify Vue component builds cleanly without lint or TypeScript errors (`npm run build`).
- Verify responsive card layout across mobile, tablet, and desktop breakpoints.
- Confirm unit selection transfer from modal to inquiry message form.
