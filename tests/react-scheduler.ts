import { dirname } from 'node:path';

// React renders the updates of continuous events (a pointer move) later, through its Scheduler: tasks on macrotasks, which yield every few
// milliseconds. A test that waits a fixed time guesses how long that takes, and a loaded machine (a CI runner) takes longer. This waits for
// the Scheduler itself.

interface Scheduler {
  unstable_scheduleCallback(priority: number, callback: () => void): unknown;
  readonly unstable_IdlePriority: number;
}

function isScheduler(value: unknown): value is Scheduler {
  return typeof value === 'object' && value !== null
    && typeof Reflect.get(value, 'unstable_scheduleCallback') === 'function'
    && typeof Reflect.get(value, 'unstable_IdlePriority') === 'number';
}

// The very module react-reconciler queues its work on: resolved from react-reconciler's own directory, so it is the same instance and the same queue.
const loaded: unknown = require(require.resolve('scheduler', { paths: [dirname(require.resolve('react-reconciler'))] }));
if (!isScheduler(loaded)) throw new Error('react-reconciler\'s scheduler has no unstable_scheduleCallback or unstable_IdlePriority');
const scheduler = loaded;

/**
 * Resolves once React's Scheduler has run every task queued before this call, and every task those queued in turn: the Scheduler runs its
 * tasks in the order of their expiry, and an Idle-priority task expires after every other.
 */
export function settleReact(): Promise<void> {
  return new Promise(resolve => {
    scheduler.unstable_scheduleCallback(scheduler.unstable_IdlePriority, () => { resolve(); });
  });
}
