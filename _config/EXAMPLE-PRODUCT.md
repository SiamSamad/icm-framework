# Config: EXAMPLE-PRODUCT

Copy this file to `_config/<your-product>.md` and fill it in. One config per app/product.
The `playwright/web/<product>/` output bucket should match the name you use here.

Fill in what you know and **mark what you have not verified**. A table of selectors nobody
has confirmed is worse than no table: Stage 02 will treat it as ground truth and generate
tests against locators that never existed. Every table below carries a verification column
for that reason.

## Product description
_One or two lines: what this app is and who uses it._

## Base URL (test environment)
_The environment tests run against, e.g. `https://staging.example.com/`._
_Store credentials in a gitignored `.env`, never here._

## Routing mode
_Declare one. Stage 04 and Stage 05 read this to decide where a spec lands._

- **Tier-based (default)** — specs route to `tests/smoke/`, `tests/regression/`, or `tests/e2e/` by tag.
- **Page-based** — specs route to one folder per page area. If you choose this, fill in Key Flows and Routes below; that table *is* the folder list.

## Case ID prefix
_The stem for case IDs in the local case register, e.g. `EX` → `EX-TC-0001`._
_Recorded here so a human can find it without opening the workbook; the workbook's
Summary sheet is what the tool actually reads. Only relevant when no vendor test
management tool is connected — see [`_config/case-register.md`](./case-register.md)._

## Key roles & test accounts
_Which user roles matter, and which shared test account(s) to use. Names and roles here —
credentials in `.env`._

| Role | What it can do | Account (env var) |
|------|----------------|-------------------|
| | | |

## Key flows and routes
_Page-based products: this table defines the `tests/<page-area>/` folders. Tier-based
products can leave it empty or use it as orientation._

| Page area | Route | What happens there |
|-----------|-------|--------------------|
| | | |

## Feature flags
_Flags that change behaviour under test, and their current state in the test environment.
A test written against the wrong flag state fails for a reason that looks like a bug._

| Flag | QA state | Effect when on |
|------|----------|----------------|
| | | |

## Test data notes
_Seed data the environment ships with, how it is refreshed, and anything that resets on a
schedule. A nightly reset is the usual explanation for "passed yesterday, fails today."_

## Known edge cases to always test
_Product-specific gotchas Stage 02 should always cover (limits, validation rules, states)._

## Known environment limitations
_What cannot be tested here, and why — third-party sandboxes that do not exist, emails that
are swallowed, payment providers stubbed out. Stage 01 uses this to hold cases honestly
instead of generating tests that can never pass._

## Data / backend checks relevant to validation
_Any DB tables, endpoints, or backend state a test should verify beyond the UI._

## Cross-product integration
_Where this product hands off to another product in this repo. Name the other product and
the boundary, so a failure on one side is not diagnosed on the other._

## Selector standard
This product follows the shared standard in [`_config/selectors.md`](./selectors.md). Add
product-specific overrides here only if genuinely needed.

| Element | Selector | Verified? |
|---------|----------|-----------|
| | | ✅ confirmed in code / ⚠️ unverified |

## API services (API testing only)
_Only needed when this product has services tested through `playwright/api/`._

- **Source group:** `<source_group>` — the group Stage 01 searches to resolve a service's
  repository. See `_config/service-source-lookup.md`. Leave blank if there is none; the
  constraint lookup records `unavailable` rather than guessing.
- **Test management tool scope:** the project/folder scope the TMT adapter is pointed at.
  See `_config/api-intake.md`.
- **Auth behaviour:** per-service headers and status codes live in
  [`_config/auth-behavior.md`](./auth-behavior.md), not here.
