# API Intake — Reference

Load this module in Stage 01 when running in **Mode B (API case intake)**. It defines how to detect input shapes, map column headers to canonical fields, apply parsing rules, fetch cases live from a test management tool (TMT), handle shape combinations, and structure the extended spec output. It is not loaded by any other stage.

---

## The TMT Is Pluggable

API test cases usually already exist somewhere — a spreadsheet, or a test management tool. Mode B accepts both, and treats the tool as an **adapter behind a fixed contract** rather than a dependency:

- The **framework** owns the contract: fetch by folder or case key, explicit field lists, pagination to completion, canonical field mapping, and content fingerprinting.
- The **adapter** owns the vendor call. Any tool (e.g., TestRail, Zephyr, QMetry, Xray) can sit behind it.

Everything downstream — Stage 02 mapping, the Stage 03 freshness gate, `/drift-check` — is written against the canonical case shape below, never against a vendor payload. Swapping tools changes the adapter, not the pipeline.

---

## Shape Recognition

Classify each tabular file by examining its column headers. A file may be Shape 1, Shape 2, or neither. If a file does not clearly match either shape, report it as unrecognised and ask rather than guessing.

**Shape 1 — Case source** (rows are test scenarios)

Present when the headers include columns describing scenarios: a case or work key, a summary or scenario description, steps, test data, and an expected result. A TMT export is one example; any spreadsheet of test cases qualifies.

Minimum recognising headers (at least three of):
`Work Key`, `Case ID`, `ID`, `Test ID`, `Summary`, `Scenario`, `Title`, `Steps`, `Step Summary`, `Test Steps`, `Expected Result`, `Expected`, `Result`

**Shape 2 — Endpoint inventory** (rows are API endpoints, not scenarios)

Present when the headers describe API surface: a service or component name, an HTTP method, and a URL or path.

Minimum recognising headers (all three of):
- A service/component column: `Micro Services`, `Service`, `Component`, `Module`
- A method column: `Method`, `HTTP Method`, `Verb`
- A path column: `URL`, `Path`, `Endpoint`, `Route`

---

## Canonical Field Mapping

Map incoming column headers to canonical field names by intent — not by exact text. Always record and report the full mapping for every file in the Intake Summary so it is auditable.

### Shape 1 — Case source

| Canonical field | Recognised header variants (examples — not exhaustive) |
|-----------------|-------------------------------------------------------|
| `case_id` | Work Key, Case ID, ID, Test ID, Key |
| `summary` | Summary, Scenario, Title, Name, Test Name |
| `precondition` | Precondition, Pre-conditions, Pre-condition, Setup, Prerequisites |
| `step_summary` | Step Summary, Steps, Test Steps, Test Step, Actions |
| `test_data` | Test Data, Data, Input, Inputs, Parameters |
| `expected_result` | Expected Result, Expected, Result, Expected Output |
| `priority` | Priority, Severity |
| `status` | Status, Test Status |
| `folder` | Folder, Folder Path, Path, Location |
| `type` | TestCase Type, Type, Test Type, Category |
| `notes` | any remaining free-text column not matched above |

### Shape 2 — Endpoint inventory

| Canonical field | Recognised header variants (examples — not exhaustive) |
|-----------------|-------------------------------------------------------|
| `service` | Micro Services, Service, Component, Module, Microservice |
| `method` | Method, HTTP Method, Verb, Request Method |
| `path` | URL, Path, Endpoint, Route, API Path, Endpoint URL |
| `db_table` | DB Table, Database Table, Table, Tables, DB Tables |
| `sql_query` | SQL, SQL Query, Query, DB Query |
| `owner` | Owner, Assignee, Team, Responsible |
| `estimate` | Estimate, Story Points, Points, Effort |
| `status` | Status, Implementation Status, Dev Status |
| `notes` | any remaining free-text column not matched above |

If a required field (`case_id`, `summary`, or `expected_result` for Shape 1; `service`, `method`, or `path` for Shape 2) cannot be confidently mapped, ask rather than guessing or skipping.

---

## Type Prefix Tags

Applies to Shape 1 only. The Summary column may begin with a slash-delimited type tag. Parse it out and record it separately in `type_prefix`.

| Tag | Meaning |
|-----|---------|
| `FUNC/API` | Functional test exercised via API call |
| `API/DB` | API call with a database-state assertion |
| `FUNC/DB` | Functional test with a database-state assertion |
| (none) | Treat as general functional; set `type_prefix: none` |

---

## Parent Ticket ID Extraction

Extract ticket IDs from the Shape 1 `folder` canonical field (or from parent ticket context supplied with the run) using this lenient pattern:

```
[A-Z][A-Z0-9]+-\s*\d+
```

Normalise each match to upper case and strip internal whitespace (e.g. `PROJ- 232` → `PROJ-232`). Collapse duplicates across all files to a single set; report each duplicate rather than double-counting.

---

## Parsing Rules

Apply to every tabular file regardless of shape.

**Forward-fill grouping columns.** Where a value appears once and the cells below in the same column are blank, the value applies to all following rows until the column value changes. This pattern is common for service names and feature groupings in hand-maintained sheets. Never treat a blank grouping cell as having no value — look upward for the most recent non-blank value in that column.

**Ignore fully blank rows.** A row is fully blank when every cell is empty or whitespace-only. Skip it; do not count it in row totals.

**Ignore trailing notes rows.** Rows after the last data row that contain free-text commentary (no key column value, paragraph-style text spanning multiple columns) are notes, not data. Skip them.

**Normalise ticket IDs.** Strip stray internal spaces and convert to upper case. `proj- 232` and `PROJ-232` are the same ticket.

**Capture free-text comment columns as notes.** Any column that cannot be mapped to a canonical field is not discarded — record its header and value as a `notes` string on the row.

**Record data_validation requirements.** Where a row carries a value in `db_table` or `sql_query`, record it as a `data_validation` object on that endpoint in the `coverage_matrix`. Do not attempt to run, interpret, or validate the SQL at this stage.

**Reconcile row counts.** After parsing each file, the count of rows written to output (cases or endpoints) must equal the count of non-blank, non-header, non-trailing-notes rows in the file. Report the reconciliation in the Intake Summary; if counts do not match, stop and report the discrepancy before continuing.

---

## Live TMT Intake

Path B2. Use when the user supplies a folder ID or case key instead of an export file.

### The adapter contract

The framework calls three logical operations. Names below are the contract; a vendor adapter maps them onto whatever its own tools are called.

| Operation | Purpose | Required arguments |
|-----------|---------|--------------------|
| `tmt_search_folders` | Resolve a folder name to a stable folder ID | project scope, name fragment |
| `tmt_search_cases` | List cases in a folder, or fetch one case by key | project scope, folder ID **or** case key, explicit `fields` list, paging window |
| `tmt_get_steps` | Fetch the ordered steps of one case | case **key**, case version, paging window |

Record the project scope in the product config rather than inline — it is deployment configuration, not framework content.

### Fetch sequence

1. **Resolve the folder.** Given a folder ID, use it directly. Given a folder name, resolve it with `tmt_search_folders` and take the ID. Prefer IDs over names: folder names in real projects routinely carry trailing spaces (`"Order Service "`), so exact-match lookups miss.

2. **List the cases.** Call `tmt_search_cases` with the project scope, the folder ID, and an explicit `fields` list:

   ```
   fields: summary, precondition, status, priority, description, orderNo, labels, components
   ```

   Read the reported `total` and page until every case is retrieved. Take each case's version identifier from this response. For a single case key, scope the same call to that case rather than fetching the whole folder — the version is only available here.

3. **Fetch the steps.** For each case call `tmt_get_steps` with the case **key** (e.g. `DEMO-TC-1201`) and the version from step 2. Compare the rows returned against the reported `total` and page until complete.

### Hard rules

These are the failure modes that corrupt a fetch **without raising an error**. They were verified against a real adapter; the specific values differ per vendor, but the class of failure does not. **Verify each one when writing a new adapter, and record what you found** — an unverified adapter is the case this table exists to prevent.

| Rule | Why |
|------|-----|
| Always pass an explicit `fields` list | Field selection is typically opt-in. Without it the response can omit `summary` entirely — every case comes back untitled. Invalid column names often do not error; they surface in a warnings array nobody reads. |
| Never rely on a free-text `query`/search parameter for scoping | Where it is unsupported it is *ignored* rather than rejected: the call returns the entire project while appearing to succeed. Scope with the folder ID. |
| Never treat a "get one case" endpoint as a source of case data | Vendor detail endpoints frequently return a version stub only — no summary, precondition, or steps. Case content comes from the search call; the version identifier does too. |
| Never parse an internal ID as a number | Internal IDs are opaque alphanumeric strings (`oLjPuA4lij4OqY`). Casting or comparing them as integers corrupts them. Address cases by key. |
| Always check step pagination | Step endpoints commonly default to 50 rows and cap at 100. A case with more steps returns a truncated list with no error. |

### Markup normalisation

`precondition` frequently arrives as tracker wiki markup wrapping a JSON request body. Strip it so the embedded JSON is parseable:

- Remove `{noformat}` / `{code}` fence markers, keeping the content between them.
- Collapse `[label|url]` link syntax to the bare URL; where label and URL are identical, keep one copy.
- Preserve newlines and interior whitespace inside the JSON body — do not reflow or re-indent.
- Leave the JSON itself untouched: no reformatting, key reordering, or value substitution.

If a body still fails to parse after stripping, keep the raw text and record the failure in `open_questions` rather than repairing it by hand.

### Known-defect extraction

Test authors document live defects inside the expected result, so the field can contain both what *should* happen and what currently *does*. Read literally, the observed behaviour becomes the assertion — producing a test that passes while the bug is open and fails the moment it is fixed. That inversion must not reach Stage 02.

Treat an `expectedResult` as carrying a known-defect marker when it contains any of:

- `CURRENT ACTUAL` (any casing)
- `ACTUAL:` (any casing)
- a bug reference — a ticket key such as `DEMO-4471`, optionally preceded by `Bug`/`Defect` and/or followed by a status word such as `open`
- a warning glyph (`⚠`, `⚠️`) introducing either of the above

When a marker is found, split the field:

- **`expected_result`** keeps the stated expectation only — the behaviour the API is supposed to exhibit, with the defect clause removed. For `HTTP 400 Bad Request is returned ⚠ CURRENT ACTUAL: 200 OK (Bug DEMO-4471 open)`, `expected_result` is `HTTP 400 Bad Request is returned`.
- **`known_defects`** gains an entry recording the observed behaviour, the bug reference, and the step it came from.

**The observed behaviour never becomes the expectation.** Where the two conflict, the stated expectation always wins — that is the whole point of the split. If a marker is present but the stated expectation cannot be separated with confidence, keep the full text in `expected_result`, add a `known_defects` entry with `parse_confidence: low`, and raise it in `open_questions` rather than guessing at the boundary.

Add every bug reference found this way to `source_provenance.parent_tickets` as well, so the ticket is discoverable from the provenance block.

### Field mapping

| Canonical field | Adapter source | Notes |
|-----------------|----------------|-------|
| `case_id` | `key` | e.g. `DEMO-TC-1201` |
| `summary` | `summary` | |
| `precondition` | `precondition` | after markup normalisation above |
| `step_summary` | `tmt_get_steps` → `stepDetails` | joined in `seqNo` order |
| `test_data` | `tmt_get_steps` → `testData` | |
| `expected_result` | `tmt_get_steps` → `expectedResult` | stated expectation only — see Known-defect extraction above |
| `known_defects` | `tmt_get_steps` → `expectedResult` | observed behaviour and bug reference, split out from the expected result |
| `priority` | `priority.name` | may be absent |
| `status` | `status.name` | may be absent |
| `type_prefix` | not supplied by the TMT | set `none` unless the summary carries a tag |

`description` is typically empty on API cases — the precondition block carries environment, headers, and payload. An empty description is not a gap.

**The contract has no pass or fail criterion field.** Stage 01 records `expected_result` as intake data and stops there; deriving pass and fail criteria is Stage 02's job. Do not synthesise either field at this stage.

### Provenance

Record every fetch in `source_provenance` (see Extended Spec Schema). A later run diffs against these values to detect cases added, removed, or edited since the last intake.

That diff needs more than counts and a timestamp: a folder can gain one case and lose another while `case_count` stays put, and an edit to an existing case moves no count at all. So every Path B2 fetch also records a per-case content fingerprint in `case_hashes`. Compute them with `_tools/case-hash.mjs` over the raw fetched values — see `_config/source-freshness.md` for what is hashed, what is deliberately excluded, and how a later check reads them back.

---

## Combination Rules

| Inputs supplied | Behaviour |
|-----------------|-----------|
| Shape 1 only | Populate `cases` inventory. `coverage_matrix` is empty. `api_contract.endpoints` is populated from the OpenAPI spec if one was provided, otherwise empty. |
| Shape 2 only | Populate `api_contract.endpoints` and `coverage_matrix`. Leave `cases` empty. State clearly in the spec and Intake Summary that no case source was supplied — Stage 02 has nothing to map. Ask whether to proceed or wait for a case source. Do not invent cases. |
| Both | Use Shape 1 for `cases`, Shape 2 for `api_contract.endpoints` and `coverage_matrix`. Cross-reference: for each endpoint in the `coverage_matrix`, record which case IDs (if any) cover it. Report any endpoint with no covering case as `coverage_gap: true`. |

---

## Extended Spec Schema

When running in API case intake mode, extend the standard normalized spec with these top-level blocks. All standard spec fields still apply.

```yaml
api_contract:
  endpoints:              # from Shape 2 and/or OpenAPI spec
    - method: ""          # GET | POST | PUT | PATCH | DELETE
      path: ""
      description: ""
  auth_scheme: ""         # e.g. "x-api-key header", "Bearer token", "none"
  mandatory_fields:       # required request body / query param fields
    - ""
  payload_schema: ""      # description or reference to sample body from parent ticket
  disagreements:          # where ticket text and OpenAPI spec conflict — never silently pick one
    - field: ""
      ticket_says: ""
      spec_says: ""

cases:
  - id: ""               # canonical case_id from the source
    summary: ""
    type_prefix: ""      # FUNC/API | API/DB | FUNC/DB | none
    precondition: ""
    step_summary: ""
    test_data: ""
    expected_result: ""
    priority: ""         # Critical | High | Medium | Low
    status: ""           # Approved | Draft | Deprecated | etc.
    automatable_now: true
    held_reason: ""      # required when automatable_now is false; empty string otherwise
    coverage_note: ""    # populated when only partially automatable; empty string otherwise
    known_defects:       # empty list when the source documented no live defect
      - step: 0          # seqNo of the step whose expected result carried the marker
        expectation: ""  # what the API should do — mirrors expected_result
        observed: ""     # what it currently does, per the source
        bug_ref: ""      # e.g. DEMO-4471; empty string when the source named none
        parse_confidence: high   # high | low — low means the split was uncertain, also raised in open_questions
    notes: ""            # free-text comment columns captured from the source row

coverage_matrix:          # one entry per endpoint from Shape 2; empty list when no Shape 2 supplied
  - service: ""
    method: ""
    path: ""
    owner: ""
    data_validation:
      db_table: ""        # empty string when not present in source
      sql_query: ""       # empty string when not present in source
      note: ""            # notes column value from the source row, if any
    covered_by:           # case IDs from `cases` whose scenario covers this endpoint
      - ""
    coverage_gap: false   # true when covered_by is empty

open_questions:
  - ""                   # verbatim unresolved items — never answered by assumption

data_dependencies:
  - ""                   # setup requirements: accounts, seed records, existing data states

environment_config:
  variables:
    - name: ""           # e.g. BASE_URL, auth credential header, partner/account IDs
      description: ""    # what this variable controls
  porting_note: "Switching environments requires changing only the values listed above."

source_provenance:        # Path B2 (live TMT) only; omit entirely on the tabular path
  source: "tmt-live"
  project_scope: ""       # project the adapter was scoped to, as named in the product config
  folder_id: ""           # folder fetched; omitted when specific case keys were requested.
                          # Always recorded for a folder fetch whatever the output folder is named —
                          # the freshness check resolves by this ID, never by folder name.
  folder_path: ""         # human-readable folder path, when known
  case_keys: []           # populated when case keys were requested rather than a folder
  case_count: 0           # cases returned by the search; must equal the number written to `cases`
  step_count: 0           # total steps fetched across all cases
  fetched_at: ""          # ISO 8601 timestamp of the fetch
  parent_tickets: []      # every parent ticket the cases reference, including bug refs from known_defects
  output_folder: ""       # matches `ticket_id` and the folder on disk. For a folder-scoped fetch:
                          # the service name when the folder covers exactly one service, else
                          # TMT-<folderId>. <TICKET-ID> for a ticket-scoped fetch.
                          # See stages/01-normalize/CONTEXT.md → Mode B → Output location.
  hash_algorithm: ""      # tag emitted by _tools/case-hash.mjs, e.g. icm-fp-1; hashes from a different tag are not comparable
  case_hashes: {}         # case key -> content hash, one entry per case in `cases`
                          # e.g. DEMO-TC-1201: "b240bde3796f9767"
                          # covers precondition, step text, test data, expected result — never title,
                          # description, priority, status, or labels. See _config/source-freshness.md.
```

---

## Held Reason Reference

### Classification rule

A case is `automatable_now: true` when **any** meaningful assertion can be made at the API layer — status code, response body field, header value, or error structure. Partial cases are automatable: use `coverage_note` to state exactly which steps or assertions cannot be automated and why.

A case is `automatable_now: false` **only** when nothing in the case can be asserted at the API layer — i.e. every assertion requires something the runner cannot do.

**`Automation_Candidate` source columns** — a `No` value in the source reflects what was convenient to automate manually (e.g. a tester using an API client alongside a browser). It is captured in `notes` only. It is never used as a classification decision. The framework can assert on HTTP responses that a manual tester could not conveniently capture.

### Held conditions

A case qualifies as `automatable_now: false` only when one of the conditions below applies to **every** assertion in the case — not merely one step.

| Condition | Example |
|-----------|---------|
| UI-only trigger | The scenario can only be initiated from within the web application — no API equivalent exists to trigger the same state |
| Outbound-log observation | Every assertion requires watching a webhook, message queue, or outbound API call the runner cannot intercept |
| Forced third-party error | The scenario requires a partner system to return a specific error code — impossible to trigger through our own API |
| Human visual confirmation only | Every assertion requires checking output on an external site or document the runner cannot access, and the API response itself carries no assertable data |

### Partial coverage → coverage_note

When a case is `automatable_now: true` but one or more steps cannot be automated, leave `held_reason` empty and populate `coverage_note` with a precise statement of what cannot be asserted and why. This tells Stage 02 where the boundary lies without discarding the automatable assertions.
