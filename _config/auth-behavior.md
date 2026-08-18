# Auth Behavior — Per-Service Reference

Single source of truth for API authentication headers and the HTTP status codes returned for missing-key and invalid-key scenarios. **Stage 02 and Stage 04 must read this file before writing or generating any auth-related assertion.**

This file is a **template**. The rows below describe fictional services and exist to show both status patterns and both provenance states. Replace them with your own services; keep the columns and the discipline.

---

## Why This File Exists

An auth assertion is the easiest thing in an API suite to get confidently wrong. `401` and `403` are both plausible, the difference is decided by framework configuration rather than by the service's own code, and a wrong expectation produces a test that fails for a reason nobody reads carefully. Worse, the *right* expectation reached by guessing is indistinguishable from one reached by checking — until the framework config changes.

So every row records not just the status but **where the status came from**.

---

## Status Code Patterns

Two patterns recur. The example below is one stack's behaviour — the specific mechanism differs per framework, but the shape of the problem does not.

**Rejected-by-default pattern (`403`):** The auth filter maps the presented key to a role. If the key is absent or unknown, the filter leaves the request *unauthenticated* without rejecting it outright. The framework's downstream authorization layer then denies the request — and where no authentication entry point is registered, that denial is `403`, not `401`. Missing key and invalid key are **indistinguishable at the HTTP layer**; both produce `403`.

**Explicit-rejection pattern (`401`):** Either the filter rejects the request itself before the framework's authorization layer sees it, or the security configuration registers an authentication entry point that issues `401` for unauthenticated requests. Both missing key and invalid key produce `401`.

The practical consequence: **you cannot derive the status from the service's own exception handlers.** The filter runs before them. Read the security configuration, or probe.

### A related trap — "restricted role" scenarios

A case named *"restricted role key → 403"* usually tests nothing. Unless the service genuinely models a restricted role, a "restricted role key" is simply a key the auth filter does not recognise — so the request is unauthenticated, and under the rejected-by-default pattern *every* unauthenticated request returns `403`. The assertion passes and proves nothing about role-based access control.

Rewrite these as *"invalid (unknown) key → {status}"* using the service's confirmed status from the table. Where a service does model roles, name the actual role under test and assert against an endpoint that role is genuinely forbidden from reaching.

---

## Per-Service Table

Replace these rows with your own services.

| Service | Auth header | Missing key | Invalid key | Status source |
|---------|-------------|-------------|-------------|---------------|
| order-service | `X-Api-Key` | **403** | **403** | VERIFIED 2026-08-05 — `GET /v1/orders` probed with no key and with an unknown key; both returned 403 with an empty body; no authentication entry point registered |
| inventory-service | `X-Api-Key` | **401** | **401** | VERIFIED 2026-08-05 — security config registers an authentication entry point issuing 401 |
| notification-service | `X-Api-Key` (REST); `X-Webhook-Token` (webhooks) | **401** | **401** | VERIFIED 2026-08-05 — the filter rejects directly before the authorization layer |
| reporting-service | `X-Api-Key` | **403** | **403** | ASSUMED — tag `@auth-unverified` |
| pricing-service | `X-Api-Key` | **403** | **403** | ASSUMED — tag `@auth-unverified` |

**Status source is not optional.** Every row is either `VERIFIED <date> — <how>` or `ASSUMED — tag @auth-unverified`. A row with a bare status code and no provenance is the failure this table prevents; treat it as ASSUMED and probe it.

---

## Tagging Rule

For services marked ASSUMED: generate the auth assertion with the status code shown above **and** add `@auth-unverified` to the test's tag array. The assertion is still written — an assumed expectation that is visibly assumed is more useful than no coverage — but it is findable.

To list every outstanding unverified auth assertion at any time:

```
npx playwright test --grep @auth-unverified --list
```

Remove the tag once the service has been probed and the status confirmed. The tag is the only thing separating "we checked" from "we guessed," so it is never removed as tidy-up — only as the last step of a probe.

---

## Probing Procedure

To promote a service from ASSUMED to VERIFIED:

1. **Confirm the service is up.** Hit its health endpoint (e.g. `/actuator/health`, `/healthz`) and expect a success status. A probe against a service that is down produces connection errors, not auth findings.
2. **Pick any authenticated GET endpoint** from the service's OpenAPI spec. A GET avoids creating state, and any authenticated endpoint exercises the same filter.
3. **Send three requests** to that endpoint and record each status code:
   - no key at all
   - an invalid key (any string the filter will not recognise)
   - a valid key (`<service-default-key>` — never a real credential committed to this repo)
4. **Update the table**: change ASSUMED → VERIFIED with the probe date and a one-line "how", and correct the status codes if they differ from what was assumed.
5. **If a status changed**, update the affected Stage 02 assertions and re-run Stage 04 for that service. A corrected table with stale assertions still generates the wrong test.

Record the probe result even when it confirms the assumption — "VERIFIED, unchanged" is a different and more valuable statement than "ASSUMED".
