/**
 * @file adyenService.ts
 * @description Isolated Adyen Checkout integration for the optional GCash payment flow (System Bible
 *              Section 12 / docs/04_ARCHITECTURE.md: "Adyen integration must be isolated in a
 *              dedicated backend service. Secrets must never be exposed to the frontend.").
 * @rationale Built against the placeholder sandbox env vars in .env.example so the flow is fully
 *            wired and testable the moment real Adyen test credentials are dropped in -- until then,
 *            isConfigured() lets the route degrade gracefully instead of crashing (project decision,
 *            2026-08-07: Adyen is genuinely optional, manual cash/bank payment stays primary).
 */
import { Client, CheckoutAPI, EnvironmentEnum, hmacValidator } from '@adyen/api-library';
import { CreateCheckoutSessionRequest } from '@adyen/api-library/lib/src/typings/checkout/models';
import type { NotificationRequestItem } from '@adyen/api-library/lib/src/typings/notification/models';

const PLACEHOLDER_API_KEY = 'mock_adyen_api_key_sandbox';

function getEnv() {
  return {
    apiKey: process.env.ADYEN_API_KEY || '',
    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT || '',
    environment: (process.env.ADYEN_ENVIRONMENT || 'TEST') as 'TEST' | 'LIVE',
    hmacKey: process.env.ADYEN_HMAC_KEY || '',
  };
}

/** True once real sandbox/live credentials replace the shipped placeholder. */
export function isAdyenConfigured(): boolean {
  const { apiKey, merchantAccount } = getEnv();
  return Boolean(apiKey && apiKey !== PLACEHOLDER_API_KEY && merchantAccount);
}

function getCheckoutApi(): CheckoutAPI {
  const { apiKey, environment } = getEnv();
  const client = new Client({
    apiKey,
    environment: environment === 'LIVE' ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
  });
  return new CheckoutAPI(client);
}

/**
 * Creates an Adyen Checkout Session for a GCash payment. Amount is in whole pesos; Adyen expects
 * minor units, but PHP has no minor-unit subdivision in practice for this flow, so value == pesos.
 */
export async function createGcashSession(params: {
  amountPhp: number;
  reference: string;
  returnUrl: string;
  shopperReference: string;
  shopperEmail?: string;
}) {
  const { merchantAccount } = getEnv();
  const checkout = getCheckoutApi();

  return checkout.PaymentsApi.sessions({
    amount: { currency: 'PHP', value: Math.round(params.amountPhp * 100) },
    merchantAccount,
    reference: params.reference,
    returnUrl: params.returnUrl,
    shopperReference: params.shopperReference,
    shopperEmail: params.shopperEmail,
    allowedPaymentMethods: ['gcash'],
    channel: CreateCheckoutSessionRequest.ChannelEnum.Web,
  });
}

/** Validates the HMAC signature on a single Adyen webhook notification item. */
export function verifyWebhookHmac(item: NotificationRequestItem): boolean {
  const { hmacKey } = getEnv();
  if (!hmacKey) return false;
  return new hmacValidator().validateHMAC(item, hmacKey);
}
