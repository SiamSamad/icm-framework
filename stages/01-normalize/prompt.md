# Stage 01 — Normalize

**Job:** Turn a raw requirement into one clean, structured spec that every later stage can
trust.

**Input:** A file in `inputs/` (a ticket, story, or free-form requirement). Any format.
**Output:** `stages/01-normalize/output/<product>/<TICKET-ID>-spec.md`

---

## What to do

1. **Read the requirement.** Do not assume a format — extract the intent from whatever is
   there. The filename or ticket ID is enough to begin.

2. **Gather context (graceful degradation).** Pull from any sources that are available and
   record which you actually read. In the baseline, "sources" means whatever is present in
   `inputs/` and the repo. If live integrations are configured (see
   `extensions/adding-mcps.md`), the typical sources are:
   - the ticket / story itself
   - linked requirements or design docs
   - the code change / diff associated with the work (the gold standard — *tickets describe
     intent, code shows reality*)

   **If a source is unavailable, proceed with the others.** Never block on a missing source.

3. **Classify the product.** Decide which `_config/<product>.md` applies based on the
   *content* of the requirement, not a filename prefix. Read that config and
   `_config/selectors.md` before writing the spec.

4. **Write the spec** with these sections:
   - `## Summary` — one paragraph, plain language.
   - `## Acceptance Criteria` — a clean, numbered list.
   - `## In Scope / Out of Scope`
   - `## UI Surface` — screens/components involved; note any elements the tests will need to
     interact with.
   - `## Sources Read` — which sources were available and used, which were not.
   - `## Open Questions` — anything ambiguous. Do **not** invent answers. If there are none,
     say so explicitly.

---

## Rules

- Plain language over jargon. The spec is read by people who did not write the code.
- Ambiguity surfaces here, it is not resolved by guessing.
- Record provenance: a later reviewer should be able to see exactly what this spec was built
  from.
