# ICM Framework — Feature Tracker

A living checklist of what this framework does. Update the status as things land.

**Status key:** ✅ in baseline · ◐ simplified vs. fuller version · 📐 design/extension point (not built)

---

## Pipeline
- ✅ 5-stage locked architecture (Normalize → Test Cases → Approve → Generate & Run → Disposition)
- ✅ Numbered stage folders, each with its own `prompt.md` + `output/`
- ✅ Stages runnable in isolation
- ✅ Validation run lives inside Stage 4 (not a 6th stage)

## Intake — Stage 01
- ✅ Multi-source intake with graceful degradation (ticket / requirements / code diff)
- ✅ "Sources Read" provenance section
- ◐ Intake Summary status icons (✅/➖/⚠️) — currently a plain "Sources Read" list; icon format not yet restored
- ✅ Product classification by content, not filename prefix
- ✅ Spec is the single source of truth for downstream stages

## Test Cases + Testability — Stage 02
- ✅ Draft cases (ID / preconditions / steps / expected / tags)
- ✅ Tagging: `@smoke` / `@regression` / `@e2e`
- ✅ `BLOCKED` markers for cases tied to open questions
- ✅ Testability analysis — three-category classification (has selector / missing → recommend `data-testid` / unverified) **(flagship)**

## Selectors
- ✅ Shared selector quality standard (`_config/selectors.md`)
- ✅ Precedence: `data-testid` → stable id → `getByRole`/`getByLabel` → structural CSS → never XPath
- ✅ Three-path resolution: read from code → grab from live DOM → flag gap + recommend `data-testid`

## Human Gates
- ✅ Stage 03 approval gate (Fork A: approve / loop back)
- ✅ Stage 05 disposition gate (Fork C: pass → store / fail → loop back)
- ✅ Store / log / write-back all human-gated

## Generation — Stage 04
- ✅ Page Object Model generation (page-object class + spec per ticket)
- ✅ POM discipline (no test logic in the page object; specs never use raw selectors)
- ✅ `test.fixme()` for BLOCKED cases
- ✅ Fork B: run-now or hold/shift-left for unmerged code
- ✅ Honest self-report of pass/fail

## Delete / Cleanup
- ✅ Single ticket, single stage
- ✅ Single ticket, all stages
- ✅ Single stage, all tickets
- ✅ All graduated (auto-skips in-flight tickets)
- ✅ Force incl. in-flight (requires exact phrasing)
- ✅ List-before-delete rule
- ✅ Graduation rule (safe only after Stage 05 + pushed to permanent home)
- ✅ Never touches `automation/playwright/`
- ✅ In-flight protection from bulk commands

## Config & Rules
- ✅ Per-product config files (`_config/<product>.md`)
- ✅ Standing behavior rules in `CLAUDE.md`
- ○ Auto-create output dirs without prompting — rule not yet in baseline (easy add)

## Multi-LLM / Portability
- ✅ `AGENTS.md` cross-tool operating manual
- ✅ Pointer files: `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`
- ✅ Model-agnostic (folders + markdown; tool choice picks the model)
- ✅ Model recommendations by ticket complexity

## Repo & Structure
- ✅ `automation/playwright/<product>/` buckets with `pages/` + `tests/{smoke,regression,e2e}/`
- ✅ Shared root Playwright config using per-product "projects"
- ✅ `.gitignore` excludes stage output; structure preserved via `.gitkeep`
- ◐ Single-repo baseline (logic + tests together). A logic-repo / artifacts-repo split is optional at scale.

## Cross-cutting
- ✅ Little-lift principle (ticket-only interface; no tool names surfaced)
- ✅ Ambiguity chain: Open Questions → BLOCKED → `test.fixme()` → consolidated audit
- 📐 Dedup check before store (referenced in Stage 05; engine not built)
- ✅ Audit-line output at disposition

---

## Roadmap (general goals)
- 📐 HTML run reports — see `extensions/html-output.md`
- 📐 Dedup engine — near-duplicate detection before store
- 📐 Multi-model LLM-as-Judge validation (a second model critiques the first)
- 📐 Smart smoke-suite management (`SMOKE-INDEX.md`, add/replace/deprecate scoring)
- 📐 Change-request flow through the pipeline
- 📐 Scale strategy — tag splitting → feature folders → per-product repos
- 📐 Fully-autonomous end state (built incrementally; gates lifted deliberately)
