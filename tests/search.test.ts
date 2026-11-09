import './setup';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, useState } from 'react';
import { EditorSelection } from '@codemirror/state';
import { findCodeMatches, CodeSearch } from '../demo/src/editor/view/code-search';
import { findMatchesInSnapshot, PageSearch } from '../demo/src/page-search';
import { Navigator } from '../demo/src/navigator';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';
import { installMonospaceGeometry } from './monospace-text-geometry';
import { settleReact } from './react-scheduler';
import type { CodeSupport } from '../demo/src/editor/lab-code';

test('findCodeMatches: case sensitive and whole word options', () => {
  const doc = 'const count = 1;\nconst counter = 2;\nconst COUNT = 3;';

  // Default case insensitive, substring
  const allCount = findCodeMatches(doc, 'count', { caseSensitive: false, wholeWord: false });
  assert.equal(allCount.length, 3);
  assert.deepEqual(allCount[0], { from: 6, to: 11 });
  assert.deepEqual(allCount[1], { from: 23, to: 28 });
  assert.deepEqual(allCount[2], { from: 42, to: 47 });

  // Case sensitive
  const exactCount = findCodeMatches(doc, 'count', { caseSensitive: true, wholeWord: false });
  assert.equal(exactCount.length, 2); // 'count' and 'counter'

  // Whole word, case insensitive
  const wholeCount = findCodeMatches(doc, 'count', { caseSensitive: false, wholeWord: true });
  assert.equal(wholeCount.length, 2); // 'count' and 'COUNT', not 'counter'

  // Case sensitive and whole word
  const exactWholeCount = findCodeMatches(doc, 'count', { caseSensitive: true, wholeWord: true });
  assert.equal(exactWholeCount.length, 1);
  assert.deepEqual(exactWholeCount[0], { from: 6, to: 11 });

  // Empty query
  assert.deepEqual(findCodeMatches(doc, '', { caseSensitive: false, wholeWord: false }), []);
});

test('findMatchesInSnapshot: finds text in stage and ignores search bar itself', () => {
  const fakeSnapshot = {
    clockMs: 0,
    oversampling: 1,
    transitions: [],
    nodes: [
      {
        id: 1,
        kind: 'view' as const,
        layer: 0,
        text: '',
        parent: null,
        children: [2, 3],
        paintParent: null,
        paintIndex: 0,
        documentIndex: 0,
        rect: { x: 0, y: 0, width: 800, height: 600 },
        clipRect: null,
        presentation: { width: 800, height: 600, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '', color: '', borderColor: '' },
        style: {},
        props: { testID: 'lab-stage' },
        scroll: null,
        textInput: null,
      },
      {
        id: 2,
        kind: 'text' as const,
        layer: 0,
        text: 'Hello React World',
        parent: 1,
        children: [],
        paintParent: null,
        paintIndex: 1,
        documentIndex: 1,
        rect: { x: 10, y: 10, width: 100, height: 20 },
        clipRect: null,
        presentation: { width: 100, height: 20, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '', color: '', borderColor: '' },
        style: {},
        props: { testID: 'heading' },
        scroll: null,
        textInput: null,
      },
      {
        id: 3,
        kind: 'view' as const,
        layer: 0,
        text: '',
        parent: 1,
        children: [4],
        paintParent: null,
        paintIndex: 2,
        documentIndex: 2,
        rect: { x: 20, y: 50, width: 200, height: 50 },
        clipRect: null,
        presentation: { width: 200, height: 50, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '', color: '', borderColor: '' },
        style: {},
        props: { testID: 'page-search' },
        scroll: null,
        textInput: null,
      },
      {
        id: 4,
        kind: 'text' as const,
        layer: 0,
        text: 'React search query in search bar',
        parent: 3,
        children: [],
        paintParent: null,
        paintIndex: 3,
        documentIndex: 3,
        rect: { x: 25, y: 55, width: 150, height: 20 },
        clipRect: null,
        presentation: { width: 150, height: 20, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '', color: '', borderColor: '' },
        style: {},
        props: { testID: 'search-input' },
        scroll: null,
        textInput: null,
      },
    ],
    stats: {},
  };

  const matches = findMatchesInSnapshot(fakeSnapshot, 'React');
  assert.equal(matches.length, 1, 'Only node 2 is matched; node 4 inside page-search is excluded');
  assert.equal(matches[0]?.nodeId, 2);
  assert.equal(matches[0]?.start, 6);
  assert.equal(matches[0]?.end, 11);
});

const fakeCodeSupport: CodeSupport = {
  openSession: () => { throw new Error('Live compile not loaded in test'); },
  readSource: path => `// Source: ${path}\nfunction Demo() {\n  const [count, setCount] = useState(0);\n  return <Text>Count: {count}</Text>;\n}\n`,
  platform: 'mac',
  clipboard: { writeText: () => {} },
  now: () => 0,
};

function mountNavigator() {
  const host = new TextInputHost();
  installMonospaceGeometry(host, {
    advance: 7.2,
    lineHeight: 16,
    origin: tag => (host.nodes.get(tag)?.props.testID === 'editor-grid-probe' ? { x: 0, y: 0 } : undefined),
  });
  const { root } = createTestRoot(host);
  root.render(h(Navigator, { code: fakeCodeSupport }));

  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const has = (testID: string): boolean => root.findByTestID(testID) !== undefined;
  const textOf = (testID: string): string => {
    const collect = (id: number): string => {
      const node = host.nodes.get(id);
      return (typeof node?.props.text === 'string' ? node.props.text : '') + (node?.children ?? []).map(collect).join('');
    };
    return collect(tag(testID));
  };
  const click = (testID: string): void => {
    host.event(tag(testID), 'click');
    root.dispatchEvents();
  };
  const keydown = (testID: string, overrides: Parameters<typeof host.keyEvent>[2]): void => {
    host.events.push(host.keyEvent(tag(testID), 'keydown', overrides));
    root.dispatchEvents();
  };
  const focus = (testID: string): void => { assert.equal(host.focusNode(tag(testID), 1), ''); };

  return { host, root, tag, has, textOf, click, keydown, focus };
}

test('Page search: Enter navigates to next match, Shift+Enter to previous', () => {
  const m = mountNavigator();
  // Open search
  m.keydown('counter-lab', { key: 'f', ctrlKey: true });
  assert.ok(m.has('page-search'));

  // Type search query with multiple occurrences on page
  m.focus('page-search-input');
  m.host.type(m.root, 'step');

  const count1 = m.textOf('page-search-count');
  assert.match(count1, /^1 of \d+$/u);

  // Press Enter for next
  m.keydown('page-search-input', { key: 'Enter' });
  const count2 = m.textOf('page-search-count');
  assert.match(count2, /^2 of \d+$/u);

  // Press Shift+Enter for previous
  m.keydown('page-search-input', { key: 'Enter', shiftKey: true });
  const count3 = m.textOf('page-search-count');
  assert.equal(count3, count1);
});

test('Code search: cycles matches, respects whole-word and case-sensitive options, closes on Escape', () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const m = mountNavigator();
    m.click('toggle-code');
    assert.ok(m.has('code-editor'));

    m.keydown('code-editor', { key: 'f', metaKey: true });
    assert.ok(m.has('code-search'));
    assert.ok(!m.has('page-search'));

    // Search for 'count'
    m.focus('code-search-input');
    m.host.type(m.root, 'count');

    // Should find multiple ('count', 'setCount', 'Count')
    assert.match(m.textOf('code-search-count'), /^1 of \d+$/u);

    // Next match via Enter
    m.keydown('code-search-input', { key: 'Enter' });
    assert.match(m.textOf('code-search-count'), /^2 of \d+$/u);

    // Previous match via Shift+Enter
    m.keydown('code-search-input', { key: 'Enter', shiftKey: true });
    assert.match(m.textOf('code-search-count'), /^1 of \d+$/u);

    // Toggle match case: 'count' will no longer match 'Count'
    m.click('code-search-match-case');
    const caseCount = m.textOf('code-search-count');

    // Toggle whole word: 'count' will not match 'setCount'
    m.click('code-search-whole-word');
    const wholeCount = m.textOf('code-search-count');
    assert.notEqual(wholeCount, '');

    // Press Escape in code search closes it
    m.keydown('code-search-input', { key: 'Escape' });
    assert.ok(!m.has('code-search'));
  } finally {
    console.warn = originalWarn;
  }
});

test('Code search moves the editor\'s selection when the search moves, and leaves it when the document changes', async () => {
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  const selected: Array<readonly [number, number]> = [];
  let edit: (doc: string) => void = () => { assert.fail('the editor is not mounted'); };
  // As CodeEditor renders it: the document's text, and a new onFindMatch every render.
  function Editor() {
    const [doc, setDoc] = useState('alpha beta alpha');
    edit = setDoc;
    return h(CodeSearch, { docText: doc, searchEpoch: 1, onFindMatch: (from: number, to: number) => { selected.push([from, to]); }, onClose: () => {} });
  }
  root.render(h(Editor));
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const count = (): string => {
    const collect = (id: number): string => {
      const node = host.nodes.get(id);
      return (typeof node?.props.text === 'string' ? node.props.text : '') + (node?.children ?? []).map(collect).join('');
    };
    return collect(tag('code-search-count'));
  };
  assert.equal(host.focusNode(tag('code-search-input'), 1), '');
  host.type(root, 'alpha');
  await settleReact();
  assert.deepEqual(selected.at(-1), [0, 5], 'the query selects its first match');
  assert.equal(count(), '1 of 2');

  // Typing in the editor, after the last match: the count follows the document, the selection stays where the typing is.
  selected.length = 0;
  edit('alpha beta alpha! alpha');
  await settleReact();
  assert.deepEqual(selected, [], 'an edit does not move the selection to a match');
  assert.equal(count(), '1 of 3');

  host.event(tag('code-search-next'), 'click');
  root.dispatchEvents();
  await settleReact();
  assert.deepEqual(selected, [[11, 16]], 'Next selects the next match');
  assert.equal(count(), '2 of 3');
});
