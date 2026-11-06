import type { BuildInputs } from './freshness.mjs';

/** The `custom_template/<mode>` path of the export preset named `presetName`, or undefined if it names none for that mode. */
export function presetTemplate(presets: string, presetName: string, mode: string): string | undefined;
/** The repository-relative source files of a Web export, in a fixed order. */
export function webSourcePaths(root: string): string[];
/** What the pack, shell and engine template of the Web export in `mode` are made from. */
export function webContentInputs(options: { root: string; presetName: string; mode: string }): BuildInputs;
