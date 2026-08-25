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

    // Generate dynamic GCash QR Code (encodes the mobile checkout URL)
    const host = req.get('host') || 'localhost:5000';
    const mobilePayUrl = `${req.protocol}://${host}/api/public/payments/mock-gateway?sessionId=${sessionId}&mode=mpin`;
    const qrDataUrl = await QRCode.toDataURL(mobilePayUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 280,
      color: {
        dark: '#0047ba',
        light: '#ffffff'
      }
    });

    const isMobileMode = req.query.mode === 'mpin' || req.query.view === 'mobile';

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>GCash Payment — Hivelet</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #fafaf9;
            font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
            color: #1c1917;
          }
          .page-wrapper {
            width: 100%;
            max-width: 880px;
          }
          .top-navbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            color: #1c1917;
          }
          .brand-logo {
            width: 32px;
            height: 32px;
            background: #1e2532;
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-family: 'Sora', sans-serif;
            font-size: 15px;
          }
          .brand-name {
            font-family: 'Sora', sans-serif;
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          .gateway-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #71717a;
            background: #ffffff;
            border: 1px solid #e7e5e4;
            padding: 6px 12px;
            border-radius: 20px;
          }
          .secure-dot {
            width: 7px;
            height: 7px;
            background: #10b981;
            border-radius: 50%;
          }

          /* Main Card Container (2-Column Grid on Desktop) */
          .main-card {
            background: #ffffff;
            border: 1px solid #e7e5e4;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04), 0 8px 24px -8px rgba(28, 25, 23, 0.08);
            overflow: hidden;
            display: grid;
            grid-template-columns: 1.15fr 1fr;
          }
          @media (max-width: 768px) {
            .main-card {
              grid-template-columns: 1fr;
            }
          }

          /* Left Column: Order & Billing Summary */
          .left-column {
            padding: 32px;
            background: #fafaf9;
            border-right: 1px solid #e7e5e4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .merchant-badge {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #71717a;
            margin-bottom: 4px;
          }
          .merchant-title {
            font-family: 'Sora', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #1c1917;
            margin-bottom: 24px;
            line-height: 1.3;
          }

          .summary-table {
            width: 100%;
            margin-bottom: 24px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            font-size: 13px;
            color: #71717a;
            border-bottom: 1px dashed #e7e5e4;
          }
          .summary-row.total {
            border-bottom: none;
            border-top: 2px solid #e7e5e4;
            padding-top: 16px;
            margin-top: 8px;
          }
          .summary-row.total .total-label {
            font-size: 15px;
            font-weight: 700;
            color: #1c1917;
          }
          .summary-row.total .total-val {
            font-size: 26px;
            font-weight: 800;
            color: #005ce6;
            font-family: 'JetBrains Mono', monospace;
          }

          .info-note {
            background: #ffffff;
            border: 1px solid #e7e5e4;
            border-radius: 10px;
            padding: 14px;
            font-size: 12px;
            color: #52525b;
            line-height: 1.5;
            margin-top: auto;
          }

          /* Right Column: Payment Tabs & Controls */
          .right-column {
            padding: 32px;
            background: #ffffff;
            display: flex;
            flex-direction: column;
          }

          /* Mode Switcher Tabs */
          .mode-tabs {
            display: flex;
            background: #f5f5f4;
            border-radius: 10px;
            padding: 4px;
            margin-bottom: 24px;
            gap: 4px;
          }
          .tab-btn {
            flex: 1;
            padding: 9px 12px;
            font-size: 12px;
            font-weight: 600;
            border: none;
            background: transparent;
            color: #71717a;
            cursor: pointer;
            border-radius: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.15s ease;
          }
          .tab-btn.active {
            color: #1c1917;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            font-weight: 700;
          }

          /* View Panels */
          .view-panel {
            display: none;
          }
          .view-panel.active {
            display: block;
            animation: fadeIn 0.2s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(3px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Dynamic QR View */
          .qr-box {
            text-align: center;
            margin-bottom: 20px;
          }
          .qr-image-wrapper {
            position: relative;
            display: inline-block;
            padding: 12px;
            background: #ffffff;
            border: 1px solid #e7e5e4;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }
          .qr-image {
            width: 200px;
            height: 200px;
            display: block;
          }
          .qr-center-emblem {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 38px;
            height: 38px;
            background: #005ce6;
            color: white;
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 18px;
            box-shadow: 0 2px 6px rgba(0, 92, 230, 0.4);
          }
          .qr-expiry {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 600;
            color: #b91c1c;
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 4px 10px;
            border-radius: 20px;
            margin-top: 10px;
          }

          .instructions-card {
            background: #fafaf9;
            border: 1px solid #e7e5e4;
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 11px;
            color: #52525b;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .instructions-card ol {
            padding-left: 18px;
          }
          .instructions-card li {
            margin-bottom: 2px;
          }

          /* Buttons */
          .btn-primary {
            width: 100%;
            height: 44px;
            background: #005ce6;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0, 92, 230, 0.2);
          }
          .btn-primary:hover {
            background: #0047b3;
          }
          .btn-primary:active {
            transform: scale(0.99);
          }

          /* MPIN Keypad Elements */
          .pin-indicator {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin: 16px 0 20px;
          }
          .pin-dot {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            background: transparent;
            transition: all 0.15s;
          }
          .pin-dot.filled {
            background: #005ce6;
            border-color: #005ce6;
            transform: scale(1.1);
          }
          .keypad-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            max-width: 280px;
            margin: 0 auto 20px;
          }
          .keypad-btn {
            height: 42px;
            border: 1px solid #e7e5e4;
            background: #fafaf9;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            color: #1c1917;
            cursor: pointer;
            transition: all 0.1s;
          }
          .keypad-btn:hover {
            background: #e7e5e4;
          }
          .keypad-btn:active {
            transform: scale(0.96);
          }

          .cancel-row {
            text-align: center;
            margin-top: 16px;
          }
          .cancel-link {
            font-size: 12px;
            color: #71717a;
            text-decoration: none;
            font-weight: 500;
          }
          .cancel-link:hover {
            color: #b91c1c;
            text-decoration: underline;
          }

          .loader-box {
            display: none;
            text-align: center;
            padding: 40px 0;
          }
          .spinner {
            width: 38px;
            height: 38px;
            border: 3px solid #e7e5e4;
            border-top: 3px solid #005ce6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <!-- Top Navigation Header -->
          <div class="top-navbar">
            <a href="${cancelUrl}" class="brand-box">
              <div class="brand-logo">H</div>
              <div class="brand-name">Hivelet</div>
            </a>
            <div class="gateway-badge">
              <span class="secure-dot"></span>
              <span>Adyen Payment Gateway</span>
            </div>
          </div>

          <!-- Main 2-Column Checkout Card -->
          <div class="main-card">
            <!-- Left Side: Order & Summary -->
            <div class="left-column">
              <div>
                <div class="merchant-badge">Merchant Payment</div>
                <div class="merchant-title">Fe Galang Da Silva Boarding House</div>

                <div class="summary-table">
                  <div class="summary-row">
                    <span>Payment Method</span>
                    <strong style="color:#005ce6;">GCash Remittance</strong>
                  </div>
                  <div class="summary-row">
                    <span>Transaction Reference</span>
                    <span style="font-family:'JetBrains Mono',monospace; font-size:12px;">${sessionId.slice(0, 16)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Convenience Fee</span>
                    <span style="color:#10b981; font-weight:600;">FREE (₱0.00)</span>
                  </div>
                  <div class="summary-row total">
                    <span class="total-label">Total Amount Due</span>
                    <span class="total-val">₱${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div class="info-note">
                <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:#1c1917; margin-bottom:4px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span>Bangko Sentral ng Pilipinas (BSP)</span>
                </div>
                Electronic payment clearance processed via Adyen N.V. official acquirer switch.
              </div>
            </div>

            <!-- Right Side: Interactive Payment Wizard -->
            <div class="right-column">
              <!-- Segmented Control Tabs -->
              <div class="mode-tabs">
                <button id="tab-qr" type="button" class="tab-btn ${isMobileMode ? '' : 'active'}" onclick="switchView('qr')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                  <span>Scan GCash QR</span>
                </button>
                <button id="tab-mpin" type="button" class="tab-btn ${isMobileMode ? 'active' : ''}" onclick="switchView('mpin')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                  <span>GCash MPIN</span>
                </button>
              </div>

              <!-- View 1: Dynamic QR Code -->
              <div id="view-qr" class="view-panel ${isMobileMode ? '' : 'active'}">
                <div class="qr-box">
                  <div class="qr-image-wrapper">
                    <img src="${qrDataUrl}" alt="GCash Dynamic QR" class="qr-image" />
                    <div class="qr-center-emblem">G</div>
                  </div>
                  <div>
                    <span class="qr-expiry">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>Expires in <span id="timer-display">09:59</span></span>
                    </span>
                  </div>
                </div>

                <div class="instructions-card">
                  <strong>How to pay:</strong>
                  <ol>
                    <li>Open your <strong>GCash App</strong> on your smartphone.</li>
                    <li>Tap the <strong>QR Scanner</strong> at the bottom bar.</li>
                    <li>Scan this QR code and verify with your MPIN.</li>
                  </ol>
                </div>

                <button type="button" class="btn-primary" onclick="submitPayment()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Simulate Scan &amp; Authorize</span>
                </button>
              </div>

              <!-- View 2: MPIN Input Flow -->
              <div id="view-mpin" class="view-panel ${isMobileMode ? 'active' : ''}">
                <div style="text-align:center; margin-bottom: 8px;">
                  <div style="font-size: 14px; font-weight: 700; color: #1c1917;">Enter 4-Digit MPIN</div>
                  <div style="font-size: 12px; color: #71717a; margin-top: 2px;">Account: +63 917 ••• 4567</div>
                </div>

                <div class="pin-indicator">
                  <div class="pin-dot filled" id="dot-1"></div>
                  <div class="pin-dot filled" id="dot-2"></div>
                  <div class="pin-dot filled" id="dot-3"></div>
                  <div class="pin-dot filled" id="dot-4"></div>
                </div>

                <div class="keypad-grid">
                  <button type="button" class="keypad-btn" onclick="pressPin('1')">1</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('2')">2</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('3')">3</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('4')">4</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('5')">5</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('6')">6</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('7')">7</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('8')">8</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('9')">9</button>
                  <button type="button" class="keypad-btn" onclick="clearPin()">C</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('0')">0</button>
                  <button type="button" class="keypad-btn" onclick="pressPin('back')">&#9003;</button>
                </div>

                <button type="button" class="btn-primary" onclick="submitPayment()">
                  <span>Authorize PHP ${session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </button>
              </div>

              <!-- Loading State -->
              <div id="loader-box" class="loader-box">
                <div class="spinner"></div>
                <div style="font-weight: 700; font-size: 15px; color: #1c1917;">Authorizing Remittance...</div>
                <div style="font-size: 12px; color: #71717a; margin-top: 4px;">Syncing with Landlady Collections Ledger</div>
              </div>

              <div class="cancel-row" id="cancel-box">
                <a href="${cancelUrl}" class="cancel-link">Cancel and return to Portal</a>
              </div>
            </div>
          </div>
        </div>

        <script>
          const sessionId = '${sessionId}';
          let currentPin = '1234';

          function switchView(mode) {
            document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.getElementById('view-' + mode).classList.add('active');
            document.getElementById('tab-' + mode).classList.add('active');
          }

          function pressPin(digit) {
            if (digit === 'C') {
              currentPin = '';
            } else if (digit === 'back') {
              currentPin = currentPin.slice(0, -1);
            } else if (currentPin.length < 4) {
              currentPin += digit;
            }
            updatePinDots();
          }

          function clearPin() {
            currentPin = '';
            updatePinDots();
          }

          function updatePinDots() {
            for (let i = 1; i <= 4; i++) {
              const dot = document.getElementById('dot-' + i);
              if (i <= currentPin.length) {
                dot.classList.add('filled');
              } else {
                dot.classList.remove('filled');
              }
            }
          }

          async function submitPayment() {
            document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
            document.querySelector('.mode-tabs').style.display = 'none';
            document.getElementById('cancel-box').style.display = 'none';
            document.getElementById('loader-box').style.display = 'block';

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
              if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
              } else {
                window.location.href = '/tenant?status=success';
              }
            } catch (err) {
              // Fallback form post
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = '/api/public/payments/mock-gateway/complete';
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = 'sessionId';
              input.value = sessionId;
              form.appendChild(input);
              document.body.appendChild(form);
              form.submit();
            }
          }

          // 10-Minute Countdown Timer
          let timeLeft = 599;
          const timerEl = document.getElementById('timer-display');
          setInterval(() => {
            if (timeLeft <= 0) return;
            timeLeft--;
            const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            const secs = String(timeLeft % 60).padStart(2, '0');
            timerEl.textContent = mins + ':' + secs;
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
    const targetUrl = returnUrl || `${clientBaseUrl}/tenant`;
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
