'use strict';

const Razorpay = require('razorpay');

/**
 * THE Razorpay vendor boundary (mirrors lib/firebaseAdmin.js). The subscription
 * service depends only on the returned interface — `createOrder(...) → { id }` —
 * never on the SDK directly, so a provider swap replaces only this file. Live I/O:
 * coverage-excluded (.c8rc), exercised via Razorpay Test Mode on staging.
 *
 * @param {{ keyId: string, keySecret: string }} creds
 * @returns {{ createOrder(args: { amount: number, currency: string, receipt: string }): Promise<{ id: string }> }}
 */
function createRazorpayClient({ keyId, keySecret }) {
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return {
    async createOrder({ amount, currency, receipt }) {
      const order = await client.orders.create({ amount, currency, receipt, payment_capture: 1 });
      return { id: order.id };
    },
  };
}

/**
 * Deterministic stub for the Razorpay boundary (mirrors createStubSurepassClient /
 * createStubR2Client). Used when RAZORPAY_STUB=true — never in production (server.js
 * FATALs). Returns a stable order id derived from the receipt so the demo upgrade
 * flow gets a usable orderId WITHOUT calling the live SDK. Signature verification is
 * skipped separately in the service via config.razorpay.stub (the stub gateway
 * produces no real HMAC to verify).
 *
 * @returns {{ createOrder(args: { receipt: string }): Promise<{ id: string }> }}
 */
function createStubRazorpayClient() {
  return {
    async createOrder({ receipt }) {
      return { id: `order_stub_${receipt}` };
    },
  };
}

module.exports = { createRazorpayClient, createStubRazorpayClient };
