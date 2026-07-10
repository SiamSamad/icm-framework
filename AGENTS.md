# AGENTS.md — ICM Framework Operating Manual

This is the cross-tool operating manual for this repo. Any coding agent — Claude Code,
Gemini CLI, Cursor, Copilot — reads this file to understand how to drive the pipeline.
Tool-specific pointer files (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`)
all defer to this document.

---

## What this repo is

**ICM (Interpretable Context Methodology)** is a folder-based orchestration layer for
turning a requirement (a ticket, a story, a spec) into a validated, automated test — with
a human in the loop at the points that matter.

The whole idea: instead of one opaque agent that decides its own order of operations, ICM
lays the work out as **numbered stage folders**, each a plain file with its own `prompt.md`.
Any AI tool can run any stage in isolation. Nothing is hidden, everything is inspectable,
and you keep judgment where you want it.

Core properties this design buys you:

- **Portability / no lock-in** — stages are just markdown and folders. Not bound to any one
  AI tool or vendor. Switch tools without rebuilding the system.
- **Auditability** — each stage is discrete and inspectable, with its own contract. You can
  read exactly what happened and re-run any single stage.
- **Human gates by design** — the pipeline can run fast, but judgment is inserted at
  specific decision points (test-case approval, disposition), not bolted on afterward.

The long-term goal *is* more autonomy — but built incrementally and intentionally, with the
gates staying until you decide to remove them, not big-bang.

---

## The pipeline (5 stages, no sub-stages)

| Stage | Folder | Job | Human gate? |
|-------|--------|-----|-------------|
| 1 | `stages/01-normalize` | Requirement → clean, structured spec | no |
| 2 | `stages/02-test-cases` | Spec → draft test cases + testability report | no |
| 3 | `stages/03-approve` | Present cases for approval before any code is written | **yes (Fork A)** |
| 4 | `stages/04-generate-tests` | Generate a working Page-Object test, run it (or hold/shift-left), self-report | optional |
| 5 | `stages/05-results` | Disposition: pass → store (gated); fail → report + loop back | **yes (Fork C)** |

Each stage folder contains a `prompt.md` (the contract for that stage) and an `output/`
folder (its working scratch output, gitignored).

**The validation run lives *inside* Stage 4** — generating a test and confirming it runs are
one job, not two stages. This keeps the five-stage identity intact.

---

## How to run a ticket through the pipeline

1. Drop your requirement into `inputs/` (see `inputs/_TICKET-TEMPLATE.md`). Any format works
   — Stage 01 normalizes it. A ticket ID or filename is enough to start.
2. Tell the agent: **"Run Stage 01 for inputs/YOUR-TICKET.md"**. It reads that stage's
   `prompt.md`, does the work, and writes to `stages/01-normalize/output/`.
3. Review the output. When it looks right, say **"Run Stage 02"** — and so on.
4. At **Stage 03** you approve or send it back to Stage 02 to revise.
5. At **Stage 05** you approve disposition (store the validated test, log it, or loop back
   to fix a failure).

You never have to name a tool or an MCP server to run the pipeline. A ticket reference is
the whole ask. (See "The little-lift principle" below.)

---

## Recommended models

- **Default:** a mid-tier model (e.g. Sonnet-class) for normalization, test cases, and
  generation.
- **Complex tickets** (ambiguous requirements, tricky flows, heavy edge cases): step up to a
  top-tier model (e.g. Opus-class) for Stages 01, 02, 04.
- **Trivial tickets:** a small/fast model (e.g. Haiku-class) is fine for Stage 01.

Because ICM is model-agnostic, the model is chosen by *which tool you point at the folder*,
not by any setting inside ICM.

---

## Adding a product / app config

Copy `_config/EXAMPLE-PRODUCT.md` to `_config/<your-product>.md` and fill in the base URL,
test accounts, known edge cases, and any product-specific rules. Every product config points
at the shared selector standard in `_config/selectors.md` rather than duplicating it.

The output folder buckets (`automation/playwright/<product>/`) mirror your product configs.

---

## Extending the framework

The baseline shell is deliberately minimal. Bolt-ons live in `extensions/`:

- **`extensions/adding-mcps.md`** — how to wire live tool integrations (ticket systems, wikis,
  code hosts, browser automation) into Stage 01 intake and Stage 04/05 write-back. The
  baseline pipeline runs on pasted/local inputs; MCPs are an opt-in upgrade.
- **`extensions/adding-rules.md`** — how to add product configs, custom selector overrides,
  and standing rules the agent must obey.
- **`extensions/html-output.md`** — extension point for rendering an HTML report per run
  (planned; design in progress).

---

## Roadmap (versioned, optional)

- **v2** — Multi-model LLM-as-Judge validation (a second model critiques the first's output).
- **v3** — CI triggers: run the pipeline on ticket status change; `@smoke` on every change,
  `@regression` nightly.
- **v4** — Test-management write-back (mark cases automated, link spec files, log runs).
- **v5** — HTML run reports (see `extensions/html-output.md`).
- **v6** — Mobile automation as a fully separate track.

Keep the MVP rule: get the full pipeline (01→05) working end-to-end before enriching any
single stage.
