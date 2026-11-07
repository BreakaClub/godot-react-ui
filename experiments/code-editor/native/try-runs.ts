// Node check of src/runs.ts before it goes into GodotJS: run from the worktree root with
//   NODE_PATH=experiments/code-editor/cm/node_modules node_modules/.bin/tsx experiments/code-editor/native/try-runs.ts
import fs from 'node:fs';
import { createState, runsForLines } from './src/runs';

const text = ['demo/src/filters-lab.tsx', 'src/kit/select.tsx'].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const state = createState(text);
const started = performance.now();
const lines = runsForLines(state, 1, state.doc.lines);
console.log('lines', lines.length, 'runs', lines.reduce((count, line) => count + line.length, 0), 'ms', (performance.now() - started).toFixed(1));
console.log(JSON.stringify(lines.slice(0, 3)));
const rebuilt = lines.map((line) => line.map((run) => run.text).join('')).join('\n');
console.log('round trip equal', rebuilt === text);
