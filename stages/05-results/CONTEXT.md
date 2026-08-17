# Stage 05 — Promote and Close

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/04-generate-tests/output/<TICKET-ID>/summary.md` | Stage 04 verdict — must be PASSED |
| Layer 4 | `stages/04-generate-tests/output/<TICKET-ID>/report.html` | Stage 04 run report |
| Layer 4 | `playwright/web/{product}/tests/{category}/{TICKET-ID}.spec.ts` | Validated spec to promote |
| Layer 4 | `playwright/web/{product}/pages/*.ts` | Page objects to promote |
| Layer 4 | `playwright/api/tests/{service}/*.spec.ts` | API specs to promote |
| Layer 4 | `playwright/api/config/*.ts` | Env modules to promote |
| Layer 3 | `_config/<product>.md` | Product config |
| Layer 3 | `_config/api-test-generation.md` | API promotions — env module protocol and routing this stage must preserve |
| Layer 3 | `_config/source-freshness.md` | Live-TMT services — context for the removal check |
| Layer 3 | `_config/case-register.md` | **No vendor TMT only** — the Automated flip at record-keeping |
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

1. Check whether a file with the same name exists in `playwright/web/{product}/pages/` in the promotion target.
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
| Page-based products | `playwright/web/{product}/tests/{page-area}/` — page areas from the product config |
| Tier-based products (default) | `playwright/web/{product}/tests/{smoke\|regression\|e2e}/` |

#### `_unsorted/` blocker

If the Stage 04 page-folder announcement placed the spec in `playwright/web/{product}/tests/_unsorted/`, **stop**. Ask:
> "The spec is in `_unsorted/` — which page area folder should it be promoted to?" (list the page areas from the product config)

Move the spec to the correct folder in the ICM scratch runner before promoting. `_unsorted/` must never be promoted to the promotion target.

---

### STEP 2 — PROMOTE

Once the audit is complete and no blockers remain:

**1. Create or reuse the branch in the promotion target.**

A re-promotion is normal — a ticket returns here whenever its tests are regenerated — and `git checkout -b` fails outright when the branch already exists. Check first:

```
git fetch origin
git branch --list <TICKET-ID>
git ls-remote --heads origin <TICKET-ID>
```

**Neither exists — create it fresh:**
```
git checkout develop
git checkout -b <TICKET-ID>
```

**It exists locally, on origin, or both — reuse it.** Never delete and recreate it, and never create a suffixed variant (`<TICKET-ID>-2`, `<TICKET-ID>-v2`): a second branch for one ticket splits the review across two MRs, and neither one shows the whole change.

- **Report before changing anything** — that the branch exists, where, whether an MR is open for it, and what that MR currently contains (number, title, state, and the tests it already carries).
- **Check out and bring it up to date with the integration branch:**
  ```
  git checkout <TICKET-ID>
  git pull origin <TICKET-ID>        # only if it exists on origin
  git rebase origin/develop          # or: git merge origin/develop
  ```
  Rebase while the branch is unreviewed; **merge once review comments exist**, so the review history is not rewritten out from under the reviewer. **If the rebase or merge conflicts, stop and report the conflicting files.** Never resolve a conflict in the promotion target silently.
- Then continue with the steps below. The new commit lands on top of the existing branch, and the push updates any open MR rather than opening a second one.

**2. Copy the validated files** — exactly what this ticket's tests need, nothing else:
- Spec file → `playwright/web/{product}/tests/{category}/{TICKET-ID}.spec.ts`
- New page object files → `playwright/web/{product}/pages/` (only for page objects marked `created` in the audit; merged additions are written directly into existing files in place)

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

**5. Create the MR** via the code-host integration.

**If an MR is already open for this branch, do not create a second one.** The push in step 4 has already updated it. Report its number and URL instead, and state that it now carries an additional commit and what changed in it. If the existing MR was merged or closed, say so and open a new MR from the same branch.

Otherwise:
- Source branch: `<TICKET-ID>`
- Target branch: `develop`
- Title: `test: <TICKET-ID> validated Playwright tests`
- Description: list the test cases covered (TC numbers and titles), note that they passed Stage 04 validation on `<date from Stage 04 summary>` with `<N>` tests passing, and include the Stage 04 report path.
- Give the MR URL in the conversation. **I merge in the web UI — do not merge programmatically.**

---

### API Promotion

Applies when the promoted artifacts are API tests under `playwright/api/`. The branch handling, record-keeping, and output steps are unchanged; what differs is the audit, the file semantics, and the env modules.

#### Dedup decisions — what each one does on disk

Scan `playwright/api/tests/{service}/` in the promotion target for near-duplicate tests using the same overlap detection as Stage 02. Report every match — test name, file, overlap type (Full / Partial). Do not auto-skip any match. Wait for an explicit decision before continuing.

The question is meaningless unless the answer maps to a definite file operation:

| Decision | Effect |
|----------|--------|
| **REPLACE** | Overwrite the existing spec file wholesale. **This is the correct default for a regenerated service** — Stage 04 emits the complete file every run, so the new file does not extend the old one, it supersedes it. |
| **SKIP** | Do not copy that file at all. The existing file stays untouched. Record it in the disposition report as not promoted, with the reason. |
| **PROCEED** | Identical to REPLACE. Kept only for wording compatibility with the UI question, where "proceed" is glossed as append. **Here it overwrites — it does not append.** Say so when confirming, so the answer is not given under the other meaning. |

**Generated spec files are replaced whole and never merged.** Stage 04 regenerates the entire spec from the approved case set on every run, so the file being promoted is complete by construction. Never hand-merge two generated spec files, never append tests from one into the other, never cherry-pick between them — a merged file matches neither the approved case set nor anything Stage 04 can reproduce.

Order matters: **the removal check runs before any overwrite.** REPLACE is safe precisely because a net loss of coverage has already been surfaced and confirmed.

#### Coverage removal check

A promotion that replaces an existing spec can silently drop coverage — a case deleted at the source between two runs takes its tests with it, and the diff alone reads as an ordinary file update.

For each spec file that would overwrite an existing file:

1. Count the tests in the existing file and in the file about to be written.
2. Group both sets by case ID — the case prefix in each test title (e.g. `DEMO-TC-1201-S2 — …` belongs to case `DEMO-TC-1201`).
3. Identify every case ID present in the existing file and absent from the new one, and how many tests each removal drops.

**Additions and same-count replacements proceed normally** — state the change and carry on.

**A net loss of tests stops the promotion before the push.** Report:

```
## ⚠️ Coverage Removal — <service>

**File:** playwright/api/tests/<service>/<name>.spec.ts
**Tests in promotion target:** <N>    **Tests being promoted:** <M>    **Net change:** −<N−M>

### Cases removed
| Case ID | Tests dropped | Test titles |
|---------|---------------|-------------|
| DEMO-TC-1201 | 4 | ... |

Promoting this file removes <N−M> test(s) from `develop`.
```

Then ask, and wait for an explicit answer:
> "Promote anyway and drop these \<N−M\> tests, or stop?"

Do not commit, do not push, and do not open an MR until the answer is yes. **Never treat silence, "proceed", or a prior approval of a different question as consent to this one** — the confirmation must be given against *this* report. If the answer is no, stop and report the promotion as blocked.

Where the service's Stage 01 spec is live-TMT sourced, name the source folder in the report and note that a removed case means the case is gone from the tool, not merely from this run.

#### Env module promotion rules

Copy to the same paths Stage 04 generated — no restructuring:

- `playwright/api/tests/{service}/<name>.spec.ts` — per the dedup decision above.
- `playwright/api/config/env.{service}.ts` — **the service's own module only.** If it exists in the target, append variables not yet present rather than overwriting; never touch another service's module.
- `playwright/api/config/env.shared.ts` — copy only if absent, or if this promotion moved a variable into it. **A move must remove the getter from the owning service's module in the same commit**, so the variable is never declared twice.
- `playwright/api/config/required.ts` — copy only if absent. If it exists, leave it untouched.
- `playwright/api/config/env.ts` — **append to the barrel, never rewrite it.** Add this service's import line, descriptor spread, and cast type only if absent. Every other line stays byte-for-byte as found. If the target's `env.ts` is a pre-split monolith rather than a barrel, stop and report it — do not migrate during promotion.
- `playwright/api/helpers/` contents, if generated.

  > **Known gap — helper overwrite semantics are undefined.** Unlike a service's own spec file, a helper may be shared by several services, so the wholesale-overwrite rule does not obviously transfer to it. Nothing here specifies what happens when a helper already exists at the destination and differs from the one being promoted. This is a documented gap, not a decided behaviour — resolve it before relying on it.

- `playwright/api/.env.example` — **Stage 05 owns this file; Stage 04 never touches it.** When a service module is new or updated, add each new variable name as an empty placeholder (`NAME=`) under that service's `# ── <Service> ──` header, with a `Source:` comment naming the declaring module. If the header exists, append beneath it; if not, create it. Append only names not already present. **Never overwrite the file, never remove or reorder existing entries, and never write a real value.**

#### Unvalidated promotion path

**The PASSED-only gate still holds.** A BLOCKED or FAILED verdict does not promote, and there are no waivers.

This path exists for one case only: **Stage 04 could not reach the environment**, so it produced no verdict at all — no report, no summary, nothing for the gate to read. The tests exist and are unproven. Promoting them on a clearly-marked branch is sometimes worth doing so the work is not stranded on one machine, but it is never automatic:

- It runs **only when the user explicitly asks for an unvalidated promotion.** Never offer it as a way past a BLOCKED or FAILED verdict.
- Commit prefix: `test(unvalidated): <TICKET-ID> — <short description>`
- MR title carries **`[UNVALIDATED]`**.
- MR description states plainly: "These tests have been generated but have not run against a live environment. **Do NOT merge** until Stage 04 runs clean." Include the reason the environment was unreachable.
- **Do not merge, and do not ask to merge.** Say so explicitly in the conversation.
- In record-keeping, offer **"pending validation"** — never "automated". An unproven test recorded as automated is worse than no record, because it retires the manual test it has not replaced.

---

### STEP 3 — RECORD-KEEPING (ask first, never act without yes)

After the MR is created, ask me two separate yes/no questions. Do not bundle them.

**a. TMS:**
> "Update TMS for this ticket now?"

The answer depends on which adapter is active for this product — see `_config/case-register.md`.

- **A vendor test management tool is connected.** If yes: tell me it is not implemented yet. Record outcome as `TMS: not yet implemented`. If no: record outcome as `TMS: skipped`.
- **No vendor tool — the local case register is the system of record.** If yes: flip each promoted case to `Automated`, recording where its test landed:

  ```
  node _tools/case-register.mjs update-status <product> <case-id> Automated --spec <promoted spec path>
  ```

  One call per case. The spec path is the promoted destination from the Promoted Files table, not the scratch path. Record outcome as `TMS: register updated — <N> case(s) marked Automated`. If no: record outcome as `TMS: skipped`.

  Exit `1` is a decision (already `Automated`, unknown ID) — report it and ask; the promotion itself already succeeded, so never re-run the promotion to resolve a register question. Exit `2` halts the record-keeping step only: report that the register could not be updated and name the cases still to flip, so the MR is not reported as fully closed out when its record is missing.

  **On an unvalidated promotion, do not flip to `Automated`.** The tests have not run. Offer "pending validation" as the record-keeping outcome and leave the cases `Approved` — a case recorded as automated retires a manual test that nothing has replaced.

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
**Validation state:** validated | pending validation (unvalidated promotion)

---

## Promoted Files

| File | Destination | Action |
|------|-------------|--------|
| <TICKET-ID>.spec.ts | playwright/web/{product}/tests/{category}/ | created |
| <PageName>Page.ts | playwright/web/{product}/pages/ | created / reused / merged N additions |
| <service>.spec.ts | playwright/api/tests/<service>/ | created / replaced / skipped |
| env.<service>.ts | playwright/api/config/ | created / appended N variables |
| env.ts | playwright/api/config/ | appended <service> / unchanged |
| .env.example | playwright/api/ | appended N names / unchanged |

## Promotion MR

<MR URL> — branch `<TICKET-ID>` → `develop`
<state whether this branch was created fresh or reused, and whether the MR is new or was updated>

## Page Object Audit

<outcome for each page object: reused as-is / merged N additions / created new>

## Duplicate Check

<no overlaps found — OR — overlap with <file>: user chose proceed / replace / skip>

## Dedup Findings (API)

| Test | Existing file | Overlap | Decision |
|------|---------------|---------|----------|
| ... | ... | Full / Partial | REPLACE / SKIP / PROCEED |

## Removal Check (API)

<Recorded whether or not coverage was lost — "no coverage removed (N tests before, N after)"
is a result worth stating, not a section to omit. Where coverage was lost, name every case
and the confirmation given against that report.>

## Deferred Cases Carried Forward

| Case ID | Summary | Held reason |
|---------|---------|-------------|

## Record-keeping

- TMS: <not yet implemented / skipped / pending validation>
- Tracker: <posted / skipped>

## Stage 04 Reference

Verdict: PASSED | <N> tests | Run date: <date>
Report: stages/04-generate-tests/output/<TICKET-ID>/report.html
```

Omit the API sections entirely for a UI-only promotion. **The Removal Check section is never omitted on an API promotion** — "no coverage removed" is the finding, and a missing section is indistinguishable from a check that never ran.

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
- Existing local and remote branches were checked before `checkout -b`, and an existing branch was reused rather than recreated or suffixed.
- Where a branch already existed, its state and any open MR were reported **before** anything was changed.
- MR confirmed created — or an existing open MR confirmed updated — before asking record-keeping questions. No second MR was opened for a branch that already had one.

**API promotions:**
- The removal check ran **before** any overwrite, and its outcome is recorded whether or not coverage was lost.
- A net loss of tests halted the promotion before the push, and the confirmation was given against that specific report — not inherited from an earlier answer.
- Every dedup decision maps to the file operation this contract defines; PROCEED was confirmed as overwrite, not append.
- No generated spec file was hand-merged, appended to, or cherry-picked between.
- Only this service's env module was written. `required.ts` was copied only if absent; the barrel was appended to and otherwise left byte-for-byte unchanged; a monolithic `env.ts` halted the promotion rather than being migrated.
- Any variable moved into `env.shared.ts` was removed from its owning service module in the same commit.
- `.env.example` gained names only, with nothing reordered, removed, or given a value.

---

## QUALITY CHECKS

- Stage 04 verdict was `PASSED` — confirmed before any action.
- Product was read from approved test cases or spec, never inferred from ticket ID prefix.
- Only files belonging to this ticket were copied to the promotion target — no `.env`, session files, or ICM stage output.
- Record-keeping (TMS, tracker) was asked separately, not bundled, and not acted on without explicit yes.
- Promotion summary reflects the actual audit outcomes (created / reused / merged) accurately.
- An unvalidated promotion happened only on an explicit request for one, only where Stage 04 produced no verdict because the environment was unreachable, and never as a route past BLOCKED or FAILED.
- An unvalidated promotion carries the `test(unvalidated):` commit prefix, an `[UNVALIDATED]` MR title, and a do-not-merge body — and record-keeping offered "pending validation", never "automated".
- **(No vendor TMT)** Cases were flipped to `Automated` only on an explicit yes, only via the tool, and only with `--spec` naming the **promoted** destination path rather than the scratch path.
- **(No vendor TMT)** No case was flipped to `Automated` on an unvalidated promotion.
- **(No vendor TMT)** A register write that could not complete was reported with the cases still to flip, rather than the MR being reported as fully closed out.
