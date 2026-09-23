'use strict';

const { CASHFREE, SUBSCRIPTION_PLAN } = require('@easecab/shared');

/**
 * THE Cashfree PG vendor boundary (replaces lib/razorpay.js, Phase 16.1). The
 * subscription service depends only on the returned interface, never on HTTP
 * details. Plain fetch against the REST API — two endpoints don't justify the
 * cashfree-pg SDK. Live I/O: coverage-excluded (.c8rc), exercised against sandbox.
 *
 * @param {{ appId: string, secretKey: string, env: 'sandbox'|'production', returnUrl: string }} creds
 */
function createCashfreeClient({ appId, secretKey, env, returnUrl }) {
  const base = CASHFREE.BASE_URL[env];
  const headers = {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': CASHFREE.API_VERSION,
    'content-type': 'application/json',
  };

  async function call(path, init = {}) {
    const res = await fetch(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(CASHFREE.HTTP_TIMEOUT_MS) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Cashfree's error body carries code/message only — no PII, safe to surface to logs.
      throw Object.assign(new Error(`CASHFREE_${res.status}: ${body.code || ''} ${body.message || ''}`.trim()), { status: res.status });
    }
    return body;
  }

  // An order Cashfree has never seen (a Razorpay-era or stub `created` row left in our DB)
  // 404s. Treat it as not payable + not paid so checkout opens a fresh order instead of
  // 500-ing on every attempt. Any other failure still throws.
  async function callOrNull(path) {
    try {
      return await call(path);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  return {
    /**
     * @param {{ orderId: string, amountRupees: number, customerId: string, customerPhone: string }} args
     * @returns {Promise<{ id: string, paymentSessionId: string }>}
     */
    async createOrder({ orderId, amountRupees, customerId, customerPhone }) {
      const o = await call('/orders', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          order_amount: amountRupees,
          order_currency: 'INR',
          customer_details: { customer_id: customerId, customer_phone: customerPhone },
          order_meta: { return_url: returnUrl },
        }),
      });
      return { id: o.order_id, paymentSessionId: o.payment_session_id };
    },

    /**
     * Re-open an existing order: its session id if still payable, else null.
     * @returns {Promise<?string>}
     */
    async getActiveSession(orderId) {
      const o = await callOrNull(`/orders/${encodeURIComponent(orderId)}`);
      return o && o.order_status === CASHFREE.ORDER_ACTIVE ? o.payment_session_id : null;
    },

    /**
     * Where an order's payments stand. This backend re-fetch is the ONLY trusted success
     * signal — the browser gets nothing signed, and even a signed webhook is re-checked.
     * @returns {Promise<{ state: 'paid', paymentId: string, amountRupees: number } | { state: 'pending'|'unpaid' }>}
     */
    async getPaymentState(orderId) {
      const list = await callOrNull(`/orders/${encodeURIComponent(orderId)}/payments`);
      const payments = Array.isArray(list) ? list : [];
      const ok = payments.find((p) => p.payment_status === CASHFREE.PAYMENT_SUCCESS);
      if (ok) return { state: 'paid', paymentId: String(ok.cf_payment_id), amountRupees: Number(ok.payment_amount) };
      if (payments.some((p) => p.payment_status === CASHFREE.PAYMENT_PENDING)) return { state: 'pending' };
      return { state: 'unpaid' };
    },
  };
}

/**
 * Deterministic stub (CASHFREE_STUB=true — never production, server.js FATALs). Every
 * order is instantly "paid" so the demo upgrade→credit flow runs without a gateway.
 */
function createStubCashfreeClient() {
  return {
    async createOrder({ orderId }) {
      return { id: orderId, paymentSessionId: `session_stub_${orderId}` };
    },
    async getActiveSession(orderId) {
      return `session_stub_${orderId}`;
    },
    async getPaymentState(orderId) {
      return { state: 'paid', paymentId: `stub_pay_${orderId}`, amountRupees: SUBSCRIPTION_PLAN.PRICE_PAISE / 100 };
    },
  };
}

module.exports = { createCashfreeClient, createStubCashfreeClient };
