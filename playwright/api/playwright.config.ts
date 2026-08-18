import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Loads playwright/api/.env, resolved from the runner root — same convention as
// the web runner.
dotenv.config();

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // Not cosmetic, and not a performance oversight. API tests mutate shared server
  // state: one test deletes a resource while another asserts over the collection
  // that contains it. Run in parallel, the result depends on execution order, and
  // the suite fails intermittently in a way that reads as a flaky application.
  // Serial execution is the correctness requirement here, not a tuning choice.
  fullyParallel: false,
  workers: 1,
  retries: 1,

  // API tests issue many sequential requests, and a single test's setup can create
  // a dozen resources before the assertion it exists for. The 30s default expires
  // during setup rather than on a real failure, which points the investigation at
  // the wrong line.
  timeout: 120_000,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // Records the HTTP exchanges — request, response, headers, body. This is the
    // API equivalent of screenshot-on-failure: no browser is launched, so there is
    // no screenshot and no video to fall back on, and the trace is the only
    // evidence of what the server actually returned.
    trace: 'on-first-retry',
  },

  projects: [
    {
      // A single project for every API service. Services are selected by --grep on
      // the service tag every generated test carries, rather than by a project per
      // service — a new service then needs no config change at all:
      //   npx playwright test --project=api --grep @order-service
      name: 'api',
    },
  ],
});
