// Proves the "run the lab's TSX live" half: take the repo's real demo lab sources as strings, transform them with sucrase
// (typescript + jsx + imports), evaluate with new Function, with `require` answering 'react' and 'godot-react-ui' from the real modules,
// and render the exported component through our renderer. Also times sucrase on a 1,000 line file.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/live-lab-eval.tsx
import fs from 'node:fs';
import path from 'node:path';
import * as React from 'react';
import { transform } from 'sucrase';
import * as ui from '../../../src';
import { mountInput } from './lib/mount-input';
import { sampleWholeFiles } from './lib/sample';

const demoDir = path.join(__dirname, '../../../demo/src');

function evaluate(source: string): Record<string, unknown> {
  const { code } = transform(source, { transforms: ['typescript', 'jsx', 'imports'], production: true });
  const exports: Record<string, unknown> = {};
  const requireModule = (name: string): unknown => {
    if (name === 'react') return React;
    if (name === 'godot-react-ui') return ui;
    throw new Error(`live eval: no module "${name}" in scope`);
  };
  new Function('require', 'exports', 'React', code)(requireModule, exports, React);
  return exports;
}

async function main() {
  const labs: Array<[file: string, exportName: string]> = [
    ['forms-lab.tsx', 'FormsLab'], ['motion-lab.tsx', 'MotionLab'], ['selection-lab.tsx', 'SelectionLab'],
    ['scroll-lab.tsx', 'ScrollLab'], ['positioning-lab.tsx', 'PositioningLab'], ['pointer-lab.tsx', 'PointerLab'],
  ];
  for (const [file, exportName] of labs) {
    const source = fs.readFileSync(path.join(demoDir, file), 'utf8');
    try {
      const t0 = performance.now();
      const exported = evaluate(source);
      const evalMs = performance.now() - t0;
      const Component = exported[exportName] as React.ComponentType;
      if (typeof Component !== 'function') { console.log(file, 'no export', exportName, 'exports:', Object.keys(exported).join(',')); continue; }
      const m = await mountInput(React.createElement(Component));
      console.log(`${file.padEnd(22)} ${source.split('\n').length} lines: transform+eval ${evalMs.toFixed(1)} ms -> nodes ${m.nodes().length}, root errors ${m.errors.length}${m.errors[0] ? ' (' + m.errors[0].message.slice(0, 90) + ')' : ''}`);
      m.unmount();
    } catch (error) {
      console.log(file.padEnd(22), 'THREW', (error as Error).message.split('\n')[0]);
    }
  }
  const big = sampleWholeFiles(1000);
  for (let i = 0; i < 3; i += 1) {
    const t = performance.now();
    transform(big, { transforms: ['typescript', 'jsx'], production: true });
    console.log(`sucrase typescript+jsx, ${big.split('\n').length} lines, whole demo files (run ${i + 1}): ${(performance.now() - t).toFixed(1)} ms`);
  }
}
main();
