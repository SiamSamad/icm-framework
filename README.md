# ICM Framework

**ICM (Interpretable Context Methodology)** is a five-stage pipeline that converts tickets into validated, promoted Playwright tests. Every stage produces a readable file a human can inspect before anything moves forward. Nothing becomes code without a QE sign-off. Nothing is promoted to the permanent test suite without a clean run.

This repo is the clean, portable baseline: point it at any product by adding a `_config/<product>.md` and a `playwright/web/<product>/` bucket.

---

## Why It's Built This Way

Automation handles the typing. QE keeps the judgment.

Every intermediate result — the normalized spec, the test cases, the run report — lives in a numbered folder on disk. You can open it in any text editor, edit it, and continue. No black boxes, no one-shot generation, no opaque AI decisions. If something looks wrong at Stage 02, you fix it before any code is written. If tests fail at Stage 04, nothing is promoted until they pass.

---

## The Pipeline

### Stage 01 — Normalize

Claude fetches the ticket (via a tracker integration if connected, else a local file or pasted content) and reads any linked requirements docs, code changes, or design files. From those sources it produces one clean spec: acceptance criteria, regression risks, gaps where the ticket was unclear, and a record of what was and wasn't readable. The output is a YAML spec and an HTML report, both in `stages/01-normalize/output/<TICKET-ID>/`.

**Two intake modes.** The above is Mode A, which starts from a ticket. **Mode B** starts from API test cases that already exist — in a spreadsheet, or in a test management tool — and normalizes them into one canonical inventory with an API contract and a coverage matrix. Where they came from a live tool, every case is fingerprinted so a later check can tell whether the source has moved. See [Source freshness](#source-freshness) below.

### Stage 02 — Test Cases

The spec expands into a numbered list of test cases — one per acceptance criterion, plus negative paths, edge cases, and regression guards. A testability report classifies every UI element the tests will need: confirmed selector, missing `data-testid` (with a recommendation), or unverifiable until the code diff is available. When selectors are missing, a paste-ready `dev-request.txt` is generated to share with the developer. Output: `stages/02-test-cases/output/<TICKET-ID>/`.

### Stage 03 — Human Approval

**Claude stops here.** A reviewer reads the test cases, edits if needed, and gives an explicit written approval. Claude writes the approval file only on a clear instruction — silence and ambiguity do not count. The pipeline waits at this stage until `Proceed to Stage 04: YES` is on disk. This is the first deliberate human decision point in the pipeline.

### Stage 04 — Generate and Run

Claude writes the Playwright test files (page objects and a test spec) and immediately runs them in the local scratch runner. The report is failure-first: each failing test gets the step it broke on, the error message, and a screenshot. A rollup at the bottom groups failures by cause — missing selectors, assertion mismatches, timeouts — so a developer can act on all of them at once. The ticket can only advance when the latest run is fully green. Tests are parked in `playwright/web/<product>/` temporarily; this folder is scratch, not the permanent home.

### Stage 05 — Promote and Close

Green tickets only. Claude audits the promotion target (an external test repo, or this repo’s integration branch in same-repo mode): checks whether page objects already exist and can be reused or extended, and scans for tests that cover the same ground. If no conflicts are found, it creates a branch, copies the validated files, commits, and opens a merge request targeting `develop`. Then it asks two separate questions before closing out: update the test-management system? post a summary comment to the ticket? Neither happens without an explicit yes. This is the second deliberate human decision point.

---

## Source Freshness

A test management tool keeps moving after you fetch from it. Cases are edited, added, and removed while a ticket is still in the pipeline, so a spec taken on Monday can describe cases that no longer exist on Thursday — and approving those cases approves fiction.

Stage 01 fingerprints the content that decides what each generated test does, and records the hashes in the spec. Stage 03 re-fetches and compares **before showing anything to a reviewer**, because reviewing a stale case set wastes their time. Drift is a hard halt with no override. For services already promoted — which never re-enter Stage 03 — `/drift-check` re-runs the same comparison read-only, on demand.

The tool itself is pluggable. The framework owns the contract — fetch by folder or case key, explicit field lists, pagination to completion, canonical field mapping, content fingerprinting — and any vendor (e.g., TestRail, Zephyr, QMetry, Xray) sits behind it as an adapter. Swapping tools changes the adapter, not the pipeline.

---

## Test Tooling Buckets

The top level names the **test tool**; surfaces and products nest beneath it. A test is routed by the tool that executes it, never by the ticket prefix.

| Bucket | Tool | Selection |
|--------|------|-----------|
| `playwright/web/` | Playwright (browser) | one project per product |
| `playwright/api/` | Playwright (`request` fixture) | one project; services selected by `--grep @<service>` |
| `maestro/` | Maestro | **scaffold only** — structure and conventions, no runner yet |

A new product adds a folder inside an existing bucket. A new **tool** adds a bucket beside the others (`espresso/`, `xcuitest/`, `appium/`) without disturbing anything already there — the same swappability the intake layer applies to test management tools.

---

## Where Things Live

| Location | What's there |
|----------|-------------|
| `stages/<NN>-*/output/<TICKET-ID>/` | Per-ticket stage output — specs, test cases, reports, approvals |
| `playwright/web/<product>/` | **Temporary scratch** — parked UI tests, unproven until Stage 04 passes |
| `playwright/api/tests/<service>/` | **Temporary scratch** — parked API tests, same rule |
| `maestro/flows/` | Mobile bucket — scaffolded, not yet wired into the pipeline |
| Promotion target | Permanent home for validated tests — an external test repo, or this repo’s integration branch (same-repo mode) |
| `_config/<product>.md` | Per-product settings: base URLs, test accounts, selector conventions |
| `_config/*.md` | Shared reference: selectors, report style, writing rules, source freshness, API intake/mapping/generation, constraint lookup, auth behaviour |
| `_tools/*.mjs` | Deterministic helpers — content fingerprints and baseline protection, called by the stages rather than re-judged |
| `_archive/` | Dated snapshots of what cannot be regenerated: approvals, promotion records, run evidence |
| `CLAUDE.md` | Operational runbook — exact filenames, pipeline rules, cleanup commands |
| `AGENTS.md` | Model selection guide — which Claude model to use for which ticket type |

---

## Key Rules at a Glance

- **Never skip Stage 03.** No test file is generated without a written human approval.
- **All tests must pass before promotion.** Stage 05 refuses to run if Stage 04's latest report shows any failures — fix and re-run first. A BLOCKED verdict (zero failures, but tests skipped against a known external blocker) does not promote either: it is not a failure, but it is not a pass.
- **Drift is never overridden.** If the source has moved since the spec was taken, Stage 03 halts. No approving the subset that still matches, no patching hashes, no proceeding on request — the only way forward is a Stage 01 re-run.
- **Product comes from the spec, not the ticket ID.** A ticket’s ID prefix does not reliably indicate its product. The `product` field set in Stage 01 is the authority for all five stages.
- **Cleanup asks scope first.** When asked to clean up a ticket, Claude asks: stage outputs only, Playwright scratch only, or both. Page objects shared with another ticket's parked tests are kept and named explicitly.
- **Branch model.** Feature branches cut from develop, merged into develop via PR. main only receives merges from develop. Both branches are protected — no direct pushes.

For the full rules and operational detail, see `CLAUDE.md`.

---

## Status

Honest about what is proven versus what is written down.

**Complete and exercised as code.** The two `_tools/` scripts are working, dependency-free Node and have been run against fixtures: `case-hash.mjs` is whitespace-stable and step-order-sensitive and fails loudly on duplicate or missing keys; `baseline-tracked.mjs` honours its 0/1/2 exit contract and rolls back its own `.gitignore` edit if git disagrees that the fix worked.

**Complete as contracts, not yet run end-to-end.** All five stage contracts, both intake modes, and every `_config/` reference module. This baseline hasn't taken a real ticket through all five stages — wire up a product config and run one to prove it in your environment.

**Scaffolded, deliberately unfinished.** `maestro/` has structure and an extensibility contract but no runner and no Stage 04 wiring. Stage 05's helper-overwrite semantics are a documented gap, written into the contract rather than quietly decided.

**Stubs.** **TMS write-back** — Claude will ask, but the write step returns "not implemented yet" until an integration is wired (see `extensions/adding-mcps.md`). Ticket-comment posting works when a tracker integration is connected; otherwise Claude prints the comment text to paste manually. Design context is available when design links are present in the ticket and an integration can read them. Mode B's live intake needs a test-management-tool adapter; the contract is defined and the vendor call is not.

See `FEATURES.md` for the item-by-item tracker.

---

*ICM (Interpretable Context Methodology) is based on a methodology concept by Jake Van Clief. This QA implementation — the five-stage pipeline, testability analysis, validation gates, and promotion flow — was designed and built by Siam Samad.*
