# Stage 02 — Test Cases

**Job:** Turn the approved spec into draft test cases, and check whether the app is actually
testable.

**Input:** `stages/01-normalize/output/<product>/<TICKET-ID>-spec.md`
**Output:**
- `stages/02-test-cases/output/<product>/<TICKET-ID>-test-cases.md`
- a **Testability Report** in the same file (or alongside it)

---

## Part A — Test cases

For each acceptance criterion, write one or more test cases:

- **ID** — `TC-01`, `TC-02`, …
- **Title** — short and specific
- **Preconditions** — state / account / data needed
- **Steps** — numbered, concrete user actions
- **Expected result** — a clear pass/fail assertion
- **Tags** — `@smoke`, `@regression`, or `@e2e`
- **BLOCKED** — mark any case that can't be fully specified because of an open question, and
  point at the question.

Cover the happy path first, then edge cases and negative cases called out in the config's
"known edge cases" section.

---

## Part B — Testability report (the flagship)

Before anyone writes a single test, determine whether the elements the cases need can
actually be selected reliably. Read `_config/selectors.md` for the standard.

For every UI element the test cases must interact with, classify it into exactly one of three
categories:

1. **Has a good selector** — a `data-testid`, stable id, or clear role/label exists. Record
   the recommended selector.
2. **Missing / weak selector** — no stable hook exists. **Recommend the specific
   `data-testid` a developer should add**, following the selectors standard. This is
   actionable feedback that goes back to the dev team, not a silent failure.
3. **Unverified** — the code wasn't available to check (e.g. no diff was read in Stage 01).
   List these so a human knows what still needs confirming.

Output the report as a short table: element → category → recommended selector / action.

---

## Rules

- Failing silently on a missing selector is a liability. Turning it into a concrete
  `data-testid` recommendation is the point of this stage.
- Do not generate any test code here — that's Stage 04. This stage is cases + testability.
