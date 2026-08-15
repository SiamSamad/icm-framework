# Stage 01 — Normalize Ticket

## INPUTS

### Mode A — Ticket Intake (default)

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | Ticket via tracker integration (primary, if connected), `inputs/<TICKET-ID>.md` (fallback), or pasted content | Source ticket to normalize |
| Layer 3 | `_config/<product>.md` | Base URLs, test accounts, selectors, known edge cases, environment details |
| Layer 3 | `_config/writing-rules.md` | Finding structure and prose standards for all output |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

### Mode B — API Case Intake

Mode B accepts two input paths. Either satisfies the gate; both may be supplied together.

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | **Path B1** — one or more tabular files (xlsx, csv, or tab-separated) — a case source, an endpoint inventory, or both | Test scenarios and/or API surface to parse and classify |
| Layer 4 | **Path B2** — a live test management tool (TMT) adapter: a folder ID (fetches every case in that folder) or a single case key such as `DEMO-TC-1201` | Test cases pulled directly from the TMT — no export file required |
| Layer 4 | Parent ticket text (description, ACs, sample request body, mandatory fields) | Business intent and payload examples; required when a Path B1 case source is supplied |
| Layer 4 | Service OpenAPI spec (when provided) | Supplement to the endpoint inventory for auth scheme and payload detail |
| Layer 3 | `_config/api-intake.md` | Shape recognition, canonical field mapping, parsing rules, the TMT adapter contract, combination rules, extended spec schema, held reason reference |
| Layer 3 | `_config/source-freshness.md` | Path B2 only — what to fingerprint, how, and where the hashes are recorded |
| Layer 3 | `_config/service-source-lookup.md` | API services — repository resolution, the six constraint classes to extract, the source-versus-case authority rule, and the `constraint_layer` states |
| Layer 3 | `_config/auth-behavior.md` | Per-service auth header and missing/invalid-key status codes, with VERIFIED/ASSUMED provenance |
| Layer 3 | `_config/writing-rules.md` | Finding structure and prose standards for all output |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

---

## GATE

**Mode A:** None — this is the first stage. If the ticket cannot be reached via any source path, stop and report the error rather than proceeding with empty inputs.

**Mode B:** Require at least one usable case or endpoint source — either **Path B1** (a parseable tabular file: Shape 1 case source, Shape 2 endpoint inventory, or both) or **Path B2** (a folder ID or case key that returns at least one case). If no tabular file is parseable and no live fetch returns a case, halt with a clear message stating what is missing.

**Parent ticket context — Path B1 only.** Where a Path B1 case source is supplied, parent ticket context (description or ACs at minimum) is required; if it is missing, halt and say so. **Path B2 does not require it.** TMT preconditions carry the environment, endpoint, headers, and payload that a parent ticket supplies for a tabular export, so the requirement does not apply. Any parent tickets the cases reference are recorded inside the spec under `source_provenance.parent_tickets` — never demanded up front.

---

## PROCESS

### Mode Selection

Determine which intake mode applies before reading any sources:

- **Mode A — Ticket Intake (default):** The input is a ticket ID, a pasted ticket, or an `inputs/<TICKET-ID>.md` file. Proceed with Mode A below.
- **Mode B — API Case Intake:** The input is one or more tabular case/endpoint exports (Path B1), or a folder ID or case key to fetch live from the TMT (Path B2), with accompanying parent ticket context and optionally a service OpenAPI spec. Proceed with Mode B below.

If ambiguous, ask before proceeding.

---

## Mode A — Ticket Intake

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

## Mode B — API Case Intake

Load `_config/api-intake.md` for shape recognition, canonical field mapping, parsing rules, the TMT adapter contract, combination rules, the extended spec schema, and the held reason reference.

### Role

You are a QA Analyst. Your job is to turn an existing body of API test cases — however it arrives — into one canonical, auditable inventory that downstream stages can map to code without re-reading the source.

### Input paths

Mode B has two input paths that produce the same `cases` inventory:

- **Path B1 — tabular files.** Steps 1–4 parse xlsx / csv / tab-separated exports.
- **Path B2 — live TMT fetch.** Step 0 pulls cases from the tool through its adapter. Follow `_config/api-intake.md` → Live TMT Intake exactly; its adapter contract records the failure modes that corrupt a fetch without raising an error.

Both paths converge at step 5. When both are supplied, parse each into `cases` and dedup by case key, reporting every duplicate.

### Steps

0. **Fetch from the TMT (Path B2 only).** The user supplies either a folder ID — fetch every case in that folder — or a single case key such as `DEMO-TC-1201`. Apply `_config/api-intake.md` → Live TMT Intake for the fetch sequence, the required explicit `fields` list, pagination handling, markup normalisation, and known-defect extraction. Record `source_provenance` (folder ID fetched, case count returned, fetch timestamp, and any parent tickets the cases reference) so a later run can diff against it. `folder_id` is recorded whatever the output folder ends up being named, since the freshness check resolves by ID rather than by name. Reconcile: the number of cases written must equal the `total` reported by the search — if it does not, report the discrepancy and halt rather than emitting a partial inventory. Write output to the folder-scoped path defined under **Output location** below.

   **Fingerprint every case.** Before normalising markup or splitting known defects, write the raw fetched cases to a scratch JSON file and run:

   ```
   node _tools/case-hash.mjs <scratch>/cases.json
   ```

   Record the returned `algorithm` as `source_provenance.hash_algorithm` and the returned map as `source_provenance.case_hashes`. Never hand-compute a hash and never transcribe one by eye — copy the script output. One entry per case in `cases`, no more and no fewer. Stage 03, `/drift-check`, and any later re-check read these values to decide whether the source has moved since. See `_config/source-freshness.md`.

1. **Detect shapes and map headers.** Classify each tabular file as Shape 1 (case source), Shape 2 (endpoint inventory), or neither, using the criteria in `_config/api-intake.md` → Shape Recognition. For each file, map its column headers to canonical fields by intent — not exact text. Record the full header-to-canonical-field mapping for every file; report it in the Intake Summary so the mapping is auditable. If a required field cannot be confidently mapped, ask before proceeding.

2. **Apply parsing rules.** Forward-fill grouping columns. Ignore fully blank rows and trailing notes rows. Normalise ticket IDs. Capture free-text comment columns as row-level notes rather than discarding them. Where a row carries a DB table or SQL query, record it as a `data_validation` requirement on that endpoint — do not run or interpret SQL. See `_config/api-intake.md` → Parsing Rules.

3. **Parse Shape 1 → cases inventory.** Populate the `cases` list using canonical fields. Extract the type prefix from the Summary field. Reconcile: the count of rows written to `cases` must equal the count of non-blank, non-header data rows in the file.

4. **Parse Shape 2 → api_contract and coverage_matrix.** Populate `api_contract.endpoints` and `coverage_matrix` using canonical fields. Reconcile the endpoint row count the same way. Where the parent ticket and the endpoint inventory or OpenAPI spec contradict each other on method, path, or intent (e.g. the ticket describes `POST /cancelOrder` while the spec defines `DELETE /v1/orders/{id}`), record both sides in `api_contract.disagreements` — never silently pick one.

5. **Handle combination.** Apply `_config/api-intake.md` → Combination Rules. If only a Shape 2 endpoint inventory was supplied with no case source, state clearly in the spec and Intake Summary that no cases were provided; ask whether to proceed or wait for a case source. Do not invent cases.

6. **Cross-reference (if both shapes present).** For each endpoint in the `coverage_matrix`, identify which case IDs cover it — match by method, path, and service. Set `covered_by` accordingly. Mark any endpoint with no matching case as `coverage_gap: true` and report each gap.

7. **Extract parent ticket IDs, dedup, and classify cases.** Extract ticket IDs using the lenient pattern from `_config/api-intake.md` → Parent Ticket ID Extraction. Collapse duplicate case IDs across files; report each duplicate. Classify each case using the Held Reason Reference: `automatable_now: true` if any meaningful assertion can be made at the API layer; `false` only when nothing in the case can be. Source columns such as `Automation_Candidate` are captured in `notes` only — never treated as a classification decision.

8. **Capture `open_questions` verbatim.** Do not resolve by assumption.

9. **Determine product and target service.** Set `product` from the supplied inputs (parent ticket, service spec, or explicit instruction), and set the service each case belongs to. API tests route to `playwright/api/tests/{service}/` — the service name is the routing key, so it must be derivable. If it cannot be determined, ask rather than assume. If a matching `_config/<product>.md` exists, load it; if not, note its absence in the spec and proceed with only the supplied inputs.

10. **Record environment variables** in `environment_config` — always a base URL and the auth credential named by the spec's auth scheme, plus any data-dependency IDs the payload needs. No values are hardcoded into cases or tests. State in `porting_note` that switching environments requires changing only these variables.

11. **Extract the service constraint layer.** Load `_config/service-source-lookup.md` and follow it. Resolve the service repository by **searching** the configured source group (`source_group` in `_config/<product>.md`) for a project matching the service name — never from a stored mapping, so a new service works without anyone editing a config file first. Record which repository was found, `match_method`, and the `ref` actually read.

    Extract the six constraint classes — DB check constraints, enum declarations, validation annotations, cascade rules, state transitions, and auth — recording every finding with a `source_file` in the source tree. Never record a build-output path (`target/`, `build/`, `dist/`): that is generated and can be stale.

    For auth, cross-check against `_config/auth-behavior.md`. A verified probe recorded there outranks an unread shared library; where the filter is external, record `null` status codes with a note naming the library rather than inferring them from the service's own exception handlers.

    Then compare each extracted valid set against what the `cases` assert, and record every value-level conflict under `constraint_layer.disagreements`, naming both sides.

    **The service source is authoritative for what values are valid. The cases are authoritative for what should be tested.** When they disagree on a value, the source wins and the case is reported for correction.

    Do not resolve a disagreement here, do not edit a case to match the source, and do not mark a case skipped — Stage 02 acts on it, and the correction is reported back to the test management tool.

    **The block is always emitted.** No repository match is `status: no_match`; several matches is `ambiguous`; a repository that could not be read — or no configured `source_group` — is `unavailable`. Each records its reason and is a stated gap, not a silent skip. Omitting the block entirely means the lookup never ran, which reads downstream as UNVERIFIED and halts Stage 02 — never leave it out to signal that nothing was found.

### Intake Summary format (Mode B)

```
## Intake Summary

- ✅/➖/⚠️ Tabular file(s) — [N files: N as Shape 1 (case source) with N cases, N as Shape 2 (endpoint inventory) with N endpoints; N duplicates collapsed]
- ✅/➖/⚠️ TMT fetch — [folder ID or case key fetched; N cases returned; N steps total; fetched <timestamp>; or "not used — tabular path"]
- ✅/➖/⚠️ Header mapping — [for each file: original header → canonical field; flag any header that could not be confidently mapped]
- ✅/➖/⚠️ OpenAPI spec — [endpoint count used, or why not provided]
- ✅/➖/⚠️ Parent ticket — [ticket ID and one-line summary, or why not provided]
- ✅/➖ Source disagreements — [N conflicts recorded between parent ticket and endpoint inventory/OpenAPI spec; or "none"]
```

### Output location

| Intake | Output folder |
|--------|---------------|
| Path B1 (tabular), or Path B2 scoped to case keys under one parent ticket | `stages/01-normalize/output/<TICKET-ID>/` |
| **Path B2 scoped to a folder covering exactly one service** | `stages/01-normalize/output/<Service-Name>/` — e.g. `Order-Service` |
| **Path B2 scoped to a folder covering more than one service** | `stages/01-normalize/output/TMT-<folderId>/` — e.g. `TMT-4102` |

A folder-scoped Path B2 fetch has no ticket ID: the cases in one TMT folder routinely span several parent tickets, or none. Name the folder for what it covers.

**Prefer the service name.** When every case in the fetched folder belongs to one service, use that service's name. A folder ID in the path gives a service a second identity alongside the name it already has, which is how one service ends up with two unlinked folders — one from a tabular intake, one from a live fetch. Fall back to `TMT-<folderId>` only when no single service name would be honest, which means the folder genuinely spans several services.

**Record `source_provenance.folder_id` in both cases.** The name is a label; the ID is the scope. The freshness check resolves by `folder_id`, never by folder name, so renaming a folder never breaks `/drift-check` or the Stage 03 gate. A folder ID that lived only in the path would be lost on the first rename.

Set `ticket_id` in the spec to the same string as the folder name — downstream stages resolve `output/<TICKET-ID>/` from it, so the two must not drift. Record every parent ticket the cases reference under `source_provenance.parent_tickets`, never in the path, and never pick one referenced case's ticket to stand for the whole folder. Filenames inside the folder stay plain (`spec.md`, `report.html`), exactly as for a ticket folder.

### Spec output

Emit the standard spec YAML extended with `api_contract`, `cases`, `coverage_matrix`, `open_questions`, `data_dependencies`, `environment_config`, `source_provenance`, and `constraint_layer` as defined in `_config/api-intake.md` → Extended Spec Schema and in the `constraint_layer` schema below. Write to the path given under **Output location** above.

**`constraint_layer` schema** — see `_config/service-source-lookup.md` for the extraction rules and state definitions:

```yaml
constraint_layer:
  status: ""              # extracted | partial | no_match | ambiguous | unavailable
  repo: ""                # e.g. <source-group>/order-service
  ref: ""                 # branch or commit actually read — not just the branch name
  match_method: ""        # exact_path | normalised | substring
  match_candidates: []    # every project considered; required when status is ambiguous
  searched_group: ""      # the configured source_group
  searched_for: ""        # the service name the search used
  extracted_at: ""
  reason: ""              # required for partial, no_match, ambiguous, unavailable
  enums:
    - name: ""            # e.g. CHK_ORDER_STATUS, OrderStatus
      values: []
      source_kind: ""     # db_check_constraint | code_enum | validation_annotation
      source_file: ""
  required_fields:
    - field: ""
      rule: ""            # e.g. "not null", "max length 100"
      source_file: ""
  cascade_rules:
    - relationship: ""
      on_delete: ""
      source_file: ""
  transitions:
    - from: ""
      to: []
      source_file: ""
  auth:
    header: ""
    missing_key_status: null   # null when the filter lives in a shared library
    invalid_key_status: null
    source_file: ""
    note: ""
  internal_disagreements:      # one part of the source disagreeing with another
    - subject: ""
      sources: []              # each: value set plus source_file
      note: ""
  disagreements:               # a case asserting a value the source does not allow
    - case: ""
      step: 0
      field: ""
      case_asserts: ""
      source_allows: []
      source_file: ""
      note: ""
```

### Baseline sharing check (Path B2 only) — run immediately after writing `spec.md`

```
node _tools/baseline-tracked.mjs stages/01-normalize/output/<folder>
```

A Path B2 spec is a freshness baseline. If `.gitignore` excludes it, it never leaves this machine, and nobody else can tell whether the source has moved for that service. `.gitignore` lists baselines one line at a time — git cannot tell a TMT-sourced spec from a tabular one by path — so a new baseline is excluded by default, and silently.

| Exit | Meaning | What to do |
|------|---------|-----------|
| `0` | Committable, or exempt because the spec is not TMT-sourced | Continue |
| `1` | The baseline is excluded — **a decision, not an error** | Ask (below) |
| `2` | The check could not run, or the fix could not be applied | **Halt** |

**On `1`, ask — do not halt, and do not ask the user to edit anything.** Put the question in plain terms; the reviewer is not expected to know what a gitignore negation is or where it goes:

> This service's freshness baseline will only exist on this machine, so nobody else can check whether the source has changed for it. Add it so it is shared?

- **Yes** — run `node _tools/baseline-tracked.mjs stages/01-normalize/output/<folder> --add`. It edits `.gitignore` itself and reports what it changed. Confirm that back in one line, then continue. Commit `.gitignore` alongside the baseline.
- **No** — continue normally, and add this line to the completion message so the choice stays visible:
  `⚠️ Baseline is local-only — /drift-check will not run for this service on any other machine.`

Never ask the user to hand-edit `.gitignore`, and never name the `!` line at them as an instruction — `--add` exists so nobody has to.

**On `2`, halt.** No report, no completion message, no Stage 02. This is a genuine error — no git repository, git unavailable, or an exception `.gitignore` cannot express — not a choice anyone can make. An unchecked baseline is the case this exists to catch, so an inconclusive result never reads as a pass. Never work around it by editing the spec, renaming the folder, or force-adding the file.

### HTML report (Mode B)

Follow `_config/report-style.md` for technical requirements. Add these Mode B-specific sections after the standard Intake Summary and Spec Fields sections:

- **Cases Inventory table** — one row per case: case key, summary, type prefix, automatable / held status badge, held reason (if held).
- **API Contract card** — endpoints, auth scheme, mandatory fields, and any disagreements rendered as amber-highlighted findings.
- **Open Questions box** — amber-highlighted, one item per bullet.

Call-to-action box follows the standard Stage 01 wording. Completion messages match Mode A, substituting the folder name used.

---

## OUTPUTS

| File | Path |
|------|------|
| Normalized spec | `stages/01-normalize/output/<TICKET-ID>/spec.md` |
| HTML report | `stages/01-normalize/output/<TICKET-ID>/report.html` |

Mode B extends the spec with `api_contract`, `cases`, `coverage_matrix`, `open_questions`, `data_dependencies`, `environment_config`, and (Path B2) `source_provenance`. For a folder-scoped Path B2 fetch, `<TICKET-ID>` is replaced by the service name when the folder covers exactly one service, or by `TMT-<folderId>` when it covers more than one — see Mode B → Output location.

---

## VERIFY

**Mode A:** None — this is the first stage. Source availability is recorded in `sources_read`; any gaps are flagged in the spec rather than blocking the stage.

**Mode B:**
- The header-to-canonical-field mapping for every tabular file is recorded in the Intake Summary.
- Parsed row count for each file reconciles with the count of non-blank, non-header data rows in that file — no row is silently dropped.
- Forward-filled grouping values are applied: no row carries a blank service or feature name when a value appeared in a prior row.
- Every case with `automatable_now: false` has a non-empty `held_reason`.
- No case is marked `automatable_now: false` when any meaningful assertion can be made at the API layer — such a case must be `automatable_now: true` with a `coverage_note` instead.
- Every case with partial coverage has a non-empty `coverage_note`.
- Every endpoint in the `coverage_matrix` that has no matching case is marked `coverage_gap: true` and reported — uncovered endpoints are never silently ignored.
- **(Path B2)** The case count written to `cases` equals the `total` reported by the search call. A case that returned zero steps is reported explicitly, never emitted with a silently empty `step_summary`.
- **(Path B2)** Every case whose step `total` exceeded the rows returned was paged to completion — no case carries a truncated step list.
- **(Path B2)** `source_provenance` is populated with folder ID, case count, and fetch timestamp, plus `parent_tickets` listing every parent ticket the cases reference.
- **(Path B2)** `source_provenance.case_hashes` holds exactly one hash per case in `cases` — same keys, same count — and `hash_algorithm` records the tag the hasher emitted.
- **(Path B2)** Every hash came from `_tools/case-hash.mjs` run over the raw fetched values. No hash was hand-computed, guessed, or carried over from an earlier run.
- **(Path B2)** A folder-scoped fetch wrote to a folder named for the service it covers, or to `output/TMT-<folderId>/` when it covers more than one — and no single case's ticket was used to stand for the folder.
- **(Path B2)** `ticket_id` in the spec matches the output folder name exactly, so downstream stages resolve the right folder.
- **(Path B2)** `source_provenance.folder_id` is recorded whatever the folder is named — the freshness check resolves by ID, not by name.
- **(Path B2)** `_tools/baseline-tracked.mjs` was run against the output folder after `spec.md` was written. Exit `1` was resolved by asking the user and, on yes, running `--add` — never by asking them to edit `.gitignore`. Exit `2` halted the stage and was never treated as a pass.
- **(Path B2)** Where the user declined to share the baseline, the completion message carries the local-only warning.
- **(Path B2)** Every `expectedResult` carrying a known-defect marker was split: the stated expectation is in `expected_result` and the observed behaviour is in `known_defects`. No case carries the defective behaviour as its expectation.

---

## QUALITY CHECKS

**Mode A (all checks below apply):**
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

**Mode B (additional checks):**
- Case count in `cases` matches the total unique case IDs parsed from all Shape 1 files (after dedup); no case is silently dropped.
- Endpoint count in `api_contract.endpoints` matches the total rows parsed from all Shape 2 files (after dedup); no endpoint is silently dropped.
- No held case has an empty `held_reason`.
- No case is marked `automatable_now: false` when any meaningful API-layer assertion (status code, response body, headers, error structure) is possible for that case — such cases must be `automatable_now: true` with a `coverage_note`.
- `Automation_Candidate=No` (or equivalent) from a source column never drives the classification decision; it is captured in `notes` only.
- Every endpoint with `coverage_gap: true` is listed explicitly — the spec never silently omits an uncovered endpoint.
- Every conflict between the parent ticket and the endpoint inventory or OpenAPI spec is recorded in `api_contract.disagreements` with both sides stated — never silently resolved.
- `open_questions` contains every unresolved item verbatim — nothing was guessed or silently resolved.
- `environment_config.variables` includes at minimum a base URL and the auth credential named by the spec's auth scheme; no literal environment values are hardcoded into any `cases` entry or step field.
- The target service is set for every case, since `playwright/api/tests/{service}/` routes by it.
- **(Path B2)** The case search was called with an explicit `fields` list — never bare, which returns cases with no title.
- **(Path B2)** Scoping was done with the folder ID, not a free-text query parameter.
- **(Path B2)** A single-case detail endpoint was not used as a source of case data.
- **(Path B2)** No internal TMT ID was parsed, cast, or compared as an integer.
- **(Path B2)** Wiki markup is stripped from every `precondition`: no `{noformat}` fences and no `[url|url]` syntax survive into the spec, and any embedded JSON body is left parseable.
- **(Path B2)** No `expected_result` contains the strings `CURRENT ACTUAL`, `ACTUAL:`, or a bug reference — those belong in `known_defects`.
- **(Path B2)** Every entry in `known_defects` names the bug reference where the source stated one, and states both the expectation and the observed behaviour.
- **(Path B2)** The hasher was fed raw fetched values — captured before markup normalisation and before known-defect splitting — so the fingerprints stay comparable to any later fetch.
- **(Path B2)** No excluded field (summary, description, priority, status, labels, folder, version) reached the hasher input.
- **(API services)** `constraint_layer` is present with a `status`. The block is never omitted — an absent block means the lookup never ran and halts Stage 02.
- **(API services)** The repository was resolved by searching the configured source group, never from a stored service-to-repo mapping.
- **(API services)** `match_method` and `ref` are recorded, so a later reader can judge whether the right repository was read and re-check the findings against the same revision.
- **(API services)** `status: no_match` records the group searched and the name searched for; `ambiguous` lists every candidate and picks none.
- **(API services)** `reason` is non-empty for `partial`, `no_match`, `ambiguous` and `unavailable`.
- **(API services)** Every finding carries a `source_file` in the source tree. No build-output path (`target/`, `build/`, `dist/`) is recorded anywhere in the block.
- **(API services)** Auth status codes are `null` with a note naming the library where the filter is external — never inferred from the service's own exception handlers.
- **(API services)** Every case value falling outside an extracted valid set appears in `constraint_layer.disagreements` naming both the asserted value and the allowed set, by case key. None was resolved, narrowed, dropped, or skipped.
- **(API services)** Where nothing could be extracted, `disagreements` is empty and `reason` says so — an empty list is never left to be misread as the cases agreeing.
- **(API services)** No service repository was written to.
