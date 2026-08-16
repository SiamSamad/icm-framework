#!/usr/bin/env node
// case-register.mjs — the local case register: an Excel workbook that IS the
// system of record when no vendor test management tool (TMT) is connected.
//
// The framework treats the TMT as pluggable: it owns the intake and write-back
// contract, and any vendor (e.g., TestRail, Zephyr, QMetry, Xray) sits behind it
// as an adapter. This is the built-in, zero-dependency-on-anyone adapter. The
// workbook parses back as a Shape 1 tabular case source with no special-casing,
// so a register-sourced run and a vendor-sourced run are the same run.
//
// Usage:
//   node _tools/case-register.mjs init <product> --prefix <ID-PREFIX>
//   node _tools/case-register.mjs append <product> <cases.json>
//   node _tools/case-register.mjs update-status <product> <case-id> <Draft|Approved|Automated> [--spec <path>]
//   node _tools/case-register.mjs export <product> <out.json>
//
// Exit codes — the same convention as baseline-tracked.mjs:
//   0  success
//   1  a decision for the user, not an error (duplicate case, unknown ID,
//      status already set) — nothing was written
//   2  the command could not run at all (bad arguments, missing workbook,
//      unreadable file). A genuine error; a calling stage halts
//
// Every command reports what it changed. No command silently rewrites a row.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ExcelJS from 'exceljs';

// ── Schema ─────────────────────────────────────────────────────────────────
// Column order is part of the contract: the first ten map 1:1 onto the Stage 01
// Mode B canonical fields, and the last three are register bookkeeping that the
// documented "any remaining free-text column" rule folds into `notes`. Reordering
// or renaming a header breaks that mapping — change _config/case-register.md
// first, then this table.
const COLUMNS = [
  { header: 'Case ID',         key: 'caseId',         width: 16, canonical: 'case_id' },
  { header: 'Title',           key: 'title',          width: 44, canonical: 'summary' },
  { header: 'Screen/Service',  key: 'screenService',  width: 20, canonical: 'folder' },
  { header: 'Type',            key: 'type',           width: 14, canonical: 'type' },
  { header: 'Priority',        key: 'priority',       width: 10, canonical: 'priority' },
  { header: 'Preconditions',   key: 'preconditions',  width: 40, canonical: 'precondition' },
  { header: 'Steps',           key: 'steps',          width: 52, canonical: 'step_summary' },
  { header: 'Test Data',       key: 'testData',       width: 28, canonical: 'test_data' },
  { header: 'Expected Result', key: 'expectedResult', width: 44, canonical: 'expected_result' },
  { header: 'Status',          key: 'status',         width: 12, canonical: 'status' },
  { header: 'Source Ticket',   key: 'sourceTicket',   width: 16, canonical: null },
  { header: 'Automated Spec',  key: 'automatedSpec',  width: 46, canonical: null },
  { header: 'Last Updated',    key: 'lastUpdated',    width: 14, canonical: null },
];

const STATUSES = ['Draft', 'Approved', 'Automated'];
const SUMMARY_SHEET = 'Summary';
const REGISTRY_DIR = 'registry';

// ── Exit helpers ───────────────────────────────────────────────────────────
function bail(message, hint) {
  console.error(`case-register: ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(2);
}

function decide(lines) {
  for (const l of lines) console.log(l);
  process.exit(1);
}

// ── Workbook helpers ───────────────────────────────────────────────────────
function registryPath(product) {
  return resolve(join(REGISTRY_DIR, `${product}.xlsx`));
}

async function loadWorkbook(product) {
  const path = registryPath(product);
  if (!existsSync(path)) {
    bail(
      `no register for "${product}" at ${REGISTRY_DIR}/${product}.xlsx`,
      `Create it first: node _tools/case-register.mjs init ${product} --prefix <ID-PREFIX>`,
    );
  }
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(path);
  } catch (err) {
    bail(`could not read ${REGISTRY_DIR}/${product}.xlsx — ${err.message}`);
  }
  return { wb, path };
}

function caseSheets(wb) {
  return wb.worksheets.filter((ws) => ws.name !== SUMMARY_SHEET);
}

// Header row is row 1; data starts at row 2. Read by header name rather than by
// index so a future column insert cannot silently shift every value one place.
function headerMap(sheet) {
  const map = {};
  const row = sheet.getRow(1);
  row.eachCell((cell, colNumber) => {
    map[String(cell.value ?? '').trim()] = colNumber;
  });
  return map;
}

function cellText(sheet, rowNumber, colNumber) {
  if (!colNumber) return '';
  const v = sheet.getRow(rowNumber).getCell(colNumber).value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v.richText) return v.richText.map((r) => r.text).join('');
  if (typeof v === 'object' && v.text) return String(v.text);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function readRows(wb) {
  const rows = [];
  for (const sheet of caseSheets(wb)) {
    const hm = headerMap(sheet);
    for (let r = 2; r <= sheet.rowCount; r++) {
      const caseId = cellText(sheet, r, hm['Case ID']).trim();
      if (!caseId) continue; // blank spacer row — skip, never count
      const row = { _sheet: sheet.name, _row: r };
      for (const col of COLUMNS) row[col.key] = cellText(sheet, r, hm[col.header]);
      rows.push(row);
    }
  }
  return rows;
}

function getPrefix(wb) {
  const summary = wb.getWorksheet(SUMMARY_SHEET);
  if (!summary) return null;
  for (let r = 1; r <= summary.rowCount; r++) {
    const label = String(summary.getRow(r).getCell(1).value ?? '').trim();
    if (label === 'Case ID prefix') {
      const v = String(summary.getRow(r).getCell(2).value ?? '').trim();
      return v || null;
    }
  }
  return null;
}

function today() {
  // Date only — the register records the day a row changed, not a clock time.
  // A timestamp would make every write a diff even when nothing else moved.
  return new Date().toISOString().slice(0, 10);
}

function styleHeader(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
}

function ensureCaseSheet(wb, name) {
  let sheet = wb.getWorksheet(name);
  if (sheet) return sheet;
  sheet = wb.addWorksheet(name);
  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  styleHeader(sheet);
  return sheet;
}

// Every write goes through the header map rather than through exceljs's keyed
// addRow. A sheet read back from disk carries no column-key mapping — exceljs
// only sets one when the columns are defined in-process — so a keyed addRow on
// a reopened workbook writes an empty row and reports success. Addressing cells
// by header name is correct on both a fresh sheet and a reopened one, and it
// survives a column being inserted.
function assertHeaders(sheet) {
  const hm = headerMap(sheet);
  const missing = COLUMNS.filter((c) => !hm[c.header]).map((c) => c.header);
  if (missing.length) {
    bail(
      `sheet "${sheet.name}" is missing column(s): ${missing.join(', ')}`,
      'The register schema is fixed — see _config/case-register.md. Restore the headers before writing.',
    );
  }
  return hm;
}

// Append position is the row after the last row carrying a Case ID, not
// sheet.rowCount — a workbook edited in Excel routinely carries trailing rows
// that are styled but empty, and appending after those leaves visible gaps.
function nextDataRow(sheet, hm) {
  let last = 1; // row 1 is the header
  for (let r = 2; r <= sheet.rowCount; r++) {
    if (cellText(sheet, r, hm['Case ID']).trim()) last = r;
  }
  return last + 1;
}

function writeRow(sheet, hm, rowNumber, data) {
  const row = sheet.getRow(rowNumber);
  for (const col of COLUMNS) {
    const v = data[col.key];
    row.getCell(hm[col.header]).value = v === '' || v === undefined ? null : v;
  }
  row.alignment = { vertical: 'top', wrapText: true };
  row.commit();
}

// The Summary sheet holds the register's own metadata (the ID prefix `append`
// reads back) plus counts by status. Counts are recomputed from the case sheets
// on every write, never incremented — an incremented counter drifts the first
// time a row is edited by hand in Excel, and nothing would surface the drift.
function rebuildSummary(wb, product) {
  const prefix = getPrefix(wb);
  const rows = readRows(wb);

  let summary = wb.getWorksheet(SUMMARY_SHEET);
  if (summary) wb.removeWorksheet(summary.id);
  summary = wb.addWorksheet(SUMMARY_SHEET);
  wb.worksheets.forEach((ws, i) => { ws.orderNo = ws.name === SUMMARY_SHEET ? 0 : i + 1; });

  summary.columns = [{ width: 22 }, { width: 40 }];
  summary.addRow(['Local Case Register']).font = { bold: true, size: 14 };
  summary.addRow([]);
  summary.addRow(['Product', product]);
  summary.addRow(['Case ID prefix', prefix ?? '']);
  summary.addRow(['Last Updated', today()]);
  summary.addRow([]);

  const countsHeader = summary.addRow(['Status', 'Count']);
  countsHeader.font = { bold: true };
  for (const status of STATUSES) {
    summary.addRow([status, rows.filter((r) => r.status === status).length]);
  }
  const other = rows.filter((r) => !STATUSES.includes(r.status));
  if (other.length) summary.addRow(['(unrecognised status)', other.length]);
  const totalRow = summary.addRow(['Total', rows.length]);
  totalRow.font = { bold: true };

  summary.addRow([]);
  const bySheetHeader = summary.addRow(['Screen/Service', 'Cases']);
  bySheetHeader.font = { bold: true };
  for (const sheet of caseSheets(wb)) {
    summary.addRow([sheet.name, rows.filter((r) => r._sheet === sheet.name).length]);
  }

  summary.addRow([]);
  summary.addRow(['Maintained by', '_tools/case-register.mjs — see _config/case-register.md']);
  summary.addRow(['Do not hand-edit', 'Counts are recomputed on every write.']);
}

async function save(wb, product, path) {
  rebuildSummary(wb, product);
  mkdirSync(dirname(path), { recursive: true });
  await wb.xlsx.writeFile(path);
}

// ── Commands ───────────────────────────────────────────────────────────────
async function cmdInit(product, args) {
  const prefixIdx = args.indexOf('--prefix');
  const prefix = prefixIdx !== -1 ? args[prefixIdx + 1] : undefined;
  if (!prefix) {
    bail(
      'init requires --prefix',
      'e.g. node _tools/case-register.mjs init example-product --prefix EX',
    );
  }
  if (!/^[A-Z][A-Z0-9]*$/.test(prefix)) {
    bail(
      `invalid prefix "${prefix}" — use upper-case letters and digits, starting with a letter`,
      'The prefix becomes the case ID stem, e.g. EX -> EX-TC-0001.',
    );
  }

  const path = registryPath(product);
  if (existsSync(path)) {
    decide([
      'case-register: ALREADY EXISTS',
      `  Register: ${REGISTRY_DIR}/${product}.xlsx`,
      '  init never overwrites an existing register — it is the system of record.',
      '  Delete it deliberately first if you really mean to start over.',
    ]);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ICM case-register';
  wb.created = new Date(0); // fixed, so an init produces a byte-stable workbook

  // A Summary sheet plus one starter case sheet. One sheet per screen/area for
  // UI products, per service for API products — `append` creates them on demand.
  const summaryStub = wb.addWorksheet(SUMMARY_SHEET);
  summaryStub.columns = [{ width: 22 }, { width: 40 }];
  summaryStub.addRow(['Case ID prefix', prefix]);

  await save(wb, product, path);

  console.log('case-register: CREATED');
  console.log(`  Register:  ${REGISTRY_DIR}/${product}.xlsx`);
  console.log(`  Prefix:    ${prefix}  (case IDs will be ${prefix}-TC-0001, ${prefix}-TC-0002, ...)`);
  console.log(`  Sheets:    ${SUMMARY_SHEET} (case sheets are created by append)`);
  console.log('  Commit it — the register is tracked, not scratch.');
}

async function cmdAppend(product, casesPath) {
  if (!casesPath) bail('append requires a cases JSON file', 'node _tools/case-register.mjs append <product> <cases.json>');
  if (!existsSync(casesPath)) bail(`cases file not found — ${casesPath}`);

  let incoming;
  try {
    incoming = JSON.parse(readFileSync(casesPath, 'utf8'));
  } catch (err) {
    bail(`cases file is not valid JSON — ${err.message}`);
  }
  if (!Array.isArray(incoming)) bail('expected a JSON array of cases');
  if (incoming.length === 0) bail('cases file holds no cases');

  const { wb, path } = await loadWorkbook(product);
  const prefix = getPrefix(wb);
  if (!prefix) {
    bail(
      `register for "${product}" records no Case ID prefix`,
      'The Summary sheet must carry a "Case ID prefix" row. Re-run init on a fresh register.',
    );
  }

  const existing = readRows(wb);
  const existingIds = new Set(existing.map((r) => r.caseId));

  // Duplicate detection runs before anything is written, so a rejected batch
  // leaves the register exactly as it was rather than half-appended.
  const explicitIds = incoming.map((c) => (c.case_id ?? c.id ?? '').trim()).filter(Boolean);
  const collisions = explicitIds.filter((id) => existingIds.has(id));
  if (collisions.length) {
    decide([
      'case-register: DUPLICATE CASE ID',
      `  Register: ${REGISTRY_DIR}/${product}.xlsx`,
      ...collisions.map((id) => `  Already present: ${id}`),
      '  Nothing was written. Remove the duplicates from the input, or use',
      '  update-status if you meant to change an existing case.',
    ]);
  }
  const dupesWithinBatch = explicitIds.filter((id, i) => explicitIds.indexOf(id) !== i);
  if (dupesWithinBatch.length) {
    decide([
      'case-register: DUPLICATE CASE ID WITHIN THE INPUT',
      ...[...new Set(dupesWithinBatch)].map((id) => `  Appears more than once: ${id}`),
      '  Nothing was written.',
    ]);
  }

  // Sequence continues from the highest existing number for this prefix. Reusing
  // a freed number would point two different cases at one ID over the register's
  // lifetime, and every downstream reference is by ID.
  const idPattern = new RegExp(`^${prefix}-TC-(\\d+)$`);
  let next = existing.reduce((max, r) => {
    const m = idPattern.exec(r.caseId);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const written = [];
  for (const c of incoming) {
    const screenService = String(c.screen ?? c.service ?? c.folder ?? '').trim();
    if (!screenService) {
      bail(
        `case "${c.title ?? c.summary ?? '(untitled)'}" has no screen/service`,
        'Every case needs a screen (UI) or service (API) — it selects the sheet it lands on.',
      );
    }
    const title = String(c.title ?? c.summary ?? '').trim();
    if (!title) bail('every case needs a title', 'Set "title" (or "summary") on each case.');

    const caseId = (c.case_id ?? c.id ?? '').trim() || `${prefix}-TC-${String(++next).padStart(4, '0')}`;

    const sheet = ensureCaseSheet(wb, screenService);
    const hm = assertHeaders(sheet);
    writeRow(sheet, hm, nextDataRow(sheet, hm), {
      caseId,
      title,
      screenService,
      type: String(c.type ?? '').trim(),
      priority: String(c.priority ?? '').trim(),
      preconditions: String(c.preconditions ?? c.precondition ?? '').trim(),
      steps: String(c.steps ?? c.step_summary ?? '').trim(),
      testData: String(c.test_data ?? c.testData ?? '').trim(),
      expectedResult: String(c.expected_result ?? c.expectedResult ?? '').trim(),
      // Appended cases are always Draft. Status is advanced by update-status at
      // the stage that actually earns the change — never asserted at intake.
      status: 'Draft',
      sourceTicket: String(c.source_ticket ?? c.sourceTicket ?? '').trim(),
      automatedSpec: '',
      lastUpdated: today(),
    });
    written.push({ caseId, title, sheet: screenService });
  }

  await save(wb, product, path);

  console.log('case-register: APPENDED');
  console.log(`  Register: ${REGISTRY_DIR}/${product}.xlsx`);
  for (const w of written) console.log(`  + ${w.caseId}  [${w.sheet}]  ${w.title}  (Draft)`);
  console.log(`  ${written.length} case(s) added as Draft.`);
}

async function cmdUpdateStatus(product, caseId, status, args) {
  if (!caseId || !status) {
    bail(
      'update-status requires a case ID and a status',
      'node _tools/case-register.mjs update-status <product> <case-id> <Draft|Approved|Automated> [--spec <path>]',
    );
  }
  if (!STATUSES.includes(status)) {
    bail(`unknown status "${status}"`, `Valid statuses: ${STATUSES.join(', ')}`);
  }
  const specIdx = args.indexOf('--spec');
  const spec = specIdx !== -1 ? args[specIdx + 1] : undefined;
  if (specIdx !== -1 && !spec) bail('--spec was given with no path');
  if (spec && status !== 'Automated') {
    bail(
      `--spec is only meaningful with status Automated (got ${status})`,
      'The spec path records where the automated test landed.',
    );
  }
  if (status === 'Automated' && !spec) {
    decide([
      'case-register: SPEC PATH REQUIRED',
      `  Case ${caseId} cannot be marked Automated without --spec.`,
      '  A case recorded as automated with no spec path claims coverage nobody can find.',
      '  Nothing was written.',
    ]);
  }

  const { wb, path } = await loadWorkbook(product);
  const rows = readRows(wb);
  const target = rows.find((r) => r.caseId === caseId);

  if (!target) {
    decide([
      'case-register: CASE NOT FOUND',
      `  Register: ${REGISTRY_DIR}/${product}.xlsx`,
      `  No case with ID ${caseId}.`,
      `  Known IDs: ${rows.length ? rows.map((r) => r.caseId).join(', ') : '(register is empty)'}`,
      '  Nothing was written.',
    ]);
  }

  const sameStatus = target.status === status;
  const sameSpec = (target.automatedSpec || '') === (spec || '');
  if (sameStatus && sameSpec) {
    decide([
      'case-register: NO CHANGE',
      `  ${caseId} is already ${status}${spec ? ` with spec ${spec}` : ''}.`,
      '  Nothing was written.',
    ]);
  }

  const sheet = wb.getWorksheet(target._sheet);
  const hm = assertHeaders(sheet);
  const row = sheet.getRow(target._row);
  const before = { status: target.status, spec: target.automatedSpec };

  row.getCell(hm['Status']).value = status;
  if (spec) row.getCell(hm['Automated Spec']).value = spec;
  row.getCell(hm['Last Updated']).value = today();
  row.commit();

  await save(wb, product, path);

  console.log('case-register: UPDATED');
  console.log(`  Register: ${REGISTRY_DIR}/${product}.xlsx`);
  console.log(`  ${caseId}  [${target._sheet}]  ${target.title}`);
  console.log(`    Status:         ${before.status || '(blank)'} -> ${status}`);
  if (spec) console.log(`    Automated Spec: ${before.spec || '(blank)'} -> ${spec}`);
  console.log(`    Last Updated:   ${today()}`);
}

async function cmdExport(product, outPath) {
  if (!outPath) bail('export requires an output path', 'node _tools/case-register.mjs export <product> <out.json>');

  const { wb } = await loadWorkbook(product);
  const rows = readRows(wb);
  if (!rows.length) {
    bail(
      `register for "${product}" holds no cases`,
      'Append cases before exporting — an empty export reads downstream as a source with nothing in it.',
    );
  }

  // Each case is emitted in BOTH shapes at once:
  //   - the canonical Stage 01 Mode B `cases[]` fields, so the export drops
  //     straight into an intake with no translation, and
  //   - `key` + a single-element `steps[]`, so _tools/case-hash.mjs can
  //     fingerprint it exactly as it fingerprints a vendor-sourced case.
  // A register row is one case with one aggregate step; seqNo is always 1.
  const cases = rows.map((r) => {
    const notes = [
      r.sourceTicket ? `Source Ticket: ${r.sourceTicket}` : '',
      r.automatedSpec ? `Automated Spec: ${r.automatedSpec}` : '',
      r.lastUpdated ? `Last Updated: ${r.lastUpdated}` : '',
    ].filter(Boolean).join(' | ');

    return {
      // canonical Mode B case fields
      id: r.caseId,
      case_id: r.caseId,
      summary: r.title,
      folder: r.screenService,
      type: r.type,
      type_prefix: r.type && r.type.includes('/') ? r.type : 'none',
      priority: r.priority,
      precondition: r.preconditions,
      step_summary: r.steps,
      test_data: r.testData,
      expected_result: r.expectedResult,
      status: r.status,
      notes,
      // case-hash.mjs input shape
      key: r.caseId,
      steps: [
        {
          seqNo: 1,
          stepDetails: r.steps,
          testData: r.testData,
          expectedResult: r.expectedResult,
        },
      ],
    };
  });

  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(resolve(outPath), `${JSON.stringify(cases, null, 2)}\n`, 'utf8');

  const byStatus = STATUSES.map((s) => `${s}: ${cases.filter((c) => c.status === s).length}`).join('  ');
  console.log('case-register: EXPORTED');
  console.log(`  Register: ${REGISTRY_DIR}/${product}.xlsx`);
  console.log(`  Output:   ${outPath}`);
  console.log(`  Cases:    ${cases.length}   (${byStatus})`);
  console.log('  Shape:    canonical Mode B cases[] + case-hash.mjs input (key + steps[])');
}

// ── Entry ──────────────────────────────────────────────────────────────────
const [command, product, ...rest] = process.argv.slice(2);

if (!command) {
  bail('no command given', 'Commands: init, append, update-status, export');
}
if (!product) {
  bail(`"${command}" requires a product`, 'e.g. node _tools/case-register.mjs export example-product out.json');
}

switch (command) {
  case 'init':
    await cmdInit(product, rest);
    break;
  case 'append':
    await cmdAppend(product, rest[0]);
    break;
  case 'update-status':
    await cmdUpdateStatus(product, rest[0], rest[1], rest);
    break;
  case 'export':
    await cmdExport(product, rest[0]);
    break;
  default:
    bail(`unknown command "${command}"`, 'Commands: init, append, update-status, export');
}
