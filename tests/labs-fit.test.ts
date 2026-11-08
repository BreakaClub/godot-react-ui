import assert from 'node:assert/strict';
import test from 'node:test';
import { FIT_TOLERANCE_PX, PAGE_SCROLLER, fitProblems, type FitNode, type FitSnapshot } from '../scripts/labs-fit.mjs';

// The judgement of the Web verifier's `labs-fit` section (scripts/verify-labs-fit-web.mjs, docs/tracks/lab-clarity.md): what runs off the edge of a
// phone, against snapshots built the way the demo's snapshot is shaped.

const PHONE_WIDTH = 412;

function node(id: number, testID: string | undefined, rect: [number, number, number, number], children: readonly number[] = [], scrollWidth?: number): FitNode {
  return {
    id, kind: 'view', children, props: testID === undefined ? {} : { testID },
    rect: { x: rect[0], y: rect[1], width: rect[2], height: rect[3] },
    scroll: scrollWidth === undefined ? null : { scrollWidth, clientWidth: rect[2] },
  };
}

const snapshot = (...nodes: FitNode[]): FitSnapshot => ({ width: PHONE_WIDTH, nodes });

test('a lab inside the width has no problem', () => {
  const fitting = snapshot(node(1, PAGE_SCROLLER, [0, 100, 412, 800], [2], 412), node(2, 'card', [16, 120, 380, 60]));
  assert.deepEqual(fitProblems(fitting), []);
});

test('a node past the right edge is named with its rectangle, and so is one past the left edge', () => {
  const wide = snapshot(node(1, PAGE_SCROLLER, [0, 100, 412, 800], [2, 3], 540), node(2, 'caption', [16, 120, 520, 20]), node(3, undefined, [-30, 150, 100, 20]));
  const problems = fitProblems(wide);
  assert.equal(problems.length, 3, problems.join('\n'));
  assert.match(problems[0] ?? '', /^lab-scroll scrolls sideways: its content is 540 wide in 412$/u);
  assert.match(problems[1] ?? '', /^caption#2 16,120 520x20 in a root 412 wide$/u);
  assert.match(problems[2] ?? '', /^view#3 -30,150 100x20 in a root 412 wide$/u);
});

test('the tolerance is the geometry gate\'s and no more', () => {
  const edge = (right: number) => snapshot(node(1, 'edge', [0, 0, right, 20]));
  assert.deepEqual(fitProblems(edge(PHONE_WIDTH + FIT_TOLERANCE_PX)), []);
  assert.equal(fitProblems(edge(PHONE_WIDTH + FIT_TOLERANCE_PX + 1)).length, 1);
});

test('what a sideways scroll container holds may reach past it, and the container itself may not', () => {
  const scrolled = snapshot(
    node(1, 'row', [16, 0, 380, 60], [2], 900), node(2, 'long-item', [16, 0, 880, 40]),
    node(3, 'too-wide-row', [16, 100, 500, 60], [4], 900), node(4, 'inner', [16, 100, 880, 40]),
  );
  const problems = fitProblems(scrolled);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] ?? '', /^too-wide-row#3 /u);
});

test('a container that only scrolls up and down excuses nothing', () => {
  const vertical = snapshot(node(1, 'list', [16, 0, 380, 200], [2], 380), node(2, 'row', [16, 0, 600, 40]));
  assert.match(fitProblems(vertical)[0] ?? '', /^row#2 /u);
});

test('the content area never excuses the lab, even when it can scroll sideways', () => {
  const scrolled = snapshot(node(1, PAGE_SCROLLER, [0, 100, 412, 800], [2], 700), node(2, 'stage', [0, 100, 700, 300]));
  assert.equal(fitProblems(scrolled).length, 2);
});

test('a listed test id excuses its node and everything under it, and only those', () => {
  const clipped = snapshot(node(1, 'clip-demo', [16, 0, 300, 60], [2]), node(2, 'clip-child', [16, 0, 600, 40], [3]), node(3, undefined, [16, 0, 590, 20]), node(4, 'other', [16, 80, 500, 20]));
  const problems = fitProblems(clipped, { 'clip-child': 'the case shows a box clipping its child' });
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] ?? '', /^other#4 /u);
});

test('a node of no size is not counted', () => {
  assert.deepEqual(fitProblems(snapshot(node(1, 'closed-list', [700, 0, 0, 0]))), []);
});
