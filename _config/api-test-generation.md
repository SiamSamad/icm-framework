# API Test Generation — Reference

Load this module in Stage 04 when generating **API tests**. It defines the output routing convention, the Playwright API test template, the environment config module protocol, the auth placeholder format, the pending assertion format, and the DB validation step templates. It is not loaded by any other stage.

---

## Output Routing

Generated files mirror the promotion target's structure exactly, so Stage 05 can promote without restructuring.

```
playwright/api/tests/{service}/<name>.spec.ts    # API test spec
playwright/api/config/env.{service}.ts           # per-service env module — owns only that service's variables
playwright/api/config/env.shared.ts              # values read by more than one service
playwright/api/config/env.ts                     # barrel — composes shared + every service module into `env`
playwright/api/config/required.ts                # shared validator, written once
playwright/api/helpers/                          # shared helpers, if generated
```

Where:
- `{service}` = `service_tag` with the `@` stripped and hyphens preserved (e.g. `@order-service` → `order-service`)
- `<name>` = spec file name — see Spec File Naming below

The API runner is one bucket in a tool-first layout: `playwright/api/` for API tests, `playwright/web/` for browser tests, `maestro/` for mobile flows. A test is routed by the tool that runs it, never by the ticket prefix.

**Spec File Naming**

Name the spec after the service or logical endpoint group, not the ticket. A ticket ID is never required to name a file — cases sourced from a TMT folder may have no parent ticket at all.

| Situation | File name |
|-----------|-----------|
| Service-level tests (primary case) | `{service-slug}.spec.ts` e.g. `order-service.spec.ts` |
| Ticket-scoped tests (ticket ID exists and tests are narrowly scoped to it) | `{TICKET-ID}.spec.ts` e.g. `PROJ-232.spec.ts` |
| Endpoint-group tests (neither above) | `{endpoint-group-slug}.spec.ts` |

**One spec file per service or logical endpoint group.** Never co-locate tests for different services in the same spec file.

```
playwright/api/tests/order-service/order-service.spec.ts
playwright/api/tests/order-service/PROJ-232.spec.ts       # ticket-scoped variant
playwright/api/tests/inventory-service/inventory-service.spec.ts
playwright/api/config/env.ts
```

**Stage 04 reports** (per-ticket, never promoted) continue to write to the standard path:
```
stages/04-generate-tests/output/<TICKET-ID>/report.html
stages/04-generate-tests/output/<TICKET-ID>/summary.md
```

---

## Environment Config Module

Environment values are split one file per service. A single shared module means two branches touching different services conflict on one file, and resolving toward either side silently drops the other service's variables. Each service owns its own module; the barrel is the only shared file, and it changes only when a service is **added**.

Tests are unaffected — they still `import { env } from '../../config/env'` and read `env.VARIABLE_NAME`. The split is invisible above the barrel.

### Four files, in this order

**1. `playwright/api/config/required.ts`** — the shared validator. Generate if absent. **Never modify it once it exists**; it has no per-service content, so it can never conflict.

```typescript
// playwright/api/config/required.ts
// Shared validator for every env module in this runner.
// Written once when the first service is generated; never modified after.

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
```

**2. `playwright/api/config/env.shared.ts`** — values read by more than one service. Generate it empty when the runner is first set up, so the barrel is wired once and a future shared variable costs a one-file edit.

```typescript
// playwright/api/config/env.shared.ts
// Environment values read by more than one service.
//
// A variable belongs here ONLY once a second service actually reads it. Until
// then it belongs to the single service that reads it. Never promote a variable
// here in anticipation — moving it when the second reader arrives is a two-file
// edit, while guessing wrong splits ownership for a reader that never comes.
//
// Empty is the correct state when no variable has two readers yet.

import { required } from './required';

export const sharedEnv = {
  // get EXAMPLE_SHARED_VALUE() { return required('EXAMPLE_SHARED_VALUE'); },
};
```

**3. `playwright/api/config/env.{service}.ts`** — one per service, holding only that service's variables from Stage 01 `environment_config.variables`. `{service}` is the same slug as the tests folder (`order-service`); the exported const is that slug camel-cased with an `Env` suffix (`orderServiceEnv`).

```typescript
// playwright/api/config/env.order-service.ts
// Environment values owned by @order-service.
// Only this service's variables belong here — never add another service's.

import { required } from './required';

// Getters validate on access, not at import time.
// This keeps `playwright test --list` working even when no .env is present.
export const orderServiceEnv = {
  get ORDER_SERVICE_BASE_URL() { return required('ORDER_SERVICE_BASE_URL'); },
  get ORDER_SERVICE_API_KEY()  { return required('ORDER_SERVICE_API_KEY'); },
};
```

If the file already exists, **append** variables not yet present — never overwrite it, never remove an entry, never reorder. Never write another service's module.

**4. `playwright/api/config/env.ts`** — the barrel. Generate if absent; otherwise add exactly this service's import, descriptor spread, and cast type, and change nothing else.

```typescript
// playwright/api/config/env.ts
// Barrel. Composes the shared module and every service module into the single
// `env` object that test files import. Adding a service adds one import, one
// descriptor spread, and one type to the cast — nothing else here ever changes.
//
// Never spread or Object.assign the modules themselves: both invoke every getter
// at import time, which throws on the first missing variable and breaks
// `playwright test --list`. Copying property descriptors keeps every getter lazy.

import { sharedEnv } from './env.shared';
import { orderServiceEnv } from './env.order-service';
import { inventoryServiceEnv } from './env.inventory-service';

export const env = Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(sharedEnv),
  ...Object.getOwnPropertyDescriptors(orderServiceEnv),
  ...Object.getOwnPropertyDescriptors(inventoryServiceEnv),
}) as typeof sharedEnv & typeof orderServiceEnv & typeof inventoryServiceEnv;
```

### Ownership rule

**A variable name lives in exactly one module.** Before adding a getter, check that no other module already declares that name. Two modules declaring the same name is a defect, not a merge: the barrel applies descriptors in order and the last one silently wins.

- **One reader** → that service's module. This is the default and covers most variables.
- **A second service starts reading it** → move it to `env.shared.ts`: delete the getter from the owning service's module and add it to the shared one. Two files, one commit.
- **Never** import one service's module into another, and never read a variable from a module that does not declare it.

### A pre-split `env.ts` (legacy monolith)

If `playwright/api/config/env.ts` exists but is **not** a barrel — it declares `required` inline and holds getters for several services — it predates this split. **Stop and report it. Do not migrate it automatically.** Splitting a live module is a one-time decision about which service owns which variable, and getting it wrong drops variables silently — the exact failure this structure exists to prevent. Say which file it is, how many getters it holds, and that a manual split is needed before generation continues.

### Rules

- Every variable listed in Stage 01 `environment_config.variables` must have an entry in that service's module.
- No test file reads `process.env` directly — all access goes through the barrel.
- Variables are validated at the point of use: a missing variable throws when accessed, not at import time.
- Never fall back to a default or swallow `undefined`; the getter must throw.
- A service module never imports another service module. The barrel is the only file that imports them.
- **A variable that is declared but read by no test is kept, not deleted**, and marked `// UNREAD —` with the provenance of where it came from. Deleting it is silent coverage loss; someone else decides whether it is stale. The same applies to an entry whose value has gone out of date: annotate it "stale, not accurate" rather than rewriting or reordering it. Where an open question produced a variable, cross-reference it in a comment so the two stay connected.

### .env.example

`.env.example` is maintained by **Stage 05 at promotion time**, not by Stage 04. When Stage 05 copies or updates a service module, it adds the same new variable names to `.env.example` as empty placeholders. See `stages/05-results/CONTEXT.md`.

**Stage 04 must never write to `.env.example`.**

---

## Test Template

Use the Playwright `request` fixture. **No `browser`, no `page`, no page objects, no `storageState`, no selectors** — an API spec containing any of those is malformed.

```typescript
import { test, expect } from '@playwright/test';
import { env } from '../../config/env';

test.describe('<CASE-KEY> — <METHOD> <path>', () => {

  test('<test_id> — <name>',
    { tag: ['<product_tag>', '<service_tag>'] },
    async ({ request }) => {
    // Stage 02 case: <case_id>

    // ── Setup ──────────────────────────────────────────────────────────────
    // Create any pre-existing resource this test requires.
    // If no setup is needed, remove this block entirely.
    const setupResponse = await request.post(`${env.ORDER_SERVICE_BASE_URL}/v1/orders`, {
      headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
      data: { /* setup payload */ },
    });
    expect(setupResponse.ok()).toBeTruthy();
    const setupId = (await setupResponse.json()).id;

    try {
      // ── Act ────────────────────────────────────────────────────────────
      const response = await request.patch(`${env.ORDER_SERVICE_BASE_URL}/v1/orders/${setupId}`, {
        headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
        data: { field: env.SOME_DATA_DEPENDENCY /* never a literal */ },
      });

      // ── Assert ─────────────────────────────────────────────────────────
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('CONFIRMED');

    } finally {
      // ── Teardown ───────────────────────────────────────────────────────
      // Runs on success AND failure. Delete every resource created in Setup.
      // If no setup was done, remove this block entirely.
      await request.delete(`${env.ORDER_SERVICE_BASE_URL}/v1/orders/${setupId}`, {
        headers: { 'X-Api-Key': env.ORDER_SERVICE_API_KEY },
      });
    }
  });

});
```

### Authoring conventions

- **One `describe` per case**, titled `<CASE-KEY> — <METHOD> <path>`.
- **Test titles** are `<test_id> — <name>`; where a case yields several scenarios, suffix the case key (`DEMO-TC-1201-S2 — <scenario>`).
- **A `// Stage 02 case: <case_id>` traceability comment is the first line of every test body.** It is the only link back from generated code to the approved definition.
- **Dual tags on every test** — `product_tag` and `service_tag` exactly as the Stage 02 definition wrote them, `@` prefix included.
- **All values via `env.*`.** No hardcoded URL, credential, key, or ID.
- **`finally` is mandatory** whenever setup creates a resource — teardown must run even when the test fails, or a failing run leaves residue that breaks the next one.
- **Every test ends with at least one `expect()`.**
- **Unique reference values:** where a payload needs a value unique per run, derive it from a run-scoped constant (`const RUN_ID = Date.now();` at module scope, suffixed onto the reference) rather than a hardcoded string that collides on the second run.
- **Far-future timestamps** for "valid until" style fields, so a passing test does not start failing on a date nobody chose.

---

## Auth Status Codes

Load `_config/auth-behavior.md` for the correct HTTP status per service **before generating any auth assertion**. The expected status is `401` for some services and `403` for others — do not default to either. For services marked ASSUMED in that table, add `@auth-unverified` to the test's tag array.

---

## Auth Placeholder

When the auth mechanism is unresolved (present in Stage 01 `open_questions`), generate the auth step as:

```typescript
// TODO: Auth mechanism unresolved — see Stage 01 open_questions.
// Open question: <paste the exact open_question text here>
// Replace this placeholder with the actual auth header/token before running.
const authHeaders = { 'Authorization': 'PLACEHOLDER' };
```

List the test in the generation report under **Pending Auth** with the open question text.

---

## Pending Assertion Format

When a Stage 02 assertion has `open_item: true`, generate it as a commented-out expect carrying the reason. **Do not invent an expected value** — a guessed assertion that happens to pass is indistinguishable from a verified one.

```typescript
// PENDING ASSERTION — <open_reason from Stage 02>
// Cannot assert on this field until the open question is resolved.
// Do not invent an expected value. Uncomment when the contract is confirmed.
// expect(body.<field>).toBe(/* unknown — see Stage 02 testability gap */);
```

---

## DB Validation Step

Applies when `type_prefix` is `API/DB` or `FUNC/DB`, or when the endpoint's `data_validation` entry in the Stage 01 `coverage_matrix` is non-empty. The type prefix is what routes a post-call database verification step into the test.

### When SQL and tables are known

```typescript
// ── DB validation ───────────────────────────────────────────────────────
// Verify data landed in: <db_table from coverage_matrix>
// SQL: <sql_query from coverage_matrix>
const dbResult = await dbClient.query(
  `SELECT * FROM <table> WHERE id = $1`,
  [createdId]
);
expect(dbResult.rows).toHaveLength(1);
expect(dbResult.rows[0].field).toBe('expected value');
```

The DB connection (`dbClient`) must be read from `environment_config` variables — never hardcoded. **Never open a database connection unless the connection details are present in `environment_config`.** If they are absent, generate the pending block below and list the missing connection variables in the generation report.

### When SQL or tables are not yet defined

```typescript
// PENDING DB VALIDATION
// Tables involved: <db_table from coverage_matrix, or "unknown">
// SQL query: not yet defined
// TODO: define the verification query, add DB connection variables to environment_config,
//       and implement this step. Listed as outstanding in the Stage 04 generation report.
test.fixme(true, 'DB validation pending — query not yet defined. See generation report.');
```

Do not invent SQL.

---

## Generation Report Structure

Write to `stages/04-generate-tests/output/<TICKET-ID>/summary.md`. Sections in order:

```markdown
# Generation Report — <TICKET-ID>

## Run / Hold Decision
[State: RUN or HOLD. Reason: user instruction / environment unreachable / pending items.]

## Tests Generated

| Service | Spec file | Tests generated |
|---------|-----------|----------------|
| @order-service | playwright/api/tests/order-service/order-service.spec.ts | N |

## Pending Assertions

| Test ID | Field | Reason |
|---------|-------|--------|
| ... | body.field | open_reason from Stage 02 |

*(Omit section if none.)*

## Pending DB Validations

| Test ID | Tables | Status |
|---------|--------|--------|
| ... | table_name | Query not defined |

*(Omit section if none.)*

## Skipped Tests

| Test ID | Tag | Reason |
|---------|-----|--------|
| ... | @blocked-<kebab> | verbatim skip reason from the approval |

*(Omit section if none.)*

## Deferred Cases (held from Stage 02)

| Case ID | Summary | Held reason |
|---------|---------|------------|
| DEMO-TC-XXXX | ... | held_reason from Stage 01 |

*(Omit section if none.)*

## Pending Auth

| Test ID | Open question |
|---------|--------------|
| ... | verbatim open_question text |

*(Omit section if none.)*
```
