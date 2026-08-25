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
import { notificationService } from '../services/notificationService.js';
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

    // Notify Landlady about the new prospective inquiry
    await notificationService.notify({
      title: 'New Prospective Booking Inquiry',
      message: `${input.prospectName} submitted an inquiry for Room ${room.room_number}.`,
      type: 'Inquiry',
      priority: 'Medium',
      relatedEntityType: 'INQUIRY',
      relatedEntityId: data.id,
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
    const host = req.get('host') || 'localhost:5000';
    const mobilePayUrl = `${req.protocol}://${host}/api/public/payments/mock-gateway?sessionId=${sessionId}&view=mobile`;
    const qrDataUrl = await QRCode.toDataURL(mobilePayUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

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
        <title>GCash Payment Cashier</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
          body {
            background-color: #005ce6;
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            color: #1e293b;
          }

          /* Full-width Blue Header */
          .gcash-header {
            width: 100%;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #005ce6;
            position: relative;
          }
          .gcash-header-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
            text-decoration: none;
          }
          .gcash-circle-logo {
            width: 36px;
            height: 36px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #005ce6;
            font-weight: 900;
            font-size: 20px;
          }
          .gcash-header-text {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          /* Body Container */
          .cashier-wrapper {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0 16px 32px 16px;
            flex: 1;
          }

          /* Large White Cashier Card (Desktop QR View) */
          .cashier-card {
            width: 100%;
            max-width: 820px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            padding: 44px 32px 36px 32px;
            text-align: center;
            margin-top: 12px;
            animation: fadeIn 0.25s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .cashier-subtitle {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 6px;
            font-weight: 500;
          }
          .cashier-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 28px;
          }

          /* QR Code Display */
          .qr-container {
            display: inline-block;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
            margin-bottom: 24px;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .qr-container:hover {
            transform: scale(1.02);
          }
          .qr-image {
            width: 260px;
            height: 260px;
            display: block;
            margin: 0 auto;
          }

          /* Merchant & Dues Info Banner */
          .merchant-info-strip {
            max-width: 480px;
            margin: 0 auto 24px auto;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
          }
          .merchant-name-label {
            font-weight: 700;
            color: #1e293b;
            text-align: left;
          }
          .merchant-ref-label {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .amount-due-highlight {
            font-size: 16px;
            font-weight: 800;
            color: #005ce6;
            text-align: right;
          }

          /* Interactive Actions */
          .action-buttons {
            max-width: 480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .btn-simulate-scan {
            width: 100%;
            padding: 14px;
            background: #005ce6;
            color: white;
            border: none;
            border-radius: 28px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 92, 230, 0.3);
            transition: all 0.15s;
          }
          .btn-simulate-scan:hover {
            background: #0047ba;
            box-shadow: 0 6px 16px rgba(0, 92, 230, 0.4);
          }
          .btn-simulate-scan:active {
            transform: scale(0.98);
          }

          .btn-toggle-view {
            background: transparent;
            border: none;
            color: #005ce6;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            padding: 6px;
            text-decoration: underline;
          }

          /* Mobile 5-Step Flow Styling */
          .mobile-checkout-card {
            display: none;
            width: 100%;
            max-width: 460px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            padding: 26px 22px;
            margin-top: 12px;
            text-align: left;
          }
          .mobile-step {
            display: none;
          }
          .mobile-step.active {
            display: block;
            animation: fadeIn 0.2s ease-in-out;
          }
          .phone-input-group {
            display: flex;
            align-items: center;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            margin: 14px 0;
            overflow: hidden;
          }
          .phone-input-group:focus-within {
            border-color: #005ce6;
            background: white;
          }
          .phone-prefix {
            padding: 12px 14px;
            background: #e2e8f0;
            font-weight: 700;
            font-size: 14px;
          }
          .phone-field {
            flex: 1;
            padding: 12px;
            border: none;
            outline: none;
            font-size: 15px;
            font-weight: 700;
            background: transparent;
          }
          .otp-grid {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin: 18px 0;
          }
          .otp-cell {
            width: 46px;
            height: 52px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            text-align: center;
            font-size: 20px;
            font-weight: 800;
            color: #005ce6;
            outline: none;
          }
          .otp-cell:focus {
            border-color: #005ce6;
          }
          .mpin-dots {
            display: flex;
            justify-content: center;
            gap: 14px;
            margin: 20px 0;
          }
          .mpin-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #005ce6;
            background: transparent;
          }
          .mpin-dot.filled {
            background: #005ce6;
          }
          .keypad-matrix {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 18px;
          }
          .keypad-cell {
            padding: 12px 0;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            text-align: center;
          }
          .keypad-cell:active {
            background: #005ce6;
            color: white;
          }
          .helper-tag {
            width: 100%;
            padding: 8px;
            background: #eff6ff;
            border: 1px dashed #005ce6;
            color: #005ce6;
            font-size: 11px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 12px;
            text-align: center;
          }

          .cancel-text-link {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
            text-decoration: none;
            font-weight: 600;
            margin-top: 18px;
            display: inline-block;
          }
          .cancel-text-link:hover {
            color: white;
            text-decoration: underline;
          }

          .receipt-checkmark {
            width: 60px;
            height: 60px;
            background: #dcfce7;
            color: #16a34a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            font-weight: 900;
            margin: 0 auto 16px auto;
          }
        </style>
      </head>
      <body>

        <!-- Header -->
        <header class="gcash-header">
          <div class="gcash-header-brand">
            <div class="gcash-circle-logo">G</div>
            <div class="gcash-header-text">GCash</div>
          </div>
        </header>

        <main class="cashier-wrapper">

          <!-- 1. DESKTOP QR CASHIER (EXACT MATCH TO OFFICIAL GCASH DESKTOP CASHIER) -->
          <div id="desktop-cashier-card" class="cashier-card">
            <div class="cashier-subtitle">Securely complete the payment with your GCash app</div>
            <div class="cashier-title">Log in to GCash and scan this QR with the QR Scanner.</div>

            <div class="qr-container" onclick="submitFinalPayment()" title="Click to Simulate GCash App Scan">
              <img src="${qrDataUrl}" alt="GCash Official Dynamic QR" class="qr-image">
            </div>

            <div class="merchant-info-strip">
              <div class="merchant-name-label">
                <div>Fe Galang Da Silva Boarding House</div>
                <div class="merchant-ref-label">Ref: ${sessionId.substring(0, 16)}</div>
              </div>
              <div class="amount-due-highlight">
                ₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div class="action-buttons">
              <button type="button" class="btn-simulate-scan" onclick="submitFinalPayment()">
                Simulate Scan &amp; Authorize Payment
              </button>
              <button type="button" class="btn-toggle-view" onclick="toggleMobileView(true)">
                Or click here to pay using Mobile Number &amp; MPIN
              </button>
            </div>
          </div>

          <!-- 2. MOBILE 5-STEP CHECKOUT (FOR MOBILE PHONE SIMULATION) -->
          <div id="mobile-checkout-card" class="mobile-checkout-card">
            
            <!-- Mobile Step 1: Phone -->
            <div id="mstep-1" class="mobile-step active">
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Login to pay with GCash</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Enter your 11-digit mobile number</div>
              
              <button type="button" class="helper-tag" onclick="fillPhone()">
                ✨ Auto-fill Tenant Phone: 0906 354 9001
              </button>

              <div class="phone-input-group">
                <span class="phone-prefix">+63</span>
                <input type="tel" id="m-phone" class="phone-field" value="906 354 9001" maxlength="12">
              </div>

              <button type="button" class="btn-simulate-scan" onclick="goToMStep(2)">NEXT</button>
            </div>

            <!-- Mobile Step 2: OTP -->
            <div id="mstep-2" class="mobile-step">
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Authentication Code</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Sent 6-digit code to +63 906 ••• 9001</div>

              <button type="button" class="helper-tag" onclick="fillOtp()">
                ✨ Auto-fill OTP: 123456
              </button>

              <div class="otp-grid">
                <input type="text" class="otp-cell" id="motp-1" maxlength="1" value="1" oninput="focusNext(1)">
                <input type="text" class="otp-cell" id="motp-2" maxlength="1" value="2" oninput="focusNext(2)">
                <input type="text" class="otp-cell" id="motp-3" maxlength="1" value="3" oninput="focusNext(3)">
                <input type="text" class="otp-cell" id="motp-4" maxlength="1" value="4" oninput="focusNext(4)">
                <input type="text" class="otp-cell" id="motp-5" maxlength="1" value="5" oninput="focusNext(5)">
                <input type="text" class="otp-cell" id="motp-6" maxlength="1" value="6" oninput="focusNext(6)">
              </div>

              <button type="button" class="btn-simulate-scan" onclick="goToMStep(3)">SUBMIT CODE</button>
            </div>

            <!-- Mobile Step 3: MPIN -->
            <div id="mstep-3" class="mobile-step">
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Enter 4-Digit MPIN</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Do not share your MPIN with anyone</div>

              <div class="mpin-dots">
                <div class="mpin-dot filled" id="mdot-1"></div>
                <div class="mpin-dot filled" id="mdot-2"></div>
                <div class="mpin-dot filled" id="mdot-3"></div>
                <div class="mpin-dot filled" id="mdot-4"></div>
              </div>

              <div class="keypad-matrix">
                <button type="button" class="keypad-cell" onclick="keyPin('1')">1</button>
                <button type="button" class="keypad-cell" onclick="keyPin('2')">2</button>
                <button type="button" class="keypad-cell" onclick="keyPin('3')">3</button>
                <button type="button" class="keypad-cell" onclick="keyPin('4')">4</button>
                <button type="button" class="keypad-cell" onclick="keyPin('5')">5</button>
                <button type="button" class="keypad-cell" onclick="keyPin('6')">6</button>
                <button type="button" class="keypad-cell" onclick="keyPin('7')">7</button>
                <button type="button" class="keypad-cell" onclick="keyPin('8')">8</button>
                <button type="button" class="keypad-cell" onclick="keyPin('9')">9</button>
                <button type="button" class="keypad-cell" onclick="keyPin('c')">C</button>
                <button type="button" class="keypad-cell" onclick="keyPin('0')">0</button>
                <button type="button" class="keypad-cell" onclick="keyPin('b')">⌫</button>
              </div>

              <button type="button" class="btn-simulate-scan" onclick="goToMStep(4)">NEXT</button>
            </div>

            <!-- Mobile Step 4: Pay Confirmation -->
            <div id="mstep-4" class="mobile-step">
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">YOU ARE ABOUT TO PAY</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Review remittance details</div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b;">GCash Balance:</span>
                  <strong style="color: #16a34a;">₱14,850.00</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b;">Pay To:</span>
                  <strong>Fe Galang Da Silva BH</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b;">Fee:</span>
                  <strong style="color: #16a34a;">FREE</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 14px;">
                  <span>Total:</span>
                  <strong style="color: #005ce6;">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <button type="button" class="btn-simulate-scan" onclick="submitFinalPayment()">
                PAY ₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </button>
            </div>

            <!-- Mobile Step 5: Official Receipt -->
            <div id="mstep-5" class="mobile-step" style="text-align: center;">
              <div class="receipt-checkmark">✓</div>
              <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-bottom: 4px;">Payment Successful!</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Ref: <strong id="m-receipt-ref" style="font-family: monospace;">ADYEN-GCASH-XXXX</strong></div>

              <button type="button" class="btn-simulate-scan" onclick="returnToMerchant()">
                BACK TO MERCHANT (<span id="m-countdown">3</span>s)
              </button>
            </div>

            <div style="text-align: center; margin-top: 12px;">
              <button type="button" class="btn-toggle-view" onclick="toggleMobileView(false)">
                Switch back to Desktop QR Scanner
              </button>
            </div>

          </div>

          <a href="${cancelUrl}" class="cancel-text-link">Cancel payment and return to merchant</a>

        </main>

        <script>
          const sessionId = '${sessionId}';
          let mpinStr = '1234';
          let returnDest = '${clientBaseUrl}/tenant/payments?status=success';

          function toggleMobileView(showMobile) {
            document.getElementById('desktop-cashier-card').style.display = showMobile ? 'none' : 'block';
            document.getElementById('mobile-checkout-card').style.display = showMobile ? 'block' : 'none';
          }

          // Auto-detect mobile screen on load
          if (window.innerWidth <= 640) {
            toggleMobileView(true);
          }

          function goToMStep(step) {
            document.querySelectorAll('.mobile-step').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('mstep-' + step);
            if (target) target.classList.add('active');
          }

          function fillPhone() {
            document.getElementById('m-phone').value = '906 354 9001';
          }

          function fillOtp() {
            for (let i = 1; i <= 6; i++) {
              document.getElementById('motp-' + i).value = i.toString();
            }
          }

          function focusNext(idx) {
            if (idx < 6) {
              const next = document.getElementById('motp-' + (idx + 1));
              if (next) next.focus();
            }
          }

          function keyPin(k) {
            if (k === 'c') mpinStr = '';
            else if (k === 'b') mpinStr = mpinStr.slice(0, -1);
            else if (mpinStr.length < 4) mpinStr += k;
            
            for (let i = 1; i <= 4; i++) {
              const d = document.getElementById('mdot-' + i);
              if (i <= mpinStr.length) d.classList.add('filled');
              else d.classList.remove('filled');
            }
          }

          async function submitFinalPayment() {
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
                returnDest = data.redirectUrl || returnDest;
                toggleMobileView(true);
                goToMStep(5);
                document.getElementById('m-receipt-ref').textContent = data.reference;
                
                let s = 3;
                const timerEl = document.getElementById('m-countdown');
                const iv = setInterval(() => {
                  s--;
                  if (timerEl) timerEl.textContent = s;
                  if (s <= 0) {
                    clearInterval(iv);
                    returnToMerchant();
                  }
                }, 1000);
              } else if (data && data.redirectUrl) {
                window.location.href = data.redirectUrl;
              } else {
                window.location.href = returnDest;
              }
            } catch (err) {
              console.error('Payment complete failed:', err);
              window.location.href = returnDest;
            }
          }

          function returnToMerchant() {
            window.location.href = returnDest;
          }
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
