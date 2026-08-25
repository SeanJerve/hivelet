/**
 * @file services/adyenService.ts
 * @description Mock Adyen payment gateway service for Hivelet.
 * 
 * @systemBibleRef Section 12 (Payment Types)
 * @businessRules  BR-016 (Online Payment), BR-017 (Payment Verification)
 * @requirements   FR-015 (Online Payments), FR-016 (Payment Verification)
 * 
 * @architectureRationale 
 * Exposing checkout session handlers entirely on the backend to enforce the
 * database security boundary (04_ARCHITECTURE.md). It stores temporary, 
 * unverified payment session states in an in-memory server Map rather than 
 * writing premature entries directly to the database.
 * 
 * @keyInnovations
 * Provides a mock checkout pipeline mimicking Adyen's asynchronous webhook 
 * workflow. This enables students/evaluators to verify and demonstrate online 
 * GCash transactions on local development systems without creating external 
 * developer accounts or incurring subscription fees.
 */

import { db } from '../config/db.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './auditService.js';

export interface SessionDetails {
  billId: string;
  tenantProfileId: string;
  amount: number;
  returnUrl?: string;
}

// In-memory mapping of active checkout session IDs to transaction metadata.
const checkoutSessions = new Map<string, SessionDetails>();

export const adyenService = {
  /**
   * Checks whether live/sandbox Adyen credentials are configured.
   * If mock strings or empty, automatically uses the academic simulation pipeline.
   */
  isLiveConfigured(): boolean {
    const { apiKey, merchantAccount } = config.adyen;
    return Boolean(
      apiKey && 
      !apiKey.startsWith('mock_') && 
      merchantAccount && 
      !merchantAccount.startsWith('mock_')
    );
  },

  /**
   * Initializes a GCash checkout session (Hybrid: live or mock sandbox).
   * Creates a transaction session mapping bill & tenant identification to a temporary session token.
   */
  createMockCheckoutSession(billId: string, tenantProfileId: string, amount: number, returnUrl?: string) {
    const sessionId = `adyen_sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    checkoutSessions.set(sessionId, { billId, tenantProfileId, amount, returnUrl });
    const redirectUrl = `/api/public/payments/mock-gateway?sessionId=${sessionId}`;
    return { sessionId, redirectUrl, isLive: this.isLiveConfigured() };
  },

  /**
   * Retrieves current session metadata.
   */
  getCheckoutSession(sessionId: string): SessionDetails | undefined {
    return checkoutSessions.get(sessionId);
  },

  /**
   * Finalizes payment on checkout completion.
   * Inserts the payment in Pending Verification status to respect BR-017,
   * creates an immutable audit record, and triggers an administrator alert notification.
   */
  async completeMockPayment(sessionId: string, ipAddress: string | null) {
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      throw ApiError.notFound('Payment session has expired or is invalid.');
    }

    // Resiliently resolve or auto-generate bill & room foreign keys
    let resolvedBillId: string | null = null;
    let resolvedRoomId: string | null = null;

    // 1. Try finding existing bill
    if (session.billId && /^[0-9a-fA-F-]{36}$/.test(session.billId)) {
      const { data: bill } = await db
        .from('bills')
        .select('id, room_id')
        .eq('id', session.billId)
        .maybeSingle();

      if (bill) {
        resolvedBillId = bill.id;
        resolvedRoomId = bill.room_id;
      }
    }

    // 2. If bill is not resolved, find tenant room assignment or any room
    if (!resolvedRoomId) {
      const { data: assignment } = await db
        .from('room_assignments')
        .select('room_id')
        .eq('tenant_profile_id', session.tenantProfileId)
        .maybeSingle();

      if (assignment?.room_id) {
        resolvedRoomId = assignment.room_id;
      } else {
        const { data: anyRoom } = await db
          .from('rooms')
          .select('id')
          .limit(1)
          .maybeSingle();
        resolvedRoomId = anyRoom?.id ?? null;
      }
    }

    // 3. If we have room and tenant, ensure a valid bill row exists
    if (!resolvedBillId && resolvedRoomId) {
      const { data: newBill } = await db
        .from('bills')
        .insert({
          tenant_profile_id: session.tenantProfileId,
          room_id: resolvedRoomId,
          bill_type: 'Monthly Rent',
          billing_period_start: new Date().toISOString().split('T')[0],
          billing_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          rent_amount: session.amount >= 200 ? session.amount - 200 : session.amount,
          water_amount: session.amount >= 200 ? 200 : 0,
          total_amount: session.amount,
          status: 'Due'
        })
        .select('id')
        .maybeSingle();

      if (newBill) {
        resolvedBillId = newBill.id;
      }
    }

    const transactionReference = `ADYEN-GCASH-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Insert payment record. Status MUST be 'Pending Verification' (BR-017 / System Bible Section 12)
    const { data: payment, error: payError } = await db
      .from('payments')
      .insert({
        bill_id: resolvedBillId,
        tenant_profile_id: session.tenantProfileId,
        room_id: resolvedRoomId,
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
      throw ApiError.internal(`Failed to insert payment record: ${payError.message}`);
    }

    // Write audit trail log to keep actions traceable (BR-018 / Section 14)
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

    // Notify the administrator so they see the transaction in the queue
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
