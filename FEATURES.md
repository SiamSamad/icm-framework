# ICM Framework — Feature Tracker

Status: ✅ in baseline · 📐 design/extension point · 🔭 roadmap

## Pipeline & Architecture
- ✅ 5-stage locked architecture (Normalize → Test Cases → Approve → Generate & Run → Promote & Close)
- ✅ Four-layer architecture: Identity/Routing (CLAUDE.md, AGENTS.md) → Stage Contracts (CONTEXT.md) → Shared Reference (_config/) → Working Artifacts (output/)
- ✅ Common stage skeleton: INPUTS → GATE → PROCESS → OUTPUTS → VERIFY → QUALITY CHECKS
- ✅ Per-ticket output folders: `stages/<NN>/output/<TICKET-ID>/` with plain filenames
- ✅ Stages runnable in isolation; validation run lives inside Stage 4
- ✅ Proceed/continue shortcuts between stages (Stage 03 excepted — explicit approval required)
- ✅ Versioned re-run copies (spec-v2.md) — never overwrite prior output

## Intake — Stage 01
- ✅ Four-source intake: ticket (required) / docs / code diff / design (all optional, graceful degradation)
- ✅ Source order: tracker integration → local file → pasted content
- ✅ Intake Summary checklist with ✅/➖/⚠️ semantics
- ✅ Full YAML spec schema: ACs with verifiable flags, ambiguity scoring, gaps, regression risks, out-of-scope, TMS IDs, sources_read provenance with status enums
- ✅ Product classification by content, never ticket prefix

## Test Cases — Stage 02
- ✅ One TC per AC minimum + negative + regression + logging-payload coverage requirements
- ✅ Per-TC: type/platform/priority, preconditions, steps, expected result, separate binary pass & fail criteria
- ✅ Testability report — 3-category classification driven by code_diff status (missing ≠ unverified)
- ✅ Two-line Missing/Fix format for confirmed gaps; three-part Finding Structure for unverified
- ✅ dev-request.txt — paste-ready plain-text data-testid request for devs (chat/ticket-comment friendly)

## Human Gates
- ✅ Stage 03 written approval artifact (Reviewer/Date/Status/Changes/Proceed: YES) — ambiguity ≠ approval
- ✅ Stage 05 hard all-green gate with refusal messages
- ✅ Ask-first record-keeping (TMS + ticket comment) — separate questions, never bundled, never auto

## Generation & Run — Stage 04
- ✅ POM standards: locators private, methods public, no expect() in page objects, is*/getText conventions
- ✅ Spec standards: native tag API, no waitForTimeout, env-var credentials, expect() required, waitForRequest for API assertions, TODO-required skips
- ✅ Routing modes: tier-based (smoke/regression/e2e) or page-based (page areas from product config)
- ✅ Page-folder inference-and-announce + `_unsorted/` fallback (never silent)
- ✅ Failure-first reporting: verdict banner, per-failure error + screenshot (failed/TC-N.png), missing-selector rollup, failures-by-cause grouping
- ✅ previous-run/ rotation (exactly one prior run kept); re-run = execute without regenerate
- ✅ Environment-unreachable check (auth setup failure ≠ test failure) + VPN/local-network troubleshooting note in the runner config
- ✅ Permissions handling patterns for geolocation-style tests

## Promote & Close — Stage 05
- ✅ Promotion target modes: same-repo (default) or external test repo
- ✅ Page-object audit: created / reused as-is / merged-additions (never blind overwrite)
- ✅ Near-duplicate test check with ask (append / replace / skip)
- ✅ `_unsorted/` promotion blocker
- ✅ Branch + MR/PR promotion; human merges; never-copy list (.env, sessions, reports, node_modules)
- ✅ Promotion summary + graduation rule (MR created AND merged confirmed)

## Reporting & Legibility
- ✅ Self-contained HTML report per stage (pure HTML + inline CSS, zero dependencies, always report.html)
- ✅ Shared report-style module: status color table, code chips, source-of-truth linking, CTA box with proceed/continue pills
- ✅ Three-part Finding Structure (What we found / In technical terms / What to do about it)
- ✅ Writing rules: plain-language-first, one idea per sentence, identifiers only in the technical line
- ✅ UI-element chip convention (chip literal labels only)

## Selectors
- ✅ 5-level preference order (data-testid → … → never XPath) with per-level rationale
- ✅ Page-object code rule: no CSS at all (getByTestId → getByRole → getByLabel → getByText)
- ✅ Three-path testability strategy (config table → code diff → classify)
- ✅ data-testid naming conventions (btn-/modal-/banner-/input-)
- ✅ Placeholder-and-flag pattern when no stable selector exists

## Cleanup
- ✅ Scope question: stage outputs / playwright scratch / both
- ✅ Shared-page-object protection (import scan; keep-and-name when shared)
- ✅ All scopes: single ticket+stage, ticket all-stages, stage all-tickets, graduated-all, force
- ✅ List-before-delete, in-flight protection, graduation rule

## Multi-LLM / Portability
- ✅ Model-agnostic folders + markdown; AGENTS.md model-selection guide with escalation criteria and per-stage personas
- ✅ Pointer files: CLAUDE.md / GEMINI.md / copilot-instructions.md

## Roadmap 🔭
- Multi-model LLM-as-Judge validation (second model critiques Stage 02 output)
- CI triggers: pipeline on ticket status change; @smoke per MR, @regression nightly
- TMS write-back implementation (stub exists — asks, returns "not implemented")
- Smart smoke-suite management (SMOKE-INDEX, add/replace/deprecate scoring)
- Change-request flow through the pipeline
- Mobile automation as a separate track
