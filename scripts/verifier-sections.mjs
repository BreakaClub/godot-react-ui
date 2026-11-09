// The sections of the interaction verifiers and the rules that pick them (plan 0.4.1): one definition for the native verifier
// (`demo/src/verify-interaction.ts`, which runs inside Godot), the Web verifier (`scripts/verify-interaction-web.mjs`) and the
// driver that validates `--only=` before it launches anything (`scripts/verify.mjs`).

/** Prefix of the argument that names the sections to run: `--only=<name>[,<name>]`. */
export const ONLY_PREFIX = '--only=';

/** The native verifier's sections, in the order they run. */
export const NATIVE_INTERACTION_SECTIONS = [
  'font-fallback', 'events', 'cooperation', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'touch-selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint',
  'navigator', 'transforms', 'layout-utilities', 'text-styles', 'rich-text', 'filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile', 'code-editor', 'key-passthrough',
];

/**
 * Sections that measure or need a special build rather than verify (`live-compile` needs the checker and compiler extension, which has its
 * own toolchain and build: `node scripts/build-live-compile.mjs`): they run only when `--only=` names them, and a run without them is not partial. */
export const NATIVE_OPT_IN_SECTIONS = ['filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile'];

/** The Web verifier's sections, in the order they run: the native names it covers, `rotation`, which turns an emulated phone, `labs-fit`, which shows every lab on one (both exist only on the Web), and `touch`, its touch page. */
export const WEB_INTERACTION_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'touch-selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint', 'navigator', 'transforms', 'text-styles', 'rich-text', 'font-slices', 'rotation', 'labs-fit', 'code-editor', 'key-passthrough', 'touch',
];

/**
 * The Web interaction run is split into jobs that run at the same time, each in a Chrome of its own (docs/tracks/suite-speed.md has why): one for
 * each viewport, which runs these sections on one page (`runWorkflow` in `scripts/verify-interaction-web.mjs`); the pages that are each their own
 * case (the navigator's starts, the font slices' groups, the rotations); and the touch pages. A section appears in every job that runs part of it.
 */
const WEB_VIEWPORT_SECTIONS = [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'hidpi', 'filters', 'glass', 'paint', 'navigator', 'transforms', 'text-styles', 'rich-text', 'code-editor', 'key-passthrough',
];
export const WEB_INTERACTION_JOBS = [
  { name: 'landscape', sections: WEB_VIEWPORT_SECTIONS },
  { name: 'portrait', sections: WEB_VIEWPORT_SECTIONS },
  { name: 'retina-landscape', sections: WEB_VIEWPORT_SECTIONS },
  { name: 'retina-portrait', sections: WEB_VIEWPORT_SECTIONS },
  { name: 'pages', sections: ['navigator', 'font-slices', 'rotation', 'labs-fit'] },
  // The touch pages run by themselves, after the others (`exclusive`): a finger's fling needs the lift within a tenth of a second of the engine's time after the last
  // move, and the verifier's steps between them (Chrome's round trips) take as long as the other browsers let them (docs/tracks/suite-speed.md).
  { name: 'touch', sections: ['touch', 'drag', 'combobox', 'dropdown-touch', 'touch-selection', 'code-editor'], exclusive: true },
];

/** The jobs a run executes, in report order, each with the sections of it that the run asks for. A job with none of them does not run. */
export function webInteractionJobsToRun(requested) {
  const run = sectionsToRun(WEB_INTERACTION_SECTIONS, [], requested);
  return WEB_INTERACTION_JOBS
    .map(job => ({ name: job.name, sections: job.sections.filter(name => run.includes(name)), ...job.exclusive === true ? { exclusive: true } : {} }))
    .filter(job => job.sections.length > 0);
}

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

// The native interaction run's deadline is a hang guard, not a budget, so it grows with the sections a window runs. Measured on 8 November 2026
// (Breaka's 4.8 and stock, load average 7 to 15, `sectionMs` of the pass lines of whole runs): the 24 default sections of a landscape window took 594 s
// when the two windows ran one after the other (a mean of 25 s, the slowest `text-styles` at 89 s) and 534 s when they ran at the same time (a mean of
// 22 s, `text-styles` 61 s); a portrait window 480 s and 445 s. Running together did not slow a window (the host had the cores), so the allowance below
// is unchanged, and about twice a window's measured time. The flat 300 s it had before was set on 6 November, when the whole run took about 130 s, and
// killed the full run in the batch regression at the glass section.
/** What a window needs before its first section: Godot's start, the import of the demo and the first frame. */
export const INTERACTION_START_ALLOWANCE_MS = 60_000;
/** Allowance for each section the window runs: about twice the measured mean, so the whole run has about twice its measured time. */
export const INTERACTION_SECTION_ALLOWANCE_MS = 45_000;
/** The guard of a run with few sections: one slow section (`text-styles`, 88 s) under a loaded host must not be cut short. */
export const INTERACTION_MINIMUM_DEADLINE_MS = 300_000;

/** The deadline of one native interaction window that runs `sectionCount` sections. */
export function interactionDeadlineMs(sectionCount) {
  return Math.max(INTERACTION_MINIMUM_DEADLINE_MS, INTERACTION_START_ALLOWANCE_MS + INTERACTION_SECTION_ALLOWANCE_MS * sectionCount);
}

// A Web interaction job's deadline is the same kind of hang guard, for one browser's run of the sections the job executes. (Before the jobs ran at the
// same time, one deadline covered every section in four viewports and the touch page: 1,200 s, from a measured 1,133 to 1,151 s on 8 November 2026, and
// the whole run took 1,309 s on a later day.) Measured with the six jobs running at the same time, load average 8 to 83 at their start (`sectionMs` in the
// jobs' reports): a viewport job's 18 sections took 308 to 398 s (a mean of 17 to 22 s; `navigator` 65 to 98 s and `glass` 35 to 100 s the slowest), the pages job's
// three sections 152 to 162 s (`font-slices` 110 s), the touch job's six sections about 90 s on its own.
/** What a job needs before its first section: the browser, the page, the engine's start and the demo's ready line. */
export const WEB_INTERACTION_JOB_START_ALLOWANCE_MS = 180_000;
/** Allowance for each section the job executes: about twice the mean of the slowest job, so a viewport job has about 2.5 times its measured time. */
export const WEB_INTERACTION_JOB_SECTION_ALLOWANCE_MS = 45_000;
/**
 * The guard of a job with few sections: the pages job must not be cut short under a loaded host. Its sections are heavy (`font-slices` loads the CJK
 * slices; `labs-fit` shows every lab on a phone): on the stock engine's Web export, with the six jobs running at the same time, `font-slices` alone
 * took 356 s (98 s on its own), and the job ran out of the 360 s it had then.
 */
export const WEB_INTERACTION_JOB_MINIMUM_DEADLINE_MS = 900_000;

/** The deadline of one Web interaction job that executes `sectionCount` sections. */
export function webInteractionJobDeadlineMs(sectionCount) {
  return Math.max(WEB_INTERACTION_JOB_MINIMUM_DEADLINE_MS, WEB_INTERACTION_JOB_START_ALLOWANCE_MS + WEB_INTERACTION_JOB_SECTION_ALLOWANCE_MS * sectionCount);
}
