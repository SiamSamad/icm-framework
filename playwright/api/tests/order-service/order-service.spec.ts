/**
 * Example generated API spec — order-service.
 *
 * Shipped as a worked reference for the conventions in `_config/api-test-generation.md`:
 * one describe per case, a Stage 02 traceability comment as the first line of every
 * test body, dual tags, every value read through `env.*`, and setup/teardown wrapped
 * in try/finally so cleanup runs on failure too.
 *
 * Nothing here runs against a real service — the host is example.com. Replace this
 * file with real generated output; do not extend it.
 */
import { test, expect } from '@playwright/test';
import { env } from '../../config/env';

// Reference values must be unique per run, or the second run collides with the first.
// Derived once at module scope so every test in the file shares one run identity.
const RUN_ID = Date.now();

test.describe('DEMO-TC-1201 — POST /v1/orders', () => {

  test('PROJ-232-DEMO-TC-1201 — Create order with valid payload',
    { tag: ['@example-product', '@order-service'] },
    async ({ request }) => {
      // Stage 02 case: DEMO-TC-1201

      // ── Act ──────────────────────────────────────────────────────────────
      const response = await request.post(`${env.ORDER_SERVICE_BASE_URL}/v1/orders`, {
        headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
        data: {
          reference: `ICM-${RUN_ID}`,
          // Far-future so a passing test does not begin failing on a date nobody chose.
          validUntil: '2099-12-31T23:59:59Z',
        },
      });

      // ── Assert ───────────────────────────────────────────────────────────
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.status).toBe('PENDING');
      expect(body.reference).toBe(`ICM-${RUN_ID}`);
    });

  test('PROJ-232-DEMO-TC-1201-S2 — Reject order with no API key',
    { tag: ['@example-product', '@order-service'] },
    async ({ request }) => {
      // Stage 02 case: DEMO-TC-1201

      const response = await request.post(`${env.ORDER_SERVICE_BASE_URL}/v1/orders`, {
        data: { reference: `ICM-${RUN_ID}-noauth` },
      });

      // 403, not 401 — order-service is VERIFIED as rejected-by-default in
      // _config/auth-behavior.md. Never default this to 401.
      expect(response.status()).toBe(403);
    });

});

test.describe('DEMO-TC-1202 — PATCH /v1/orders/{id}', () => {

  test('PROJ-232-DEMO-TC-1202 — Confirm a pending order',
    { tag: ['@example-product', '@order-service'] },
    async ({ request }) => {
      // Stage 02 case: DEMO-TC-1202

      // ── Setup ────────────────────────────────────────────────────────────
      // This case operates on a pre-existing order, so the test creates its own
      // rather than depending on another test having run.
      const setupResponse = await request.post(`${env.ORDER_SERVICE_BASE_URL}/v1/orders`, {
        headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
        data: { reference: `ICM-${RUN_ID}-patch`, validUntil: '2099-12-31T23:59:59Z' },
      });
      expect(setupResponse.ok()).toBeTruthy();
      const orderId = (await setupResponse.json()).id;

      try {
        // ── Act ────────────────────────────────────────────────────────────
        const response = await request.patch(
          `${env.ORDER_SERVICE_BASE_URL}/v1/orders/${orderId}`,
          {
            headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
            data: { status: 'CONFIRMED' },
          },
        );

        // ── Assert ─────────────────────────────────────────────────────────
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.status).toBe('CONFIRMED');

        // PENDING ASSERTION — response does not document a confirmedAt field.
        // Cannot assert on this field until the open question is resolved.
        // Do not invent an expected value. Uncomment when the contract is confirmed.
        // expect(body.confirmedAt).toBe(/* unknown — see Stage 02 testability gap */);

      } finally {
        // ── Teardown ───────────────────────────────────────────────────────
        // Runs on success AND failure — a failed run must not leave residue that
        // breaks the next one.
        await request.delete(`${env.ORDER_SERVICE_BASE_URL}/v1/orders/${orderId}`, {
          headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
        });
      }
    });

});
