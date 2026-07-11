# Stage 03 — Approve (Human Gate — Fork A)

**Job:** Stop. Present the draft test cases and testability report to a human, and take their
decision before any test code is written.

**Input:** `stages/02-test-cases/output/<product>/<TICKET-ID>-test-cases.md`
**Output:** `stages/03-approve/output/<product>/<TICKET-ID>-approval.md`

---

## What to do

1. Present a concise summary of the test cases: how many, what they cover, which are
   `BLOCKED`, and the testability gaps (elements needing a `data-testid`).
2. Call out anything that needs a human decision — open questions, ambiguous expected
   results, missing selectors that block automation.
3. Wait for one of two outcomes (Fork A):

   - **Approved** → record the approval (who/when if known), and the pipeline may continue to
     Stage 04.
   - **Needs work** → record what needs to change and **loop back to Stage 02**. Do not
     proceed to Stage 04.

---

## Rules

- This is a real gate. Do not assume approval, and do not run Stage 04 on your own initiative.
- Approval is per-ticket. It does not generalize to future tickets.
- If there are unresolved `BLOCKED` cases, make that explicit — the human decides whether to
  approve the unblocked subset or send everything back.
