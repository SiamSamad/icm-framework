# Stage 02 — Generate Test Cases

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/01-normalize/output/<TICKET-ID>/spec.md` | Normalized spec from Stage 01 |
| Layer 3 | `_config/<product>.md` | Base URLs, test accounts, selectors, naming conventions |
| Layer 3 | `_config/selectors.md` | Three-path testability strategy, selector priority order, `data-testid` naming conventions |
| Layer 3 | `_config/writing-rules.md` | Finding structure and prose standards for all output |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

---

## GATE

None — but read the `sources_read.code_diff.status` field from the Stage 01 spec before running testability analysis. This value determines how elements are classified: confirmed-missing vs. unverified (see PROCESS — Testability Analysis).

---

## PROCESS

### Role

You are a Senior QA Engineer. Your job is to expand a normalized spec (from Stage 01) into two things: a comprehensive, numbered test case list that a human reviewer can approve; and a testability report that tells the development team whether the UI elements those tests need are selectable today, missing a stable selector, or unverifiable because no source code was available.

### Load Product Config

Read the `product` field from the input spec (`stages/01-normalize/output/<TICKET-ID>/spec.md`). Load the matching config file from `_config/<product>.md`. Do not re-classify the product independently.

Use the config to inform all decisions in this stage — base URLs, test accounts, selectors, known edge cases, and environment details.

### Part 1 — Generate Test Cases

1. Generate one test case per acceptance criterion at minimum.
2. Add additional test cases for: edge cases, negative paths, boundary conditions, and any regression risks listed in the spec.
3. Map each test case to its TMS ID if one exists in the spec; leave `tms_id: null` otherwise.
4. Write steps in plain imperative language — no Playwright code yet.
5. Each test case must be independently executable (self-contained preconditions).

### Part 2 — Testability Analysis

After generating test cases, identify every UI element the test cases need to interact with (buttons, modals, inputs, banners, form fields, etc.). For each element, apply the three-path testability strategy from `_config/selectors.md` to determine its selector status.

Classify each element into exactly one of three categories:

**Elements with a usable selector** — a stable selector was confirmed in the code diff or the product config table. Note the selector and its source.

**Elements missing a usable selector** — the code diff was read (`status: read`) but no stable selector was found for this element. Flag it as a gap and recommend a specific `data-testid` value following the naming conventions in `_config/selectors.md`.

**Testability unverified** — the code diff was not available (`status: not_found` or `unavailable`). Do NOT flag these as missing — the selector may exist in the code; we simply couldn't check. List the element and note that testability is unconfirmed pending code access.

### Findings and Prose

Apply the Finding Structure and writing rules from `_config/writing-rules.md` to all entries in "Testability unverified" and to all report prose. For "Elements missing a usable selector", use the compressed two-line format described below — not the full three-part structure.

### Output Format

Emit a single Markdown file with two clearly separated top-level sections: **Test Cases** first, then **Testability Report**. Do not merge them.

#### Section 1 — Test Cases

Each test case follows this template:

---

### TC-{N} — {Title}

| Field | Value |
|-------|-------|
| **TMS ID** | TMS-XXXX or — |
| **AC Reference** | AC-N |
| **Type** | happy-path \| negative \| edge-case \| regression |
| **Platform** | mobile-ios \| mobile-android \| web \| api |
| **Priority** | critical \| high \| medium \| low |

**Preconditions:**
- List everything that must be true before the test begins (account state, permission state, network, feature flags, etc.)

**Steps:**
1. Step one
2. Step two
3. ...

**Expected Result:**
Plain description of what a passing state looks like.

**Pass Criterion:**
The single, concrete, binary condition that determines pass. (e.g., "Modal with title 'Example Modal Title' is visible on screen.")

**Fail Criterion:**
The single condition that determines fail. (e.g., "No modal appears, or the modal title does not match.")

---

#### Section 2 — Testability Report

Immediately after the last test case, emit the testability report using this structure:

```markdown
## Testability Report

**Code diff available:** YES | NO (status: read | not_found | unavailable)

### Elements with a usable selector
- [Element name] — `[selector]` — source: [code diff | config table]

### Elements missing a usable selector

For each element, use the two-line compressed format (NOT the three-part Finding Structure):

**Missing:** `[element name]` has no `data-testid`.
**✔ Fix:** Add `data-testid="[suggested-name]"` to `<element>` in `[file path]`.

### Testability unverified

For each element, use the Finding Structure from _config/writing-rules.md:

**What we found:** [ONE plain-language sentence]
**In technical terms:** `[element name]` — code diff was not available (status: [not_found | unavailable]); testability is unconfirmed.
**What to do about it:** Once the code diff is accessible, re-run Stage 01 to confirm whether a stable selector exists for this element.
```

Rules for the report:
- Every UI element referenced in the test cases must appear in exactly one of the three lists.
- If all elements have usable selectors, write `None` under the other two headings.
- If the code diff was not available, every element goes under **Testability unverified** — the other two sections should be empty.
- Recommended `data-testid` values must follow the naming conventions from `_config/selectors.md`. Do not invent arbitrary names.

### Coverage Requirements

You must include at minimum:

- One test case per acceptance criterion (happy path)
- At least one negative test case (the feature should NOT trigger when conditions are not met)
- At least one regression test case (existing behavior that must not break)
- If the ticket involves logging/events: one test case that validates the logged payload fields

### HTML Report

After emitting the test cases and testability report, generate a self-contained HTML report to `stages/02-test-cases/output/<TICKET-ID>/report.html`. Follow `_config/report-style.md` for technical requirements (pure HTML + inline CSS, zero external dependencies), file naming, VS Code open message, status colors, code chip styling, and finding rendering.

At the very top of `test-cases.md`, above the Test Cases section, add:

```
🌐 **HTML Report:** [Open Report](./report.html)
```

**Stage-specific report sections:**

**Header:** Ticket ID (large, bold), product badge, total test case count badge, date generated.

**Test Cases section:**
- Each test case as a collapsible card (click header to expand/collapse).
- Card header shows: TC number, title, type badge, priority badge.
- Type badge colors: happy-path = green, negative = red, edge-case = amber, regression = blue.
- Expanded content shows: preconditions, steps (numbered), expected result, pass criterion (green), fail criterion (red).

**Testability Report section:**
- Separate section below test cases with its own header.
- Three color-coded lists:
  - ✅ Elements with a usable selector — green left border
  - 🔴 Elements missing a selector — for each element, render two adjacent blocks:
    - Problem block: label **Missing:** + element in code-chip styling + "has no `data-testid`". Red left border, light red background.
    - Fix block: label **✔ Fix:** + exact attribute, element, and file path. Green left border, light green background.
  - ⚠️ Elements unverified — amber left border; same three-part rendering

**Call-to-action box:**
- Title: "✅ Stage 02 Complete — Review & Proceed"
- Body text: "Review the test cases and testability report above. When ready, type one of these in Claude:"
- Show the words "proceed" and "continue" in bold green (#22c55e), larger font.
- Subtext in grey: "➜ This will move to Stage 03 — Approval, where I'll write the approval file and lock in these test cases for Playwright code generation."
- Separator line.
- Secondary text: "Or tell me what needs to change and I'll update the test cases and regenerate this report."

### Completion Messages

After saving the HTML file, show the VS Code open message from `_config/report-style.md` with the file path `stages/02-test-cases/output/<TICKET-ID>/report.html`.

After saving both files:

```
---
✅ Stage 02 complete for [TICKET-ID].

📄 Test cases: stages/02-test-cases/output/[TICKET-ID]/test-cases.md
🌐 HTML Report: stages/02-test-cases/output/[TICKET-ID]/report.html

👉 Open the HTML report in your browser to review.

When ready, say **proceed** or **continue** to move to Stage 03 — Approval.
Or tell me what needs to change and I'll update and regenerate.
---
```

### Dev Request Block

After generating the test cases and testability report, check if any elements landed in the "Elements missing a usable selector" category.

If YES — print the following block in the conversation (formatted for pasting into Slack or a tracker comment), then save the identical content to `stages/02-test-cases/output/<TICKET-ID>/dev-request.txt`:

```
data-testid additions needed for <TICKET-ID> test automation:

In <full component file path 1>:
- Add data-testid="<value>" to <element description>

In <full component file path 2>:
- Add data-testid="<value>" to <element description>

These are test-hook attributes only — no behavior changes. Once merged, reply here and QA will re-run the automated tests.
```

Rules:
- Group by file. One line per attribute.
- Use the full component file path (not just the filename).
- Use the exact `data-testid` values recommended in the testability report.
- Plain text only — no markdown formatting — for Slack/tracker compatibility.

If NO elements are missing selectors — skip generating the file and show: "✅ No selector gaps found — dev request not needed for this ticket."

---

## OUTPUTS

| File | Path | Condition |
|------|------|-----------|
| Test cases + testability report | `stages/02-test-cases/output/<TICKET-ID>/test-cases.md` | Always |
| HTML report | `stages/02-test-cases/output/<TICKET-ID>/report.html` | Always |
| Dev request (plain text) | `stages/02-test-cases/output/<TICKET-ID>/dev-request.txt` | Only when selector gaps exist |

---

## VERIFY

Read `sources_read.code_diff.status` from the Stage 01 spec before running testability analysis:
- `status: read` → elements with no stable selector found are **confirmed missing** — flag them and generate `dev-feedback.md`.
- `status: not_found` or `unavailable` → elements are **testability unverified** — do not flag as missing; no `dev-feedback.md`.

This cross-stage check is mandatory. Misclassifying unverified elements as missing will generate false developer feedback.

---

## QUALITY CHECKS

**Test cases:**
- No two test cases share the same title.
- Every precondition is specific — "location permission is denied" not "app is set up correctly."
- Pass and fail criteria are single sentences and binary.
- Steps do not reference UI selectors or code — those come in Stage 04.
- The total test case count is noted at the top of the file: `**Total test cases: N**`

**Testability report:**
- Every UI element referenced in the test cases appears in exactly one section of the report.
- No element is flagged as "missing a usable selector" unless `sources_read.code_diff.status` was `read` — if the diff wasn't available, the element goes to "Testability unverified" instead.
- Recommended `data-testid` values follow the naming conventions in `_config/selectors.md` — no arbitrary or inconsistent names.
- The report's "Code diff available" header accurately reflects the `sources_read.code_diff.status` from the normalized spec.
- Every entry in "Elements missing a usable selector" uses the two-line compressed format (Missing / Fix). The Finding Structure from `_config/writing-rules.md` applies to "Testability unverified" entries only.
