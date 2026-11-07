// Proves how prism-react-renderer's display half maps onto View/Text (no DOM involved), and what it costs:
// output shape, node count per line, commit bytes, what styles had to be dropped, and the cost of 500 / 1,000 line files
// plus one keystroke re-render, naive vs. with a memoised line component and adjacent same-colour runs merged.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/prism-render.tsx
import { createElement as h, memo, type CSSProperties } from 'react';
import { Highlight, themes, Prism } from 'prism-react-renderer';
import type { PrismTheme } from 'prism-react-renderer';
import { Text, View } from '../../../src';
import type { Style } from '../../../src/types';
import { mount } from '../harness/host';
import { toHex } from './lib/css-colour';
import { sample } from './lib/sample';

const dropped = new Map<string, number>();
const count = (key: string) => dropped.set(key, (dropped.get(key) ?? 0) + 1);

/** CSS inline style from the library -> our `Style`. Everything not representable is counted in `dropped`. */
function toStyle(css: CSSProperties | undefined): Style {
  const style: Style = {};
  for (const [key, value] of Object.entries(css ?? {})) {
    if (value === undefined) continue;
    if (key === 'color' || key === 'backgroundColor') {
      const hex = toHex(String(value));
      if (hex === undefined) count(`${key}:unparseable(${String(value)})`);
      else style[key] = hex;
    } else if (key === 'opacity') {
      style.opacity = Number(value);
    } else {
      count(`${key}=${String(value).slice(0, 24)}`);
    }
  }
  return style;
}

interface Run { readonly text: string; readonly color: string | undefined }

// Naive mapping: one View per line, one Text per token, exactly what the render props hand out.
function naive(source: string, theme: PrismTheme) {
  return h(Highlight, { theme, code: source, language: 'tsx' }, ({ style, tokens, getLineProps, getTokenProps }) =>
    h(View, { style: toStyle(style) },
      tokens.map((line, lineIndex) =>
        h(View, { key: lineIndex, style: { flexDirection: 'row', ...toStyle(getLineProps({ line }).style) } },
          line.map((token, tokenIndex) => {
            const props = getTokenProps({ token });
            return h(Text, { key: tokenIndex, style: toStyle(props.style) }, props.children);
          })))));
}

// Better mapping: drop the empty trailing token every line carries, merge neighbours that resolve to the same colour,
// and memoise each line on its content signature so a keystroke only re-renders the changed line.
const LineView = memo(function LineView({ runs }: { readonly runs: readonly Run[] }) {
  return h(View, { style: { flexDirection: 'row' } },
    runs.map((run, index) => h(Text, { key: index, style: run.color === undefined ? undefined : { color: run.color as `#${string}` } }, run.text)));
}, (a, b) => a.runs.length === b.runs.length && a.runs.every((run, index) => run.text === b.runs[index].text && run.color === b.runs[index].color));

function merged(source: string, theme: PrismTheme) {
  return h(Highlight, { theme, code: source, language: 'tsx' }, ({ style, tokens, getTokenProps }) =>
    h(View, { style: toStyle(style) },
      tokens.map((line, lineIndex) => {
        const runs: Run[] = [];
        for (const token of line) {
          const props = getTokenProps({ token });
          const text = String(props.children);
          if (text === '') continue;
          const color = toStyle(props.style).color;
          const last = runs[runs.length - 1];
          if (last !== undefined && last.color === color) runs[runs.length - 1] = { text: last.text + text, color };
          else runs.push({ text, color });
        }
        return h(LineView, { key: lineIndex, runs });
      })));
}

async function timed(label: string, make: (source: string) => ReturnType<typeof naive>, lineCount: number) {
  const source = sample(lineCount);
  const mountTimes: number[] = [];
  const editTimes: number[] = [];
  let nodeCount = 0;
  let bytes = 0;
  let editBytes = 0;
  for (let run = 0; run < 4; run += 1) { // run 0 warms the JIT and is not counted
    const t0 = performance.now();
    const rendered = await mount(make(source));
    const mountMs = performance.now() - t0 - 20; // minus the harness's 4 x 5 ms settle
    nodeCount = rendered.nodes().length;
    bytes = rendered.commitBytes();
    const before = rendered.host.commits.length;
    const index = 200 + run * 7;
    const edited = source.slice(0, index) + 'x' + source.slice(index);
    const t1 = performance.now();
    await rendered.render(make(edited));
    const editMs = performance.now() - t1 - 20;
    editBytes = rendered.host.commits.slice(before).reduce((total, commit) => total + JSON.stringify(commit.payload).length, 0);
    if (run > 0) { mountTimes.push(mountMs); editTimes.push(editMs); }
    rendered.unmount();
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)].toFixed(0);
  console.log(`${label.padEnd(8)} ${String(lineCount).padStart(4)} lines: nodes ${nodeCount}, mount commit bytes ${bytes}, mount ${median(mountTimes)} ms, one-char edit re-render ${median(editTimes)} ms, edit commit bytes ${editBytes}`);
}

async function main() {
  const small = sample(40);
  const smallRendered = await mount(naive(small, themes.vsDark));
  console.log('--- 40 lines, vsDark, naive mapping: first 14 outline rows');
  console.log(smallRendered.outline().split('\n').slice(0, 14).join('\n'));
  const nodes = smallRendered.nodes();
  const textNodes = nodes.filter((node) => node.kind === 'text');
  const lineViews = nodes.filter((node) => node.kind === 'view').length - 1;
  console.log(`nodes=${nodes.length} text=${textNodes.length} empty text nodes=${textNodes.filter((n) => n.text === '').length} line views=${lineViews} text nodes per line=${(textNodes.length / lineViews).toFixed(1)}`);
  console.log('commits=', smallRendered.host.commits.length, 'commit bytes=', smallRendered.commitBytes(), 'bytes per text node=', Math.round(smallRendered.commitBytes() / textNodes.length), 'errors=', smallRendered.errors.length);
  console.log('first three Text style payloads:', textNodes.slice(0, 3).map((node) => JSON.stringify(node.props.style ?? node.style)).join('  '));
  console.log('library style entries that had no equivalent (key=value: count):', Object.fromEntries(dropped));
  smallRendered.unmount();

  const mergedRendered = await mount(merged(small, themes.vsDark));
  const mergedText = mergedRendered.nodes().filter((node) => node.kind === 'text');
  console.log(`--- 40 lines, merged mapping: nodes=${mergedRendered.nodes().length} text=${mergedText.length} (${(mergedText.length / 40).toFixed(1)} per line) commit bytes=${mergedRendered.commitBytes()}`);
  mergedRendered.unmount();

  dropped.clear();
  for (const lineCount of [500, 1000]) {
    await timed('naive', (s) => naive(s, themes.vsDark), lineCount);
    await timed('merged', (s) => merged(s, themes.vsDark), lineCount);
  }

  const big = sample(1000);
  const t2 = performance.now();
  const tokens = Prism.tokenize(big, Prism.languages.tsx);
  console.log(`--- Prism.tokenize alone, 1000 lines tsx (cold): ${(performance.now() - t2).toFixed(1)} ms, top-level tokens ${tokens.length}`);
}
main();
