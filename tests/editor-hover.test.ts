import assert from 'node:assert/strict';
import test from 'node:test';
import { HoverTracker, type HoverTarget } from '../demo/src/editor/view/hover';

// The hover tracker (demo/src/editor/view/hover.ts): what it tells `show`, and that hiding what is not shown tells nobody.

const WORD: HoverTarget = { from: 2, to: 5, offset: 3 };
const ANSWER_MS = 20;
const pause = (ms: number): Promise<void> => new Promise(done => setTimeout(done, ms));

test('cancelling with nothing shown says nothing: a hide that sets state to what it is renders the editor again', async () => {
  const shown: Array<[string | undefined, number | undefined]> = [];
  const tracker = new HoverTracker<string>(async target => `type at ${target.offset}`, (value, target) => { shown.push([value, target?.offset]); }, 0);
  tracker.cancel();
  tracker.cancel();
  assert.deepEqual(shown, [], 'nothing was shown, so nothing is hidden');
  tracker.moved(WORD);
  tracker.cancel();
  await pause(ANSWER_MS);
  assert.deepEqual(shown, [], 'a wait that was cancelled shows nothing, and there is nothing to hide');
  tracker.moved(WORD);
  await pause(ANSWER_MS);
  assert.deepEqual(shown, [['type at 3', 3]]);
  tracker.cancel();
  tracker.cancel();
  assert.deepEqual(shown.slice(1), [[undefined, undefined]], 'what was shown is hidden once');
});

test('an answer with nothing to show is passed on, and leaves nothing to hide', async () => {
  const shown: Array<[string | undefined, number | undefined]> = [];
  const tracker = new HoverTracker<string>(async () => undefined, (value, target) => { shown.push([value, target?.offset]); }, 0);
  tracker.moved(WORD);
  await pause(ANSWER_MS);
  assert.deepEqual(shown, [[undefined, 3]], 'the owner is told the answer was empty, as it always was');
  tracker.cancel();
  assert.equal(shown.length, 1, 'and nothing is hidden');
});
