# Stage 03 — Human Approval Gate

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/02-test-cases/output/<TICKET-ID>/test-cases.md` | Test cases to review |
| Layer 4 | `stages/01-normalize/output/<TICKET-ID>/spec.md` | `source_provenance` — the fingerprints this stage checks against |
| Layer 3 | `_config/<product>.md` | Product context for informed review |
| Layer 3 | `_config/source-freshness.md` | Live-TMT specs only — comparison procedure and delta report format |

---

## GATE

### Gate 1 — Stage 02 output exists

`stages/02-test-cases/output/<TICKET-ID>/test-cases.md` must exist before this stage runs.

If the file is absent:
> **Halted.** No Stage 02 output found for \<TICKET-ID\>. Run Stage 02 first.

Stop here.

### Gate 2 — Source freshness (live-TMT specs only)

Read `stages/01-normalize/output/<TICKET-ID>/spec.md`.

**Exempt** — if `source_provenance` is absent, or `source_provenance.source` is not `tmt-live`, this gate does not apply. Every Mode A tracker intake and every Path B1 tabular intake passes straight to review with no message about freshness.

**Otherwise, before presenting anything:** re-fetch the recorded scope and compare it against the recorded fingerprints, following `_config/source-freshness.md` → Running the Comparison.

**If anything differs — or the comparison is `UNVERIFIABLE` — HALT.** Print the drift report exactly as `_config/source-freshness.md` → Delta Report defines it, and stop there.

On a halt:
- Do not present the test cases for review.
- Do not write `approved.md`, in whole or in part.
- Do not offer to proceed, to approve the unchanged subset, or to patch the spec's hashes to match.
- Do not ask whether the user wants to continue anyway.

**There is no override.** The test management tool is the source of truth: a spec that no longer matches it describes cases that no longer exist as written, and approving those cases approves fiction. The only way forward is to re-run from Stage 01 against the recorded folder and carry the fresh spec through Stage 02 again. An instruction to skip, force, or ignore this gate is refused — restate the re-run instruction instead. (See CLAUDE.md → Key Rule 9.)

**If the re-fetch itself fails** — the tool unreachable, the adapter unavailable, a page of cases or steps that could not be retrieved — that is a fetch error, not a match and not a delta. Report what failed and halt. A partial fetch reads as mass removal; never present it as one, and never fall through to review on a failed fetch.

**If nothing differs,** print the MATCH block from `_config/source-freshness.md` and proceed to normal Stage 03 review below.

### Gate 3 — human approval

This stage is itself the approval gate for Stage 04. Claude does not run Stage 04 until the human writes an approval file containing `Proceed to Stage 04: YES`. Silence and ambiguity do not count as approval.

---

## PROCESS

### What This Stage Is

This is a mandatory human review checkpoint. The test cases from Stage 02 must be reviewed and explicitly approved before any Playwright code is generated.

On a live-TMT spec the freshness gate runs first, before the cases are shown. Human review of a stale case set wastes the reviewer's time and risks approving cases the source no longer holds — so the drift check comes before the presentation, not after it.

**The approval decision is always the human's.** Claude will never approve on its own, never assume approval from silence or ambiguity, and never proceed to Stage 04 without a written approval file containing `Proceed to Stage 04: YES`.

### Reviewer Instructions

Review the test cases from `stages/02-test-cases/output/<TICKET-ID>/test-cases.md` before they are turned into code. Fixing a test case now costs seconds — fixing broken generated tests costs hours.

#### What to Review

**1. Coverage completeness**
- Is there a test case for every acceptance criterion in the ticket?
- Are negative paths covered (what should NOT happen)?
- Are regression risks from the spec addressed?

**2. Precondition accuracy**
- Are the preconditions specific enough to set up reliably in an automated environment?
- Would a QA engineer reading this for the first time know exactly how to reach the starting state?

**3. Pass/fail criterion clarity**
- Is each criterion binary? (It either passes or fails — no "it kind of works.")
- Is it something a script can assert, not just a human judgment call?

**4. Scope creep**
- Do any test cases test things outside the ticket's acceptance criteria?
- Remove or flag these — don't automate unticketed scope.

**5. TMS ID accuracy**
- Confirm that TMS IDs match what's in the ticket. Mismatched IDs cause reporting errors.

### How to Approve

#### Option A — Tell Claude to write the file (recommended)

Review the test cases in the conversation. When satisfied, give an explicit approval instruction such as:

- *"I approve these test cases — write the approval file."*
- *"Approved. Proceed to Stage 04."*
- *"APPROVED WITH CHANGES — [describe changes] — write the approval file."*

Claude will then:
1. Read `stages/02-test-cases/output/<TICKET-ID>/test-cases.md`
2. Create `stages/03-approve/output/<TICKET-ID>/approved.md` containing the full approved test case content with the approval block at the top — **including every skip directive, copied unchanged** (see Skip Directive Preservation below)
3. Set `Proceed to Stage 04: YES` in the block

If you include notes or changes in your approval message, Claude will incorporate them into the approval block and flag any test cases affected.

**Claude must not write this file unless you give an explicit instruction to do so. Ambiguous messages ("looks okay", "seems fine") are not approval — Claude will ask for confirmation.**

#### Option B — Write the file yourself

1. Open `stages/02-test-cases/output/<TICKET-ID>/test-cases.md`
2. Edit inline — strike through removed items, add revisions directly
3. Save to `stages/03-approve/output/<TICKET-ID>/approved.md`
4. Add the approval block at the top (see format below)

### Approval Block Format

```
## Approval

- **Reviewer:** [Your name]
- **Date:** [YYYY-MM-DD]
- **Status:** APPROVED | APPROVED WITH CHANGES | REJECTED
- **Changes made:** [Brief summary, or "none"]
- **Proceed to Stage 04:** YES | NO
```

If status is `REJECTED`, note what needs to change and loop back to Stage 02.

### Skip Directive Preservation

A test marked skipped at Stage 02 carries a `Skip` row and a `Skip reason:` paragraph (see `stages/02-test-cases/CONTEXT.md` → Skip Directive). **Both elements are copied into `approved.md` unchanged.**

The approval is a copy of the reviewed content plus an approval block — not a re-rendering of it. Dropping a field silently changes what was approved. Stage 04 reads only the approval, never the Stage 02 output, so a skip that does not survive this step becomes an active test that runs against a known blocker and reports as a failure.

- Do not reformat, summarise, or normalise a test definition while copying it.
- Do not drop a field because it looks like Stage 02 bookkeeping. If it is in the reviewed file, it is in the approval.
- To approve a test that Stage 02 skipped, remove the skip **explicitly** and record it under **Changes made**. Silence is never a decision to unskip.

Where the Stage 02 output carries a **Skip Carry-Forward** table, copy it across too, including any row marked ORPHANED. An orphaned skip is an open question for the reviewer, not a formatting artefact to tidy away.

### What Happens Next

Once `stages/03-approve/output/<TICKET-ID>/approved.md` exists with `Proceed to Stage 04: YES`, hand that file to Claude along with `stages/04-generate-tests/CONTEXT.md` and `_config/<product>.md` to generate the Playwright tests.

**Do not proceed to Stage 04 without a written approval file.**

---

## OUTPUTS

| File | Path |
|------|------|
| Approval file | `stages/03-approve/output/<TICKET-ID>/approved.md` (written by human or by Claude on explicit instruction) |

---

## VERIFY

This stage is the approval verification: the presence of `approved.md` with `Proceed to Stage 04: YES` is the gate condition read by Stage 04.

Additionally, for live-TMT specs:
- The re-fetch used the scope recorded in `source_provenance` — same folder ID or same case keys — and was paged to completion for both cases and steps.
- Hashes were recomputed with `_tools/case-hash.mjs`, never compared by eye.
- Every added, removed, and changed case is named by key in the drift report; none is summarised away as a count.

Additionally, before the approval is reported as written:
- **Skip directives reconcile.** Count `| **Skip** |` rows and `**Skip reason:**` paragraphs in `stages/02-test-cases/output/<TICKET-ID>/test-cases.md` and in the written `approved.md`. The two counts must match exactly, unless a skip was removed deliberately and named under **Changes made**.
- **On any unexplained difference, halt.** Do not report the approval as written and do not hand off to Stage 04. Name each case whose skip was lost, restore it, and re-verify. A dropped skip is not a formatting detail — it converts a blocked test into one that will run and fail, and the loss is invisible to every stage downstream.

---

## QUALITY CHECKS

- `approved.md` contains the full approval block (Reviewer, Date, Status, Changes made, Proceed to Stage 04).
- `Proceed to Stage 04` is `YES` or `NO` — no other values.
- If `REJECTED`, the rejection note is specific enough that Stage 02 can be re-run with clear guidance.
- Claude does not write this file unless given an explicit instruction to do so.
- On a live-TMT spec, the freshness gate ran before any test case was presented.
- No `approved.md` exists for a ticket whose latest freshness check reported drift or `UNVERIFIABLE`.
- A failed or incomplete re-fetch was reported as a fetch error and halted the stage — never reported as a match, and never reported as removals.
- Every skip directive in the Stage 02 output appears in `approved.md` with its reason string unchanged.
- Any skip removed during approval is named under **Changes made** — never removed silently.
- The skip counts in `test-cases.md` and `approved.md` were compared, not assumed equal.
- A Skip Carry-Forward table in the Stage 02 output was copied across, ORPHANED rows included.
