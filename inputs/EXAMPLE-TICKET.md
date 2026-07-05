# EXAMPLE-1234 — Newsletter signup modal on first visit

**Product:** example-product
**Type:** feature
**Platform:** web

## Description
First-time visitors should see a modal inviting them to sign up for the newsletter. It appears
once per visitor, can be completed in one step, and must be dismissable without signing up.
The visitor's choice (signed up / dismissed) is recorded so the modal does not reappear.

## Acceptance Criteria
1. Modal appears on a visitor's first page load.
2. Entering a valid email and clicking "Subscribe" completes signup and closes the modal.
3. An invalid email shows an inline validation error and does not submit.
4. The modal can be dismissed (X or "No thanks") without signing up.
5. Once shown and acted on, the modal does not reappear for that visitor.

## Links (optional)
- Requirements/design doc: <none for this example>
- Code change / PR / MR: <none for this example>
