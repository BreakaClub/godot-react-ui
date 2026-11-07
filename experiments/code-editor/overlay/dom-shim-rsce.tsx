// Runs react-simple-code-editor UNMODIFIED through the generic DOM shim (lib/dom-shim.ts, wired by lib/install-shim.ts as a bundler-style alias
// of `react` for that package only), with a prism-react-renderer-driven ReactNode highlighter, then drives it: type, Tab, Enter, undo.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/dom-shim-rsce.tsx
import { createElement as h, useState } from 'react';
import { installShim } from './lib/install-shim';
import { shimLog } from './lib/dom-shim';
installShim(['react-simple-code-editor']);
// Imported AFTER the alias is installed so the library's require('react') is intercepted.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Editor = require('react-simple-code-editor').default as typeof import('react-simple-code-editor').default;
import { Prism, themes } from 'prism-react-renderer';
import { mountInput } from './lib/mount-input';
import { rejectedStyleKeys } from './lib/native-style-check';

const theme = themes.vsDark;
function highlight(code: string) {
  const tokens = Prism.tokenize(code, Prism.languages.tsx);
  const visit = (token: unknown, key: number): unknown => {
    if (typeof token === 'string') return token;
    const t = token as { type: string; content: unknown; alias?: string | string[] };
    const style = theme.styles.find((entry) => entry.types.includes(t.type))?.style;
    const content = Array.isArray(t.content) ? t.content.map(visit) : typeof t.content === 'string' ? t.content : visit(t.content, 0);
    return h('span', { key, style }, content as never);
  };
  return tokens.map(visit) as never;
}

function App({ initial }: { initial: string }) {
  const [code, setCode] = useState(initial);
  return h(Editor, { value: code, onValueChange: setCode, highlight, padding: 8, style: { fontSize: 14, color: '#d4d4d4', backgroundColor: '#1e1e1e' }, testID: 'editor' } as never);
}

// react-simple-code-editor's documented default is a highlighter that returns an HTML STRING (Prism's `highlight`), which it puts in the <pre>
// with dangerouslySetInnerHTML. The shim cannot honour that, drops it, and the only thing left on screen is the textarea, whose text the
// library made transparent.
async function stringHighlighterCase() {
  const m = await mountInput(h(Editor, { value: 'const a = 1;', onValueChange: () => {}, highlight: (c: string) => c.replace(/</g, '&lt;') } as never));
  const texts = m.nodes().filter((n) => n.kind === 'text' && n.text !== '');
  const field = m.nodes().find((n) => n.kind === 'textinput');
  const layers = (field?.props.style as { layers: Array<{ style: Record<string, unknown> }> } | undefined)?.layers ?? [];
  console.log('--- string-returning highlighter (the library default):');
  console.log(m.outline());
  console.log(`Text nodes with any text: ${texts.length}; textinput text colour = ${String(layers[0]?.style.color)} -> the editor shows NOTHING, with root errors ${m.errors.length}`);
  m.unmount();
}

async function main() {
  await stringHighlighterCase();
  shimLog.clear();
  const initial = 'const a = 1;\nfunction f() {\n  return a;\n}';
  const m = await mountInput(h(App, { initial }));
  console.log('--- mounted; root errors:', m.errors.map((e) => e.message));
  console.log(m.outline());
  const nodes = m.nodes();
  console.log('kinds:', nodes.reduce<Record<string, number>>((acc, n) => ({ ...acc, [n.kind]: (acc[n.kind] ?? 0) + 1 }), {}));
  const input = nodes.find((n) => n.kind === 'textinput');
  console.log('native would reject style keys:', Object.fromEntries(rejectedStyleKeys(nodes)));
  if (input) {
    console.log('textinput props:', JSON.stringify(Object.fromEntries(Object.entries(input.props).filter(([k]) => k !== 'style'))));
    console.log('textinput style layers:', JSON.stringify((input.props.style as { layers: unknown[] }).layers));
    const state = () => { const s = m.host.textInputs.get(input.id); return s ? `value=${JSON.stringify(s.value)} sel=${s.selectionStart}-${s.selectionEnd}` : '?'; };
    console.log('native text before:', state());
    try {
      m.host.focused = input.id;
      await m.type(input.id, 'x');
      console.log('after typing "x" at the end:  ', state());
      console.log('highlighted text (Text nodes):', JSON.stringify(m.nodes().filter((n) => n.kind === 'text').map((n) => n.text).join('')));
      // Tab with a selection at the start: rsce indents lines through ref assignments.
      m.host.select(m.root, input.id, 0, 5);
      const down = m.host.keyDown(m.root, 'Tab');
      await m.settle();
      console.log('Tab with selection 0..5: prevented =', down.prevented, '|', state());
      console.log('Text nodes now:', JSON.stringify(m.nodes().filter((n) => n.kind === 'text').map((n) => n.text).join('')));
      m.host.select(m.root, input.id, 12, 12);
      const enter = m.host.keyDown(m.root, 'Enter');
      await m.settle();
      console.log('Enter at 12 (end of line 1, no indent): prevented =', enter.prevented, '|', state());
      const undo = m.host.keyDown(m.root, 'z', { metaKey: true });
      await m.settle();
      console.log('Cmd+Z: prevented =', undo.prevented, '|', state(), '(rsce checks navigator.platform at import, so Mac-like detection is false here and it expects Ctrl+Z)');
      const undo2 = m.host.keyDown(m.root, 'z', { ctrlKey: true });
      await m.settle();
      console.log('Ctrl+Z: prevented =', undo2.prevented, '|', state());
    } catch (error) {
      console.log('driving the editor THREW:', (error as Error).message.split('\n')[0]);
    }
  }
  console.log('root errors after driving:', m.errors.map((e) => e.message));
  console.log('--- shim log (what it dropped / approximated, count):');
  for (const [what, count] of shimLog) console.log(`  ${String(count).padStart(4)}  ${what}`);
  m.unmount();
}
main();
