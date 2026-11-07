// Runs prism-react-renderer's documented DOM-style render-prop usage (pre > div line > span token, className + style, exactly as its README
// writes it) through the generic DOM shim, and compares the node tree with the hand mapping in prism-render.tsx.
// Also tries @uiw/react-textarea-code-editor as is and through the shim.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/dom-shim-prism.tsx
import { createElement as h } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { installShim } from './lib/install-shim';
import { shimCreateElement, shimLog } from './lib/dom-shim';
import { mountInput } from './lib/mount-input';
import { rejectedStyleKeys } from './lib/native-style-check';
import { sample } from './lib/sample';

// The README example, with `h` replaced by the shim's createElement: user code written for the DOM, unmodified apart from that import.
const dom = shimCreateElement;
function viaShim(code: string) {
  return h(Highlight, { theme: themes.vsDark, code, language: 'tsx' }, ({ className, style, tokens, getLineProps, getTokenProps }) =>
    dom('pre', { className, style },
      tokens.map((line, i) => dom('div', { key: i, ...getLineProps({ line }) },
        line.map((token, key) => dom('span', { key, ...getTokenProps({ token }) }))))) as never);
}

async function main() {
  const m = await mountInput(viaShim(sample(40)));
  const text = m.nodes().filter((n) => n.kind === 'text');
  console.log('prism-react-renderer README pattern via shim, 40 lines:');
  console.log(m.outline().split('\n').slice(0, 6).join('\n'));
  console.log(`nodes=${m.nodes().length} text=${text.length} root errors=${m.errors.length} native-rejected style keys=${JSON.stringify(Object.fromEntries(rejectedStyleKeys(m.nodes())))}`);
  console.log('first Text style:', JSON.stringify(text[0]?.props.style));
  console.log('shim log:'); for (const [k, v] of shimLog) console.log(`  ${String(v).padStart(4)}  ${k}`);
  shimLog.clear();
  m.unmount();

  // @uiw/react-textarea-code-editor
  installShim(['@uiw/react-textarea-code-editor']);
  const Uiw = require('@uiw/react-textarea-code-editor').default;
  console.log('\n@uiw/react-textarea-code-editor, THROUGH the shim:');
  try {
    const u = await mountInput(h(Uiw, { value: 'const a = 1;', language: 'tsx' }));
    console.log(u.outline()); console.log('root errors', u.errors.map((e) => e.message));
    console.log('shim log:'); for (const [k, v] of shimLog) if (/innerHTML|textarea|className|WebkitText/.test(k)) console.log(`  ${String(v).padStart(4)}  ${k}`);
    u.unmount();
  } catch (error) { console.log('THREW', (error as Error).message.split('\n')[0]); }
}
main();
