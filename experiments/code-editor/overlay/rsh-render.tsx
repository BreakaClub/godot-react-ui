// Proves how react-syntax-highlighter behaves under our renderer: as is (default renderer, 'pre'/'code'/'span' host types),
// then with a custom `renderer` + PreTag/CodeTag, in both the prism (refractor) and hljs (lowlight) builds, with inline styles on and off.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/rsh-render.tsx
import { createElement as h, type ReactNode } from 'react';
import { Light, Prism, PrismLight } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { atomOneDark } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import tsxPrism from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx';
import tsHljs from 'react-syntax-highlighter/dist/cjs/languages/hljs/typescript';
import { createStyleObject } from 'react-syntax-highlighter/dist/cjs/create-element';
import { Text, View } from '../../../src';
import type { Style } from '../../../src/types';
import { mount } from '../harness/host';
import { toHex } from './lib/css-colour';
import { rejectedStyleKeys } from './lib/native-style-check';
import { sample } from './lib/sample';

PrismLight.registerLanguage('tsx', tsxPrism);
Light.registerLanguage('typescript', tsHljs);

// react-syntax-highlighter's row nodes: { type:'element'|'text', tagName, properties:{className, style}, children, value }
interface Node { type: string; tagName?: string; value?: string; properties?: { className?: string[]; style?: Record<string, unknown> }; children?: Node[] }
const unmapped = new Map<string, number>();
const note = (key: string) => unmapped.set(key, (unmapped.get(key) ?? 0) + 1);

function toStyle(css: Record<string, unknown> | undefined): Style {
  const style: Style = {};
  for (const [key, value] of Object.entries(css ?? {})) {
    if (value === undefined) continue;
    if (key === 'color' || key === 'backgroundColor') {
      const hex = toHex(String(value));
      if (hex === undefined) note(`${key}:unparseable(${String(value)})`);
      else style[key] = hex;
    } else if (key === 'opacity') style.opacity = Number(value);
    else note(`${key}=${String(value).slice(0, 20)}`);
  }
  return style;
}

/**
 * Flatten a row's element tree to runs, taking the colour of the innermost styled ancestor. With useInlineStyles the library does NOT put
 * the theme colour on the row nodes (rows only carry class names); its own createElement resolves class names against `stylesheet`
 * while building DOM elements, so a custom renderer must repeat that lookup with the exported createStyleObject.
 */
function runs(node: Node, inherited: Style, out: { text: string; style: Style }[], stylesheet: Record<string, Record<string, unknown>>, inline: boolean): void {
  if (node.type === 'text') { if (node.value) out.push({ text: node.value, style: inherited }); return; }
  const resolved = inline ? createStyleObject(node.properties?.className ?? [], { ...node.properties?.style }, stylesheet) : node.properties?.style;
  const own = { ...inherited, ...toStyle(resolved) };
  for (const child of node.children ?? []) runs(child, own, out, stylesheet, inline);
}

function renderer({ rows, stylesheet, useInlineStyles }: { rows: Node[]; stylesheet: Record<string, Record<string, unknown>>; useInlineStyles: boolean }): ReactNode {
  return rows.map((row, rowIndex) => {
    const collected: { text: string; style: Style }[] = [];
    runs(row, {}, collected, stylesheet, useInlineStyles);
    return h(View, { key: rowIndex, style: { flexDirection: 'row' } },
      collected.map((run, index) => h(Text, { key: index, style: run.style }, run.text)));
  });
}

// PreTag / CodeTag are given className/style props by the library; both must absorb them.
const Block = ({ style, children }: { style?: Record<string, unknown>; className?: string; children?: ReactNode }) =>
  h(View, { style: toStyle(style) }, children);

async function attempt(label: string, element: Parameters<typeof mount>[0]) {
  console.log(`--- ${label}`);
  try {
    const rendered = await mount(element);
    const nodes = rendered.nodes();
    console.log(rendered.outline().split('\n').slice(0, 7).join('\n'));
    console.log('first 3 text styles:', nodes.filter((n) => n.kind === 'text').slice(0, 3).map((n) => JSON.stringify(n.props.style ?? {})).join(' '));
    console.log(`nodes=${nodes.length} text=${nodes.filter((n) => n.kind === 'text').length} commit bytes=${rendered.commitBytes()} root errors=${rendered.errors.length}`);
    const rejected = rejectedStyleKeys(nodes);
    if (rejected.size) console.log('native would reject style keys:', Object.fromEntries(rejected));
    rendered.unmount();
  } catch (error) {
    console.log('mount threw:', (error instanceof Error ? error.message : String(error)).split('\n')[0]);
  }
}

async function main() {
  const code = sample(40);
  await attempt('prism build, as is (default renderer, PreTag pre, CodeTag code)', h(PrismLight, { language: 'tsx', style: vscDarkPlus }, code));
  await attempt('prism build, PreTag/CodeTag = View, default renderer (spans remain)', h(PrismLight, { language: 'tsx', style: vscDarkPlus, PreTag: Block, CodeTag: Block }, code));
  await attempt('prism build, custom renderer + View tags, useInlineStyles', h(PrismLight, { language: 'tsx', style: vscDarkPlus, PreTag: Block, CodeTag: Block, renderer }, code));
  await attempt('hljs build, custom renderer + View tags, useInlineStyles', h(Light, { language: 'typescript', style: atomOneDark, PreTag: Block, CodeTag: Block, renderer }, code));
  console.log('style entries with no equivalent in Style (key=value: count):', Object.fromEntries(unmapped));
  unmapped.clear();

  // useInlineStyles={false}: only class names are produced; the stylesheet never reaches the renderer's nodes.
  let sawRows: Node[] = [];
  await attempt('prism build, useInlineStyles=false, capture rows', h(PrismLight, {
    language: 'tsx', style: vscDarkPlus, PreTag: Block, CodeTag: Block, useInlineStyles: false,
    renderer: (args: Parameters<typeof renderer>[0]) => { sawRows = args.rows; return renderer(args); },
  }, 'const a = 1;'));
  console.log('rows[0] (class names only, no style) =', JSON.stringify(sawRows[0]).slice(0, 330));
  let inlineRows: Node[] = [];
  await attempt('prism build, useInlineStyles=true, capture rows', h(PrismLight, {
    language: 'tsx', style: vscDarkPlus, PreTag: Block, CodeTag: Block,
    renderer: (args: Parameters<typeof renderer>[0]) => { inlineRows = args.rows; return renderer(args); },
  }, 'const a = 1;'));
  console.log('rows[0] with useInlineStyles=true (rows STILL carry class names only; the colours live in the `stylesheet` renderer argument) =', JSON.stringify(inlineRows[0]).slice(0, 330));

  // Full (non-light) Prism build: all of refractor's grammars.
  const t0 = performance.now();
  await attempt('FULL prism build (all refractor languages), tsx, custom renderer', h(Prism, { language: 'tsx', style: vscDarkPlus, PreTag: Block, CodeTag: Block, renderer }, sample(1000)));
  console.log(`1000 lines through the full Prism build incl. mount: ${(performance.now() - t0).toFixed(0)} ms`);
}
main();
