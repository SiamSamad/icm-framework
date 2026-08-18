# API Test Mapping — Reference

Load this module in Stage 02 when running against an **API spec (Mode B)**. It defines the test definition schema, naming conventions, service tag format, and output document structure. It is not loaded by any other stage.

---

## Test Definition Schema

Each case where `automatable_now: true` maps to one test definition. Emit as a structured block per the output document format below.

```yaml
test_id: ""              # <TICKET-ID>-<CASE-KEY>  e.g. PROJ-232-DEMO-TC-1201
name: ""                 # "<Case Key> — <Scenario>"  e.g. "DEMO-TC-1201 — Create order with valid payload"
product_tag: ""          # derived from the spec's product field — see Tag Naming; e.g. @example-product
service_tag: ""          # derived from the target service — see Tag Naming; e.g. @order-service
case_id: ""              # case key carried from the Stage 01 cases inventory
type_prefix: ""          # FUNC/API | API/DB | FUNC/DB | none — carried unchanged from Stage 01
request:
  method: ""             # from api_contract.endpoints — authoritative source; never from ticket text alone
  path: ""               # from api_contract.endpoints — authoritative source
  headers:
    - name: ""           # e.g. X-Api-Key, Authorization
      value: ""          # always a named variable reference: ${VAR_NAME}; never a literal value
  body: {}               # derived from api_contract.payload_schema + case test_data;
                         # all environment-specific values expressed as ${VAR_NAME} references
setup:
  - ""                   # ordered steps to create any pre-existing resource this test requires
                         # (e.g. POST /v1/orders before a GET or PATCH test);
                         # empty list when the test needs no pre-existing state
teardown:
  - ""                   # ordered steps to remove resources created in setup; empty list if setup is empty
assertions:
  - field: ""            # response field path (e.g. "status", "body.orderId") or "http_status"
    expected: ""         # expected value or pattern; never a hardcoded environment-specific value
    open_item: false     # true when the contract lacks enough information to write a meaningful assertion
    open_reason: ""      # required when open_item is true — one-line reason; empty string otherwise
expected_status: 0       # HTTP status code asserted on every response; drawn from contract or Expected Result
testability_gap: ""      # summary of open assertions on this test; empty string when all assertions are closed
```

**Method and path are authoritative from `api_contract.endpoints`.** Ticket prose describing an endpoint is intake context, not contract. Where the two disagree, Stage 01 recorded it under `api_contract.disagreements` — map the contract's version and leave the disagreement standing.

---

## Naming Conventions

**test_id:** `<TICKET-ID>-<CASE-KEY>` — stable across runs and re-mappings. Example: `PROJ-232-DEMO-TC-1201`. For a folder-scoped intake with no parent ticket, the Stage 01 folder name stands in for `<TICKET-ID>`.

**name:** `"<Case Key> — <Scenario>"` — the scenario is the case summary with the type prefix stripped. Example: `"DEMO-TC-1201 — Create order with valid payload"`.

**Tags — every test definition carries both:**

**product_tag:** From the spec's `product` field, lowercased with spaces and `/` replaced by hyphens and prefixed with `@` — e.g. `@example-product`. Stable; lets every test for one product run in a single invocation.

**service_tag:** Identifies the specific service the tests target. Derive from the Stage 01 spec in this priority order:

1. The `api_contract` service name field, if present.
2. The tests folder below the runner (e.g. `playwright/api/tests/order-service` → `@order-service`).
3. A service name stated explicitly in the parent ticket or OpenAPI spec title.

Lowercase, replace spaces and `/` with hyphens, prefix with `@`. Must be stable across re-mappings — do not re-derive it from runtime context. **If the service cannot be determined from any of the above, ask.** Never default it to the product tag: a service tag that silently equals the product tag makes `--grep` select everything, which reads as a passing service suite that never ran the service's tests in isolation.

Examples:
- Service folder `playwright/api/tests/order-service` → `@order-service`
- OpenAPI title "Inventory Service API" → `@inventory-service`

---

## Test Independence Rule

Every test definition must be self-contained. If a case's step summary implies operating on a resource that must already exist (an update, a cancel, a retrieval by ID), the test definition's `setup` block must include the step(s) to create that resource, and `teardown` must include the step(s) to remove it. No test may rely on another test having run first. Record `setup` and `teardown` explicitly even when they are simple one-liners.

---

## Testability Gaps

An assertion the contract cannot support is `open_item: true` with a one-line `open_reason` — never a guessed expected value. Collect every one into the Testability Gaps section of the output. An open question is carried forward verbatim; it is never resolved by assumption at this stage.

---

## Overlap Detection

Check each planned test against tests already present in the promotion target for this service. Classify by comparing **method, path, and assertions** — never by name alone, since two tests can share a name and test different things, or test the same thing under different names.

| Overlap | Meaning |
|---------|---------|
| Full | An existing test makes the same request and the same assertions |
| Partial | Same request, different or narrower assertions — state the gap |
| None | No existing test covers this request |

**Uncertain counts as Partial.** Detection only: never auto-skip a test because it looks like a duplicate. Report the finding and let the reviewer decide.

---

## Output Document Structure

The output is written to `stages/02-test-cases/output/<TICKET-ID>/test-cases.md`. Use this structure exactly:

```markdown
# Test Mapping — <TICKET-ID>

🌐 **HTML Report:** [Open Report](./report.html)

**Total cases in Stage 01 inventory:** N
**Mapped (automatable now):** N
**Skipped (blocked):** N
**Deferred (held):** N
**Blocked by testability gaps:** N

---

## Test Definitions

### <test_id> — <name>

| Field | Value |
|-------|-------|
| **Case ID** | DEMO-TC-XXXX |
| **Type** | FUNC/API \| API/DB \| FUNC/DB \| none |
| **Service tag** | @order-service |
| **Method** | GET \| POST \| PUT \| PATCH \| DELETE |
| **Path** | /v1/endpoint/path |
| **Expected status** | 200 |
| **Skip** | `@blocked-<kebab>` — *(row present only when the test is skipped)* |

**Headers:**
- `Header-Name`: `${VAR_NAME}`

**Request body:**
\`\`\`json
{ "field": "${VAR_NAME}" }
\`\`\`

**Setup:** *(list steps, or "None")*

**Teardown:** *(list steps, or "None")*

**Assertions:**
| Field | Expected | Open item? |
|-------|----------|------------|
| http_status | 200 | No |
| body.field | expected value | No |

**Testability gap:** *(populated when any assertion is open; otherwise omitted)*

**Skip reason:** *(present only when the test is skipped — see Stage 02 Skip Directive)*

---

## Deferred Cases

| Case ID | Summary | Held Reason |
|---------|---------|-------------|
| DEMO-TC-XXXX | Case summary | Held reason from Stage 01 |

---

## Skip Carry-Forward

*(Present only when this run carried skips forward from a prior `test-cases.md`. See Stage 02 → Skip Directive Preservation on Regeneration.)*

---

## Testability Gaps

| Test ID | Assertion field | Reason |
|---------|-----------------|--------|
| PROJ-232-DEMO-TC-XXXX | body.someField | Response shape not defined in contract |

*(Omit this section entirely if no testability gaps exist.)*

---

## Correction Report

*(Present only when `constraint_layer.disagreements` is non-empty. See Stage 02 → Acting on Source Disagreements.)*

---

## Overlap Detection

| Test ID | Matched existing test | Overlap | Gap (if Partial) |
|---------|----------------------|---------|-----------------|
| PROJ-232-DEMO-TC-XXXX | path/to/existing.spec.ts or — | Full \| Partial \| None | describe gap, or — |

---

## Coverage Summary

| Metric | Count |
|--------|-------|
| Total cases in Stage 01 inventory | N |
| Mapped to test definitions | N |
| Skipped (blocked) | N |
| Deferred (held) | N |
| Blocked by testability gaps | N |
```

Section order is fixed: Test Definitions, Deferred Cases, Skip Carry-Forward, Testability Gaps, Correction Report, Overlap Detection, Coverage Summary. Omit a section only where its rule says it may be omitted.
