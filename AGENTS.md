# ICM Agent Configuration

## Model Selection

| Stage | Default Model | Override | Reason |
|-------|--------------|----------|--------|
| 01-normalize | a mid-tier model (e.g. Sonnet-class) | a top-tier model (e.g. Opus-class) for ambiguous tickets | Structured extraction; top-tier when ticket has missing context or contradictory ACs |
| 02-test-cases | a mid-tier model (e.g. Sonnet-class) | a top-tier model (e.g. Opus-class) for complex flows | The mid-tier default handles straightforward happy/sad path generation; use a top-tier model for multi-system or regression-heavy tickets |
| 03-approve | — | — | Human gate — no model runs here |
| 04-generate-tests | a mid-tier model (e.g. Sonnet-class) | a top-tier model (e.g. Opus-class) for multi-page flows | Playwright codegen is mechanical; top-tier when test requires complex selectors, auth flows, or cross-product interaction |
| 05-results | a mid-tier model (e.g. Sonnet-class) | — | Summarization only |

## When to Escalate to a Top-Tier Model

Escalate from the mid-tier default to a top-tier model when any of the following are true:

- The ticket has **fewer than 3 acceptance criteria** and the feature is non-trivial
- The ticket touches **two or more products** (e.g., a cross-product handoff)
- The normalized spec from Stage 01 contains the flag `ambiguity: high`
- The test case set from Stage 02 contains **more than 8 distinct scenarios**
- A previous run produced Playwright tests that **failed to compile or threw selector errors**

## Agent Roles by Stage

### Stage 01 — Normalizer
- Role: QA Analyst
- Task: Read raw ticket text and emit a structured YAML/Markdown spec
- Persona: Precise, conservative — never infers intent; flags gaps explicitly

### Stage 02 — Test Case Author
- Role: Senior QA Engineer
- Task: Expand the normalized spec into a numbered test case list with preconditions, steps, and pass/fail criteria
- Persona: Thorough, edge-case aware; considers mobile vs. desktop, logged-in vs. guest, enabled vs. denied permissions

### Stage 04 — Playwright Coder
- Role: Automation Engineer
- Task: Translate approved test cases into executable Playwright `.spec.ts` files targeting the correct product config
- Persona: Writes minimal, readable tests; no dead code; respects the selector conventions in `_config/`

### Stage 05 — Results Analyst
- Role: QA Lead
- Task: Parse test run output, tally pass/fail, identify TMS test IDs that need status updates, and flag blockers
- Persona: Concise reporter; surfaces actionable items only

## Passing Context Between Stages

Each stage reads from the previous stage's `output/` directory. The pipeline is:

```
inputs/TICKET.md  (or ticket fetched via tracker integration)
  → stages/01-normalize/output/<TICKET-ID>/spec.md
  → stages/02-test-cases/output/<TICKET-ID>/test-cases.md
  → stages/03-approve/output/<TICKET-ID>/approved.md   [human gate]
  → playwright/<product>/… (scratch) + stages/04-generate-tests/output/<TICKET-ID>/ (run report)
  → stages/05-results/output/<TICKET-ID>/summary.md    [promotion, human gates]
```

Always pass the relevant `_config/<product>.md` file alongside the ticket context so the model knows which base URL, auth flow, and selector patterns to use.
