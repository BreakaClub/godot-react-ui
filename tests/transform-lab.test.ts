import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { createElement as h } from 'react';
import { BEHAVIOUR_CASES, STAGE, SHAPE_CASES, TRANSITION_CASES } from '../demo/src/transform-data';
import { CASE_OPTIONS, HIT_FLASH_MS, TransformLab, setTransformCase } from '../demo/src/transform-lab';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

// The transforms lab (demo/src/transform-lab.tsx) against the fake host: its list of cases and captions, how the stage fits a narrow
// area, and what a tap on the hit page counts and outlines. Layout is native's: the interaction verifier's `transforms` section
// measures the stage's rectangles and the pixels of the outline.

/** A phone's width in CSS pixels (a 412 x 915 Android phone), the width of the lab's area in the narrow tests. */
const PHONE_WIDTH = 412;

/** The fake host answers `getRect()` of the lab's own box with a width the test sets: native's layout is not run here. */
class SizedHost extends TextInputHost {
  labWidth: number = STAGE.width;

  override getNodeRect(tag: number): string {
    const node = this.nodes.get(tag);
    if (node?.props.testID !== 'transform-lab') return super.getNodeRect(tag);
    return JSON.stringify({ x: 0, y: 0, width: this.labWidth, height: STAGE.height });
  }
}

function mount(labWidth: number) {
  const host = new SizedHost();
  host.labWidth = labWidth;
  const { root } = createTestRoot(host);
  root.render(h(TransformLab));
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const styleOfNode = (id: number): Record<string, unknown> => {
    const node = host.nodes.get(id);
    assert.ok(node, `node ${id} is not mounted`);
    const { style } = node.props;
    const layers = typeof style === 'object' && style !== null && 'layers' in style && Array.isArray(style.layers) ? style.layers : [];
    return Object.assign({}, ...layers.map((layer: { style: object }) => layer.style));
  };
  /** The style an element was given (its layers merged), as native receives it. */
  const props = (testID: string): Record<string, unknown> => styleOfNode(tag(testID));
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
  const styleOfParent = (testID: string): Record<string, unknown> => {
    const parent = host.nodes.get(tag(testID))?.parent;
    assert.ok(parent !== null && parent !== undefined, `${testID} has a parent`);
    return styleOfNode(parent);
  };
  return { host, root, tag, props, styleOfParent, textOf, click };
}

test('every case has a label and a caption that says what it shows, in plain sentences', () => {
  const names = [...SHAPE_CASES.map(spec => `shape:${spec.name}`), ...TRANSITION_CASES.map(spec => `transition:${spec.name}`), ...BEHAVIOUR_CASES.map(spec => spec.id)];
  assert.deepEqual(CASE_OPTIONS.map(option => option.id), names, 'the list has every case once, in the order the lab shows them');
  for (const option of CASE_OPTIONS) {
    assert.ok(option.label.length > 0, `${option.id} has a label`);
    assert.match(option.caption, /^[A-Za-z(@].*\.$/u, `${option.id}'s caption is a sentence`);
    assert.ok(option.caption.length >= 40, `${option.id}'s caption says something: ${option.caption}`);
    assert.ok(!/ — /u.test(option.caption), `${option.id}'s caption is plain prose, not a list of facts`);
  }
  assert.equal(new Set(CASE_OPTIONS.map(option => option.caption)).size, CASE_OPTIONS.length, 'no two cases share a caption');
});

test('a transition case says to press Flip, and a case that needs a mouse says what a finger does instead', () => {
  for (const spec of TRANSITION_CASES) assert.match(spec.caption, /Press Flip/u, `${spec.name} says how to start it`);
  const hover = BEHAVIOUR_CASES.find(spec => spec.id === 'hover');
  assert.match(hover?.caption ?? '', /touch screen, press and hold/u);
});

test('the stage is not scaled where the lab has its width, and is scaled to fit where it does not', () => {
  const wide = mount(STAGE.width);
  try {
    assert.equal(wide.props('transform-stage').transform, undefined, 'a lab as wide as the stage draws it as it is');
  } finally {
    wide.root.unmount();
  }
  const phone = mount(PHONE_WIDTH);
  try {
    const stage = phone.props('transform-stage');
    const scale = Math.floor(PHONE_WIDTH / STAGE.width * 10_000) / 10_000;
    assert.equal(stage.transform, `scale(${scale})`, 'the whole stage is drawn at the width the lab has');
    assert.equal(stage.transformOrigin, 'top left');
    // The box it is drawn in has the scaled size, and clips what the stage's own 520 px of layout would add.
    const outer = phone.styleOfParent('transform-stage');
    assert.ok(Math.abs(Number(outer.width) - PHONE_WIDTH) < 1, `the box is the lab's width: ${String(outer.width)}`);
    assert.ok(Math.abs(Number(outer.height) - STAGE.height * PHONE_WIDTH / STAGE.width) < 1, `and as tall as the scaled stage: ${String(outer.height)}`);
    assert.equal(outer.overflowX, 'hidden');
    assert.equal(outer.overflowY, 'hidden');
  } finally {
    phone.root.unmount();
    setTransformCase('shape:identity');
  }
});

test('the caption and the case list sit under the stage at the lab\'s width and are not given the stage\'s', () => {
  const phone = mount(PHONE_WIDTH);
  try {
    const caption = phone.props('transform-caption');
    assert.equal(caption.width, undefined, 'the caption is as wide as the lab: it wraps there');
    assert.ok(phone.textOf('transform-caption').length > 0);
  } finally {
    phone.root.unmount();
  }
});

test('a tap on the hit page is counted for what it hit, outlined for a moment, and a box scaled to nothing never counts', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  setTransformCase('hit');
  const m = mount(STAGE.width);
  const counts = () => (['bar', 'child', 'parent', 'collapsed', 'empty'] as const).map(target => m.textOf(`hit-count-${target}`)).join(' ');
  const outlined = (testID: string): boolean => m.props(testID).outlineStyle === 'solid';
  /** Let the clock run `ms` and commit what a timer set, as the next frame's render does. */
  const wait = (ms: number): void => m.root.flushSync(() => mock.timers.tick(ms));
  try {
    assert.equal(counts(), '0 0 0 0 0');
    assert.ok(!outlined('hit-bar'));
    m.click('hit-bar');
    assert.equal(counts(), '1 0 0 0 0', 'a tap on the bar counts for the bar');
    assert.ok(outlined('hit-bar'), 'and outlines it');
    wait(HIT_FLASH_MS - 1);
    assert.ok(outlined('hit-bar'), 'the outline stays for its time');
    wait(1);
    assert.ok(!outlined('hit-bar'), 'then goes');
    m.click('hit-child');
    assert.equal(counts(), '1 1 1 0 0', 'a tap on the red bar counts for it and for the yellow square it is in');
    assert.ok(outlined('hit-child') && outlined('hit-parent') && !outlined('hit-bar'), 'and outlines both');
    m.click('transform-stage');
    assert.equal(counts(), '1 1 1 0 1', 'a tap on the bare stage is a miss');
    assert.ok(!outlined('hit-child') && !outlined('hit-parent'), 'and the last tap\'s outlines are gone as the next one starts');
    wait(HIT_FLASH_MS);
    assert.ok(!outlined('hit-child') && !outlined('hit-parent'), 'and the timer clears the last of them');
  } finally {
    m.root.unmount();
    mock.timers.reset();
    setTransformCase('shape:identity');
  }
});
