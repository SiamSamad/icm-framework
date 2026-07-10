# ICM Framework

A reusable, tool-agnostic starter for turning requirements into validated automated tests —
with a human in the loop where it counts.

**ICM (Interpretable Context Methodology)** lays QA automation out as numbered stage folders
instead of one opaque agent. Any AI coding tool — Claude Code, Gemini CLI, Cursor, Copilot —
can drive it, because every stage is just a markdown contract and a folder. Nothing hidden,
everything inspectable, judgment kept where you want it.

This repo is the **clean baseline**: no product-, company-, or tool-specific wiring. Clone it,
point an AI coding tool at it, and start building. Add live integrations and product configs
as you need them.

---

## The pipeline

```
inputs/  →  01 Normalize  →  02 Test Cases  →  [03 Approve]  →  04 Generate & Run  →  [05 Disposition]
             spec.md          cases +           HUMAN GATE       POM test + run        HUMAN GATE
                              testability                                              store / loop back
```

| Stage | Does | Gate |
|-------|------|------|
| 01 Normalize | requirement → clean spec (multi-source, graceful degradation) | — |
| 02 Test Cases | spec → draft cases **+ testability report** (flags missing selectors, recommends `data-testid`) | — |
| 03 Approve | present cases; approve or loop back | **human** |
| 04 Generate & Run | generate Page-Object test, run it (or hold/shift-left), self-report | optional |
| 05 Disposition | pass → store (gated) + dedup; fail → report + loop back | **human** |

The validation run lives *inside* Stage 04 — "is this test any good?" is separate from your
app's regression run.

---

## Quickstart

1. **Get it locally** and push to your own repo:
   ```bash
   # after downloading/unzipping, from inside the folder:
   git init
   git add -A
   git commit -m "chore: initial ICM baseline"
   git branch -M main
   git remote add origin <your-empty-repo-url>
   git push -u origin main
   ```
   Create the remote repo empty (no README/.gitignore/license) so nothing conflicts.

2. **Run a ticket.** Open the folder in your AI coding tool and say:
   ```
   Run Stage 01 for inputs/EXAMPLE-TICKET.md
   ```
   Review the output, then continue stage by stage. You approve at Stage 03 and Stage 05.

3. **Add your app.** Copy `_config/EXAMPLE-PRODUCT.md` → `_config/<your-product>.md`, and add
   a matching `automation/playwright/<your-product>/` bucket.

4. **(Optional) Install Playwright** to actually run generated tests:
   ```bash
   cd automation/playwright && npm install && npx playwright install
   ```

---

## Layout

```
AGENTS.md                  Operating manual — read this first (all tools obey it)
CLAUDE.md                  Claude behavior + Cleanup rules
GEMINI.md                  Gemini pointer → AGENTS.md
.github/copilot-instructions.md   Copilot pointer → AGENTS.md
inputs/                    Drop requirements here (template + worked example)
stages/                    01→05, each with a prompt.md contract and a gitignored output/
_config/                   selectors.md (shared standard) + per-product configs
extensions/                Opt-in bolt-ons (adding MCPs, rules, HTML output)
automation/playwright/     Test project: one shared config, per-product buckets
```

## Extending

Everything optional lives in `extensions/`:
- **`adding-mcps.md`** — wire live tool integrations into intake / run / write-back.
- **`adding-rules.md`** — add products, standing rules, selector overrides.
- **`html-output.md`** — planned HTML run reports (design + integration point).

## Why folders instead of one agent

- **Portable** — markdown + folders, not bound to any AI tool or vendor.
- **Auditable** — every stage is discrete, inspectable, and re-runnable in isolation.
- **Gated by design** — fast when you want it, with human judgment at the decision points.

The long game is more autonomy — added incrementally, with the gates staying until you choose
to lift them.

---

Methodology roots: Jake Van Clief's ICM approach.
