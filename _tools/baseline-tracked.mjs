#!/usr/bin/env node
// baseline-tracked.mjs — keep source-freshness baselines out of .gitignore.
//
// Usage:
//   node _tools/baseline-tracked.mjs <baseline folder or spec.md>          # check
//   node _tools/baseline-tracked.mjs <baseline folder or spec.md> --add    # check and fix
//
// A live-TMT spec (Mode B / Path B2) records what the test management tool held
// when a service's tests were written. If .gitignore excludes it, it never
// leaves the machine it was generated on, and nobody else can tell whether the
// TMT has moved for that service.
//
// .gitignore lists baselines one line at a time — git cannot tell a TMT-sourced
// spec from a tabular one by path — so a new baseline is excluded by default,
// and silently. This finds that case and, with --add, fixes it, so nobody has
// to know what a gitignore negation is.
//
// Exit codes:
//   0  nothing to do — the baseline is committable, or the spec is not
//      TMT-sourced and is correctly ignored
//   1  the baseline is excluded — a decision for the user, not an error.
//      Stage 01 asks whether to add it; --add performs the fix
//   2  the check could not run at all — no repo, git unavailable, or the fix
//      could not be applied. A genuine error; Stage 01 halts

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';

const MEANING =
  "This service's freshness baseline will only exist on this machine, so nobody else can check whether the source has changed for it.";

// Anchor comment written by the --add fix, and recognised on later runs so the
// explanatory block is written once rather than repeated per baseline.
const MARKER = '# --- source-freshness baselines (maintained by _tools/baseline-tracked.mjs) ---';

function fail(lines) {
  console.error(lines.join('\n'));
  process.exit(2);
}

const args = process.argv.slice(2);
const ADD = args.includes('--add');
const arg = args.find((a) => !a.startsWith('--'));

if (!arg) fail(['baseline-tracked: no path given', 'Usage: node _tools/baseline-tracked.mjs <baseline folder or spec.md> [--add]']);

const target = resolve(arg);
if (!existsSync(target)) fail([`baseline-tracked: path does not exist — ${arg}`]);

const specPath = statSync(target).isDirectory() ? join(target, 'spec.md') : target;
if (!existsSync(specPath)) fail([`baseline-tracked: no spec.md at ${arg}`]);

// Only Path B2 output is in scope. A tabular or tracker-sourced spec regenerates
// from its source, so its being ignored is correct rather than a miss.
if (!/^\s*source:\s*["']?tmt-live["']?\s*$/m.test(readFileSync(specPath, 'utf8'))) {
  console.log(`baseline-tracked: EXEMPT — ${arg} is not TMT-sourced. Nothing to protect.`);
  process.exit(0);
}

const git = (...a) => spawnSync('git', a, { encoding: 'utf8' });

const top = git('rev-parse', '--show-toplevel');
if (top.status !== 0) {
  fail([
    'baseline-tracked: CANNOT CHECK — not inside a git repository, or git is unavailable.',
    (top.stderr || '').trim(),
    '',
    'This is an error, not a decision. An unchecked baseline is the case this exists to catch.',
  ]);
}
const root = top.stdout.trim();
const relSpec = relative(root, specPath).split(sep).join(posix.sep);
const relFolder = relSpec.replace(/\/spec\.md$/, '');
const negation = `!${relFolder}/`;

function isIgnored() {
  const r = git('check-ignore', '-q', '--', relSpec);
  if (r.status === 0) return true;
  if (r.status === 1) return false;
  fail(['baseline-tracked: CANNOT CHECK — git check-ignore failed.', (r.stderr || '').trim()]);
}

if (!isIgnored()) {
  const tracked = git('ls-files', '--error-unmatch', '--', relSpec).status === 0;
  console.log(`baseline-tracked: OK — ${relFolder}/ is committable.`);
  console.log(tracked ? '  Already committed.' : '  Not yet committed — commit it so the baseline is preserved.');
  process.exit(0);
}

// Excluded. Without --add this is a question for the user, not a failure.
if (!ADD) {
  console.log('baseline-tracked: NOT SHARED');
  console.log(`  Baseline: ${relFolder}/`);
  console.log(`  ${MEANING}`);
  console.log('  Re-run with --add to include it.');
  process.exit(1);
}

// --- fix ---------------------------------------------------------------
const gitignorePath = join(root, '.gitignore');
if (!existsSync(gitignorePath)) fail([`baseline-tracked: no .gitignore at ${gitignorePath}; cannot apply the fix.`]);

const original = readFileSync(gitignorePath, 'utf8');
const eol = (original.match(/\r\n/g) || []).length >= (original.match(/(?<!\r)\n/g) || []).length ? '\r\n' : '\n';
let lines = original.split(/\r?\n/);
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
const changes = [];

// A bare `dir/` rule excludes the directory itself, and git cannot re-include
// anything beneath an excluded directory — a negation under it silently does
// nothing. Upgrade to `dir/*` so the exception can take effect at all.
const parentDir = relFolder.replace(/\/[^/]+$/, '');
const bare = lines.findIndex((l) => l.trim() === `${parentDir}/`);
if (bare !== -1) {
  lines[bare] = `${parentDir}/*`;
  changes.push(`changed "${parentDir}/" to "${parentDir}/*" so exceptions beneath it can take effect`);
}

if (lines.some((l) => l.trim() === negation)) {
  changes.push(`"${negation}" was already present`);
} else {
  // Group with the existing baseline exceptions when there are any, else under
  // the marker comment, else append the marker and its explanation once.
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^!.*\/output\/.+\/$/.test(lines[i].trim())) at = i;
  }
  if (at === -1) at = lines.findIndex((l) => l.trim() === MARKER);
  if (at !== -1) {
    lines.splice(at + 1, 0, negation);
  } else {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(
      MARKER,
      '# A baseline is the only record of what the test management tool held when',
      "# a service's tests were written. Listed one per line, because git cannot",
      '# tell a TMT-sourced spec from a tabular one by path.',
      negation,
    );
  }
  changes.push(`added "${negation}"`);
}

writeFileSync(gitignorePath, lines.join(eol) + eol, 'utf8');

// Never claim success on trust — confirm git agrees, and roll back if not.
if (isIgnored()) {
  writeFileSync(gitignorePath, original, 'utf8');
  fail([
    'baseline-tracked: FIX DID NOT WORK — the baseline is still excluded after editing .gitignore.',
    '.gitignore has been restored to its previous contents. Another rule is overriding the exception.',
    `  Baseline: ${relFolder}/`,
  ]);
}

console.log('baseline-tracked: FIXED — this baseline will now be shared.');
for (const c of changes) console.log(`  .gitignore: ${c}`);
console.log('  Commit .gitignore together with the baseline.');
process.exit(0);
