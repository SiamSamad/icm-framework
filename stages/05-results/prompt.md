# Stage 05 — Disposition (Human Gate — Fork C)

**Job:** Decide what happens to the validated test, with a human in the loop.

**Input:** the generated test + run result from Stage 04.
**Output:** `stages/05-results/output/<product>/<TICKET-ID>-results.md`

---

## Fork C

- **Failed** → report exactly what failed and why, then **loop back to fix** (usually Stage
  04, sometimes Stage 02 if the case itself was wrong). Do not store a failing test.
- **Passed** → present the gated disposition options and wait for the human:
  1. **Store** the validated test in its permanent location (the `playwright/` folder here, or
     a separate test repo).
  2. **Log** the run result.
  3. **Write back** to a test-management system, if one is wired up (see
     `extensions/adding-mcps.md`).

## Dedup check (always, before storing or writing back)

Before storing a test or pushing it to a test-management system, check whether an equivalent
test already exists. If it does, report the duplicate and ask the human whether to replace,
skip, or keep both. Never blindly create a duplicate.

---

## Rules

- Every action here is human-gated. ICM's job ends when a validated test lands in its bucket.
- ICM does not reach into app CI, and app CI does not reach into ICM. Storing the test is the
  handoff point.
- Write an audit line: what was decided, what was stored, what (if anything) is still open.
