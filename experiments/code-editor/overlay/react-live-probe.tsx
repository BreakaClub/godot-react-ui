// Proves which parts of react-live 5 run with no DOM and render through our renderer:
//  1. generateElement (sucrase transform + new Function) with View/Text/Button as scope -> renders; hooks and a click work.
//  2. LiveProvider + LivePreview(Component=View) driven by the provider's effect (the full "live" loop) -> renders; code change re-renders.
//  3. noInline mode (renderElementAsync) with `render(<App/>)`.
//  4. error paths: a syntax error and a runtime throw, read through LiveContext because LiveError renders a DOM <pre>.
//  5. LiveError and LiveEditor as shipped -> what throws.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/react-live-probe.tsx
import { createElement as h, useContext } from 'react';
import { LiveContext, LiveError, LiveEditor, LivePreview, LiveProvider, generateElement } from 'react-live';
import { Button, Text, View } from '../../../src';
import { mountInput } from './lib/mount-input';

const scope = { View, Text, Button };

const COUNTER = `
const Counter = () => {
  const [count, setCount] = React.useState(0);
  return (
    <View style={{ padding: 8 }}>
      <Text style={{ color: '#ff8800' }}>Count: {count}</Text>
      <Button onClick={() => setCount(count + 1)}><Text>Add</Text></Button>
    </View>
  );
};
render(<Counter />);
`;

// Inline mode is ONE expression (react-live wraps it in `return (...)` BEFORE the TypeScript pass, generateElement in dist/index.js),
// so a leading `type` or `const` statement is a syntax error; use noInline + render() for a program. Type assertions inside the expression are fine.
const INLINE_TS = `<View><Text>{('typed' as string)}</Text></View>`;
const INLINE_STATEMENTS = `
type Props = { label: string };
const label: string = 'typed';
<View><Text>{label}</Text></View>
`;

function Errors() {
  const { error } = useContext(LiveContext) as { error?: string };
  return error ? h(Text, { style: { color: '#ff0000' } }, error) : null;
}

async function attempt(label: string, body: () => Promise<void>) {
  console.log(`--- ${label}`);
  try { await body(); } catch (error) { console.log('THREW:', (error instanceof Error ? error.message : String(error)).split('\n')[0]); }
}

async function main() {
  await attempt('1. generateElement + scope, TypeScript annotations in the code string', async () => {
    const Boundary = generateElement({ code: INLINE_TS, scope }, (e: Error) => console.log('errorCallback', e.message));
    const m = await mountInput(h(Boundary));
    console.log(m.outline(), '\nerrors', m.errors.length);
    m.unmount();
  });

  await attempt('1b. generateElement with leading statements (inline mode is one expression)', async () => {
    const Boundary = generateElement({ code: INLINE_STATEMENTS, scope }, () => {});
    const m = await mountInput(h(Boundary));
    console.log(m.outline());
    m.unmount();
  });

  await attempt('2. LiveProvider + LivePreview(Component=View), code with a hook and a click', async () => {
    const code = `() => { const [n, setN] = React.useState(1); return <View><Text>n={n}</Text><Button onClick={() => setN(n + 1)}><Text>+</Text></Button></View>; }`;
    const m = await mountInput(h(LiveProvider, { code, scope, noInline: false }, h(LivePreview, { Component: View }), h(Errors)));
    console.log(m.outline());
    const button = m.nodes().find((n) => n.kind === 'button');
    if (button) await m.click(button.id);
    console.log('after click:\n' + m.outline());
    // Change the code: this is what the editor's onChange does.
    await m.render(h(LiveProvider, { code: code.replace('n={n}', 'count={n}'), scope }, h(LivePreview, { Component: View }), h(Errors)));
    console.log('after code change:\n' + m.outline(), '\nerrors', m.errors.length);
    m.unmount();
  });

  await attempt('3. noInline: render(<Counter/>) with a click', async () => {
    const m = await mountInput(h(LiveProvider, { code: COUNTER, scope, noInline: true }, h(LivePreview, { Component: View }), h(Errors)));
    console.log(m.outline());
    const button = m.nodes().find((n) => n.kind === 'button');
    if (button) await m.click(button.id);
    console.log('after click:\n' + m.outline());
    m.unmount();
  });

  await attempt('4a. syntax error in the code string', async () => {
    const m = await mountInput(h(LiveProvider, { code: '<View><Text>oops</View>', scope }, h(LivePreview, { Component: View }), h(Errors)));
    console.log(m.outline());
    m.unmount();
  });
  await attempt('4b. runtime throw while rendering the user code', async () => {
    const m = await mountInput(h(LiveProvider, { code: '() => { throw new Error("boom in user code"); }', scope }, h(LivePreview, { Component: View }), h(Errors)));
    console.log(m.outline() || '(empty)', '\nroot errors', m.errors.map((e) => e.message));
    m.unmount();
  });
  await attempt('4c. user code uses an unknown className (our compiler throws at commit)', async () => {
    const m = await mountInput(h(LiveProvider, { code: '<View className="nope-nope"><Text>x</Text></View>', scope }, h(LivePreview, { Component: View }), h(Errors)));
    console.log(m.outline() || '(empty)', '\nroot errors', m.errors.map((e) => e.message));
    m.unmount();
  });

  await attempt('5a. LiveError as shipped (renders a DOM <pre>)', async () => {
    const m = await mountInput(h(LiveProvider, { code: '<View><Text>oops</View>', scope }, h(LiveError)));
    console.log(m.outline());
    m.unmount();
  });
  await attempt('5b. LiveEditor as shipped (div > Highlight > pre + useEditable)', async () => {
    const m = await mountInput(h(LiveProvider, { code: '<View/>', scope }, h(LiveEditor)));
    console.log(m.outline());
    m.unmount();
  });
}
main();
