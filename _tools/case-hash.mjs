#!/usr/bin/env node
// case-hash.mjs — deterministic per-case content fingerprints for the source-freshness check.
//
// Usage:
//   node _tools/case-hash.mjs cases.json
//   node _tools/case-hash.mjs < cases.json
//
// Input — JSON array of cases in the canonical intake shape, holding the RAW
// values as returned by the test management tool (TMT) adapter: before markup
// normalisation and before known-defect splitting.
//
//   [
//     {
//       "key": "DEMO-TC-1201",
//       "precondition": "...",
//       "steps": [
//         { "seqNo": 1, "stepDetails": "...", "testData": "...", "expectedResult": "..." }
//       ]
//     }
//   ]
//
// Output — { "algorithm": "icm-fp-1", "hashes": { "<case key>": "<16 hex chars>" } }, keys sorted.
//
// Covers only content that decides what the generated test does: precondition,
// step text, test data, expected result. Title, description, priority, status,
// labels, folder, and version number are deliberately excluded — a typo fix in
// a summary must never trigger a re-run.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ALGORITHM = 'icm-fp-1';
const FIELD_SEP = String.fromCharCode(31); // ASCII unit separator — never appears in case content
const STEP_SEP = String.fromCharCode(30);  // ASCII record separator

// Whitespace-only edits must not trigger a re-run.
function norm(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function canonical(testCase) {
  const steps = [...(testCase.steps ?? [])]
    .sort((a, b) => Number(a.seqNo ?? 0) - Number(b.seqNo ?? 0))
    .map((s) => [norm(s.stepDetails), norm(s.testData), norm(s.expectedResult)].join(FIELD_SEP))
    .join(STEP_SEP);

  return [ALGORITHM, norm(testCase.key), norm(testCase.precondition), steps].join(FIELD_SEP);
}

function fail(message) {
  console.error(`case-hash: ${message}`);
  process.exit(1);
}

const source = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : readFileSync(0, 'utf8');

let cases;
try {
  cases = JSON.parse(source);
} catch (err) {
  fail(`input is not valid JSON — ${err.message}`);
}
if (!Array.isArray(cases)) fail('expected a JSON array of cases');

const hashes = {};
for (const testCase of cases) {
  if (!testCase?.key) fail('every case must carry a "key"');
  if (hashes[testCase.key]) fail(`duplicate case key ${testCase.key}`);
  hashes[testCase.key] = createHash('sha256')
    .update(canonical(testCase), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

const sorted = Object.fromEntries(Object.keys(hashes).sort().map((k) => [k, hashes[k]]));
process.stdout.write(`${JSON.stringify({ algorithm: ALGORITHM, hashes: sorted }, null, 2)}\n`);
