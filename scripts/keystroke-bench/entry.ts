import { TYPING_SITES, runKeystrokeBench, summarizeAll, type BenchOptions } from '../../demo/src/editor/keystroke-bench';

export { TYPING_SITES };

/** The page and Node run the same function; `performance.now()` is the clock in both. */
export function bench(options: Omit<BenchOptions, 'now'>) {
  return summarizeAll(runKeystrokeBench({ ...options, now: () => performance.now() }));
}
