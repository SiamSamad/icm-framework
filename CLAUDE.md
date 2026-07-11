# ICM Framework — Claude Instructions

This directory implements the **Interpretable Context Methodology (ICM)** pipeline for QA automation. Claude drives each stage by reading a lean CONTEXT.md stage contract, consulting shared reference modules in `_config/`, producing structured output, and handing off to the next stage.

## What This Is

ICM is a staged, auditable pipeline that converts tickets into executable Playwright tests. Every stage has an explicit input, a CONTEXT.md contract, and a written output — nothing is implicit or one-shot. A human approval gate sits between test case generation and test code generation.

## Products in Scope

One row per product config. Add a row (and a `_config/<key>.md` + `playwright/<key>/` bucket) for each app you test.

| Key | Product | Playwright Suite | Routing |
|-----|---------|-----------------|---------|
| `example-product` | Example app | `playwright/example-product/` | tier-based (default) or page-based — declared in its config |

## Promotion Target

Stage 05 promotes validated tests to their permanent home. Two supported modes (see `stages/05-results/CONTEXT.md`):
- **Same-repo (default):** this repo is scratch runner AND permanent home; promotion = branch + MR/PR into the integration branch.
- **External test repo:** a separate repo (conventionally cloned at `../automation`); set the path here or in the product config.

## Running the Pipeline

Work through stages in order. Do not skip stages. Each stage's output becomes the next stage's input.

### Stage 01 — Normalize

```
Input:  ticket via tracker integration (default), fetched by ticket ID
        inputs/<TICKET-ID>.md (fallback, if MCP unavailable or ticket not found)
Prompt: stages/01-normalize/CONTEXT.md
Output: stages/01-normalize/output/<TICKET-ID>/spec.md
        stages/01-normalize/output/<TICKET-ID>/report.html
```

Given a ticket ID, fetch it from tracker via the tracker integration first. Only fall back to `inputs/<TICKET-ID>.md` if the MCP is unavailable or the ticket can't be found there. Read the prompt, then read the ticket. Emit the normalized spec to the output directory. The spec must be YAML-fenced and follow the schema defined in the prompt.

### Stage 02 — Test Cases

```
Input:  stages/01-normalize/output/<TICKET-ID>/spec.md
        _config/<product>.md
Prompt: stages/02-test-cases/CONTEXT.md
Output: stages/02-test-cases/output/<TICKET-ID>/test-cases.md
        stages/02-test-cases/output/<TICKET-ID>/report.html
        stages/02-test-cases/output/<TICKET-ID>/dev-feedback.md  (only when selector gaps exist)
```

Generate numbered test cases. Each must include: ID, title, preconditions, steps, expected result, pass criterion, and fail criterion.

### Stage 03 — Human Approval

```
Input:  stages/02-test-cases/output/<TICKET-ID>/test-cases.md
Prompt: stages/03-approve/CONTEXT.md  (instructions for the reviewer)
Output: stages/03-approve/output/<TICKET-ID>/approved.md  (written by human)
```

**Claude does not run this stage.** Present the test cases to the human reviewer. Wait for approval before proceeding. The reviewer edits or approves the test case file and saves it to `stages/03-approve/output/<TICKET-ID>/`.

### Stage 04 — Generate and Run Tests

```
Input:  stages/03-approve/output/<TICKET-ID>/approved.md
        _config/<product>.md
Prompt: stages/04-generate-tests/CONTEXT.md
Output: playwright/{product}/tests/{category}/<TICKET-ID>.spec.ts        (TEMPORARY scratch — promoted to promotion target in Stage 05)
        playwright/{product}/pages/*.ts                                   (TEMPORARY scratch — promoted to promotion target in Stage 05)
        stages/04-generate-tests/output/<TICKET-ID>/report.html
        stages/04-generate-tests/output/<TICKET-ID>/summary.md
        stages/04-generate-tests/output/<TICKET-ID>/failed/TC-<n>.png    (one per failing test)
        stages/04-generate-tests/output/<TICKET-ID>/previous-run/        (prior run archived here; one kept)
```

Generate Playwright test files and run them in the local scratch runner. Tests written to `playwright/{product}/` are **temporary scratch files** — parked there only until proven green. The permanent home is the promotion target; promotion happens in Stage 05.

**All-green gate:** Stage 05 may only run for a ticket whose latest Stage 04 verdict is PASSED. If `stages/04-generate-tests/output/<TICKET-ID>/report.html` shows any failures, Stage 05 is blocked for that ticket until a re-run is clean.

### Stage 05 — Promote and Close

```
Input:  stages/04-generate-tests/output/<TICKET-ID>/summary.md   (Stage 04 verdict — must be PASSED)
        stages/04-generate-tests/output/<TICKET-ID>/report.html
        playwright/{product}/tests/{category}/<TICKET-ID>.spec.ts (parked validated tests)
        playwright/{product}/pages/*.ts                           (parked page objects)
        _config/<product>.md
Prompt: stages/05-results/CONTEXT.md
Output: stages/05-results/output/<TICKET-ID>/summary.md
        stages/05-results/output/<TICKET-ID>/report.html
        (promotion target: branch <TICKET-ID> pushed, MR opened to develop)
```

Promote validated tests to the promotion target. Stage 05 reads the Stage 04 verdict from `stages/04-generate-tests/output/<TICKET-ID>/summary.md` and refuses to run if it is not PASSED. Audits the promotion target for page object conflicts and duplicate tests, creates a branch off `develop`, copies validated files, commits, pushes, and opens a MR. Asks (never acts without yes) about TMS updates and ticket comments. Emits a promotion report to `stages/05-results/output/<TICKET-ID>/`.

## Directory Layout

```
AGENTS.md              ← model selection and agent role guide
CLAUDE.md              ← this file
inputs/                ← raw ticket markdown files
stages/
  01-normalize/
    CONTEXT.md
    output/            ← per-ticket subfolders created at runtime: output/<TICKET-ID>/
  02-test-cases/
    CONTEXT.md
    output/            ← output/<TICKET-ID>/
  03-approve/
    CONTEXT.md
    output/            ← output/<TICKET-ID>/ (human writes approval here)
  04-generate-tests/
    CONTEXT.md
    output/            ← output/<TICKET-ID>/ (reports only — generated tests go to playwright/, never here)
  05-results/
    CONTEXT.md
    output/            ← output/<TICKET-ID>/
_config/
  <product>.md         ← per-product config (URLs, test accounts, selectors, routing mode)
  selectors.md         ← selector quality standard, three-path testability strategy, data-testid naming
  report-style.md      ← HTML report conventions shared by all stages
  writing-rules.md     ← finding structure and prose standards shared by all stages
playwright/
  <product>/
    pages/             ← page object classes (generated by Stage 04)
    tests/
      smoke/           ← tier-based products: critical path smoke tests
      regression/      ← tier-based: regression guard tests
      e2e/             ← tier-based: full end-to-end flow tests
      <page-area>/     ← page-based products: one folder per page area (from the product config)
```

## Layer Architecture

ICM is organized in four layers. Each has a distinct role and must not be confused with the others.

| Layer | Files | Role |
|-------|-------|------|
| **Layer 1** — Identity & Routing | `CLAUDE.md`, `AGENTS.md` | Pipeline rules, stage routing, cleanup commands, model selection |
| **Layer 2** — Stage Contracts | `stages/*/CONTEXT.md` | Per-stage lean contracts: what to load, what gate must pass, what to produce |
| **Layer 3** — Shared Reference | `_config/` | Rules used by multiple stages: selector standard, report style, writing rules, product config |
| **Layer 4** — Working Artifacts | `stages/*/output/<TICKET-ID>/` | Per-ticket outputs produced at runtime — disposable scratch |

### Stage Contract Skeleton

Every `CONTEXT.md` follows this structure in the same order:

1. **INPUTS** — table of every file the stage loads: Layer 4 rows (previous stage output), Layer 3 rows (`_config/` modules that apply)
2. **GATE** — what must be true before the stage may run; `None` if no precondition
3. **PROCESS** — the stage's steps; shared reference material is replaced with one-line module pointers (e.g., "Apply the selector standard from `_config/selectors.md`")
4. **OUTPUTS** — exact files and paths produced (always per-ticket)
5. **VERIFY** — cross-stage consistency checks this stage performs; `None` if none
6. **QUALITY CHECKS** — pre-emit checklist

---

## Output Folder Convention

This is the single source of truth for where stage output lives. Every stage that emits output writes it to a folder named after the **ticket ID** — never the product:

```
stages/<NN-stage-name>/output/<TICKET-ID>/
```

1. **The `<TICKET-ID>/` folder is created at run time, only for a stage that actually runs.** Never pre-create a ticket folder under a stage that hasn't produced output yet.

2. **Filenames inside the folder are plain — no ticket-ID prefix.** The folder already identifies the ticket, so a prefix on the filename would be redundant.

   | Stage | Files |
   |-------|-------|
   | 01 — Normalize | `spec.md`, `report.html` |
   | 02 — Test Cases | `test-cases.md`, `report.html`, `dev-feedback.md` (only when selector gaps exist) |
   | 03 — Approve | `approved.md` |
   | 04 — Generate and Run Tests | `report.html`, `summary.md`; `failed/TC-<n>.png` (one per failing test); `previous-run/` (prior run archive) — never `.spec.ts` or page object files |
   | 05 — Promote and Close | `summary.md`, `report.html` |

   ```
   stages/01-normalize/output/PROJ-1234/spec.md
   stages/01-normalize/output/PROJ-1234/report.html
   stages/02-test-cases/output/PROJ-2345/test-cases.md
   ```

3. **Every HTML report is named `report.html`, and every stage's markdown output links to it as `./report.html`** (same folder) — never a ticket-prefixed report filename.

4. **Never dump files at the root of any `output/` folder.** If the ticket's folder does not exist yet, create it before writing the file.

5. **Generated Playwright test files and page objects are never written under `stages/*/output/`.** They belong in `playwright/{product}/pages/` and `playwright/{product}/tests/{category}/` (see below). A stage's `output/<TICKET-ID>/` folder is exclusively for human-readable stage artifacts (specs, test cases, reports, approvals, summaries) — never generated code.

6. **Playwright test files go under `playwright/{product}/tests/{category}/` and page objects under `playwright/{product}/pages/`.** For tier-based products, `{category}` is one of `smoke/`, `regression/`, `e2e/`. For page-based products, `{category}` is the page area the test covers, as defined in the product config. These files are **temporary scratch** — parked here until Stage 04 proves them green, then promoted to the promotion target in Stage 05.

   ```
   playwright/example-product/tests/e2e/PROJ-1234.spec.ts
   playwright/example-product/pages/ConfirmPage.ts
   playwright/other-product/tests/checkout/PROJ-2345.spec.ts
   playwright/other-product/pages/DetailPage.ts
   ```

---

## Key Rules

1. **Never skip Stage 03.** Human review is mandatory before tests are generated.
2. **Always include the product config** (`_config/<product>.md`) when prompting Stages 02 and 04.
3. **Stage output lives inside a per-ticket folder named after the ticket ID** (e.g., `stages/01-normalize/output/PROJ-1234/spec.md`); filenames inside it are plain since the folder already identifies the ticket. Generated Playwright test files remain ticket-named (e.g., `PROJ-1234.spec.ts`) since they live alongside other tickets' tests in the shared `playwright/` folders.
4. **Do not overwrite existing output files** — create versioned copies (e.g. `spec-v2.md`) inside the same ticket folder if re-running.
5. **Check AGENTS.md** before choosing a model — complex tickets warrant Opus.
6. **Never ask permission to create output directories.** If a stage's per-ticket output folder does not exist (e.g. `stages/01-normalize/output/PROJ-1234/`), create it automatically and proceed. Do not prompt for confirmation.
7. **Stage 05 is gated on Stage 04's latest verdict.** Stage 05 may only run for a ticket whose most recent Stage 04 run ended with PASSED. Before entering Stage 05 for any ticket, check `stages/04-generate-tests/output/<TICKET-ID>/report.html` — if it shows failures, refuse Stage 05 and direct the user to fix and re-run Stage 04 first.
8. **Proceed / Continue shortcuts.** When the user says "proceed", "continue", "next", or "next stage" after a stage completes, automatically run the next stage in sequence for the current ticket — no need to call out stage numbers explicitly. Exception: Stage 03 always requires an explicit approval statement before writing the approval file. When Stage 02 is done and the user proceeds, ask: "Do you approve these test cases? If yes, say I approve and I will write the approval file and lock them in." If it is unclear which ticket or stage is next, ask before proceeding.

---

## Branch Model

- **`main` = stable; `develop` = integration.**
- **Feature branches are cut from `develop` and merge into `develop` only.**
- **NEVER merge a feature branch directly into `main`.** `main` only ever receives merges from `develop`.
- **Stage 05 promotions (same-repo mode) target `develop`**, per `stages/05-results/CONTEXT.md`.
- **If the user ever instructs a direct feature→`main` merge, stop and remind them of this rule first.** Proceed only if they explicitly confirm after the reminder.

---

## Cleanup

ICM generates working output files in `stages/*/output/` as tickets flow through the pipeline. These are disposable scratch files — not the permanent home for any artifact. Use the commands below to clean them up.

**Rules that always apply:**
- Before deleting anything, list the exact files that will be removed and wait for confirmation. Never delete silently.
- **Scope question (single-ticket cleanup).** When asked to clean up a specific ticket (e.g., "clean up PROJ-1234"), ask which scope before listing anything:
  1. Stage outputs only — the ticket's folders under `stages/*/output/<TICKET-ID>/`
  2. Playwright scratch only — the ticket's parked test artifacts (see Playwright Scratch below)
  3. Both
  After the scope answer, list everything that will be deleted, wait for explicit confirmation, then delete.
- **Shared-file rule (page objects).** Before deleting any page object from `playwright/{product}/pages/`, scan every other parked spec under `playwright/{product}/tests/` for imports of that file. If no other spec imports it: safe to delete — include it in the deletion list. If any other spec imports it: keep it and name who still uses it, e.g. `"Keeping ItemListPage.ts — still imported by PROJ-6001.spec.ts"`. Spec files are always ticket-owned and safe to delete; only page objects require this check.
- For bulk cleanup commands ("clean up the ICM", "clear all"), in-flight tickets are skipped automatically — their `playwright/` files are never touched in bulk.
- In-flight tickets (not yet through Stage 05) are protected from "clean all" commands unless you explicitly say so.

---

### Playwright Scratch Artifacts

When scope includes Playwright scratch (scope 2 or 3), the candidates for deletion for the given ticket are:

- Spec file(s): `playwright/<product>/tests/**/<TICKET-ID>.spec.ts` (including `_unsorted/` if applicable)
- Local test-results artifacts: any folder under `playwright/<product>/test-results/` whose name contains `<TICKET-ID>`, if present
- Page objects imported by the ticket's spec — **subject to the Shared-File Rule above**

---

### Cleanup Scopes

**Single ticket, single stage**
"Clean up PROJ-2345 from Stage 02"
→ Removes the whole folder `stages/02-test-cases/output/PROJ-2345/` (and everything inside it — `test-cases.md`, `report.html`, `dev-feedback.md` if present).
→ No scope question — the stage-only target is already explicit.

**Single ticket (all stages and/or Playwright scratch)**
"Clean up PROJ-1234" or "Clean up all outputs for PROJ-2345"
→ Ask which scope first (see Scope Question rule above).
→ After the scope answer, list all files/folders that will be removed — including any "Keeping X — still imported by Y" notes for shared page objects — then wait for confirmation.

Example listing (scope: Both):
> **Stage outputs to delete:**
> - `stages/01-normalize/output/PROJ-1234/`
> - `stages/02-test-cases/output/PROJ-1234/`
> - `stages/03-approve/output/PROJ-1234/`
> - `stages/04-generate-tests/output/PROJ-1234/`
>
> **Playwright scratch to delete:**
> - `playwright/example-product/tests/checkout/PROJ-1234.spec.ts`
> - `playwright/example-product/pages/ItemViewPage.ts` *(not imported by any other parked spec)*
> - `playwright/example-product/pages/AuditTabPage.ts` *(not imported by any other parked spec)*
>
> **Keeping (shared page objects):**
> - Keeping `ItemListPage.ts` — still imported by `PROJ-6001.spec.ts`

**Single stage, all tickets**
"Clean up all of Stage 01's outputs"
→ Removes every ticket folder inside `stages/01-normalize/output/`.
→ List all folders first, wait for confirmation before deleting.

**Everything graduated**
"Clean up the ICM" or "clear all"
→ Removes each ticket's output folder from every stage, for tickets that have completed the full pipeline (through Stage 05).
→ In-flight tickets (not yet through Stage 05) are skipped automatically.
→ List all folders that will be removed, wait for confirmation before deleting.

**Everything including in-flight (force)**
"Clean up the ICM — including in-progress tickets"
→ Same as "clean up the ICM" but also removes ticket output folders for tickets still mid-pipeline.
→ Requires this exact phrasing — a vague "clear all" will NOT touch in-flight tickets.
→ List all folders first, wait for confirmation before deleting.

---

### Graduation Rule

A ticket's output files are considered "graduated" (safe to clean) when:
- Stage 05 has run for that ticket (MR created), AND
- I have confirmed the MR merged.

Until both are confirmed, the ticket is in-flight and protected from bulk cleanup commands. For graduated tickets, the scope question still applies — the user chooses stage outputs only, Playwright scratch only, or both. Playwright scratch deletion follows the Shared-File Rule above: spec files are always safe to delete; page objects are only deleted when no other parked spec imports them.
