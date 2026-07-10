# example-product (Playwright bucket)

Test artifacts for `example-product`. Structure mirrors every product bucket:

```
example-product/
  pages/                 # Page Object Model classes ({PageName}Page.ts) — interactions only
  tests/
    smoke/               # @smoke — fast, run on every change
    regression/          # @regression — broader, run nightly
    e2e/                 # @e2e — full flows
```

## How ICM fills this in

Stage 04 generates two files per ticket into this bucket:
1. a page object in `pages/` (no test logic, only interactions), and
2. a spec in the appropriate `tests/<suite>/` folder that imports the page object.

Selectors follow `_config/selectors.md`. Only **validated** tests (passed their Stage 04 run,
or explicitly held via shift-left) should land here — this bucket is your permanent suite, not
a scratch area.
