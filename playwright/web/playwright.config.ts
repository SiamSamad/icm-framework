import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Loads playwright/web/.env, resolved from the runner root.
dotenv.config();

/**
 * Web (UI) runner. One config for every browser-driven product; each product is a
 * project with its own baseURL. Add a product by copying the pair of blocks below
 * and pointing `testDir` at its bucket.
 *
 * Sibling runners: playwright/api/ (API tests), maestro/ (mobile flows).
 *
 * Store secrets in a gitignored `.env` and read them via process.env — never hardcode.
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
      // Auth setup runs once and writes a storageState file the test project reuses.
      // It is a separate project rather than a global-setup hook so its failures are
      // reported as a named step — Stage 04 reads a setup-project timeout as
      // "environment unreachable", not as test failures.
      name: 'example-product-setup',
      testDir: './example-product',
      testMatch: 'auth/example-product.setup.ts',
    },
    {
      name: 'example-product',
      testDir: './example-product/tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.EXAMPLE_PRODUCT_URL ?? 'https://staging.example.com',
        // Written by the setup project above; gitignored via example-product/auth/.gitignore.
        storageState: 'example-product/auth/.session.json',
        viewport: { width: 1280, height: 720 },
        // storageState restores cookies and localStorage — it does NOT restore browser
        // permissions. Any permission the app needs must be granted here as well as in
        // the setup project, or the setup passes and the tests fail for a different reason.
        // permissions: ['geolocation'],
      },
      // Declaring the dependency here (rather than calling the setup inline) is what makes
      // the setup run exactly once per invocation and skip the test project when it fails.
      dependencies: ['example-product-setup'],
    },
    // Add another product — a setup project plus a test project that depends on it:
    // {
    //   name: 'my-product-setup',
    //   testDir: './my-product',
    //   testMatch: 'auth/my-product.setup.ts',
    // },
    // {
    //   name: 'my-product',
    //   testDir: './my-product/tests',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     baseURL: process.env.MY_PRODUCT_URL,
    //     storageState: 'my-product/auth/.session.json',
    //   },
    //   dependencies: ['my-product-setup'],
    // },
  ],
});
