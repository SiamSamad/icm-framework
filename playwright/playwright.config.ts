import { defineConfig, devices } from '@playwright/test';

/**
 * One shared Playwright setup for all products.
 * Each product is a "project" with its own baseURL, so a single `npm install` and a single
 * config drive every product's tests. Add a new product by copying a block below and pointing
 * `testDir` at its bucket.
 *
 * Store secrets in a gitignored `.env` and read them via process.env — never hardcode them.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'example-product',
      testDir: './example-product/tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.EXAMPLE_PRODUCT_URL ?? 'https://staging.example.com',
      },
    },
    // Add another product:
    // {
    //   name: 'my-product',
    //   testDir: './my-product/tests',
    //   use: { ...devices['Desktop Chrome'], baseURL: process.env.MY_PRODUCT_URL },
    // },
  ],
});

/**
 * TROUBLESHOOTING — corporate networks / VPN:
 * If tests fail immediately with navigation or connection timeouts (especially the
 * auth/setup step, before any real test runs), the environment may be unreachable
 * from the test browser rather than the tests being broken:
 *  - On VPN-gated environments, Chromium may need explicit local-network access.
 *    Known fix pattern: grant it on the browser context, e.g.
 *      await context.grantPermissions(['local-network-access']);
 *    (add in the auth/setup fixture or a global setup, not per-test)
 *  - Also check: VPN connected, proxy env vars, and that the baseURL resolves
 *    from this machine (try curl/ping first).
 * Per Stage 04's environment check: a setup-step timeout means "environment
 * unreachable — check VPN", NOT test failures. Do not mark tests failed for this.
 */
