# ICM Framework — Feature Tracker

Status: ✅ in baseline · 📐 design/extension point · 🔭 roadmap

## Pipeline & Architecture
- ✅ 5-stage locked architecture (Normalize → Test Cases → Approve → Generate & Run → Promote & Close)
- ✅ Four-layer architecture: Identity/Routing (CLAUDE.md, AGENTS.md) → Stage Contracts (CONTEXT.md) → Shared Reference (_config/) → Working Artifacts (output/)
- ✅ Common stage skeleton: INPUTS → GATE → PROCESS → OUTPUTS → VERIFY → QUALITY CHECKS
- ✅ Per-ticket output folders: `stages/<NN>/output/<TICKET-ID>/` with plain filenames
- ✅ Folder-scoped output naming for intakes with no ticket ID (service name, else `TMT-<folderId>`; the ID is always recorded because the name is a label and the ID is the scope)
- ✅ Stages runnable in isolation; validation run lives inside Stage 4
- ✅ Proceed/continue shortcuts between stages (Stage 03 excepted — explicit approval required)
- ✅ Versioned re-run copies (spec-v2.md) — never overwrite prior output
- ✅ Deterministic tooling layer (`_tools/`): rules that must give the same answer every time are scripts the stages call, not judgements they re-make
- ✅ `_archive/` convention — dated snapshots of what cannot be regenerated (approvals, promotion records, run evidence), deliberately tracked

## Test Tooling Buckets
- ✅ Tool-first layout: the top level names the tool, surfaces and products nest beneath it
- ✅ `playwright/web/` — browser runner, one project per product, shared config
- ✅ `playwright/api/` — API runner, one project, services selected by `--grep`
- 📐 `maestro/` — mobile bucket scaffolded (structure + extensibility contract); no runner, no stage wiring yet
- 📐 Sibling tool buckets (`espresso/`, `xcuitest/`, `appium/`) — adding one creates a bucket and a generation module, and disturbs nothing already there

## Intake — Stage 01
- ✅ **Mode A** — four-source ticket intake: ticket (required) / docs / code diff / design (all optional, graceful degradation)
- ✅ Source order: tracker integration → local file → pasted content
- ✅ Intake Summary checklist with ✅/➖/⚠️ semantics
- ✅ Full YAML spec schema: ACs with verifiable flags, ambiguity scoring, gaps, regression risks, out-of-scope, TMS IDs, sources_read provenance with status enums
- ✅ Product classification by content, never ticket prefix
- ✅ **Mode B** — API case intake, tabular (Path B1) and live test-management-tool (Path B2), converging on one canonical `cases` inventory
- ✅ Pluggable TMT intake layer: the framework owns the contract (fetch by folder/case key, explicit field lists, pagination to completion, field mapping, fingerprinting); any vendor is an adapter behind it
- ✅ Shape recognition (case source vs endpoint inventory) and canonical field mapping by intent, recorded in the Intake Summary so it is auditable
- ✅ Parsing rules: forward-fill, blank/trailing-notes handling, unmapped columns captured as notes, row-count reconciliation that halts on mismatch
- ✅ Adapter contract with the silent-failure table — the failures that corrupt a fetch without raising an error
- ✅ Known-defect extraction: the stated expectation stays the assertion; observed buggy behaviour is split into `known_defects`
- ✅ Held-reason classification with four held conditions; partial cases get a `coverage_note` rather than being held
- ✅ Extended spec schema: `api_contract` (with disagreements), `cases`, `coverage_matrix`, `open_questions`, `data_dependencies`, `environment_config`, `source_provenance`

## Source Freshness & Drift
- ✅ Per-case content fingerprinting (`_tools/case-hash.mjs`, algorithm tag `icm-fp-1`) over the content that decides what the test does
- ✅ Whitespace-stable, step-order-sensitive canonical form; hashes taken on raw values so they survive later rule refinements
- ✅ One shared delta-report wording across every consumer, so two checks compare line for line
- ✅ Stage 03 hard freshness gate — no override, and a failed re-fetch is a fetch error rather than mass removal
- ✅ `/drift-check` slash command — read-only, for promoted services that never re-enter Stage 03
- ✅ Baseline protection in cleanup and `.gitignore`, with `_tools/baseline-tracked.mjs` self-healing the ignore rule and verifying git agrees before claiming success

## Test Management Tool Slot
- ✅ The TMT is a pluggable slot: the framework owns the intake and write-back contract, any vendor (e.g., TestRail, Zephyr, QMetry, Xray) is an adapter behind it
- ✅ **Local case register** — the built-in zero-dependency adapter: a committed `registry/<product>.xlsx` that IS the system of record when no vendor tool is connected
- ✅ `_tools/case-register.mjs` — deterministic CLI (init / append / update-status / export); no agent writes a spreadsheet freehand
- ✅ Exit contract 0/1/2 matching `baseline-tracked.mjs`; a rejected batch leaves the register untouched rather than half-appended
- ✅ Sequential, never-reused case IDs issued by the tool from a prefix stored in the workbook itself
- ✅ Status model Draft → Approved → Automated, advanced one stage at a time as the pipeline earns it; `Automated` refused without a spec path
- ✅ A skip directive does not change register status — a skipped case is approved with a blocker, not a withheld approval
- ✅ Summary sheet counts recomputed on every write, never incremented, so a hand edit in Excel cannot leave them drifting
- ✅ Round-trip: the register exports as canonical Mode B cases and re-reads as a Shape 1 tabular source with no special-casing
- ✅ Register-sourced cases fingerprint with `case-hash.mjs` exactly as vendor-sourced ones do; status is excluded, so advancing a case never reads as drift
- ✅ `registry/` is tracked and exempt from every cleanup scope
- 🔭 Vendor adapters behind the same contract (the live-fetch path is specified; no vendor call is implemented)

## Service Source Constraints
- ✅ Authority rule: the source decides what is valid, the cases decide what is tested; disagreements are recorded, never silently resolved
- ✅ Repository resolution by search against a configured group, never a stored map, with `match_method` and `ref` recorded
- ✅ Six constraint classes stated stack-agnostically, with a worked Java/Spring example and a Node/TypeScript equivalent
- ✅ Five-state model where only an absent block halts — "not checked" and "checked, found nothing" are different states
- ✅ Stage 02 constraint gate with no override; disagreements produce a skip, an unmodified assertion, and a Correction Report row

## Test Cases — Stage 02
- ✅ One TC per AC minimum + negative + regression + logging-payload coverage requirements
- ✅ Per-TC: type/platform/priority, preconditions, steps, expected result, separate binary pass & fail criteria
- ✅ Testability report — 3-category classification driven by code_diff status (missing ≠ unverified)
- ✅ Two-line Missing/Fix format for confirmed gaps; three-part Finding Structure for unverified
- ✅ dev-request.txt — paste-ready plain-text data-testid request for devs (chat/ticket-comment friendly)
- ✅ API test-definition mapping: authoritative method/path, `${VAR}` references only, setup/teardown, open assertions with reasons
- ✅ Dual tags (product + service) with a three-source service derivation that asks rather than defaulting
- ✅ Test independence rule — every definition creates and removes what it needs
- ✅ Overlap detection against the promotion target by method/path/assertions, never by name; uncertain counts as Partial and nothing is auto-skipped
- ✅ Write-then-verify-from-disk: reported counts are read back from the written file, not carried from intent

## Skip Lifecycle
- ✅ Skip Directive — a formal skipped state distinct from "not automatable", requiring both a Skip row and a non-empty reason
- ✅ Carry-forward across regeneration, verbatim — a blocker belongs to the service, not to a pipeline run
- ✅ Orphan detection when a skipped case vanishes upstream, reported rather than resolved by assumption
- ✅ Skip state is pipeline metadata and is never fingerprinted, so our own decision cannot read as source drift
- ✅ Verbatim propagation through approval into generated `test.skip()` code, with the reason in both a comment and the call
- ✅ BLOCKED verdict distinct from FAILED — somebody else's dependency versus our own bug

## Human Gates
- ✅ Stage 03 written approval artifact (Reviewer/Date/Status/Changes/Proceed: YES) — ambiguity ≠ approval
- ✅ Approval-is-a-copy rule: every field survives, and unskipping must be explicit and recorded
- ✅ Skip reconciliation between Stage 02 output and the written approval, halting on any unexplained difference
- ✅ Stage 05 hard all-green gate with refusal messages; BLOCKED does not promote and there are no waivers
- ✅ Ask-first record-keeping (TMS + ticket comment) — separate questions, never bundled, never auto
- ✅ Record-keeping has a real no-vendor path: promoted cases flip to `Automated` in the local register with the promoted spec path, replacing the "not implemented yet" dead end

## Generation & Run — Stage 04
- ✅ POM standards: locators private, methods public, no expect() in page objects, is*/getText conventions
- ✅ Spec standards: native tag API, no waitForTimeout, env-var credentials, expect() required, waitForRequest for API assertions
- ✅ Routing modes: tier-based (smoke/regression/e2e) or page-based (page areas from product config)
- ✅ Page-folder inference-and-announce + `_unsorted/` fallback (never silent)
- ✅ Failure-first reporting: verdict banner, per-failure error + screenshot (failed/TC-N.png), missing-selector rollup, failures-by-cause grouping
- ✅ previous-run/ rotation (exactly one prior run kept); re-run = execute without regenerate
- ✅ Environment-unreachable check (auth setup failure ≠ test failure, and produces no verdict at all)
- ✅ Permissions handling patterns for geolocation-style tests
- ✅ API generation on the Playwright `request` fixture — no browser, page, page objects, selectors, or storageState
- ✅ Typed lazy env-config modules: `required.ts` written once, `env.shared.ts` empty until a second reader, per-service modules append-only, descriptor-copying barrel that keeps `--list` working with no `.env`
- ✅ Ownership rule — one variable name, one module; unread variables annotated rather than deleted
- ✅ Pending assertion / pending auth / pending DB formats — never invent an expected value or SQL
- ✅ DB-validation routing by type prefix; no connection opened without details in `environment_config`
- ✅ Ask-before-running fork for API generation; an unreachable environment holds rather than fails

## Auth Behaviour
- ✅ Per-service table of header, missing-key and invalid-key status, with a VERIFIED/ASSUMED provenance column
- ✅ ASSUMED rows still generate assertions but carry `@auth-unverified`, so one `--grep` lists every outstanding guess
- ✅ Probing procedure that promotes a row, plus the framework-semantics explanation of why 401 and 403 diverge
- ✅ The "restricted role key" analysis — why that scenario usually tests nothing

## Promote & Close — Stage 05
- ✅ Promotion target modes: same-repo (default) or external test repo
- ✅ Page-object audit: created / reused as-is / merged-additions (never blind overwrite)
- ✅ Near-duplicate test check with ask (append / replace / skip)
- ✅ `_unsorted/` promotion blocker
- ✅ Branch + MR/PR promotion; human merges; never-copy list (.env, sessions, reports, node_modules)
- ✅ Branch-reuse discipline — reuse never recreate, never suffix, rebase while unreviewed and merge once reviewed, conflicts stop and report
- ✅ Dedup decisions mapped to definite file operations, with PROCEED glossed explicitly as overwrite
- ✅ Coverage removal check before any overwrite; net loss halts the promotion and the confirmation must be given against that report
- ✅ Env-module promotion rules: own module only, append-don't-overwrite, barrel append-only, monolith stops the promotion, `.env.example` maintained here
- ✅ Unvalidated promotion path for the no-verdict case — `[UNVALIDATED]`, do-not-merge, recorded as "pending validation" never "automated"
- ✅ Disposition report with validation state, dedup findings, and a removal-check section that is never omitted
- ✅ Documented known gaps written into the contract rather than quietly decided
- ✅ Promotion summary + graduation rule (MR created AND merged confirmed)

## Reporting & Legibility
- ✅ Self-contained HTML report per stage (pure HTML + inline CSS, zero dependencies, always report.html)
- ✅ Shared report-style module: status color table, code chips, source-of-truth linking, CTA box with proceed/continue pills
- ✅ Canonical stylesheet — one verbatim CSS block as the single visual source of truth, with a marked section for stage-specific additions
- ✅ Three-part Finding Structure (What we found / In technical terms / What to do about it)
- ✅ Writing rules: plain-language-first, one idea per sentence, identifiers only in the technical line
- ✅ UI-element chip convention (chip literal labels only)

## Selectors
- ✅ 5-level preference order (data-testid → … → never XPath) with per-level rationale
- ✅ Page-object code rule: no CSS at all (getByTestId → getByRole → getByLabel → getByText)
- ✅ Three-path testability strategy (config table → code diff → classify)
- ✅ data-testid naming conventions (btn-/modal-/banner-/input-)
- ✅ Placeholder-and-flag pattern when no stable selector exists

## Runner Ergonomics
- ✅ Per-runner README: Prerequisites / Things That Silently Break Tests (symptom → diagnostic → fix → where the fix lives) / First-Run Checklist
- ✅ Config rationale documented inline — serial workers, long timeout, and trace-on-retry each carry the reason they were chosen
- ✅ UI auth setup wired as a `dependencies:` entry with a co-located `auth/.gitignore`
- ✅ `.env.example` discipline — names only, grouped per service, with `Source:` comments naming the declaring module

## Cleanup
- ✅ Scope question: stage outputs / playwright scratch / both
- ✅ Shared-page-object protection (import scan; keep-and-name when shared)
- ✅ All scopes: single ticket+stage, ticket all-stages, stage all-tickets, graduated-all, force, full reset
- ✅ Freshness-baseline protection across every scope but full reset, with skips named rather than silent
- ✅ List-before-delete, in-flight protection, graduation rule

## Security & CI
- ✅ Secret detection on push, PR, and a weekly full-history scan (gitleaks) plus CodeQL
- ✅ Allowlist tuned for a repo full of placeholder keys and `${VAR}` templates
- ✅ Secrets never committed: `.env` refused, session files refused, `.env.example` names-only

## Multi-LLM / Portability
- ✅ Model-agnostic folders + markdown; AGENTS.md model-selection guide with escalation criteria and per-stage personas
- ✅ Pointer files: CLAUDE.md / GEMINI.md / copilot-instructions.md

## Roadmap 🔭
- Multi-model LLM-as-Judge validation (second model critiques Stage 02 output)
- CI triggers: pipeline on ticket status change; @smoke per MR, @regression nightly
- TMS write-back to a *vendor* tool (the local case register already covers the no-vendor case end to end)
- Smart smoke-suite management (SMOKE-INDEX, add/replace/deprecate scoring)
- Change-request flow through the pipeline
- A working mobile runner behind the scaffolded `maestro/` bucket — flow generation rules, device config, and Stage 04 wiring
- Resolve the documented helper-overwrite gap in Stage 05 promotion
