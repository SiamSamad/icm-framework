# Extension: HTML run reports  (SHIPPED)

**Status:** SHIPPED for all five stages. HTML reports are now defined directly in each stage's
`CONTEXT.md` plus the shared `_config/report-style.md`. **Remaining scope: none.** This file is
kept for history — it captures the original design questions that led to the shipped reports.

## Goal

Whenever the pipeline produces an artifact, also emit a **self-contained HTML report** — a
single file that a non-technical stakeholder can open in a browser and understand without
reading markdown or code.

## Open design questions (decide before building)

1. **Scope of a report** — one HTML per *stage output*, or one rolled-up HTML per *ticket run*
   (spec → cases → testability → generated tests → results all in one page)? A per-ticket
   run report is probably the more useful artifact.
2. **Where it's written** — alongside the stage output in `stages/*/output/`, or a dedicated
   `reports/` folder at the repo root?
3. **What it contains** — at minimum: ticket summary, acceptance criteria, test cases with
   pass/fail, the testability report (with any `data-testid` recommendations highlighted),
   and the Stage 04 run result. Possibly a small status banner (green/amber/red).
4. **How it's generated** — a template the agent fills, or a tiny build script the agent runs?
   A template keeps it tool-agnostic (no build dependency); a script is more powerful.
5. **Cleanup integration** — HTML reports are disposable output, so they should fall under the
   same Cleanup rules in `CLAUDE.md` (list before delete, never touch `automation/playwright/`).

## Intended integration point

A new instruction near the end of each stage's `CONTEXT.md` (or a standing rule in `CLAUDE.md`)
that says: after writing the stage's markdown output, also render the corresponding HTML
report to the agreed location.

> Build this together next: pick answers to the 5 questions above, then implement in this
> shell, validate on `inputs/EXAMPLE-TICKET.md`, and only then port to any product repo.
