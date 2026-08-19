# Mock Adyen GCash Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a mock Adyen gateway system that simulates real-life GCash payment checkout, session redirection, webhook updates, and administrator verification workflows in full alignment with Capstone rules BR-016 and BR-017.

**Architecture:** A lightweight server-side in-memory session manager on the backend API handles checkout initialization, redirecting the tenant's browser to a simulated GCash payment page. Completing checkout triggers a simulated webhook callback that records the transaction in `Pending Verification` status and notifies the administrator.

**Tech Stack:** Vue 3 (Composition API), Express, TypeScript, Supabase PostgreSQL, Lucide Icons.

---

### Task 1: Environment & Config Update

Expose mock Adyen API configuration parameters in the backend config files.

**Files:**
* Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Update environment configuration in backend**
  Modify [env.ts](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/backend/src/config/env.ts) to export mock Adyen credentials.

  Add the following property to the `config` object (around line 83):
  ```typescript
  adyen: {
    apiKey: optional('ADYEN_API_KEY', 'mock_api_key_for_testing'),
    merchantAccount: optional('ADYEN_MERCHANT_ACCOUNT', 'mock_merchant_account'),
    environment: optional('ADYEN_ENVIRONMENT', 'TEST'),
    clientKey: optional('ADYEN_CLIENT_KEY', 'mock_client_key'),
    hmacKey: optional('ADYEN_HMAC_KEY', 'mock_hmac_key'),
  },
  ```

- [ ] **Step 2: Add values to environment template**
  Modify [.env.example](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/.env.example) to verify configuration settings match.

- [ ] **Step 3: Run typescript compiler to verify types**
  Run: `npm run build:backend` in the workspace root.
  Expected: PASS without compile errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
  Check `.agent/config.yml` for `auto_commit` setting.
  Since `auto_commit: false`, print: "Skipping commit (auto_commit: false)."

---

### Task 2: Create Mock Adyen Payment Service

Build the backend payment integration layer that implements the transient checkout sessions and mock payment completion database operations.

**Files:**
* Create: `backend/src/services/adyenService.ts`

- [ ] **Step 1: Write the mock Adyen payment service**
  Create [adyenService.ts](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/backend/src/services/adyenService.ts) and add the following content:
  ```typescript
  /**
   * @file services/adyenService.ts
   * @description Server-side service to simulate the Adyen GCash checkout flow.
   * @systemBibleRef Section 12 (Payment Types)
   * @businessRules  BR-016 (Online Payment), BR-017 (Payment Verification)
   * @requirements   FR-015 (Online Payments)
   */
  import { db } from '../config/db.js';
  import { ApiError } from '../utils/ApiError.js';
  import { recordAudit } from './auditService.js';

  export interface SessionDetails {
    billId: string;
    tenantProfileId: string;
    amount: number;
  }

  const checkoutSessions = new Map<string, SessionDetails>();

  export const adyenService = {
    /** Creates a temporary mock checkout session */
    createMockCheckoutSession(billId: string, tenantProfileId: string, amount: number) {
      const sessionId = `mock_sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      checkoutSessions.set(sessionId, { billId, tenantProfileId, amount });
      const redirectUrl = `/api/public/payments/mock-gateway?sessionId=${sessionId}`;
      return { sessionId, redirectUrl };
    },

    /** Retrieves active session metadata */
    getCheckoutSession(sessionId: string): SessionDetails | undefined {
      return checkoutSessions.get(sessionId);
    },

    /** Completes the mock checkout, inserts the pending verification payment row, and notifies the administrator */
    async completeMockPayment(sessionId: string, ipAddress: string | null) {
      const session = checkoutSessions.get(sessionId);
      if (!session) {
        throw ApiError.notFound('Payment session has expired or is invalid.');
      }

      // Resolve room_id from bill to fulfill the payments table schema
      const { data: bill, error: billError } = await db
        .from('bills')
        .select('room_id')
        .eq('id', session.billId)
        .single();

      if (billError || !bill) {
        throw ApiError.notFound('Associated bill not found.');
      }

      const transactionReference = `MOCK-GCASH-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Insert payment into database in Pending Verification state (BR-017)
      const { data: payment, error: payError } = await db
        .from('payments')
        .insert({
          bill_id: session.billId,
          tenant_profile_id: session.tenantProfileId,
          room_id: bill.room_id,
          amount: session.amount,
          payment_method: 'Adyen Online',
          payment_source: 'GCash Sandbox',
          verification_status: 'Pending Verification',
          transaction_reference: transactionReference,
          paid_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (payError) {
        throw ApiError.internal(`Failed to log payment: ${payError.message}`);
      }

      // Trigger audit log entry
      await recordAudit({
        actorProfileId: session.tenantProfileId,
        action: 'PAYMENT_RECORD',
        entityType: 'PAYMENT',
        entityId: payment.id,
        newValues: {
          bill_id: session.billId,
          amount: session.amount,
          transaction_reference: transactionReference,
          verification_status: 'Pending Verification'
        },
        ipAddress
      });

      // Dispatch notification to administrator
      const { data: admins } = await db
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (admins && admins.length > 0) {
        await db.from('notifications').insert({
          recipient_profile_id: admins[0].id,
          title: 'New Online GCash Payment',
          message: `Tenant has submitted payment of ₱${session.amount.toLocaleString()} for verification (Ref: ${transactionReference}).`,
          type: 'Payment',
          priority: 'Medium',
          is_read: false
        });
      }

      checkoutSessions.delete(sessionId);
      return { success: true, paymentReference: transactionReference };
    }
  };
  ```

- [ ] **Step 2: Run typescript compiler to verify types**
  Run: `npm run build:backend` in the workspace root.
  Expected: PASS without compile errors.

- [ ] **Step 3: Commit (if auto_commit enabled)**
  Since `auto_commit: false`, print: "Skipping commit (auto_commit: false)."

---

### Task 3: Mount Tenant Checkout Endpoint

Add the checkout session generation route to the tenant controller.

**Files:**
* Modify: `backend/src/routes/tenant.ts`

- [ ] **Step 1: Add checkout route in tenant routes**
  Edit [tenant.ts](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/backend/src/routes/tenant.ts).
  Import the `adyenService` and add the route:
  
  Imports (add near top):
  ```typescript
  import { adyenService } from '../services/adyenService.js';
  ```

  Mount the endpoint (add near other endpoints, e.g., below notifications route):
  ```typescript
  const checkoutSchema = z.object({
    billId: z.string().uuid(),
  });

  /**
   * POST /api/tenant/payments/checkout
   * Initiates a mock checkout session for an unpaid bill.
   */
  router.post(
    '/tenant/payments/checkout',
    requirePermission(PERMISSIONS.PAYMENT_READ_OWN),
    asyncHandler(async (req, res) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        throw ApiError.validation('Invalid checkout payload.', parsed.error.flatten().fieldErrors);
      }
      const { billId } = parsed.data;

      // Validate the bill belongs to the tenant and is unpaid
      const { data: bill, error } = await db
        .from('bills')
        .select('id, total_amount, status, tenant_profile_id')
        .eq('id', billId)
        .single();

      if (error || !bill) {
        throw ApiError.notFound('Bill not found.');
      }

      if (bill.tenant_profile_id !== req.user!.profileId) {
        throw ApiError.forbidden('You are not authorized to pay this bill.');
      }

      if (bill.status === 'Paid') {
        throw ApiError.conflict('This bill is already paid.');
      }

      // Initialize the mock Adyen checkout session
      const { sessionId, redirectUrl } = adyenService.createMockCheckoutSession(
        bill.id,
        req.user!.profileId,
        bill.total_amount
      );

      // Create an audit entry for checkout initiation
      await auditFromRequest(req, {
        action: 'PAYMENT_RECORD',
        entityType: 'BILL',
        entityId: bill.id,
        newValues: { status: 'Checkout Session Initiated', sessionId }
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          // Prepend full backend address so frontend can redirect correctly
          redirectUrl: `http://localhost:${config.port}${redirectUrl}`
        }
      });
    })
  );
  ```

- [ ] **Step 2: Run compiler check**
  Run: `npm run build:backend`
  Expected: PASS

- [ ] **Step 3: Commit (if auto_commit enabled)**
  Since `auto_commit: false`, print: "Skipping commit (auto_commit: false)."

---

### Task 4: Mount Public GCash Mock Gateway Routes

Create the public mock payment screens and handlers so the tenant gets redirected to a simulation of GCash and returned to the application safely.

**Files:**
* Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Add mock gateway routes in public routes**
  Edit [public.ts](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/backend/src/routes/public.ts).
  Import the `adyenService`, `clientIp` (from auditService) and configure the routes.

  Add imports:
  ```typescript
  import { adyenService } from '../services/adyenService.js';
  import { clientIp } from '../services/auditService.js';
  ```

  Add endpoints at the bottom of the file (before `export default router;`):
  ```typescript
  /**
   * GET /api/public/payments/mock-gateway
   * Serves a minimalist simulated GCash authorization gateway page.
   */
  router.get(
    '/public/payments/mock-gateway',
    asyncHandler(async (req, res) => {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        throw ApiError.validation('Missing sessionId parameter.');
      }

      const session = adyenService.getCheckoutSession(sessionId);
      if (!session) {
        res.status(404).send(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h2>Session Expired</h2>
              <p>This payment session has expired or is invalid. Please return to the tenant portal.</p>
            </body>
          </html>
        `);
        return;
      }

      // Renders a simple, clean, mock GCash payment screen
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GCash Online Payment Sandbox</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(9, 30, 66, 0.15); width: 100%; max-width: 400px; text-align: center; border: 1px solid #dfe1e6; }
            .gcash-logo { color: #0052cc; font-size: 24px; font-weight: 800; margin-bottom: 24px; letter-spacing: -0.5px; }
            .merchant { font-size: 14px; color: #5e6c84; margin-bottom: 8px; }
            .amount { font-size: 28px; font-weight: bold; color: #172b4d; margin-bottom: 24px; font-feature-settings: "tnum"; }
            .btn { background-color: #0052cc; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; transition: background-color 0.2s; }
            .btn:hover { background-color: #0747a6; }
            .cancel { display: block; margin-top: 16px; font-size: 12px; color: #5e6c84; text-decoration: none; }
            .cancel:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="gcash-logo">G) GCash <span style="font-size:12px; color:#5e6c84; font-weight:normal;">Sandbox via Adyen</span></div>
            <div class="merchant">Fe Galang Da Silva Boarding House</div>
            <div class="amount">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            
            <form method="POST" action="/api/public/payments/mock-gateway/complete">
              <input type="hidden" name="sessionId" value="${sessionId}" />
              <button type="submit" class="btn">Authorize & Pay</button>
            </form>
            <a href="http://localhost:5174/tenant/portal?status=cancelled" class="cancel">Cancel Payment</a>
          </div>
        </body>
        </html>
      `);
    })
  );

  const mockGatewayCompleteSchema = z.object({
    sessionId: z.string(),
  });

  /**
   * POST /api/public/payments/mock-gateway/complete
   * Handles mock redirection response to process simulation checkout completion.
   */
  router.post(
    '/public/payments/mock-gateway/complete',
    asyncHandler(async (req, res) => {
      const parsed = mockGatewayCompleteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw ApiError.validation('Invalid callback session ID.');
      }

      const { sessionId } = parsed.data;
      const ip = clientIp(req);

      const result = await adyenService.completeMockPayment(sessionId, ip);

      // Redirect back to the website workspace
      res.redirect(`http://localhost:5174/tenant/portal?status=success&ref=${result.paymentReference}`);
    })
  );
  ```

- [ ] **Step 2: Verify compiling backend**
  Run: `npm run build:backend`
  Expected: PASS

- [ ] **Step 3: Commit (if auto_commit enabled)**
  Since `auto_commit: false`, print: "Skipping commit (auto_commit: false)."

---

### Task 5: Integrate Checkout Flow in Tenant Portal Front-End

Modify the resident portal workspace to load real bills, initiate payment redirects, and display transaction submission results.

**Files:**
* Modify: `website/src/views/TenantPortalView.vue`

- [ ] **Step 1: Update API retrieval and payment flow**
  Modify [TenantPortalView.vue](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/website/src/views/TenantPortalView.vue).
  We need to replace the static mocks with reactive API calls for bills, payments, and the payment initiation action.

  Add the setup reactive state updates in the `<script setup>` block:
  ```typescript
  import { onMounted } from 'vue';
  import { api } from '@/lib/api';

  const outstandingBills = ref<any[]>([]);
  const loadingBills = ref(false);

  // Read status and ref from URL query parameters
  onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const refParam = params.get('ref');

    if (statusParam === 'success' && refParam) {
      submissionNotice.value = `Online GCash remittance of Reference #${refParam} has been successfully submitted! It is now pending verification by Landlady Fe Galang Da Silva.`;
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusParam === 'cancelled') {
      alert('Online payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    await fetchTenantBills();
    await fetchTenantPayments();
  });

  async function fetchTenantBills() {
    loadingBills.value = true;
    try {
      const data = await api.get<any[]>('/tenant/my-bills');
      outstandingBills.value = data ?? [];
      
      // Sync tenantData derived properties with the latest due bill if any
      const dueBill = data?.find(b => b.status === 'Pending' || b.status === 'Due');
      if (dueBill) {
        tenantData.value.baseRent = dueBill.rent_amount;
        tenantData.value.waterFee = dueBill.water_amount;
        tenantData.value.totalAmountDue = dueBill.total_amount;
        tenantData.value.dueDate = new Date(dueBill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        tenantData.value.dueBadgeText = dueBill.status.toUpperCase();
        tenantData.value.dueDaysRemaining = 'Awaiting payment';
      } else {
        tenantData.value.baseRent = 0;
        tenantData.value.waterFee = 0;
        tenantData.value.totalAmountDue = 0;
        tenantData.value.dueDate = 'N/A';
        tenantData.value.dueBadgeText = 'NO DUE BILL';
        tenantData.value.dueDaysRemaining = 'Settled';
      }
    } catch (err: any) {
      console.error('Failed to load bills:', err.message);
    } finally {
      loadingBills.value = false;
    }
  }

  async function fetchTenantPayments() {
    try {
      const data = await api.get<any[]>('/tenant/my-payments');
      paymentHistory.value = (data ?? []).map(p => ({
        id: p.id,
        invoiceRef: p.transaction_reference,
        datePaid: new Date(p.paid_at || p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        billingPeriod: 'Monthly Bill',
        amountPaid: p.amount,
        paymentMethod: p.payment_method.toUpperCase(),
        status: p.verification_status.toUpperCase()
      }));
    } catch (err: any) {
      console.error('Failed to load payments:', err.message);
    }
  }

  async function payBillOnline(billId: string) {
    try {
      const res = await api.post<{ sessionId: string; redirectUrl: string }>('/tenant/payments/checkout', { billId });
      if (res && res.redirectUrl) {
        // Redirect browser to the simulated gateway redirect Url
        window.location.href = res.redirectUrl;
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  }
  ```

- [ ] **Step 2: Update Vue template sections**
  Find the billing tab template in [TenantPortalView.vue](file:///c:/Users/seanjerve/OneDrive/Desktop/hivelet/website/src/views/TenantPortalView.vue) (around line 397-495). Replace the static custom form with the bills list and checkout buttons.
  
  Unpaid Bills List layout block:
  ```html
  <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
    <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-3">
      <h3 class="font-bold text-sm uppercase tracking-wide text-[#172b4d] flex items-center gap-2">
        <CreditCard class="w-4 h-4 text-[#0c66e4]" />
        <span>Outstanding Bills</span>
      </h3>
      <span class="px-2 py-0.5 text-[10px] font-bold bg-[#0c66e4] text-white rounded">
        ACTIVE BILLING ACTIONS
      </span>
    </div>

    <div v-if="loadingBills" class="text-xs text-[#5e6c84] py-4">Loading outstanding bills...</div>
    <div v-else-if="outstandingBills.filter(b => b.status !== 'Paid').length === 0" class="text-xs text-[#5e6c84] py-4">
      🎉 You have no outstanding bills. All accounts are settled!
    </div>
    <div v-else class="space-y-4">
      <div v-for="bill in outstandingBills.filter(b => b.status !== 'Paid')" :key="bill.id" class="p-4 border border-[#dfe1e6] rounded bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div class="text-xs space-y-1">
          <div class="font-bold text-[#172b4d]">Due: {{ new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
          <div class="text-[#5e6c84]">Base Rent: ₱{{ bill.rent_amount.toLocaleString() }} | Water Fee: ₱{{ bill.water_amount.toLocaleString() }}</div>
          <div class="font-semibold text-[#0c66e4]">Total Amount: ₱{{ bill.total_amount.toLocaleString() }}</div>
        </div>
        <button @click="payBillOnline(bill.id)" class="px-4 py-2 bg-[#172b4d] hover:bg-[#0c66e4] text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors">
          <CreditCard class="w-3.5 h-3.5" />
          <span>Pay Online (GCash)</span>
        </button>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Verify compiling website**
  Run: `npm run build:website` in the workspace root.
  Expected: PASS without typescript compiler errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
  Since `auto_commit: false`, print: "Skipping commit (auto_commit: false)."

---

### Task 6: Verification & Testing

Execute the complete end-to-end sandbox verification routine.

- [ ] **Step 1: Start frontend and backend development servers**
  Start the servers in separate terminals:
  * Backend: `npm run dev:backend`
  * Website: `npm run dev:website`
  Expected: API listening on port 5000, Website listening on port 5174.

- [ ] **Step 2: Sign in as active tenant**
  Navigate to: `http://localhost:5174/login`
  Credentials: `mark.cruz@gmail.com` / `Hivelet@Tenant2026`
  Expected: Successful redirect to the tenant portal.

- [ ] **Step 3: Complete payment transaction**
  Go to Payments & Billing tab, select an unpaid bill and click **Pay Online (GCash)**.
  Click **Authorize & Pay** on the sandbox GCash page.
  Expected: Redirected back to tenant portal with success message, and the transaction is displayed with a `PENDING VERIFICATION` badge.

- [ ] **Step 4: Verify as Administrator**
  Sign out, then sign back in as Administrator: `admin@hivelet.ph` / `Hivelet@Admin2026`.
  Navigate to the Payment Ledger. Verify the pending payment appears.
  Click **Verify** and confirm the status switches to verified and updates ledger totals.
  Expected: Bill marks as Paid and appears on the income log.
