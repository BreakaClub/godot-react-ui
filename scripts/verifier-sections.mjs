// The sections of the interaction verifiers and the rules that pick them (plan 0.4.1): one definition for the native verifier
// (`demo/src/verify-interaction.ts`, which runs inside Godot), the Web verifier (`scripts/verify-interaction-web.mjs`) and the
// driver that validates `--only=` before it launches anything (`scripts/verify.mjs`).

/** Prefix of the argument that names the sections to run: `--only=<name>[,<name>]`. */
export const ONLY_PREFIX = '--only=';

/** The native verifier's sections, in the order they run. */
export const NATIVE_INTERACTION_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint',
  'navigator', 'transforms', 'layout-utilities', 'text-styles', 'rich-text', 'filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile', 'code-editor',
];

/**
 * Sections that measure or need a special build rather than verify (`live-compile` needs the checker and compiler extension, which has its
 * own toolchain and build: `node scripts/build-live-compile.mjs`): they run only when `--only=` names them, and a run without them is not partial. */
export const NATIVE_OPT_IN_SECTIONS = ['filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile'];

/** The Web verifier's sections, in the order they run: the native names it covers, and `touch`, its touch page. */
export const WEB_INTERACTION_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint', 'navigator', 'transforms', 'text-styles', 'rich-text', 'font-slices', 'code-editor', 'touch',
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

// The native interaction run's deadline is a hang guard, not a budget, so it grows with the sections a window runs. Measured on 8 November
// 2026 (main 99ba6f0, Breaka's 4.8, load average 13 to 20, `sectionMs` of three `--only=` runs that together cover every default section):
// a landscape window's 22 default sections take 570 s, a mean of 26 s, the slowest `text-styles` at 88 s; the flat 300 s it had before
// was set on 6 November, when the whole run took about 130 s, and killed the full run in the batch regression at the glass section.
/** What a window needs before its first section: Godot's start, the import of the demo and the first frame. */
export const INTERACTION_START_ALLOWANCE_MS = 60_000;
/** Allowance for each section the window runs: about 1.7 times the measured mean, so the whole run has about 1.8 times its measured time. */
export const INTERACTION_SECTION_ALLOWANCE_MS = 45_000;
/** The guard of a run with few sections: one slow section (`text-styles`, 88 s) under a loaded host must not be cut short. */
export const INTERACTION_MINIMUM_DEADLINE_MS = 300_000;

/** The deadline of one native interaction window that runs `sectionCount` sections. */
export function interactionDeadlineMs(sectionCount) {
  return Math.max(INTERACTION_MINIMUM_DEADLINE_MS, INTERACTION_START_ALLOWANCE_MS + INTERACTION_SECTION_ALLOWANCE_MS * sectionCount);
}
