# Extension: Adding products, rules, and overrides

Three ways to customize ICM's behavior without touching the core stage contracts.

## 1. Add a product / app

Copy `_config/EXAMPLE-PRODUCT.md` to `_config/<your-product>.md` and fill it in (base URL,
test accounts, known edge cases, backend checks). Then create the matching output bucket:

```
automation/playwright/<your-product>/
  pages/
  tests/{smoke,regression,e2e}/
```

Stage 01 classifies a ticket to a product by content, and later stages route output to that
product's bucket.

## 2. Add standing rules the agent must obey

Standing rules go in `CLAUDE.md` (and are mirrored tool-neutrally so `GEMINI.md` / Copilot
pick them up). Rules belong here — **not** inside a numbered stage — when they apply *across*
the pipeline rather than to one step. The Cleanup section is the model example: it's a
maintenance operation that spans stages, so it lives in `CLAUDE.md`, not in a stage folder.

Good candidates for standing rules: naming conventions, commit/branch discipline, what the
agent must never do, how to handle ambiguity.

## 3. Override selectors for one product

The shared selector standard lives in `_config/selectors.md` and applies everywhere. If a
single product genuinely needs a different rule (a legacy app with no `data-testid` support,
say), add the override in that product's config under a "Selector standard" heading and state
*why*. Keep overrides rare and justified — the whole point of the shared standard is
consistency.

## Rule of thumb

- Applies to one stage → edit that stage's `prompt.md`.
- Applies across the pipeline → `CLAUDE.md`.
- Applies to one product → `_config/<product>.md`.
- Applies to all products → `_config/selectors.md` or `AGENTS.md`.
