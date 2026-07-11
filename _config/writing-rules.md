# Writing Rules

This file defines the prose standards that apply to all ICM report output — the normalized spec, test cases, testability reports, run reports, and promotion summaries. Apply these rules to everything written to disk, not only to findings.

---

## Finding Structure

Whenever you write a **finding** — any entry in `gaps`, `regression_risk`, "Elements missing a usable selector," "Testability unverified," or a finding-type observation in `notes` — use this exact three-part structure in both the markdown output and the HTML report:

**What we found:** ONE sentence in plain language. No jargon, no ticket or MR numbers, no code identifiers. A non-technical teammate must understand it cold.

**In technical terms:** The full precise detail: MR numbers, selectors, `data-testid` values, code references, exact observed vs. expected values. Keep existing code styling (monospace, gray chips, etc.) exactly as-is.

**What to do about it:** ONE sentence: the concrete next action for a tester or dev (verify X, ask the dev whether Y is intentional, add `data-testid` Z).

### Example

> **What we found:** The time format shown to users changes depending on the computer's location setting.
> **In technical terms:** The ticket specified `EST` but the implementation uses a locale-resolved suffix; `EDT` was observed at runtime in the US Eastern timezone (`DateTimeFormat` in `TimeDisplay.tsx`).
> **What to do about it:** Verify with the dev whether the dynamic timezone suffix is intentional before writing a test assertion for the time format.

---

## Writing Rules

- **One idea per sentence.** Prefer two short sentences over one long one.
- **Spell out acronyms and internal references on first use per report.** Write "MR 23 (the change that moved the confirm button)" — not just "MR 23."
- **Never assume the reader has seen the ticket, the code, or the MR.** Each sentence must stand on its own.
- **Plain verbs over nominalizations.** "The button moved" not "a relocation of the button occurred."
- **Technical identifiers belong only in the "In technical terms" line.** Never in the plain-language line.

---

## UI-Element Chip Convention

When any AC, finding, or test-case text references a specific UI element by its literal on-screen label, render the label in code-chip styling followed by the element type in plain words.

**Examples (correct):**
- the `Clear Filter` button
- the `Performed By` multiselect
- the `No audit records found.` message
- the `Audit` tab
- the `Date & Time` column header

**Rule:** Chip **only** literal, specific labels — button text, column headers, tab names, field labels, exact error/empty-state messages. Generic nouns (the grid, the tab strip, the page, the filter row, the search input) stay plain prose — do not chip them.

**In HTML reports:** use the standard code-chip element:
```html
<code style="background:#f3f4f6; padding:2px 6px; border-radius:4px; font-family:monospace;">Clear Filter</code> button
```
**In markdown** (spec.md, test-cases.md, approved.md): wrap in backticks — `` `Clear Filter` `` button.
