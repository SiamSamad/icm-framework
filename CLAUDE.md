# CLAUDE.md

Read `AGENTS.md` first — it's the operating manual for this repo and applies to every tool.
This file adds Claude-specific behavior on top of it.

---

## How to behave when running ICM

- **Run one stage at a time.** Do exactly what the current stage's `prompt.md` asks, write to
  that stage's `output/` folder, then stop and let the human review. Do not silently run the
  next stage.
- **Respect the gates.** Stage 03 (approval) and Stage 05 (disposition) are human decision
  points. Never skip past them or assume approval.
- **Surface ambiguity, don't invent it.** When a requirement is unclear, do not guess. Record
  it in an `## Open Questions` section in the spec, mark affected cases `BLOCKED` in the test
  cases, and use `test.fixme()` placeholders in generated specs. Consolidate open questions at
  the top of the Stage 05 audit output.
- **Read before you write.** Before generating tests, read the relevant `_config/<product>.md`
  and `_config/selectors.md`. Follow the selector precedence exactly.
- **Name outputs predictably.** `<TICKET-ID>-<artifact>.<ext>` — e.g.
  `EXAMPLE-1234-spec.md`, `EXAMPLE-1234-test-cases.md`, `EXAMPLE-1234.spec.ts`.
- **Review before commit.** Show the diff / new files and wait for confirmation before any
  `git commit`. Never commit directly to a protected branch.

## The little-lift principle

The person running the pipeline may not be technical. They should only ever need a ticket
reference to trigger a stage. **Do not surface tool names, MCP server names, or internal
plumbing in anything user-facing** (prompts, summaries, questions). Keep the interface a
ticket in, a reviewable artifact out.

---

## Cleanup

ICM generates working output files in `stages/*/output/` as tickets flow through the
pipeline. These are disposable scratch files — not the permanent home for any artifact. Use
the commands below to clean them up.

**Rules that always apply:**
- Before deleting anything, list the exact files that will be removed and wait for
  confirmation. Never delete silently.
- Cleanup only ever touches `stages/*/output/` folders. **Never touch `automation/playwright/`** — those
  files are permanent until explicitly extracted to their test repo.
- In-flight tickets (not yet through Stage 05) are protected from "clean all" commands unless
  you explicitly say so.

### Cleanup scopes

**Single ticket, single stage**
"Clean up EXAMPLE-1234 from Stage 02"
→ Removes only `stages/02-test-cases/output/<product>/EXAMPLE-1234-test-cases.md`

**Single ticket, all stages**
"Clean up all outputs for EXAMPLE-1234"
→ Removes that ticket's output file from every stage output folder it appears in.
→ List all files first, wait for confirmation before deleting.

**Single stage, all tickets**
"Clean up all of Stage 01's outputs"
→ Removes every file inside `stages/01-normalize/output/`.
→ List all files first, wait for confirmation before deleting.

**Everything graduated**
"Clean up the ICM" or "clear all"
→ Removes output files for tickets that have completed the full pipeline (through Stage 05).
→ In-flight tickets (not yet through Stage 05) are skipped automatically.
→ List all files that will be removed, wait for confirmation before deleting.

**Everything including in-flight (force)**
"Clean up the ICM — including in-progress tickets"
→ Same as "clean up the ICM" but also removes output files for tickets still mid-pipeline.
→ Requires this exact phrasing — a vague "clear all" will NOT touch in-flight tickets.
→ List all files first, wait for confirmation before deleting.

### Graduation rule

A ticket's output files are considered "graduated" (safe to clean) when:
- Stage 05 has completed for that ticket, AND
- The generated tests have been confirmed pushed to their permanent location
  (the `automation/playwright/` folder or a separate test repo).

Until both conditions are met, the ticket's outputs are treated as in-flight and protected
from bulk cleanup commands.
