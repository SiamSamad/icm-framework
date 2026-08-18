# API Runner

Playwright `request`-fixture tests for HTTP services. No browser is launched: no page objects, no selectors, no `storageState`.

Sibling runners: `playwright/web/` (browser tests), `maestro/` (mobile flows).

```
playwright/api/
  package.json
  playwright.config.ts       # one `api` project; services selected by --grep
  .env.example               # names only, grouped per service — Stage 05 maintains it
  config/
    required.ts              # shared validator — written once, never modified
    env.shared.ts            # values with a second reader; empty until then
    env.<service>.ts         # one per service, append-only
    env.ts                   # barrel — the only file tests import
  tests/
    <service>/<name>.spec.ts # one spec per service or endpoint group
```

## Prerequisites

1. `npm install` at this directory.
2. `cp .env.example .env` and fill in the values. Names only live in the example file; values never do.
3. `npx playwright test --list` — this works with **no `.env` at all**, because env getters validate on access rather than at import. If listing fails, the barrel has been broken (something is spreading a module instead of copying its property descriptors).

## Running

```
npm run test:api                      # every service
npm run test:order-service            # one service, by tag
npx playwright test --grep @order-service --grep-invert @blocked-status-enum
npm run test:auth-unverified          # list every assertion drawn from an ASSUMED auth row
npm run report
```

Service selection is by tag, not by project, so adding a service needs no config change.

## Things That Silently Break Tests

### `playwright test --list` throws about a missing environment variable

- **Symptom:** listing or filtering tests fails before anything runs, naming a variable.
- **Diagnostic:** open `config/env.ts`. If it uses `...sharedEnv` or `Object.assign` rather than `Object.getOwnPropertyDescriptors`, every getter is invoked at import time.
- **Fix:** copy property descriptors so the getters stay lazy.
- **Where the fix lives:** `config/env.ts` — see the comment at the top of it.

### A variable reads as `undefined` instead of throwing

- **Symptom:** a request goes out with `undefined` in the URL or header and fails with a confusing server error.
- **Diagnostic:** the test read `process.env.X` directly instead of `env.X`.
- **Fix:** route every value through the barrel. The getter throws by name; `process.env` does not.
- **Where the fix lives:** the spec.

### Tests pass alone and fail together

- **Symptom:** `--grep` on one test passes; the full suite fails.
- **Diagnostic:** shared server state. One test deletes or mutates a resource another asserts over.
- **Fix:** this is why `fullyParallel: false` and `workers: 1` are set. If they have been raised, put them back. If the failure persists at one worker, the tests are not independent — each must create its own resources in setup and remove them in teardown.
- **Where the fix lives:** `playwright.config.ts` for the concurrency settings; the spec for independence.

### The same test fails on every second run

- **Symptom:** first run green, next run 409 or "already exists".
- **Diagnostic:** a hardcoded reference value, or a teardown that did not run.
- **Fix:** derive unique values from a run-scoped `RUN_ID`, and wrap the act/assert in `try/finally` so teardown runs on failure too.
- **Where the fix lives:** the spec — see `tests/order-service/order-service.spec.ts`.

### An auth test asserts the wrong status

- **Symptom:** an auth assertion fails against a working service, or passes while proving nothing.
- **Diagnostic:** check `_config/auth-behavior.md` for that service. `401` and `403` are both plausible and the difference is framework configuration, not service code.
- **Fix:** use the recorded status. If the row says ASSUMED, keep `@auth-unverified` on the test until it has been probed.
- **Where the fix lives:** `_config/auth-behavior.md`, then the spec.

## First-Run Checklist

- [ ] `npm install` completed at `playwright/api/`
- [ ] `.env` created from `.env.example`, every name filled
- [ ] `npx playwright test --list` prints the expected tests
- [ ] The target environment is reachable: `curl -I "$ORDER_SERVICE_BASE_URL"`
- [ ] Auth rows for the services under test are VERIFIED, or their tests carry `@auth-unverified`
- [ ] `npm run test:<service>` for a single service before running the whole suite
