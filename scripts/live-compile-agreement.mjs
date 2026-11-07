// Does Bun's checker report what `tsc` reports? Checks every lab of the live project (demo/live-compile/project.json) and a
// set of edits that break one, with both, and compares the diagnostics (docs/tracks/live-compile.md).
//
//   node scripts/live-compile-agreement.mjs [--cli=<path>]
//
// Bun's checker runs in `live-compile-cli` (the native process the build writes to live-compile/target/release); `tsc` is the
// repository's TypeScript, on the same files written to artifacts/live-compile-agreement/. They differ in their standard
// library (TypeScript 7.0.2's against 5.9.3's), which is why a message is compared by its code and position, and its text is
// compared and reported but is not the verdict.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { rejectUnknownArguments } from './arguments.mjs';
import { INPUTS_LAB_PATH, SYNTAX_ERROR, THROW_IN_MODULE, THROW_IN_RENDER, TYPE_ERROR, HOOK_ORDER, RECOLOUR, anchorOffset, applyEdits } from './live-compile-edits.mjs';

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--cli='] });
const root = path.resolve(import.meta.dirname, '..');
const cli = process.argv.find(argument => argument.startsWith('--cli='))?.slice('--cli='.length)
  ?? path.join(root, 'live-compile/target/release/live-compile-cli');
const project = JSON.parse(readFileSync(path.join(root, 'demo/live-compile/project.json'), 'utf8'));
const workDir = path.join(root, 'artifacts/live-compile-agreement/project');

/** A client of the CLI's framing: a 4-byte little-endian length and that many bytes of JSON, both ways. */
class Cli {
  constructor(binary) {
    this.child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.buffered = Buffer.alloc(0);
    this.waiting = [];
    this.child.stdout.on('data', chunk => {
      this.buffered = Buffer.concat([this.buffered, chunk]);
      while (this.buffered.length >= 4 && this.buffered.length >= 4 + this.buffered.readUInt32LE(0)) {
        const length = this.buffered.readUInt32LE(0);
        const frame = this.buffered.subarray(4, 4 + length);
        this.buffered = this.buffered.subarray(4 + length);
        this.waiting.shift()(JSON.parse(frame.toString('utf8')));
      }
    });
  }

  request(body) {
    const bytes = Buffer.from(JSON.stringify(body));
    const head = Buffer.alloc(4);
    head.writeUInt32LE(bytes.length);
    return new Promise(resolve => {
      this.waiting.push(resolve);
      this.child.stdin.write(Buffer.concat([head, bytes]));
    });
  }

  close() {
    this.child.stdin.end();
  }
}

const compilerOptions = JSON.parse(project.files.find(file => file.path === project.labs.inputs.config).text).compilerOptions;

function writeProject(overrides) {
  rmSync(workDir, { recursive: true, force: true });
  for (const file of project.files) {
    const target = path.join(workDir, file.path.replace(/^\//, ''));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, overrides.get(file.path) ?? file.text);
  }
}

/** `tsc`'s diagnostics for a lab, as { file, start, end, code, text }, sorted as TypeScript sorts them. */
function tscDiagnostics(lab) {
  const config = JSON.parse(project.files.find(file => file.path === lab.config).text);
  const projectDir = path.join(workDir, 'project');
  const { options } = ts.convertCompilerOptionsFromJson(config.compilerOptions, projectDir);
  // The libs are the bundle's TypeScript 7 files in the checker; `tsc` uses its own.
  options.pathsBasePath = projectDir;
  const roots = config.files.map(file => path.join(projectDir, file));
  const program = ts.createProgram(roots, options);
  return ts.sortAndDeduplicateDiagnostics(ts.getPreEmitDiagnostics(program)).map(diagnostic => ({
    file: diagnostic.file ? `/${path.relative(workDir, diagnostic.file.fileName)}` : undefined,
    start: diagnostic.start ?? -1,
    end: (diagnostic.start ?? -1) + (diagnostic.length ?? 0),
    code: diagnostic.code,
    text: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }));
}

function bunDiagnostics(report) {
  return report.diagnostics
    .filter(diagnostic => diagnostic.category === 1)
    .map(diagnostic => ({ file: diagnostic.fileName, start: diagnostic.pos, end: diagnostic.end, code: diagnostic.code, text: diagnostic.messageText }));
}

const key = diagnostic => `${diagnostic.file}:${diagnostic.start}-${diagnostic.end} TS${diagnostic.code}`;

function compare(label, tsc, bun) {
  const tscKeys = new Set(tsc.map(key));
  const bunKeys = new Set(bun.map(key));
  const onlyTsc = tsc.filter(diagnostic => !bunKeys.has(key(diagnostic)));
  const onlyBun = bun.filter(diagnostic => !tscKeys.has(key(diagnostic)));
  const same = tsc.filter(diagnostic => bunKeys.has(key(diagnostic)));
  const textDiffers = same.filter(diagnostic => bun.find(other => key(other) === key(diagnostic)).text !== diagnostic.text);
  return { label, tsc: tsc.length, bun: bun.length, agree: onlyTsc.length === 0 && onlyBun.length === 0, onlyTsc, onlyBun, textDiffers };
}

/** Edits that break a lab: [lab id, file, search, replacement]. */
const MUTATIONS = [
  ['inputs', 'inputs-lab.tsx', "const label = 'text-sm text-slate-700';", "const label: number = 'text-sm text-slate-700';"],
  ['inputs', 'inputs-lab.tsx', '<Text className="text-2xl text-slate-900">Inputs</Text>', '<Text className="text-2xl text-slate-900" bogus={1}>Inputs</Text>'],
  ['inputs', 'inputs-lab.tsx', 'const [reversed, setReversed] = useState(false);', 'const [reversed, setReversed] = useState(false);\n  const unused: string = reversed;'],
  ['inputs', 'inputs-lab.tsx', 'onValueChange={onChange}', 'onValueChange={onChangee}'],
  ['inputs', 'inputs-lab.tsx', "import { useState } from 'react';", "import { useState, useStat } from 'react';"],
  ['inputs', 'inputs-lab.tsx', 'value={state.volume}', 'value={state.volumee}'],
  ['inputs', 'inputs-lab.tsx', 'patch({ subscribe })', 'patch({ subscribe: 1 })'],
  ['glass', 'glass-lab.tsx', 'GlassCard({ index, width, onAdd }', 'GlassCard({ index, width, onAdd, extra }'],
  ['forms', 'forms-lab.tsx', 'export function FormsLab', 'export function FormsLab(extra: number'],
];

/**
 * The `live-compile` section's own edits (scripts/live-compile-edits.mjs): the ones that leave the lab type-correct must leave `tsc` with
 * nothing to say, and the type error must be where the section expects it, in both checkers.
 */
const SECTION_EDITS = [
  ['recolour', applyEdits, RECOLOUR, 0],
  ['hook order', applyEdits, HOOK_ORDER, 0],
  ['throw in render', applyEdits, THROW_IN_RENDER, 0],
  ['throw in module', applyEdits, THROW_IN_MODULE, 0],
];

const cliProcess = new Cli(cli);
const ping = await cliProcess.request({ op: 'ping' });
console.log(`checker: ${ping.name}, Bun ${ping.bunRevision.slice(0, 9)}; tsc ${ts.version}`);
await cliProcess.request({ op: 'setFiles', files: project.files.map(file => ({ path: file.path, text: file.text })) });

const results = [];
async function runLab(id, label, overrides) {
  const lab = project.labs[id];
  if (!lab) throw new Error(`There is no lab ${id}`);
  for (const [file, text] of overrides) await cliProcess.request({ op: 'setFile', path: file, text });
  writeProject(overrides);
  const started = performance.now();
  const reply = await cliProcess.request({ op: 'check', config: lab.config, libDir: project.libDir });
  const bunMs = performance.now() - started;
  if (!reply.ok) throw new Error(`${label}: the check failed: ${JSON.stringify(reply).slice(0, 400)}`);
  const tscStarted = performance.now();
  const tsc = tscDiagnostics(lab);
  const tscMs = performance.now() - tscStarted;
  // Put the original text back for the next case.
  for (const [file] of overrides) await cliProcess.request({ op: 'setFile', path: file, text: project.files.find(entry => entry.path === file).text });
  results.push({ ...compare(label, tsc, bunDiagnostics(reply.report)), bunMs, tscMs, incomplete: reply.report.incomplete });
}

for (const id of Object.keys(project.labs)) await runLab(id, `clean ${id}`, new Map());
for (const [id, file, search, replacement] of MUTATIONS) {
  const original = project.files.find(entry => entry.path === `/project/lab/${file}`).text;
  if (!original.includes(search)) throw new Error(`The mutation of ${file} finds nothing to replace: ${search}`);
  await runLab(id, `${id}: ${replacement.slice(0, 60).replace(/\n/g, ' ')}`, new Map([[`/project/lab/${file}`, original.replace(search, replacement)]]));
}

for (const [label, apply, edits, expected] of SECTION_EDITS) {
  const original = project.files.find(entry => entry.path === INPUTS_LAB_PATH).text;
  await runLab('inputs', `section edit: ${label}`, new Map([[INPUTS_LAB_PATH, apply(original, edits)]]));
  const last = results.at(-1);
  if (last.tsc !== expected) throw new Error(`The section edit "${label}" is meant to type-check and tsc reports ${last.tsc}`);
}
{
  // The type error is reported where the section expects it, by both.
  const original = project.files.find(entry => entry.path === INPUTS_LAB_PATH).text;
  const edited = applyEdits(original, [TYPE_ERROR]);
  await runLab('inputs', 'section edit: type error', new Map([[INPUTS_LAB_PATH, edited]]));
  const expectedAt = anchorOffset(edited, TYPE_ERROR.anchor);
  writeProject(new Map([[INPUTS_LAB_PATH, edited]]));
  const atAnchor = tscDiagnostics(project.labs.inputs).filter(diagnostic => diagnostic.code === TYPE_ERROR.code && diagnostic.start === expectedAt);
  if (atAnchor.length !== 1) throw new Error(`tsc does not report TS${TYPE_ERROR.code} at offset ${expectedAt} (${TYPE_ERROR.anchor}) in the section's type error`);
  console.log(`section type error: TS${TYPE_ERROR.code} at offset ${expectedAt}, the same in both`);
  // And the syntax error: tsc reports a syntax error at the anchor too.
  const broken = applyEdits(original, [SYNTAX_ERROR]);
  writeProject(new Map([[INPUTS_LAB_PATH, broken]]));
  const syntax = tscDiagnostics(project.labs.inputs);
  const at = anchorOffset(broken, SYNTAX_ERROR.anchor) + SYNTAX_ERROR.anchor.length - 1;
  if (!syntax.some(diagnostic => diagnostic.start === at)) throw new Error(`tsc reports no syntax error at the semicolon (${at}) of the section's broken edit: ${JSON.stringify(syntax.slice(0, 3))}`);
  console.log(`section syntax error: at offset ${at} (the semicolon), as in tsc`);
}

// The compiler's half: every source file of the project compiles, and what it makes is a function body that JavaScript parses.
const compileMs = [];
let compileFailures = 0;
for (const file of project.files.filter(entry => /^\/project\/lab\/.*\.tsx?$/.test(entry.path))) {
  const started = performance.now();
  const reply = await cliProcess.request({ op: 'transpile', path: file.path, source: file.text, refresh: true });
  compileMs.push(performance.now() - started);
  if (!reply.ok) {
    compileFailures += 1;
    console.log(`COMPILE FAILED ${file.path}: ${reply.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`);
    continue;
  }
  try {
    new Function('require', 'exports', 'module', '$RefreshReg$', '$RefreshSig$', reply.code);
  } catch (error) {
    compileFailures += 1;
    console.log(`NOT A FUNCTION BODY ${file.path}: ${error.message}`);
  }
}
cliProcess.close();
compileMs.sort((a, b) => a - b);
console.log(`compiled ${compileMs.length} files, ${compileFailures} failed; per file median ${compileMs[Math.floor(compileMs.length / 2)].toFixed(1)} ms, worst ${compileMs.at(-1).toFixed(1)} ms (through the CLI's pipe)`);

let disagreements = 0;
for (const result of results) {
  const verdict = result.agree ? 'agree' : 'DISAGREE';
  console.log(`${verdict.padEnd(8)} ${result.label.padEnd(72)} tsc ${String(result.tsc).padStart(2)}  bun ${String(result.bun).padStart(2)}  bun ${result.bunMs.toFixed(0)} ms, tsc ${result.tscMs.toFixed(0)} ms${result.textDiffers.length ? `  (${result.textDiffers.length} messages differ in words)` : ''}`);
  if (!result.agree) {
    disagreements += 1;
    for (const diagnostic of result.onlyTsc) console.log(`    only tsc: ${key(diagnostic)} ${diagnostic.text.split('\n')[0]}`);
    for (const diagnostic of result.onlyBun) console.log(`    only bun: ${key(diagnostic)} ${diagnostic.text.split('\n')[0]}`);
  }
  if (result.incomplete?.length) console.log(`    the checker ran out of stack in ${result.incomplete.join(', ')}`);
}
console.log(`live-compile agreement: ${results.length - disagreements} of ${results.length} agree with tsc`);
if (disagreements > 0 || compileFailures > 0) process.exit(1);
