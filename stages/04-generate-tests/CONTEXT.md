# Stage 04 — Generate & Run

**Job:** Produce one working, validated test — generate it, then confirm it runs. The
validation run lives *inside* this stage; it is not a separate stage.

**Input:** approved `stages/03-approve/output/<product>/<TICKET-ID>-approval.md` and the
test cases it approved.
**Output:** generated test files (see below) + a run result.

---

## Part A — Generate (Page Object Model)

Generate **two** artifacts per ticket, following `_config/selectors.md`:

1. **Page Object(s)** → `automation/playwright/<product>/pages/<PageName>Page.ts`
   - one class per page/component involved
   - a method for every interaction (navigate, click, fill, assert-visible)
   - **no test logic** in the page object — only page interactions
   - use the selectors confirmed in the Stage 02 testability report

2. **Spec** → `automation/playwright/<product>/tests/<suite>/<TICKET-ID>.spec.ts`
   - imports the page objects; never uses raw selectors directly
   - one test per approved case (`TC-01` …), tagged `@smoke` / `@regression` / `@e2e`
   - `test.fixme()` for any case still `BLOCKED`

Route output by product: `<product>` tickets land under `automation/playwright/<product>/`.

## Part B — Run (Fork B)

- **Run now** → execute the generated spec against the target environment and capture
  pass/fail.
- **Hold / shift-left** → if the code isn't merged yet, park the test and note that it should
  run when the change lands. Do not report a false failure for un-shipped code.

Self-report the result honestly: which cases passed, which failed, and why. A human may then
instruct a rewrite or a drop.

---

## Rules

- **The validation run inside this stage answers "is this test any good?"** — it is a gate
  before the test is allowed to graduate, NOT the app's regression run. Keep those two
  concepts separate.
- Never commit a test that hasn't passed its validation run (unless explicitly held via
  shift-left).
