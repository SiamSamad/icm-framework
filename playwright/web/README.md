# Web (UI) Runner

Browser-driven Playwright tests. One config, one `npm install`; each product is a project with its own `baseURL`, auth setup, and bucket under this directory.

Sibling runners: `playwright/api/` (API tests), `maestro/` (mobile flows). A test is routed by the tool that runs it — see CLAUDE.md → Directory Layout.

```
playwright/web/
  package.json
  playwright.config.ts       # one project pair per product: <product>-setup + <product>
  tsconfig.json
  fixtures/
    auth.setup.example.ts    # template — copy per product, do not wire this file directly
  <product>/
    auth/
      .gitignore             # ignores the saved session; co-located with the product
      <product>.setup.ts     # copied from fixtures/, wired as a `dependencies:` entry
    pages/                   # page objects ({PageName}Page.ts) — interactions only
    tests/
      smoke/ regression/ e2e/    # tier-based products
      <page-area>/               # page-based products (from the product config)
      _unsorted/                 # fallback when the page area cannot be determined
```

---

## Prerequisites

1. **Install once, at this directory:** `npm install && npx playwright install`
2. **Create `.env` here** (gitignored) with the variables your product's config reads — at minimum a base URL and login credentials. Never hardcode them into a test.
3. **Confirm the environment is reachable from this machine** before blaming a test: `curl -I "$EXAMPLE_PRODUCT_URL"`. Most "the tests are broken" reports are this.

## Adding a product

1. Create `<product>/` with `pages/`, `tests/`, and `auth/`.
2. Copy `fixtures/auth.setup.example.ts` to `<product>/auth/<product>.setup.ts` and adapt the login to role-based locators (`getByRole`, `getByLabel`) rather than CSS.
3. Copy `<product>/auth/.gitignore` from an existing product so the session file is ignored from the start.
4. Add the setup project **and** the test project to `playwright.config.ts`, with the test project naming the setup in its `dependencies:` array.

---

## Things That Silently Break Tests

Each entry: the symptom you actually see, the diagnostic that identifies it, the fix, and where the fix lives. These are the failures that look like something else — a broken test, bad credentials, a flaky app.

### The login fills in, the click registers, and the page just sits there

- **Symptom:** the setup project fills the username and password, the submit click is recorded in the trace, and then nothing — the page never navigates, and the run dies on a navigation timeout. It looks exactly like wrong credentials.
- **Diagnostic:** the screen is not where the signal is. Open the trace and read the **browser console and network log**: a blocked request appears there and nowhere else. Wrong credentials, by contrast, produce a *rendered* error message on the page.
- **Fix:** grant the browser permission the app's own API calls need — commonly local-network access when a public-origin frontend calls a private-network backend.
- **Where the fix lives:** `playwright.config.ts`, in the project's `use.permissions` array. **It must be granted in both the setup project and the test project.** `storageState` persists cookies and localStorage; it does **not** persist browser permissions, so a permission granted only during setup is gone by the time the tests run.

### Everything fails immediately, including the setup

- **Symptom:** every project fails within seconds with connection or navigation timeouts, before any assertion runs.
- **Diagnostic:** `curl -I "$BASE_URL"` from this machine. If curl cannot reach it either, the environment is unreachable — not the tests.
- **Fix:** connect to the network the environment requires (VPN, proxy env vars), or point `baseURL` at an environment that is actually up.
- **Where the fix lives:** your `.env`, or the network itself. Per Stage 04's environment check, a setup-project timeout means **environment unreachable** and produces *no verdict* — it is never reported as failing tests.

### The suite passes locally and fails in CI, or vice versa

- **Symptom:** identical code, different result.
- **Diagnostic:** compare `retries` and `fullyParallel` between the two runs. This config sets `retries: 2` under CI and `0` locally, so a test that only passes on retry is green in CI and red locally.
- **Fix:** treat a retry-only pass as flaky, not as a pass. Stage 04 flags it, and flaky across two sessions counts as FAILED.
- **Where the fix lives:** the test. A retry-only pass is a real defect in the test or the app, deferred rather than solved.

### A test passes but asserted nothing

- **Symptom:** green test, no coverage.
- **Diagnostic:** search the test body for `expect(`. A test whose only assertion is inside a conditional that did not run has asserted nothing.
- **Fix:** every test ends with at least one executed assertion.
- **Where the fix lives:** the spec, and the Stage 04 quality checks that require it.

### Session file committed

- **Symptom:** none — this one is silent, which is why it matters.
- **Diagnostic:** `git status` after the first authenticated run. A session file appearing as untracked means the ignore rule is missing.
- **Fix:** add `<product>/auth/.gitignore`. Do not add a rule at the repo root instead; a per-product file travels with the bucket.
- **Where the fix lives:** `<product>/auth/.gitignore`.

---

## First-Run Checklist

- [ ] `npm install && npx playwright install` completed at `playwright/web/`
- [ ] `.env` created here, with the base URL and credentials your product reads
- [ ] `curl -I "$BASE_URL"` reaches the environment from this machine
- [ ] `<product>/auth/.gitignore` exists **before** the first authenticated run
- [ ] Setup project and test project both registered in `playwright.config.ts`, with the test project declaring the setup in `dependencies:`
- [ ] Any permission the app needs is granted in **both** projects
- [ ] `npx playwright test --list` prints the tests you expect (this needs no environment and no `.env` values)
- [ ] First real run: `npm run test:<product>`
