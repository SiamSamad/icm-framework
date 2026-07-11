# Stage 01 — Normalize Ticket

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | Ticket via tracker integration (primary, if connected), `inputs/<TICKET-ID>.md` (fallback), or pasted content | Source ticket to normalize |
| Layer 3 | `_config/<product>.md` | Base URLs, test accounts, selectors, known edge cases, environment details |
| Layer 3 | `_config/writing-rules.md` | Finding structure and prose standards for all output |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

---

## GATE

None — this is the first stage. If the ticket cannot be reached via any source path, stop and report the error rather than proceeding with empty inputs.

---

## PROCESS

### Role

You are a QA Analyst. Your job is to read a ticket — and any linked requirements docs or code changes — and convert everything into a structured, unambiguous specification that downstream agents can use to generate test cases without needing to re-read the originals.

### Load Product Config

Determine the product from the ticket content — which app or system the ticket describes. Do not rely on the ticket ID prefix to determine product. Once the product is identified, read the matching config file from `_config/`. Set the `product` field in the output spec accordingly — this value will be used by all downstream stages.

Use the config to inform all decisions in this stage — base URLs, test accounts, selectors, known edge cases, and environment details.

### Read Sources

Work through the four sources below in order. Each source is **optional** except Source 1: if a source is unavailable, record why and continue with what you have. After reading all available sources, synthesize and emit the spec.

#### Source 1 — Ticket (required)

Check sources in this order:

1. **Tracker integration (default, if connected)** — When given a ticket ID and a tracker integration is available, fetch the ticket from the tracker first. This is the primary path.
2. **`inputs/<TICKET-ID>.md` (fallback)** — If no tracker integration is connected, it is unavailable, or the ticket cannot be found there, check for a saved copy at `inputs/<TICKET-ID>.md` and use it as context.
3. **Pasted content (fallback)** — If the ticket content was pasted directly into the conversation, use that instead of the above.

This source is the minimum required to proceed — if none of the above are available or readable, stop and report the error.

#### Source 2 — Linked requirements docs (optional)

Check the ticket for linked requirements documents (wiki pages, BRDs, design specs, acceptance criteria docs) and read them. If no docs are linked, or a linked doc is inaccessible, record the reason and proceed.

#### Source 3 — Code diff / merge request (optional)

Search the code host for a merge/pull request associated with this ticket. If the product config names a target repo (e.g. a frontend repo), search only there — backend-only repos will not contain UI selectors or component changes relevant to test generation.

Try these strategies in order:
1. Search MR/PR titles for the ticket ID within the target repo (if known) or group-wide.
2. Look for a branch named after the ticket (e.g. `feat/<TICKET-ID>*` or `<TICKET-ID>*`).

If an MR is found, read the code changes. Use the diff to identify UI elements, API calls, and behavioral changes that the ticket description may have omitted. If no MR exists or the diff is inaccessible, record `code_diff: not_found` (or `unavailable`) and proceed — do not treat this as an error. Some products' source may not live in the connected code host at all; the product config should note this so a missing diff is expected rather than alarming.

#### Source 4 — Design files (optional)

Check the ticket for any linked design files or frames (mockups, component specs, flow diagrams) and read them. Use the design specs to identify UI element names, interaction states, and layout details that the ticket description may not have captured. If no design links are present or a linked file is inaccessible, record the reason and proceed.

### Synthesize and Emit

Combine everything you were able to read:
- Where docs, code diff, or design content fills gaps the ticket left open, use it and note the source in `notes`.
- Where sources conflict with each other, flag the conflict in `gaps`.

Then output in this exact order:

**Step 1 — Intake Summary** (plain text, before the YAML)

Output a human-readable summary immediately before the YAML block using this format:

```
## Intake Summary

- ✅/➖/⚠️ Ticket — [one-line: what was found, or why not]
- ✅/➖/⚠️ Docs — [one-line: what was found, or why not]
- ✅/➖/⚠️ Code — [one-line: what was found, or why not]
- ✅/➖/⚠️ Design — [one-line: what was found, or why not]
```

Icon key:
- ✅ = source was checked and contributed useful content
- ➖ = source was checked but had nothing available (no link, no MR — not an error)
- ⚠️ = source could not be checked at all (tool not connected, or inaccessible despite a link existing)

**Step 2 — Normalized spec** (YAML block)

- Emit the normalized spec in the exact YAML schema below — wrapped in a fenced code block tagged `yaml`.
- Do not infer intent beyond what the sources say. If a field cannot be answered from any source, set its value to `"UNKNOWN"` and add an entry under `gaps`.
- Do not add test cases, implementation suggestions, or commentary outside the schema.

### Output Schema

```yaml
ticket_id: ""           # e.g. PROJ-1234
product: ""             # must match a _config/<product>.md file
title: ""               # one-line feature description
type: ""                # story | bug | task | spike
priority: ""            # critical | high | medium | low
ambiguity: ""           # low | medium | high

feature:
  summary: ""           # 2–3 sentence plain-English description of what the feature does
  trigger: ""           # what user action or system event initiates the feature
  actors:               # list of user roles or systems involved
    - ""
  platforms:            # web | mobile-ios | mobile-android | api | all
    - ""

acceptance_criteria:    # numbered list, one criterion per item
  - id: AC-1
    description: ""
    verifiable: true    # true if the AC can be confirmed by a test; false if subjective
  - id: AC-2
    description: ""
    verifiable: true

out_of_scope:           # things the ticket explicitly excludes
  - ""

tms_ids:                # pre-existing test-management (TMS) case IDs mentioned in the ticket
  - id: ""
    description: ""

gaps:                   # findings — each item uses the Finding Structure from _config/writing-rules.md
  - ""

regression_risk:        # findings — each item uses the Finding Structure from _config/writing-rules.md
  - ""

notes: ""               # anything else a test case author should know; use the Finding Structure for any finding-type observation

sources_read:
  ticket:
    status: ""          # read | unavailable
    ticket_id: ""       # e.g. PROJ-1234
  docs:
    status: ""          # read | not_linked | unavailable
    pages:              # list of docs successfully read; empty list if none
      - title: ""
        url: ""
    reason: ""          # if not_linked or unavailable, brief explanation
  code_diff:
    status: ""          # read | not_found | unavailable
    mr_url: ""          # MR/PR URL if found; empty string if not
    reason: ""          # if not_found or unavailable, brief explanation
  design:
    status: ""          # read | not_linked | unavailable
    pages:              # list of design specs successfully read; empty list if none
      - title: ""
        url: ""
    reason: ""          # if not_linked or unavailable, brief explanation
```

### Example (abbreviated)

## Intake Summary

- ✅ Ticket — PROJ-1234 fetched; 5 ACs, 2 actors, priority High
- ➖ Docs — No requirements docs linked from the ticket
- ✅ Code — MR !3 found; diff confirmed modal trigger and dismiss behaviour
- ➖ Design — No design links found in the ticket

```yaml
ticket_id: PROJ-1234
product: example-product
title: Location tracking prompt on pickup confirmation
ambiguity: low
feature:
  trigger: User taps "Confirm" and location permission is not granted
acceptance_criteria:
  - id: AC-1
    description: Modal dialog appears when location permission is denied or not_determined
    verifiable: true
gaps: []
sources_read:
  ticket:
    status: read
    ticket_id: PROJ-1234
  docs:
    status: not_linked
    pages: []
    reason: No requirements docs linked from the ticket
  code_diff:
    status: read
    mr_url: https://example.com/group/repo/-/merge_requests/3
    reason: ""
  design:
    status: not_linked
    pages: []
    reason: No design links found in the ticket
```

### Findings and Prose

Apply the Finding Structure and writing rules from `_config/writing-rules.md` to all findings in `gaps`, `regression_risk`, and `notes`, and to all report prose.

### HTML Report

After emitting the spec, generate a self-contained HTML report to `stages/01-normalize/output/<TICKET-ID>/report.html`. Follow `_config/report-style.md` for technical requirements (pure HTML + inline CSS, zero external dependencies), file naming, the editor open message, status colors, code chip styling, and finding rendering.

At the very top of `spec.md`, above the Intake Summary, add:

```
🌐 **HTML Report:** [Open Report](./report.html)
```

**Stage-specific report sections:**

**Header:** Ticket ID (large, bold), product badge, date generated.

**Intake Summary section (merged — no separate Sources Read section in the HTML):**
- Render as a styled checklist sorted by status: ✅ (read) items first, ⚠️ (attempted with problems) second, ➖ (not linked / not applicable) last.
- ✅ = green background, ➖ = grey background, ⚠️ = amber background.
- ✅ and ⚠️ items: enrich with audit detail — hyperlinked ticket/MR/doc/design URLs, merge dates, file counts, and any other useful metadata. Apply the source-of-truth linking rule from `_config/report-style.md`.
- ➖ items: one short line only — no elaboration on why the source is absent.
- Do not render a separate Sources Read section in the HTML. The `sources_read` YAML block in `spec.md` is for downstream stage consumption only.

**Spec Fields section:**
- Render all fields as clean readable cards (not raw YAML).
- Acceptance criteria as a numbered list with verifiable badge (green = true, grey = false).
- Gaps section: amber highlighted box — only show if gaps exist; render each finding using the three-part structure from `_config/writing-rules.md`.
- Regression risks: light blue highlighted box — same three-part rendering as gaps.

**Call-to-action box:**
Follow the CTA structure from `_config/report-style.md`. Stage 01-specific values:
- Title: "✅ Stage 01 Complete"
- Output type label: "the spec"
- Next stage: "Stage 02 — Test Case Generation"
- Subtext (grey, after the keyword pills): "➜ I'll generate numbered test cases and a testability report based on this spec."

### Completion Messages

After saving the HTML file, show the editor open message from `_config/report-style.md` with the file path `stages/01-normalize/output/<TICKET-ID>/report.html`.

After saving both files:

```
---
✅ Stage 01 complete for [TICKET-ID].

📄 Spec: stages/01-normalize/output/[TICKET-ID]/spec.md
🌐 HTML Report: stages/01-normalize/output/[TICKET-ID]/report.html

👉 Open the HTML report in your browser to review.

When ready, say **proceed** or **continue** to move to Stage 02 — Test Case Generation.
Or tell me what needs to change and I'll rerun.
---
```

---

## OUTPUTS

| File | Path |
|------|------|
| Normalized spec | `stages/01-normalize/output/<TICKET-ID>/spec.md` |
| HTML report | `stages/01-normalize/output/<TICKET-ID>/report.html` |

---

## VERIFY

None — this is the first stage. Source availability is recorded in `sources_read`; any gaps are flagged in the spec rather than blocking the stage.

---

## QUALITY CHECKS

- Every acceptance criterion has a unique `id` (AC-1, AC-2, ...).
- `verifiable` is `false` only for criteria that are purely qualitative (e.g., "the UI should feel responsive").
- `ambiguity` is `high` if there are 2+ entries in `gaps` or if any AC is `verifiable: false`.
- `platforms` is drawn only from the allowed values; do not invent new ones.
- `tms_ids` is an empty list `[]` if none are mentioned in the ticket.
- `sources_read` must always be present and fully populated — never omit it, even when all sources are unavailable.
- `sources_read.ticket.status` is `read` only if the ticket was successfully fetched or pasted; `unavailable` if not readable.
- `sources_read.docs.status` is `read` if at least one doc was read, `not_linked` if the ticket had no doc links, `unavailable` if links existed but docs could not be fetched.
- `sources_read.code_diff.status` is `read` if a diff was retrieved, `not_found` if no MR exists for this ticket, `unavailable` if an MR exists but the diff could not be read.
- `sources_read.design.status` is `read` if at least one design spec was read, `not_linked` if the ticket had no design links, `unavailable` if links existed but the file could not be accessed.
- Every entry in `gaps` and `regression_risk` uses the Finding Structure from `_config/writing-rules.md`.
