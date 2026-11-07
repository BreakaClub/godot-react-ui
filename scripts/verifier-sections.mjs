// The sections of the interaction verifiers and the rules that pick them (plan 0.4.1): one definition for the native verifier
// (`demo/src/verify-interaction.ts`, which runs inside Godot), the Web verifier (`scripts/verify-interaction-web.mjs`) and the
// driver that validates `--only=` before it launches anything (`scripts/verify.mjs`).

/** Prefix of the argument that names the sections to run: `--only=<name>[,<name>]`. */
export const ONLY_PREFIX = '--only=';

/** The native verifier's sections, in the order they run. */
export const NATIVE_INTERACTION_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'hidpi', 'filters', 'glass',
  'navigator', 'transforms', 'layout-utilities', 'filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile',
];

/**
 * Sections that measure or need a special build rather than verify (`live-compile` needs the checker and compiler extension, which has its
 * own toolchain and build: `node scripts/build-live-compile.mjs`): they run only when `--only=` names them, and a run without them is not partial. */
export const NATIVE_OPT_IN_SECTIONS = ['filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile'];

/** The Web verifier's sections, in the order they run: the native names it covers, and `touch`, its touch page. */
export const WEB_INTERACTION_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'hidpi', 'filters', 'glass', 'navigator', 'transforms', 'touch',
];

/** Every section name the arguments ask for, across all `--only=` arguments. */
export function requestedSections(argv) {
  return argv.filter(argument => argument.startsWith(ONLY_PREFIX)).flatMap(argument => argument.slice(ONLY_PREFIX.length).split(','));
}

/** An unknown name is an error: a typo must not skip a section. */
export function checkSectionNames(requested, known) {
  for (const name of requested) {
    if (!known.includes(name)) throw new Error(`Unknown section "${name}"; the sections are ${known.join(', ')}`);
  }
}

/** The sections a run executes, in run order: the ones named, or every section but the opt-in ones. */
export function sectionsToRun(known, optIn, requested) {
  checkSectionNames(requested, known);
  return requested.length === 0 ? known.filter(name => !optIn.includes(name)) : known.filter(name => requested.includes(name));
}

/** What a run covered: the sections it ran, the ones it left out, and whether that makes it partial. An opt-in section is never left out, only not asked for. */
export function describeSections(known, optIn, requested) {
  const run = sectionsToRun(known, optIn, requested);
  const skipped = known.filter(name => !run.includes(name) && !optIn.includes(name));
  return { run, skipped, partial: skipped.length > 0 };
}
