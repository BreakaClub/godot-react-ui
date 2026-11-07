// A TSX sample assembled from the repo's own demo/src/*.tsx, so the numbers are for real code of this codebase's style.
import fs from 'node:fs';
import path from 'node:path';

const demoDir = path.join(__dirname, '../../../../demo/src');

/** The first `lineCount` lines of the demo labs concatenated (alphabetical, so it is reproducible). */
export function sample(lineCount: number): string {
  const lines: string[] = [];
  for (const file of fs.readdirSync(demoDir).filter((name) => name.endsWith('.tsx')).sort()) {
    lines.push(...fs.readFileSync(path.join(demoDir, file), 'utf8').split('\n'));
    if (lines.length >= lineCount) break;
  }
  return lines.slice(0, lineCount).join('\n');
}

/** Whole demo files, concatenated until at least `minLines`, so the result still parses as TSX (a cut through a file does not). */
export function sampleWholeFiles(minLines: number): string {
  const parts: string[] = [];
  let lines = 0;
  for (const file of fs.readdirSync(demoDir).filter((name) => name.endsWith('.tsx')).sort()) {
    const text = fs.readFileSync(path.join(demoDir, file), 'utf8');
    parts.push(text);
    lines += text.split('\n').length;
    if (lines >= minLines) break;
  }
  return parts.join('\n');
}
