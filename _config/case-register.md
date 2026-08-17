# Local Case Register — Reference

The framework treats the test management tool (TMT) as a **pluggable slot**: it owns the intake and write-back contract, and any vendor (e.g., TestRail, Zephyr, QMetry, Xray) sits behind that contract as an adapter. This module defines the **built-in adapter** — a committed Excel workbook that is the system of record when no vendor tool is connected.

It exists so the pipeline is complete out of the box. Without it, a team with no TMT has a Stage 05 record-keeping step that answers "not implemented yet" and no durable record of what has been automated. With it, every stage has somewhere real to read from and write to, and swapping in a vendor later changes the adapter rather than the pipeline.

---

## Which Adapter Is Active

| Situation | System of record | Register behaviour |
|-----------|------------------|--------------------|
| A vendor TMT is connected | The vendor tool | **Not used.** Do not write to it, do not keep it in sync as a shadow copy — two systems of record is none. |
| No vendor TMT is connected | `registry/<product>.xlsx` | The register is authoritative for case status and automation coverage. |

"Connected" means a working adapter the stages can actually call. A vendor tool that exists in the organisation but is unreachable from this pipeline is **not** connected; use the register and say so.

The register is **tracked in git**, not scratch. It is the only durable record of what has been approved and what has been automated, and — unlike stage output — re-running a stage does not reproduce it.

---

## Schema

One workbook per product at `registry/<product>.xlsx`.

**Sheets:** one per screen or area for UI products, one per service for API products, plus a `Summary` sheet. The sheet a case lands on is its `Screen/Service` value; `append` creates a sheet on demand.

**Columns** — fixed order, on every case sheet:

| # | Column | Canonical field (`_config/api-intake.md` → Shape 1) |
|---|--------|------------------------------------------------------|
| 1 | Case ID | `case_id` |
| 2 | Title | `summary` |
| 3 | Screen/Service | `folder` |
| 4 | Type | `type` |
| 5 | Priority | `priority` |
| 6 | Preconditions | `precondition` |
| 7 | Steps | `step_summary` |
| 8 | Test Data | `test_data` |
| 9 | Expected Result | `expected_result` |
| 10 | Status | `status` |
| 11 | Source Ticket | → `notes` |
| 12 | Automated Spec | → `notes` |
| 13 | Last Updated | → `notes` |

The first ten map 1:1 onto named canonical fields. The last three are register bookkeeping with no canonical equivalent, and they fold into `notes` under the existing rule that any unmapped column is captured as a row note rather than discarded.

**This is what makes the register a plain Shape 1 tabular source.** Stage 01 parses it with no special-casing and no register-aware branch — the same code path that reads a vendor export. A register workbook handed to Stage 01 Mode B Path B1 round-trips.

**The column set is a contract.** The tool refuses to write to a sheet whose headers do not match, rather than writing into the wrong column. Change this table first, then the tool.

### Summary sheet

Holds the register's own metadata and counts by status. **Counts are recomputed from the case sheets on every write, never incremented** — an incremented counter drifts the first time somebody edits a row in Excel, and nothing surfaces the drift. The `Case ID prefix` row is authoritative: `append` reads it back to issue the next ID.

---

## Case ID Convention

`<PREFIX>-TC-<NNNN>` — e.g. `EX-TC-0001`, zero-padded to four digits.

The prefix is set once at `init --prefix` and stored in the Summary sheet. Record it in the product config too (`_config/<product>.md` → Case ID prefix) so a human can find it without opening the workbook, but the workbook is the authority the tool reads.

**IDs are sequential and never reused.** `append` continues from the highest existing number, including past deleted rows. Reusing a freed number would point two different cases at one ID over the register's lifetime, and every downstream reference — spec comments, test IDs, promotion records — is by ID.

Never hand-assign an ID. `append` issues them; supplying one explicitly is supported only for re-importing cases that already have IDs, and a collision is refused.

---

## Status Model

| Status | Meaning | Set by |
|--------|---------|--------|
| `Draft` | The case exists and is written, but no human has approved it | Stage 02, on append |
| `Approved` | A reviewer approved it at the Stage 03 gate | Stage 03, on approval |
| `Automated` | A test exists, passed Stage 04, and was promoted | Stage 05, on record-keeping |

Status moves forward as the pipeline earns the change, one stage at a time. Nothing sets `Automated` speculatively: the tool refuses it without `--spec`, because a case recorded as automated with no spec path claims coverage nobody can find.

**A skip directive does not change register status.** A skipped test is fully specified and approved — it simply has a known external blocker. It stays `Approved`, and it becomes `Automated` only if it is promoted like any other test. Demoting a skipped case would lose the reviewer's approval; promoting it to `Automated` would claim a test that is not running. See `stages/02-test-cases/CONTEXT.md` → Skip Directive.

Status is **excluded from content fingerprints** (`_config/source-freshness.md` → What Is Hashed), so advancing a case through the pipeline never reads as source drift.

---

## Which Stage Touches It When

| Stage | Action | Command |
|-------|--------|---------|
| 01 — Normalize | Reads only, and only when a register workbook is supplied as a tabular case source | (parsed as Shape 1) |
| 02 — Test Cases | Appends newly written cases as `Draft`, after `test-cases.md` is written | `append <product> <cases.json>` |
| 03 — Approve | Flips approved cases to `Approved`, after `approved.md` is written | `update-status <product> <id> Approved` |
| 04 — Generate and Run | **Nothing.** Generation and a run are not a record | — |
| 05 — Promote and Close | On the record-keeping yes, flips promoted cases to `Automated` with the spec path | `update-status <product> <id> Automated --spec <path>` |

Stage 04 deliberately writes nothing. A test that has been generated, or has even passed locally, is not yet part of the suite — only promotion makes that true, and Stage 05 is where promotion happens.

---

## Commands

```
node _tools/case-register.mjs init <product> --prefix <PREFIX>
node _tools/case-register.mjs append <product> <cases.json>
node _tools/case-register.mjs update-status <product> <case-id> <Draft|Approved|Automated> [--spec <path>]
node _tools/case-register.mjs export <product> <out.json>
```

Run from the repo root. Requires `npm install` in `_tools/` once (exceljs is the only dependency).

**Exit codes** — the same convention as `_tools/baseline-tracked.mjs`:

| Exit | Meaning | What a stage does |
|------|---------|-------------------|
| `0` | Success. The command prints exactly what changed | Continue |
| `1` | A decision for the user, not an error — a duplicate ID, an unknown case, a status already set. **Nothing was written** | Report it and ask; never retry blindly |
| `2` | The command could not run — bad arguments, missing register, unreadable file | **Halt.** An inconclusive write never reads as a pass |

**No stage writes to the workbook by hand.** Every change goes through the tool, so the ID sequence, the Summary counts, and the column contract hold. An agent editing a spreadsheet freehand is exactly the failure this tool exists to prevent.

---

## Export and Round-Trip

`export` emits each row in two shapes at once:

- the canonical Mode B `cases[]` fields, so the output drops into an intake with no translation; and
- `key` plus a single-element `steps[]` (`seqNo: 1`), so `_tools/case-hash.mjs` can fingerprint it exactly as it fingerprints a vendor-sourced case.

A register row is one case with one aggregate step, which is why `seqNo` is always 1.

This is what makes the register a first-class source rather than a side file: cases that came out of it can be fingerprinted, drift-checked, and mapped by the same modules that handle a live TMT fetch.

**Freshness note.** A register is local and versioned in git, so it does not drift the way a live vendor tool does — a change arrives as a reviewable commit, not silently. Register-sourced specs are therefore not `source: tmt-live` and are exempt from the Stage 03 freshness gate, exactly as any tabular intake is. Fingerprinting still works and is still worth recording; git history is the audit trail.
