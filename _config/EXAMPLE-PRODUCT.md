# Config: EXAMPLE-PRODUCT

Copy this file to `_config/<your-product>.md` and fill it in. One config per app/product.
The `automation/playwright/<product>/` output bucket should match the name you use here.

## Product description
_One or two lines: what this app is and who uses it._

## Base URL (test environment)
_The environment tests run against, e.g. `https://staging.example.com/`._
_Store credentials in a gitignored `.env`, never here._

## Key roles & test accounts
_Which user roles matter, and which shared test account(s) to use._

## Known edge cases to always test
_Product-specific gotchas Stage 02 should always cover (limits, validation rules, states)._

## Data / backend checks relevant to validation
_Any DB tables, endpoints, or backend state a test should verify beyond the UI._

## Selector standard
This product follows the shared standard in [`_config/selectors.md`](./selectors.md). Add
product-specific overrides here only if genuinely needed.
