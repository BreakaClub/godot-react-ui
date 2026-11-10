import type { BuildInputs } from './freshness.mjs';

/** The `custom_template/<mode>` path of the export preset named `presetName`, or undefined if it names none for that mode. */
export function presetTemplate(presets: string, presetName: string, mode: string): string | undefined;
/** The repository-relative source files of a Web export, in a fixed order. */
export function webSourcePaths(root: string): string[];
/** The Godot that exports, for finding the template it installed when the preset names none: its binary and its `--version` line. */
export interface WebTemplateExporter {
  executable?: string;
  version?: () => string;
}
/** The directory Godot installs a version's export templates under (`4.7.2.stable`), from a `godot --version` line. */
export function templateVersionOf(version: string): string;
/** The engine template a Web export in `mode` is made with: the preset's custom template, or the one the exporting Godot installed. */
export function webTemplate(options: { root: string; presetName: string; mode: string } & WebTemplateExporter): string;
/** What the pack, shell and engine template of the Web export in `mode` are made from. */
export function webContentInputs(options: { root: string; presetName: string; mode: string } & WebTemplateExporter): BuildInputs;
