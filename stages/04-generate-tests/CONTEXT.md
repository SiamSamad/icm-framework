# Stage 04 — Generate and Run Playwright Tests

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/03-approve/output/<TICKET-ID>/approved.md` | Approved test cases; must contain `Proceed to Stage 04: YES` |
| Layer 3 | `_config/<product>.md` | Base URLs, test accounts, device configs, env var names |
| Layer 3 | `_config/selectors.md` | UI tests only — selector priority order for page object locators |
| Layer 3 | `_config/api-test-generation.md` | API tests only — output routing, request-fixture template, env module protocol, pending formats, DB validation |
| Layer 3 | `_config/auth-behavior.md` | API tests only — per-service auth header and status codes; read before any auth assertion |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

---

## GATE

The approval block in `stages/03-approve/output/<TICKET-ID>/approved.md` must contain `Proceed to Stage 04: YES`. Confirm this before generating anything. If the field is missing or not `YES`, stop and direct the user to complete Stage 03 first.

---

## PROCESS

### Role

You are an Automation Engineer. Your job is to convert human-approved test cases into executable Playwright TypeScript files, run them in the local scratch runner to prove they work, and emit a pass/fail report. A ticket may only advance to Stage 05 when its **latest Stage 04 run is fully green**.

### Load Product Config

Read the `product` field from the approved test cases (`stages/03-approve/output/<TICKET-ID>/approved.md`) — carried through from the Stage 01 spec via Stages 02 and 03. Do not re-classify the product independently, and never infer it from the ticket ID prefix. Load the matching config file from `_config/<product>.md` (e.g. `product: example-product` → `_config/example-product.md`).

Use the config to inform all decisions in this stage — base URLs, test accounts, selectors, known edge cases, and environment details.

### Output Locations — Read This Before Writing Anything

#### Generated test files — TEMPORARY scratch parking

```
playwright/{product}/pages/{PageName}Page.ts
playwright/{product}/tests/{category}/{TICKET-ID}.spec.ts
```

These are **temporary scratch parking only**. Tests live here until proven green. The permanent home is the promotion target (an external test repo, or this repo's integration branch in same-repo mode); promotion happens in Stage 05 — **never in Stage 04**.

#### Stage 04 report (per-ticket stage output)

```
stages/04-generate-tests/output/<TICKET-ID>/
  report.html              ← HTML run report
  summary.md               ← plain-text mirror of report.html
  failed/                  ← on-failure screenshots, one per failing test: TC-<n>.png
  previous-run/            ← prior run archived here; exactly one prior run kept
```

---

## STEP 1 — GENERATE

Two generation paths. **UI tests** produce page objects plus a spec, described below. **API tests** produce a spec plus environment config modules and follow `_config/api-test-generation.md` — see API Test Generation at the end of this step.

### UI Test Generation

Generate two files per ticket from the approved test cases and product config.

### File 1 — Page Object(s) (`playwright/{product}/pages/`)

One TypeScript class per page or modal involved in the tests.

- Named `{PageName}Page.ts` (e.g., `ConfirmPage.ts`, `LoginPage.ts`)
- Contains locators and interaction methods only — no test logic, no `expect()` calls
- Every interactable element gets a method; every navigable route gets a `goto()` method
- Locators are defined once as `private readonly` class properties

### File 2 — Test Spec (`playwright/{product}/tests/{category}/{TICKET-ID}.spec.ts`)

One spec file containing all approved test cases.

- Imports and uses page objects — never raw selectors in test bodies
- Each test is tagged with `@smoke`, `@regression`, and/or `@e2e` using Playwright's `{ tag: [...] }` option
- TMS ID noted in a comment on the first line inside each `test()` block
- Not duplicated under `stages/04-generate-tests/output/` — see Output Locations above

### Output Routing

Route the two generated files by the `product` field — **never** by the ticket ID prefix. A ticket's ID prefix does not reliably indicate which product it belongs to; always trust the `product` field carried through the pipeline.

Page objects always go to `playwright/{product}/pages/`. The test spec's `{category}` folder depends on which routing mode the product config declares:

| Routing mode | Test spec goes to | When to use |
|--------------|-------------------|-------------|
| **Tier-based** (default) | `playwright/{product}/tests/{smoke\|regression\|e2e}/` | Product config has no page-area table |
| **Page-based** | `playwright/{product}/tests/{page-area}/` | Product config defines a "Key Flows and Routes" (page areas) table |

**Tier-based routing:** route the spec by test tier driven by the test's tags: tests that are exclusively `@smoke` or `@regression` (not full e2e flows) go to `tests/smoke/` or `tests/regression/`; otherwise `tests/e2e/`.

**Page-based routing:** route by page area — see "Page Folder Selection" below.

### Page Folder Selection (page-based products only)

Determine which page folder the test spec belongs in by reading the ticket's content and the normalized spec (feature summary, trigger, and the screens/routes the test cases exercise). Match against the "Key Flows and Routes" table in the product's `_config/<product>.md`.

**Never guess silently — always announce the page choice or the fallback:**

- **If a page can be confidently determined**, save the spec there and print a line in the conversation stating the choice and why, e.g.:
  `📁 Page folder: checkout/  (ticket is about the checkout flow)`
- **If the correct page cannot be confidently determined**, save the spec to `playwright/{product}/tests/_unsorted/` instead and print:
  `⚠️ Could not confidently determine the page folder — placed in _unsorted/. Please move it to the correct page folder.`

---

## Page Object Standards

### Structure

```typescript
import { Page, Locator } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  private readonly someButton: Locator;
  private readonly someInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someButton = page.getByTestId('btn-example');
    this.someInput = page.getByLabel('Example input');
  }

  async goto(id?: string) {
    await this.page.goto(`${process.env.BASE_URL}/route/${id ?? ''}`);
  }

  async tapSomeButton() {
    await this.someButton.click();
  }

  async isSomeButtonVisible(): Promise<boolean> {
    return this.someButton.isVisible();
  }
}
```

### Rules

1. **No `expect()` in page objects.** Assertions belong in the spec. Page objects return values; specs assert on them.
2. **One method per interaction.** `tapConfirm()`, not `doPickupFlow()`.
3. **Locators are private, methods are public.** Tests interact through methods, not properties.
4. **Boolean state methods are named `is*` or `*IsVisible`.** Return `Promise<boolean>`.
5. **String content methods return `Promise<string | null>`.** Use `textContent()`.
6. **Selector priority: follow `_config/selectors.md`.** In page objects, do not use CSS class selectors. Preference order: `getByTestId` → `getByRole` → `getByLabel` → `getByText`. If none of these work, add a `data-testid` to the component rather than falling back to CSS.

---

## Test Spec Standards

### File Structure

```typescript
import { test, expect, Browser } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ExamplePage } from '../../pages/ExamplePage';

test.describe('TICKET-XXXX — Feature Name', () => {
  const TEST_LOAD_ID = process.env.APP_TEST_ID ?? 'TEST-001';

  test.beforeAll(async ({ browser }) => {
    // Verify auth and feature flags before running suite
  });

  test('TC-1 — Test case title', { tag: ['@smoke', '@e2e'] }, async ({ browser }) => {
    // TMS: TMS-XXXX
    const context = await browser.newContext({ permissions: [] });
    const page = await context.newPage();
    const login = new LoginPage(page);
    const examplePage = new ExamplePage(page);

    await login.loginAsUser();
    // arrange → act → assert using page object methods
    await context.close();
  });
});
```

### Rules

1. **One `test()` block per approved test case.** Do not merge TCs.
2. **TC number and title in every test description.** `'TC-3 — Modal does not appear when...'`
3. **TMS ID on the first line inside every `test()` block.** `// TMS: TMS-XXXX` or `// TMS: —` if none.
4. **Tags are required and must use Playwright's native tag API — never embed tags in the test title string.** `test('description', { tag: ['@regression', '@smoke'] }, async ({ page }) => { ... })`. Every test must have at least one of `@smoke`, `@regression`, `@e2e`.
5. **No hardcoded credentials.** Use `process.env` variables defined in the product config.
6. **No `page.waitForTimeout()`.** Use `waitFor({ state })`, `toBeVisible()`, or `waitForURL()`.
7. **Mobile viewport.** Use `browser.newContext({ ...devices['iPhone 14'] })` or the device from the product config. Do not invent viewport values.
8. **Every test ends with at least one `expect()`.** No silent passes.
9. **API assertions use `page.waitForRequest()`.** Intercept and assert on the request body — do not rely on UI alone for event logging tests.
10. **Skipped tests require a `// TODO:` comment** explaining why and what unblocks them.

---

## Handling Mobile Permissions

Use `browser.newContext()` with the `permissions` option to control geolocation state per test:

```typescript
// Denied state
const context = await browser.newContext({ permissions: [] });

// Granted state — also set a mock coordinate
const context = await browser.newContext({
  permissions: ['geolocation'],
  geolocation: { latitude: 33.749, longitude: -84.388 },
});

// Grant permission mid-test (simulates user approving OS dialog)
await context.grantPermissions(['geolocation']);
await context.setGeolocation({ latitude: 33.749, longitude: -84.388 });
```

For tests that assert the native OS dialog appears (e.g., AC-3 "one-tap enable"), add a `// manual verification required` comment and generate a test that asserts the pre-dialog state only.

---

## API Test Generation

Applies when the approved definitions came from an API spec. Load `_config/api-test-generation.md` and follow it for routing, the template, and every format below. Output goes to `playwright/api/`, never `playwright/web/`.

**Step 1 — Environment config modules, in strict order.** `required.ts` (write once, never modify), `env.shared.ts` (generated empty; a variable moves here only when a *second* service reads it), `env.{service}.ts` (append-only, never reorder, never touch another service's module), then the `env.ts` barrel (add exactly one import, one descriptor spread, one cast type). A pre-split monolithic `env.ts` is reported, never auto-migrated.

**Step 2 — One spec per service or endpoint group**, named for the service rather than the ticket, using the Playwright `request` fixture. **No `browser`, no `page`, no page objects, no `storageState`, no selectors** — their presence in an API spec is a generation defect.

**Step 3 — Assertions.** Open assertions (`open_item: true`) generate as commented-out pending blocks carrying the `open_reason`; never invent an expected value. Auth assertions take their status from `_config/auth-behavior.md`, and an ASSUMED row adds `@auth-unverified` to the tag array. Unresolved auth mechanisms generate the auth placeholder block quoting the open question.

**Step 4 — DB validation.** For each test with `type_prefix: API/DB` or `FUNC/DB`, or a non-empty `data_validation` entry in the Stage 01 `coverage_matrix`, generate a post-call DB verification step after the API assertion. Include the SQL and tables when known; otherwise generate the pending block. Do not invent SQL, and **never open a DB connection unless the connection details are present in `environment_config`**.

**Step 5 — Skipped definitions generate as skipped**, never active — see SKIPPED TEST GENERATION.

**Step 6 — Ask before running.** Present the generation report summary (tests generated per service, pending items) and ask whether to run now or hold. **Do not auto-run.** If the target environment is unreachable, report that and hold — an unreachable environment is not a test failure. Once the user chooses to run, STEP 2 below applies unchanged.

**Run command:**
```
cd playwright/api
npx playwright test --grep @order-service
```

---

## STEP 2 — RUN

After generating (or when handling a re-run request), execute the ticket's spec via the local Playwright runner. Each product has its own runner directory with its own `package.json` and `playwright.config.ts`; auth setup runs automatically as a project dependency.

**Run command:**
```
cd playwright/{product}
npx playwright test --project={product} tests/{category}/{TICKET-ID}.spec.ts
```
(`{category}` is the tier folder or page-area folder chosen by the routing rules above.)

### Environment check

If the auth setup dependency itself fails with a network or navigation timeout — not the test spec, but the setup project — the environment is unreachable. Do not mark any tests as failed. End the stage with this message in the conversation and do not write a report:

> **Environment unreachable — check VPN.** The auth setup timed out; no tests were run. Connect to VPN and re-run Stage 04 for \<TICKET-ID\>.

Only mark individual tests as FAILED when auth succeeded and the spec itself failed.

---

## STEP 3 — COLLECT SCREENSHOTS

Playwright's `screenshot: 'only-on-failure'` setting writes screenshots to `playwright/{product}/test-results/` after failed runs.

1. For each failing test, locate its `test-failed-1.png` (or equivalent) under `playwright/{product}/test-results/`. The folder name is derived from the spec path and test description — look for a path that contains the TICKET-ID and the test name.
2. Create `stages/04-generate-tests/output/<TICKET-ID>/failed/` if it does not exist.
3. Copy each screenshot to `stages/04-generate-tests/output/<TICKET-ID>/failed/TC-<n>.png`, where `<n>` is the test case number (`TC-1.png`, `TC-2.png`, etc.).

If no screenshot is found for a failing test (e.g., the test failed before the browser launched), note it in the report as "screenshot unavailable."

---

## STEP 4 — REPORT

### Re-run rotation — do this FIRST if a prior run exists

Before writing any new output, check whether `stages/04-generate-tests/output/<TICKET-ID>/` already contains `report.html`, `summary.md`, or a `failed/` subfolder:
- If it does: move (overwrite) all three into `stages/04-generate-tests/output/<TICKET-ID>/previous-run/`, replacing whatever was already there. Keep exactly **one** prior run.
- Then write the fresh output below.

If the ticket folder does not exist yet, create it.

### Write `report.html`

Follow `_config/report-style.md` for HTML conventions (pure HTML + inline CSS, zero external dependencies, status colors, code chip styling). Structure the content failures-first:

**1. Verdict banner** — prominently at the top of the page:
- All passing: `✅ PASSED — eligible for Stage 05`
- Zero failures, one or more tests skipped with documented external blockers: `🟡 BLOCKED — X of M tests skipped (external dependency). Stage 05 is blocked until all tests pass. See dev-request.txt.`
- Any failure: `❌ FAILED — N of M tests failing. Fix and re-run. Stage 05 is blocked for this ticket.`

**2. FAILED TESTS section** (omit entirely if no failures) — one block per failing test:
- Test case ID and title (e.g., TC-2 — Login redirects to the item list)
- The step where it failed: the Playwright action or assertion that threw
- The actual error message, trimmed to the meaningful part (strip stack frames)
- What it was looking for: the selector or element description from the error
- Screenshot link (relative): `<a href="./failed/TC-<n>.png">View screenshot</a>` — or "screenshot unavailable" if none was captured

**3. ROLLUP section** (omit entirely if no failures):
- **Missing selectors** — one consolidated list of all selectors/elements not found across all failures, with special attention to missing `data-testid` values. This is the list a developer opens the report to act on.
- **Failures by cause** — group failing tests under: `element-not-found` / `assertion-failed (expected vs actual)` / `timeout` / `other`

**4. PASSED TESTS section** — compact table: TC, title, duration.

### Write `summary.md`

Mirror of `report.html` in plain Markdown. Same four sections (verdict, failed tests, rollup, passed tests), same content and detail level.

---

## SKIPPED TEST GENERATION

A test definition arriving from Stage 03 with a `Skip` row is **generated as a skipped test**. It is never generated as active, and the skip is never dropped because the blocker looks resolved — that judgement belongs to Stage 02 and the human who approved it, not to generation.

The reason string appears in **two** places, because they serve different readers:

1. **A comment directly above the test** — for whoever opens the file.
2. **Inside the `test.skip()` call itself** — so it reaches the run output and the report, where nobody is reading source.

```typescript
// SKIPPED — @blocked-status-enum
// New orders are created with status PENDING; the cases assert DRAFT, and the service
// exposes no DRAFT state. Tracked on DEMO-4471. Unblocks when the status model is
// confirmed and the cases are regenerated.
test.skip(
  'order-service-DEMO-TC-1201 — POST /v1/orders',
  { tag: ['@example-product', '@order-service', '@blocked-status-enum'] },
  async ({ request }) => {
    // body generated in full, exactly as if it were active
  },
);
```

UI tests use the identical shape with the Mode A tags and the `{ tag: [...] }` option already required by Test Spec Standards.

**Rules:**

- **Generate the body in full.** A skipped test is a complete test that is not running yet. An empty or stubbed body means the skip cannot simply be lifted when the blocker clears — the test would have to be written from scratch.
- **The tag, when present, joins the test's tag array** alongside the product and service tags, so `--grep` can select or exclude every test behind one blocker in a single run.
- **Never `test.skip()` without a reason**, and never let the reason live only in the comment. Both placements are required.
- **Skipped tests count toward the `Z skipped` figure** in the verdict counts, and each is listed in `summary.md` with its reason. They are never reported as passes.
- **A skipped test cannot fail**, so it never contributes to a FAILED verdict. A run whose only non-passing tests are skips is **BLOCKED**, not FAILED.

---

## STEP 5 — VERDICT AND HANDOFF

### Three verdict states

**PASSED** — every test ran and passed. Eligible for Stage 05.

**BLOCKED** — zero failures, but one or more tests are skipped due to documented external dependencies (missing `data-testid` attributes, unavailable test data, unconfirmed product behavior) or an approved skip directive carried from Stage 02. Every skip must name its specific blocker in `summary.md`. BLOCKED is not a failure state, but **it does not promote**: Stage 05's gate is PASSED-only, with no waivers. Blocked work waits until the dependency is delivered and Stage 04 re-runs clean.

When a verdict is BLOCKED on missing `data-testid` attributes, the stage must produce `stages/04-generate-tests/output/<TICKET-ID>/dev-request.txt` listing the exact attributes needed and which tests each unblocks, written so it can be pasted directly into a ticket for the dev team.

**FAILED** — one or more tests fail. Fix the failures and re-run. Stage 05 is blocked.

The distinction matters because BLOCKED and FAILED call for different actions by different people: FAILED is ours to fix, BLOCKED is somebody else's to deliver. Collapsing them into one state loses that, and a suite reported as failing when it is actually waiting on a dependency gets debugged instead of escalated.

End the stage with a conversation message that states:

- **Verdict:** PASSED / BLOCKED / FAILED
- **Counts:** X passed / Y failed / Z skipped
- **Report:** `stages/04-generate-tests/output/<TICKET-ID>/report.html`
- **Next step:**
  - All green → "Say **proceed** to move to Stage 05."
  - BLOCKED → "Deliver the items in `dev-request.txt`, then say **re-run Stage 04 for \<TICKET-ID\>** to re-execute."
  - Any failure → "Fix the failing tests, then say **re-run Stage 04 for \<TICKET-ID\>** to re-execute without regenerating."

### What "re-run Stage 04 for \<TICKET-ID\>" means

Re-run = execute the already-parked test files (STEP 2 onward), with the previous-run rotation applied before writing fresh output. **Do NOT regenerate page objects or the spec file** — those files already exist at `playwright/{product}/`. Regeneration only happens when explicitly asked.

---

## OUTPUTS

| File | Path | Condition |
|------|------|-----------|
| Page object(s) | `playwright/{product}/pages/{PageName}Page.ts` | UI tests (temporary scratch) |
| Test spec | `playwright/{product}/tests/{category}/{TICKET-ID}.spec.ts` | UI tests (temporary scratch) |
| API test spec | `playwright/api/tests/{service}/<name>.spec.ts` | API tests (temporary scratch) |
| Env config modules | `playwright/api/config/{required,env.shared,env.{service},env}.ts` | API tests (temporary scratch) |
| HTML run report | `stages/04-generate-tests/output/<TICKET-ID>/report.html` | Always |
| Plain-text summary | `stages/04-generate-tests/output/<TICKET-ID>/summary.md` | Always |
| Failure screenshots | `stages/04-generate-tests/output/<TICKET-ID>/failed/TC-<n>.png` | One per failing test |
| Prior run archive | `stages/04-generate-tests/output/<TICKET-ID>/previous-run/` | When a prior run existed |
| Dev attribute request | `stages/04-generate-tests/output/<TICKET-ID>/dev-request.txt` | When the verdict is BLOCKED on missing `data-testid` attributes |

---

## VERIFY

- Approval block contains `Proceed to Stage 04: YES` — confirmed at stage entry.
- Product field was read from the approved test cases, never inferred from the ticket ID prefix.
- Re-run rotation was applied before writing fresh report output (if a prior run existed).
- Every definition marked skipped in the approval was generated as a skipped test — counted against the approval, not assumed. No skipped definition was generated as active.
- Every generated skipped test carries its reason both as a comment and inside the `test.skip()` call.
- The skipped-test count in the generated spec equals the skip count in the approval.
- A run whose only non-passing tests are skips was reported BLOCKED, never FAILED, and never PASSED.

---

## QUALITY CHECKS

- Every TC from the approval file has a corresponding `test()` block — count them.
- No test uses a raw selector (`page.locator('.some-class')`) — all interactions go through page object methods.
- Every `test()` contains at least one `expect()`.
- No test is skipped without a reason string in both the comment above it and inside the `test.skip()` call — see SKIPPED TEST GENERATION. A skip whose reason lives only in a comment is malformed.
- No skipped test has an empty or stubbed body.
- Every `browser.newContext()` is matched with `await context.close()` at the end of the test.
- Base URL, credentials, and device configs come from `_config/<product>.md` via `process.env`, not hardcoded.
- Page object file names match `{PageName}Page.ts` exactly.
- Spec file is saved to the correct category folder under `playwright/{product}/tests/` only — never duplicated under `stages/04-generate-tests/output/`.
- Product was read from the approved test cases' `product` field — never inferred from the ticket ID prefix.
- For page-based products, the page-folder choice (or the `_unsorted/` fallback) was announced in the conversation — never silent.

**API tests:**
- No API spec imports `browser`, `page`, a page object, `storageState`, or any selector.
- Every generated test carries both `product_tag` and `service_tag` exactly as the Stage 02 definition wrote them.
- Every test body opens with the `// Stage 02 case: <case_id>` traceability comment.
- No test reads `process.env` directly — every value comes through the `env` barrel.
- Every variable in Stage 01 `environment_config.variables` has an entry in that service's env module, and no variable name is declared in two modules.
- `required.ts` was written only if absent, and never modified. No other service's env module was touched.
- A pre-split monolithic `env.ts` was reported, never auto-migrated.
- `.env.example` was not written by this stage — Stage 05 owns it at promotion time.
- Every pending assertion, pending DB validation, and pending auth block carries a stated reason and appears in the generation report.
- No DB connection was opened without connection details in `environment_config`, and no SQL was invented.
- Every `finally` teardown block deletes the resources its setup created.
