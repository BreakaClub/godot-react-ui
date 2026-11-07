// Registry facts for each candidate: latest version, licence, publish dates, weekly downloads, install footprint and the
// peer/runtime dependencies that tell whether a package is DOM bound. Reads the public npm registry; installs nothing.
// Run: node scripts/registry-facts.mjs > facts/registry-facts.json
const PACKAGES = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [
  // CodeMirror 6, by layer
  '@codemirror/state', '@codemirror/view', '@codemirror/language', '@codemirror/commands', '@codemirror/autocomplete',
  '@codemirror/lint', '@codemirror/search', '@codemirror/lang-javascript', '@lezer/javascript', '@lezer/highlight',
  '@lezer/common', '@lezer/lr', '@uiw/react-codemirror', 'style-mod', 'crelt', 'w3c-keyname',
  // textarea plus overlay, highlighters, live
  'react-simple-code-editor', '@uiw/react-textarea-code-editor', 'prism-react-renderer', 'react-syntax-highlighter',
  'react-live', 'use-editable', 'sucrase', 'prismjs', 'highlight.js', 'shiki', 'prism-code-editor', 'react-ace', 'ace-builds',
  // Monaco, Lexical, Slate, ProseMirror
  'monaco-editor', '@monaco-editor/react', '@monaco-editor/loader',
  'lexical', '@lexical/headless', '@lexical/code', '@lexical/react',
  'slate', 'slate-react', 'prosemirror-state', 'prosemirror-model', 'prosemirror-view',
  // virtualisation
  '@tanstack/react-virtual', '@tanstack/virtual-core', '@legendapp/list', '@shopify/flash-list', 'react-window',
  'react-virtuoso', 'recyclerlistview', '@react-native/virtualized-lists',
];

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) return { error: `${response.status} ${url}` };
  return response.json();
}

const rows = [];
for (const name of PACKAGES) {
  const encoded = name.replace('/', '%2f');
  const [meta, downloads] = await Promise.all([
    json(`https://registry.npmjs.org/${encoded}`),
    json(`https://api.npmjs.org/downloads/point/last-week/${name}`),
  ]);
  if (meta.error) { rows.push({ name, error: meta.error }); continue; }
  const latest = meta['dist-tags'].latest;
  const version = meta.versions[latest];
  const times = meta.time;
  rows.push({
    name, latest, license: version.license ?? meta.license ?? null,
    published: times[latest], created: times.created,
    versions: Object.keys(meta.versions).length,
    weeklyDownloads: downloads.downloads ?? null,
    unpackedSize: version.dist?.unpackedSize ?? null,
    dependencies: Object.keys(version.dependencies ?? {}),
    peerDependencies: version.peerDependencies ?? {},
    type: version.type ?? null,
    sideEffects: version.sideEffects ?? null,
    deprecated: version.deprecated ?? null,
  });
}
console.log(JSON.stringify(rows, null, 2));
