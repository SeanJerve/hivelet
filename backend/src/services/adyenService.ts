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
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './auditService.js';

export interface SessionDetails {
  billId: string;
  tenantProfileId: string;
  amount: number;
}

// In-memory mapping of session IDs to metadata.
const checkoutSessions = new Map<string, SessionDetails>();

export const adyenService = {
  /**
   * Initializes a mock GCash checkout session.
   * Creates a transaction session mapping bill & tenant identification to a temporary key.
   */
  createMockCheckoutSession(billId: string, tenantProfileId: string, amount: number) {
    const sessionId = `mock_sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    checkoutSessions.set(sessionId, { billId, tenantProfileId, amount });
    const redirectUrl = `/api/public/payments/mock-gateway?sessionId=${sessionId}`;
    return { sessionId, redirectUrl };
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
   * creates an audit record, and triggers an administrator alert notification.
   */
  async completeMockPayment(sessionId: string, ipAddress: string | null) {
    const session = checkoutSessions.get(sessionId);
    if (!session) {
      throw ApiError.notFound('Payment session has expired or is invalid.');
    }

    // Resolve room_id from the bill records (payments table expects room identification)
    const { data: bill, error: billError } = await db
      .from('bills')
      .select('room_id')
      .eq('id', session.billId)
      .single();

    if (billError || !bill) {
      throw ApiError.notFound('Associated bill not found.');
    }

    const transactionReference = `MOCK-GCASH-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Insert payment record. Status MUST be 'Pending Verification' (BR-017 / System Bible Section 12)
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
