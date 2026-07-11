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
