export const ONLY_PREFIX: string;

export const NATIVE_INTERACTION_SECTIONS: readonly [
  'events', 'cooperation', 'pointers', 'keyboard', 'positioning', 'inputs', 'scroll', 'selection', 'drag', 'forms', 'hidpi', 'filters', 'glass',
  'navigator', 'filters-sizes', 'filters-cost', 'filters-faults',
];
export const NATIVE_OPT_IN_SECTIONS: readonly ['filters-sizes', 'filters-cost', 'filters-faults'];
export const WEB_INTERACTION_SECTIONS: readonly [
  'events', 'cooperation', 'pointers', 'keyboard', 'scroll', 'selection', 'drag', 'forms', 'hidpi', 'filters', 'glass', 'navigator', 'touch',
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
