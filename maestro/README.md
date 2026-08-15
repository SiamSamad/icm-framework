# Mobile Runner — Maestro (scaffold)

**Status: scaffold only.** The folder structure and conventions are defined; no working runner, no flows, and no stage wiring yet. Stage 04 does not generate mobile flows today.

```
maestro/
  flows/
    <product>/           # one folder per product; .yaml flow files land here
```

## Why this bucket exists

The top level of this repository names **test tooling**, and surfaces and products nest beneath it:

| Bucket | Tool | What it runs |
|--------|------|--------------|
| `playwright/web/` | Playwright | Browser-driven UI tests, one project per product |
| `playwright/api/` | Playwright (`request` fixture) | HTTP service tests, one folder per service |
| `maestro/` | Maestro | Mobile flows, one folder per product |

A test is routed by **the tool that executes it**, never by the ticket prefix or the team that filed it. That is what keeps the layout stable: a new product adds a folder inside an existing bucket, and a new *tool* adds a bucket beside the others without disturbing anything already there.

## Maestro is the worked example, not the commitment

Maestro is one mobile driver among several. The framework's position is the same one it takes on test management tools: **define the contract, keep the vendor swappable.**

For a test management tool, the framework owns the intake contract — fetch by folder or case key, explicit field lists, pagination to completion, canonical field mapping, content fingerprinting — and any vendor (e.g., TestRail, Zephyr, QMetry, Xray) sits behind it as an adapter. Mobile is the same shape. The framework owns the pipeline contract:

- Stage 02 approves a flow definition in tool-neutral terms (steps, expected results, pass and fail criteria).
- Stage 04 generates that definition into whatever the bucket's tool consumes.
- Stage 05 promotes the generated artifacts and reports coverage.

What changes per tool is the artifact format and the run command — not the pipeline.

### Future sibling buckets

Each of these would be a peer of `maestro/`, not a subdirectory of it:

| Bucket | Tool | Notes |
|--------|------|-------|
| `espresso/` | Espresso | Android-native, JVM; flows compile into the app's own test source set rather than standing alone as YAML |
| `xcuitest/` | XCUITest | iOS-native, Swift; same shape as Espresso on the other platform |
| `appium/` | Appium | Cross-platform WebDriver; closest in structure to the Playwright buckets, since the driver is external to the app |

Adding one means creating the bucket, writing its generation module under `_config/`, and pointing Stage 04 at it. It does not mean restructuring the buckets that already exist — which is the entire reason the top level is organized by tool.

## What is deliberately not decided yet

- **Flow file naming.** Follows the same principle as the API runner (name for the product surface, not the ticket), but the exact form waits until real flows exist.
- **Device and emulator configuration.** Belongs in the product config once a real target exists.
- **Stage 04 generation rules.** A `_config/mobile-flow-generation.md` module would be written alongside the first real flow, not in advance of it.

Writing these before there is a flow to test them against would produce conventions nobody has run.
