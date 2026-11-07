/**
 * What a run of the demo opens with, decided from the arguments after `--` (natively `godot --path demo -- --lab=glass`; on the
 * Web `index.html?lab=glass`, which `web-shell.html` turns into the same argument). Pure, so the unit tests cover it without Godot.
 *
 * - `--lab=<id>` opens the navigator on that lab. An unknown id is shown as an error by the navigator, never replaced by a default.
 * - `--demo=navigator` and `--demo=app` choose outright: the navigator, or the single-page playground (`App`) the demo had before it.
 * - Without either, a run that injects its own input (a verifier or the probe) opens the playground, because that is the page the
 *   verifiers were written against; every other run opens the navigator. This is the one place a run's purpose changes what the demo
 *   shows. A Web verifier cannot be told by its arguments: it loads the bare page, as a person would. So the Web page itself makes the
 *   bare address the playground (`web-shell.html` adds `--demo=app` to it), and the demo server for a person (`pnpm demo:web`) sends
 *   the bare address to `?demo=navigator` (`scripts/web-server.mjs`, `landing`).
 */
export type DemoStart =
  | { readonly kind: 'app' }
  | { readonly kind: 'navigator'; readonly lab: string | undefined };

const LAB_ARGUMENT = '--lab=';
const DEMO_ARGUMENT = '--demo=';
const DEMO_APP = 'app';
const DEMO_NAVIGATOR = 'navigator';

function valueOf(userArgs: readonly string[], prefix: string): string | undefined {
  const found = userArgs.find(argument => argument.startsWith(prefix));
  return found === undefined ? undefined : found.slice(prefix.length);
}

/** `injectsOwnInput` is whether this run is a verifier or the probe (`verifier-input.ts`). */
export function demoStart(userArgs: readonly string[], injectsOwnInput: boolean): DemoStart {
  const demo = valueOf(userArgs, DEMO_ARGUMENT);
  const lab = valueOf(userArgs, LAB_ARGUMENT);
  if (demo !== undefined && demo !== DEMO_APP && demo !== DEMO_NAVIGATOR) {
    throw new Error(`${DEMO_ARGUMENT}${demo}: the demo is ${DEMO_APP} or ${DEMO_NAVIGATOR}`);
  }
  if (lab === '') throw new Error(`${LAB_ARGUMENT} needs the id of a lab`);
  if (demo === DEMO_APP) {
    if (lab !== undefined) throw new Error(`${LAB_ARGUMENT}${lab} opens the navigator, not ${DEMO_ARGUMENT}${DEMO_APP}`);
    return { kind: 'app' };
  }
  if (lab !== undefined || demo === DEMO_NAVIGATOR) return { kind: 'navigator', lab };
  return injectsOwnInput ? { kind: 'app' } : { kind: 'navigator', lab: undefined };
}
