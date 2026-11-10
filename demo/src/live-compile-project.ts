import type { ProjectFile } from 'godot-tsc/host';

/**
 * The project the live code editor opens, as `scripts/live-compile-project.mjs` writes it: the checker's files (the labs, the declarations
 * they use and the standard library's), and for each lab the configuration whose roots are its sources. The checker and transpiler that
 * read it are the godot-tsc package's (scripts/godot-tsc.mjs); this is the demo's own format, read by the page from the Godot project
 * (`readProject` in live-compile-open.ts) and by the tests from the file.
 */

/** Where `scripts/live-compile-project.mjs` puts the project, as the Godot project (and the Web pack) has it. */
export const PROJECT_RESOURCE = 'res://live-compile/project.json';

export interface LabProject {
  /** The checker's configuration for the lab: its sources are the roots. */
  readonly config: string;
  readonly sources: readonly string[];
}

export interface Project {
  readonly version: 1;
  readonly libDir: string;
  readonly files: readonly ProjectFile[];
  readonly labs: Readonly<Record<string, LabProject>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function parseProject(json: string): Project {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || value.version !== 1 || typeof value.libDir !== 'string' || !Array.isArray(value.files) || !isRecord(value.labs)) {
    throw new Error('The live-compile project is not a version 1 project');
  }
  const files = value.files.map((file: unknown): ProjectFile => {
    if (!isRecord(file) || typeof file.path !== 'string' || typeof file.text !== 'string') throw new Error('A file of the live-compile project has no path and text');
    return { path: file.path, text: file.text };
  });
  const labs: Record<string, LabProject> = {};
  for (const [id, lab] of Object.entries(value.labs)) {
    if (!isRecord(lab) || typeof lab.config !== 'string' || !isStringArray(lab.sources)) throw new Error(`The lab ${id} of the live-compile project is malformed`);
    labs[id] = { config: lab.config, sources: lab.sources };
  }
  return { version: 1, libDir: value.libDir, files, labs };
}
