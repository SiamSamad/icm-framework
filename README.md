# ICM Framework

**ICM (Interpretable Context Methodology)** is a five-stage pipeline that converts tickets into validated, promoted Playwright tests. Every stage produces a readable file a human can inspect before anything moves forward. Nothing becomes code without a QE sign-off. Nothing is promoted to the permanent test suite without a clean run.

This repo is the clean, portable baseline: point it at any product by adding a `_config/<product>.md` and a `playwright/<product>/` bucket.

---

## Why It's Built This Way

Automation handles the typing. QE keeps the judgment.

Every intermediate result — the normalized spec, the test cases, the run report — lives in a numbered folder on disk. You can open it in any text editor, edit it, and continue. No black boxes, no one-shot generation, no opaque AI decisions. If something looks wrong at Stage 02, you fix it before any code is written. If tests fail at Stage 04, nothing is promoted until they pass.

---

## The Pipeline

### Stage 01 — Normalize

Claude fetches the ticket (via a tracker integration if connected, else a local file or pasted content) and reads any linked requirements docs, code changes, or design files. From those sources it produces one clean spec: acceptance criteria, regression risks, gaps where the ticket was unclear, and a record of what was and wasn't readable. The output is a YAML spec and an HTML report, both in `stages/01-normalize/output/<TICKET-ID>/`.

### Stage 02 — Test Cases

The spec expands into a numbered list of test cases — one per acceptance criterion, plus negative paths, edge cases, and regression guards. A testability report classifies every UI element the tests will need: confirmed selector, missing `data-testid` (with a recommendation), or unverifiable until the code diff is available. When selectors are missing, a dev-feedback document is generated to share with the developer. Output: `stages/02-test-cases/output/<TICKET-ID>/`.

### Stage 03 — Human Approval

**Claude stops here.** A reviewer reads the test cases, edits if needed, and gives an explicit written approval. Claude writes the approval file only on a clear instruction — silence and ambiguity do not count. The pipeline waits at this stage until `Proceed to Stage 04: YES` is on disk. This is the first deliberate human decision point in the pipeline.

### Stage 04 — Generate and Run

Claude writes the Playwright test files (page objects and a test spec) and immediately runs them in the local scratch runner. The report is failure-first: each failing test gets the step it broke on, the error message, and a screenshot. A rollup at the bottom groups failures by cause — missing selectors, assertion mismatches, timeouts — so a developer can act on all of them at once. The ticket can only advance when the latest run is fully green. Tests are parked in `playwright/<product>/` temporarily; this folder is scratch, not the permanent home.

### Stage 05 — Promote and Close

Green tickets only. Claude audits the promotion target (an external test repo, or this repo’s integration branch in same-repo mode): checks whether page objects already exist and can be reused or extended, and scans for tests that cover the same ground. If no conflicts are found, it creates a branch, copies the validated files, commits, and opens a merge request targeting `develop`. Then it asks two separate questions before closing out: update the test-management system? post a summary comment to the ticket? Neither happens without an explicit yes. This is the second deliberate human decision point.

---

## Where Things Live

| Location | What's there |
|----------|-------------|
| `stages/<NN>-*/output/<TICKET-ID>/` | Per-ticket stage output — specs, test cases, reports, approvals |
| `playwright/<product>/` | **Temporary scratch** — parked tests, unproven until Stage 04 passes |
| Promotion target | Permanent home for validated tests — an external test repo, or this repo’s integration branch (same-repo mode) |
| `_config/<product>.md` | Per-product settings: base URLs, test accounts, selector conventions |
| `CLAUDE.md` | Operational runbook — exact filenames, pipeline rules, cleanup commands |
| `AGENTS.md` | Model selection guide — which Claude model to use for which ticket type |

---

## Key Rules at a Glance

- **Never skip Stage 03.** No test file is generated without a written human approval.
- **All tests must pass before promotion.** Stage 05 refuses to run if Stage 04's latest report shows any failures — fix and re-run first.
- **Product comes from the spec, not the ticket ID.** A ticket’s ID prefix does not reliably indicate its product. The `product` field set in Stage 01 is the authority for all five stages.
- **Cleanup asks scope first.** When asked to clean up a ticket, Claude asks: stage outputs only, Playwright scratch only, or both. Page objects shared with another ticket's parked tests are kept and named explicitly.
- **Branch model.** Feature branches cut from develop, merged into develop via PR. main only receives merges from develop. Both branches are protected — no direct pushes.

For the full rules and operational detail, see `CLAUDE.md`.

---

## Status

All five stage contracts are complete. This baseline hasn’t run a real ticket end-to-end yet — wire up a product config and run one to prove it in your environment. **TMS write-back is a stub** — Claude will ask, but the write step returns "not implemented yet" until an integration is wired (see `extensions/adding-mcps.md`). Ticket-comment posting works when a tracker integration is connected; otherwise Claude prints the comment text to paste manually. Design context is available when design links are present in the ticket and an integration can read them.

---

*ICM (Interpretable Context Methodology) is based on a methodology concept by Jake Van Clief. This QA implementation — the five-stage pipeline, testability analysis, validation gates, and promotion flow — was designed and built by Siam Samad.*
