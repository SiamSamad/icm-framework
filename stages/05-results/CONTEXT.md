# Stage 05 — Promote and Close

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/04-generate-tests/output/<TICKET-ID>/summary.md` | Stage 04 verdict — must be PASSED |
| Layer 4 | `stages/04-generate-tests/output/<TICKET-ID>/report.html` | Stage 04 run report |
| Layer 4 | `playwright/{product}/tests/{category}/{TICKET-ID}.spec.ts` | Validated spec to promote |
| Layer 4 | `playwright/{product}/pages/*.ts` | Page objects to promote |
| Layer 3 | `_config/<product>.md` | Product config |
| Layer 3 | `_config/report-style.md` | HTML report conventions |

---

## GATE

**Hard requirement — no override.**

1. Read `stages/04-generate-tests/output/<TICKET-ID>/summary.md`.

   - If the file does not exist:
     > **Refused.** No Stage 04 output found for \<TICKET-ID\>. Run Stage 04 first.
     Stop here.

   - If the verdict is anything other than `PASSED`:
     > **Refused.** Stage 04 verdict for \<TICKET-ID\> is \<verdict\>. Stage 05 is blocked until all tests pass. Fix the failing tests and re-run Stage 04. See: `stages/04-generate-tests/output/<TICKET-ID>/report.html`
     Stop here.

2. Once the gate passes, read the product config from `_config/<product>.md`. Use the `product` field from the approved test cases or spec — never inferred from the ticket ID prefix.

---

## PROCESS

### Role

You are a QA Lead. Your job is to take a ticket whose Playwright tests have all passed Stage 04 validation and dispose of it properly: promote the validated tests to their permanent home, handle record-keeping, and write the Stage 05 output.

### Promotion Target — two supported modes

Check the product config (or `CLAUDE.md`) for a **Promotion Target** setting:

- **External test repo** — validated tests are promoted to a separate repo cloned locally (conventionally a sibling of this repo, e.g. `../automation`). All audit and promotion steps below run against that repo.
- **Same-repo (default for this baseline)** — this repo is both the scratch runner and the permanent home. "Promotion" means: branch off the integration branch, and the audit runs against the integration branch's version of `playwright/` rather than a second repo. Everything else (audit, duplicate check, branch, MR/PR, human merges) is identical.

If no setting exists and no `../automation` sibling is found, assume same-repo mode and say so.

### STEP 1 — AUDIT THE PROMOTION TARGET

**External-repo mode:** locate the test repo (look for `../automation` first; if not found, ask for the path), then pull latest:
```
cd <test-repo>
git checkout develop
git pull origin develop
```

**Same-repo mode:** fetch and compare against the integration branch (`develop` or `main`) of this repo.

#### Page object audit

For each page object imported by this ticket's spec file:

1. Check whether a file with the same name exists in `playwright/{product}/pages/` in the promotion target.
2. **No match** — the page object is new. Mark it for copy in STEP 2.
3. **Match exists** — compare our ICM version against the promotion target version:
   - If the promotion target version already has all the locators and methods our tests need: **reuse it as-is**. Do not overwrite.
   - If our version adds locators or methods not present in the promotion target version: **merge only the additions** into the promotion target file. Do not overwrite unrelated content.
4. Record the outcome per file (`created` / `reused as-is` / `merged N additions`) — you will include this in the Stage 05 report.

#### Duplicate test check

Scan the target tests folder in the promotion target (the same folder the spec would land in):

1. List every existing `.spec.ts` file in that folder.
2. If any file looks like it covers the same page/flow as this ticket's tests (same page + same behaviors), **stop**. Show the user both files (or the relevant sections), then ask:
   > "This ticket's tests may overlap with `<existing-file>`. Proceed (append), replace the existing file, or skip promotion?"
   Wait for an explicit answer before continuing.
3. If no overlap, proceed.

#### Folder audit

Confirm the target folder exists in the promotion target. Create it if missing. The structure is:

| Product | Target folder |
|---------|--------------|
| Page-based products | `playwright/{product}/tests/{page-area}/` — page areas from the product config |
| Tier-based products (default) | `playwright/{product}/tests/{smoke\|regression\|e2e}/` |

#### `_unsorted/` blocker

If the Stage 04 page-folder announcement placed the spec in `playwright/{product}/tests/_unsorted/`, **stop**. Ask:
> "The spec is in `_unsorted/` — which page area folder should it be promoted to?" (list the page areas from the product config)

Move the spec to the correct folder in the ICM scratch runner before promoting. `_unsorted/` must never be promoted to the promotion target.

---

### STEP 2 — PROMOTE

Once the audit is complete and no blockers remain:

**1. Create a branch in the promotion target:**
```
git checkout develop
git checkout -b <TICKET-ID>
```

**2. Copy the validated files** — exactly what this ticket's tests need, nothing else:
- Spec file → `playwright/{product}/tests/{category}/{TICKET-ID}.spec.ts`
- New page object files → `playwright/{product}/pages/` (only for page objects marked `created` in the audit; merged additions are written directly into existing files in place)

**Never copy:** `.env`, auth session files (anything under `auth/` that stores a session), `test-results/`, `playwright-report/`, `node_modules/`, or any ICM stage output files.

**3. Commit:**
```
git add playwright/
git commit -m "test: <TICKET-ID> — <short description of what the tests cover>"
```

**4. Push:**
```
git push -u origin <TICKET-ID>
```

**5. Create the MR** via the code-host integration:
- Source branch: `<TICKET-ID>`
- Target branch: `develop`
- Title: `test: <TICKET-ID> validated Playwright tests`
- Description: list the test cases covered (TC numbers and titles), note that they passed Stage 04 validation on `<date from Stage 04 summary>` with `<N>` tests passing, and include the Stage 04 report path.
- Give the MR URL in the conversation. **I merge in the web UI — do not merge programmatically.**

---

### STEP 3 — RECORD-KEEPING (ask first, never act without yes)

After the MR is created, ask me two separate yes/no questions. Do not bundle them.

**a. TMS:**
> "Update TMS for this ticket now?"

- If yes: tell me it is not implemented yet. Record outcome as `TMS: not yet implemented`.
- If no: record outcome as `TMS: skipped`.

**b. Tracker:**
> "Post the summary comment to the ticket now?"

- If yes: use the tracker integration to post a comment on the ticket with: test cases covered (TC numbers + titles), pass count, MR URL, and date. Record outcome as `Tracker: posted`.
- If no: record outcome as `Tracker: skipped`.

---

### STEP 4 — OUTPUT

Write two files to `stages/05-results/output/<TICKET-ID>/` (create the folder if it does not exist).

#### `summary.md`

```markdown
🌐 **HTML Report:** [Open Report](./report.html)

# Promotion Summary — <TICKET-ID>
**Promotion Date:** YYYY-MM-DD
**Product:** <product>
**Stage 04 Verdict:** PASSED (<N> tests, <run date>)

---

## Promoted Files

| File | Destination | Action |
|------|-------------|--------|
| <TICKET-ID>.spec.ts | playwright/{product}/tests/{category}/ | created |
| <PageName>Page.ts | playwright/{product}/pages/ | created / reused / merged N additions |

## Promotion MR

<MR URL> — branch `<TICKET-ID>` → `develop`

## Page Object Audit

<outcome for each page object: reused as-is / merged N additions / created new>

## Duplicate Check

<no overlaps found — OR — overlap with <file>: user chose proceed / replace / skip>

## Record-keeping

- TMS: <not yet implemented / skipped>
- Tracker: <posted / skipped>

## Stage 04 Reference

Verdict: PASSED | <N> tests | Run date: <date>
Report: stages/04-generate-tests/output/<TICKET-ID>/report.html
```

#### `report.html`

Follow `_config/report-style.md` for HTML conventions (pure HTML + inline CSS, zero external dependencies, status colors, code chip styling).

**Header:** Ticket ID (large, bold), product badge, promotion date, Stage 04 verdict badge (green `PASSED`), pass count.

**Promoted Files section:** table of file, destination path, action (created / reused as-is / merged N additions).

**Promotion MR section:** MR URL as a link, source branch, target branch.

**Page Object Audit section:** table of page object name, action, detail (e.g., "merged: added `getItemCount()` and `getStatusText()`").

**Duplicate Check section:** result (no overlaps found — or overlap detail + user decision).

**Record-keeping section:** TMS outcome, tracker outcome.

**Stage 04 Reference section:** verdict badge, pass count, run date, link to `stages/04-generate-tests/output/<TICKET-ID>/report.html`.

**Call-to-action box at the bottom:**
- Title: `🎉 Stage 05 Complete — <TICKET-ID>`
- Body: MR URL, promoted files, record-keeping outcomes.
- Subtext (grey): "Would you like me to clean up the ICM output files for <TICKET-ID>? Reply **yes** to see the file list, or **skip** to leave the files in place."

After saving both files, print in the conversation:
```
📂 Report ready: stages/05-results/output/<TICKET-ID>/report.html
```

---

### STEP 5 — HANDOFF MESSAGE

End with this message:

```
🎉 Stage 05 complete for <TICKET-ID>.

📄 Summary: stages/05-results/output/<TICKET-ID>/summary.md
🌐 HTML Report: stages/05-results/output/<TICKET-ID>/report.html

✅ Tests promoted — MR open: <MR URL>  (branch <TICKET-ID> → develop)
<✅ / ⏭️> TMS: <not yet implemented / skipped>
<✅ / ⏭️> Tracker: <posted / skipped>

---
🗂️ Would you like me to clean up the ICM output files for <TICKET-ID>?

I'll show you the full list of files before deleting anything — nothing gets removed
without your confirmation.

Reply **yes** to see the file list, or **skip** to leave the files in place.
```

### Cleanup

The standard ICM cleanup command behaviors apply — list-first, explicit confirm before any deletion, never touch the promotion target. For the full scope question, Playwright scratch definition, shared-file rule for page objects, and example flows, see the **Cleanup** section in `CLAUDE.md`.

**Updated graduation definition.** A ticket is graduated (ICM outputs safe to clean) when:
- Stage 05 has run for the ticket (MR created), **AND**
- I have confirmed the MR merged.

Until both are confirmed, the ticket is in-flight. When cleanup is requested for a graduated ticket, apply the scope question and shared-file rule from `CLAUDE.md`. Graduated cleanup (scope: Both) removes:
- `stages/*/output/<TICKET-ID>/` folders across all stages
- The ticket's Playwright scratch artifacts: spec file(s), test-results entries for this ticket, and page objects that pass the shared-file check (no other parked spec imports them)

---

## OUTPUTS

| File | Path |
|------|------|
| Promotion summary | `stages/05-results/output/<TICKET-ID>/summary.md` |
| HTML report | `stages/05-results/output/<TICKET-ID>/report.html` |

---

## VERIFY

- Stage 04 verdict confirmed PASSED from `summary.md` — this check is the GATE above.
- promotion target audited for page object conflicts (created / reused as-is / merged) and duplicate tests before any files are copied.
- `_unsorted/` resolved to a real page folder before promotion.
- MR confirmed created before asking record-keeping questions.

---

## QUALITY CHECKS

- Stage 04 verdict was `PASSED` — confirmed before any action.
- Product was read from approved test cases or spec, never inferred from ticket ID prefix.
- Only files belonging to this ticket were copied to the promotion target — no `.env`, session files, or ICM stage output.
- Record-keeping (TMS, tracker) was asked separately, not bundled, and not acted on without explicit yes.
- Promotion summary reflects the actual audit outcomes (created / reused / merged) accurately.
