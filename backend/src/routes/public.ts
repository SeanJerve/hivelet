/**
 * @file routes/public.ts
 * @description Endpoints available to unauthenticated visitors.
 * @systemBibleRef Section 4 (Public Visitor), Section 7 (Room Status), Section 9 (Inquiry Workflow)
 * @businessRules  BR-006 Reservation, BR-007 Website Visibility
 * @requirements   FR-003 Public Website, FR-004 Public Inquiry
 *
 * Everything here is deliberately non-sensitive. The room projection below is
 * an allow-list: a guest never receives occupant names, tenant contacts,
 * balances, or internal pricing history, because System Bible Section 4 says a
 * public visitor "cannot access private tenant information".
 */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { auditFromRequest, clientIp } from '../services/auditService.js';
import { adyenService } from '../services/adyenService.js';
import QRCode from 'qrcode';

const router = Router();

/**
 * Columns a public visitor may see. Note the absence of any tenant linkage.
 */
const PUBLIC_ROOM_COLUMNS =
  'id, room_number, floor, cluster_code, room_type, description, capacity, ' +
  'current_price, operational_status, visibility_status, available_from, is_linda_unit, ' +
  'room_photos (id, file_url, is_primary, display_order)';

/**
 * GET /api/public/rooms
 *
 * BR-007 — operational status and website visibility are separate concerns. A
 * guest sees only Published rooms, but a room stays visible while Reserved,
 * Occupied or Under Maintenance so the public status is communicated honestly.
 *
 * An administrator calling the same endpoint also sees Hidden rooms, which is
 * why `optionalAuth` is used rather than leaving the route fully anonymous.
 */
router.get(
  '/public/rooms',
  optionalAuth,
  requirePermission(PERMISSIONS.ROOM_VIEW_PUBLIC),
  asyncHandler(async (req, res) => {
    let query = db.from('rooms').select(PUBLIC_ROOM_COLUMNS).order('room_number');

    if (req.role !== 'admin') {
      query = query.eq('visibility_status', 'Published');
    }

    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);

    res.status(200).json({
      success: true,
      data: data ?? [],
      meta: { scope: req.role === 'admin' ? 'all' : 'published-only' },
    });
  })
);

/** GET /api/public/rooms/:roomId — single published room. */
router.get(
  '/public/rooms/:roomId',
  optionalAuth,
  requirePermission(PERMISSIONS.ROOM_VIEW_PUBLIC),
  asyncHandler(async (req, res) => {
    let query = db.from('rooms').select(PUBLIC_ROOM_COLUMNS).eq('id', req.params.roomId);

    if (req.role !== 'admin') {
      query = query.eq('visibility_status', 'Published');
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw ApiError.internal(error.message);
    if (!data) throw ApiError.notFound('Room not found.');

    res.status(200).json({ success: true, data });
  })
);

/** GET /api/public/clusters — BR-032 canonical unit grouping. */
router.get(
  '/public/clusters',
  optionalAuth,
  requirePermission(PERMISSIONS.PROPERTY_VIEW_PUBLIC),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('clusters')
      .select('code, name, display_order')
      .order('display_order');

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const inquirySchema = z.object({
  roomId: z.string().uuid('A valid room must be selected.'),
  prospectName: z.string().min(2).max(120),
  prospectEmail: z.string().email(),
  prospectPhone: z.string().min(7).max(30),
  message: z.string().min(5).max(2000),
});

/**
 * POST /api/public/inquiries
 *
 * FR-004 — a visitor may submit an inquiry "when that room is accepting
 * inquiries". BR-006 — a Reserved room must not accept new inquiries, which is
 * enforced here on the server rather than by hiding a button in the UI.
 */
router.post(
  '/public/inquiries',
  optionalAuth,
  requirePermission(PERMISSIONS.INQUIRY_CREATE),
  asyncHandler(async (req, res) => {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid inquiry payload.', parsed.error.flatten().fieldErrors);
    }
    const input = parsed.data;

    const { data: room, error: roomError } = await db
      .from('rooms')
      .select('id, room_number, operational_status, visibility_status')
      .eq('id', input.roomId)
      .maybeSingle<{
        id: string;
        room_number: string;
        operational_status: string;
        visibility_status: string;
      }>();

    if (roomError) throw ApiError.internal(roomError.message);
    if (!room || room.visibility_status !== 'Published') {
      throw ApiError.notFound('Room not found.');
    }

    // BR-006 — reservation blocks new inquiries for that room.
    if (room.operational_status === 'Reserved') {
      throw ApiError.conflict(
        `Room ${room.room_number} is currently reserved and is not accepting new inquiries.`
      );
    }

    const { data, error } = await db
      .from('inquiries')
      .insert({
        room_id: input.roomId,
        prospect_name: input.prospectName,
        prospect_email: input.prospectEmail,
        prospect_phone: input.prospectPhone,
        message: input.message,
        status: 'Pending',
      })
      .select('id, room_id, prospect_name, status, created_at')
      .single();

    if (error) throw ApiError.internal(error.message);

    // Seed the conversation thread so the administrator sees the original
    // message in context (System Bible Section 16).
    await db.from('inquiry_messages').insert({
      inquiry_id: data.id,
      sender_id: req.user?.profileId ?? null,
      sender_name: input.prospectName,
      message_body: input.message,
    });

    await auditFromRequest(req, {
      action: 'INQUIRY_CREATE',
      entityType: 'INQUIRY',
      entityId: data.id,
      newValues: { room_id: input.roomId, prospect_name: input.prospectName },
    });

    res.status(201).json({ success: true, data });
  })
);

/**
 * GET /api/public/payments/mock-gateway
 * Serves a simulated GCash payment authorization screen.
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

    const clientBaseUrl = session.returnUrl ? session.returnUrl.split('?')[0] : (process.env.CLIENT_URL || 'http://localhost:5173');
    const cancelUrl = `${session.returnUrl || clientBaseUrl + '/tenant'}?status=cancelled`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
      "style-src 'self' 'unsafe-inline' https: fonts.googleapis.com; " +
      "font-src 'self' https: fonts.gstatic.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' http://localhost:* ws://localhost:* https:;"
    );
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>GCash — Secure Payment Gateway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          body {
            background-color: #f2f4f8;
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            color: #172b4d;
          }

          /* Top GCash Signature Blue Bar */
          .gcash-top-bar {
            width: 100%;
            background: linear-gradient(135deg, #005ce6 0%, #0047ba 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 10px rgba(0, 92, 230, 0.25);
          }
          .gcash-logo-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .gcash-symbol {
            width: 34px;
            height: 34px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 20px;
            color: #005ce6;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          }
          .gcash-brand-text {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .gcash-secure-tag {
            font-size: 11px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 10px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 5px;
          }

          /* Merchant Info Strip */
          .merchant-strip {
            width: 100%;
            max-width: 460px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .merchant-name {
            font-size: 13px;
            font-weight: 700;
            color: #172b4d;
          }
          .merchant-sub {
            font-size: 11px;
            color: #6b778c;
            margin-top: 2px;
          }
          .amount-due-badge {
            text-align: right;
          }
          .amount-due-label {
            font-size: 10px;
            font-weight: 700;
            color: #6b778c;
            text-transform: uppercase;
          }
          .amount-due-value {
            font-size: 16px;
            font-weight: 800;
            color: #005ce6;
          }

          /* Main Mobile-First Checkout Card */
          .checkout-container {
            width: 100%;
            max-width: 460px;
            background: white;
            padding: 24px 22px;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            margin-bottom: 24px;
          }

          /* Steps Panel Visibility */
          .checkout-step {
            display: none;
            animation: fadeIn 0.25s ease-in-out forwards;
          }
          .checkout-step.active {
            display: block;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .step-title {
            font-size: 18px;
            font-weight: 800;
            color: #091e42;
            margin-bottom: 4px;
          }
          .step-subtitle {
            font-size: 12px;
            color: #5e6c84;
            margin-bottom: 20px;
            line-height: 1.4;
          }

          /* Phone Input Group */
          .phone-input-group {
            display: flex;
            align-items: center;
            border: 2px solid #dfe1e6;
            border-radius: 12px;
            overflow: hidden;
            background: #fafbfc;
            transition: all 0.2s;
            margin-bottom: 16px;
          }
          .phone-input-group:focus-within {
            border-color: #005ce6;
            background: white;
            box-shadow: 0 0 0 3px rgba(0, 92, 230, 0.15);
          }
          .country-code {
            padding: 14px 14px;
            background: #ebecf0;
            font-size: 15px;
            font-weight: 700;
            color: #172b4d;
            border-right: 1px solid #dfe1e6;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .phone-input {
            flex: 1;
            padding: 14px;
            font-size: 16px;
            font-weight: 700;
            color: #172b4d;
            border: none;
            outline: none;
            background: transparent;
            letter-spacing: 1px;
          }

          /* OTP 6-Box Grid */
          .otp-boxes {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin: 20px 0;
          }
          .otp-box {
            width: 48px;
            height: 54px;
            border: 2px solid #dfe1e6;
            border-radius: 10px;
            text-align: center;
            font-size: 22px;
            font-weight: 800;
            color: #005ce6;
            outline: none;
            background: #fafbfc;
            transition: all 0.2s;
          }
          .otp-box:focus {
            border-color: #005ce6;
            background: white;
            box-shadow: 0 0 0 3px rgba(0, 92, 230, 0.15);
          }

          /* MPIN 4-Dot Display */
          .mpin-display {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 24px 0;
          }
          .mpin-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid #005ce6;
            background: transparent;
            transition: all 0.15s;
          }
          .mpin-dot.filled {
            background: #005ce6;
            transform: scale(1.15);
          }

          /* Virtual Keypad */
          .keypad-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .keypad-key {
            padding: 14px 0;
            background: #f4f5f7;
            border: 1px solid #dfe1e6;
            border-radius: 10px;
            font-size: 20px;
            font-weight: 700;
            color: #172b4d;
            cursor: pointer;
            transition: all 0.1s;
            user-select: none;
          }
          .keypad-key:active {
            background: #005ce6;
            color: white;
            transform: scale(0.96);
          }

          /* Summary Review Rows */
          .review-card {
            background: #f4f5f7;
            border: 1px solid #dfe1e6;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .review-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            padding: 4px 0;
          }
          .review-label {
            color: #5e6c84;
            font-weight: 500;
          }
          .review-value {
            color: #172b4d;
            font-weight: 700;
          }
          .review-total {
            border-top: 1px solid #dfe1e6;
            padding-top: 8px;
            margin-top: 8px;
            font-size: 15px;
            font-weight: 800;
            color: #005ce6;
          }

          /* Buttons */
          .btn-gcash-primary {
            width: 100%;
            padding: 15px;
            background: #005ce6;
            color: white;
            border: none;
            border-radius: 28px;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.3px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 92, 230, 0.3);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .btn-gcash-primary:hover {
            background: #0047ba;
            box-shadow: 0 6px 16px rgba(0, 92, 230, 0.4);
          }
          .btn-gcash-primary:active {
            transform: scale(0.98);
          }

          .demo-helper-btn {
            width: 100%;
            padding: 8px;
            background: #ebf3ff;
            border: 1px dashed #005ce6;
            color: #005ce6;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            margin-bottom: 16px;
            transition: all 0.15s;
          }
          .demo-helper-btn:hover {
            background: #deebff;
          }

          /* Official Receipt Card */
          .receipt-icon {
            width: 64px;
            height: 64px;
            background: #e3fcef;
            color: #00875a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 900;
            margin: 0 auto 16px auto;
          }

          .cancel-footer {
            margin-top: 16px;
            text-align: center;
          }
          .cancel-link {
            font-size: 12px;
            color: #6b778c;
            text-decoration: none;
            font-weight: 600;
          }
          .cancel-link:hover {
            color: #172b4d;
            text-decoration: underline;
          }

          .bsp-footer {
            margin-top: 20px;
            font-size: 10px;
            color: #8993a4;
            text-align: center;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>

        <!-- GCash Header Bar -->
        <div class="gcash-top-bar">
          <div class="gcash-logo-wrapper">
            <div class="gcash-symbol">G</div>
            <div class="gcash-brand-text">GCash</div>
          </div>
          <div class="gcash-secure-tag">
            <span>🔒</span>
            <span>Secure Web Checkout</span>
          </div>
        </div>

        <!-- Merchant Summary Banner -->
        <div class="merchant-strip">
          <div>
            <div class="merchant-name">Fe Galang Da Silva Boarding House</div>
            <div class="merchant-sub">Ref: ${sessionId.substring(0, 16)} • <span id="timer">09:59</span></div>
          </div>
          <div class="amount-due-badge">
            <div class="amount-due-label">Total Due</div>
            <div class="amount-due-value">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <!-- Checkout Card Container -->
        <div class="checkout-container">

          <!-- STEP 1: Phone Number -->
          <div id="step-1" class="checkout-step active">
            <div class="step-title">Login with GCash</div>
            <div class="step-subtitle">Enter your 11-digit GCash-registered mobile number to proceed.</div>

            <button type="button" class="demo-helper-btn" onclick="fillDemoPhone()">
              ✨ Auto-fill Active Tenant Number (+63 906 354 9001)
            </button>

            <div class="phone-input-group">
              <div class="country-code">🇵🇭 +63</div>
              <input
                type="tel"
                id="phone-input"
                class="phone-input"
                placeholder="9XX XXX XXXX"
                maxlength="12"
                value="906 354 9001"
              >
            </div>

            <button type="button" class="btn-gcash-primary" onclick="goToStep(2)">
              NEXT
            </button>
          </div>

          <!-- STEP 2: 6-Digit SMS OTP -->
          <div id="step-2" class="checkout-step">
            <div class="step-title">Authentication Code</div>
            <div class="step-subtitle">
              We sent a 6-digit code to <strong id="display-phone">+63 906 ••• 9001</strong>.
            </div>

            <button type="button" class="demo-helper-btn" onclick="fillDemoOtp()">
              ✨ Auto-fill OTP Code (123456)
            </button>

            <div class="otp-boxes">
              <input type="text" class="otp-box" maxlength="1" id="otp-1" oninput="onOtpInput(1)" value="1">
              <input type="text" class="otp-box" maxlength="1" id="otp-2" oninput="onOtpInput(2)" value="2">
              <input type="text" class="otp-box" maxlength="1" id="otp-3" oninput="onOtpInput(3)" value="3">
              <input type="text" class="otp-box" maxlength="1" id="otp-4" oninput="onOtpInput(4)" value="4">
              <input type="text" class="otp-box" maxlength="1" id="otp-5" oninput="onOtpInput(5)" value="5">
              <input type="text" class="otp-box" maxlength="1" id="otp-6" oninput="onOtpInput(6)" value="6">
            </div>

            <div style="font-size: 11px; color: #6b778c; text-align: center; margin-bottom: 18px;">
              Didn't receive code? <strong style="color: #005ce6;">Resend Code (<span id="resend-sec">48</span>s)</strong>
            </div>

            <button type="button" class="btn-gcash-primary" onclick="goToStep(3)">
              SUBMIT CODE
            </button>
          </div>

          <!-- STEP 3: 4-Digit MPIN -->
          <div id="step-3" class="checkout-step">
            <div class="step-title">Enter your 4-Digit MPIN</div>
            <div class="step-subtitle">Never share your MPIN or One-Time PIN (OTP) with anyone.</div>

            <button type="button" class="demo-helper-btn" onclick="fillDemoMpin()">
              ✨ Auto-enter MPIN (1234)
            </button>

            <div class="mpin-display">
              <div class="mpin-dot filled" id="pdot-1"></div>
              <div class="mpin-dot filled" id="pdot-2"></div>
              <div class="mpin-dot filled" id="pdot-3"></div>
              <div class="mpin-dot filled" id="pdot-4"></div>
            </div>

            <div class="keypad-grid">
              <button type="button" class="keypad-key" onclick="typePin('1')">1</button>
              <button type="button" class="keypad-key" onclick="typePin('2')">2</button>
              <button type="button" class="keypad-key" onclick="typePin('3')">3</button>
              <button type="button" class="keypad-key" onclick="typePin('4')">4</button>
              <button type="button" class="keypad-key" onclick="typePin('5')">5</button>
              <button type="button" class="keypad-key" onclick="typePin('6')">6</button>
              <button type="button" class="keypad-key" onclick="typePin('7')">7</button>
              <button type="button" class="keypad-key" onclick="typePin('8')">8</button>
              <button type="button" class="keypad-key" onclick="typePin('9')">9</button>
              <button type="button" class="keypad-key" onclick="clearPin()">C</button>
              <button type="button" class="keypad-key" onclick="typePin('0')">0</button>
              <button type="button" class="keypad-key" onclick="backPin()">⌫</button>
            </div>

            <button type="button" class="btn-gcash-primary" onclick="goToStep(4)">
              NEXT
            </button>
          </div>

          <!-- STEP 4: Review & Final Payment -->
          <div id="step-4" class="checkout-step">
            <div class="step-title">YOU ARE ABOUT TO PAY</div>
            <div class="step-subtitle">Please verify payment details before authorizing.</div>

            <div class="review-card">
              <div class="review-row">
                <span class="review-label">Available GCash Balance:</span>
                <span class="review-value" style="color: #00875a;">₱14,850.00</span>
              </div>
              <div class="review-row">
                <span class="review-label">Pay To:</span>
                <span class="review-value">Fe Galang Da Silva BH</span>
              </div>
              <div class="review-row">
                <span class="review-label">Room Dues & Water:</span>
                <span class="review-value">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Convenience Fee:</span>
                <span class="review-value" style="color: #00875a;">FREE (₱0.00)</span>
              </div>
              <div class="review-row review-total">
                <span>Total Payment:</span>
                <span>₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button type="button" id="pay-btn" class="btn-gcash-primary" onclick="submitFinalPayment()">
              PAY ₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </button>
          </div>

          <!-- STEP 5: Official Success Receipt -->
          <div id="step-5" class="checkout-step">
            <div class="receipt-icon">✓</div>
            <div class="step-title" style="text-align: center; color: #00875a;">Payment Successful!</div>
            <div class="step-subtitle" style="text-align: center; margin-bottom: 16px;">
              Your remittance has been authorized and queued for Landlady verification.
            </div>

            <div class="review-card">
              <div class="review-row">
                <span class="review-label">Reference No:</span>
                <span class="review-value" id="receipt-ref" style="font-family: monospace;">ADYEN-GCASH-XXXX</span>
              </div>
              <div class="review-row">
                <span class="review-label">Merchant:</span>
                <span class="review-value">Fe Galang Da Silva BH</span>
              </div>
              <div class="review-row">
                <span class="review-label">Amount Paid:</span>
                <span class="review-value" style="color: #005ce6; font-size: 14px;">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="review-row">
                <span class="review-label">Date & Time:</span>
                <span class="review-value" id="receipt-time">Just now</span>
              </div>
            </div>

            <button type="button" class="btn-gcash-primary" onclick="returnToMerchant()">
              BACK TO RESIDENT PORTAL (<span id="auto-return-timer">3</span>s)
            </button>
          </div>

          <!-- Cancellation Link -->
          <div class="cancel-footer" id="cancel-row">
            <a href="${cancelUrl}" class="cancel-link">Cancel and return to Portal</a>
          </div>

        </div>

        <div class="bsp-footer">
          Bangko Sentral ng Pilipinas (BSP) Regulated Electronic Money Issuer.<br>
          Connected via Adyen Hybrid Gateway for Fe Galang Da Silva Boarding House.
        </div>

        <script>
          const sessionId = '${sessionId}';
          let mpinValue = '1234';
          let redirectTarget = '${clientBaseUrl}/tenant/payments?status=success';

          function goToStep(stepNumber) {
            document.querySelectorAll('.checkout-step').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('step-' + stepNumber);
            if (target) {
              target.classList.add('active');
            }
          }

          function fillDemoPhone() {
            document.getElementById('phone-input').value = '906 354 9001';
          }

          function fillDemoOtp() {
            for (let i = 1; i <= 6; i++) {
              document.getElementById('otp-' + i).value = i.toString();
            }
          }

          function onOtpInput(index) {
            if (index < 6) {
              const next = document.getElementById('otp-' + (index + 1));
              if (next) next.focus();
            }
          }

          function typePin(digit) {
            if (mpinValue.length < 4) {
              mpinValue += digit;
              updatePinDots();
            }
          }

          function backPin() {
            mpinValue = mpinValue.slice(0, -1);
            updatePinDots();
          }

          function clearPin() {
            mpinValue = '';
            updatePinDots();
          }

          function fillDemoMpin() {
            mpinValue = '1234';
            updatePinDots();
          }

          function updatePinDots() {
            for (let i = 1; i <= 4; i++) {
              const dot = document.getElementById('pdot-' + i);
              if (i <= mpinValue.length) {
                dot.classList.add('filled');
              } else {
                dot.classList.remove('filled');
              }
            }
          }

          async function submitFinalPayment() {
            const btn = document.getElementById('pay-btn');
            btn.disabled = true;
            btn.innerHTML = '<span>Processing Authorization...</span>';

            try {
              const res = await fetch('/api/public/payments/mock-gateway/complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ sessionId })
              });
              const data = await res.json();
              
              if (data && data.reference) {
                document.getElementById('receipt-ref').textContent = data.reference;
                document.getElementById('receipt-time').textContent = new Date().toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                redirectTarget = data.redirectUrl || redirectTarget;
                goToStep(5);
                startAutoReturnCountdown();
              } else if (data && data.redirectUrl) {
                window.location.href = data.redirectUrl;
              } else {
                window.location.href = redirectTarget;
              }
            } catch (err) {
              console.error('Submission failed, direct redirect:', err);
              window.location.href = redirectTarget;
            }
          }

          function returnToMerchant() {
            window.location.href = redirectTarget;
          }

          function startAutoReturnCountdown() {
            let count = 3;
            const timerEl = document.getElementById('auto-return-timer');
            const interval = setInterval(() => {
              count--;
              if (timerEl) timerEl.textContent = count;
              if (count <= 0) {
                clearInterval(interval);
                returnToMerchant();
              }
            }, 1000);
          }

          // Top Session Expiry Timer
          let sessionSeconds = 599;
          setInterval(() => {
            if (sessionSeconds <= 0) return;
            sessionSeconds--;
            const mins = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
            const secs = String(sessionSeconds % 60).padStart(2, '0');
            const el = document.getElementById('timer');
            if (el) el.textContent = mins + ':' + secs;
          }, 1000);
        </script>
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
 * Handles redirect response from mock checkout and updates payments to pending verification.
 */
router.post(
  '/public/payments/mock-gateway/complete',
  asyncHandler(async (req, res) => {
    const parsed = mockGatewayCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid callback session ID.');
    }

    const { sessionId } = parsed.data;
    const session = adyenService.getCheckoutSession(sessionId);
    const returnUrl = session?.returnUrl;
    const ip = clientIp(req);

    const result = await adyenService.completeMockPayment(sessionId, ip);
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const targetUrl = returnUrl || `${clientBaseUrl}/tenant/payments`;
    const delimiter = targetUrl.includes('?') ? '&' : '?';
    const finalRedirectUrl = `${targetUrl}${delimiter}status=success&ref=${result.paymentReference}`;

    // Return JSON if requested via AJAX, otherwise standard 302 redirect
    if (req.headers['accept']?.includes('application/json') || req.is('json')) {
      res.json({
        success: true,
        redirectUrl: finalRedirectUrl,
        reference: result.paymentReference,
      });
      return;
    }

    res.redirect(finalRedirectUrl);
  })
);

export default router;
