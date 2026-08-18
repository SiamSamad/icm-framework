---
description: Compare a service's recorded source fingerprints against the test management tool now and report the delta
argument-hint: <service-name | folder-id | TMT-<folderId> | TICKET-ID>
---

Run a source-freshness check for: **$ARGUMENTS**

This is a read-only report. It runs no stage. Never write, edit, or delete any file. Never update a spec's `case_hashes` to match what the source returns now — surfacing that difference is the entire purpose.

## 1. Resolve the target to one Stage 01 spec

Search `stages/01-normalize/output/` for a spec whose `source_provenance` matches the argument:

| Argument looks like | Resolution |
|---------------------|------------|
| A folder name that exists under `stages/01-normalize/output/` | Use that folder's `spec.md` |
| A bare ID, or `TMT-<n>` | Match `source_provenance.folder_id` |
| A service or folder name | Match on folder name, spec `title`, `service_tag`, or `source_provenance.folder_path` — case-insensitive, partial match allowed |

- **No argument given:** list every spec whose `source_provenance.source` is `tmt-live`, with folder ID, case count, and `fetched_at`, then ask which to check. Do not check them all.
- **Several matches:** list them and ask. Never pick one.
- **No match:** say so and stop. If the folder exists but holds no `spec.md`, say the baseline is missing — Stage 01 output was removed by an explicit full reset, or was never produced — and that a Stage 01 re-run is the only way to get a baseline back.
- **Match is not TMT-sourced** (`source_provenance` absent, or `source` is not `tmt-live`): report that the service came from the tracker or a tabular export, that freshness checking does not apply, and stop. This is not a failure.

State which spec resolved, and from what, before fetching anything.

## 2. Compare

Follow `_config/source-freshness.md` → Running the Comparison in full: re-fetch the recorded scope using the fetch contract in `_config/api-intake.md` → Live TMT Intake, recompute with `_tools/case-hash.mjs`, diff the maps, attribute each change.

A fetch that fails or cannot be paged to completion is a fetch error. Report what failed and stop — never report a partial fetch as removals.

## 3. Report

Print the delta report exactly as `_config/source-freshness.md` → Delta Report defines it — the same wording Stage 03 uses, so the two are comparable line for line.

Then stop. Do not offer to re-run Stage 01, do not propose fixes, do not ask what to do next. On drift, the report's own re-run instruction is the last line.

## Why this exists separately

A service that has already been promoted to the promotion target never re-enters Stage 03, so the Stage 03 gate never fires for it again. This command is the only way its cases get re-checked. Point it at a promoted service periodically — drift there means the promotion target holds tests for cases the source no longer describes.
