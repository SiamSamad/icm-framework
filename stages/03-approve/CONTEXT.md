# Stage 03 — Human Approval Gate

## INPUTS

| Type | File | Purpose |
|------|------|---------|
| Layer 4 | `stages/02-test-cases/output/<TICKET-ID>/test-cases.md` | Test cases to review |
| Layer 3 | `_config/<product>.md` | Product context for informed review |

---

## GATE

None — this stage is itself the gate. Claude does not run Stage 04 until the human writes an approval file containing `Proceed to Stage 04: YES`. Silence and ambiguity do not count as approval.

---

## PROCESS

### What This Stage Is

This is a mandatory human review checkpoint. The test cases from Stage 02 must be reviewed and explicitly approved before any Playwright code is generated.

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
2. Create `stages/03-approve/output/<TICKET-ID>/approved.md` containing the full approved test case content with the approval block at the top
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

None — this stage is the verification. The presence of `approved.md` with `Proceed to Stage 04: YES` is the gate condition read by Stage 04.

---

## QUALITY CHECKS

- `approved.md` contains the full approval block (Reviewer, Date, Status, Changes made, Proceed to Stage 04).
- `Proceed to Stage 04` is `YES` or `NO` — no other values.
- If `REJECTED`, the rejection note is specific enough that Stage 02 can be re-run with clear guidance.
- Claude does not write this file unless given an explicit instruction to do so.
