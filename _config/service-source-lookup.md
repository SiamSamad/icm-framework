# Service Source Lookup — Reference

Test cases assert values the service does not accept: statuses outside the valid set, field names that were renamed, formats the validator rejects. Discovering these at run time is expensive — each one costs a full generate, run and diagnose cycle, and the failure surfaces as an assertion error rather than as the contract mismatch it actually is.

The authoritative answer exists before any test runs. It is in the service source: database check constraints, enum declarations, validation annotations, cascade rules, transition rules, and the security filter chain.

Loaded by Stage 01 (Mode B) for API services. Read by Stage 02, which refuses to run against a spec that never attempted the lookup.

---

## The Authority Rule

**The service source is authoritative for what values are valid.**
**The cases are authoritative for what should be tested.**

When they disagree on a value, the source wins and the case is reported for correction.

This rule settles value disputes only. It never decides scope: a case testing an endpoint the source does not implement is still a case worth raising, not a case to delete. And it is not a licence to edit tests — Stage 01 records the disagreement, Stage 02 acts on it, and the correction goes back to the test management tool.

---

## When This Runs

Mode B (API case intake), after the `cases` inventory is parsed and before the spec is emitted. Mode A (ticket intake) is exempt.

The lookup always runs and always records an outcome. **A spec that carries no `constraint_layer` block at all has not been checked — it has not "found nothing".** Those are different states and nothing downstream may conflate them. See States below.

---

## Resolving the Repository — search, never a hardcoded map

There is no service-to-repository table, and one must not be added. A new service has to work without anyone editing a config file first, and a stored mapping goes stale silently the moment a repo is renamed or moved.

Search **the configured source group** for a project matching the service name carried in the Stage 01 spec. The group is deployment configuration, not framework content: set `source_group` in `_config/<product>.md`. If no group is configured, that is `status: unavailable` with a reason naming the missing setting — never a guess at where the service might live.

Search in this order, stopping at the first tier that yields exactly one match:

| Tier | `match_method` | Rule |
|------|----------------|------|
| 1 | `exact_path` | Project `path` equals the service name exactly (`order-service`) |
| 2 | `normalised` | Compare lowercased with `-`, `_` and spaces collapsed, so `Order Service`, `order_service` and `order-service` all match |
| 3 | `substring` | Project path contains the normalised service name, or vice versa |

**Record how it matched, not just what it found.** `constraint_layer.repo`, `match_method` and `match_candidates` together let the next reader judge whether the right repository was read. A tier-3 match on a one-word service name deserves more scepticism than a tier-1 match, and only the recorded method makes that visible.

**Record the `ref` actually read** — the default branch name alone is not enough, because the branch moves. A finding without the ref it came from cannot be re-checked later.

**Zero matches → `status: no_match`.** Record the group searched and the name searched for. This is a gap in the spec, stated plainly. Never guess at a repository, never fall back to a similarly-named service, and never skip the block.

**Two or more matches at the same tier → `status: ambiguous`.** Record every candidate. Do not pick one. A wrong repository produces confident findings about the wrong service, which is worse than none.

**Read only.** Never write to a service repository, never open a merge request against one, and never modify a service to make a test case pass.

---

## Read Source, Never Build Output

Most build systems copy resources into an output directory — `target/`, `build/`, `dist/`, `out/` — so migrations and configs appear at two paths. Build output can lag the source, and it may be absent or stale in a fresh clone.

**Only the source tree is a source of truth.** Where a search returns both, keep the source hit and discard the build-output one. Never record a build-output path as `source_file`. If a value differs between the two, that is a stale build artifact — not a disagreement worth reporting.

---

## What To Extract

Six classes. Every finding records the file it came from.

| Class | What it settles |
|-------|-----------------|
| **DB check constraints** | The values the database will physically accept. The hardest limit — application code can be bypassed; this cannot. |
| **Enum declarations** | The values the application layer models |
| **Validation annotations** | Which request fields are mandatory, and their formats |
| **Cascade rules** | What a delete removes, and what it refuses to remove |
| **State transitions** | Which status *changes* are permitted, not merely which statuses exist |
| **Auth** | The header actually checked, and the status returned for missing versus invalid |

State transitions are the class most often missed. A list of valid statuses tells you nothing about whether `CANCELLED → SHIPPED` is allowed; a case asserting that transition fails against a service that models the statuses perfectly well.

### Worked example — a Java/Spring service

The classes above are universal; where they live is not. **Adapt this table to your stack** — the point is that each class has a definite home in the source, not that it has this one.

| Class | Where it lives in a Java/Spring service |
|-------|------------------------------------------|
| DB check constraints | `src/main/resources/db/migration/V*__*.sql` |
| Enum declarations | `src/main/java/**/domain/enums/*.java` |
| Validation annotations | `@NotNull`, `@NotBlank`, `@Size`, `@Pattern`, `@Min`/`@Max` on request DTOs under `src/main/java/**/dto/request/` |
| Cascade rules | `ON DELETE` in migrations; `cascade =` / `orphanRemoval` on entity relations |
| State transitions | Transition methods on the status enum (e.g. `isValidTransition`) |
| Auth | The security filter chain, e.g. `src/main/java/**/config/SecurityConfig.java` |

In a Node/TypeScript service the same six classes live in migration files, union types or const objects, a schema validator (Zod, Joi, class-validator), ORM relation options, a state-machine module, and the auth middleware respectively. The extraction is the same; only the paths change.

**Auth is frequently not in the service repo.** Where the filter comes from a shared library, the service declares only that it uses it. Record the header name and the declaring file, and set both status codes to `null` with a note naming the library.

**Do not infer the auth status codes from the service's own exception handlers** — the filter runs before them, and guessing here recreates the 401-versus-403 confusion the lookup exists to end. A verified probe recorded in `_config/auth-behavior.md` outranks an unread library.

---

## States

`constraint_layer.status` is one of five. The distinction between "not checked" and "checked, nothing found" is the point of the field, and every consumer must honour it.

| Status | Meaning | Downstream |
|--------|---------|-----------|
| *(block absent entirely)* | **UNVERIFIED — the lookup never ran.** The spec predates this step, or Stage 01 skipped it. Nothing is known either way. | Stage 02 halts |
| `extracted` | The repository was read and the constraint layer recovered | Proceeds |
| `partial` | The repository was read; some classes could not be recovered. `reason` names which and why | Proceeds; the gap is carried forward |
| `no_match` | The group was searched and no repository matched the service name | Proceeds; recorded as a gap |
| `ambiguous` | Several repositories matched and none was chosen | Proceeds; recorded as a gap with candidates |
| `unavailable` | A repository was identified but could not be read — code host unreachable, permissions, network, or no `source_group` configured | Proceeds; recorded as a gap |

`no_match`, `ambiguous` and `unavailable` are **completed lookups with a recorded outcome**. A human can read them and weigh the risk. An absent block is a question never asked, which is why only that one blocks.

A lookup that runs and legitimately finds no constraints — a service with no enums, no check constraints and no validation — is `extracted` with empty lists, not `no_match`. `no_match` is about the repository, never about the findings.

---

## Recording Findings

Every finding carries `source_file` — a repo-relative path in the source tree. A value without a path is not a finding; it is a recollection, and the next reader cannot check it.

Where two parts of the source disagree with each other — a check constraint allowing values the enum omits, say — record both under `constraint_layer.internal_disagreements`. Do not resolve it. Note that the check constraint binds at persistence time and is therefore the operative limit in practice, but report the divergence: it usually means one layer was updated and the other was not, which is a defect in the service worth raising.

---

## Comparing Against the Cases

For every value a case asserts that falls outside an extracted valid set, add a `constraint_layer.disagreements` entry naming **both** sides: what the case asserts, and what the source allows, with the source file.

- **Do not resolve it.** Do not edit the case, do not narrow the assertion, do not drop the step.
- **Do not mark the case skipped here.** Skipping is Stage 02's decision under its own Skip Directive, taken with the disagreement in front of it.
- Report every affected case by key. Never summarise as a count, and never truncate the list.

A disagreement is a finding about two documents, not a verdict about the service. The case may be describing intended behaviour the service has not implemented yet — exactly the kind of gap worth surfacing before any code is generated.

Comparison is only meaningful against a set that was actually extracted. Where `status` is `no_match`, `ambiguous` or `unavailable`, `disagreements` is empty because nothing could be compared — not because the cases agree. Say so in `reason` rather than leaving an empty list to be misread as a clean result.
