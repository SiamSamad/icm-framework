# Source Freshness — Reference

When API test cases live in an external test management tool (TMT), that tool is the source of truth and it keeps moving: cases are added, removed, and edited after a service has already been through the pipeline. This module defines how a run records what it saw, how a later check detects that the source has moved since, and what that check reports.

Loaded by Stage 01 (Mode B / Path B2) to record fingerprints, by Stage 03 to gate approval, by the `/drift-check` command, and by Stage 05 for the removal check.

## The TMT Is Pluggable; This Contract Is Not

The framework never depends on a particular vendor. It defines the intake contract — fetch by folder or case key, explicit field lists, pagination to completion, canonical field mapping, content fingerprinting — and any vendor (e.g., TestRail, Zephyr, QMetry, Xray) sits behind it as an adapter. Everything in this module is expressed against the canonical case shape the adapter produces, never against a vendor's payload. Swapping adapters changes the fetch, not the freshness rules.

**Live-TMT specs only.** A spec whose `source_provenance.source` is not `tmt-live` — every Mode A tracker intake and every Path B1 tabular intake — is exempt. Skip the check for those and say nothing; it is not a gap and never a warning.

---

## What Is Hashed

One hash per case, over the content that decides what the generated test does.

| Included | Why it matters |
|----------|----------------|
| `precondition` | Carries the endpoint, headers, and request payload on API cases — a change here changes the request the test sends |
| step `stepDetails` | The action the test performs |
| step `testData` | The values the test sends |
| step `expectedResult` | The assertion the test makes, including any known-defect marker |

| Excluded | Why |
|----------|-----|
| `summary` / title | A typo fix in a summary must never trigger a re-run |
| `description` | Read by no downstream stage; empty on most API cases |
| `priority`, `status`, `labels`, `components` | Workflow metadata — no effect on the generated test |
| `folder`, folder path | Location, not content |
| `versionNo`, internal IDs | Change on every edit, including edits to excluded fields |

Hash the **raw values as the adapter returned them** — before markup normalisation and before known-defect splitting. Those rules live in `_config/api-intake.md` and may be refined later; hashing raw values keeps a fingerprint stable across such refinements and directly comparable to any later fetch.

---

## Canonical Form and Algorithm

`_tools/case-hash.mjs` is the only implementation. Never hand-compute a hash and never eyeball a comparison — a wrong fingerprint is worse than none.

```
node _tools/case-hash.mjs cases.json
```

Input is a JSON array of cases in the canonical shape: `key`, `precondition`, and `steps[]` with `seqNo`, `stepDetails`, `testData`, `expectedResult`. Output is `{ "algorithm": "icm-fp-1", "hashes": { "<case key>": "<16 hex chars>" } }`.

The script normalises whitespace before hashing: line endings unified, runs of spaces and tabs collapsed, each line trimmed, blank lines dropped. A reformatting-only edit therefore does not register as a change. Steps are hashed in `seqNo` order, so reordering steps does register.

`hash_algorithm` records the tag the script emitted. **Hashes carrying a different tag are not comparable.** When a spec's tag does not match the current script's, the result is `UNVERIFIABLE` — never a pass — and the fix is a Stage 01 re-run.

---

## Where Fingerprints Live

In `source_provenance` in the Stage 01 spec, alongside the folder ID, case count, and timestamp:

```yaml
source_provenance:
  source: "tmt-live"
  folder_id: "TMT-4102"
  folder_path: "API / Order Service"
  case_count: 2
  fetched_at: "2026-08-05T19:18:44Z"
  hash_algorithm: "icm-fp-1"
  case_hashes:
    DEMO-TC-1201: "b240bde3796f9767"
    DEMO-TC-1202: "7e5af4c0237a4316"
```

`case_hashes` must carry exactly one entry per case in `cases` — same keys, same count. A spec whose `case_count`, `cases` length, and `case_hashes` size disagree is broken, not stale.

**The baseline is the spec.** A freshness check is only possible while `stages/01-normalize/output/<FOLDER>/spec.md` exists, which is why cleanup keeps live-TMT Stage 01 folders under the freshness baseline rule in `CLAUDE.md`. Only an explicit full reset removes one, and the only way back afterwards is a Stage 01 re-run.

Because these baselines must outlive the machine that produced them, `.gitignore` re-includes each one explicitly. Stage 01 verifies this with `_tools/baseline-tracked.mjs` — see Baseline Sharing below.

---

## Running the Comparison

1. **Read the spec.** If `source_provenance.source` is not `tmt-live`, the target is exempt — stop and say so.
2. **Check the baseline.** If `case_hashes` is absent (a spec predating fingerprinting) or `hash_algorithm` does not match the current script's tag, report `UNVERIFIABLE` and require a Stage 01 re-run. For gating purposes, `UNVERIFIABLE` counts as drift.
3. **Re-fetch the same scope** — the recorded `folder_id`, or the recorded case keys — following `_config/api-intake.md` → Live TMT Intake exactly: same explicit field list, same pagination discipline for both cases and steps. A fetch that could not be completed or paged out is reported as a fetch error, never as a delta. A truncated fetch would read as mass removal.
4. **Recompute** with `_tools/case-hash.mjs` over the fresh fetch.
5. **Compare the maps.** Added = keys present now, absent at Stage 01. Removed = present at Stage 01, absent now. Changed = present in both with differing hashes.
6. **Attribute each change.** Compare the re-fetched values for the case against the values recorded in that case's `cases` entry — `precondition`, `step_summary`, `test_data`, `expected_result` — and name which parts differ. Where the recorded value was normalised or defect-split at Stage 01, compare on that same basis. When a part cannot be attributed with confidence, report `changed (part not determined)` rather than guessing; the case still counts as changed.

---

## Delta Report

Both forms below are the output of every consumer — Stage 03, `/drift-check`, and any later re-check. Same wording, same tables, so two checks can be compared line for line.

**When something differs:**

```
## ⛔ Source Freshness — DRIFT DETECTED

**Folder:** <folderId> — <folder_path>
**Baseline spec:** stages/01-normalize/output/<FOLDER>/spec.md
**Fetched at Stage 01:** <fetched_at>
**Re-fetched now:** <timestamp>

| Cases | Stage 01 | Now |
|-------|----------|-----|
|       | <N>      | <M> |

### Added (<n>)
| Case key | Summary |
|----------|---------|

### Removed (<n>)
| Case key | Summary as recorded at Stage 01 |
|----------|--------------------------------|

### Changed (<n>)
| Case key | Precondition | Steps | Test data | Expected result |
|----------|--------------|-------|-----------|-----------------|
| DEMO-TC-1201 | — | changed | — | changed |

**The source has moved since this spec was taken. Re-run from Stage 01 against folder <folderId>, then continue forward through the pipeline.**
```

Omit any of the three sections that is empty. Report every affected case by key — never summarise as a count alone, and never truncate a long list.

**When nothing differs:**

```
## ✅ Source Freshness — MATCH

**Folder:** <folderId> — <folder_path>
<N> cases, all hashes match the spec taken at <fetched_at>. Re-fetched <timestamp>.
```

---

## Baseline Sharing

A baseline that exists on one machine protects nobody. After writing a Path B2 spec, Stage 01 runs:

```
node _tools/baseline-tracked.mjs stages/01-normalize/output/<FOLDER>
```

| Exit | Meaning | What to do |
|------|---------|------------|
| 0 | Committable, or the spec is not TMT-sourced | Nothing — commit the baseline with the run |
| 1 | `.gitignore` excludes it | A decision, not an error. Ask the user in plain language whether this baseline should be shared, then fix with `--add`. Never ask the user to hand-edit `.gitignore` |
| 2 | The check could not run | Halt. An inconclusive result never reads as a pass |

`--add` upgrades a bare `dir/` rule to `dir/*` where needed (git cannot un-ignore a path inside an excluded directory), inserts the negation into the baseline block, then re-asks git whether the file is still ignored and rolls the edit back if it is. It never claims success on trust.

---

## Consumers

| Consumer | Behaviour on drift |
|----------|--------------------|
| Stage 01 (Mode B / Path B2) | Records the fingerprints — does not compare |
| Stage 03 | **Hard block.** Cases are not presented, `approved.md` is not written, no override exists |
| `/drift-check` | Reports the delta only — read-only, changes nothing |
| Stage 05 | Removal check — requires confirmation before pushing a net test loss |
