import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, createRef, Fragment, type ReactNode } from 'react';
import { Button, Text, View, createRoot, type UIHandle } from '../src';
import { diffNativeProps, nativeProps } from '../src/props';
import { flattenRichText, sameSpans, type NativeSpan } from '../src/rich-text';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

function nativeOf(host: RecordingHost, testID: string): { text?: string; spans?: readonly NativeSpan[] } {
  const created = host.commits.flatMap((commit) => commit.payload.created).find((entry) => entry.props.testID === testID);
  assert.ok(created, `${testID} was created`);
  return created.props;
}

function render(children: ReactNode): RecordingHost {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(children);
  return host;
}

test('a nested Text is one host node: its parent carries the text and the spans, and the nested one is never committed', () => {
  const host = render(h(Text, { testID: 'line', className: 'font-mono text-xs' },
    'const ', h(Text, { style: { color: '#c678dd' } }, 'x'), ' = ', h(Text, { className: 'font-bold text-red-500' }, 1), ';'));
  assert.equal(host.commits.length, 1);
  assert.deepEqual(host.commits[0]?.payload.created.map((entry) => entry.kind), ['text'], 'one node for the whole line');
  const props = nativeOf(host, 'line');
  assert.equal(props.text, 'const x = 1;');
  assert.deepEqual(props.spans, [
    { start: 6, end: 7, style: { color: '#c678dd' } },
    { start: 10, end: 11, style: { color: '#ef4444', fontWeight: 700 } },
  ]);
  assert.deepEqual(host.commits[0]?.payload.children, [{ tag: 0, children: [1] }], 'only the layer lists a child');
});

test('spans nest, inherit by nesting, and a nested Text with no style is transparent', () => {
  const host = render(h(Text, { testID: 'a' },
    'ab', h(Text, { className: 'underline decoration-wavy decoration-red-500' }, 'cd', h(Text, { className: 'font-bold' }, 'ef'), h(Text, null, 'gh')), 'ij'));
  const props = nativeOf(host, 'a');
  assert.equal(props.text, 'abcdefghij');
  assert.deepEqual(props.spans, [{
    start: 2, end: 8,
    style: { textDecorationLine: 'underline', textDecorationStyle: 'wavy', textDecorationColor: '#ef4444' },
    children: [{ start: 4, end: 6, style: { fontWeight: 700 } }],
  }]);
});

test('an inlay is generated text: it is in the spans at its source offset and not in the text', () => {
  const host = render(h(Text, { testID: 'a' },
    'const x', h(Text, { inlay: true, className: 'text-slate-500' }, ': string'), ' = 1', h(Text, { inlay: true }, ' // one')));
  const props = nativeOf(host, 'a');
  assert.equal(props.text, 'const x = 1', 'the source text has no inlay');
  assert.deepEqual(props.spans, [
    { start: 7, end: 7, inlay: ': string', style: { color: '#64748b' } },
    { start: 11, end: 11, inlay: ' // one' },
  ]);
});

test('offsets are UTF-16 units, as JavaScript counts them', () => {
  const props = flattenRichText([
    { kind: 'run', text: 'a😀' },
    { kind: 'span', props: { style: { color: '#ff0000' } }, content: [{ kind: 'run', text: 'é😀' }], hidden: false },
  ]);
  assert.equal(props.text, 'a😀é😀');
  assert.deepEqual(props.spans, [{ start: 3, end: 6, style: { color: '#ff0000' } }]);
});

test('empty spans are dropped, an empty inlay too, and an empty styled span that holds an inlay stays', () => {
  const props = flattenRichText([
    { kind: 'span', props: { style: { color: '#ff0000' } }, content: [], hidden: false },
    { kind: 'span', props: { inlay: true }, content: [], hidden: false },
    { kind: 'run', text: 'a' },
    { kind: 'span', props: { style: { color: '#00ff00' } }, content: [
      { kind: 'span', props: { inlay: true }, content: [{ kind: 'run', text: 'hint' }], hidden: false },
    ], hidden: false },
  ]);
  assert.deepEqual(props.spans, [
    { start: 1, end: 1, style: { color: '#00ff00' }, children: [{ start: 1, end: 1, inlay: 'hint' }] },
  ]);
});

test('changing one span\'s colour sends only the spans; changing its text sends the text too', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const line = (color: `#${string}`, word: string) => h(Text, { testID: 'line' }, 'let ', h(Text, { style: { color } }, word), ' = 1');
  root.render(line('#ff0000', 'x'));
  const created = host.commits.length;
  root.render(line('#00ff00', 'x'));
  const recolour = host.commits.at(-1)?.payload;
  assert.equal(host.commits.length, created + 1);
  assert.equal(recolour?.created.length, 0);
  assert.deepEqual(recolour?.updated.map((entry) => Object.keys(entry.props)), [['spans']], 'only the spans changed');
  assert.deepEqual(recolour?.updated[0]?.props.spans, [{ start: 4, end: 5, style: { color: '#00ff00' } }]);
  assert.deepEqual(recolour?.children, []);
  root.render(line('#00ff00', 'xy'));
  const retext = host.commits.at(-1)?.payload;
  assert.deepEqual(retext?.updated.map((entry) => Object.keys(entry.props).sort()), [['spans', 'text']]);
  const before = host.commits.length;
  root.render(line('#00ff00', 'xy'));
  assert.equal(host.commits.length, before, 'no commit when nothing native changed');
});

test('a span with no spans left reverts the text to plain: the spans key resets to null', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(Text, { testID: 'a' }, 'a', h(Text, { style: { color: '#ff0000' } }, 'b')));
  root.render(h(Text, { testID: 'a' }, 'ab'));
  assert.deepEqual(host.commits.at(-1)?.payload.updated[0]?.props, { spans: null });
  root.render(h(Text, { testID: 'a' }, 'a', h(Text, { style: { color: '#ff0000' } }, 'b'), 'c'));
  assert.deepEqual(Object.keys(host.commits.at(-1)?.payload.updated[0]?.props ?? {}).sort(), ['spans', 'text']);
});

test('fragments, arrays and components around nested Text flatten like any children', () => {
  function Keyword({ children }: { children: string }) {
    return h(Text, { className: 'text-purple-500' }, children);
  }
  const host = render(h(Text, { testID: 'a' }, h(Fragment, null, 'x ', [h(Keyword, { key: 'k', children: 'if' })]), ' y'));
  const props = nativeOf(host, 'a');
  assert.equal(props.text, 'x if y');
  assert.deepEqual(props.spans, [{ start: 2, end: 4, style: { color: '#a855f7' } }]);
});

test('what is still an error says why', () => {
  assert.throws(() => render(h(View, null, 'loose')), /Text strings must be rendered within a <Text> component/);
  assert.throws(() => render(h(Text, null, 'a', h(View, null))), /A <View> cannot be rendered inside a <Text>/);
  assert.throws(() => render(h(Text, null, 'a', h(Button, null, 'b'))), /A <Button> cannot be rendered inside a <Text>/);
  assert.throws(() => render(h(Text, { inlay: true }, 'x')), /inlay is only valid on a <Text> nested in another <Text>/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { onClick() {} }, 'b'))), /onClick cannot be set on a nested <Text>/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { testID: 'x' }, 'b'))), /testID cannot be set on a nested <Text>/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { className: 'p-2' }, 'b'))), /paddingTop cannot be set on a nested <Text>|padding\w* cannot be set/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { className: 'hover:text-red-500' }, 'b'))), /cannot use a breakpoint or a state/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { className: 'md:font-bold' }, 'b'))), /cannot use a breakpoint or a state/);
  assert.throws(() => render(h(Text, null, 'a', h(Text, { inlay: true }, h(Text, null, 'nested')))), /an inlay holds plain text/);
  const ref = createRef<UIHandle>();
  assert.throws(() => render(h(Text, null, 'a', h(Text, { ref }, 'b'))), /ref on a nested <Text> is not supported/);
});

test('hidden spans contribute nothing, and a span\'s plain text updates in place', () => {
  const props = flattenRichText([
    { kind: 'run', text: 'a' },
    { kind: 'span', props: { style: { color: '#ff0000' } }, content: [{ kind: 'run', text: 'hidden' }], hidden: true },
    { kind: 'run', text: 'b' },
  ]);
  assert.deepEqual(props, { text: 'ab', spans: [] });
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const count = (value: number) => h(Text, { testID: 'a' }, 'n=', h(Text, { style: { color: '#ff0000' } }, value));
  root.render(count(1));
  root.render(count(22));
  const update = host.commits.at(-1)?.payload.updated[0]?.props;
  assert.deepEqual(update, { text: 'n=22', spans: [{ start: 2, end: 4, style: { color: '#ff0000' } }] });
});

test('the spans diff compares by content, not by identity', () => {
  const spans = (color: string): readonly NativeSpan[] => [{ start: 0, end: 1, style: { color: color as `#${string}` } }];
  assert.ok(sameSpans(spans('#ff0000'), spans('#ff0000')));
  assert.ok(!sameSpans(spans('#ff0000'), spans('#00ff00')));
  assert.ok(!sameSpans(undefined, spans('#ff0000')));
  assert.ok(sameSpans(undefined, undefined));
  assert.equal(diffNativeProps({ text: 'a', spans: spans('#ff0000') }, { text: 'a', spans: spans('#ff0000') }), null);
  assert.deepEqual(diffNativeProps({ text: 'a', spans: spans('#ff0000') }, { text: 'a' }), { spans: null });
  assert.deepEqual(nativeProps('text', {}, false, undefined, { text: 'ab', spans: spans('#ff0000') }), { text: 'ab', spans: spans('#ff0000') });
});

test('only a Text answers the geometry queries; the others refuse by name', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const text = createRef<UIHandle>();
  const view = createRef<UIHandle>();
  root.render(h(View, { ref: view }, h(Text, { ref: text }, 'hello')));
  assert.throws(() => view.current?.getCaretRect(0), /getCaretRect is only available on a Text, not on a view element/);
  assert.throws(() => view.current?.getOffsetAtPoint(0, 0), /getOffsetAtPoint is only available on a Text/);
  assert.throws(() => view.current?.getRangeRects(0, 1), /getRangeRects is only available on a Text/);

  host.textGeometry = (method, _tag, args) => {
    if (method === 'getCaretRect') return args[0] === 99 ? { error: 'offset 99 is past the end of the text (5 code units)' } : { x: 10 + (args[0] ?? 0) * 8, y: 4, width: 0, height: 20 };
    if (method === 'getOffsetAtPoint') return { offset: 3, side: 'before' };
    return { rects: [{ x: 10, y: 4, width: 24, height: 20 }] };
  };
  assert.deepEqual(text.current?.getCaretRect(2), { x: 26, y: 4, width: 0, height: 20 });
  assert.deepEqual(host.textQueries.at(-1), { method: 'getCaretRect', tag: text.current?.id, args: [2, 1] }, 'the default side is after');
  text.current?.getCaretRect(2, 'before');
  assert.deepEqual(host.textQueries.at(-1)?.args, [2, -1]);
  assert.throws(() => text.current?.getCaretRect(99), (error: unknown) => error instanceof RangeError && /past the end/.test(error.message));
  assert.deepEqual(text.current?.getOffsetAtPoint(30, 12), { offset: 3, side: 'before' });
  assert.deepEqual(text.current?.getRangeRects(0, 3), [{ x: 10, y: 4, width: 24, height: 20 }]);
  host.textGeometry = () => null;
  assert.equal(text.current?.getCaretRect(0), undefined, 'a node native does not have answers undefined');
  assert.equal(text.current?.getOffsetAtPoint(0, 0), undefined);
  assert.equal(text.current?.getRangeRects(0, 1), undefined);
});
