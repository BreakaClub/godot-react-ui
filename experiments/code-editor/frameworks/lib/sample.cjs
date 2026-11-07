// A ~1,000-line TSX file made from this repository's own sources (deterministic), shared by the tokeniser probes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..', '..', '..');
const files = ['demo/src/filters-lab.tsx', 'src/kit/select.tsx', 'src/components.tsx'];
const lines = files.flatMap((file) => fs.readFileSync(path.join(root, file), 'utf8').split('\n')).slice(0, 1000);
exports.sampleText = lines.join('\n');
exports.sampleLines = lines;
