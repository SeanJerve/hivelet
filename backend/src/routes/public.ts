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
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

/**
 * Columns a public visitor may see. Note the absence of any tenant linkage.
 */
const PUBLIC_ROOM_COLUMNS =
  'id, room_number, floor, cluster_code, room_type, description, capacity, ' +
  'current_price, operational_status, visibility_status, available_from, is_linda_unit';

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

export default router;
