export const ONLY_PREFIX: string;

export const NATIVE_INTERACTION_SECTIONS: readonly [
  'events', 'cooperation', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint',
  'navigator', 'transforms', 'layout-utilities', 'text-styles', 'rich-text', 'filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile', 'code-editor',
];
export const NATIVE_OPT_IN_SECTIONS: readonly ['filters-sizes', 'filters-cost', 'filters-faults', 'transforms-faults', 'live-compile'];
export const WEB_INTERACTION_SECTIONS: readonly [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'drag', 'forms', 'combobox', 'dropdown-touch', 'hidpi', 'filters', 'glass', 'paint', 'navigator', 'transforms', 'text-styles', 'rich-text', 'font-slices', 'code-editor', 'touch',
];

/** Every section name the arguments ask for, across all `--only=` arguments. */
export function requestedSections(argv: readonly string[]): string[];
/** Throws for a name that is not in `known`. */
export function checkSectionNames(requested: readonly string[], known: readonly string[]): void;
/** The sections a run executes, in run order. Throws for an unknown name. */
export function sectionsToRun<S extends string>(known: readonly S[], optIn: readonly S[], requested: readonly string[]): S[];
export interface SectionCoverage<S extends string> {
  run: S[];
  skipped: S[];
  partial: boolean;
}
/** What a run covered. Opt-in sections are never reported as left out. */
export function describeSections<S extends string>(known: readonly S[], optIn: readonly S[], requested: readonly string[]): SectionCoverage<S>;
export const INTERACTION_START_ALLOWANCE_MS: number;
export const INTERACTION_SECTION_ALLOWANCE_MS: number;
export const INTERACTION_MINIMUM_DEADLINE_MS: number;
/** The deadline of one native interaction window that runs `sectionCount` sections: a hang guard that grows with the sections. */
export function interactionDeadlineMs(sectionCount: number): number;
