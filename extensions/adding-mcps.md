# Extension: Adding live tool integrations (MCPs)

The baseline pipeline runs on **local/pasted inputs** — a requirement in `inputs/`, code in
the repo. That's intentional: the shell has zero vendor dependencies and works with any AI
tool out of the box.

When you want the pipeline to pull from live systems instead of pasted text, wire in tool
integrations (MCP servers, plugins, or scripts). This is an **opt-in upgrade**, not a
requirement. Nothing in the core stages assumes any specific tool exists.

---

## Where integrations plug in

| Stage | What a live integration adds |
|-------|------------------------------|
| **01 — Normalize** | Fetch the ticket, linked requirement docs, and the code diff directly from their source systems instead of pasting them. |
| **04 — Generate & Run** | Drive a real browser to confirm selectors against a live page; run the generated test against the target environment. |
| **05 — Disposition** | Write results back to a test-management system; file a bug on failure. |

## The golden rule: keep tool names out of the interface

The person running the pipeline should still only need a ticket reference. **MCP / tool names
never appear in user-facing prompts or output.** Put the plumbing here, in config, or in the
stage prompt's internals — not in what the user reads. (This is the "little-lift" principle
from `AGENTS.md`.)

## How to add one

1. Connect the integration in whatever AI tool you're using to drive ICM (Claude Code, Gemini
   CLI, Cursor, etc.). That's a tool-level setting, not an ICM file.
2. In the relevant stage's `prompt.md`, add an *internal* instruction describing what to fetch
   and from where — phrased as a capability ("read the linked requirements doc"), not a tool
   name.
3. Keep **graceful degradation**: if the integration is unavailable, the stage must still run
   on whatever local input exists. Record in the spec which sources were actually read.
4. Store any credentials in a gitignored `.env`. Never commit tokens, and never put secrets in
   a config or prompt file.

## Common integration types

- **Ticket / project tracking** — pull the ticket and its links (Stage 01).
- **Wiki / docs** — read linked requirements or BRDs (Stage 01).
- **Code host** — read the diff/MR; this is the highest-value source because code shows what
  the app actually does (Stage 01, and selector confirmation in Stage 04).
- **Browser automation** — grab selectors from a live page and execute tests (Stage 04).
- **Test management** — write back automated status and link specs (Stage 05).

Add each only when it earns its place. The pipeline is fully functional without any of them.
