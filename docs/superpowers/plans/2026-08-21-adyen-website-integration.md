# Adyen Online GCash Website Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Adyen online GCash payment gateway across the website workspace (Tenant Portal and Admin Workspace), supporting hybrid sandbox/live execution, real-time feedback banners, an administrative payment verification queue, and automated income collection ledger synchronization in compliance with System Bible Section 12 & 22 and BR-016/BR-017.

**Architecture:** A hybrid payment gateway service on the Express backend (`adyenService.ts`) manages checkout sessions and fallback sandbox portals. When online payments are submitted by tenants, they enter `payments` with `Pending Verification`. The Administrator reviews and approves them in `BillingPaymentsView.vue`, which automatically transitions the bill to `Paid`, syncs an entry into `monthly_income_records`, notifies the tenant, and logs immutable audit records.

**Tech Stack:** Express, TypeScript, Supabase/PostgreSQL, Vue 3, Tailwind CSS, Lucide Icons.

---

### Task 1: Backend Hybrid Adyen Service & Public Gateway Routes

**Files:**
- Modify: `backend/src/services/adyenService.ts`
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Enhance `backend/src/services/adyenService.ts` for Hybrid Mode**
Update `backend/src/services/adyenService.ts` to cleanly support hybrid configuration (checking `.env` for valid credentials vs sandbox simulation), creating consistent transaction references, and properly mapping session payloads with bill details.

- [ ] **Step 2: Update `backend/src/routes/public.ts` Dynamic Redirections**
Update `backend/src/routes/public.ts` so that:
  1. `GET /api/public/payments/mock-gateway` serves the styled GCash sandbox portal.
  2. `POST /api/public/payments/mock-gateway/complete` redirects the browser back to `${process.env.CLIENT_URL || 'http://localhost:5174'}/tenant/payments?status=success&ref=${result.paymentReference}`.
  3. The cancel button in the mock portal directs to `${process.env.CLIENT_URL || 'http://localhost:5174'}/tenant/payments?status=cancelled`.

- [ ] **Step 3: Verify backend builds**
Run: `npm --prefix backend run build`
Expected: Clean compilation with no TypeScript errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."

---

### Task 2: Backend Admin Payment Verification & Automated Income Ledger Sync

**Files:**
- Modify: `backend/src/routes/admin.ts:570-657`

- [ ] **Step 1: Enhance `PATCH /api/admin/payments/:paymentId/verify` Endpoint**
Update `backend/src/routes/admin.ts` so that when an admin verifies a payment (`verification_status === 'Verified'`):
  1. `payments` record is updated (`verification_status = 'Verified'`, `verified_at = NOW()`, `verified_by = admin_id`).
  2. Associated `bills` record is updated (`status = 'Paid'`).
  3. Queries the bill and room assignment to retrieve rent amount, occupant count, and water amount (₱200/head per BR-014).
  4. Inserts a corresponding row into `monthly_income_records` with:
     - `room_id`: `payment.room_id`
     - `tenant_profile_id`: `payment.tenant_profile_id`
     - `year`: current year
     - `month`: current month
     - `date_paid`: payment's `paid_at` or current date
     - `contact_name`: tenant full name
     - `invoice_number`: payment transaction reference
     - `rent_amount`: bill's `rent_amount`
     - `fifty_percent_share`: `bill.rent_amount / 2`
     - `occupants`: occupant count (or 1)
     - `water_payment`: bill's `water_amount`
     - `remitted_amount`: `payment.amount`
     - `payment_method`: `'Online'`
     - `transaction_reference`: payment's `transaction_reference`
  5. Inserts an in-app notification for the tenant confirming verification.
  6. Creates an audit log entry for `PAYMENT_VERIFY`.

- [ ] **Step 2: Verify backend routes and build**
Run: `npm --prefix backend run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."

---

### Task 3: Website Tenant Portal Payments Flow & Return Status Feedback

**Files:**
- Modify: `website/src/views/TenantPaymentsView.vue`

- [ ] **Step 1: Implement Query Parameter Detection & Alert Banners**
In `website/src/views/TenantPaymentsView.vue`:
  1. On mounted, inspect `window.location.search` for `status=success` and `ref=...` or `status=cancelled`.
  2. Display a dismissible Jira-style alert banner:
     - Success: Green banner with `CheckCircle2` icon confirming submission and pending verification status.
     - Cancelled: Amber banner with `AlertCircle` icon noting cancellation.
  3. Clean query parameters using `window.history.replaceState`.

- [ ] **Step 2: Add Button Loading State & Enhance Payment Badges**
In `website/src/views/TenantPaymentsView.vue`:
  1. Add `payingBillId` ref to display a loading spinner while checkout session is initializing.
  2. Update method and status badge rendering to cleanly distinguish `PENDING VERIFICATION` (Amber badge) vs `VERIFIED & SETTLED` (Emerald badge) and `ADYEN ONLINE` method badges.

- [ ] **Step 3: Verify website builds**
Run: `npm --prefix website run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."

---

### Task 4: Website Admin Billing & Collections: 3-Tab Architecture with Verification Queue

**Files:**
- Modify: `website/src/views/BillingPaymentsView.vue`

- [ ] **Step 1: Refactor Tab Navigation to 3 Tabs**
In `website/src/views/BillingPaymentsView.vue`:
  - Update `activeTab` type to `'record' | 'verify' | 'history'`.
  - Add tab button for `Online Verification (Adyen)` with a dynamic badge showing count of pending payments (e.g. `Online Verification (2)`).

- [ ] **Step 2: Build the Online Verification Queue Table**
In `website/src/views/BillingPaymentsView.vue`:
  - Fetch payments from `GET /api/admin/payments`.
  - Filter for `verification_status === 'Pending Verification'`.
  - Render an audit-ready data table with: Date Paid, Tenant Name, Unit/Room, Amount, Payment Method (`Adyen Online`), Transaction Reference, and Action Buttons (`Approve & Settle`, `Reject`).
  - Wire `Approve & Settle` to trigger `SecondaryConfirmModal` (requiring PIN `1234`), calling `PATCH /api/admin/payments/:id/verify { verification_status: 'Verified' }`, showing a toast, and reloading both the pending payments and the collection history.
  - Wire `Reject` to prompt confirmation, call the endpoint with `verification_status: 'Rejected'`, and show warning toast.

- [ ] **Step 3: Verify website builds**
Run: `npm --prefix website run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."

---

### Task 5: Website Executive Dashboard Pending Verification Integration

**Files:**
- Modify: `website/src/views/AdminOverviewView.vue`

- [ ] **Step 1: Add Pending Verification Alert Indicator**
In `website/src/views/AdminOverviewView.vue`:
  - Fetch payments via `api.get('/admin/payments')`.
  - Calculate `pendingVerificationCount = payments.filter(p => p.verification_status === 'Pending Verification').length`.
  - If `pendingVerificationCount > 0`, render an alert card or badge linking directly to `/admin/billing?tab=verify` to inform the administrator of incoming online payments requiring approval.

- [ ] **Step 2: Verify website builds**
Run: `npm --prefix website run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."

---

### Task 6: End-to-End System Verification & Build Check

**Files:**
- Test all backend and frontend builds.

- [ ] **Step 1: Run Full Project Build**
Run:
```bash
npm run build:backend
npm run build:website
```
Expected: Both backend and website build cleanly with 0 TypeScript/compilation errors.

- [ ] **Step 2: Verify RBAC Script**
Run: `npm run verify:rbac`
Expected: PASS with all permission checks intact.

- [ ] **Step 3: Commit (if auto_commit enabled)**
Check `.agent/config.yml` for `auto_commit`.
If `auto_commit: false`: print "Skipping commit (auto_commit: false)."
