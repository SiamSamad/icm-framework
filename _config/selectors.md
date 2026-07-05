# Selector Quality Standard

The authoritative rule for how tests locate UI elements. Every stage that reads or writes
selectors (Stage 02 testability, Stage 04 generation) obeys this. Product configs point here
instead of duplicating it.

## Preference order (most → least preferred)

1. **`data-testid`** *(preferred)* — most stable; immune to styling and copy changes. If a
   needed element lacks one, Stage 02 recommends adding it rather than working around it.
2. **Stable semantic `id`** — acceptable when it's clearly tied to the element's purpose and
   not auto-generated / framework-hashed.
3. **Role / label** via `getByRole` / `getByLabel` — good for accessible, semantic elements
   (buttons, inputs, links). Doubles as a light accessibility check.
4. **Structural CSS not tied to styling** — last resort, and only when it targets structure,
   never visual classes that change with design.
5. **Never XPath or brittle deep DOM chains** — forbidden. Breaks on any markup change.

## Principle

Tickets describe intent; code shows reality. Prefer selectors confirmed against real code or
a live page over ones guessed from a description. A missing selector is not a dead end — it's
a concrete `data-testid` recommendation back to the dev team.
